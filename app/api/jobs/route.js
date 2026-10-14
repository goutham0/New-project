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
  const jobs = process.env.ENABLE_DEMO_JOBS === "true" ? filterSampleJobs({ mode, query }).map((job) => ({ ...job, directApplySupported: false, applyType: mode === "manual" ? "manual" : "assisted", source: "Demo" })) : [];
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
  return NextResponse.json({ jobs: dedupedJobs, sourceStatus, page: Number(page) || 1, hasMore: sourceStatus.adzuna === "live" && Number(page) * Number(process.env.ADZUNA_RESULTS_PER_PAGE || 20) < sourceStatus.adzunaCount });
}
