import { z } from "zod";
import { generateTailoredResume, scoreResumeForAts } from "./openaiResume.js";
import { createResumeDocx } from "./docxResume.js";

export const tailoredResumeJsonSchema = z.object({
  candidateName: z.string().default("Full Name"),
  contactLine: z.string().default(""),
  targetRole: z.string().default("Target role"),
  professionalSummary: z.string().min(20),
  skills: z.array(z.object({
    label: z.string(),
    items: z.array(z.string())
  })).default([]),
  experience: z.array(z.object({
    company: z.string(),
    title: z.string(),
    location: z.string().default(""),
    dates: z.string().default(""),
    bullets: z.array(z.string()).min(1)
  })).default([]),
  projects: z.array(z.object({
    name: z.string(),
    technologies: z.array(z.string()).default([]),
    location: z.string().default(""),
    dates: z.string().default(""),
    bullets: z.array(z.string()).default([])
  })).default([]),
  education: z.array(z.object({
    institution: z.string().default(""),
    degree: z.string().default(""),
    location: z.string().default(""),
    dates: z.string().default(""),
    detail: z.string().default("")
  })).default([]),
  certifications: z.array(z.string()).default([]),
  atsKeywords: z.array(z.string()).default([]),
  coverLetter: z.string().default(""),
  screeningAnswers: z.array(z.object({
    question: z.string(),
    answer: z.string()
  })).default([]),
  tailoringNotes: z.array(z.string()).default([]),
  missingButRequiredSkills: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  aiUsed: z.boolean().default(false),
  targetPageCount: z.number().default(1)
});

export function parseResumeTextToJson(resumeText, profile = {}) {
  const parsed = fallbackParsedResume(resumeText, profile);
  return {
    contact: parseContact(resumeText, profile),
    summary: parsed.professionalSummary,
    skills: parsed.skills,
    experience: parsed.experience,
    projects: parsed.projects,
    education: parsed.education,
    certifications: parsed.certifications,
    rawTextLength: String(resumeText || "").length,
    parserVersion: "applyfriend-heuristic-v1"
  };
}

export function extractJobRequirements(jobDescription = "") {
  const text = String(jobDescription || "");
  const keywords = extractKeywords(text);
  return {
    title: inferJobTitle(text),
    requiredSkills: keywords.slice(0, 18),
    preferredSkills: keywords.slice(18, 30),
    responsibilities: extractResponsibilityLines(text),
    domainKeywords: extractDomainKeywords(text),
    seniority: inferSeniority(text),
    toolsFrameworks: keywords.filter((keyword) => /java|spring|angular|react|node|sql|aws|azure|docker|kubernetes|open shift|openshift|python|typescript|javascript|c#|\.net/i.test(keyword))
  };
}

export function scoreResumeAgainstJob(parsedResume, jobRequirements) {
  const resumeText = searchText(parsedResume);
  const required = jobRequirements.requiredSkills || [];
  const matched = required.filter((keyword) => includes(resumeText, keyword));
  const missing = required.filter((keyword) => !matched.includes(keyword));
  const keywordScore = required.length ? Math.round((matched.length / required.length) * 100) : 70;
  const sectionScore = [
    parsedResume.summary,
    parsedResume.skills?.length,
    parsedResume.experience?.length,
    parsedResume.education?.length
  ].filter(Boolean).length * 20;
  return {
    overallScore: clamp(Math.round(keywordScore * 0.7 + Math.min(100, sectionScore) * 0.3)),
    matchedSkills: matched,
    missingSkills: missing,
    keywordScore,
    sectionScore: Math.min(100, sectionScore)
  };
}

export function createTailoringPlan(parsedResume, jobRequirements) {
  const score = scoreResumeAgainstJob(parsedResume, jobRequirements);
  return {
    emphasizeKeywords: score.matchedSkills.slice(0, 12),
    moveSkillsHigher: score.matchedSkills.slice(0, 10),
    rewriteSummaryAround: [jobRequirements.title, jobRequirements.seniority, ...score.matchedSkills.slice(0, 6)].filter(Boolean),
    missingButRequiredSkills: score.missingSkills,
    warnings: score.missingSkills.length
      ? [`Do not claim missing required skills unless the candidate adds them: ${score.missingSkills.slice(0, 8).join(", ")}.`]
      : []
  };
}

export async function generateTailoredResumeJson({ resumeText, parsedResume, candidateProfile = {}, jobDescription, useAi = true } = {}) {
  const jobRequirements = extractJobRequirements(jobDescription);
  const tailoringPlan = createTailoringPlan(parsedResume || parseResumeTextToJson(resumeText, candidateProfile), jobRequirements);
  const generated = await generateTailoredResume({
    resumeText,
    jobDescription,
    profile: candidateProfile,
    requireAi: false,
    skipAi: !useAi
  });
  const normalized = tailoredResumeJsonSchema.parse({
    ...generated,
    tailoringNotes: generated.tailoringNotes || generated.notes || tailoringPlan.emphasizeKeywords.map((keyword) => `Emphasized ${keyword}.`),
    missingButRequiredSkills: tailoringPlan.missingButRequiredSkills,
    warnings: [...tailoringPlan.warnings, ...(generated.warning ? [generated.warning] : [])]
  });
  const validation = validateTailoredResume(parsedResume || parseResumeTextToJson(resumeText, candidateProfile), normalized);
  if (!validation.valid) {
    throw new Error(`Tailored resume validation failed: ${validation.errors.join(" ")}`);
  }
  return {
    tailoredResume: normalized,
    jobRequirements,
    tailoringPlan,
    validation
  };
}

export async function renderTailoredDocx(tailoredResumeJson) {
  const buffer = await createResumeDocx(tailoredResumeJson);
  return {
    buffer,
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: "docx"
  };
}

export async function tailorResumeToDocx({ resumeText, parsedResume, candidateProfile, jobDescription, useAi = true } = {}) {
  const result = await generateTailoredResumeJson({ resumeText, parsedResume, candidateProfile, jobDescription, useAi });
  const docx = await renderTailoredDocx(result.tailoredResume);
  let atsScore = null;
  try {
    atsScore = await scoreResumeForAts({ resumeText: resumeToText(result.tailoredResume), jobDescription, requireAi: false });
  } catch (error) {
    atsScore = { warning: error.message };
  }
  return { ...result, docx, atsScore };
}

export function validateTailoredResume(originalResume, tailoredResume) {
  const errors = [];
  const warnings = [];
  const originalCompanies = new Map((originalResume.experience || []).map((item) => [key(item.company), item]));
  const originalCompanyText = [...originalCompanies.keys()].filter(Boolean);

  for (const item of tailoredResume.experience || []) {
    const itemKey = key(item.company);
    if (itemKey && !originalCompanies.has(itemKey)) {
      errors.push(`Invented or unknown company detected: ${item.company}.`);
    }
    const source = originalCompanies.get(itemKey);
    if (source?.dates && item.dates && normalizeDate(source.dates) !== normalizeDate(item.dates)) {
      errors.push(`Date changed for ${item.company}: ${source.dates} -> ${item.dates}.`);
    }
  }

  const tailoredCompanies = new Set((tailoredResume.experience || []).map((item) => key(item.company)).filter(Boolean));
  for (const originalKey of originalCompanyText) {
    if (!tailoredCompanies.has(originalKey)) {
      warnings.push(`Original company missing from tailored resume: ${originalCompanies.get(originalKey)?.company}.`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function fallbackParsedResume(resumeText, profile) {
  return {
    professionalSummary: sectionBetweenAny(resumeText, ["PROFESSIONAL SUMMARY", "SUMMARY", "PROFILE"], ["TECHNICAL SKILLS", "SKILLS", "PROFESSIONAL EXPERIENCE", "WORK EXPERIENCE"]) ||
      `${profile.currentTitle || "Professional"} with experience reflected in the uploaded resume.`,
    skills: parseSkillGroups(sectionBetweenAny(resumeText, ["TECHNICAL SKILLS", "SKILLS", "SKILLS & CERTIFICATIONS"], ["PROFESSIONAL EXPERIENCE", "WORK EXPERIENCE", "EXPERIENCE", "PROJECTS", "EDUCATION"])),
    experience: parseExperience(resumeText),
    projects: [],
    education: parseEducation(resumeText, profile),
    certifications: []
  };
}

function parseContact(resumeText, profile) {
  const text = String(resumeText || "");
  return {
    name: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || text.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/)?.[0] || "",
    email: profile.email || text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "",
    phone: profile.phone || text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0] || "",
    linkedinUrl: profile.linkedinUrl || text.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s]+/i)?.[0] || "",
    githubUrl: profile.githubUrl || text.match(/https?:\/\/(?:www\.)?github\.com\/[^\s]+/i)?.[0] || ""
  };
}

function parseSkillGroups(skillsText = "") {
  const labels = ["Languages", "Frameworks", "Cloud/DevOps", "Databases", "Testing/Automation", "Tools"];
  const groups = [];
  for (const label of labels) {
    const match = new RegExp(`${escapeRegExp(label)}\\s*:?\\s*([^\\n]+)`, "i").exec(skillsText);
    const items = splitList(match?.[1] || "");
    if (items.length) groups.push({ label, items });
  }
  if (!groups.length) {
    const items = splitList(skillsText).slice(0, 30);
    if (items.length) groups.push({ label: "Skills", items });
  }
  return groups;
}

function parseExperience(resumeText = "") {
  const work = sectionBetweenAny(resumeText, ["PROFESSIONAL EXPERIENCE", "WORK EXPERIENCE", "EXPERIENCE"], ["EDUCATION", "PROJECTS", "TECHNICAL PROJECTS", "CERTIFICATIONS"]);
  const source = work || resumeText;
  const knownCompanies = [
    "Bank of America",
    "United Health Group",
    "Southern Farm Bureau Casualty Insurance",
    "Texas Tech University Transportation & Parking Services",
    "Vitosia Healthcare"
  ];
  const found = knownCompanies
    .map((company) => ({ company, index: source.toLowerCase().indexOf(company.toLowerCase()) }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index);
  if (found.length) {
    return found.map((item, index) => {
      const chunk = source.slice(item.index, found[index + 1]?.index || source.length);
      return experienceFromChunk(item.company, chunk);
    });
  }
  return [];
}

function experienceFromChunk(company, chunk) {
  const dates = chunk.match(monthRangePattern())?.[0] || "";
  const title = chunk.match(roleTitlePattern())?.[0] || "";
  const location = chunk.match(/\b[A-Z][A-Za-z .'-]+,\s*[A-Z]{2}\b/)?.[0] || "";
  const bullets = chunk
    .split(/(?:\n|\r|\s+-\s+|(?=\b(?:Designed|Developed|Built|Implemented|Led|Automated|Created|Supported|Integrated|Configured|Collaborated|Improved|Delivered|Managed|Performed)\b))/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter((line) => line.length > 30 && !line.includes(company))
    .slice(0, 16);
  return { company, title, location, dates, bullets: bullets.length ? bullets : [`Supported ${company} initiatives using the responsibilities described in the source resume.`] };
}

function parseEducation(resumeText = "", profile = {}) {
  const section = sectionBetweenAny(resumeText, ["EDUCATION"], ["PROJECTS", "TECHNICAL PROJECTS", "CERTIFICATIONS"]);
  if (!section && !profile.university) return [];
  return [{
    institution: profile.university || section.match(/\b[A-Z][A-Za-z .&'-]*(?:University|College|Institute)\b/)?.[0] || "",
    degree: profile.degree || profile.highestEducation || section.match(/\b(?:Bachelor|Master|B\.S\.|M\.S\.|MBA|PhD)[^,\n]*/i)?.[0] || "",
    location: "",
    dates: profile.graduationYear || section.match(/\b20\d{2}|19\d{2}\b/)?.[0] || "",
    detail: ""
  }].filter((item) => item.institution || item.degree);
}

function resumeToText(resume) {
  return [
    resume.professionalSummary,
    ...(resume.skills || []).flatMap((group) => group.items || []),
    ...(resume.experience || []).flatMap((item) => [item.company, item.title, ...(item.bullets || [])])
  ].join(" ");
}

function searchText(parsedResume) {
  return [
    parsedResume.summary,
    ...(parsedResume.skills || []).flatMap((group) => group.items || []),
    ...(parsedResume.experience || []).flatMap((item) => [item.company, item.title, ...(item.bullets || [])])
  ].join(" ");
}

function inferJobTitle(text) {
  return String(text || "").split(/\r?\n/).map((line) => line.trim()).find((line) => line.length > 4 && line.length < 120) || "Target role";
}

function extractResponsibilityLines(text) {
  return String(text || "")
    .split(/\r?\n|[•*]\s+/)
    .map((line) => line.trim())
    .filter((line) => /\b(responsib|develop|build|design|manage|lead|support|implement|collaborate|test)\b/i.test(line))
    .slice(0, 12);
}

function extractDomainKeywords(text) {
  const domains = ["banking", "healthcare", "insurance", "finance", "cloud", "security", "payments", "risk", "claims", "analytics"];
  const lower = String(text || "").toLowerCase();
  return domains.filter((domain) => lower.includes(domain));
}

function inferSeniority(text) {
  const lower = String(text || "").toLowerCase();
  if (lower.includes("senior") || lower.includes("sr.")) return "Senior";
  if (lower.includes("lead") || lower.includes("principal")) return "Lead";
  if (lower.includes("junior") || lower.includes("entry")) return "Entry";
  return "Mid-level";
}

function extractKeywords(text) {
  const known = ["Java", "Spring Boot", "C#", ".NET", "Angular", "React", "TypeScript", "JavaScript", "SQL", "PostgreSQL", "SQL Server", "AWS", "Azure", "OpenShift", "Kubernetes", "Docker", "REST", "GraphQL", "CI/CD", "Jenkins", "Agile", "Microservices", "Node.js", "Python", "Selenium", "JUnit", "Postman"];
  const lower = String(text || "").toLowerCase();
  return known.filter((keyword) => lower.includes(keyword.toLowerCase()));
}

function splitList(text) {
  return String(text || "")
    .split(/,|;|\||\n/)
    .map((item) => item.trim())
    .filter((item) => item.length > 1)
    .slice(0, 50);
}

function sectionBetweenAny(text, starts, ends = []) {
  for (const start of starts) {
    const section = sectionBetween(text, start, ends);
    if (section) return section;
  }
  return "";
}

function sectionBetween(text, start, ends = []) {
  const source = String(text || "");
  const upper = source.toUpperCase();
  const startIndex = upper.indexOf(start.toUpperCase());
  if (startIndex === -1) return "";
  const contentStart = startIndex + start.length;
  const endIndex = ends
    .map((end) => upper.indexOf(end.toUpperCase(), contentStart))
    .filter((index) => index > contentStart)
    .sort((a, b) => a - b)[0] || source.length;
  return source.slice(contentStart, endIndex).trim();
}

function monthRangePattern() {
  const monthYear = String.raw`(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Sept|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{4}`;
  return new RegExp(String.raw`\b(?:${monthYear}|\d{4})\s*(?:-|to)?\s*(?:Present|Current|Now|${monthYear}|\d{4})\b`, "i");
}

function roleTitlePattern() {
  return /\b(?:(?:Senior|Sr\.?|Junior|Jr\.?|Lead|Principal|Associate|Student|Full Stack|Backend|Frontend|Software|Data|Machine Learning|ML|AI|Cloud|DevOps|Java|Angular|React|Business|Systems|Application|Platform)\s+){0,5}(?:Engineer|Developer|Programmer|Analyst|Manager|Consultant|Intern|Specialist|Architect|Lead|Administrator|Scientist|Designer|Associate)\s*(?:I{1,3}|IV|V|Intermediate)?\b/i;
}

function includes(text, keyword) {
  return String(text || "").toLowerCase().includes(String(keyword || "").toLowerCase());
}

function key(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function normalizeDate(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").replace(/\s*-\s*/g, "-").trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clamp(score) {
  return Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
}
