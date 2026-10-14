import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listApplications, updateApplication, addAudit } from "@/lib/store";

export async function POST(request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { applicationIds = [], action = "submit", consentConfirmed = false } = await request.json();
  if (!["approve", "assist", "manual", "submit"].includes(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }
  if (action === "submit") {
    return NextResponse.json({ error: "Direct submission is not connected to an employer API. Submit on the employer website, then mark your application submitted." }, { status: 409 });
  }
  if (action === "approve" && consentConfirmed !== true) {
    return NextResponse.json({ error: "Review and consent are required before approval." }, { status: 400 });
  }
  if (!Array.isArray(applicationIds) || !applicationIds.length) {
    return NextResponse.json({ error: "Select at least one prepared application before submitting." }, { status: 400 });
  }
  const existing = await listApplications(user.id);
  const updated = [];
  const skipped = [];

  for (const applicationId of applicationIds) {
    const application = existing.find((item) => item.id === applicationId);
    if (!application) continue;

    if (["SUBMITTED", "MANUAL_SUBMITTED"].includes(application.status)) {
      skipped.push({
        id: application.id,
        jobId: application.jobId,
        reason: "already_submitted"
      });
      updated.push(application);
      continue;
    }

    if (action === "approve") {
      if (!["NEEDS_REVIEW", "APPROVED"].includes(application.status)) {
        return NextResponse.json({ error: "Application must be prepared before approval." }, { status: 409 });
      }
      updated.push(await updateApplication(user.id, applicationId, { status: "APPROVED", package: { ...application.package, consentConfirmedAt: new Date().toISOString() } }));
      continue;
    }

    if (action === "assist") {
      updated.push(await updateApplication(user.id, applicationId, { status: "ASSISTED_OPENED" }));
      continue;
    }

    if (action === "manual") {
      updated.push(
        await updateApplication(user.id, applicationId, {
          status: "MANUAL_SUBMITTED",
          package: { ...application.package, submittedAt: new Date().toISOString(), submissionSource: "candidate_confirmation" }
        })
      );
      continue;
    }

    if (action === "submit" && application.applicationType === "DIRECT" && !consentConfirmed) {
      return NextResponse.json({ error: "Candidate consent is required before direct submission." }, { status: 400 });
    }

    if (
      action === "submit" &&
      application.applicationType === "DIRECT" &&
      !["NEEDS_REVIEW", "APPROVED"].includes(application.status)
    ) {
      return NextResponse.json({ error: "Application requires candidate review before direct submission." }, { status: 409 });
    }

    if (action === "submit" && application.applicationType !== "DIRECT") {
      skipped.push({
        id: application.id,
        jobId: application.jobId,
        reason: "assisted_requires_manual_submit"
      });
      continue;
    }

  }

  await addAudit({
    userId: user.id,
    eventType: "APPLICATION_STATUS_UPDATED",
    message: `${updated.length} application(s) updated with action ${action}.`,
    metadata: { action, skipped }
  });
  const applications = updated.filter(Boolean);
  if (!applications.length) {
    return NextResponse.json({ error: "No matching applications were found to update." }, { status: 404 });
  }
  return NextResponse.json({ applications, skipped });
}
