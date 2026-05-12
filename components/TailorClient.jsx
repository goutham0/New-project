"use client";

import { useState } from "react";

export default function TailorClient() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setStatus("Generating tailored package...");
    const response = await fetch("/api/ai/tailor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeText, jobDescription })
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setStatus(data.error || "Unable to generate.");
      return;
    }
    setResult(data.result);
    setStatus("Tailored package generated.");
  }

  return (
    <div className="dashboard-grid two">
      <form className="form-grid dashboard-card" onSubmit={submit}>
        <label>
          <span>Resume text</span>
          <textarea value={resumeText} onChange={(event) => setResumeText(event.target.value)} required />
        </label>
        <label>
          <span>Job description</span>
          <textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} required />
        </label>
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Generating" : "Generate tailored resume"}
        </button>
        {status && <p className={`status-line ${status.includes("Unable") ? "error-line" : ""}`}>{status}</p>}
      </form>

      <article className="dashboard-card">
        <h3>Generated package</h3>
        {!result && <p>Paste a resume and job description to generate an application-ready package.</p>}
        {result && (
          <div className="dashboard-grid">
            <section>
              <h4>{result.tailoredResume.headline}</h4>
              <p>{result.tailoredResume.summary}</p>
              <ul>
                {result.tailoredResume.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>
            </section>
            <section>
              <h4>Cover letter</h4>
              <p style={{ whiteSpace: "pre-wrap" }}>{result.coverLetter}</p>
            </section>
            <section>
              <h4>Screening answers</h4>
              {result.answers.map((answer) => (
                <p key={answer.question}><strong>{answer.question}</strong><br />{answer.answer}</p>
              ))}
            </section>
          </div>
        )}
      </article>
    </div>
  );
}
