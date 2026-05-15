import { NextResponse } from "next/server";
import { currentUser, userFromExtensionRequest } from "@/lib/auth";
import { getProfile, listApplications } from "@/lib/store";

export async function GET(request) {
  const user = (await currentUser()) || (await userFromExtensionRequest(request));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [profile, applications] = await Promise.all([getProfile(user.id), listApplications(user.id)]);
  const assisted = applications.find((item) => item.applicationType === "ASSISTED");
  return NextResponse.json({
    profile,
    application: assisted || null
  });
}
