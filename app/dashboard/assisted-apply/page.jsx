import JobsBrowser from "@/components/JobsBrowser";

export default function AssistedApplyPage() {
  return (
    <>
      <div className="dashboard-header">
        <div className="dashboard-title">
          <p className="eyebrow">Assisted apply</p>
          <h1>Unsupported jobs with extension autofill</h1>
          <p>Prepare application packages, then use the Chrome extension to autofill employer forms while you review and submit manually.</p>
        </div>
      </div>
      <div className="extension-panel" style={{ marginBottom: 16 }}>
        <h3>Chrome extension included in this codebase</h3>
        <p>Load the `extension` folder as an unpacked Chrome extension during development. It detects form labels and maps fields to profile/application data.</p>
      </div>
      <JobsBrowser mode="assisted" />
    </>
  );
}
