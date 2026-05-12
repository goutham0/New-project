"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function JobsBrowser({ mode }) {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState([]);
  const [status, setStatus] = useState("");
  const isManual = mode === "manual";
  const isDirect = mode === "direct";
  const isAssisted = mode === "assisted";

  useEffect(() => {
    const timer = setTimeout(async () => {
      const response = await fetch(`/api/jobs?mode=${mode}&q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setJobs(data.jobs || []);
    }, 150);
    return () => clearTimeout(timer);
  }, [mode, query]);

  function toggle(jobId) {
    setSelected((current) => current.includes(jobId) ? current.filter((id) => id !== jobId) : [...current, jobId]);
  }

  async function prepare() {
    setStatus("Preparing application packages...");
    const response = await fetch("/api/applications/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobIds: selected })
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Unable to prepare applications.");
      return;
    }
    setStatus(`${data.applications.length} application package(s) prepared.`);
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
        {!isManual && (
          <button className="primary-button" type="button" disabled={!selected.length} onClick={prepare}>
            {isDirect ? "Apply selected in bulk" : "Prepare assisted apply"}
          </button>
        )}
      </div>
      {status && <p className={`status-line ${status.includes("Unable") ? "error-line" : ""}`}>{status}</p>}
      <div className="job-grid">
        {jobs.map((job) => (
          <article className="job-card" key={job.id}>
            {!isManual ? (
              <input
                type="checkbox"
                checked={selected.includes(job.id)}
                onChange={() => toggle(job.id)}
                aria-label={`Select ${job.title}`}
              />
            ) : (
              <span className="tag">Manual</span>
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
                <span className="tag">${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}</span>
              </div>
              <div className="job-actions">
                <a className="text-button" href={job.applyUrl} target="_blank" rel="noreferrer">Open apply link</a>
                {isAssisted && <a className="text-button" href="/dashboard/applications">Use extension package</a>}
              </div>
            </div>
            <strong className="score">{job.directApplySupported ? "API" : "Link"}</strong>
          </article>
        ))}
        {!jobs.length && (
          <div className="empty-state">
            <strong>No jobs found.</strong>
            <p>Try a different search term.</p>
          </div>
        )}
      </div>
    </div>
  );
}
