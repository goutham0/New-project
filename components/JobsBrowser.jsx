"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function JobsBrowser({ mode }) {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [sourceStatus, setSourceStatus] = useState(null);
  const [reviewingDirect, setReviewingDirect] = useState(false);
  const [directConsent, setDirectConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isManual = mode === "manual";
  const isDirect = mode === "direct";
  const isAssisted = mode === "assisted";
  const selectedJobs = jobs.filter((job) => selected.includes(job.id));

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      const response = await fetch(`/api/jobs?mode=${mode}&q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setJobs(data.jobs || []);
      setSourceStatus(data.sourceStatus || null);
      setLoading(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [mode, query]);

  function toggle(jobId) {
    setSelected((current) => current.includes(jobId) ? current.filter((id) => id !== jobId) : [...current, jobId]);
  }

  async function prepareJobIds(jobIds) {
    setStatus("Preparing application packages...");
    const response = await fetch("/api/applications/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobIds })
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Unable to prepare applications.");
      return null;
    }
    return data.applications || [];
  }

  async function prepareAssisted(job) {
    const applyWindow = window.open("about:blank", "_blank");
    setSubmitting(true);
    const applications = await prepareJobIds([job.id]);
    setSubmitting(false);
    if (!applications?.length) {
      if (applyWindow) applyWindow.close();
      setStatus("Unable to prepare this assisted application.");
      return;
    }
    setStatus("Prepared. Opening employer form. Use the extension popup to autofill.");
    if (applyWindow) {
      applyWindow.opener = null;
      applyWindow.location.href = normalizeApplyUrl(job.applyUrl);
    } else {
      window.location.href = normalizeApplyUrl(job.applyUrl);
    }
    router.refresh();
  }

  async function submitDirectBulk() {
    if (!directConsent) {
      setStatus("Confirm consent before direct submission.");
      return;
    }
    setSubmitting(true);
    const applications = await prepareJobIds(selected);
    if (!applications?.length) {
      setSubmitting(false);
      setStatus("Unable to prepare selected direct applications.");
      return;
    }
    setStatus("Submitting selected direct applications...");
    const response = await fetch("/api/applications/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationIds: applications.map((application) => application.id),
        action: "submit",
        consentConfirmed: true
      })
    });
    const data = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setStatus(data.error || "Unable to submit selected applications.");
      return;
    }
    setStatus(`${data.applications.length} direct application(s) submitted.`);
    setSelected([]);
    setReviewingDirect(false);
    setDirectConsent(false);
    router.push("/dashboard/applications");
    router.refresh();
  }

  return (
    <div>
      <div className="job-toolbar">
        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search jobs, companies, skills"
        />
        {isDirect && (
          <button
            className="primary-button"
            type="button"
            disabled={!selected.length}
            onClick={() => setReviewingDirect(true)}
          >
            Review selected
          </button>
        )}
      </div>
      {sourceStatus && mode !== "direct" && (
        <p className={`status-line ${sourceStatus.adzuna === "error" ? "error-line" : ""}`}>
          {sourceStatus.adzuna === "live" && `Live Adzuna jobs loaded${sourceStatus.adzunaCount ? ` from ${sourceStatus.adzunaCount.toLocaleString()} matching ads` : ""}.`}
          {sourceStatus.adzuna === "not_configured" && "Add ADZUNA_APP_ID and ADZUNA_APP_KEY to show live Adzuna jobs. Sample jobs are shown for now."}
          {sourceStatus.adzuna === "error" && "Live Adzuna jobs are unavailable right now. Sample jobs are shown for now."}
        </p>
      )}
      {isDirect && (
        <p className="status-line">
          Select direct-supported jobs, review consent, then submit the selected applications.
        </p>
      )}
      {isDirect && reviewingDirect && (
        <div className="review-panel">
          <div>
            <p className="eyebrow">Review selected</p>
            <h3>{selectedJobs.length} direct application{selectedJobs.length === 1 ? "" : "s"}</h3>
            <div className="selected-list">
              {selectedJobs.map((job) => (
                <span className="tag direct" key={job.id}>{job.title} at {job.company}</span>
              ))}
            </div>
          </div>
          <label className="consent-row">
            <input type="checkbox" checked={directConsent} onChange={(event) => setDirectConsent(event.target.checked)} />
            <span>I reviewed the selected jobs and authorize ApplyPilot to submit these applications through supported employer or ATS integrations.</span>
          </label>
          <div className="button-row compact">
            <button className="primary-button" type="button" disabled={!directConsent || submitting} onClick={submitDirectBulk}>
              {submitting ? "Submitting..." : "Submit selected"}
            </button>
            <button className="secondary-button" type="button" disabled={submitting} onClick={() => setReviewingDirect(false)}>
              Change selection
            </button>
          </div>
        </div>
      )}
      {status && <p className={`status-line ${status.includes("Unable") ? "error-line" : ""}`}>{status}</p>}
      <div className="job-grid">
        {loading && (
          <div className="empty-state">
            <strong>Loading jobs...</strong>
            <p>Checking available job sources.</p>
          </div>
        )}
        {!loading && jobs.map((job) => (
          <article className="job-card" key={job.id}>
            {isDirect ? (
              <input
                type="checkbox"
                checked={selected.includes(job.id)}
                onChange={() => toggle(job.id)}
                aria-label={`Select ${job.title}`}
              />
            ) : (
              <span className={`tag ${isAssisted ? "assisted" : ""}`}>{isAssisted ? "Assist" : "Manual"}</span>
            )}
            <div>
              <h3>{job.title}</h3>
              <p>{job.company} - {job.location}</p>
              <p>{job.description}</p>
              <div className="tag-row">
                <span className={`tag ${job.directApplySupported ? "direct" : isAssisted ? "assisted" : ""}`}>
                  {job.directApplySupported ? "Direct API supported" : isAssisted ? "Extension assisted" : "Manual link"}
                </span>
                <span className="tag">{job.remoteType}</span>
                <span className="tag">{job.employmentType}</span>
                <span className="tag">{job.source}</span>
                <span className="tag">{formatSalary(job)}</span>
              </div>
              <div className="job-actions">
                {isManual && (
                  <a className="primary-button slim" href={normalizeApplyUrl(job.applyUrl)} target="_blank" rel="noopener">
                    Open apply page
                  </a>
                )}
                {isAssisted && (
                  <button className="primary-button slim" type="button" disabled={submitting} onClick={() => prepareAssisted(job)}>
                    Prepare and open
                  </button>
                )}
                {isDirect && (
                  <button className="secondary-button slim" type="button" onClick={() => toggle(job.id)}>
                    {selected.includes(job.id) ? "Selected" : "Select"}
                  </button>
                )}
              </div>
            </div>
            <strong className="score">{job.directApplySupported ? "API" : "Link"}</strong>
          </article>
        ))}
        {!loading && !jobs.length && (
          <div className="empty-state">
            <strong>No jobs found.</strong>
            <p>Try a different search term.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatSalary(job) {
  const min = Number(job.salaryMin || 0);
  const max = Number(job.salaryMax || 0);
  if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  if (min) return `From $${min.toLocaleString()}`;
  if (max) return `Up to $${max.toLocaleString()}`;
  return "Salary not listed";
}

function normalizeApplyUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "https://www.adzuna.com/";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}
