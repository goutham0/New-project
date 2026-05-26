import { NextResponse } from "next/server";
import { fetchAdzunaJobs } from "@/lib/adzuna";
import { filterSampleJobs } from "@/lib/jobs";
import { saveCachedJobs } from "@/lib/store";
import { dedupeJobs } from "@/lib/jobDedupe";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "all";
  const query = searchParams.get("q") || "";
  const where = searchParams.get("where") || "";
  const page = searchParams.get("page") || "1";
  const jobs = [...filterSampleJobs({ mode, query })];
  const sourceStatus = { adzuna: "skipped" };

  try {
    const adzuna = await fetchAdzunaJobs({ mode, query, where, page });
    if (adzuna.jobs.length) {
      await saveCachedJobs(adzuna.jobs);
      jobs.push(...adzuna.jobs);
    }
    sourceStatus.adzuna = adzuna.status;
    sourceStatus.adzunaCount = adzuna.count;
  } catch (error) {
    sourceStatus.adzuna = "error";
    sourceStatus.message = error.message;
  }

  const dedupedJobs = dedupeJobs(jobs);
  sourceStatus.deduped = jobs.length - dedupedJobs.length;
  return NextResponse.json({ jobs: dedupedJobs, sourceStatus });
}
