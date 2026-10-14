import { NextResponse } from "next/server";
import { currentUser, createAssistedApplyToken } from "@/lib/auth";
import { listApplications } from "@/lib/store";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const applications = await listApplications(user.id);
  return NextResponse.json({ applications: applications.map((item) => item.applicationType === "ASSISTED" ? { ...item, handoffToken: createAssistedApplyToken(user, item) } : item) });
}
