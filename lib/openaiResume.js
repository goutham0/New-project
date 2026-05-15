import { tailorFreeform } from "@/lib/ai";

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export async function generateTailoredResume({ resumeText, jobDescription, profile = {} }) {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackTailoredResume({ resumeText, jobDescription, profile, aiUsed: false });
  }

  try {
    const result = await callOpenAI({
      name: "tailored_resume",
      schema: tailoredResumeSchema(),
      instructions:
        "You are an expert resume writer and ATS optimization specialist. Return only JSON matching the schema. Rewrite truthfully. Do not invent employers, degrees, certifications, dates, projects, metrics, locations, or years of experience. If a detail is not supported by the resume or profile, omit it or mark it as candidate-confirmed-needed in notes.",
      input:
        `Candidate profile JSON:\n${JSON.stringify(profile)}\n\n` +
        `Original resume text:\n${resumeText.slice(0, 18000)}\n\n` +
        `Job description:\n${jobDescription.slice(0, 12000)}\n\n` +
        "Create a polished one to two page tailored resume, a short cover letter, and concise screening answers. Keep bullets achievement-oriented but truthful."
    });
    return { ...normalizeTailored(result), aiUsed: true };
  } catch (error) {
    const fallback = fallbackTailoredResume({ resumeText, jobDescription, profile, aiUsed: false });
    return {
      ...fallback,
      warning: `OpenAI generation failed, local fallback used: ${error.message}`
    };
  }
}

export async function scoreResumeForAts({ resumeText, jobDescription = "" }) {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackAtsScore({ resumeText, jobDescription, aiUsed: false });
  }

  try {
    const result = await callOpenAI({
      name: "ats_score",
      schema: atsScoreSchema(),
      instructions:
        "You are an ATS resume reviewer. Return only JSON matching the schema. Score the resume for ATS parsing, recruiter readability, keywords, measurable impact, and job-description match when a job description is provided. Do not claim certainty about hidden ATS algorithms.",
      input:
        `Resume text:\n${resumeText.slice(0, 18000)}\n\n` +
        `Optional job description:\n${jobDescription.slice(0, 12000)}\n\n` +
        "Provide practical, specific recommendations."
    });
    return { ...normalizeAtsScore(result), aiUsed: true };
  } catch (error) {
    const fallback = fallbackAtsScore({ resumeText, jobDescription, aiUsed: false });
    return {
      ...fallback,
      warning: `OpenAI scoring failed, local fallback used: ${error.message}`
    };
  }
}

async function callOpenAI({ name, schema, instructions, input }) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      input: [
        { role: "system", content: instructions },
        { role: "user", content: input }
      ],
      text: {
        format: {
          type: "json_schema",
          name,
          strict: true,
          schema
        }
      }
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || "OpenAI request failed.");
  }

  const text = payload.output_text || extractOutputText(payload);
  if (!text) throw new Error("OpenAI returned no text output.");
  return JSON.parse(text);
}

function extractOutputText(payload) {
  return (payload.output || [])
    .flatMap((item) => item.content || [])
    .filter((content) => content.type === "output_text" || content.type === "text")
    .map((content) => content.text)
    .join("\n");
}

function tailoredResumeSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "candidateName",
      "targetRole",
      "contactLine",
      "professionalSummary",
      "coreSkills",
      "experienceBullets",
      "projects",
      "education",
      "certifications",
      "atsKeywords",
      "coverLetter",
      "screeningAnswers",
      "notes"
    ],
    properties: {
      candidateName: { type: "string" },
      targetRole: { type: "string" },
      contactLine: { type: "string" },
      professionalSummary: { type: "string" },
      coreSkills: { type: "array", items: { type: "string" } },
      experienceBullets: { type: "array", items: { type: "string" } },
      projects: { type: "array", items: { type: "string" } },
      education: { type: "array", items: { type: "string" } },
      certifications: { type: "array", items: { type: "string" } },
      atsKeywords: { type: "array", items: { type: "string" } },
      coverLetter: { type: "string" },
      screeningAnswers: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["question", "answer"],
          properties: {
            question: { type: "string" },
            answer: { type: "string" }
          }
        }
      },
      notes: { type: "array", items: { type: "string" } }
    }
  };
}

function atsScoreSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "overallScore",
      "atsCompatibilityScore",
      "keywordScore",
      "formattingScore",
      "impactScore",
      "summary",
      "matchedKeywords",
      "missingKeywords",
      "strengths",
      "issues",
      "recommendations"
    ],
    properties: {
      overallScore: { type: "integer" },
      atsCompatibilityScore: { type: "integer" },
      keywordScore: { type: "integer" },
      formattingScore: { type: "integer" },
      impactScore: { type: "integer" },
      summary: { type: "string" },
      matchedKeywords: { type: "array", items: { type: "string" } },
      missingKeywords: { type: "array", items: { type: "string" } },
      strengths: { type: "array", items: { type: "string" } },
      issues: { type: "array", items: { type: "string" } },
      recommendations: { type: "array", items: { type: "string" } }
    }
  };
}

function fallbackTailoredResume({ resumeText, jobDescription, profile, aiUsed }) {
  const pkg = tailorFreeform({ resumeText, jobDescription, profile });
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Candidate";
  const contact = [profile.email, profile.phone, profile.city && profile.state ? `${profile.city}, ${profile.state}` : profile.city].filter(Boolean).join(" | ");
  const jdKeywords = extractKeywords(jobDescription);
  return {
    aiUsed,
    candidateName: name,
    targetRole: inferTargetRole(jobDescription) || profile.currentTitle || "Target role",
    contactLine: contact,
    professionalSummary: pkg.tailoredResume.summary,
    coreSkills: jdKeywords.slice(0, 12),
    experienceBullets: pkg.tailoredResume.bullets,
    projects: [],
    education: [profile.degree, profile.university, profile.highestEducation].filter(Boolean),
    certifications: [],
    atsKeywords: jdKeywords,
    coverLetter: pkg.coverLetter,
    screeningAnswers: pkg.answers.map((item) => ({ question: item.question, answer: item.answer })),
    notes: ["Local fallback used. Add OPENAI_API_KEY for GPT-quality tailoring."]
  };
}

function fallbackAtsScore({ resumeText, jobDescription, aiUsed }) {
  const resumeKeywords = extractKeywords(resumeText);
  const jdKeywords = extractKeywords(jobDescription);
  const matched = jdKeywords.filter((keyword) => resumeKeywords.some((item) => item.toLowerCase() === keyword.toLowerCase()));
  const missing = jdKeywords.filter((keyword) => !matched.includes(keyword)).slice(0, 12);
  const hasSections = ["experience", "education", "skills"].filter((section) => resumeText.toLowerCase().includes(section)).length;
  const keywordScore = jdKeywords.length ? Math.round((matched.length / jdKeywords.length) * 100) : Math.min(85, 55 + resumeKeywords.length * 2);
  const formattingScore = Math.min(95, 55 + hasSections * 12 + (resumeText.length > 1200 ? 10 : 0));
  const impactScore = /\d/.test(resumeText) ? 78 : 58;
  const atsCompatibilityScore = Math.round((keywordScore + formattingScore + impactScore) / 3);

  return {
    aiUsed,
    overallScore: atsCompatibilityScore,
    atsCompatibilityScore,
    keywordScore,
    formattingScore,
    impactScore,
    summary: "Local ATS estimate generated from keyword match, common resume sections, and measurable impact signals.",
    matchedKeywords: matched.slice(0, 12),
    missingKeywords: missing,
    strengths: ["Resume text was readable by the parser.", hasSections ? "Common ATS sections were detected." : "Basic resume content was detected."],
    issues: missing.length ? ["Several job-description keywords are missing or not exact matches."] : ["No major keyword gap detected in the local estimate."],
    recommendations: [
      "Use standard section headings such as Summary, Skills, Experience, Education.",
      "Mirror important job-description keywords truthfully.",
      "Add measurable impact where accurate.",
      "Avoid tables, text boxes, images, and decorative formatting in ATS versions."
    ]
  };
}

function normalizeTailored(value) {
  return {
    candidateName: value.candidateName || "Candidate",
    targetRole: value.targetRole || "Target role",
    contactLine: value.contactLine || "",
    professionalSummary: value.professionalSummary || "",
    coreSkills: arrayOfStrings(value.coreSkills).slice(0, 18),
    experienceBullets: arrayOfStrings(value.experienceBullets).slice(0, 14),
    projects: arrayOfStrings(value.projects).slice(0, 8),
    education: arrayOfStrings(value.education).slice(0, 6),
    certifications: arrayOfStrings(value.certifications).slice(0, 6),
    atsKeywords: arrayOfStrings(value.atsKeywords).slice(0, 24),
    coverLetter: value.coverLetter || "",
    screeningAnswers: Array.isArray(value.screeningAnswers) ? value.screeningAnswers : [],
    notes: arrayOfStrings(value.notes)
  };
}

function normalizeAtsScore(value) {
  const clamp = (score) => Math.max(0, Math.min(100, Number(score) || 0));
  return {
    overallScore: clamp(value.overallScore),
    atsCompatibilityScore: clamp(value.atsCompatibilityScore),
    keywordScore: clamp(value.keywordScore),
    formattingScore: clamp(value.formattingScore),
    impactScore: clamp(value.impactScore),
    summary: value.summary || "",
    matchedKeywords: arrayOfStrings(value.matchedKeywords),
    missingKeywords: arrayOfStrings(value.missingKeywords),
    strengths: arrayOfStrings(value.strengths),
    issues: arrayOfStrings(value.issues),
    recommendations: arrayOfStrings(value.recommendations)
  };
}

function arrayOfStrings(value) {
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
}

function extractKeywords(text) {
  const common = new Set(["and", "the", "with", "from", "that", "this", "your", "will", "have", "role", "team", "work", "experience"]);
  return [...new Set(String(text || "")
    .replace(/[^a-zA-Z0-9+#. ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !common.has(word.toLowerCase())))]
    .slice(0, 24);
}

function inferTargetRole(jobDescription) {
  return String(jobDescription || "").split(/\r?\n/).find((line) => line.trim().length > 4)?.trim().slice(0, 80);
}
