import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getProfile, listApplications } from "@/lib/store";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [profile, applications] = await Promise.all([getProfile(user.id), listApplications(user.id)]);
  const assisted = applications.find((item) => item.applicationType === "ASSISTED");
  return NextResponse.json({
    profile,
    application: assisted || null
  });
}
