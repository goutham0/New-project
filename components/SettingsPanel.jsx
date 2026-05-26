"use client";

import { useEffect, useState } from "react";

const tabs = [
  "Profile",
  "Resume Preferences",
  "Job Preferences",
  "Application Preferences",
  "Notifications",
  "Billing",
  "Security"
];

const defaults = {
  name: "",
  email: "",
  phone: "",
  location: "",
  workAuthorization: "",
  targetTitles: "",
  resumeTone: "Professional",
  autoTailor: true,
  locations: "",
  workMode: "Hybrid",
  salaryRange: "",
  industries: "",
  sponsorshipRequired: false,
  dailyLimit: "40",
  assistedApply: true,
  bulkApply: true,
  excludeDuplicateJobs: true,
  excludeStaffingAgencies: false,
  excludeAlreadyAppliedJobs: true,
  emailAlerts: true,
  interviewReminders: true,
  dailySummary: true,
  recruiterUpdates: true,
  currentPlan: "ApplyFriend Pro"
};

export default function SettingsPanel() {
  const [active, setActive] = useState(tabs[0]);
  const [settings, setSettings] = useState(defaults);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("applyfriend-settings");
    if (saved) setSettings((current) => ({ ...current, ...JSON.parse(saved) }));
  }, []);

  function update(field, value) {
    setSettings((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    localStorage.setItem("applyfriend-settings", JSON.stringify(settings));
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings })
    }).catch(() => null);
    if (!response || response.status === 401) {
      setStatus("Settings saved locally. Login to sync them to your account.");
      return;
    }
    setStatus(response.ok ? "Settings saved." : "Settings saved locally.");
  }

  return (
    <div className="settings-panel">
      <div className="settings-tabs" role="tablist" aria-label="Settings tabs">
        {tabs.map((tab) => (
          <button className={active === tab ? "active" : ""} type="button" key={tab} onClick={() => setActive(tab)}>
            {tab}
          </button>
        ))}
      </div>
      <div className="settings-card">
        {active === "Profile" && (
          <SettingGrid>
            <Field label="Name" value={settings.name} onChange={(value) => update("name", value)} />
            <Field label="Email" type="email" value={settings.email} onChange={(value) => update("email", value)} />
            <Field label="Phone" value={settings.phone} onChange={(value) => update("phone", value)} />
            <Field label="Location" value={settings.location} onChange={(value) => update("location", value)} />
            <Field label="Work authorization" value={settings.workAuthorization} onChange={(value) => update("workAuthorization", value)} />
          </SettingGrid>
        )}
        {active === "Resume Preferences" && (
          <SettingGrid>
            <Field label="Default resume upload" type="file" />
            <Field label="Target job titles" value={settings.targetTitles} onChange={(value) => update("targetTitles", value)} />
            <Select label="Resume tone" value={settings.resumeTone} options={["Professional", "Technical", "Executive", "Entry-Level"]} onChange={(value) => update("resumeTone", value)} />
            <Toggle label="Auto-tailor" checked={settings.autoTailor} onChange={(value) => update("autoTailor", value)} />
          </SettingGrid>
        )}
        {active === "Job Preferences" && (
          <SettingGrid>
            <Field label="Locations" value={settings.locations} onChange={(value) => update("locations", value)} />
            <Select label="Remote/hybrid/on-site" value={settings.workMode} options={["Remote", "Hybrid", "On-site", "Any"]} onChange={(value) => update("workMode", value)} />
            <Field label="Salary range" value={settings.salaryRange} onChange={(value) => update("salaryRange", value)} />
            <Field label="Industries" value={settings.industries} onChange={(value) => update("industries", value)} />
            <Toggle label="Visa sponsorship required" checked={settings.sponsorshipRequired} onChange={(value) => update("sponsorshipRequired", value)} />
          </SettingGrid>
        )}
        {active === "Application Preferences" && (
          <SettingGrid>
            <Field label="Daily application limit" type="number" value={settings.dailyLimit} onChange={(value) => update("dailyLimit", value)} />
            <Toggle label="Assisted apply" checked={settings.assistedApply} onChange={(value) => update("assistedApply", value)} />
            <Toggle label="Bulk apply" checked={settings.bulkApply} onChange={(value) => update("bulkApply", value)} />
            <Toggle label="Exclude duplicate jobs" checked={settings.excludeDuplicateJobs} onChange={(value) => update("excludeDuplicateJobs", value)} />
            <Toggle label="Exclude staffing agencies" checked={settings.excludeStaffingAgencies} onChange={(value) => update("excludeStaffingAgencies", value)} />
            <Toggle label="Exclude already applied jobs" checked={settings.excludeAlreadyAppliedJobs} onChange={(value) => update("excludeAlreadyAppliedJobs", value)} />
          </SettingGrid>
        )}
        {active === "Notifications" && (
          <SettingGrid>
            <Toggle label="Email alerts" checked={settings.emailAlerts} onChange={(value) => update("emailAlerts", value)} />
            <Toggle label="Interview reminders" checked={settings.interviewReminders} onChange={(value) => update("interviewReminders", value)} />
            <Toggle label="Daily application summary" checked={settings.dailySummary} onChange={(value) => update("dailySummary", value)} />
            <Toggle label="Recruiter updates" checked={settings.recruiterUpdates} onChange={(value) => update("recruiterUpdates", value)} />
          </SettingGrid>
        )}
        {active === "Billing" && (
          <SettingGrid>
            <Select label="Current plan" value={settings.currentPlan} options={["ApplyFriend Pro", "ApplyFriend Elite", "ApplyFriend Concierge"]} onChange={(value) => update("currentPlan", value)} />
            <button className="secondary-button" type="button">Upgrade/downgrade placeholder</button>
            <button className="secondary-button" type="button">Cancel subscription placeholder</button>
          </SettingGrid>
        )}
        {active === "Security" && (
          <SettingGrid>
            <button className="secondary-button" type="button">Change password placeholder</button>
            <button className="secondary-button" type="button">Two-factor authentication placeholder</button>
            <button className="secondary-button" type="button">Data privacy controls</button>
          </SettingGrid>
        )}
        <div className="settings-actions">
          <button className="primary-button" type="button" onClick={save}>Save settings</button>
          {status && <p className="status-line">{status}</p>}
        </div>
      </div>
    </div>
  );
}

function SettingGrid({ children }) {
  return <div className="settings-grid">{children}</div>;
}

function Field({ label, value = "", onChange = () => {}, type = "text" }) {
  return (
    <label>
      <span>{label}</span>
      <input type={type} value={type === "file" ? undefined : value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="toggle-row">
      <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
