import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listApplications, createApplication, addAudit } from "@/lib/store";
import { getJobById } from "@/lib/jobs";

export async function POST(request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await request.json();
  const job = await getJobById(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job was not found." }, { status: 404 });
  }

  const existing = (await listApplications(user.id)).find((application) => application.jobId === job.id && application.status === "SUBMITTED");
  if (existing) {
    return NextResponse.json({ application: existing, alreadySubmitted: true });
  }

  const application = await createApplication({
    userId: user.id,
    jobId: job.id,
    applicationType: "MANUAL",
    status: "SUBMITTED",
    matchScore: null,
    externalApplicationId: `MANUAL-${Math.floor(Math.random() * 900000 + 100000)}`,
    package: {
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        source: job.source,
        applyUrl: job.applyUrl,
        directApplySupported: false
      }
    }
  });

  await addAudit({
    userId: user.id,
    eventType: "MANUAL_APPLICATION_MARKED_SUBMITTED",
    message: "Candidate marked manual application as submitted.",
    metadata: { jobId: job.id }
  });

  return NextResponse.json({ application });
}
