import { NextResponse } from "next/server";
import { currentUser, userFromAssistedApplyToken, userFromExtensionRequest } from "@/lib/auth";
import { getProfile, listApplications } from "@/lib/store";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const handoffToken = searchParams.get("token");
  const handoff = handoffToken ? await userFromAssistedApplyToken(handoffToken) : null;
  const user = handoff?.user || (await currentUser()) || (await userFromExtensionRequest(request));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [profile, applications] = await Promise.all([getProfile(user.id), listApplications(user.id)]);
  const assisted = handoff?.applicationId
    ? applications.find((item) => item.id === handoff.applicationId && item.applicationType === "ASSISTED")
    : applications.find((item) => item.applicationType === "ASSISTED");
  return NextResponse.json({
    profile,
    application: assisted || null
  });
}
