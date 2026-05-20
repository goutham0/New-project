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
  const [directApplications, setDirectApplications] = useState([]);
  const [directConsent, setDirectConsent] = useState(false);
  const [preparingDirect, setPreparingDirect] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isManual = mode === "manual";
  const isDirect = mode === "direct";
  const isAssisted = mode === "assisted";

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
    setDirectApplications([]);
    setReviewingDirect(false);
    setDirectConsent(false);
  }

  async function prepareJobIds(jobIds, options = {}) {
    setStatus("Preparing application packages...");
    const response = await fetch("/api/applications/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobIds, useAi: Boolean(options.useAi) })
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(formatApiError(data, "Unable to prepare applications."));
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
    setStatus("Prepared. Opening secure handoff, then employer form. The extension will autofill automatically when possible.");
    const targetUrl = withApplyFriendHandoffPage(job.applyUrl, applications[0].handoffToken);
    if (applyWindow) {
      applyWindow.opener = null;
      applyWindow.location.href = targetUrl;
    } else {
      window.location.href = targetUrl;
    }
    router.refresh();
  }

  async function prepareDirectReview() {
    if (!selected.length) {
      setStatus("Select at least one job first.");
      return;
    }
    setPreparingDirect(true);
    setDirectConsent(false);
    setDirectApplications([]);
    setReviewingDirect(false);
    const applications = await prepareJobIds(selected);
    setPreparingDirect(false);
    if (!applications?.length) {
      setStatus("Unable to prepare selected direct applications.");
      return;
    }
    setDirectApplications(applications);
    setReviewingDirect(true);
    setStatus("Review every prepared package. Direct-supported jobs can be submitted here; Adzuna jobs open with assisted autofill.");
  }

  async function submitDirectBulk() {
    if (submitting) return;
    const directReady = directApplications.filter((application) =>
      application.applicationType === "DIRECT" && application.status !== "SUBMITTED" && !application.alreadySubmitted
    );
    if (!directReady.length) {
      setStatus("No new direct-supported applications are ready to submit. Open assisted jobs with the extension instead.");
      return;
    }
    if (!directConsent) {
      setStatus("Confirm consent before direct submission.");
      return;
    }
    if (!directApplications.length) {
      setStatus("Prepare selected applications before submitting.");
      return;
    }
    setSubmitting(true);
    setStatus("Submitting selected direct applications...");
    const response = await fetch("/api/applications/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationIds: directReady.map((application) => application.id),
        action: "submit",
        consentConfirmed: true
      })
    });
    const data = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setStatus(formatApiError(data, "Unable to submit selected applications."));
      return;
    }
    const submittedIds = new Set((data.applications || []).filter((application) => application.status === "SUBMITTED").map((application) => application.id));
    const submittedCount = directReady.filter((application) => submittedIds.has(application.id)).length;
    const assistedRemaining = directApplications.filter((application) => application.applicationType === "ASSISTED");
    setStatus(`${submittedCount} direct application(s) submitted.${assistedRemaining.length ? " Assisted jobs are ready to open with the extension." : ""}`);
    setSelected([]);
    setDirectApplications((current) => current.map((application) =>
      submittedIds.has(application.id) ? { ...application, status: "SUBMITTED", alreadySubmitted: true } : application
    ));
    setReviewingDirect(Boolean(assistedRemaining.length));
    setDirectConsent(false);
    if (!assistedRemaining.length) router.push("/dashboard/applications");
    router.refresh();
  }

  function openPreparedAssisted(application) {
    const job = application.package?.job || {};
    const targetUrl = withApplyFriendHandoffPage(job.applyUrl, application.handoffToken);
    window.open(targetUrl, "_blank", "noopener");
    setStatus("Opening assisted apply. The extension will autofill known fields, and you submit manually after review.");
  }

  async function markManualSubmitted(job) {
    setSubmitting(true);
    setStatus("Recording manual application...");
    const response = await fetch("/api/applications/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: job.id })
    });
    const data = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setStatus(formatApiError(data, "Unable to record manual application."));
      return;
    }
    setStatus(`${job.company} recorded as submitted.`);
    router.refresh();
  }

  const directReadyCount = directApplications.filter((application) =>
    application.applicationType === "DIRECT" && application.status !== "SUBMITTED" && !application.alreadySubmitted
  ).length;
  const assistedReadyCount = directApplications.filter((application) => application.applicationType === "ASSISTED").length;
  const alreadySubmittedCount = directApplications.filter((application) =>
    application.status === "SUBMITTED" || application.alreadySubmitted
  ).length;

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
            disabled={!selected.length || preparingDirect || submitting}
            onClick={prepareDirectReview}
          >
            {preparingDirect ? "Preparing..." : `Apply selected${selected.length ? ` (${selected.length})` : ""}`}
          </button>
        )}
      </div>
      {sourceStatus && (
        <p className={`status-line ${sourceStatus.adzuna === "error" ? "error-line" : ""}`}>
          {sourceStatus.adzuna === "live" && `Live Adzuna jobs loaded${sourceStatus.adzunaCount ? ` from ${sourceStatus.adzunaCount.toLocaleString()} matching ads` : ""}.`}
          {sourceStatus.adzuna === "not_configured" && "Add ADZUNA_APP_ID and ADZUNA_APP_KEY to show live Adzuna jobs. Sample jobs are shown for now."}
          {sourceStatus.adzuna === "error" && "Live Adzuna jobs are unavailable right now. Sample jobs are shown for now."}
        </p>
      )}
      {isDirect && (
        <p className="status-line">
          Select jobs, review the prepared packages, submit direct-supported jobs with consent, and open Adzuna jobs through assisted autofill.
        </p>
      )}
      {isDirect && reviewingDirect && (
        <div className="review-panel direct-review-panel">
          <div className="review-panel-header">
            <div>
              <p className="eyebrow">Review generated packages</p>
              <h3>{directApplications.length} package{directApplications.length === 1 ? "" : "s"} ready</h3>
              <p>
                {directReadyCount} direct-supported, {assistedReadyCount} assisted, {alreadySubmittedCount} already submitted.
                Check each package before continuing.
              </p>
            </div>
            <span className="tag direct">Candidate review required</span>
          </div>
          <div className="bulk-review-grid">
            {directApplications.map((application) => (
              <DirectApplicationReview key={application.id} application={application} onOpenAssisted={openPreparedAssisted} />
            ))}
          </div>
          {directReadyCount > 0 && (
            <label className="consent-row">
              <input type="checkbox" checked={directConsent} onChange={(event) => setDirectConsent(event.target.checked)} />
              <span>I reviewed the direct-supported jobs and authorize Apply Friend to submit them through supported employer or ATS integrations.</span>
            </label>
          )}
          <div className="button-row compact">
            <button className="primary-button" type="button" disabled={directReadyCount === 0 || !directConsent || submitting} onClick={submitDirectBulk}>
              {submitting ? "Submitting..." : `Submit direct jobs${directReadyCount ? ` (${directReadyCount})` : ""}`}
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={submitting}
              onClick={() => {
                setReviewingDirect(false);
                setDirectApplications([]);
                setDirectConsent(false);
              }}
            >
              Change selection
            </button>
          </div>
        </div>
      )}
      {status && <p className={`status-line ${isErrorStatus(status) ? "error-line" : ""}`}>{status}</p>}
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
                <span className={`tag ${job.directApplySupported ? "direct" : job.applyType === "assisted" ? "assisted" : ""}`}>
                  {job.directApplySupported ? "Direct API supported" : job.applyType === "assisted" ? "Extension assisted" : "Manual link"}
                </span>
                <span className="tag">{job.remoteType}</span>
                <span className="tag">{job.employmentType}</span>
                <span className="tag">{job.source}</span>
                <span className="tag">{formatSalary(job)}</span>
              </div>
              <div className="job-actions">
                {isManual && (
                  <>
                    <a className="primary-button slim" href={normalizeApplyUrl(job.applyUrl)} target="_blank" rel="noopener">
                      Open apply page
                    </a>
                    <button className="secondary-button slim" type="button" disabled={submitting} onClick={() => markManualSubmitted(job)}>
                      Mark submitted
                    </button>
                  </>
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
            <strong className="score">{job.directApplySupported ? "API" : job.applyType === "assisted" ? "Assist" : "Link"}</strong>
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

function DirectApplicationReview({ application, onOpenAssisted }) {
  const pkg = application.package || {};
  const job = pkg.job || {};
  const resume = pkg.tailoredResume || {};
  const submission = pkg.candidateSubmission || {};
  const pdfHref = pkg.tailoredResumePdfBase64 ? `data:application/pdf;base64,${pkg.tailoredResumePdfBase64}` : "";
  const jobMeta = [job.company, job.location].filter(Boolean).join(" - ");
  const isAssisted = application.applicationType === "ASSISTED";
  const isSubmitted = application.status === "SUBMITTED" || application.alreadySubmitted;

  return (
    <article className="application-review-card">
      <div className="review-card-title">
        <div>
          <span className={`tag ${isAssisted ? "assisted" : "direct"}`}>
            {isSubmitted ? "Already submitted" : isAssisted ? "Assisted apply" : "Direct API"}
          </span>
          <h4>{job.title || application.jobId}</h4>
          {jobMeta && <p>{jobMeta}</p>}
        </div>
        <strong className="score">{application.matchScore}%</strong>
      </div>

      <section className="review-section">
        <div className="review-section-header">
          <h4>Tailored resume</h4>
          {pkg.aiUsed && <span className="tag direct">GPT generated</span>}
        </div>
        <p>{resume.summary}</p>
        <ul className="compact-list">
          {(resume.bullets || []).slice(0, 4).map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
        {pdfHref && (
          <a className="secondary-button slim" href={pdfHref} download={pkg.tailoredResumePdfFileName || "tailored-resume.pdf"}>
            Download tailored PDF
          </a>
        )}
        {isAssisted && (
          <button className="primary-button slim" type="button" onClick={() => onOpenAssisted(application)}>
            Open assisted form
          </button>
        )}
      </section>

      <section className="review-section">
        <h4>Information to submit</h4>
        <dl className="submission-grid">
          {submissionRows(submission).map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value || "Not provided"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="review-section">
        <h4>Cover letter</h4>
        <p className="generated-text">{pkg.coverLetter}</p>
      </section>

      <section className="review-section">
        <h4>Screening answers</h4>
        <div className="answer-list">
          {(pkg.answers || []).map((answer) => (
            <div key={answer.question}>
              <strong>{answer.question}</strong>
              <p>{answer.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}

function submissionRows(submission) {
  return [
    ["Name", submission.name],
    ["Email", submission.email],
    ["Phone", submission.phone],
    ["Location", submission.location],
    ["Work authorization", submission.workAuthorization],
    ["Sponsorship", submission.sponsorshipRequired],
    ["Current title", submission.currentTitle],
    ["Years experience", submission.yearsExperience]
  ].map(([label, value]) => ({ label, value }));
}

function isErrorStatus(status) {
  return /unable|required|complete|confirm|missing|failed|expired|paid/i.test(status);
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
  if (value.startsWith("/")) return `${window.location.origin}${value}`;
  return `https://${value}`;
}

function withApplyFriendHandoffPage(url, token) {
  const target = normalizeApplyUrl(url);
  if (!token) return target;
  const [baseAndQuery] = target.split("#");
  const handoffUrl = new URL("/assisted-handoff", window.location.origin);
  handoffUrl.searchParams.set("to", baseAndQuery);
  const params = new URLSearchParams();
  params.set("applyfriend_base", window.location.origin);
  params.set("applyfriend_token", token);
  return `${handoffUrl.toString()}#${params.toString()}`;
}

function formatApiError(data, fallback) {
  const missing = Array.isArray(data?.missing) && data.missing.length
    ? ` Missing profile fields: ${data.missing.join(", ")}.`
    : "";
  return [data?.error || fallback, data?.detail, data?.fix, missing].filter(Boolean).join(" ");
}
