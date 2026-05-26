import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const rootDir = path.join(/*turbopackIgnore: true*/ process.cwd(), ".local-data", "files");

export async function saveUploadedFile(file, { userId, folder = "resumes" } = {}) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return saveFileBuffer(buffer, {
    userId,
    folder,
    originalName: file.name || "upload",
    contentType: file.type || "application/octet-stream"
  });
}

export async function saveFileBuffer(buffer, { userId, folder = "files", originalName = "file", contentType = "application/octet-stream" } = {}) {
  const checksum = sha256(buffer);
  const safeName = sanitizeFileName(originalName);
  const userPart = sanitizeFileName(userId || "anonymous");
  const targetDir = path.join(rootDir, folder, userPart);
  const storedName = `${Date.now()}-${checksum.slice(0, 12)}-${safeName}`;
  const filePath = path.join(targetDir, storedName);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(filePath, buffer);
  return {
    filePath,
    fileName: safeName,
    storedName,
    contentType,
    size: buffer.length,
    checksum
  };
}

export async function readStoredFile(filePath) {
  const resolved = path.resolve(/*turbopackIgnore: true*/ filePath || "");
  const root = path.resolve(rootDir);
  if (!resolved.startsWith(root)) {
    throw new Error("Invalid file path.");
  }
  return fs.readFile(resolved);
}

export function sanitizeFileName(value) {
  const ext = path.extname(String(value || "")).toLowerCase().replace(/[^a-z0-9.]/g, "");
  const base = path.basename(String(value || "file"), ext)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "file";
  return `${base}${ext || ""}`;
}

export function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
