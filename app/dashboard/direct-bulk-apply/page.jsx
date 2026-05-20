import JobsBrowser from "@/components/JobsBrowser";

export default function DirectBulkApplyPage() {
  return (
    <>
      <div className="dashboard-header">
        <div className="dashboard-title">
          <p className="eyebrow">Bulk apply</p>
          <h1>Review and apply selected jobs</h1>
          <p>Select live API jobs, review the prepared package, then submit direct-supported jobs with consent. Adzuna jobs open as assisted apply because they are redirect listings, not ATS submission APIs.</p>
        </div>
      </div>
      <JobsBrowser mode="direct" />
    </>
  );
}
