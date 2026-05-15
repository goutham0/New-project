import { NextResponse } from "next/server";
import { getUserByEmail, addAudit } from "@/lib/store";
import { verifyPassword, setSessionCookie } from "@/lib/auth";

export async function POST(request) {
  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
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
