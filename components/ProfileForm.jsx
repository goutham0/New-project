"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const blankProfile = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  country: "United States",
  workAuthorization: "",
  sponsorshipRequired: "",
  currentCompany: "",
  currentTitle: "",
  yearsExperience: "",
  highestEducation: "",
  university: "",
  degree: "",
  graduationYear: "",
  targetTitles: "",
  preferredLocations: "",
  remotePreference: "",
  expectedSalaryMin: "",
  expectedSalaryMax: "",
  noticePeriod: "",
  linkedinUrl: "",
  githubUrl: "",
  portfolioUrl: ""
};

export default function ProfileForm({ initialProfile, initialResume }) {
  const router = useRouter();
  const [profile, setProfile] = useState({ ...blankProfile, ...initialProfile });
  const [resume, setResume] = useState(initialResume);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  function update(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    try {
    const response = await fetch("/api/candidate/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile })
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setStatus(data.error || "Unable to save profile.");
      return;
    }
    setStatus("Profile saved.");
    router.refresh();
    } catch { setStatus("Unable to save profile. Please try again."); }
    finally { setBusy(false); }
  }

  async function uploadResume(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setStatus("Resume upload failed: maximum size is 4 MB."); return; }
    setStatus("Uploading resume...");
    const formData = new FormData();
    formData.append("resume", file);
    try {
    const response = await fetch("/api/resumes/upload", { method: "POST", body: formData });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Resume upload failed.");
      return;
    }
    setResume(data.resume);
    setStatus("Resume uploaded and parsed.");
    router.refresh();
    } catch { setStatus("Resume upload failed. Please try again."); }
  }

  return (
    <div className="dashboard-grid">
      <article className="dashboard-card">
        <h3>Resume upload</h3>
        <p>{resume ? `Current resume: ${resume.fileName}` : "Upload a PDF or DOCX resume (maximum 4 MB)."}</p>
        <input aria-label="Upload original resume" type="file" accept=".pdf,.docx" onChange={uploadResume} />
        {resume?.originalFilePath && <a className="secondary-button" href={`/api/resumes/${resume.id}?download=1`}>Download original</a>}
      </article>

      <form className="form-grid two dashboard-card" onSubmit={save}>
        <div className="form-wide">
          <p className="panel-kicker">Mandatory application fields</p>
          <h3>Candidate profile</h3>
        </div>
        {field("Legal first name", "firstName", profile, update, true)}
        {field("Legal last name", "lastName", profile, update, true)}
        {field("Email", "email", profile, update, true, "email")}
        {field("Phone", "phone", profile, update, true)}
        {field("Address", "address", profile, update)}
        {field("City", "city", profile, update, true)}
        {field("State", "state", profile, update, true)}
        {field("Zip code", "zipCode", profile, update)}
        {field("Country", "country", profile, update, true)}
        {select("Work authorization", "workAuthorization", profile, update, ["Authorized to work in the US", "US citizen", "Permanent resident", "Not authorized", "Requires confirmation"], true)}
        {select("Sponsorship required", "sponsorshipRequired", profile, update, ["No", "Yes", "Candidate must confirm"], true)}
        {field("Current company", "currentCompany", profile, update)}
        {field("Current title", "currentTitle", profile, update, true)}
        {field("Years of experience", "yearsExperience", profile, update, true, "number")}
        {field("Highest education", "highestEducation", profile, update, true)}
        {field("University", "university", profile, update)}
        {field("Degree", "degree", profile, update)}
        {field("Graduation year", "graduationYear", profile, update, false, "number")}
        {field("Preferred job titles", "targetTitles", profile, update, true)}
        {field("Preferred locations", "preferredLocations", profile, update, true)}
        {select("Remote preference", "remotePreference", profile, update, ["Remote", "Hybrid", "Onsite", "Any"], true)}
        {field("Expected salary min", "expectedSalaryMin", profile, update, true, "number")}
        {field("Expected salary max", "expectedSalaryMax", profile, update, true, "number")}
        {field("Notice period", "noticePeriod", profile, update, true)}
        {field("LinkedIn", "linkedinUrl", profile, update, false, "url")}
        {field("GitHub", "githubUrl", profile, update, false, "url")}
        {field("Portfolio", "portfolioUrl", profile, update, false, "url")}
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Saving" : "Save profile"}
        </button>
        {status && <p className={`status-line ${status.includes("failed") || status.includes("Unable") ? "error-line" : ""}`}>{status}</p>}
      </form>
    </div>
  );
}

function field(label, name, profile, update, required = false, type = "text") {
  return (
    <label key={name}>
      <span>{label}</span>
      <input
        type={type}
        value={profile[name] || ""}
        required={required}
        onChange={(event) => update(name, event.target.value)}
      />
    </label>
  );
}

function select(label, name, profile, update, options, required = false) {
  return (
    <label key={name}>
      <span>{label}</span>
      <select value={profile[name] || ""} required={required} onChange={(event) => update(name, event.target.value)}>
        <option value="">Select</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}
