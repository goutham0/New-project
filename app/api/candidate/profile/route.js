import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getProfile, getLatestResume, saveProfile, updateUser, addAudit } from "@/lib/store";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await getProfile(user.id);
  const resume = await getLatestResume(user.id);
  return NextResponse.json({ user: publicUser(user), profile, resume });
}

export async function PUT(request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!body.profile || typeof body.profile !== "object" || Array.isArray(body.profile) || JSON.stringify(body.profile).length > 20000) {
    return NextResponse.json({ error: "Invalid profile data." }, { status: 400 });
  }
  const profile = { ...await getProfile(user.id), ...body.profile };
  const nextUser = await updateUser(user.id, {
    name: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || user.name,
    email: user.email
  });
  const saved = await saveProfile(user.id, profile);
  await addAudit({ userId: user.id, eventType: "PROFILE_SAVED", message: "Candidate profile saved." });
  return NextResponse.json({ user: publicUser(nextUser), profile: saved });
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan };
}
