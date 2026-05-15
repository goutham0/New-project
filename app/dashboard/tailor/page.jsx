import TailorClient from "@/components/TailorClient";

export default function TailorPage() {
  return (
    <>
      <div className="dashboard-header">
        <div className="dashboard-title">
          <p className="eyebrow">Tailored resume generation</p>
          <h1>Resume PDF and ATS score</h1>
          <p>Upload a resume, paste a job description, generate a tailored resume PDF, and check ATS readiness.</p>
        </div>
      </div>
      <TailorClient />
    </>
  );
}
