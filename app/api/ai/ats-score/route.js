import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { addAudit } from "@/lib/store";
import { extractResumeText } from "@/lib/resumeText";
import { scoreResumeForAts } from "@/lib/openaiResume";

export async function POST(request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("resume");
  const jobDescription = String(formData.get("jobDescription") || "").trim();
  const resumeText = file && typeof file !== "string" ? await extractResumeText(file) : String(formData.get("resumeText") || "").trim();

  if (!resumeText.trim()) {
    return NextResponse.json({ error: "Upload a readable resume file or paste resume text." }, { status: 400 });
  }

  let result;
  try {
    result = await scoreResumeForAts({ resumeText, jobDescription, requireAi: true });
  } catch (error) {
    await addAudit({
      userId: user.id,
      eventType: "ATS_SCORE_FAILED",
      message: "ATS resume score generation failed.",
      metadata: { reason: error.message }
    });
    return NextResponse.json({
      error: "GPT ATS scoring is not active yet.",
      detail: error.message,
      fix: "Add OPENAI_API_KEY and OPENAI_MODEL in your environment variables, redeploy/restart, then try again."
    }, { status: 503 });
  }
  await addAudit({
    userId: user.id,
    eventType: "ATS_SCORE_GENERATED",
    message: "ATS resume score generated.",
    metadata: { aiUsed: result.aiUsed, overallScore: result.overallScore }
  });

  return NextResponse.json({ result });
}
