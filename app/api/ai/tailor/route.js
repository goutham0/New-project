import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getProfile, addAudit } from "@/lib/store";
import { extractResumeText } from "@/lib/resumeText";
import { createResumePdf } from "@/lib/pdf";
import { generateTailoredResume } from "@/lib/openaiResume";

export async function POST(request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = request.headers.get("content-type") || "";
  let resumeText = "";
  let jobDescription = "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("resume");
    resumeText = String(formData.get("resumeText") || "").trim();
    if (file && typeof file !== "string") {
      resumeText = await extractResumeText(file);
    }
    jobDescription = String(formData.get("jobDescription") || "").trim();
  } else {
    const body = await request.json();
    resumeText = String(body.resumeText || "").trim();
    jobDescription = String(body.jobDescription || "").trim();
  }

  if (!resumeText.trim() || !jobDescription.trim()) {
    return NextResponse.json({ error: "Resume upload or resume text and job description are required." }, { status: 400 });
  }

  const profile = await getProfile(user.id);
  let result;
  try {
    result = await generateTailoredResume({ resumeText, jobDescription, profile, requireAi: true });
  } catch (error) {
    await addAudit({
      userId: user.id,
      eventType: "TAILORED_RESUME_PDF_FAILED",
      message: "Tailored resume PDF generation failed.",
      metadata: { reason: error.message }
    });
    return NextResponse.json({
      error: "GPT resume generation is not active yet.",
      detail: error.message,
      fix: "Add OPENAI_API_KEY and OPENAI_MODEL in your environment variables, redeploy/restart, then generate again."
    }, { status: 503 });
  }

  const pdf = createResumePdf(result);
  await addAudit({
    userId: user.id,
    eventType: "TAILORED_RESUME_PDF_CREATED",
    message: "Tailored resume PDF generated.",
    metadata: { aiUsed: result.aiUsed }
  });
  return NextResponse.json({
    result,
    pdfBase64: pdf.toString("base64"),
    fileName: `${safeFilePart(result.candidateName || "candidate")}-tailored-resume.pdf`
  });
}

function safeFilePart(value) {
  return String(value || "candidate").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "candidate";
}
