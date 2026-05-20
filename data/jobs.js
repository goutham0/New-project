export const jobs = [
  {
    id: "job-001",
    title: "Backend Engineer, Platform APIs",
    company: "Northstar Health",
    location: "Austin, TX",
    remoteType: "Hybrid",
    employmentType: "Full time",
    experienceLevel: "Mid senior",
    salaryMin: 135000,
    salaryMax: 165000,
    source: "Greenhouse",
    atsType: "greenhouse",
    applyType: "direct",
    directApplySupported: true,
    applyUrl: "/demo-apply?title=Backend%20Engineer%2C%20Platform%20APIs&company=Northstar%20Health",
    skills: ["Java", "Spring Boot", "PostgreSQL", "Queues", "Audit logging"],
    description:
      "Build secure partner APIs, queue-backed workflows, audit logs, and data services for a regulated healthcare product.",
    questions: [
      "Are you authorized to work in the United States?",
      "Will you now or in the future require sponsorship?",
      "How many years of Java experience do you have?"
    ]
  },
  {
    id: "job-002",
    title: "Full Stack SaaS Engineer",
    company: "CivicLoop",
    location: "Denver, CO",
    remoteType: "Hybrid",
    employmentType: "Full time",
    experienceLevel: "Mid senior",
    salaryMin: 128000,
    salaryMax: 152000,
    source: "SmartRecruiters",
    atsType: "smartrecruiters",
    applyType: "direct",
    directApplySupported: true,
    applyUrl: "/demo-apply?title=Full%20Stack%20SaaS%20Engineer&company=CivicLoop",
    skills: ["React", "Node", "PostgreSQL", "Security", "Payments"],
    description:
      "Own polished customer dashboards, secure APIs, billing workflows, and product surfaces used by operations teams.",
    questions: [
      "Describe a SaaS dashboard you shipped.",
      "Do you have production React experience?",
      "Are you comfortable with payment workflows?"
    ]
  },
  {
    id: "job-003",
    title: "Product Data Analyst",
    company: "Mercury Works",
    location: "Remote, US",
    remoteType: "Remote",
    employmentType: "Full time",
    experienceLevel: "Mid level",
    salaryMin: 105000,
    salaryMax: 132000,
    source: "Lever",
    atsType: "lever",
    applyType: "direct",
    directApplySupported: true,
    applyUrl: "/demo-apply?title=Product%20Data%20Analyst&company=Mercury%20Works",
    skills: ["SQL", "Dashboards", "Experimentation", "Data quality", "Stakeholder reporting"],
    description:
      "Partner with product leaders to define metrics, run experiments, monitor data quality, and build decision dashboards.",
    questions: [
      "Which BI tools have you used?",
      "Describe a product experiment you analyzed.",
      "What is your SQL experience level?"
    ]
  },
  {
    id: "job-004",
    title: "AI Support Specialist",
    company: "BrightDesk",
    location: "Chicago, IL",
    remoteType: "Onsite",
    employmentType: "Full time",
    experienceLevel: "Associate",
    salaryMin: 72000,
    salaryMax: 92000,
    source: "Employer site",
    atsType: "unsupported",
    applyType: "assisted",
    directApplySupported: false,
    applyUrl: "/demo-apply?title=AI%20Support%20Specialist&company=BrightDesk",
    skills: ["Customer support", "AI tooling", "Documentation", "CRM", "Escalations"],
    description:
      "Support customers using AI workflows, write help documentation, triage issues, and improve support operations.",
    questions: [
      "Describe your customer support experience.",
      "Which CRM systems have you used?",
      "How do you explain technical issues to nontechnical users?"
    ]
  },
  {
    id: "job-005",
    title: "Cloud Integration Engineer",
    company: "Harbor Grid",
    location: "Remote, US",
    remoteType: "Remote",
    employmentType: "Contract",
    experienceLevel: "Senior",
    salaryMin: 176000,
    salaryMax: 218000,
    source: "Workday",
    atsType: "unsupported",
    applyType: "assisted",
    directApplySupported: false,
    applyUrl: "/demo-apply?title=Cloud%20Integration%20Engineer&company=Harbor%20Grid",
    skills: ["AWS", "SQS", "OAuth", "API Gateway", "Enterprise integrations"],
    description:
      "Design and maintain cloud integrations with enterprise customers, OAuth flows, queue-backed processing, and production support.",
    questions: [
      "How many years of AWS experience do you have?",
      "Describe an API integration you supported.",
      "Are you available for contract work?"
    ]
  },
  {
    id: "job-006",
    title: "Technical Customer Success Manager",
    company: "AtlasOps",
    location: "Remote, US",
    remoteType: "Remote",
    employmentType: "Full time",
    experienceLevel: "Mid level",
    salaryMin: 95000,
    salaryMax: 122000,
    source: "Employer site",
    atsType: "unsupported",
    applyType: "manual",
    directApplySupported: false,
    applyUrl: "/demo-apply?title=Technical%20Customer%20Success%20Manager&company=AtlasOps",
    skills: ["Customer success", "APIs", "Onboarding", "Renewals", "Account health"],
    description:
      "Lead technical onboarding, diagnose API issues, own success plans, and guide customers through renewals.",
    questions: [
      "Describe your technical onboarding experience.",
      "Have you managed renewal risk?",
      "What is your experience with APIs?"
    ]
  }
];

export function getJobById(id) {
  return jobs.find((job) => job.id === id);
}
