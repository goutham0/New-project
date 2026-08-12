import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { addAudit } from "@/lib/store";

export async function GET(request) {
  const { origin } = new URL(request.url);
  const user = await currentUser();
  if (user) {
    await addAudit({
      userId: user.id,
      eventType: "DEMO_WORKSPACE_OPENED",
      message: "Demo workspace opened from legacy checkout route."
    });
    return NextResponse.redirect(`${origin}/dashboard`);
  }
  return NextResponse.redirect(`${origin}/signup`);
}
