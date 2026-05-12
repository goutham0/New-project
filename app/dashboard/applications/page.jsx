import ApplicationsClient from "@/components/ApplicationsClient";

export default function ApplicationsPage() {
  return (
    <>
      <div className="dashboard-header">
        <div className="dashboard-title">
          <p className="eyebrow">Applications</p>
          <h1>Application tracker</h1>
          <p>Review packages, approve submissions, open assisted apply, and track submitted applications.</p>
        </div>
      </div>
      <ApplicationsClient />
    </>
  );
}
