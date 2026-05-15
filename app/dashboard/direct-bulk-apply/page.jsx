import JobsBrowser from "@/components/JobsBrowser";

export default function DirectBulkApplyPage() {
  return (
    <>
      <div className="dashboard-header">
        <div className="dashboard-title">
          <p className="eyebrow">Direct bulk apply</p>
          <h1>API-supported jobs</h1>
          <p>Select supported jobs, generate application packages, approve them, and submit through ATS connectors. Adzuna redirect jobs stay in Manual and Assisted Apply.</p>
        </div>
      </div>
      <JobsBrowser mode="direct" />
    </>
  );
}
