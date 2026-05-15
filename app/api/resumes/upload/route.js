import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { saveResume, addAudit } from "@/lib/store";
import { extractResumeText } from "@/lib/resumeText";

export async function POST(request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("resume");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Resume file is required." }, { status: 400 });
  }

  const text = await extractResumeText(file);
  const resume = await saveResume({
    userId: user.id,
    fileName: file.name,
    fileType: file.type || "unknown",
    content: text
  });
  await addAudit({ userId: user.id, eventType: "RESUME_UPLOADED", message: `Resume uploaded: ${file.name}.` });
  return NextResponse.json({ resume });
}
