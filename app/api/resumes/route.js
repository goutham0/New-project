import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listResumes } from "@/lib/store";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const resumes = await listResumes(user.id);
  return NextResponse.json({
    resumes: resumes.map((resume) => ({
      id: resume.id,
      fileName: resume.fileName,
      fileType: resume.fileType,
      parsedJson: resume.parsedJson,
      checksumSha256: resume.checksumSha256,
      isPrimary: resume.isPrimary,
      createdAt: resume.createdAt
    }))
  });
}
