import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import { currentUser } from "@/lib/auth";

const plans = [
  {
    name: "Free",
    price: "$0",
    copy: "Create profile, upload resume, search jobs, save jobs, and apply manually.",
    features: ["Profile builder", "Resume upload", "Manual apply links", "Basic tracker"]
  },
  {
    name: "Pro",
    price: "$29",
    copy: "Generate tailored documents and prepare direct or assisted applications.",
    features: ["AI resume tailoring", "Cover letters", "Screening answers", "Direct apply quota", "Assisted apply extension"]
  },
  {
    name: "Premium",
    price: "$79",
    copy: "Higher quotas, advanced tracker, and priority support for active job searches.",
    features: ["Higher bulk apply quota", "Advanced application tracker", "Priority support", "Usage analytics"]
  }
];

export default async function HomePage() {
  const user = await currentUser();

  return (
    <main className="site-shell">
      <PublicNav isAuthenticated={Boolean(user)} />

      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">AI job application assistant</p>
          <h1>Apply faster with AI-assisted job applications</h1>
          <p>
            Build one reusable profile, upload a resume, choose a plan, generate tailored resumes and cover letters,
            and apply through supported employer integrations.
          </p>
          <div className="button-row">
            {user ? (
              <Link className="primary-button" href="/dashboard">Go to dashboard</Link>
            ) : (
              <>
                <Link className="primary-button" href="/signup">Create candidate account</Link>
                <Link className="secondary-button" href="/login">Login</Link>
              </>
            )}
          </div>
          <p className="trust-line">
            Direct apply is enabled only for official API-supported jobs. Unsupported jobs use assisted apply and
            candidate-reviewed browser autofill.
          </p>
        </div>
        <div className="hero-preview" aria-label="Apply Friend workflow preview">
          <div className="preview-bar">
            <span>Profile 92%</span>
            <span>Ready for review</span>
          </div>
          <div className="preview-columns">
            <article>
              <p className="panel-kicker">Jobs</p>
              <h3>Backend Engineer</h3>
              <span className="tag direct">Direct API</span>
            </article>
            <article>
              <p className="panel-kicker">Application</p>
              <h3>Tailored package</h3>
              <span className="tag assisted">Candidate review</span>
            </article>
          </div>
          <div className="preview-steps">
            <span>Resume tailored</span>
            <span>Cover letter ready</span>
            <span>Answers drafted</span>
          </div>
        </div>
      </section>

      <section className="section white" id="about">
        <div className="section-heading">
          <p className="eyebrow">About</p>
          <h2>A neat operating system for your job search</h2>
          <p>
            Apply Friend combines profile management, resume tailoring, job discovery, extension-assisted apply, and
            application tracking in one polished candidate workspace.
          </p>
        </div>
        <div className="section-inner grid-3">
          <article className="panel">
            <h3>Candidate profile</h3>
            <p>Mandatory fields, resume upload, work authorization, salary range, locations, and links live in one place.</p>
          </article>
          <article className="panel">
            <h3>AI tailoring</h3>
            <p>Generate truthful, role-specific resume summaries, cover letters, and screening answers.</p>
          </article>
          <article className="panel">
            <h3>Apply workflows</h3>
            <p>Manual apply, assisted apply, and direct bulk apply are separated so the product stays compliant.</p>
          </article>
        </div>
      </section>

      <section className="section" id="how">
        <div className="section-heading">
          <p className="eyebrow">How it works</p>
          <h2>From signup to submitted applications</h2>
        </div>
        <div className="section-inner grid-4">
          {["Signup", "Complete profile", "Choose plan", "Apply and track"].map((step, index) => (
            <article className="panel" key={step}>
              <p className="eyebrow">Step {index + 1}</p>
              <h3>{step}</h3>
              <p>
                {index === 0 && "Create an account and enter the secure candidate portal."}
                {index === 1 && "Upload a resume and fill mandatory job application fields."}
                {index === 2 && "Select Free, Pro, or Premium before using paid apply workflows."}
                {index === 3 && "Prepare, review, approve, submit, and track applications."}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="section white" id="pricing">
        <div className="section-heading">
          <p className="eyebrow">Pricing selection</p>
          <h2>Start free, upgrade for AI preparation</h2>
        </div>
        <div className="section-inner pricing-grid">
          {plans.map((plan) => (
            <article className={`price-card ${plan.name === "Pro" ? "featured" : ""}`} key={plan.name}>
              <div>
                <h3>{plan.name}</h3>
                <p className="price">{plan.price}<span>/mo</span></p>
                <p>{plan.copy}</p>
                <ul className="feature-list">
                  {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
                </ul>
              </div>
              <Link className={plan.name === "Pro" ? "primary-button" : "secondary-button"} href="/signup">
                Select {plan.name}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="apply-modes">
        <div className="section-heading">
          <p className="eyebrow">After login</p>
          <h2>Three apply modes for paid candidates</h2>
        </div>
        <div className="section-inner mode-grid">
          <article className="panel">
            <h3>Manual apply</h3>
            <p>Candidates see jobs and open official employer links to submit manually.</p>
          </article>
          <article className="panel">
            <h3>Assisted apply</h3>
            <p>Unsupported jobs use the Chrome extension to autofill profile and generated answer data.</p>
          </article>
          <article className="panel">
            <h3>Direct bulk apply</h3>
            <p>Supported API jobs can be selected, prepared, approved, and submitted in bulk.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
