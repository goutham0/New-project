import JobsBrowser from "@/components/JobsBrowser";

export default function DirectBulkApplyPage() {
  return (
    <>
      <div className="dashboard-header">
        <div className="dashboard-title">
          <p className="eyebrow">Direct bulk apply</p>
          <h1>API-supported jobs</h1>
          <p>Select supported jobs, click Apply selected, review each tailored resume PDF and application detail, then submit after consent. Adzuna redirect jobs stay in Manual and Assisted Apply.</p>
        </div>
      </div>
      <JobsBrowser mode="direct" />
    </>
  );
}
