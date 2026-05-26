import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { addAudit, saveFeedback } from "@/lib/store";

const allowedTypes = new Set(["Bug", "Feature Request", "Pricing", "Recruiter Support", "Extension Issue", "Other"]);

export async function POST(request) {
  const user = await currentUser();
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const type = allowedTypes.has(body.type) ? body.type : "Other";
  const rating = Math.max(1, Math.min(5, Number(body.rating) || 5));
  const message = String(body.message || "").trim();

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
  }

  const feedback = await saveFeedback({
    userId: user?.id || null,
    name,
    email,
    type,
    rating,
    message
  });
  await addAudit({
    userId: user?.id || null,
    eventType: "FEEDBACK_SUBMITTED",
    message: "Visitor submitted feedback.",
    metadata: { feedbackId: feedback.id, type, rating }
  });

  return NextResponse.json({ ok: true, feedbackId: feedback.id });
}
