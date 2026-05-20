import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createAssistedApplyToken } from "@/lib/auth";
import { getProfile, getLatestResume, listApplications, createApplication, addAudit } from "@/lib/store";
import { getJobById } from "@/lib/jobs";
import { generateApplicationPackage } from "@/lib/ai";
import { generateTailoredResume } from "@/lib/openaiResume";
import { createResumePdf } from "@/lib/pdf";

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

  const { jobIds = [], useAi = false } = await request.json();
  const uniqueJobIds = [...new Set(Array.isArray(jobIds) ? jobIds : [])];
  const profile = await getProfile(user.id);
  const resume = await getLatestResume(user.id);
  const missing = requiredFields.filter((field) => !String(profile[field] || "").trim());
  if (missing.length || !resume) {
    return NextResponse.json({ error: "Profile and resume must be complete.", missing }, { status: 400 });
  }

  const applications = [];
  const existingApplications = await listApplications(user.id);
  for (const jobId of uniqueJobIds) {
    const job = await getJobById(jobId);
    if (!job) continue;
    if (job.applyType === "manual") continue;

    const existing = existingApplications.find((item) => item.jobId === job.id);
    if (existing) {
      applications.push(withAssistedHandoff(user, {
        ...existing,
        alreadyPrepared: true,
        alreadySubmitted: existing.status === "SUBMITTED"
      }));
      continue;
    }

    let pkg;
    try {
      pkg = await buildPreparedPackage({ profile, resumeText: resume.content, job, useAi });
    } catch (error) {
      console.error("buildPreparedPackage error:", error);
      await addAudit({
        userId: user.id,
        eventType: "APPLICATION_PREPARATION_FAILED",
        message: "Application package preparation failed.",
        metadata: { jobId, reason: error.message }
      });
      return NextResponse.json({
        error: "GPT application preparation is not active yet.",
        detail: error.message,
        fix: "Add OPENAI_API_KEY and OPENAI_MODEL in your environment variables, redeploy/restart, then prepare applications again."
      }, { status: 503 });
    }
    let application = await createApplication({
      userId: user.id,
      jobId: job.id,
      applicationType: job.directApplySupported ? "DIRECT" : "ASSISTED",
      status: "NEEDS_REVIEW",
      matchScore: pkg.matchScore,
      package: {
        ...pkg,
        job: {
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          source: job.source,
          applyUrl: job.applyUrl,
          directApplySupported: job.directApplySupported
        }
      }
    });
    applications.push(withAssistedHandoff(user, application));
  }

  await addAudit({
    userId: user.id,
    eventType: "APPLICATIONS_PREPARED",
    message: `${applications.length} application package(s) prepared.`
  });
  return NextResponse.json({ applications });
}

function withAssistedHandoff(user, application) {
  if (application.applicationType !== "ASSISTED") return application;
  return {
    ...application,
    handoffToken: createAssistedApplyToken(user, application)
  };
}

async function buildPreparedPackage({ profile, resumeText, job, useAi }) {
  const fallback = generateApplicationPackage({ profile, resumeText, job });
  let tailored;
  try {
    tailored = await generateTailoredResume({
      resumeText,
      jobDescription: buildJobDescription(job),
      profile,
      requireAi: Boolean(useAi),
      skipAi: !useAi
    });
  } catch (error) {
    console.warn("generateTailoredResume failed, using local fallback:", error.message);
    tailored = await generateTailoredResume({
      resumeText,
      jobDescription: buildJobDescription(job),
      profile,
      requireAi: false,
      skipAi: true
    });
  }
  const pdf = createResumePdf(tailored);

  return {
    matchScore: fallback.matchScore,
    tailoredResume: {
      headline: `${tailored.candidateName || "Candidate"} - tailored for ${job.title}`,
      summary: tailored.professionalSummary || fallback.tailoredResume.summary,
      bullets: (tailored.experienceBullets?.length ? tailored.experienceBullets : fallback.tailoredResume.bullets).slice(0, 8),
      skills: tailored.coreSkills || [],
      atsKeywords: tailored.atsKeywords || []
    },
    tailoredResumePdfBase64: pdf.toString("base64"),
    tailoredResumePdfFileName: `${safeFilePart(job.company)}-${safeFilePart(job.title)}-tailored-resume.pdf`,
    coverLetter: tailored.coverLetter || fallback.coverLetter,
    answers: normalizeAnswers({
      jobQuestions: job.questions || [],
      generatedAnswers: tailored.screeningAnswers || [],
      fallbackAnswers: fallback.answers || []
    }),
    candidateSubmission: buildCandidateSubmission(profile),
    tailoringNotes: tailored.notes || [],
    aiUsed: Boolean(tailored.aiUsed)
  };
}

function buildJobDescription(job) {
  return [
    `${job.title} at ${job.company}`,
    `Location: ${job.location}`,
    `Work mode: ${job.remoteType}`,
    `Employment type: ${job.employmentType}`,
    `Experience level: ${job.experienceLevel || "Not listed"}`,
    `Skills: ${(job.skills || []).join(", ")}`,
    "",
    job.description || "",
    "",
    "Application questions:",
    ...(job.questions || []).map((question) => `- ${question}`)
  ].join("\n");
}

function normalizeAnswers({ jobQuestions, generatedAnswers, fallbackAnswers }) {
  if (!jobQuestions.length) {
    return generatedAnswers.map((item) => ({
      question: item.question,
      answer: item.answer,
      confidence: 0.86
    }));
  }

  return jobQuestions.map((question, index) => {
    const normalizedQuestion = question.toLowerCase();
    const generated =
      generatedAnswers.find((item) => String(item.question || "").toLowerCase() === normalizedQuestion) ||
      generatedAnswers.find((item) => {
        const generatedQuestion = String(item.question || "").toLowerCase();
        return generatedQuestion && (normalizedQuestion.includes(generatedQuestion) || generatedQuestion.includes(normalizedQuestion));
      });
    const fallback = fallbackAnswers.find((item) => item.question === question) || fallbackAnswers[index];
    const indexedGenerated = generatedAnswers[index];

    return {
      question,
      answer: generated?.answer || fallback?.answer || indexedGenerated?.answer || "Candidate should review and provide an answer.",
      confidence: generated?.answer ? 0.88 : fallback?.confidence || 0.72
    };
  });
}

function buildCandidateSubmission(profile) {
  return {
    name: [profile.firstName, profile.lastName].filter(Boolean).join(" "),
    email: profile.email || "",
    phone: profile.phone || "",
    location: [profile.city, profile.state, profile.country].filter(Boolean).join(", "),
    workAuthorization: profile.workAuthorization || "",
    sponsorshipRequired: profile.sponsorshipRequired || "",
    currentTitle: profile.currentTitle || "",
    yearsExperience: profile.yearsExperience || "",
    linkedinUrl: profile.linkedinUrl || "",
    githubUrl: profile.githubUrl || "",
    portfolioUrl: profile.portfolioUrl || ""
  };
}

function safeFilePart(value) {
  return String(value || "application")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "application";
}
