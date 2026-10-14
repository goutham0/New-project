import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getProfile, getLatestResume, saveTailoredResume, addAudit, consumeRequestLimit } from "@/lib/store";
import { sha256 } from "@/lib/fileStorage";
import { extractResumeText } from "@/lib/resumeText";
import { createResumePdf, resumeToPlainText } from "@/lib/pdf";
import { generateTailoredResume } from "@/lib/openaiResume";
import { createResumeDocx } from "@/lib/docxResume";

export const maxDuration = 300;

export async function POST(request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await consumeRequestLimit(`ai:${user.id}`, 60)) return NextResponse.json({ error: "Hourly AI limit reached. Please try again later." }, { status: 429 });

  const contentType = request.headers.get("content-type") || "";
  let resumeText = "";
  let jobDescription = "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("resume");
    const pastedResumeText = String(formData.get("resumeText") || "").trim();
    if (file && typeof file !== "string") {
      try { resumeText = await extractResumeText(file); }
      catch (error) { return NextResponse.json({ error: error.message }, { status: 422 }); }
      if (!resumeText.trim()) resumeText = pastedResumeText;
    } else {
      resumeText = pastedResumeText;
    }
    jobDescription = String(formData.get("jobDescription") || "").trim();
  } else {
    const body = await request.json();
    resumeText = String(body.resumeText || "").trim();
    jobDescription = String(body.jobDescription || "").trim();
  }

  if (!resumeText.trim()) {
    const savedResume = await getLatestResume(user.id);
    resumeText = String(savedResume?.content || "").trim();
  }

  if (!resumeText.trim() || !jobDescription.trim()) {
    return NextResponse.json({ error: "Saved resume/uploaded resume and job description are required." }, { status: 400 });
  }

  const profile = await getProfile(user.id);
  let result;
  try {
    if (resumeText.length > 30000 || jobDescription.length > 18000) {
      return NextResponse.json({ error: "Resume exceeds 30,000 characters or job description exceeds 18,000 characters. Shorten the input and retry." }, { status: 413 });
    }
    result = await generateTailoredResume({ resumeText, jobDescription, profile, requireAi: true });
  } catch (error) {
    await addAudit({
      userId: user.id,
      eventType: "TAILORED_RESUME_PDF_FAILED",
      message: "Tailored resume PDF generation failed.",
      metadata: { reason: error.message }
    });
    return NextResponse.json({
      error: "GPT resume generation failed.",
      detail: error.message,
      fix: openAiFix(error.message)
    }, { status: 503 });
  }

  const pdf = createResumePdf(result);
  const docx = await createResumeDocx(result);
  const saved = await saveTailoredResume({
    userId: user.id,
    jobDescriptionHash: sha256(Buffer.from(jobDescription)),
    tailoredJson: { ...result, artifact: { docxBase64: docx.toString("base64"), pdfBase64: pdf.toString("base64") } },
    tailoringNotes: result.notes || []
  });
  await addAudit({
    userId: user.id,
    eventType: "TAILORED_RESUME_PDF_CREATED",
    message: "Tailored resume PDF generated.",
    metadata: { aiUsed: result.aiUsed, warning: result.warning || "" }
  });
  return NextResponse.json({
    result,
    tailoredResumeId: saved.id,
    downloadUrl: `/api/tailored-resumes/${saved.id}/download`,
    resumeTextOutput: resumeToPlainText(result),
    pdfBase64: pdf.toString("base64"),
    docxBase64: docx.toString("base64"),
    fileName: `${safeFilePart(result.candidateName || "candidate")}-tailored-resume.pdf`,
    docxFileName: `${safeFilePart(result.candidateName || "candidate")}-tailored-resume.docx`
  });
}

function safeFilePart(value) {
  return String(value || "candidate").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "candidate";
}

function openAiFix(message = "") {
  const text = message.toLowerCase();
  if (text.includes("quota") || text.includes("billing")) {
    return "OpenAI billing/quota is blocking the request. Add credits or raise your project limit, then try again.";
  }
  if (text.includes("model") || text.includes("does not exist") || text.includes("not found")) {
    return "The selected OPENAI_MODEL is not available for this project. In Vercel set OPENAI_MODEL=gpt-5.5, or use gpt-5.4 if your account does not have gpt-5.5 access, then redeploy.";
  }
  if (text.includes("api key") || text.includes("unauthorized") || text.includes("invalid")) {
    return "The OpenAI key is invalid or missing. Add the full sk- secret as OPENAI_API_KEY in Vercel and redeploy.";
  }
  if (text.includes("too thin") || text.includes("too short")) {
    return "The source resume text is not detailed enough or was not parsed well. Upload the original detailed resume or paste resume text in the fallback box, then generate again.";
  }
  return "Check OPENAI_API_KEY, OPENAI_MODEL, OpenAI billing, and the uploaded resume text, then redeploy/restart if environment variables changed.";
}
