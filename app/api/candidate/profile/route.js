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
  const profile = body.profile || {};
  const plan = body.plan || user.plan;
  const nextUser = await updateUser(user.id, {
    name: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || user.name,
    email: profile.email || user.email,
    plan
  });
  const saved = await saveProfile(user.id, profile);
  await addAudit({ userId: user.id, eventType: "PROFILE_SAVED", message: "Candidate profile saved." });
  return NextResponse.json({ user: publicUser(nextUser), profile: saved });
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan };
}
