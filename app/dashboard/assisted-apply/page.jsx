import JobsBrowser from "@/components/JobsBrowser";
import ExtensionSetup from "@/components/ExtensionSetup";

export default function AssistedApplyPage() {
  return (
    <>
      <div className="dashboard-header">
        <div className="dashboard-title">
          <p className="eyebrow">Assisted apply</p>
          <h1>Unsupported jobs with extension autofill</h1>
          <p>Search live Adzuna jobs, prepare application packages, then use the Chrome extension to autofill employer forms while you review and submit manually.</p>
        </div>
      </div>
      <div className="extension-panel" style={{ marginBottom: 16 }}>
        <h3>Chrome extension connection</h3>
        <p>Load the extension folder in Chrome, paste the extension token once, then use Prepare and open on any assisted job. The extension autofills the employer form from the latest prepared package.</p>
        <ExtensionSetup />
      </div>
      <JobsBrowser mode="assisted" />
    </>
  );
}
