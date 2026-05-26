import crypto from "crypto";

const trackingParams = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gh_src",
  "source",
  "ref",
  "referrer",
  "campaign",
  "rx_campaign",
  "rx_group",
  "rx_job"
]);

export function enrichJobForDedupe(job = {}) {
  const normalizedCompany = normalizeCompanyName(job.company);
  const normalizedTitle = normalizeTitle(job.title);
  const normalizedLocation = normalizeLocation(job.location);
  const canonicalApplyUrl = canonicalizeApplyUrl(job.applyUrl || job.apply_url || "");
  const descriptionHash = hashDescription(job.description || "");
  const canonicalJobKey = buildCanonicalJobKey({
    source: job.source,
    externalJobId: job.externalJobId || job.external_job_id,
    company: normalizedCompany,
    title: normalizedTitle,
    location: normalizedLocation,
    descriptionHash,
    applyUrl: canonicalApplyUrl
  });

  return {
    ...job,
    normalizedCompany,
    normalizedTitle,
    normalizedLocation,
    canonicalApplyUrl,
    descriptionHash,
    canonicalJobKey
  };
}

export function dedupeJobs(jobs = []) {
  const byKey = new Map();
  for (const rawJob of jobs) {
    const job = enrichJobForDedupe(rawJob);
    const key = job.canonicalJobKey || job.id;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, job);
      continue;
    }
    byKey.set(key, mergeDuplicateJobs(existing, job));
  }
  return [...byKey.values()];
}

export function canonicalizeApplyUrl(value = "") {
  if (!value) return "";
  try {
    const url = new URL(value);
    for (const param of [...url.searchParams.keys()]) {
      if (trackingParams.has(param.toLowerCase()) || param.toLowerCase().startsWith("utm_")) {
        url.searchParams.delete(param);
      }
    }
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return String(value || "").split("?")[0].replace(/\/$/, "");
  }
}

export function normalizeCompanyName(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|corporation|company|co|limited)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeTitle(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/\b(sr|sr\.|senior)\b/g, "senior")
    .replace(/\b(jr|jr\.|junior)\b/g, "junior")
    .replace(/\b(dev)\b/g, "developer")
    .replace(/[^a-z0-9+#.]+/g, " ")
    .trim();
}

export function normalizeLocation(value = "") {
  const text = String(value || "").toLowerCase();
  if (text.includes("remote")) return "remote";
  return text.replace(/[^a-z0-9]+/g, " ").trim();
}

export function hashDescription(value = "") {
  const cleaned = String(value || "").toLowerCase().replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return crypto.createHash("sha256").update(cleaned.slice(0, 4000)).digest("hex").slice(0, 24);
}

export function buildCanonicalJobKey({ source = "", externalJobId = "", company = "", title = "", location = "", descriptionHash = "", applyUrl = "" } = {}) {
  if (externalJobId) return `${String(source || "source").toLowerCase()}:${String(externalJobId).toLowerCase()}`;
  return [company, title, location, descriptionHash || applyUrl].filter(Boolean).join(":");
}

function mergeDuplicateJobs(existing, incoming) {
  return {
    ...existing,
    ...Object.fromEntries(Object.entries(incoming).filter(([, value]) => value !== undefined && value !== null && value !== "")),
    id: existing.id,
    skills: [...new Set([...(existing.skills || []), ...(incoming.skills || [])])],
    questions: [...new Set([...(existing.questions || []), ...(incoming.questions || [])])],
    directApplySupported: Boolean(existing.directApplySupported || incoming.directApplySupported),
    applyType: existing.directApplySupported || incoming.directApplySupported ? "direct" : existing.applyType || incoming.applyType
  };
}
