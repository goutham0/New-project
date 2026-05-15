import JobsBrowser from "@/components/JobsBrowser";

export default function ManualApplyPage() {
  return (
    <>
      <div className="dashboard-header">
        <div className="dashboard-title">
          <p className="eyebrow">Manual apply</p>
          <h1>Manual job list</h1>
          <p>Search live Adzuna jobs and sample employer links, then open the official apply page and submit manually.</p>
        </div>
      </div>
      <JobsBrowser mode="manual" />
    </>
  );
}
