import {
  AlignmentType,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun
} from "docx";

export async function createResumeDocx(resume) {
  const normalized = normalizeResume(resume);
  const children = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: normalized.candidateName || "Full Name", bold: true, size: 28 })]
    })
  );
  if (normalized.contactLine) {
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: normalized.contactLine, size: 18 })] }));
  }

  addSection(children, "Professional Summary");
  children.push(paragraph(normalized.professionalSummary));

  if (normalized.skills.length) {
    addSection(children, "Technical Skills");
    for (const group of normalized.skills) {
      children.push(paragraph(`${group.label}: ${group.items.join(", ")}`));
    }
  }

  if (normalized.experience.length) {
    addSection(children, "Professional Experience");
    for (const item of normalized.experience) {
      children.push(roleHeader(item));
      children.push(companyLine(item));
      for (const bullet of item.bullets) children.push(bulletParagraph(bullet));
    }
  }

  if (normalized.education.length) {
    addSection(children, "Education");
    for (const item of normalized.education) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: item.institution || item.school || item.name || "", bold: true }),
          item.location ? new TextRun({ text: ` | ${item.location}` }) : new TextRun("")
        ]
      }));
      children.push(paragraph([item.degree || item.details || "", item.dates].filter(Boolean).join(" | ")));
      if (item.detail) children.push(paragraph(item.detail));
    }
  }

  if (normalized.projects.length) {
    addSection(children, "Projects");
    for (const item of normalized.projects) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: item.name || "Project", bold: true }),
          new TextRun({ text: [item.technologies?.join(", "), item.dates].filter(Boolean).join(" | ") ? ` | ${[item.technologies?.join(", "), item.dates].filter(Boolean).join(" | ")}` : "" })
        ]
      }));
      for (const bullet of item.bullets) children.push(bulletParagraph(bullet));
    }
  }

  if (normalized.certifications.length) {
    addSection(children, "Certifications");
    for (const certification of normalized.certifications) children.push(bulletParagraph(certification));
  }

  const doc = new Document({
    creator: "ApplyFriend",
    styles: {
      default: {
        document: {
          run: { font: "Aptos", size: 20 },
          paragraph: { spacing: { after: 90 } }
        }
      }
    },
    numbering: {
      config: [{
        reference: "resume-bullets",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: { indent: { left: 360, hanging: 180 } }
          }
        }]
      }]
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 720, right: 720, bottom: 720, left: 720 }
        }
      },
      children
    }]
  });

  return Packer.toBuffer(doc);
}

function addSection(children, title) {
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 220, after: 80 },
    border: { bottom: { color: "999999", space: 1, style: "single", size: 4 } },
    children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 20 })]
  }));
}

function paragraph(text) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text: clean(text), size: 20 })]
  });
}

function bulletParagraph(text) {
  return new Paragraph({
    numbering: { reference: "resume-bullets", level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text: clean(text), size: 20 })]
  });
}

function roleHeader(item) {
  return new Paragraph({
    spacing: { before: 120, after: 40 },
    children: [
      new TextRun({ text: clean(item.title || "Experience"), bold: true }),
      item.dates ? new TextRun({ text: ` | ${clean(item.dates)}`, bold: true }) : new TextRun("")
    ]
  });
}

function companyLine(item) {
  return new Paragraph({
    spacing: { after: 50 },
    children: [
      new TextRun({ text: clean(item.company || ""), italics: true }),
      item.location ? new TextRun({ text: ` | ${clean(item.location)}`, italics: true }) : new TextRun("")
    ]
  });
}

function normalizeResume(resume = {}) {
  return {
    candidateName: resume.candidateName || "Full Name",
    contactLine: resume.contactLine || "",
    professionalSummary: resume.professionalSummary || resume.profile || "",
    skills: Array.isArray(resume.skills) ? resume.skills.map((group) => ({
      label: group.label || "Skills",
      items: arrayOfStrings(group.items)
    })).filter((group) => group.items.length) : [],
    experience: Array.isArray(resume.experience) ? resume.experience.map((item) => ({
      title: item.title || "",
      company: item.company || "",
      location: item.location || "",
      dates: item.dates || "",
      bullets: arrayOfStrings(item.bullets)
    })).filter((item) => item.title || item.company || item.bullets.length) : [],
    education: Array.isArray(resume.education) ? resume.education : [],
    projects: Array.isArray(resume.projects) ? resume.projects.map((item) => ({
      name: item.name || item.title || "",
      technologies: arrayOfStrings(item.technologies),
      dates: item.dates || "",
      bullets: arrayOfStrings(item.bullets)
    })).filter((item) => item.name || item.bullets.length) : [],
    certifications: arrayOfStrings(resume.certifications)
  };
}

function arrayOfStrings(value) {
  return Array.isArray(value) ? value.map((item) => clean(item)).filter(Boolean) : [];
}

function clean(value) {
  return String(value || "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}
