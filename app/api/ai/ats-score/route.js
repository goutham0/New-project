import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getLatestResume, addAudit } from "@/lib/store";
import { extractResumeText } from "@/lib/resumeText";
import { scoreResumeForAts } from "@/lib/openaiResume";

export async function POST(request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("resume");
  const jobDescription = String(formData.get("jobDescription") || "").trim();
  const pastedResumeText = String(formData.get("resumeText") || "").trim();
  let resumeText = "";
  if (file && typeof file !== "string") {
    resumeText = await extractResumeText(file);
    if (!resumeText.trim()) resumeText = pastedResumeText;
  } else {
    resumeText = pastedResumeText;
  }
  if (!resumeText.trim()) {
    const savedResume = await getLatestResume(user.id);
    resumeText = String(savedResume?.content || "").trim();
  }

  if (!resumeText.trim()) {
    return NextResponse.json({ error: "Upload a readable resume file, paste resume text, or upload a resume in Profile first." }, { status: 400 });
  }

  let result;
  try {
    result = await scoreResumeForAts({ resumeText, jobDescription, requireAi: false });
  } catch (error) {
    await addAudit({
      userId: user.id,
      eventType: "ATS_SCORE_FAILED",
      message: "ATS resume score generation failed.",
      metadata: { reason: error.message }
    });
    return NextResponse.json({
      error: "GPT ATS scoring failed.",
      detail: error.message,
      fix: openAiFix(error.message)
    }, { status: 503 });
  }
  await addAudit({
    userId: user.id,
    eventType: "ATS_SCORE_GENERATED",
    message: "ATS resume score generated.",
    metadata: { aiUsed: result.aiUsed, overallScore: result.overallScore, warning: result.warning || "" }
  });

  return NextResponse.json({ result });
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
  return "Check OPENAI_API_KEY, OPENAI_MODEL, OpenAI billing, and the uploaded resume text, then redeploy/restart if environment variables changed.";
}
