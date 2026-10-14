import { NextResponse } from "next/server";
import { createUser, addAudit, consumeRequestLimit } from "@/lib/store";
import crypto from "node:crypto";
import { hashPassword, setSessionCookie } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 8 || password.length > 256 || name.length > 200) {
      return NextResponse.json({ error: "Email and an 8 character password are required." }, { status: 400 });
    }
    const address = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
    if (!await consumeRequestLimit(`signup:${crypto.createHash("sha256").update(address).digest("hex")}`, 10, 3600)) {
      return NextResponse.json({ error: "Too many signup attempts. Try again later." }, { status: 429 });
    }

    const user = await createUser({ email, passwordHash: hashPassword(password), name });
    await addAudit({ userId: user.id, eventType: "USER_SIGNED_UP", message: "Candidate account created." });
    const response = NextResponse.json({ user: publicUser(user) });
    setSessionCookie(response, user, request);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.code === "23505" ? "An account with that email already exists. Please sign in." : "Unable to create your account. Check your details and try again." }, { status: 400 });
  }
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan };
}
