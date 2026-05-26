import { NextResponse } from "next/server";
import { currentUser, userFromExtensionRequest } from "@/lib/auth";
import { addAudit } from "@/lib/store";

export async function POST(request) {
  const user = (await currentUser()) || (await userFromExtensionRequest(request));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  await addAudit({
    userId: user.id,
    eventType: "EXTENSION_AUTOFILL_COMPLETED",
    message: "Extension autofill result saved.",
    metadata: {
      applicationId: body.applicationId || "",
      filledCount: Number(body.filledCount || 0),
      skippedCount: Number(body.skippedCount || 0),
      url: String(body.url || "").slice(0, 300)
    }
  });
  return NextResponse.json({ ok: true });
}
