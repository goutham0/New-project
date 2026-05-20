import { NextResponse } from "next/server";
import { userFromAssistedApplyToken } from "@/lib/auth";
import { listApplications, updateApplication, addAudit } from "@/lib/store";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const token = body.token || new URL(request.url).searchParams.get("token");
  const handoff = token ? await userFromAssistedApplyToken(token) : null;

  if (!handoff?.user || !handoff.applicationId) {
    return NextResponse.json({ error: "Invalid or expired assisted apply handoff." }, { status: 401 });
  }

  const applications = await listApplications(handoff.user.id);
  const application = applications.find(
    (item) => item.id === handoff.applicationId && item.applicationType === "ASSISTED"
  );

  if (!application) {
    return NextResponse.json({ error: "Prepared assisted application was not found." }, { status: 404 });
  }

  if (application.status === "SUBMITTED") {
    return NextResponse.json({ application });
  }

  const updated = await updateApplication(handoff.user.id, application.id, {
    status: "SUBMITTED",
    externalApplicationId: `ASSISTED-${Math.floor(Math.random() * 900000 + 100000)}`
  });

  await addAudit({
    userId: handoff.user.id,
    eventType: "ASSISTED_APPLICATION_MARKED_SUBMITTED",
    message: "Candidate marked assisted application as submitted from the Chrome extension.",
    metadata: { applicationId: application.id }
  });

  return NextResponse.json({ application: updated });
}
