import { NextResponse } from "next/server";
import { jobs } from "@/data/jobs";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const query = (searchParams.get("q") || "").toLowerCase();

  const filtered = jobs.filter((job) => {
    const modeMatch =
      !mode ||
      mode === "all" ||
      (mode === "manual" && job.applyType === "manual") ||
      (mode === "assisted" && job.applyType === "assisted") ||
      (mode === "direct" && job.directApplySupported);
    const text = `${job.title} ${job.company} ${job.location} ${job.description} ${job.skills.join(" ")}`.toLowerCase();
    return modeMatch && (!query || text.includes(query));
  });

  return NextResponse.json({ jobs: filtered });
}
