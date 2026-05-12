import { NextResponse } from "next/server";
import { createUser, addAudit } from "@/lib/store";
import { hashPassword, setSessionCookie } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();

    if (!email || password.length < 8) {
      return NextResponse.json({ error: "Email and an 8 character password are required." }, { status: 400 });
    }

    const user = await createUser({ email, passwordHash: hashPassword(password), name });
    await addAudit({ userId: user.id, eventType: "USER_SIGNED_UP", message: "Candidate account created." });
    const response = NextResponse.json({ user: publicUser(user) });
    setSessionCookie(response, user);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message || "Signup failed." }, { status: 400 });
  }
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan };
}
