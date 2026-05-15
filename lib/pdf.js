const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const LINE_HEIGHT = 14;
const FONT_SIZE = 10.5;

export function createResumePdf(resume) {
  const lines = resumeToLines(resume);
  const pages = paginate(lines);
  const objects = [];

  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };

  const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesId = addObject("");
  const pageIds = [];

  for (const pageLines of pages) {
    const contentId = addObject(streamForLines(pageLines));
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "binary"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "binary");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "binary");
}

function resumeToLines(resume) {
  const lines = [];
  const add = (text = "", options = {}) => lines.push({ text: String(text || ""), ...options });
  const addSection = (title) => {
    lines.push({ text: "", spacer: true });
    add(title, { bold: true, size: 12 });
  };

  add(resume.candidateName || "Tailored Resume", { bold: true, size: 19 });
  if (resume.targetRole) add(resume.targetRole, { bold: true, size: 11 });
  if (resume.contactLine) add(resume.contactLine, { size: 9.5 });

  if (resume.professionalSummary) {
    addSection("PROFESSIONAL SUMMARY");
    wrap(resume.professionalSummary).forEach((line) => add(line));
  }

  if (resume.coreSkills?.length) {
    addSection("CORE SKILLS");
    wrap(resume.coreSkills.join(" | ")).forEach((line) => add(line));
  }

  if (resume.experienceBullets?.length) {
    addSection("RELEVANT EXPERIENCE");
    resume.experienceBullets.forEach((bullet) => wrap(`- ${bullet}`).forEach((line) => add(line)));
  }

  if (resume.projects?.length) {
    addSection("PROJECTS");
    resume.projects.forEach((item) => wrap(`- ${item}`).forEach((line) => add(line)));
  }

  if (resume.education?.length) {
    addSection("EDUCATION");
    resume.education.forEach((item) => wrap(`- ${item}`).forEach((line) => add(line)));
  }

  if (resume.certifications?.length) {
    addSection("CERTIFICATIONS");
    resume.certifications.forEach((item) => wrap(`- ${item}`).forEach((line) => add(line)));
  }

  if (resume.atsKeywords?.length) {
    addSection("ATS KEYWORDS");
    wrap(resume.atsKeywords.join(" | ")).forEach((line) => add(line, { size: 9.5 }));
  }

  return lines;
}

function paginate(lines) {
  const pages = [];
  let page = [];
  let y = PAGE_HEIGHT - MARGIN;

  for (const line of lines) {
    const lineHeight = line.spacer ? 8 : LINE_HEIGHT + Math.max(0, (line.size || FONT_SIZE) - FONT_SIZE);
    if (y - lineHeight < MARGIN && page.length) {
      pages.push(page);
      page = [];
      y = PAGE_HEIGHT - MARGIN;
    }
    page.push(line);
    y -= lineHeight;
  }

  if (page.length) pages.push(page);
  return pages.length ? pages : [[{ text: "Tailored Resume", bold: true, size: 18 }]];
}

function streamForLines(lines) {
  let y = PAGE_HEIGHT - MARGIN;
  const body = ["BT"];

  for (const line of lines) {
    if (line.spacer) {
      y -= 8;
      continue;
    }
    const size = line.size || FONT_SIZE;
    const font = line.bold ? "F2" : "F1";
    body.push(`/${font} ${size} Tf`);
    body.push(`1 0 0 1 ${MARGIN} ${y} Tm`);
    body.push(`(${escapePdf(line.text)}) Tj`);
    y -= LINE_HEIGHT + Math.max(0, size - FONT_SIZE);
  }

  body.push("ET");
  const content = body.join("\n");
  return `<< /Length ${Buffer.byteLength(content, "binary")} >>\nstream\n${content}\nendstream`;
}

function wrap(text, max = 92) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function escapePdf(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "");
}
