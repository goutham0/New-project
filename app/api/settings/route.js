import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { addAudit, getProfile, saveProfile } from "@/lib/store";

export async function PUT(request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const settings = body.settings && typeof body.settings === "object" ? body.settings : {};
  const profile = await getProfile(user.id);
  const saved = await saveProfile(user.id, {
    ...profile,
    settings
  });
  await addAudit({
    userId: user.id,
    eventType: "SETTINGS_SAVED",
    message: "Candidate settings saved.",
    metadata: { keys: Object.keys(settings).slice(0, 40) }
  });
  return NextResponse.json({ profile: saved });
}
