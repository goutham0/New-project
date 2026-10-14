import { NextResponse } from "next/server";
import { getUserByEmail, addAudit, consumeRequestLimit } from "@/lib/store";
import crypto from "node:crypto";
import { verifyPassword, setSessionCookie } from "@/lib/auth";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || email.length > 254 || !password || password.length > 256) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  if (!await consumeRequestLimit(`login:${crypto.createHash("sha256").update(email).digest("hex")}`, 20, 900)) {
    return NextResponse.json({ error: "Too many login attempts. Try again in 15 minutes." }, { status: 429 });
  }
  const user = await getUserByEmail(email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await addAudit({ userId: user.id, eventType: "USER_LOGGED_IN", message: "Candidate logged in." });
  const response = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan }
  });
  setSessionCookie(response, user, request);
  return response;
}
