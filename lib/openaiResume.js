const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-5.5";

export async function generateTailoredResume({ resumeText, jobDescription, profile = {}, requireAi = false }) {
  const experience = inferExperience(profile, resumeText);
  const targetPageCount = targetPagesForExperience(experience);
  const sourceResume = fallbackTailoredResume({ resumeText, jobDescription, profile, aiUsed: false, targetPageCount, experience });

  if (!process.env.OPENAI_API_KEY) {
    if (requireAi) {
      throw new Error("OPENAI_API_KEY is missing. Add it in Vercel Environment Variables or .env.local, then redeploy/restart.");
    }
    return sourceResume;
  }

  try {
    const result = await callOpenAI({
      name: "apply_friend_resume",
      schema: tailoredResumeSchema(),
      instructions:
        "You are an elite senior resume writer and ATS optimization specialist. Return only JSON matching the schema. Produce a complete, polished, employer-ready resume in a conservative ATS-safe format. Never write phrases like tailored for, based on the job description, target employer, or JD inside the resume. Do not invent employers, degrees, dates, projects, certifications, locations, metrics, or years of experience. Do not write placeholder bullets, disclaimers, or meta commentary. You may reorder, condense, and rewrite truthful resume content to fit the role, but every bullet must be grounded in the provided resume/profile. Sensitive facts such as work authorization, sponsorship, salary, and demographics must come from the candidate profile only.",
      input:
        `Required resume template order:\n` +
        `1. PROFILE\n2. EDUCATION\n3. RELEVANT COURSEWORK\n4. WORK EXPERIENCE\n5. SKILLS & CERTIFICATIONS\n6. TECHNICAL PROJECTS\n\n` +
        `Experience estimate: ${experience} years. Target PDF length: ${targetPageCount} page(s). ` +
        `For 0-4 years, write a concise one-page resume. For 4-7 years, write enough truthful content for 2-3 pages. For 7+ years, write enough truthful content for 5 pages when the source resume supports it. ` +
        `If the source resume has enough detail, include 4-6 strong bullets per role for 4-7 years and 6-8 bullets per role for 7+ years. Use strong action verbs, ATS keywords, tools, business outcomes, and technical scope from the source. Keep bullets natural, not keyword-stuffed.\n\n` +
        `Candidate profile JSON:\n${JSON.stringify(profile)}\n\n` +
        `Parsed source resume JSON. Preserve these facts and use this as the section structure:\n${JSON.stringify({
          candidateName: sourceResume.candidateName,
          contactLine: sourceResume.contactLine,
          education: sourceResume.education,
          coursework: sourceResume.coursework,
          experience: sourceResume.experience,
          skills: sourceResume.skills,
          certifications: sourceResume.certifications,
          projects: sourceResume.projects
        })}\n\n` +
        `Original resume text:\n${resumeText.slice(0, 24000)}\n\n` +
        `Job description:\n${jobDescription.slice(0, 16000)}\n\n` +
        "Produce a high-standard resume in the exact section structure. Align skills and bullets with the job requirements naturally, without making the resume look like a one-off keyword rewrite."
    });
    const tailored = mergeGeneratedResume(sourceResume, { ...normalizeTailored(result, { targetPageCount }), aiUsed: true });
    if (requireAi) validateTailoredResumeQuality(tailored, { targetPageCount });
    return tailored;
  } catch (error) {
    if (requireAi) {
      throw new Error(`GPT resume generation failed: ${error.message}`);
    }
    return {
      ...sourceResume,
      warning: `OpenAI generation failed, local fallback used: ${error.message}`
    };
  }
}

export async function scoreResumeForAts({ resumeText, jobDescription = "", requireAi = false }) {
  if (!process.env.OPENAI_API_KEY) {
    if (requireAi) {
      throw new Error("OPENAI_API_KEY is missing. Add it in Vercel Environment Variables or .env.local, then redeploy/restart.");
    }
    return fallbackAtsScore({ resumeText, jobDescription, aiUsed: false });
  }

  try {
    const result = await callOpenAI({
      name: "apply_friend_ats_score",
      schema: atsScoreSchema(),
      instructions:
        "You are an ATS and recruiter resume reviewer. Return only JSON matching the schema. Score conservatively from observable resume text. Evaluate ATS parse quality, standard formatting, section completeness, role keyword coverage, measurable impact, recruiter clarity, and job-description match. Do not claim certainty about hidden ATS algorithms.",
      input:
        `Resume text:\n${resumeText.slice(0, 24000)}\n\n` +
        `Job description, if provided:\n${jobDescription.slice(0, 16000)}\n\n` +
        "Give exact missing keywords and practical fixes. If the uploaded resume text looks unreadable or garbled, lower parsing/formatting scores and say so."
    });
    return { ...normalizeAtsScore(result), aiUsed: true };
  } catch (error) {
    if (requireAi) {
      throw new Error(`GPT ATS scoring failed: ${error.message}`);
    }
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

function tailoredResumeSchema() {
  const educationItem = {
    type: "object",
    additionalProperties: false,
    required: ["institution", "degree", "location", "dates", "detail"],
    properties: {
      institution: { type: "string" },
      degree: { type: "string" },
      location: { type: "string" },
      dates: { type: "string" },
      detail: { type: "string" }
    }
  };
  const experienceItem = {
    type: "object",
    additionalProperties: false,
    required: ["title", "company", "location", "dates", "bullets"],
    properties: {
      title: { type: "string" },
      company: { type: "string" },
      location: { type: "string" },
      dates: { type: "string" },
      bullets: { type: "array", items: { type: "string" } }
    }
  };
  const skillGroup = {
    type: "object",
    additionalProperties: false,
    required: ["label", "items"],
    properties: {
      label: { type: "string" },
      items: { type: "array", items: { type: "string" } }
    }
  };
  const projectItem = {
    type: "object",
    additionalProperties: false,
    required: ["name", "technologies", "location", "dates", "bullets"],
    properties: {
      name: { type: "string" },
      technologies: { type: "array", items: { type: "string" } },
      location: { type: "string" },
      dates: { type: "string" },
      bullets: { type: "array", items: { type: "string" } }
    }
  };

  return {
    type: "object",
    additionalProperties: false,
    required: [
      "candidateName",
      "targetRole",
      "contactLine",
      "targetPageCount",
      "professionalSummary",
      "education",
      "coursework",
      "experience",
      "skills",
      "certifications",
      "projects",
      "atsKeywords",
      "coverLetter",
      "screeningAnswers",
      "notes"
    ],
    properties: {
      candidateName: { type: "string" },
      targetRole: { type: "string" },
      contactLine: { type: "string" },
      targetPageCount: { type: "integer" },
      professionalSummary: { type: "string" },
      education: { type: "array", items: educationItem },
      coursework: { type: "array", items: { type: "string" } },
      experience: { type: "array", items: experienceItem },
      skills: { type: "array", items: skillGroup },
      certifications: { type: "array", items: { type: "string" } },
      projects: { type: "array", items: projectItem },
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

function fallbackTailoredResume({ resumeText, jobDescription, profile, aiUsed, targetPageCount, experience }) {
  const sections = parseResumeSections(resumeText);
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || inferName(resumeText) || "Full Name";
  const contactLine = [
    [profile.city, profile.state].filter(Boolean).join(", "),
    profile.phone,
    profile.email,
    profile.linkedinUrl,
    profile.githubUrl,
    profile.portfolioUrl
  ].filter(Boolean).join(" | ");
  const keywords = extractKeywords(jobDescription);
  const title = profile.currentTitle || inferTargetRole(jobDescription) || "Professional";

  return normalizeTailored({
    candidateName: name,
    targetRole: title,
    contactLine,
    targetPageCount,
    professionalSummary:
      sections.profile?.slice(0, 520) ||
      `${title} with ${experience || "relevant"} years of experience across ${keywords.slice(0, 5).join(", ") || "role-relevant skills"}. ` +
      "Focused on delivering reliable, well-structured work across production environments while keeping resume claims grounded in candidate-provided information.",
    education: buildEducation(profile, sections.education),
    coursework: splitCommaList(sections.coursework).slice(0, 18),
    experience: buildExperience(sections.workExperience, { title, profile, keywords, targetPageCount }),
    skills: buildSkills(sections.skills, keywords),
    certifications: extractCertifications(sections.skills),
    projects: buildProjects(sections.projects, targetPageCount),
    atsKeywords: keywords,
    coverLetter:
      `Dear hiring team,\n\nI am interested in this opportunity. My background in ${keywords.slice(0, 5).join(", ") || "the requested skills"} aligns with the responsibilities described, and I would welcome the chance to contribute with reliable, well-documented work.\n\nThank you,\n${name}`,
    screeningAnswers: [
      { question: "Why are you a fit for this role?", answer: `My experience aligns with ${keywords.slice(0, 5).join(", ") || "the role requirements"} based on the resume details provided.` },
      { question: "Are you authorized to work?", answer: profile.workAuthorization || "Candidate must confirm work authorization." }
    ],
    notes: ["Local fallback used. Add OPENAI_API_KEY for the strongest resume rewrite."]
  }, { targetPageCount, aiUsed });
}

function fallbackAtsScore({ resumeText, jobDescription, aiUsed }) {
  const resumeKeywords = extractKeywords(resumeText);
  const jdKeywords = extractKeywords(jobDescription);
  const matched = jdKeywords.filter((keyword) => includesKeyword(resumeText, keyword));
  const missing = jdKeywords.filter((keyword) => !matched.includes(keyword)).slice(0, 18);
  const sections = ["profile", "summary", "education", "experience", "skills", "projects", "certifications"].filter((section) =>
    resumeText.toLowerCase().includes(section)
  );
  const parseQuality = resumeText.length > 1200 && readableRatio(resumeText) > 0.88 ? 92 : resumeText.length > 500 ? 72 : 48;
  const keywordScore = jdKeywords.length ? Math.round((matched.length / jdKeywords.length) * 100) : Math.min(85, resumeKeywords.length * 4);
  const formattingScore = Math.min(96, Math.round(parseQuality * 0.55 + sections.length * 7 + (resumeText.length > 900 ? 8 : 0)));
  const impactScore = /\b\d+[%+kKmM]?\b/.test(resumeText) ? 82 : 58;
  const atsCompatibilityScore = Math.round(formattingScore * 0.65 + parseQuality * 0.35);
  const overallScore = clamp(Math.round(keywordScore * 0.36 + atsCompatibilityScore * 0.34 + impactScore * 0.2 + Math.min(100, sections.length * 14) * 0.1));

  return {
    aiUsed,
    overallScore,
    atsCompatibilityScore,
    keywordScore: clamp(keywordScore),
    formattingScore: clamp(formattingScore),
    impactScore: clamp(impactScore),
    summary: "ATS estimate based on readable resume text, standard section coverage, exact keyword overlap, and measurable impact signals.",
    matchedKeywords: matched.slice(0, 18),
    missingKeywords: missing,
    strengths: [
      parseQuality > 80 ? "Resume text is readable by the parser." : "Resume text was partially readable; use a text-based PDF for best ATS parsing.",
      sections.length >= 4 ? "Common resume sections were detected." : "Some standard resume sections are missing or unclear."
    ],
    issues: [
      ...(missing.length ? ["Several job-description keywords are missing or not exact matches."] : []),
      ...(impactScore < 70 ? ["Few measurable outcomes were detected. Add truthful numbers where possible."] : []),
      ...(formattingScore < 75 ? ["Formatting or text extraction may reduce ATS readability."] : [])
    ],
    recommendations: [
      "Use the exact standard section names: Profile, Education, Work Experience, Skills & Certifications, Technical Projects.",
      "Mirror important job-description keywords naturally and truthfully.",
      "Add measurable outcomes where accurate.",
      "Avoid tables, text boxes, images, icons, and heavy styling in the ATS version."
    ]
  };
}

function normalizeTailored(value, { targetPageCount = 1, aiUsed = false } = {}) {
  const pageTarget = Math.max(Number(value.targetPageCount || targetPageCount) || 1, Number(targetPageCount) || 1);
  const skills = normalizeSkills(value.skills, value.coreSkills);
  const experience = normalizeExperience(value.experience, value.experienceBullets);
  const compact = pageTarget <= 1;
  const sectionedExperience = compact
    ? experience.slice(0, 1).map((item) => ({ ...item, bullets: item.bullets.slice(0, 3) }))
    : experience.map((item) => ({ ...item, bullets: item.bullets.slice(0, pageTarget >= 5 ? 9 : 6) }));
  const sectionedSkills = compact
    ? skills.slice(0, 4).map((item) => ({ ...item, items: item.items.slice(0, 8) }))
    : skills.map((item) => ({ ...item, items: item.items.slice(0, 14) }));
  const sectionedProjects = compact
    ? normalizeProjects(value.projects).slice(0, 1).map((item) => ({ ...item, bullets: item.bullets.slice(0, 2) }))
    : normalizeProjects(value.projects).slice(0, pageTarget >= 5 ? 8 : 4);
  const experienceBullets = sectionedExperience.flatMap((item) => item.bullets).slice(0, 18);
  const coreSkills = sectionedSkills.flatMap((item) => item.items).slice(0, 24);

  return {
    aiUsed,
    candidateName: value.candidateName || "Full Name",
    targetRole: value.targetRole || "Target role",
    contactLine: value.contactLine || "",
    targetPageCount: pageTarget,
    professionalSummary: compact ? truncateSentence(value.professionalSummary || "", 420) : value.professionalSummary || "",
    education: normalizeEducation(value.education).slice(0, compact ? 2 : 6),
    coursework: arrayOfStrings(value.coursework).slice(0, compact ? 8 : 24),
    experience: sectionedExperience,
    skills: sectionedSkills,
    certifications: arrayOfStrings(value.certifications).slice(0, compact ? 3 : 10),
    projects: sectionedProjects,
    atsKeywords: arrayOfStrings(value.atsKeywords).slice(0, 30),
    coverLetter: value.coverLetter || "",
    screeningAnswers: Array.isArray(value.screeningAnswers) ? value.screeningAnswers : [],
    notes: arrayOfStrings(value.notes),
    coreSkills,
    experienceBullets
  };
}

function normalizeAtsScore(value) {
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

function mergeGeneratedResume(source, generated) {
  return {
    ...generated,
    candidateName: generated.candidateName || source.candidateName,
    contactLine: generated.contactLine || source.contactLine,
    professionalSummary: generated.professionalSummary || source.professionalSummary,
    education: generated.education.length ? generated.education : source.education,
    coursework: generated.coursework.length ? generated.coursework : source.coursework,
    experience: generated.experience.length ? generated.experience : source.experience,
    skills: generated.skills.length ? generated.skills : source.skills,
    certifications: generated.certifications.length ? generated.certifications : source.certifications,
    projects: generated.projects.length ? generated.projects : source.projects,
    coreSkills: generated.coreSkills.length ? generated.coreSkills : source.coreSkills,
    experienceBullets: generated.experienceBullets.length ? generated.experienceBullets : source.experienceBullets
  };
}

function validateTailoredResumeQuality(resume, { targetPageCount }) {
  const bulletCount = resume.experience.reduce((total, item) => total + item.bullets.length, 0);
  const projectBulletCount = resume.projects.reduce((total, item) => total + item.bullets.length, 0);
  const skillCount = resume.skills.reduce((total, item) => total + item.items.length, 0);
  const minExperienceBullets = targetPageCount <= 1 ? 3 : targetPageCount >= 5 ? 18 : 8;
  const combinedText = [
    resume.professionalSummary,
    ...resume.experience.flatMap((item) => item.bullets),
    ...resume.projects.flatMap((item) => item.bullets)
  ].join(" ");

  if (!resume.professionalSummary || resume.professionalSummary.split(/\s+/).length < 35) {
    throw new Error("Generated resume was too thin: profile summary was not complete enough.");
  }
  if (!resume.experience.length || bulletCount < minExperienceBullets) {
    throw new Error("Generated resume was too thin: not enough high-quality work experience bullets were produced from the uploaded resume.");
  }
  if (targetPageCount > 1 && bulletCount + projectBulletCount < 12) {
    throw new Error("Generated resume was too short for the candidate experience level. Upload a detailed source resume or paste resume text fallback.");
  }
  if (skillCount < 8) {
    throw new Error("Generated resume was missing enough relevant skills for a high-standard ATS resume.");
  }
  if (/local fallback|openai_api_key|add openai|tailored for|based on (the )?(jd|job description)|preserving candidate-provided|candidate-provided responsibilities/i.test(combinedText)) {
    throw new Error("Generated resume contained fallback or meta language, so it was rejected.");
  }
}

function normalizeEducation(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    institution: item.institution || item.school || item.name || "",
    degree: item.degree || item.details || "",
    location: item.location || "",
    dates: item.dates || "",
    detail: item.detail || ""
  })).filter((item) => item.institution || item.degree);
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
  if (Array.isArray(value) && value.some((item) => item && typeof item === "object")) {
    return value.map((item) => ({ label: item.label || "Skills", items: arrayOfStrings(item.items) })).filter((item) => item.items.length);
  }
  const items = arrayOfStrings(value?.length ? value : fallbackSkills);
  return items.length ? [{ label: "Skills", items }] : [];
}

function normalizeProjects(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    name: item.name || item.title || "",
    technologies: arrayOfStrings(item.technologies),
    location: item.location || "",
    dates: item.dates || "",
    bullets: arrayOfStrings(item.bullets).slice(0, 8)
  })).filter((item) => item.name || item.bullets.length);
}

function buildEducation(profile, educationText = "") {
  const degree = [profile.degree, profile.highestEducation].filter(Boolean).join(", ");
  if (educationText) {
    const dateRange = monthRangePattern();
    const matches = [...educationText.matchAll(new RegExp(`([^]+?${dateRange.source})`, "g"))]
      .map((match) => match[1].trim())
      .filter(Boolean);
    const chunks = matches.length ? matches : educationText.split(/\s+(?=[A-Z][A-Za-z .&]+(?:Institute|University|College)\b)/).filter(Boolean);
    return chunks.slice(0, 4).map((chunk) => {
      const dates = chunk.match(dateRange)?.[0] || "";
      const beforeDates = dates ? chunk.slice(0, chunk.indexOf(dates)).trim() : chunk.trim();
      const degreeMatch = beforeDates.match(/\b(MS|M\.S\.|BE|B\.E\.|BS|B\.S\.|Bachelor|Master|PhD|MBA)[^,]{0,120}/i);
      const degreeText = degreeMatch?.[0] || "";
      const institution = degreeText ? beforeDates.slice(0, beforeDates.indexOf(degreeText)).trim() : beforeDates;
      return {
        institution: institution || beforeDates.slice(0, 120),
        degree: degreeText || beforeDates.slice(120, 260),
        location: "",
        dates,
        detail: ""
      };
    }).filter((item) => item.institution || item.degree);
  }
  if (!degree && !profile.university) return [];
  return [{
    institution: profile.university || "",
    degree,
    location: "",
    dates: profile.graduationYear || "",
    detail: ""
  }];
}

function buildExperience(experienceText = "", { title, profile, keywords, targetPageCount }) {
  const bullets = splitBullets(experienceText)
    .map((line) => rewriteFallbackBullet(line, keywords))
    .filter((line) => line.length > 20)
    .slice(0, targetPageCount <= 1 ? 5 : 14);
  const header = experienceText.split(actionBulletPattern())[0] || "";
  const dates = header.match(monthRangePattern())?.[0] || "";
  const beforeDates = dates ? header.slice(0, header.indexOf(dates)).trim() : header;
  const afterDates = dates ? header.slice(header.indexOf(dates) + dates.length).trim() : "";
  const companyLocation = splitCompanyLocation(afterDates);
  const company = companyLocation.company || profile.currentCompany || "";
  const role = beforeDates.trim().slice(0, 90) || title;

  return [{
    title: role || title,
    company,
    location: companyLocation.location,
    dates,
    bullets: bullets.length
      ? bullets
      : [`Supported candidate-provided responsibilities involving ${keywords.slice(0, 3).join(", ") || "role-relevant skills"} with attention to reliable delivery and documentation.`]
  }];
}

function buildSkills(skillsText, keywords) {
  const groups = [];
  const labels = ["Languages", "Frameworks & Tools", "AI & ML", "Cloud & Databases", "Platforms and Technologies", "Testing & Debugging", "Soft Skills"];
  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index];
    const nextLabel = labels[index + 1];
    const section = sectionBetween(skillsText, `${label}:`, nextLabel ? [`${nextLabel}:`] : ["Certifications:"]);
    const items = splitCommaList(section).slice(0, 14);
    if (items.length) groups.push({ label, items });
  }
  if (!groups.length) groups.push({ label: "Skills", items: keywords.slice(0, 18) });
  return groups;
}

function extractCertifications(skillsText = "") {
  return splitCommaList(sectionBetween(skillsText, "Certifications:", [])).slice(0, 8);
}

function buildProjects(projectsText = "", targetPageCount = 1) {
  if (!projectsText) return [];
  const titlePattern = /\b([A-Z][A-Za-z0-9 &/-]{8,90})\s+\|\s+([^|]+?)\s+((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/g;
  const matches = [...projectsText.matchAll(titlePattern)];
  const chunks = matches.length
    ? matches.map((match, index) => ({
        name: match[1],
        tech: match[2],
        dates: match[3],
        text: projectsText.slice(match.index, matches[index + 1]?.index || projectsText.length)
      }))
    : projectsText.split(/\s{2,}/).map((text) => ({ name: text.split("|")[0], tech: text.split("|")[1] || "", dates: "", text }));
  const limited = chunks.slice(0, targetPageCount <= 1 ? 2 : 8);
  return limited.map((item) => {
    const bulletParts = splitBullets(item.text);
    return {
      name: (item.name || "").trim().slice(0, 100),
      technologies: splitCommaList(item.tech).slice(0, 8),
      location: "",
      dates: item.dates || "",
      bullets: (bulletParts.length ? bulletParts : firstUsefulLines(item.text, 3)).map((line) => line.trim()).slice(0, 5)
    };
  }).filter((item) => item.name);
}

function extractOutputText(payload) {
  return (payload.output || [])
    .flatMap((item) => item.content || [])
    .filter((content) => content.type === "output_text" || content.type === "text")
    .map((content) => content.text)
    .join("\n");
}

function inferExperience(profile, resumeText) {
  const profileYears = Number.parseFloat(profile.yearsExperience);
  if (Number.isFinite(profileYears)) return profileYears;
  const yearMatches = String(resumeText || "").match(/\b(20\d{2}|19\d{2})\b/g) || [];
  const years = yearMatches.map(Number).filter((year) => year >= 1980 && year <= new Date().getFullYear());
  if (!years.length) return 0;
  return Math.max(0, new Date().getFullYear() - Math.min(...years));
}

function targetPagesForExperience(years) {
  if (years <= 4) return 1;
  if (years <= 7) return 2;
  return 5;
}

function inferName(resumeText) {
  return String(resumeText || "").split(/\r?\n| {2,}/).map((line) => line.trim()).find((line) => /^[A-Z][A-Za-z .'-]{3,60}$/.test(line)) || "";
}

function inferTargetRole(jobDescription) {
  return String(jobDescription || "").split(/\r?\n/).find((line) => line.trim().length > 4)?.trim().slice(0, 80);
}

function parseResumeSections(text) {
  return {
    profile: sectionBetween(text, "PROFILE", ["EDUCATION"]),
    education: sectionBetween(text, "EDUCATION", ["RELEVANT COURSEWORK", "WORK EXPERIENCE", "EXPERIENCE"]),
    coursework: sectionBetween(text, "RELEVANT COURSEWORK", ["WORK EXPERIENCE", "EXPERIENCE"]),
    workExperience: sectionBetween(text, "WORK EXPERIENCE", ["SKILLS & CERTIFICATIONS", "SKILLS", "TECHNICAL PROJECTS"]),
    skills: sectionBetween(text, "SKILLS & CERTIFICATIONS", ["TECHNICAL PROJECTS", "PROJECTS"]),
    projects: sectionBetween(text, "TECHNICAL PROJECTS", [])
  };
}

function sectionBetween(text, startLabel, endLabels = []) {
  const source = String(text || "");
  const upper = source.toUpperCase();
  const start = upper.indexOf(startLabel.toUpperCase());
  if (start === -1) return "";
  const contentStart = start + startLabel.length;
  const end = endLabels
    .map((label) => upper.indexOf(label.toUpperCase(), contentStart))
    .filter((index) => index > contentStart)
    .sort((a, b) => a - b)[0] || source.length;
  return source.slice(contentStart, end).replace(/\s+/g, " ").trim();
}

function firstUsefulLines(text, limit) {
  return String(text || "")
    .split(/\r?\n|\s+-\s+|(?<=\.)\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 18 && !/^(email|phone|linkedin|github)$/i.test(line))
    .slice(0, limit);
}

function splitBullets(text) {
  return String(text || "")
    .split(actionBulletPattern())
    .map((line) => line.trim())
    .filter((line) => line.length > 18)
    .slice(1);
}

function monthRangePattern() {
  return /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\s*-\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/i;
}

function actionBulletPattern() {
  return /\s+-\s+(?=(?:Debugged|Resolved|Contributed|Engaged|Documented|Developed|Applied|Added|Created|Performed|Designed|Built|Deployed|Used|Implemented|Led|Managed|Owned|Improved|Reduced|Increased|Automated|Analyzed|Partnered|Collaborated|Delivered|Shipped|Uncovered|Segmented)\b)/;
}

function splitCommaList(text) {
  return String(text || "")
    .split(/,|\||;/)
    .map((item) => item.trim())
    .filter((item) => item.length > 1)
    .slice(0, 40);
}

function rewriteFallbackBullet(line, keywords) {
  const trimmed = line.replace(/^[-*•]\s*/, "").trim();
  if (!keywords.length) return trimmed;
  return truncateSentence(trimmed, 155);
}

function splitCompanyLocation(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(.+?)\s+([A-Z][A-Za-z .-]+,\s*(?:[A-Z]{2}|[A-Za-z .-]+))$/);
  if (!match) return { company: text, location: "" };
  return { company: match[1].trim(), location: match[2].trim() };
}

function truncateSentence(text, limit) {
  const value = String(text || "").trim();
  if (value.length <= limit) return value;
  const clipped = value.slice(0, limit);
  const sentenceEnd = Math.max(clipped.lastIndexOf("."), clipped.lastIndexOf(";"));
  return clipped.slice(0, sentenceEnd > 160 ? sentenceEnd + 1 : limit).trim();
}

function extractKeywords(text) {
  const common = new Set(["and", "the", "with", "from", "that", "this", "your", "will", "have", "role", "team", "work", "experience", "candidate", "responsibilities", "requirements"]);
  const source = String(text || "").replace(/[^a-zA-Z0-9+#. ]/g, " ");
  const phrases = [...source.matchAll(/\b(?:Java|Spring Boot|React|Node|PostgreSQL|SQL|AWS|Azure|GCP|Docker|Kubernetes|Python|FastAPI|Machine Learning|LLM|RAG|TypeScript|JavaScript|REST|GraphQL|CI\/CD|SQS|Redis|Kafka|Tableau|Power BI)\b/gi)].map((match) => match[0]);
  const words = source
    .split(/\s+/)
    .filter((word) => word.length > 3 && !common.has(word.toLowerCase()));
  return [...new Set([...phrases, ...words])].slice(0, 30);
}

function includesKeyword(text, keyword) {
  return String(text || "").toLowerCase().includes(String(keyword || "").toLowerCase());
}

function readableRatio(text) {
  const value = String(text || "");
  if (!value) return 0;
  const readable = value.replace(/[^a-zA-Z0-9.,;:()/%+\-#\s]/g, "").length;
  return readable / value.length;
}

function arrayOfStrings(value) {
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
}

function clamp(score) {
  return Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
}
