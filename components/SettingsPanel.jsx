import Link from "next/link";
import { FileText, Search, UserRound } from "lucide-react";

export default function SettingsPanel() {
  return (
    <div className="premium-grid three">
      <article className="premium-feature-card">
        <UserRound size={22} />
        <h3>Profile and preferences</h3>
        <p>Keep your contact details, work authorization, target roles, and preferred locations up to date.</p>
        <Link className="secondary-button" href="/dashboard/profile">Manage profile</Link>
      </article>
      <article className="premium-feature-card">
        <FileText size={22} />
        <h3>Your resume</h3>
        <p>Upload your original resume to your profile. Review and download a separate version for each job description.</p>
        <Link className="secondary-button" href="/dashboard/tailor">Open resume workspace</Link>
      </article>
      <article className="premium-feature-card">
        <Search size={22} />
        <h3>Job search</h3>
        <p>Search by role and location, then open the employer application page.</p>
        <Link className="secondary-button" href="/dashboard/manual-apply">Find jobs</Link>
      </article>
    </div>
  );
}
