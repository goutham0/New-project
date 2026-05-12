import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getProfile, getLatestResume, createApplication, addAudit } from "@/lib/store";
import { getJobById } from "@/data/jobs";
import { generateApplicationPackage } from "@/lib/ai";

const requiredFields = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "city",
  "state",
  "country",
  "workAuthorization",
  "sponsorshipRequired",
  "currentTitle",
  "yearsExperience",
  "highestEducation",
  "targetTitles",
  "preferredLocations",
  "remotePreference",
  "expectedSalaryMin",
  "expectedSalaryMax",
  "noticePeriod"
];

export async function POST(request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.plan === "Free") {
    return NextResponse.json({ error: "Paid plan required for application preparation." }, { status: 402 });
  }

  const { jobIds = [] } = await request.json();
  const profile = await getProfile(user.id);
  const resume = await getLatestResume(user.id);
  const missing = requiredFields.filter((field) => !String(profile[field] || "").trim());
  if (missing.length || !resume) {
    return NextResponse.json({ error: "Profile and resume must be complete.", missing }, { status: 400 });
  }

  const applications = [];
  for (const jobId of jobIds) {
    const job = getJobById(jobId);
    if (!job) continue;
    if (job.applyType === "manual") continue;
    const pkg = generateApplicationPackage({ profile, resumeText: resume.content, job });
    const application = await createApplication({
      userId: user.id,
      jobId: job.id,
      applicationType: job.directApplySupported ? "DIRECT" : "ASSISTED",
      status: "NEEDS_REVIEW",
      matchScore: pkg.matchScore,
      package: pkg
    });
    applications.push(application);
  }

  await addAudit({
    userId: user.id,
    eventType: "APPLICATIONS_PREPARED",
    message: `${applications.length} application package(s) prepared.`
  });
  return NextResponse.json({ applications });
}
