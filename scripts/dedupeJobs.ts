import { dedupeJobs } from "../lib/jobDedupe.js";

/**
 * Dedupe helper for existing exported job JSON.
 *
 * Usage after exporting jobs from DB/cache:
 *   node --loader ts-node/esm scripts/dedupeJobs.ts jobs.json
 *
 * The production API now dedupes during ingestion/response. This script is a
 * safe offline merge helper for backfills; it does not delete DB rows directly.
 */
const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: scripts/dedupeJobs.ts <jobs.json>");
  process.exit(1);
}

const { readFile, writeFile } = await import("node:fs/promises");
const raw = JSON.parse(await readFile(inputPath, "utf8"));
const jobs = Array.isArray(raw) ? raw : raw.jobs || [];
const deduped = dedupeJobs(jobs);
const outputPath = inputPath.replace(/\.json$/i, ".deduped.json");
await writeFile(outputPath, JSON.stringify({ jobs: deduped, removed: jobs.length - deduped.length }, null, 2));
console.log(`Wrote ${deduped.length} deduped jobs to ${outputPath}. Removed ${jobs.length - deduped.length}.`);
