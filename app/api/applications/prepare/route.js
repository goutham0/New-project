import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createAssistedApplyToken } from "@/lib/auth";
import { getProfile, getLatestResume, listApplications, createApplication, updateApplication, claimApplicationPreparation, consumeRequestLimit, addAudit } from "@/lib/store";
import { getJobById } from "@/lib/jobs";
import { generateApplicationPackage } from "@/lib/ai";
import { generateTailoredResume } from "@/lib/openaiResume";
import { createResumePdf } from "@/lib/pdf";

export const maxDuration = 300;

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
  if (!await consumeRequestLimit(`ai:${user.id}`, 60)) return NextResponse.json({ error: "Hourly AI limit reached. Please try again later." }, { status: 429 });

  const { jobIds = [], useAi = true } = await request.json();
  if (!Array.isArray(jobIds) || jobIds.length !== 1 || typeof jobIds[0] !== "string") {
    return NextResponse.json({ error: "Prepare one job per request. Bulk preparation processes jobs individually." }, { status: 400 });
  }
  const uniqueJobIds = [...new Set(Array.isArray(jobIds) ? jobIds : [])];
  const profile = await getProfile(user.id);
  const resume = await getLatestResume(user.id);
  const missing = requiredFields.filter((field) => !String(profile[field] ?? "").trim());
  if (missing.length || !resume) {
    return NextResponse.json({ error: "Profile and resume must be complete.", missing }, { status: 400 });
  }

  const applications = [];
  const existingApplications = await listApplications(user.id);
  for (const jobId of uniqueJobIds) {
    const job = await getJobById(jobId);
    if (!job) continue;

    const existing = existingApplications.find((item) => item.jobId === job.id);
    if (existing && !["DRAFT", "PREPARING", "FAILED"].includes(existing.status)) {
      applications.push(withAssistedHandoff(user, {
        ...existing,
        alreadyPrepared: true,
        alreadySubmitted: ["SUBMITTED", "MANUAL_SUBMITTED"].includes(existing.status)
      }));
      continue;
    }

    const draft = existing || await createApplication({ userId: user.id, jobId: job.id, applicationType: "ASSISTED", status: "DRAFT", matchScore: null, package: { job } });
    if (!await claimApplicationPreparation(user.id, draft.id)) {
      return NextResponse.json({ error: "This application is already preparing. Wait for the current request to finish before retrying." }, { status: 409 });
    }
    let pkg;
    try {
      pkg = await buildPreparedPackage({ profile, resumeText: resume.content, job, useAi: true });
    } catch (error) {
      await updateApplication(user.id, draft.id, { status: "FAILED", failureReason: "Application preparation failed. Retry to prepare again." }, { expectedStatus: "PREPARING" });
      console.error("buildPreparedPackage error:", error);
      await addAudit({
        userId: user.id,
        eventType: "APPLICATION_PREPARATION_FAILED",
        message: "Application package preparation failed.",
        metadata: { jobId, reason: error.message }
      });
      return NextResponse.json({
        error: "Application preparation failed. Your resume and profile are still saved.",
        detail: error.message,
        fix: "Add OPENAI_API_KEY and OPENAI_MODEL in your environment variables, redeploy/restart, then prepare applications again."
      }, { status: 503 });
    }
    let application = await updateApplication(user.id, draft.id, {
      userId: user.id,
      jobId: job.id,
      applicationType: job.directApplySupported ? "DIRECT" : "ASSISTED",
      status: "NEEDS_REVIEW",
      failureReason: null,
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
    }, { expectedStatus: "PREPARING" });
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
    throw error;
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
      profile,
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

function normalizeAnswers({ jobQuestions, generatedAnswers, fallbackAnswers, profile }) {
  if (!jobQuestions.length) {
    return generatedAnswers.map((item) => ({
      question: item.question,
      answer: item.answer,
      confidence: 0.86
    }));
  }

  return jobQuestions.map((question, index) => {
    const normalizedQuestion = question.toLowerCase();
    const sensitiveAnswer = /sponsor/.test(normalizedQuestion) ? profile.sponsorshipRequired
      : /authoriz|legally.*work/.test(normalizedQuestion) ? profile.workAuthorization
      : /salary|compensation/.test(normalizedQuestion) ? [profile.expectedSalaryMin, profile.expectedSalaryMax].filter(Boolean).join(" - ")
      : /relocat/.test(normalizedQuestion) ? profile.willingToRelocate : undefined;
    if (/sponsor|authoriz|legally.*work|salary|compensation|relocat|gender|ethnic|race|disabil|veteran/.test(normalizedQuestion)) {
      return { question, answer: sensitiveAnswer === undefined || sensitiveAnswer === "" ? "Candidate must confirm." : String(sensitiveAnswer), confidence: 1, requiresUserConfirmation: true };
    }
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
