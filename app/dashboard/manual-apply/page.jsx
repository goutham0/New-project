import JobsBrowser from "@/components/JobsBrowser";

export default function ManualApplyPage() {
  return (
    <>
      <div className="dashboard-header">
        <div className="dashboard-title">
          <p className="eyebrow">Manual apply</p>
          <h1>Manual job list</h1>
          <p>Open official employer links and submit manually. This is available to free and paid candidates.</p>
        </div>
      </div>
      <JobsBrowser mode="manual" />
    </>
  );
}
