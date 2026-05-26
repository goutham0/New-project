import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getTailoredResumeById } from "@/lib/store";

export async function GET(_request, { params }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const tailoredResume = await getTailoredResumeById(user.id, id);
  if (!tailoredResume?.tailoredJson?.artifact?.docxBase64) {
    return NextResponse.json({ error: "Tailored resume file not found." }, { status: 404 });
  }
  const buffer = Buffer.from(tailoredResume.tailoredJson.artifact.docxBase64, "base64");
  const candidate = tailoredResume.tailoredJson?.candidateName || "candidate";
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename=\"${safeFilePart(candidate)}-tailored-resume.docx\"`,
      "Cache-Control": "private, no-store"
    }
  });
}

function safeFilePart(value) {
  return String(value || "candidate")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "candidate";
}
