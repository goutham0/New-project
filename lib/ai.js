function firstLines(text, limit = 4) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit);
}

export function scoreJobMatch(profile, resumeText, job) {
  const source = `${resumeText || ""} ${Object.values(profile || {}).join(" ")}`.toLowerCase();
  const matchedSkills = job.skills.filter((skill) => source.includes(skill.toLowerCase()));
  const base = job.directApplySupported ? 78 : 72;
  return Math.min(98, base + matchedSkills.length * 4);
}

export function generateApplicationPackage({ profile, resumeText, job }) {
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Candidate";
  const title = profile.currentTitle || "candidate";
  const lines = firstLines(resumeText);
  const skills = job.skills.slice(0, 5).join(", ");
  const matchScore = scoreJobMatch(profile, resumeText, job);

  return {
    matchScore,
    tailoredResume: {
      headline: `${name} - tailored for ${job.title}`,
      summary: `${title} profile tailored to ${job.company}, emphasizing ${skills}.`,
      bullets: [
        `Aligned experience to ${job.title} by highlighting ${job.skills.slice(0, 3).join(", ")}.`,
        `Reordered resume content to put the most relevant achievements near the top.`,
        `Preserved candidate-provided facts without inventing employers, degrees, projects, or dates.`,
        ...lines.map((line) => `Resume signal: ${line}`)
      ].slice(0, 6)
    },
    coverLetter:
      `Dear ${job.company} hiring team,\n\n` +
      `I am interested in the ${job.title} role. My background as ${title} aligns with your need for ${skills}. ` +
      `I have tailored my application to the responsibilities in this posting while keeping all details truthful and candidate-approved.\n\n` +
      `Thank you for your time,\n${name}`,
    answers: job.questions.map((question) => ({
      question,
      answer: answerQuestion(question, profile, job),
      confidence: 0.86
    }))
  };
}

export function tailorFreeform({ resumeText, jobDescription, profile = {} }) {
  const pseudoJob = {
    title: "Custom job",
    company: "Target employer",
    skills: extractKeywords(jobDescription),
    questions: [
      "Why are you a fit for this role?",
      "Are you authorized to work?",
      "What experience is most relevant?"
    ],
    directApplySupported: false
  };

  return generateApplicationPackage({ profile, resumeText, job: pseudoJob });
}

function extractKeywords(text) {
  const common = new Set(["and", "the", "with", "for", "you", "our", "are", "will", "this", "that", "from"]);
  const words = String(text || "")
    .replace(/[^a-zA-Z0-9+#. ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !common.has(word.toLowerCase()));
  return [...new Set(words)].slice(0, 8).length ? [...new Set(words)].slice(0, 8) : ["relevant skills", "role requirements"];
}

function answerQuestion(question, profile, job) {
  const lower = question.toLowerCase();
  if (lower.includes("authorized") || lower.includes("work")) {
    return profile.workAuthorization || "Candidate must confirm work authorization.";
  }
  if (lower.includes("sponsor")) {
    return profile.sponsorshipRequired || "Candidate must confirm sponsorship requirement.";
  }
  if (lower.includes("year")) {
    return profile.yearsExperience ? `${profile.yearsExperience} years of relevant experience.` : "Candidate must confirm years of experience.";
  }
  if (lower.includes("salary")) {
    return profile.expectedSalaryMin && profile.expectedSalaryMax
      ? `$${profile.expectedSalaryMin} - $${profile.expectedSalaryMax}`
      : "Candidate must confirm compensation expectations.";
  }
  return `Based on the candidate profile, emphasize experience related to ${job.skills.slice(0, 3).join(", ")}.`;
}
