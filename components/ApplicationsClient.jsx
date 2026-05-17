"use client";

import { useEffect, useMemo, useState } from "react";

export default function ApplicationsClient() {
  const [applications, setApplications] = useState([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/applications");
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error || "Unable to load applications.");
        return;
      }
      setApplications(data.applications || []);
    }
    load();
  }, []);

  const submittedApplications = useMemo(
    () => applications.filter((application) => application.status === "SUBMITTED"),
    [applications]
  );

  return (
    <div className="dashboard-grid">
      <article className="dashboard-card">
        <h3>Applied jobs</h3>
        <p>Only submitted applications are listed here. Resume, cover letter, and answer details stay in the review step before submission.</p>
        {status && <p className="status-line error-line">{status}</p>}
      </article>

      <div className="applications-list">
        {submittedApplications.map((application) => {
          const job = application.package?.job || {};
          return (
            <article className="application-row" key={application.id}>
              <div>
                <span className={`tag ${application.applicationType === "DIRECT" ? "direct" : "assisted"}`}>
                  {application.applicationType === "DIRECT" ? "Direct apply" : "Assisted/manual"}
                </span>
                <h3>{job.company || "Company not listed"}</h3>
                <p>{job.title || application.jobId}</p>
              </div>
              <div>
                <strong className="score">Submitted</strong>
                <p>{formatDate(application.updatedAt || application.createdAt)}</p>
              </div>
              <div>
                <span className="tag direct">{application.externalApplicationId || "Recorded"}</span>
              </div>
            </article>
          );
        })}
      </div>

      {!submittedApplications.length && (
        <div className="empty-state">
          <strong>No submitted applications yet.</strong>
          <p>After you submit direct, assisted, or manual applications, they will appear here by company and role.</p>
        </div>
      )}
    </div>
  );
}

function formatDate(value) {
  if (!value) return "Date not recorded";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
