"use client";

import { useEffect, useState } from "react";

export default function ApplicationsClient() {
  const [applications, setApplications] = useState([]);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("");

  async function load() {
    const response = await fetch("/api/applications");
    const data = await response.json();
    setApplications(data.applications || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function action(applicationId, actionName) {
    if (actionName === "submit" && !consent) {
      setStatus("Confirm consent before direct submission.");
      return;
    }
    const response = await fetch("/api/applications/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationIds: [applicationId], action: actionName })
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Unable to update application.");
      return;
    }
    setStatus("Application updated.");
    await load();
  }

  return (
    <div className="dashboard-grid">
      <article className="dashboard-card">
        <h3>Candidate consent</h3>
        <label style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 12 }}>
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <span>
            I confirm that the information in these applications is accurate, and I authorize this platform to submit
            selected applications on my behalf through supported employer or ATS integrations.
          </span>
        </label>
        {status && <p className="status-line">{status}</p>}
      </article>

      {applications.map((application) => (
        <article className="tracker-card" key={application.id}>
          <div className="dashboard-header" style={{ marginBottom: 0 }}>
            <div>
              <span className={`tag ${application.applicationType === "DIRECT" ? "direct" : "assisted"}`}>
                {application.applicationType}
              </span>
              <h3>{application.package?.tailoredResume?.headline || application.jobId}</h3>
              <p>Match score: {application.matchScore}%</p>
            </div>
            <strong className="score">{application.status}</strong>
          </div>
          <div className="generated-grid">
            <article>
              <h4>Tailored resume</h4>
              <p>{application.package?.tailoredResume?.summary}</p>
              <ul>
                {(application.package?.tailoredResume?.bullets || []).slice(0, 3).map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
            <article>
              <h4>Cover letter</h4>
              <p>{application.package?.coverLetter}</p>
            </article>
            <article>
              <h4>Screening answers</h4>
              {(application.package?.answers || []).map((answer) => (
                <p key={answer.question}>
                  <strong>{answer.question}</strong>
                  <br />
                  {answer.answer}
                </p>
              ))}
            </article>
          </div>
          <div className="tracker-actions">
            <button className="secondary-button" type="button" onClick={() => action(application.id, "approve")}>
              Approve
            </button>
            {application.applicationType === "DIRECT" && (
              <button className="primary-button" type="button" disabled={!consent} onClick={() => action(application.id, "submit")}>
                Submit through API
              </button>
            )}
            {application.applicationType === "ASSISTED" && (
              <button className="primary-button" type="button" onClick={() => action(application.id, "assist")}>
                Open assisted apply
              </button>
            )}
            <button className="secondary-button" type="button" onClick={() => action(application.id, "manual")}>
              Mark submitted
            </button>
          </div>
        </article>
      ))}

      {!applications.length && (
        <div className="empty-state">
          <strong>No applications yet.</strong>
          <p>Prepare jobs from assisted apply or direct bulk apply first.</p>
        </div>
      )}
    </div>
  );
}
