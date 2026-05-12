import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listApplications, updateApplication, addAudit } from "@/lib/store";

export async function POST(request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { applicationIds = [], action = "submit" } = await request.json();
  const existing = await listApplications(user.id);
  const updated = [];

  for (const applicationId of applicationIds) {
    const application = existing.find((item) => item.id === applicationId);
    if (!application) continue;

    if (action === "approve") {
      updated.push(await updateApplication(user.id, applicationId, { status: "APPROVED" }));
      continue;
    }

    if (action === "assist") {
      updated.push(await updateApplication(user.id, applicationId, { status: "ASSISTED_OPENED" }));
      continue;
    }

    if (action === "manual") {
      updated.push(
        await updateApplication(user.id, applicationId, {
          status: "SUBMITTED",
          externalApplicationId: `MANUAL-${Math.floor(Math.random() * 900000 + 100000)}`
        })
      );
      continue;
    }

    updated.push(
      await updateApplication(user.id, applicationId, {
        status: "SUBMITTED",
        externalApplicationId:
          application.applicationType === "DIRECT"
            ? `MOCK-ATS-${Math.floor(Math.random() * 900000 + 100000)}`
            : `MANUAL-${Math.floor(Math.random() * 900000 + 100000)}`
      })
    );
  }

  await addAudit({
    userId: user.id,
    eventType: "APPLICATION_STATUS_UPDATED",
    message: `${updated.length} application(s) updated with action ${action}.`,
    metadata: { action }
  });
  return NextResponse.json({ applications: updated.filter(Boolean) });
}
