import { currentUser } from "@/lib/auth";
import { getLatestResume } from "@/lib/store";
import TailorClient from "@/components/TailorClient";

export default async function TailorPage() {
  const user = await currentUser();
  const savedResume = await getLatestResume(user.id);

  return (
    <>
      <div className="dashboard-header">
        <div className="dashboard-title">
          <p className="eyebrow">Tailored resume generation</p>
          <h1>Resume PDF and ATS score</h1>
          <p>Use your saved profile resume or upload a new resume, paste a job description, generate a tailored PDF, and check ATS readiness.</p>
        </div>
      </div>
      <TailorClient savedResumeName={savedResume?.fileName || ""} />
    </>
  );
}
