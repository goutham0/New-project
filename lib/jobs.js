import { jobs as sampleJobs, getJobById as getSampleJobById } from "@/data/jobs";
import { getCachedJob } from "@/lib/store";

export function filterSampleJobs({ mode = "all", query = "" } = {}) {
  const normalizedQuery = String(query || "").toLowerCase();

  return sampleJobs.filter((job) => {
    const modeMatch =
      !mode ||
      mode === "all" ||
      (mode === "manual" && job.applyType === "manual") ||
      (mode === "assisted" && job.applyType === "assisted") ||
      (mode === "direct" && job.directApplySupported);
    const text = `${job.title} ${job.company} ${job.location} ${job.description} ${(job.skills || []).join(" ")}`.toLowerCase();
    return modeMatch && (!normalizedQuery || text.includes(normalizedQuery));
  });
}

export async function getJobById(jobId) {
  const job = (await getCachedJob(jobId)) || (process.env.ENABLE_DEMO_JOBS === "true" ? getSampleJobById(jobId) : null);
  return job ? { ...job, directApplySupported: false } : null;
}
