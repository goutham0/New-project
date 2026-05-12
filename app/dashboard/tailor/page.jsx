import TailorClient from "@/components/TailorClient";

export default function TailorPage() {
  return (
    <>
      <div className="dashboard-header">
        <div className="dashboard-title">
          <p className="eyebrow">Tailored resume generation</p>
          <h1>Resume and job description tailoring</h1>
          <p>Upload or paste resume content and a job description to generate truthful tailored materials.</p>
        </div>
      </div>
      <TailorClient />
    </>
  );
}
