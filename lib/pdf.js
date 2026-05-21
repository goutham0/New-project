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
  const layout = layoutForResume(normalized);
  const lines = resumeToLines(normalized, layout);
  const pages = paginate(lines, layout);
  const objects = [];

  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };

  const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesId = addObject("");
  const pageIds = [];

  for (const pageLines of pages) {
    const contentId = addObject(streamForLines(pageLines, layout));
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

export function resumeToPlainText(resume) {
  const value = normalizeResume(resume);
  const lines = [];
  const push = (text = "") => lines.push(clean(text));
  const section = (title) => {
    if (lines.length) push("");
    push(title.toUpperCase());
  };

  push(value.candidateName || "Full Name");
  if (value.contactLine) push(value.contactLine);

  if (value.professionalSummary) {
    section("Professional Summary");
    push(value.professionalSummary);
  }

  if (value.skills.length) {
    section("Technical Skills");
    value.skills.forEach((group) => push(`${group.label}: ${group.items.join(", ")}`));
  }

  if (value.experience.length) {
    section("Professional Experience");
    value.experience.forEach((item) => {
      push(`${item.title || "Experience"}${item.dates ? ` | ${item.dates}` : ""}`);
      push(`${item.company || ""}${item.location ? ` | ${item.location}` : ""}`);
      item.bullets.forEach((bullet) => push(`- ${bullet}`));
      push("");
    });
  }

  if (value.education.length) {
    section("Education");
    value.education.forEach((item) => {
      push(`${item.institution || item.school || item.name}${item.location ? ` | ${item.location}` : ""}`);
      push(`${item.degree || item.details}${item.dates ? ` | ${item.dates}` : ""}`);
      if (item.detail) push(item.detail);
    });
  }

  if (value.projects.length) {
    section("Projects");
    value.projects.forEach((item) => {
      const tech = item.technologies?.length ? ` | ${item.technologies.join(", ")}` : "";
      push(`${item.name || "Project"}${tech}${item.dates ? ` | ${item.dates}` : ""}`);
      item.bullets.forEach((bullet) => push(`- ${bullet}`));
      push("");
    });
  }

  if (value.certifications.length) {
    section("Certifications");
    value.certifications.forEach((item) => push(`- ${item}`));
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function resumeToLines(resume, layout = defaultLayout()) {
  const lines = [];
  const add = (text = "", options = {}) => lines.push({ text: clean(text), ...options });
  const addBlank = (height = 5) => lines.push({ spacer: true, height });
  const addSection = (title) => {
    addBlank(7);
    add(title.toUpperCase(), { bold: true, size: layout.sectionSize, section: true });
  };

  add(resume.candidateName || "Full Name", { bold: true, size: 18, align: "center", lineHeight: 20 });
  if (resume.contactLine) add(resume.contactLine, { size: 9.3, align: "center", lineHeight: 11 });

  if (resume.professionalSummary) {
    addSection("Professional Summary");
    wrap(resume.professionalSummary, layout.bodySize, contentWidth(layout)).forEach((line) => add(line));
  }

  if (resume.skills.length) {
    addSection("Technical Skills");
    resume.skills.forEach((group) => {
      const label = group.label ? `${group.label}: ` : "";
      wrap(`${label}${group.items.join(", ")}`, layout.bodySize, contentWidth(layout)).forEach((line, index) => {
        add(line, { boldLead: index === 0 && Boolean(group.label) });
      });
    });
  }

  if (resume.experience.length) {
    addSection("Professional Experience");
    resume.experience.forEach((item) => {
      add(item.title || "Experience", { bold: true, rightText: item.dates });
      add(item.company || "", { italic: true, rightText: item.location });
      item.bullets.forEach((bullet) => addBullet(bullet, add, layout));
      addBlank(3);
    });
  }

  if (resume.education.length) {
    addSection("Education");
    resume.education.forEach((item) => {
      add(item.institution || item.school || item.name, { bold: true, rightText: item.location });
      add(item.degree || item.details, { italic: true, rightText: item.dates });
      if (item.detail) wrap(item.detail, layout.bodySize, contentWidth(layout)).forEach((line) => add(line));
      addBlank(2);
    });
  }

  if (resume.coursework.length) {
    addSection("Relevant Coursework");
    wrap(resume.coursework.join(", "), layout.bodySize, contentWidth(layout)).forEach((line) => add(line));
  }

  if (resume.projects.length) {
    addSection("Projects");
    resume.projects.forEach((item) => {
      const tech = item.technologies?.length ? ` | ${item.technologies.join(", ")}` : "";
      add(`${item.name || "Project"}${tech}`, { bold: true, rightText: item.dates || item.location });
      item.bullets.forEach((bullet) => addBullet(bullet, add, layout));
      addBlank(3);
    });
  }

  if (resume.certifications.length) {
    addSection("Certifications");
    resume.certifications.forEach((certification) => addBullet(certification, add, layout));
  }

  return lines;
}

function addBullet(text, add, layout = defaultLayout()) {
  const wrapped = wrap(text, layout.bodySize, contentWidth(layout) - 14);
  wrapped.forEach((line, index) => add(index === 0 ? `- ${line}` : `  ${line}`, { indent: 10 }));
}

function paginate(lines, layout = defaultLayout()) {
  const pages = [];
  let page = [];
  let y = PAGE_HEIGHT - layout.marginTop;

  for (const line of lines) {
    const height = line.spacer ? line.height : line.lineHeight || lineHeight(line, layout);
    if (y - height < layout.marginBottom && page.length) {
      pages.push(page);
      page = [];
      y = PAGE_HEIGHT - layout.marginTop;
    }
    page.push(line);
    y -= height;
  }

  if (page.length) pages.push(page);
  return pages.length ? pages : [[{ text: "Full Name", bold: true, size: 18, align: "center" }]];
}

function streamForLines(lines, layout = defaultLayout()) {
  let y = PAGE_HEIGHT - layout.marginTop;
  const body = ["0 0 0 RG 0 0 0 rg"];

  for (const line of lines) {
    if (line.spacer) {
      y -= line.height;
      continue;
    }

    const size = line.size || layout.bodySize;
    const font = line.bold ? "F2" : line.italic ? "F3" : "F1";
    const x = positionX(line.text, size, line.align, line.indent || 0, layout);
    body.push("BT");
    body.push(`/${font} ${size} Tf`);
    body.push(`1 0 0 1 ${fixed(x)} ${fixed(y)} Tm`);
    body.push(`(${escapePdf(line.text)}) Tj`);
    body.push("ET");

    if (line.rightText) {
      const right = clean(line.rightText);
      body.push("BT");
      body.push(`/F1 ${size} Tf`);
      body.push(`1 0 0 1 ${fixed(PAGE_WIDTH - layout.marginX - estimateWidth(right, size))} ${fixed(y)} Tm`);
      body.push(`(${escapePdf(right)}) Tj`);
      body.push("ET");
    }

    if (line.section) {
      const lineY = y - 3.5;
      body.push(`0.5 w ${layout.marginX} ${fixed(lineY)} m ${PAGE_WIDTH - layout.marginX} ${fixed(lineY)} l S`);
    }

    y -= line.lineHeight || lineHeight(line, layout);
  }

  const content = body.join("\n");
  return `<< /Length ${Buffer.byteLength(content, "binary")} >>\nstream\n${content}\nendstream`;
}

function normalizeResume(resume = {}) {
  const candidateName = resume.candidateName || "Full Name";
  const targetPageCount = Math.max(1, Number(resume.targetPageCount || 1) || 1);
  return {
    targetPageCount,
    candidateName,
    contactLine: resume.contactLine || "",
    professionalSummary: resume.professionalSummary || resume.profile || "",
    education: normalizeEducation(resume.education),
    coursework: arrayOfStrings(resume.coursework || resume.relevantCoursework),
    experience: normalizeExperience(resume.experience, resume.experienceBullets, targetPageCount),
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

function normalizeExperience(value, fallbackBullets = [], targetPageCount = 1) {
  const bulletLimit = targetPageCount >= 5 ? 32 : targetPageCount >= 3 ? 14 : 9;
  if (Array.isArray(value) && value.length) {
    return value.map((item) => ({
      title: item.title || "",
      company: item.company || "",
      location: item.location || "",
      dates: item.dates || "",
      bullets: arrayOfStrings(item.bullets).slice(0, bulletLimit)
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

function lineHeight(line, layout = defaultLayout()) {
  return Math.max(layout.bodyLine, (line.size || layout.bodySize) + 2.6);
}

function contentWidth(layout = defaultLayout()) {
  return PAGE_WIDTH - layout.marginX * 2;
}

function positionX(text, size, align, indent, layout = defaultLayout()) {
  if (align === "center") return (PAGE_WIDTH - estimateWidth(text, size)) / 2;
  if (align === "right") return PAGE_WIDTH - layout.marginX - estimateWidth(text, size);
  return layout.marginX + indent;
}

function defaultLayout() {
  return {
    marginX: MARGIN_X,
    marginTop: MARGIN_TOP,
    marginBottom: MARGIN_BOTTOM,
    bodySize: BODY_SIZE,
    bodyLine: BODY_LINE,
    sectionSize: SECTION_SIZE
  };
}

function layoutForResume(resume = {}) {
  const pageTarget = Number(resume.targetPageCount || 1);
  if (pageTarget >= 5) {
    return {
      marginX: 52,
      marginTop: 34,
      marginBottom: 38,
      bodySize: 9.6,
      bodyLine: 12.8,
      sectionSize: 10.8
    };
  }
  if (pageTarget >= 3) {
    return {
      marginX: 58,
      marginTop: 36,
      marginBottom: 40,
      bodySize: 9.8,
      bodyLine: 13.2,
      sectionSize: 10.8
    };
  }
  return defaultLayout();
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
