"use client";

import { useEffect, useMemo, useState } from "react";

export default function ApplicationsClient() {
  const [applications, setApplications] = useState([]);
  const [status, setStatus] = useState("");
  const [view, setView] = useState("submitted");

  async function markSubmitted(application) {
    try {
      const response = await fetch("/api/applications/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationIds: [application.id], action: "manual" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setApplications((items) => items.map((item) => data.applications.find((updated) => updated.id === item.id) || item));
      setStatus("Application recorded as submitted by you.");
    } catch (error) { setStatus(error.message || "Unable to update application."); }
  }

  useEffect(() => {
    async function load() {
      try {
      const response = await fetch("/api/applications");
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error || "Unable to load applications.");
        return;
      }
      setApplications(data.applications || []);
      } catch { setStatus("Unable to load applications. Please refresh and try again."); }
    }
    load();
  }, []);

  const submittedApplications = useMemo(
    () => applications.filter((application) => ["SUBMITTED", "MANUAL_SUBMITTED"].includes(application.status) && !String(application.externalApplicationId || "").startsWith("MOCK-")),
    [applications]
  );

  return (
    <div className="dashboard-grid">
      <div className="button-row compact">
        <button className={view === "submitted" ? "primary-button" : "secondary-button"} onClick={() => setView("submitted")}>Applied jobs</button>
        <button className={view === "prepared" ? "primary-button" : "secondary-button"} onClick={() => setView("prepared")}>Prepared applications</button>
      </div>
      <article className="dashboard-card">
        <h3>Applied jobs</h3>
        <p>Only submitted applications are listed here. Resume, cover letter, and answer details stay in the review step before submission.</p>
        {status && <p className="status-line error-line">{status}</p>}
      </article>

      <div className="applications-list">
        {(view === "submitted" ? submittedApplications : applications.filter((item) => !["SUBMITTED", "MANUAL_SUBMITTED"].includes(item.status))).map((application) => {
          const job = application.package?.job || {};
          return (
            <article className="application-row" key={application.id}>
              <div>
                <span className={`tag ${application.applicationType === "DIRECT" ? "direct" : "assisted"}`}>
                  {applicationLabel(application.applicationType)}
                </span>
                <h3>{job.company || "Company not listed"}</h3>
                <p>{job.title || application.jobId}</p>
              </div>
              <div>
                <strong className="score">{application.status === "MANUAL_SUBMITTED" ? "Confirmed by you" : application.status.replaceAll("_", " ")}</strong>
                <p>{formatDate(application.package?.submittedAt || application.updatedAt || application.createdAt)}</p>
              </div>
              <div>
                {view === "prepared" && <>
                  {application.package?.tailoredResumePdfBase64 && <a className="secondary-button" href={`data:application/pdf;base64,${application.package.tailoredResumePdfBase64}`} download={application.package.tailoredResumePdfFileName || "resume.pdf"}>Review resume</a>}
                  {application.handoffToken && /^https?:\/\//.test(job.applyUrl || "") && <a className="primary-button" href={`/assisted-handoff?to=${encodeURIComponent(job.applyUrl)}#applyfriend_base=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")}&applyfriend_token=${encodeURIComponent(application.handoffToken)}`} target="_blank" rel="noopener">Open employer form</a>}
                  <button className="secondary-button" onClick={() => markSubmitted(application)}>I submitted this application</button>
                  {application.failureReason && <p>{application.failureReason}</p>}
                </>}
              </div>
            </article>
          );
        })}
      </div>

      {view === "submitted" && !submittedApplications.length && (
        <div className="empty-state">
          <strong>No submitted applications yet.</strong>
          <p>After you submit direct, assisted, or manual applications, they will appear here by company and role.</p>
        </div>
      )}
    </div>
  );
}

function applicationLabel(type) {
  if (type === "DIRECT") return "Direct apply";
  if (type === "ASSISTED") return "Assisted apply";
  return "Manual apply";
}

function formatDate(value) {
  if (!value) return "Date not recorded";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
