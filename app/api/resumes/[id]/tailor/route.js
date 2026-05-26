import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { addAudit, getProfile, getResumeById, saveTailoredResume } from "@/lib/store";
import { saveFileBuffer, sha256 } from "@/lib/fileStorage";
import { tailorResumeToDocx } from "@/lib/resumePipeline";

export async function POST(request, { params }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const resume = await getResumeById(user.id, id);
  if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });

  const body = await request.json();
  const jobDescription = String(body.jobDescription || "").trim();
  const jobId = String(body.jobId || "").trim();
  const useAi = body.useAi !== false;
  if (!jobDescription) {
    return NextResponse.json({ error: "Job description is required." }, { status: 400 });
  }

  const profile = await getProfile(user.id);
  await addAudit({
    userId: user.id,
    eventType: "RESUME_TAILORING_STARTED",
    message: "Resume tailoring started.",
    metadata: { resumeId: resume.id, jobId }
  });

  try {
    const result = await tailorResumeToDocx({
      resumeText: resume.content,
      parsedResume: resume.parsedJson,
      candidateProfile: profile,
      jobDescription,
      useAi
    });
    const fileName = `${safeFilePart(result.tailoredResume.candidateName || "candidate")}-tailored-resume.docx`;
    let stored = { filePath: "" };
    try {
      stored = await saveFileBuffer(result.docx.buffer, {
        userId: user.id,
        folder: "tailored-resumes",
        originalName: fileName,
        contentType: result.docx.contentType
      });
    } catch (error) {
      stored = { filePath: "", warning: error.message };
    }
    const docxBase64 = result.docx.buffer.toString("base64");
    const tailoredRecord = await saveTailoredResume({
      userId: user.id,
      resumeId: resume.id,
      jobId,
      jobDescriptionHash: sha256(Buffer.from(jobDescription)),
      tailoredDocxPath: stored.filePath,
      tailoredJson: {
        ...result.tailoredResume,
        artifact: {
          docxBase64,
          fileName,
          storageWarning: stored.warning || ""
        }
      },
      tailoringNotes: result.tailoringPlan?.warnings || result.tailoredResume.tailoringNotes || [],
      atsScoreBefore: null,
      atsScoreAfter: result.atsScore?.overallScore || null
    });
    await addAudit({
      userId: user.id,
      eventType: "RESUME_TAILORING_COMPLETED",
      message: "Tailored DOCX resume generated.",
      metadata: { resumeId: resume.id, tailoredResumeId: tailoredRecord.id, aiUsed: result.tailoredResume.aiUsed }
    });

    return NextResponse.json({
      tailoredResume: tailoredRecord,
      result: result.tailoredResume,
      jobRequirements: result.jobRequirements,
      tailoringPlan: result.tailoringPlan,
      validation: result.validation,
      atsScore: result.atsScore,
      downloadUrl: `/api/tailored-resumes/${tailoredRecord.id}/download`
    });
  } catch (error) {
    await addAudit({
      userId: user.id,
      eventType: "RESUME_TAILORING_FAILED",
      message: "Resume tailoring failed.",
      metadata: { resumeId: resume.id, jobId, reason: error.message }
    });
    return NextResponse.json({
      error: "Tailored DOCX generation failed.",
      detail: error.message
    }, { status: 500 });
  }
}

function safeFilePart(value) {
  return String(value || "candidate")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "candidate";
}
