import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import DashboardNav from "@/components/DashboardNav";

export default async function DashboardLayout({ children }) {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <main className="dashboard-shell">
      <DashboardNav user={{ email: user.email }} />
      <section className="dashboard-main">{children}</section>
    </main>
  );
}
