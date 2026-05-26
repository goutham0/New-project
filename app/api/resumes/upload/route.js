import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { saveResume, addAudit } from "@/lib/store";
import { extractResumeText } from "@/lib/resumeText";
import { saveUploadedFile, sha256 } from "@/lib/fileStorage";
import { parseResumeTextToJson } from "@/lib/resumePipeline";

const allowedExtensions = [".docx", ".pdf"];
const maxFileBytes = 8 * 1024 * 1024;

export async function POST(request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("resume");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Resume file is required." }, { status: 400 });
  }
  const fileName = String(file.name || "resume");
  const extension = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  if (!allowedExtensions.includes(extension)) {
    return NextResponse.json({ error: "Unsupported file type. Upload a .docx or .pdf resume." }, { status: 400 });
  }
  if (file.size > maxFileBytes) {
    return NextResponse.json({ error: "Resume file is too large. Maximum size is 8 MB." }, { status: 413 });
  }

  const text = await extractResumeText(file);
  if (!text || text.length < 80) {
    return NextResponse.json({ error: "Resume parsing failed. Upload a readable DOCX/PDF or paste resume text in the tailoring page." }, { status: 422 });
  }
  const fallbackBuffer = Buffer.from(await file.arrayBuffer());
  let stored;
  try {
    stored = await saveUploadedFile(file, { userId: user.id, folder: "resumes" });
  } catch (error) {
    stored = {
      fileName,
      filePath: "",
      checksum: sha256(fallbackBuffer),
      warning: `Original file could not be persisted to local storage: ${error.message}`
    };
  }
  const parsedJson = parseResumeTextToJson(text, { email: user.email });
  const resume = await saveResume({
    userId: user.id,
    fileName: stored.fileName,
    fileType: extension === ".docx" ? "DOCX" : "PDF",
    content: text,
    filePath: stored.filePath,
    parsedJson,
    checksum: stored.checksum,
    isPrimary: true
  });
  await addAudit({
    userId: user.id,
    eventType: "RESUME_UPLOADED",
    message: `Resume uploaded: ${fileName}.`,
    metadata: { resumeId: resume.id, fileType: resume.fileType, checksum: stored.checksum }
  });
  return NextResponse.json({ resume });
}
