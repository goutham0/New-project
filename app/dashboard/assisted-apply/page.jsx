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
        <h3>Chrome extension download</h3>
        <p>Download the Apply Friend extension and add it to Chrome once. After that, click Prepare and open on any assisted job and the redirected employer form can be autofilled automatically.</p>
        <ExtensionSetup />
      </div>
      <JobsBrowser mode="assisted" />
    </>
  );
}
