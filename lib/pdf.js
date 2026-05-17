const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 44;
const MARGIN_TOP = 34;
const MARGIN_BOTTOM = 38;
const BODY_SIZE = 9.4;
const BODY_LINE = 12;
const SECTION_SIZE = 10.6;

export function createResumePdf(resume) {
  const normalized = normalizeResume(resume);
  const lines = resumeToLines(normalized);
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
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >> /F3 << /Type /Font /Subtype /Type1 /BaseFont /Times-Italic >> >> >> /Contents ${contentId} 0 R >>`);
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
  const add = (text = "", options = {}) => lines.push({ text: clean(text), ...options });
  const addBlank = (height = 5) => lines.push({ spacer: true, height });
  const addSection = (title) => {
    addBlank(7);
    add(title.toUpperCase(), { bold: true, size: SECTION_SIZE, section: true });
  };

  add(resume.candidateName || "Full Name", { bold: true, size: 18, align: "center", lineHeight: 20 });
  if (resume.contactLine) add(resume.contactLine, { size: 9.3, align: "center", lineHeight: 11 });

  if (resume.professionalSummary) {
    addSection("Profile");
    wrap(resume.professionalSummary, BODY_SIZE, contentWidth()).forEach((line) => add(line));
  }

  if (resume.education.length) {
    addSection("Education");
    resume.education.forEach((item) => {
      add(item.institution || item.school || item.name, { bold: true, rightText: item.location });
      add(item.degree || item.details, { italic: true, rightText: item.dates });
      if (item.detail) wrap(item.detail, BODY_SIZE, contentWidth()).forEach((line) => add(line));
      addBlank(2);
    });
  }

  if (resume.coursework.length) {
    addSection("Relevant Coursework");
    wrap(resume.coursework.join(", "), BODY_SIZE, contentWidth()).forEach((line) => add(line));
  }

  if (resume.experience.length) {
    addSection("Work Experience");
    resume.experience.forEach((item) => {
      add(item.title || "Experience", { bold: true, rightText: item.dates });
      add(item.company || "", { italic: true, rightText: item.location });
      item.bullets.forEach((bullet) => addBullet(bullet, add));
      addBlank(3);
    });
  }

  if (resume.skills.length || resume.certifications.length) {
    addSection("Skills & Certifications");
    resume.skills.forEach((group) => {
      const label = group.label ? `${group.label}: ` : "";
      wrap(`${label}${group.items.join(", ")}`, BODY_SIZE, contentWidth()).forEach((line, index) => {
        add(line, { boldLead: index === 0 && Boolean(group.label) });
      });
    });
    if (resume.certifications.length) {
      wrap(`Certifications: ${resume.certifications.join(", ")}`, BODY_SIZE, contentWidth()).forEach((line) => add(line));
    }
  }

  if (resume.projects.length) {
    addSection("Technical Projects");
    resume.projects.forEach((item) => {
      const tech = item.technologies?.length ? ` | ${item.technologies.join(", ")}` : "";
      add(`${item.name || "Project"}${tech}`, { bold: true, rightText: item.dates || item.location });
      item.bullets.forEach((bullet) => addBullet(bullet, add));
      addBlank(3);
    });
  }

  return lines;
}

function addBullet(text, add) {
  const wrapped = wrap(text, BODY_SIZE, contentWidth() - 14);
  wrapped.forEach((line, index) => add(index === 0 ? `- ${line}` : `  ${line}`, { indent: 10 }));
}

function paginate(lines) {
  const pages = [];
  let page = [];
  let y = PAGE_HEIGHT - MARGIN_TOP;

  for (const line of lines) {
    const height = line.spacer ? line.height : line.lineHeight || lineHeight(line);
    if (y - height < MARGIN_BOTTOM && page.length) {
      pages.push(page);
      page = [];
      y = PAGE_HEIGHT - MARGIN_TOP;
    }
    page.push(line);
    y -= height;
  }

  if (page.length) pages.push(page);
  return pages.length ? pages : [[{ text: "Full Name", bold: true, size: 18, align: "center" }]];
}

function streamForLines(lines) {
  let y = PAGE_HEIGHT - MARGIN_TOP;
  const body = ["0 0 0 RG 0 0 0 rg"];

  for (const line of lines) {
    if (line.spacer) {
      y -= line.height;
      continue;
    }

    const size = line.size || BODY_SIZE;
    const font = line.bold ? "F2" : line.italic ? "F3" : "F1";
    const x = positionX(line.text, size, line.align, line.indent || 0);
    body.push("BT");
    body.push(`/${font} ${size} Tf`);
    body.push(`1 0 0 1 ${fixed(x)} ${fixed(y)} Tm`);
    body.push(`(${escapePdf(line.text)}) Tj`);
    body.push("ET");

    if (line.rightText) {
      const right = clean(line.rightText);
      body.push("BT");
      body.push(`/F1 ${size} Tf`);
      body.push(`1 0 0 1 ${fixed(PAGE_WIDTH - MARGIN_X - estimateWidth(right, size))} ${fixed(y)} Tm`);
      body.push(`(${escapePdf(right)}) Tj`);
      body.push("ET");
    }

    if (line.section) {
      const lineY = y - 3.5;
      body.push(`0.5 w ${MARGIN_X} ${fixed(lineY)} m ${PAGE_WIDTH - MARGIN_X} ${fixed(lineY)} l S`);
    }

    y -= line.lineHeight || lineHeight(line);
  }

  const content = body.join("\n");
  return `<< /Length ${Buffer.byteLength(content, "binary")} >>\nstream\n${content}\nendstream`;
}

function normalizeResume(resume = {}) {
  const candidateName = resume.candidateName || "Full Name";
  return {
    candidateName,
    contactLine: resume.contactLine || "",
    professionalSummary: resume.professionalSummary || resume.profile || "",
    education: normalizeEducation(resume.education),
    coursework: arrayOfStrings(resume.coursework || resume.relevantCoursework),
    experience: normalizeExperience(resume.experience, resume.experienceBullets),
    skills: normalizeSkills(resume.skills, resume.coreSkills),
    certifications: arrayOfStrings(resume.certifications),
    projects: normalizeProjects(resume.projects)
  };
}

function normalizeEducation(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === "string") return { institution: item, degree: "", dates: "", location: "" };
    return {
      institution: item.institution || item.school || item.name || "",
      degree: item.degree || item.details || "",
      dates: item.dates || "",
      location: item.location || "",
      detail: item.detail || ""
    };
  }).filter((item) => item.institution || item.degree);
}

function normalizeExperience(value, fallbackBullets = []) {
  if (Array.isArray(value) && value.length) {
    return value.map((item) => ({
      title: item.title || "",
      company: item.company || "",
      location: item.location || "",
      dates: item.dates || "",
      bullets: arrayOfStrings(item.bullets).slice(0, 9)
    })).filter((item) => item.title || item.company || item.bullets.length);
  }

  const bullets = arrayOfStrings(fallbackBullets);
  return bullets.length ? [{ title: "Relevant Experience", company: "", location: "", dates: "", bullets }] : [];
}

function normalizeSkills(value, fallbackSkills = []) {
  if (Array.isArray(value) && value.some((item) => typeof item === "object")) {
    return value.map((item) => ({
      label: item.label || "Skills",
      items: arrayOfStrings(item.items)
    })).filter((item) => item.items.length);
  }
  const items = arrayOfStrings(value?.length ? value : fallbackSkills);
  return items.length ? [{ label: "Skills", items }] : [];
}

function normalizeProjects(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === "string") return { name: item, technologies: [], dates: "", location: "", bullets: [] };
    return {
      name: item.name || item.title || "",
      technologies: arrayOfStrings(item.technologies),
      dates: item.dates || "",
      location: item.location || "",
      bullets: arrayOfStrings(item.bullets).slice(0, 8)
    };
  }).filter((item) => item.name || item.bullets.length);
}

function lineHeight(line) {
  return Math.max(BODY_LINE, (line.size || BODY_SIZE) + 2.6);
}

function contentWidth() {
  return PAGE_WIDTH - MARGIN_X * 2;
}

function positionX(text, size, align, indent) {
  if (align === "center") return (PAGE_WIDTH - estimateWidth(text, size)) / 2;
  if (align === "right") return PAGE_WIDTH - MARGIN_X - estimateWidth(text, size);
  return MARGIN_X + indent;
}

function wrap(text, size, maxWidth) {
  const words = clean(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (estimateWidth(next, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function estimateWidth(text, size) {
  return clean(text).length * size * 0.49;
}

function clean(value) {
  return String(value || "")
    .replace(/[\u2022\u25cf]/g, "-")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function arrayOfStrings(value) {
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
}

function fixed(value) {
  return Number(value || 0).toFixed(2);
}

function escapePdf(text) {
  return clean(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}
