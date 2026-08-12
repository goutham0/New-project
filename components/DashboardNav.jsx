"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  ["/dashboard", "Overview"],
  ["/dashboard/profile", "Profile"],
  ["/dashboard/manual-apply", "Manual apply"],
  ["/dashboard/assisted-apply", "Assisted apply"],
  ["/dashboard/direct-bulk-apply", "Direct bulk apply"],
  ["/dashboard/tailor", "Resume tailoring"],
  ["/dashboard/applications", "Applications"]
];

export default function DashboardNav({ user }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  return (
    <aside className="sidebar">
      <Link className="brand" href="/">
        <span className="brand-mark">AF</span>
        <span>Apply Friend</span>
      </Link>
      <nav aria-label="Candidate navigation">
        {links.map(([href, label]) => (
          <Link className={pathname === href ? "active" : ""} href={href} key={href}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <strong>{user.email}</strong>
        <span>Demo workspace</span>
        <button className="secondary-button" type="button" onClick={logout}>Logout</button>
      </div>
    </aside>
  );
}
