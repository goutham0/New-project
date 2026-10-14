import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getResumeById } from "@/lib/store";
import { readStoredFile, sanitizeFileName } from "@/lib/fileStorage";

export async function GET(_request, { params }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const resume = await getResumeById(user.id, id);
  if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  if (new URL(_request.url).searchParams.get("download") === "1") {
    if (!resume.originalFilePath) return NextResponse.json({ error: "Original file unavailable. Upload your resume again." }, { status: 404 });
    try {
      return new NextResponse(await readStoredFile(resume.originalFilePath), { headers: {
        "Content-Type": resume.fileType === "PDF" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${sanitizeFileName(resume.fileName)}"`,
        "Cache-Control": "private, no-store"
      } });
    } catch { return NextResponse.json({ error: "Original resume could not be downloaded. Please try again." }, { status: 503 }); }
  }
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
