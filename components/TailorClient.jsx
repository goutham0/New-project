"use client";

import { useState } from "react";

export default function TailorClient() {
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [atsResult, setAtsResult] = useState(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfName, setPdfName] = useState("tailored-resume.pdf");
  const [status, setStatus] = useState("");
  const [atsStatus, setAtsStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [atsBusy, setAtsBusy] = useState(false);

  async function generateTailoredResume(event) {
    event.preventDefault();
    setBusy(true);
    setStatus("Generating tailored resume PDF...");
    setResult(null);
    revokePdf();

    const formData = new FormData();
    if (resumeFile) formData.append("resume", resumeFile);
    formData.append("resumeText", resumeText);
    formData.append("jobDescription", jobDescription);

    let data;
    let response;
    try {
      response = await fetch("/api/ai/tailor", { method: "POST", body: formData });
      data = await response.json();
    } catch (error) {
      setBusy(false);
      setStatus(`Unable to generate tailored resume. ${error.message}`);
      return;
    }
    setBusy(false);
    if (!response.ok) {
      setStatus([data.error || "Unable to generate tailored resume.", data.detail, data.fix].filter(Boolean).join(" "));
      return;
    }

    setResult(data.result);
    setPdfName(data.fileName || "tailored-resume.pdf");
    setPdfUrl(base64PdfToUrl(data.pdfBase64));
    setStatus("High-standard GPT resume PDF generated in Apply Friend format.");
  }

  async function scoreAts(event) {
    event.preventDefault();
    setAtsBusy(true);
    setAtsStatus("Scoring resume for ATS...");
    setAtsResult(null);

    const formData = new FormData();
    if (resumeFile) formData.append("resume", resumeFile);
    formData.append("resumeText", resumeText);
    formData.append("jobDescription", jobDescription);

    let response;
    let data;
    try {
      response = await fetch("/api/ai/ats-score", { method: "POST", body: formData });
      data = await response.json();
    } catch (error) {
      setAtsBusy(false);
      setAtsStatus(`Unable to score resume. ${error.message}`);
      return;
    }
    setAtsBusy(false);
    if (!response.ok) {
      setAtsStatus([data.error || "Unable to score resume.", data.detail, data.fix].filter(Boolean).join(" "));
      return;
    }

    setAtsResult(data.result);
    setAtsStatus("GPT ATS score generated.");
  }

  function revokePdf() {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl("");
  }

  return (
    <div className="dashboard-grid">
      <form className="form-grid dashboard-card" onSubmit={generateTailoredResume}>
        <div>
          <h3>Generate tailored resume PDF</h3>
          <p>Upload a resume, paste the JD, and download a clean ATS-friendly PDF.</p>
        </div>
        <label>
          <span>Resume upload</span>
          <input
            type="file"
            accept=".txt,.pdf,.docx,text/plain,application/pdf"
            onChange={(event) => setResumeFile(event.target.files?.[0] || null)}
          />
        </label>
        <label>
          <span>Resume text fallback</span>
          <textarea
            value={resumeText}
            onChange={(event) => setResumeText(event.target.value)}
            placeholder="Paste resume text if the uploaded file is not readable."
          />
        </label>
        <label>
          <span>Job description</span>
          <textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            placeholder="Paste the full job description here."
            required
          />
        </label>
        <div className="button-row compact">
          <button className="primary-button" type="submit" disabled={busy || (!resumeFile && !resumeText.trim())}>
            {busy ? "Generating..." : "Generate PDF"}
          </button>
          <button className="secondary-button" type="button" disabled={atsBusy || (!resumeFile && !resumeText.trim())} onClick={scoreAts}>
            {atsBusy ? "Scoring..." : "Get ATS score"}
          </button>
        </div>
        {status && <p className={`status-line ${status.includes("Unable") || status.includes("not active") || status.includes("failed") ? "error-line" : ""}`}>{status}</p>}
        {atsStatus && <p className={`status-line ${atsStatus.includes("Unable") || atsStatus.includes("not active") || atsStatus.includes("failed") ? "error-line" : ""}`}>{atsStatus}</p>}
      </form>

      <div className="dashboard-grid two">
        <article className="dashboard-card">
          <h3>Tailored resume output</h3>
          {!result && <p>Generate a resume PDF to preview the rewritten sections and download the file.</p>}
          {result && (
            <div className="dashboard-grid">
              <section>
                <p className="eyebrow">GPT generated</p>
                <h4>{result.candidateName}</h4>
                <p><strong>{result.targetRole}</strong></p>
                <p>{result.professionalSummary}</p>
              </section>
              <section>
                <h4>Core skills</h4>
                <div className="tag-row">
                  {(result.coreSkills || []).map((skill) => <span className="tag" key={skill}>{skill}</span>)}
                </div>
              </section>
              <section>
                <h4>Experience bullets</h4>
                <ul>
                  {(result.experienceBullets || []).slice(0, 6).map((bullet) => <li key={bullet}>{bullet}</li>)}
                </ul>
              </section>
              {pdfUrl && (
                <a className="primary-button" href={pdfUrl} download={pdfName}>
                  Download tailored PDF
                </a>
              )}
              {result.warning && <p className="status-line error-line">{result.warning}</p>}
            </div>
          )}
        </article>

        <article className="dashboard-card">
          <h3>ATS score</h3>
          {!atsResult && <p>Upload or paste a resume to get an ATS compatibility score. Paste a JD for keyword-match scoring.</p>}
          {atsResult && (
            <div className="dashboard-grid">
              <div className="score-ring">
                <strong>{atsResult.overallScore}</strong>
                <span>Overall ATS score</span>
              </div>
              <div className="metric-grid">
                <Metric label="ATS parsing" value={atsResult.atsCompatibilityScore} />
                <Metric label="Keywords" value={atsResult.keywordScore} />
                <Metric label="Formatting" value={atsResult.formattingScore} />
                <Metric label="Impact" value={atsResult.impactScore} />
              </div>
              <p>{atsResult.summary}</p>
              <KeywordBlock title="Matched keywords" items={atsResult.matchedKeywords} tone="direct" />
              <KeywordBlock title="Missing keywords" items={atsResult.missingKeywords} tone="assisted" />
              <ListBlock title="Recommendations" items={atsResult.recommendations} />
              {atsResult.warning && <p className="status-line error-line">{atsResult.warning}</p>}
            </div>
          )}
        </article>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function KeywordBlock({ title, items = [], tone }) {
  return (
    <section>
      <h4>{title}</h4>
      <div className="tag-row">
        {items.length ? items.map((item) => <span className={`tag ${tone || ""}`} key={item}>{item}</span>) : <span className="tag">None listed</span>}
      </div>
    </section>
  );
}

function ListBlock({ title, items = [] }) {
  return (
    <section>
      <h4>{title}</h4>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}

function base64PdfToUrl(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
}
