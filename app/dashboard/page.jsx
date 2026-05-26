import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { getLatestResume, getProfile, listApplications } from "@/lib/store";

const required = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "city",
  "state",
  "country",
  "workAuthorization",
  "sponsorshipRequired",
  "currentTitle",
  "yearsExperience",
  "highestEducation",
  "targetTitles",
  "preferredLocations",
  "remotePreference",
  "expectedSalaryMin",
  "expectedSalaryMax",
  "noticePeriod"
];

export default async function DashboardPage() {
  const user = await currentUser();
  const [profile, resume, applications] = await Promise.all([
    getProfile(user.id),
    getLatestResume(user.id),
    listApplications(user.id)
  ]);
  const profileComplete = required.every((field) => String(profile[field] || "").trim());
  const readiness = Math.round(
    ([Boolean(user), Boolean(resume), profileComplete, user.plan !== "Free"].filter(Boolean).length / 4) * 100
  );

  return (
    <>
      <div className="dashboard-header">
        <div className="dashboard-title">
          <p className="eyebrow">Candidate portal</p>
          <h1>Welcome back</h1>
          <p>Complete your profile, choose your apply mode, and track every application.</p>
        </div>
        <Link className="primary-button" href="/dashboard/profile">Update profile</Link>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <p className="panel-kicker">Readiness</p>
          <h3>{readiness}%</h3>
          <p>Account, resume, profile, and paid plan gate direct apply.</p>
        </article>
        <article className="stat-card">
          <p className="panel-kicker">Plan</p>
          <h3>{user.plan}</h3>
          <p>Upgrade to Pro, Elite, or Concierge to unlock AI preparation and assisted workflows.</p>
        </article>
        <article className="stat-card">
          <p className="panel-kicker">Resume</p>
          <h3>{resume ? "Uploaded" : "Missing"}</h3>
          <p>{resume ? resume.fileName : "Upload your primary resume."}</p>
        </article>
        <article className="stat-card">
          <p className="panel-kicker">Applications</p>
          <h3>{applications.length}</h3>
          <p>Prepared, approved, submitted, and assisted events.</p>
        </article>
      </div>

      <div className="dashboard-grid two" style={{ marginTop: 16 }}>
        <article className="dashboard-card">
          <h3>Apply workflows</h3>
          <p>Choose the workflow that matches the job source and your plan.</p>
          <div className="button-row">
            <Link className="secondary-button" href="/dashboard/manual-apply">Manual apply</Link>
            <Link className="secondary-button" href="/dashboard/assisted-apply">Assisted apply</Link>
            <Link className="primary-button" href="/dashboard/direct-bulk-apply">Direct bulk apply</Link>
          </div>
        </article>
        <article className="dashboard-card">
          <h3>Tailored resume generation</h3>
          <p>Paste a resume and job description to generate a tailored resume summary, cover letter, and answers.</p>
          <Link className="primary-button" href="/dashboard/tailor">Generate now</Link>
        </article>
      </div>
    </>
  );
}
