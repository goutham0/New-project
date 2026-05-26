import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getProfile, getResumeById } from "@/lib/store";
import { parseResumeTextToJson } from "@/lib/resumePipeline";

export async function POST(_request, { params }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const resume = await getResumeById(user.id, id);
  if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  const profile = await getProfile(user.id);
  const parsedJson = parseResumeTextToJson(resume.content, profile);
  return NextResponse.json({ parsedJson });
}
