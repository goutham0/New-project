import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { addAudit } from "@/lib/store";

const plans = {
  pro: "ApplyFriend Pro",
  elite: "ApplyFriend Elite",
  concierge: "ApplyFriend Concierge"
};

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const planId = String(searchParams.get("plan") || "pro").toLowerCase();
  const planName = plans[planId] || plans.pro;
  const user = await currentUser();
  if (user) {
    await addAudit({
      userId: user.id,
      eventType: "CHECKOUT_PLACEHOLDER_OPENED",
      message: "Checkout placeholder opened.",
      metadata: { planId, planName }
    });
    return NextResponse.redirect(`${origin}/dashboard/profile?checkout=placeholder&plan=${encodeURIComponent(planName)}`);
  }
  return NextResponse.redirect(`${origin}/signup?plan=${encodeURIComponent(planName)}`);
}
