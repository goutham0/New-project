import { currentUser } from "@/lib/auth";
import { getLatestResume, listTailoredResumeHistory } from "@/lib/store";
import TailorClient from "@/components/TailorClient";

export default async function TailorPage() {
  const user = await currentUser();
  const savedResume = await getLatestResume(user.id);
  const history = await listTailoredResumeHistory(user.id);

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
      <section className="dashboard-card" style={{ marginTop: 24 }}>
        <h2>Saved resumes</h2>
        {!history.length && <p>Your generated resumes will appear here.</p>}
        {history.map((item) => <article className="application-row" key={item.id}>
          <div><h3>{item.title || "Tailored resume"}</h3><p>{new Date(item.createdAt).toISOString().slice(0, 10)}</p></div>
          <div className="button-row compact">
            <a className="secondary-button" href={`/api/tailored-resumes/${item.id}/download`}>Download DOCX</a>
            {item.hasPdf && <a className="secondary-button" href={`/api/tailored-resumes/${item.id}/download?format=pdf`}>Download PDF</a>}
          </div>
        </article>)}
      </section>
    </>
  );
}
