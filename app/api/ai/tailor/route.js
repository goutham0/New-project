import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getProfile, addAudit } from "@/lib/store";
import { tailorFreeform } from "@/lib/ai";

export async function POST(request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { resumeText = "", jobDescription = "" } = await request.json();
  if (!resumeText.trim() || !jobDescription.trim()) {
    return NextResponse.json({ error: "Resume text and job description are required." }, { status: 400 });
  }

  const profile = await getProfile(user.id);
  const result = tailorFreeform({ resumeText, jobDescription, profile });
  await addAudit({ userId: user.id, eventType: "TAILORING_GENERATED", message: "Freeform tailored resume package generated." });
  return NextResponse.json({ result });
}
