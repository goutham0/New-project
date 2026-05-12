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

export default function ProfileForm({ initialProfile, initialUser, initialResume }) {
  const router = useRouter();
  const [profile, setProfile] = useState({ ...blankProfile, ...initialProfile });
  const [plan, setPlan] = useState(initialUser.plan || "Free");
  const [resume, setResume] = useState(initialResume);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  function update(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/candidate/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, plan })
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setStatus(data.error || "Unable to save profile.");
      return;
    }
    setStatus("Profile saved.");
    router.refresh();
  }

  async function uploadResume(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus("Uploading resume...");
    const formData = new FormData();
    formData.append("resume", file);
    const response = await fetch("/api/resumes/upload", { method: "POST", body: formData });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Resume upload failed.");
      return;
    }
    setResume(data.resume);
    setStatus("Resume uploaded and parsed.");
    router.refresh();
  }

  return (
    <div className="dashboard-grid">
      <article className="dashboard-card">
        <h3>Plan selection</h3>
        <p>Select a paid plan to unlock assisted apply, direct bulk apply, and tailoring workflows.</p>
        <div className="button-row">
          {["Free", "Pro", "Premium"].map((item) => (
            <button
              className={plan === item ? "primary-button" : "secondary-button"}
              type="button"
              key={item}
              onClick={() => setPlan(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </article>

      <article className="dashboard-card">
        <h3>Resume upload</h3>
        <p>{resume ? `Current resume: ${resume.fileName}` : "Upload a PDF, DOCX, or TXT resume."}</p>
        <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={uploadResume} />
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
        {select("Work authorization", "workAuthorization", profile, update, ["Authorized to work in the US", "US citizen", "Permanent resident", "Requires confirmation"], true)}
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
