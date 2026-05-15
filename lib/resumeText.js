export async function extractResumeText(file) {
  if (!file || typeof file === "string") return "";

  const name = file.name || "resume";
  const type = file.type || "";
  const buffer = Buffer.from(await file.arrayBuffer());

  if (type.startsWith("text/") || name.toLowerCase().endsWith(".txt")) {
    return buffer.toString("utf8").trim();
  }

  if (type === "application/pdf" || name.toLowerCase().endsWith(".pdf")) {
    return extractTextFromPdfBuffer(buffer);
  }

  if (name.toLowerCase().endsWith(".docx")) {
    return extractTextFromDocxBuffer(buffer);
  }

  return buffer.toString("utf8").replace(/[^\x09\x0a\x0d\x20-\x7e]+/g, " ").replace(/\s+/g, " ").trim();
}

function extractTextFromPdfBuffer(buffer) {
  const raw = buffer.toString("latin1");
  const fragments = [];
  const literalStringPattern = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
  const arrayPattern = /\[((?:\s*\([^()\\]*(?:\\.[^()\\]*)*\)\s*)+)\]\s*TJ/g;

  for (const match of raw.matchAll(literalStringPattern)) {
    fragments.push(unescapePdfText(match[1]));
  }

  for (const match of raw.matchAll(arrayPattern)) {
    for (const item of match[1].matchAll(/\(([^()\\]*(?:\\.[^()\\]*)*)\)/g)) {
      fragments.push(unescapePdfText(item[1]));
    }
  }

  const text = fragments.join(" ").replace(/\s+/g, " ").trim();
  if (text.length > 80) return text;

  return raw
    .replace(/[^\x09\x0a\x0d\x20-\x7e]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18000);
}

function extractTextFromDocxBuffer(buffer) {
  const raw = buffer.toString("utf8");
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18000);
}

function unescapePdfText(value) {
  return String(value || "")
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .trim();
}
