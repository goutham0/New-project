import { NextResponse } from "next/server";
import { currentUser, createExtensionToken } from "@/lib/auth";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    token: createExtensionToken(user),
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  });
}
