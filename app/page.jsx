import Link from "next/link";
import {
  BarChart3,
  Bell,
  Bot,
  BriefcaseBusiness,
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

const pricingPlans = [
  {
    id: "pro",
    name: "ApplyFriend Pro",
    price: "$49.99",
    tagline: "AI Tailored Resume + Assisted Apply",
    cta: "Start Pro",
    icon: FileText,
    features: [
      "AI-tailored resume generation based on job description",
      "ATS keyword matching and resume optimization",
      "AI cover letter generation",
      "Assisted apply support",
      "Chrome extension autofill",
      "Job tracking dashboard",
      "Basic AI job recommendations",
      "Standard support"
    ]
  },
  {
    id: "elite",
    name: "ApplyFriend Elite",
    price: "$99.99",
    badge: "Most Popular",
    tagline: "Assisted Apply + Bulk Apply up to 40 jobs daily",
    cta: "Start Elite",
    icon: Zap,
    featured: true,
    features: [
      "Everything in Pro",
      "Bulk apply up to 40 jobs per day",
      "Unlimited AI-tailored resumes",
      "Smart duplicate-job detection",
      "Priority assisted apply queue",
      "Advanced job matching filters",
      "Application analytics dashboard",
      "Priority support"
    ]
  },
  {
    id: "concierge",
    name: "ApplyFriend Concierge",
    price: "$199.99",
    badge: "Best Results",
    tagline: "AI + Dedicated Recruiter Fully Managed Job Search",
    cta: "Start Concierge",
    icon: Handshake,
    premium: true,
    features: [
      "Everything in Elite",
      "Dedicated recruiter/job assistant",
      "Recruiter fully manages applications",
      "Human-reviewed resume optimization",
      "Personalized job targeting strategy",
      "Recruiter-monitored application quality",
      "Fixed interview preparation plan per month",
      "Mock interview support",
      "Follow-up message/email guidance",
      "VIP support"
    ]
  }
];

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
  ["Bulk apply up to 40 jobs daily", Zap],
  ["Duplicate job detection", Layers3],
  ["Chrome extension autofill", Globe],
  ["Application tracking dashboard", BarChart3],
  ["Recruiter-managed Concierge plan", Handshake],
  ["Fixed interview preparation plan per month", MessageSquare]
];

const faqs = [
  ["What is assisted apply?", "ApplyFriend helps tailor documents, prepare answers, and autofill supported fields while you review and manually submit unsupported applications."],
  ["What is bulk apply?", "Bulk apply means bulk preparation and review for matched jobs. Direct submission is only used where supported integrations allow it."],
  ["Does ApplyFriend guarantee a job?", "No. ApplyFriend improves speed, consistency, organization, and application quality, but it does not guarantee job offers."],
  ["How does AI resume tailoring work?", "The system compares your resume and profile with the job description, then rewrites supported summary, skills, and experience language without inventing facts."],
  ["Can I cancel anytime?", "Yes. Subscription cancellation will be available from billing settings once payment processing is fully connected."],
  ["What does Concierge include?", "A recruiter/job assistant helps manage your job search, review application quality, and support interview preparation."],
  ["Is my resume data secure?", "Resume handling is designed around authenticated access, private downloads, audit logs, and environment-protected AI keys."],
  ["Does this work with LinkedIn, Workday, Greenhouse, Lever, and company career pages?", "ApplyFriend supports assisted workflows for many application pages. Direct apply requires official supported integrations."],
  ["What happens if a job board blocks automation?", "ApplyFriend does not bypass platform restrictions. The candidate can still use prepared documents and manual review guidance."]
];

export default async function HomePage() {
  const user = await currentUser();

  return (
    <main className="site-shell premium-site" id="home">
      <PublicNav isAuthenticated={Boolean(user)} />

      <section className="premium-hero">
        <div className="hero-copy">
          <p className="eyebrow">AI automation + human job-search support</p>
          <h1>Your AI + Recruiter Job Application Partner</h1>
          <p className="hero-subtitle">
            Tailor resumes, autofill applications, bulk apply to matched jobs, and let a dedicated recruiter manage your job search when you need full support.
          </p>
          <div className="button-row premium-cta-row">
            <Link className="primary-button" href={user ? "/dashboard" : "/signup"}>Start Applying Smarter</Link>
            <a className="secondary-button" href="#pricing">See Pricing</a>
          </div>
          <div className="hero-pills" aria-label="ApplyFriend platform capabilities">
            {["AI Tailored Resumes", "Assisted Apply", "Bulk Apply", "Recruiter Concierge", "Chrome Extension Autofill"].map((item) => (
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
        <SectionHeading eyebrow="The solution" title="ApplyFriend handles the complete application workflow" copy="AI resume tailoring, assisted apply, bulk preparation, application tracking, and recruiter support work together in one serious platform." />
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
            ["Track Interviews", "User tracks applications, recruiter follow-ups, interviews, and monthly interview preparation.", Bell]
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

      <section className="section premium-section pricing-section" id="pricing">
        <SectionHeading eyebrow="Pricing" title="Choose the support level for your job search" copy="Monthly plans built for candidates who want speed, consistency, quality, and optional recruiter-managed support." />
        <div className="pricing-grid premium-pricing">
          {pricingPlans.map((plan) => <PricingCard key={plan.id} plan={plan} />)}
        </div>
        <p className="pricing-note">
          Applications depend on job board availability, user profile completeness, and platform limitations. ApplyFriend does not guarantee job offers.
        </p>
        <PricingFaq />
      </section>

      <section className="section premium-section" id="testimonials">
        <SectionHeading eyebrow="Testimonials" title="Built for consistent, organized job searches" />
        <div className="premium-grid three">
          {[
            ["ApplyFriend helped me apply consistently without rewriting my resume every day.", "Name Placeholder", "Software Engineer", "Interview secured"],
            ["The bulk apply workflow saved hours every week.", "Name Placeholder", "Data Analyst", "40 jobs/day workflow"],
            ["Concierge made my job search feel organized and less stressful.", "Name Placeholder", "Product Manager", "Recruiter guided"]
          ].map(([quote, name, role, badge]) => (
            <article className="testimonial-card" key={quote}>
              <span className="result-badge">{badge}</span>
              <p className="rating">5/5 rating</p>
              <blockquote>{quote}</blockquote>
              <div>
                <strong>{name}</strong>
                <span>{role}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section premium-section about-section" id="about">
        <SectionHeading
          eyebrow="About"
          title="Built for serious job seekers"
          copy="ApplyFriend was created to make job searching faster, smarter, and less stressful. Instead of only offering resume generation or basic autofill, ApplyFriend combines AI automation, assisted apply workflows, bulk application support, and recruiter guidance into one complete platform."
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
            ["Human-reviewed Concierge workflow", UserRoundCheck],
            ["No job guarantee disclaimer", LockKeyhole],
            ["Transparent subscription billing", BriefcaseBusiness],
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
        <SectionHeading eyebrow="Settings" title="Professional controls for your job search" copy="Candidates can tune profile, resume, job, application, notification, billing, and security preferences." />
        <SettingsPanel />
      </section>

      <section className="section premium-section feedback-section" id="feedback">
        <SectionHeading eyebrow="Feedback" title="Help shape ApplyFriend" copy="Send bug reports, feature ideas, pricing questions, recruiter support needs, or extension issues." />
        <FeedbackForm />
      </section>

      <section className="section premium-section faq-section" id="faq">
        <SectionHeading eyebrow="FAQ" title="Questions candidates ask before subscribing" />
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
          <p>AI automation + assisted apply + bulk apply + dedicated recruiter support.</p>
        </div>
        <FooterColumn title="Product" links={["Features", "Pricing", "Chrome Extension", "Dashboard"]} />
        <FooterColumn title="Company" links={["About", "Testimonials", "Feedback", "Contact"]} />
        <FooterColumn title="Resources" links={["FAQ", "Blog", "Resume Tips", "Interview Prep"]} />
        <FooterColumn title="Legal" links={["Terms", "Privacy Policy", "Refund Policy", "Disclaimer"]} />
      </footer>
    </main>
  );
}

function DashboardPreview() {
  return (
    <div className="hero-dashboard-card" aria-label="ApplyFriend dashboard preview">
      <div className="preview-topline">
        <span>Today</span>
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
          <p>Fixed monthly prep plan</p>
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

function PricingCard({ plan }) {
  const Icon = plan.icon;
  return (
    <article className={`price-card premium-price-card ${plan.featured ? "featured" : ""} ${plan.premium ? "concierge" : ""}`}>
      {plan.badge && <span className="plan-badge">{plan.badge}</span>}
      <div className="plan-head">
        <span className="plan-icon"><Icon size={22} /></span>
        <h3>{plan.name}</h3>
        <p>{plan.tagline}</p>
      </div>
      <p className="price">{plan.price}<span> per month</span></p>
      <ul className="feature-list">
        {plan.features.map((feature) => <li key={feature}><CheckCircle2 size={16} />{feature}</li>)}
      </ul>
      <Link className={plan.featured || plan.premium ? "primary-button" : "secondary-button"} href={`/api/checkout?plan=${plan.id}`}>
        {plan.cta}
      </Link>
    </article>
  );
}

function PricingFaq() {
  const items = [
    ["Can I cancel anytime?", "Yes."],
    ["Does ApplyFriend guarantee a job?", "No, but it helps improve speed, consistency, and application quality."],
    ["What does assisted apply mean?", "ApplyFriend helps autofill, tailor, and guide applications."],
    ["What does Concierge include?", "A recruiter/job assistant helps manage your job search and interview preparation."]
  ];
  return (
    <div className="pricing-faq">
      {items.map(([question, answer]) => (
        <article key={question}>
          <h3>{question}</h3>
          <p>{answer}</p>
        </article>
      ))}
    </div>
  );
}

function FooterColumn({ title, links }) {
  return (
    <div className="footer-column">
      <h3>{title}</h3>
      {links.map((link) => <a href={link === "Pricing" ? "#pricing" : "#home"} key={link}>{link}</a>)}
    </div>
  );
}
