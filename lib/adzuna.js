const DEFAULT_COUNTRY = "us";
const DEFAULT_RESULTS_PER_PAGE = 20;

export function isAdzunaConfigured() {
  return Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
}

export async function fetchAdzunaJobs({ mode = "manual", query = "", where = "", page = 1 } = {}) {
  if (!isAdzunaConfigured()) {
    return { jobs: [], count: 0, status: "not_configured" };
  }

  const country = cleanCountry(process.env.ADZUNA_COUNTRY || DEFAULT_COUNTRY);
  const resultsPerPage = clampNumber(process.env.ADZUNA_RESULTS_PER_PAGE, DEFAULT_RESULTS_PER_PAGE, 1, 50);
  const searchPage = clampNumber(page, 1, 1, 100);
  const applyType = mode === "manual" ? "manual" : "assisted";
  const params = new URLSearchParams({
    app_id: process.env.ADZUNA_APP_ID,
    app_key: process.env.ADZUNA_APP_KEY,
    results_per_page: String(resultsPerPage),
    "content-type": "application/json"
  });

  const what = String(query || process.env.ADZUNA_DEFAULT_QUERY || "").trim();
  const whereValue = String(where || process.env.ADZUNA_DEFAULT_WHERE || "").trim();
  if (what) params.set("what", what);
  if (whereValue) params.set("where", whereValue);

  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/${searchPage}?${params.toString()}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Adzuna request failed with ${response.status}: ${detail.slice(0, 180)}`);
  }

  const payload = await response.json();
  const jobs = (payload.results || []).map((item) => normalizeAdzunaJob(item, applyType));
  return {
    jobs,
    count: Number(payload.count || jobs.length),
    status: "live"
  };
}

function normalizeAdzunaJob(item, applyType) {
  const rawId = String(item.id || item.redirect_url || cryptoSafeId(item.title));
  const description = stripHtml(item.description);
  const company = item.company?.display_name || "Company not listed";
  const location = item.location?.display_name || item.location?.area?.filter(Boolean).slice(-2).join(", ") || "Location not listed";
  const salaryMin = Math.round(Number(item.salary_min || 0));
  const salaryMax = Math.round(Number(item.salary_max || 0));
  const skills = extractSkills(`${item.title || ""} ${description}`);

  return {
    id: `adzuna-${applyType}-${rawId}`.replace(/[^a-zA-Z0-9_-]/g, "-"),
    externalJobId: rawId,
    title: item.title || "Untitled role",
    company,
    location,
    remoteType: inferRemoteType(`${item.title || ""} ${location} ${description}`),
    employmentType: inferEmploymentType(item),
    experienceLevel: "Not specified",
    salaryMin,
    salaryMax,
    source: "Adzuna",
    atsType: "adzuna",
    applyType,
    directApplySupported: false,
    applyUrl: item.redirect_url || "https://www.adzuna.com/",
    skills,
    description: description || "View the original job post for full details.",
    questions: [
      "Why are you interested in this role?",
      "Are you authorized to work in the target location?",
      "Will you now or in the future require sponsorship?"
    ],
    postedDate: item.created || null
  };
}

function cleanCountry(value) {
  return String(value || DEFAULT_COUNTRY).trim().toLowerCase().replace(/[^a-z]/g, "") || DEFAULT_COUNTRY;
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 520);
}

function inferRemoteType(text) {
  const lower = String(text || "").toLowerCase();
  if (lower.includes("remote")) return "Remote";
  if (lower.includes("hybrid")) return "Hybrid";
  return "Not specified";
}

function inferEmploymentType(item) {
  const parts = [];
  if (item.contract_time === "full_time") parts.push("Full time");
  if (item.contract_time === "part_time") parts.push("Part time");
  if (item.contract_type === "contract") parts.push("Contract");
  if (item.contract_type === "permanent") parts.push("Permanent");
  return parts.join(" / ") || "Not specified";
}

function extractSkills(text) {
  const known = [
    "JavaScript",
    "TypeScript",
    "React",
    "Next.js",
    "Node",
    "Java",
    "Spring Boot",
    "Python",
    "SQL",
    "PostgreSQL",
    "AWS",
    "Azure",
    "API",
    "Salesforce",
    "Excel",
    "Customer support",
    "Project management"
  ];
  const lower = String(text || "").toLowerCase();
  const matched = known.filter((skill) => lower.includes(skill.toLowerCase()));
  return matched.length ? matched.slice(0, 8) : ["role requirements", "communication", "relevant experience"];
}

function cryptoSafeId(seed) {
  return String(seed || "job").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
}
