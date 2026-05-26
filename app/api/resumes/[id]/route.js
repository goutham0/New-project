import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getResumeById } from "@/lib/store";

export async function GET(_request, { params }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const resume = await getResumeById(user.id, id);
  if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  return NextResponse.json({
    resume: {
      id: resume.id,
      fileName: resume.fileName,
      fileType: resume.fileType,
      parsedText: resume.content,
      parsedJson: resume.parsedJson,
      checksumSha256: resume.checksumSha256,
      isPrimary: resume.isPrimary,
      createdAt: resume.createdAt
    }
  });
}
