import JobsBrowser from "@/components/JobsBrowser";

export default function DirectBulkApplyPage() {
  return (
    <>
      <div className="dashboard-header">
        <div className="dashboard-title">
          <p className="eyebrow">Bulk preparation</p>
          <h1>Review and apply selected jobs</h1>
          <p>Select jobs and prepare a separate application package for each. Review your documents, open each employer form, and submit with the extension's autofill assistance.</p>
        </div>
      </div>
      <JobsBrowser mode="direct" />
    </>
  );
}
