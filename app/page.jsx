import Link from "next/link";
import {
  BarChart3,
  Bell,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Filter,
  Globe,
  Handshake,
  Layers3,
  LockKeyhole,
  MessageSquare,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Target,
  UserRoundCheck,
  Zap
} from "lucide-react";
import PublicNav from "@/components/PublicNav";
import FeedbackForm from "@/components/FeedbackForm";
import SettingsPanel from "@/components/SettingsPanel";
import { currentUser } from "@/lib/auth";

const problemCards = [
  ["Rewriting resumes takes too much time", FileText],
  ["Applications are repetitive", ClipboardCheck],
  ["Job boards show duplicate jobs", Layers3],
  ["Candidates lose track of applications", BarChart3],
  ["Bulk applying without quality hurts results", Target],
  ["Most tools stop at autofill, but do not manage the full process", Bot]
];

const solutionCards = [
  ["AI resume tailoring from job description", FileText],
  ["ATS keyword matching", SearchCheck],
  ["Assisted apply workflow", UserRoundCheck],
  ["Bulk apply review queue", Zap],
  ["Duplicate job detection", Layers3],
  ["Chrome extension autofill", Globe],
  ["Application tracking dashboard", BarChart3],
  ["Downloadable PDF and DOCX resumes", FileText],
  ["Reusable candidate profile", UserRoundCheck]
];

const faqs = [
  ["What is assisted apply?", "ApplyFriend helps tailor documents, prepare answers, and autofill supported fields while you review and manually submit unsupported applications."],
  ["What is bulk apply?", "Bulk apply means bulk preparation and review for matched jobs. Direct submission is only used where supported integrations allow it."],
  ["Does ApplyFriend guarantee a job?", "No. ApplyFriend improves speed, consistency, organization, and application quality, but it does not guarantee job offers."],
  ["How does AI resume tailoring work?", "The system compares your resume and profile with the job description, then rewrites supported summary, skills, and experience language without inventing facts."],
  ["Is my resume data secure?", "Resume handling is designed around authenticated access, private downloads, audit logs, and environment-protected AI keys."],
  ["Does this work with LinkedIn, Workday, Greenhouse, Lever, and company career pages?", "ApplyFriend supports assisted workflows for many application pages. Direct apply requires official supported integrations."],
  ["What happens if a job board blocks automation?", "ApplyFriend does not bypass platform restrictions. The candidate can still use prepared documents and manual review guidance."],
  ["How do I get started?", "Create an account, complete your profile, and upload your resume. Then search jobs or paste a job description to prepare your first resume."]
];

export default async function HomePage() {
  const user = await currentUser();

  return (
    <main className="site-shell premium-site" id="home">
      <PublicNav isAuthenticated={Boolean(user)} />

      <section className="premium-hero">
        <div className="hero-copy">
          <p className="eyebrow">Your job search, organized</p>
          <h1>ApplyFriend</h1>
          <p className="hero-subtitle">
            Find live jobs, tailor your resume to each opportunity, and prepare applications with AI. Review every detail and submit on the employer website.
          </p>
          <div className="button-row premium-cta-row">
            <Link className="primary-button" href={user ? "/dashboard" : "/signup"}>Start Applying Smarter</Link>
            <a className="secondary-button" href="#demo">Explore the workflow</a>
          </div>
          <div className="hero-pills" aria-label="ApplyFriend platform capabilities">
            {["AI Tailored Resumes", "Assisted Apply", "Bulk Review", "Application Tracker", "Chrome Extension Autofill"].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <DashboardPreview />
      </section>

      <section className="section premium-section problem-band" id="features">
        <SectionHeading eyebrow="The problem" title="Job searching is broken" copy="Candidates need consistency, quality, and momentum, but most job-search tools only solve one small part of the workflow." />
        <div className="premium-grid six">
          {problemCards.map(([title, Icon]) => <FeatureCard key={title} title={title} icon={Icon} />)}
        </div>
      </section>

      <section className="section premium-section solution-band">
        <SectionHeading eyebrow="The solution" title="A focused workspace for your applications" copy="Bring your resume, job search, application preparation, and submission records together." />
        <div className="premium-grid three">
          {solutionCards.map(([title, Icon]) => <FeatureCard key={title} title={title} icon={Icon} />)}
        </div>
      </section>

      <section className="section premium-section" id="how">
        <SectionHeading eyebrow="How it works" title="Four steps from resume to interview tracking" />
        <div className="workflow-grid">
          {[
            ["Upload Resume", "User uploads one master resume.", FileText],
            ["Choose Target Roles", "User selects job titles, locations, salary, visa preference, work mode, and industries.", Target],
            ["AI Tailors + Applies", "ApplyFriend tailors resumes, prepares answers, and supports assisted or bulk apply.", Sparkles],
            ["Track Applications", "Record the jobs you submitted and return to your application history.", Bell]
          ].map(([title, copy, Icon], index) => (
            <article className="workflow-step" key={title}>
              <span className="step-number">0{index + 1}</span>
              <Icon size={22} />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section premium-section demo-section" id="demo">
        <SectionHeading eyebrow="Your workflow" title="From your resume to your next application" copy="Create your profile, find a role, review your documents, and submit with confidence." />
        <div className="demo-grid">
          {[
            ["1", "Create profile", "Add mandatory application fields and job preferences so generated answers stay grounded in candidate-approved data."],
            ["2", "Upload resume", "Upload a PDF or DOCX resume and keep the original available for download."],
            ["3", "Search jobs", "Search live Adzuna listings by role and location. Prepare documents or open the original application page."],
            ["4", "Prepare packages", "Generate tailored resume content, cover letter, screening answers, match score, and a review-ready PDF."],
            ["5", "Review and submit", "Review your prepared documents, open the employer form, use the extension to fill known fields, and submit yourself."],
            ["6", "Track outcomes", "Applications stay in a simple tracker showing company, job title, status, and submitted time."]
          ].map(([number, title, copy]) => (
            <article className="demo-step-card" key={title}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
        <div className="demo-action-row">
          <Link className="primary-button" href={user ? "/dashboard" : "/signup"}>Open your workspace</Link>
          <a className="secondary-button" href="#how">See How It Works</a>
        </div>
      </section>

      <section className="section premium-section about-section" id="about">
        <SectionHeading
          eyebrow="About"
          title="Built for serious job seekers"
          copy="ApplyFriend was created to make job searching faster, smarter, and less stressful. Instead of only offering resume generation or basic autofill, ApplyFriend combines AI automation, assisted apply workflows, bulk application support, and organized review controls into one complete platform."
        />
        <div className="mission-row">
          {["Save time", "Improve application quality", "Reduce job search stress", "Support international candidates and professionals", "Make job applications more consistent and organized"].map((item) => (
            <span key={item}><CheckCircle2 size={16} />{item}</span>
          ))}
        </div>
      </section>

      <section className="section premium-section trust-section">
        <div className="trust-grid">
          {[
            ["Secure resume storage", ShieldCheck],
            ["Candidate-reviewed workflow", UserRoundCheck],
            ["No job guarantee disclaimer", LockKeyhole],
            ["Candidate-controlled applications", ClipboardCheck],
            ["User controls application preferences", Filter],
            ["Privacy-first application handling", ShieldCheck]
          ].map(([title, Icon]) => (
            <article key={title}>
              <Icon size={20} />
              <span>{title}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="section premium-section settings-section" id="settings">
        <SectionHeading eyebrow="Settings" title="Professional controls for your job search" copy="Candidates can tune profile, resume, job, application, notification, and security preferences." />
        <SettingsPanel />
      </section>

      <section className="section premium-section feedback-section" id="feedback">
        <SectionHeading eyebrow="Feedback" title="Help shape ApplyFriend" copy="Send bug reports, feature ideas, demo flow notes, recruiter support needs, or extension issues." />
        <FeedbackForm />
      </section>

      <section className="section premium-section faq-section" id="faq">
        <SectionHeading eyebrow="FAQ" title="Your questions, answered" />
        <div className="faq-grid">
          {faqs.map(([question, answer]) => (
            <article className="faq-card" key={question}>
              <h3>{question}</h3>
              <p>{answer}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="premium-footer">
        <div className="footer-brand">
          <span className="brand-mark">AF</span>
          <strong>ApplyFriend</strong>
          <p>AI automation + assisted apply + bulk review + application tracking.</p>
        </div>
        <FooterColumn title="Product" links={["Features", "Product Demo", "Chrome Extension", "Dashboard"]} />
        <FooterColumn title="Company" links={["About", "Feedback", "Contact"]} />
        <FooterColumn title="Resources" links={["FAQ", "Resume workspace", "Application tracker"]} />
      </footer>
    </main>
  );
}

function DashboardPreview() {
  return (
    <div className="hero-dashboard-card" aria-label="ApplyFriend dashboard preview">
      <div className="preview-topline">
        <span>Illustrative preview</span>
        <strong>Application command center</strong>
      </div>
      <div className="dashboard-metrics">
        <Metric label="Applications submitted today" value="24" />
        <Metric label="Resume match score" value="92%" tone="green" />
        <Metric label="Jobs pending review" value="8" />
        <Metric label="Interviews scheduled" value="3" tone="gold" />
      </div>
      <div className="preview-split">
        <article>
          <span>Daily apply progress</span>
          <strong>24 / 40</strong>
          <div className="progress-track"><span style={{ width: "60%" }} /></div>
        </article>
        <article>
          <span>Interview plan preview</span>
          <strong>System design + recruiter screen</strong>
          <p>Structured prep queue</p>
        </article>
      </div>
      <div className="recent-table">
        {[
          ["Backend Engineer", "Applied"],
          ["Platform Developer", "Follow-up"],
          ["Full Stack Engineer", "Interview"],
          ["Data Analyst", "Drafted"],
          ["Product Engineer", "Rejected"]
        ].map(([role, status]) => (
          <div key={role}>
            <span>{role}</span>
            <strong className={`status-chip ${status.toLowerCase()}`}>{status}</strong>
          </div>
        ))}
      </div>
      <div className="recruiter-note">
        <MessageSquare size={18} />
        <span>Recruiter notes: prioritize Java + Angular roles with sponsorship-friendly employers.</span>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = "" }) {
  return (
    <article className={`preview-metric ${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function SectionHeading({ eyebrow, title, copy = "" }) {
  return (
    <div className="section-heading premium-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </div>
  );
}

function FeatureCard({ title, icon: Icon }) {
  return (
    <article className="premium-feature-card">
      <span><Icon size={20} /></span>
      <h3>{title}</h3>
    </article>
  );
}

function FooterColumn({ title, links }) {
  const destinations = { Features: "#features", "Product Demo": "#demo", "Chrome Extension": "/dashboard/assisted-apply", Dashboard: "/dashboard", About: "#about", Feedback: "#feedback", Contact: "#feedback", FAQ: "#faq", "Resume workspace": "/dashboard/tailor", "Application tracker": "/dashboard/applications" };
  return (
    <div className="footer-column">
      <h3>{title}</h3>
      {links.map((link) => <a href={destinations[link]} key={link}>{link === "Product Demo" ? "Workflow" : link}</a>)}
    </div>
  );
}
