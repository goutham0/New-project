const STORAGE_KEY = "applypilot-demo-state-v2";

const jobs = [
  {
    id: "job-1",
    title: "Backend Engineer, Platform APIs",
    company: "Northstar Health",
    location: "Austin, TX",
    remote: "Hybrid",
    type: "Full time",
    mode: "direct",
    ats: "Greenhouse",
    score: 92,
    salary: "$135k - $165k",
    skills: ["Java", "Spring Boot", "PostgreSQL", "Queues"],
    applyUrl: "https://example.com/northstar/backend-engineer",
    description: "Java Spring Boot, PostgreSQL, queues, audit logging, and partner API integrations."
  },
  {
    id: "job-2",
    title: "Product Data Analyst",
    company: "Mercury Works",
    location: "Remote, US",
    remote: "Remote",
    type: "Full time",
    mode: "direct",
    ats: "Lever",
    score: 88,
    salary: "$105k - $132k",
    skills: ["SQL", "Dashboards", "Experimentation", "Data quality"],
    applyUrl: "https://example.com/mercury/product-data-analyst",
    description: "SQL, experimentation, dashboarding, data quality, and stakeholder reporting."
  },
  {
    id: "job-3",
    title: "AI Support Specialist",
    company: "BrightDesk",
    location: "Chicago, IL",
    remote: "Onsite",
    type: "Full time",
    mode: "assisted",
    ats: "Employer site",
    score: 81,
    salary: "$72k - $92k",
    skills: ["Support", "AI tooling", "Documentation", "CRM"],
    applyUrl: "https://example.com/brightdesk/ai-support",
    description: "Customer support, AI tooling, documentation, escalation workflows, and CRM hygiene."
  },
  {
    id: "job-4",
    title: "Cloud Integration Engineer",
    company: "Harbor Grid",
    location: "Remote, US",
    remote: "Remote",
    type: "Contract",
    mode: "assisted",
    ats: "Workday",
    score: 84,
    salary: "$85/hr - $105/hr",
    skills: ["AWS", "SQS", "OAuth", "API Gateway"],
    applyUrl: "https://example.com/harbor/cloud-integration",
    description: "AWS, API gateways, SQS, OAuth, enterprise integrations, and production support."
  },
  {
    id: "job-5",
    title: "Full Stack SaaS Engineer",
    company: "CivicLoop",
    location: "Denver, CO",
    remote: "Hybrid",
    type: "Full time",
    mode: "direct",
    ats: "SmartRecruiters",
    score: 86,
    salary: "$128k - $152k",
    skills: ["React", "APIs", "PostgreSQL", "Security"],
    applyUrl: "https://example.com/civicloop/full-stack-saas",
    description: "React dashboards, secure APIs, PostgreSQL, payment workflows, and user-facing product surfaces."
  },
  {
    id: "job-6",
    title: "Technical Customer Success Manager",
    company: "AtlasOps",
    location: "Remote, US",
    remote: "Remote",
    type: "Full time",
    mode: "assisted",
    ats: "Employer site",
    score: 79,
    salary: "$95k - $122k",
    skills: ["Customer success", "APIs", "Onboarding", "Renewals"],
    applyUrl: "https://example.com/atlasops/customer-success",
    description: "Technical onboarding, API troubleshooting, success planning, renewals, and account health."
  }
];

const planRules = {
  Free: {
    quota: "Manual only",
    canPrepare: false,
    directLimit: 0,
    aiLimit: 0,
    packageText: "Free candidates can save jobs and open official apply links. AI tailoring, assisted apply, and direct apply unlock on paid plans."
  },
  Pro: {
    quota: "12 monthly",
    canPrepare: true,
    directLimit: 12,
    aiLimit: 30,
    packageText: "Pro includes tailored resumes, cover letters, screening answers, assisted apply, and a limited direct apply quota."
  },
  Premium: {
    quota: "40 monthly",
    canPrepare: true,
    directLimit: 40,
    aiLimit: 100,
    packageText: "Premium increases monthly quotas, unlocks advanced tracking, and adds priority support."
  }
};

const requiredProfileFields = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "city",
  "state",
  "country",
  "workAuthorization",
  "sponsorshipRequired",
  "currentTitle",
  "yearsExperience",
  "highestEducation",
  "targetTitles",
  "preferredLocations",
  "remotePreference",
  "salaryMin",
  "salaryMax",
  "noticePeriod"
];

const defaultProfile = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  city: "",
  state: "",
  country: "United States",
  workAuthorization: "",
  sponsorshipRequired: "",
  currentCompany: "",
  currentTitle: "",
  yearsExperience: "",
  highestEducation: "",
  university: "",
  degree: "",
  graduationYear: "",
  targetTitles: "",
  preferredLocations: "",
  remotePreference: "",
  salaryMin: "",
  salaryMax: "",
  noticePeriod: "",
  linkedinUrl: "",
  githubUrl: "",
  portfolioUrl: ""
};

let activeFilter = "all";
let currentAuthMode = "signup";
let state = loadState();
const selectedJobs = new Set(state.selectedJobs || []);

const header = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const jobList = document.querySelector("#job-list");
const selectedCount = document.querySelector("#selected-count");
const currentPlanLabel = document.querySelector("#current-plan");
const quotaLabel = document.querySelector("#quota-label");
const packagePreview = document.querySelector("#package-preview");
const prepareButton = document.querySelector("#prepare-button");
const profileScore = document.querySelector("#profile-score");
const progressBar = document.querySelector("#progress-bar");
const readinessList = document.querySelector("#readiness-list");
const authModal = document.querySelector("#auth-modal");
const modalTitle = document.querySelector("#modal-title");
const modalMode = document.querySelector("#modal-mode");
const sessionPill = document.querySelector("#session-pill");
const loginButton = document.querySelector("#login-button");
const jobSearch = document.querySelector("#job-search");
const sidebarAccount = document.querySelector("#sidebar-account");
const sidebarPlan = document.querySelector("#sidebar-plan");
const sidebarReadiness = document.querySelector("#sidebar-readiness");
const resumeUpload = document.querySelector("#resume-upload");
const profileForm = document.querySelector("#profile-form");
const profileStatus = document.querySelector("#profile-status");
const trackerList = document.querySelector("#tracker-list");
const consentCheck = document.querySelector("#consent-check");
const gateMessage = document.querySelector("#gate-message");
const accountSummary = document.querySelector("#account-summary");
const resumeSummary = document.querySelector("#resume-summary");
const planSummary = document.querySelector("#plan-summary");

function createDefaultState() {
  return {
    user: null,
    plan: "Free",
    resume: null,
    profile: { ...defaultProfile },
    selectedJobs: [],
    savedJobs: [],
    applications: [],
    audit: []
  };
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed) {
      return createDefaultState();
    }

    return {
      ...createDefaultState(),
      ...parsed,
      profile: { ...defaultProfile, ...(parsed.profile || {}) },
      selectedJobs: parsed.selectedJobs || [],
      savedJobs: parsed.savedJobs || [],
      applications: parsed.applications || [],
      audit: parsed.audit || []
    };
  } catch (error) {
    return createDefaultState();
  }
}

function saveState() {
  state.selectedJobs = [...selectedJobs];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function addAudit(message) {
  state.audit.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    message,
    at: new Date().toISOString()
  });
  state.audit = state.audit.slice(0, 12);
  saveState();
}

function modeLabel(mode) {
  return mode === "direct" ? "Direct Apply" : "Assisted Apply";
}

function profileComplete() {
  return requiredProfileFields.every((field) => String(state.profile[field] || "").trim().length > 0);
}

function readinessItems() {
  return [
    {
      label: "Account created",
      done: Boolean(state.user),
      detail: state.user ? state.user.email : "Signup or login required"
    },
    {
      label: "Resume uploaded",
      done: Boolean(state.resume),
      detail: state.resume ? `${state.resume.name} parsed` : "Upload PDF, DOCX, or TXT"
    },
    {
      label: "Mandatory profile complete",
      done: profileComplete(),
      detail: profileComplete() ? "Required application fields saved" : "Fill the profile form"
    },
    {
      label: "Paid plan active",
      done: state.plan !== "Free",
      detail: state.plan === "Free" ? "Direct and assisted apply are locked" : `${state.plan} plan active`
    }
  ];
}

function readinessScore() {
  const items = readinessItems();
  return Math.round((items.filter((item) => item.done).length / items.length) * 100);
}

function applyGate() {
  const missing = readinessItems().filter((item) => !item.done).map((item) => item.label.toLowerCase());
  return {
    ready: missing.length === 0,
    missing
  };
}

function filteredJobs() {
  const query = (jobSearch?.value || "").trim().toLowerCase();
  return jobs.filter((job) => {
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "direct" && job.mode === "direct") ||
      (activeFilter === "assisted" && job.mode === "assisted") ||
      (activeFilter === "remote" && job.remote === "Remote");

    const haystack = [
      job.title,
      job.company,
      job.location,
      job.remote,
      job.type,
      job.ats,
      job.description,
      ...job.skills
    ].join(" ").toLowerCase();

    return matchesFilter && (!query || haystack.includes(query));
  });
}

function renderHeader() {
  if (state.user) {
    sessionPill.hidden = false;
    sessionPill.textContent = state.user.email;
    loginButton.textContent = "Logout";
    loginButton.dataset.action = "logout";
  } else {
    sessionPill.hidden = true;
    loginButton.textContent = "Login";
    loginButton.dataset.action = "";
  }
}

function renderReadiness() {
  const score = readinessScore();
  profileScore.textContent = `${score}%`;
  progressBar.style.width = `${score}%`;
  sidebarReadiness.textContent = `${score}%`;
  sidebarPlan.textContent = state.plan;
  sidebarAccount.textContent = state.user ? state.user.email : "Guest";

  readinessList.innerHTML = readinessItems()
    .map((item) => `
      <div class="readiness-item ${item.done ? "done" : ""}">
        <span aria-hidden="true">${item.done ? "OK" : "!"}</span>
        <div>
          <strong>${escapeHtml(item.label)}</strong>
          <p>${escapeHtml(item.detail)}</p>
        </div>
      </div>
    `)
    .join("");

  accountSummary.textContent = state.user
    ? `Signed in as ${state.user.email}.`
    : "Create an account or login to start the candidate flow.";
  resumeSummary.textContent = state.resume
    ? `${state.resume.name} uploaded and parsed for demo matching.`
    : "Upload a PDF, DOCX, or TXT resume. This demo stores only the file name.";
  planSummary.textContent = `${state.plan} plan selected. ${planRules[state.plan].packageText}`;

  const gate = applyGate();
  gateMessage.textContent = gate.ready
    ? "Application preparation is unlocked. Select jobs above and prepare application packages."
    : `Locked until you complete: ${gate.missing.join(", ")}.`;
  gateMessage.classList.toggle("success", gate.ready);
}

function renderPlanUI() {
  currentPlanLabel.textContent = state.plan;
  quotaLabel.textContent = planRules[state.plan].quota;

  document.querySelectorAll(".plan-choice").forEach((button) => {
    const isActive = button.dataset.plan === state.plan;
    button.setAttribute("aria-pressed", String(isActive));
    const label = button.dataset.plan;
    button.textContent = isActive ? `${label} selected` : `Select ${label}`;
  });
}

function renderJobs() {
  jobList.innerHTML = filteredJobs()
    .map((job) => {
      const checked = selectedJobs.has(job.id) ? "checked" : "";
      const saved = state.savedJobs.includes(job.id);
      return `
        <article class="job-card">
          <input type="checkbox" aria-label="Select ${escapeHtml(job.title)}" data-job-id="${job.id}" ${checked}>
          <div>
            <h3>${escapeHtml(job.title)}</h3>
            <p>${escapeHtml(job.company)} - ${escapeHtml(job.location)}</p>
            <p>${escapeHtml(job.description)}</p>
            <div class="job-meta">
              <span class="tag ${job.mode}">${modeLabel(job.mode)}</span>
              <span class="tag">${escapeHtml(job.remote)}</span>
              <span class="tag">${escapeHtml(job.type)}</span>
              <span class="tag">${escapeHtml(job.ats)}</span>
              <span class="tag">${escapeHtml(job.salary)}</span>
            </div>
            <div class="job-actions">
              <button class="text-link" type="button" data-open-job="${job.id}">Open employer link</button>
              <button class="text-link" type="button" data-save-job="${job.id}">${saved ? "Saved" : "Save job"}</button>
            </div>
          </div>
          <strong class="job-score">${job.score}% match</strong>
        </article>
      `;
    })
    .join("");

  if (!jobList.innerHTML) {
    jobList.innerHTML = `<div class="empty-state">No jobs match this search.</div>`;
  }
}

function renderSelectionUI() {
  const count = selectedJobs.size;
  const rules = planRules[state.plan];
  const gate = applyGate();
  selectedCount.textContent = `${count} ${count === 1 ? "job" : "jobs"}`;
  prepareButton.disabled = count === 0 || !rules.canPrepare || !gate.ready;

  if (count === 0) {
    packagePreview.innerHTML = `<p>${escapeHtml(rules.packageText)}</p>`;
    return;
  }

  const selected = jobs.filter((job) => selectedJobs.has(job.id));
  const directCount = selected.filter((job) => job.mode === "direct").length;
  const assistedCount = selected.length - directCount;
  const gateCopy = gate.ready
    ? "Ready to generate candidate-reviewed packages."
    : `Finish setup first: ${gate.missing.join(", ")}.`;
  packagePreview.innerHTML = `
    <p><strong>${count} application package${count === 1 ? "" : "s"} selected.</strong></p>
    <p>${directCount} direct apply, ${assistedCount} assisted apply.</p>
    <p>${escapeHtml(gateCopy)}</p>
  `;
}

function renderProfileForm() {
  Object.entries(state.profile).forEach(([name, value]) => {
    const input = profileForm.elements[name];
    if (input) {
      input.value = value || "";
    }
  });
}

function renderApplications() {
  if (!state.applications.length) {
    trackerList.innerHTML = `
      <div class="empty-state">
        <strong>No applications prepared yet.</strong>
        <p>Select jobs, complete onboarding, and click Prepare applications.</p>
      </div>
    `;
  } else {
    trackerList.innerHTML = state.applications
      .map((application) => {
        const job = jobs.find((item) => item.id === application.jobId);
        const isDirect = application.applicationType === "DIRECT";
        const canSubmit = isDirect && application.status === "APPROVED" && consentCheck.checked;
        const canAssist = !isDirect && application.status === "APPROVED";
        return `
          <article class="tracker-card" data-application-id="${application.id}">
            <div class="tracker-card-top">
              <div>
                <span class="tag ${isDirect ? "direct" : "assisted"}">${isDirect ? "Direct apply" : "Assisted apply"}</span>
                <h4>${escapeHtml(job?.title || "Unknown job")}</h4>
                <p>${escapeHtml(job?.company || "")} - ${escapeHtml(job?.location || "")}</p>
              </div>
              <strong>${escapeHtml(application.status.replaceAll("_", " "))}</strong>
            </div>
            <div class="generated-grid">
              <article>
                <span>Tailored resume</span>
                <p>${escapeHtml(application.tailoredResume)}</p>
              </article>
              <article>
                <span>Cover letter</span>
                <p>${escapeHtml(application.coverLetter)}</p>
              </article>
              <article>
                <span>Screening answer</span>
                <p>${escapeHtml(application.answers[0])}</p>
              </article>
            </div>
            <div class="tracker-actions">
              <button class="secondary-button" type="button" data-app-action="approve" ${application.status !== "NEEDS_REVIEW" ? "disabled" : ""}>Approve</button>
              <button class="primary-button" type="button" data-app-action="submit" ${canSubmit ? "" : "disabled"}>Submit through API</button>
              <button class="secondary-button" type="button" data-app-action="assist" ${canAssist ? "" : "disabled"}>Open assisted apply</button>
              <button class="secondary-button" type="button" data-app-action="manual" ${application.status === "SUBMITTED" ? "disabled" : ""}>Mark submitted</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  document.querySelector("#admin-applications").textContent = String(state.applications.length);
  document.querySelector("#admin-ai").textContent = String(state.applications.length * 3);
  document.querySelector("#admin-users").textContent = state.user ? "1" : "0";
  document.querySelector("#audit-log").innerHTML = state.audit.length
    ? state.audit.map((entry) => `
        <div>
          <strong>${new Date(entry.at).toLocaleString()}</strong>
          <p>${escapeHtml(entry.message)}</p>
        </div>
      `).join("")
    : `<div><strong>No audit events yet.</strong><p>Actions such as signup, resume upload, preparation, approval, and submission appear here.</p></div>`;
}

function renderAll() {
  renderHeader();
  renderReadiness();
  renderPlanUI();
  renderJobs();
  renderSelectionUI();
  renderProfileForm();
  renderApplications();
}

function switchTab(tab) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
  document.querySelectorAll(".workspace-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === tab);
  });
}

function setPlan(plan) {
  state.plan = plan;
  addAudit(`Plan changed to ${plan}.`);
  saveState();
  renderAll();
}

function openModal(mode) {
  currentAuthMode = mode;
  const isLogin = mode === "login";
  modalMode.textContent = isLogin ? "Welcome back" : "Candidate access";
  modalTitle.textContent = isLogin ? "Login to ApplyPilot" : "Create your ApplyPilot account";
  authModal.hidden = false;
  document.body.classList.add("modal-open");
  authModal.querySelector("input").focus();
}

function closeModal() {
  authModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function prepareApplications() {
  const gate = applyGate();
  if (!selectedJobs.size || !planRules[state.plan].canPrepare || !gate.ready) {
    packagePreview.innerHTML = `<p>Application preparation is locked until setup is complete.</p>`;
    return;
  }

  const profileName = `${state.profile.firstName} ${state.profile.lastName}`.trim() || "Candidate";
  const created = [];

  selectedJobs.forEach((jobId) => {
    const job = jobs.find((item) => item.id === jobId);
    if (!job) {
      return;
    }

    const existing = state.applications.find((item) => item.jobId === job.id && item.status !== "SUBMITTED");
    if (existing) {
      existing.status = "NEEDS_REVIEW";
      existing.updatedAt = new Date().toISOString();
      created.push(existing);
      return;
    }

    created.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${job.id}`,
      jobId: job.id,
      applicationType: job.mode === "direct" ? "DIRECT" : "ASSISTED",
      status: "NEEDS_REVIEW",
      matchScore: job.score,
      tailoredResume: `${profileName}'s resume is tailored around ${job.skills.slice(0, 3).join(", ")} with truthful achievements emphasized.`,
      coverLetter: `Drafted for ${job.company}, connecting ${state.profile.currentTitle || "the candidate"} experience to ${job.title}.`,
      answers: [
        `Work authorization: ${state.profile.workAuthorization}. Sponsorship required: ${state.profile.sponsorshipRequired}.`,
        `Experience summary: ${state.profile.yearsExperience} years aligned to ${job.skills.join(", ")}.`,
        `Location preference: ${state.profile.remotePreference}; preferred locations include ${state.profile.preferredLocations}.`
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  state.applications = [
    ...created.filter((item) => !state.applications.some((existing) => existing.id === item.id)),
    ...state.applications
  ];
  selectedJobs.clear();
  addAudit(`${created.length} application package${created.length === 1 ? "" : "s"} prepared for candidate review.`);
  saveState();
  renderAll();
  switchTab("applications");
  document.querySelector("#workspace").scrollIntoView({ behavior: "smooth", block: "start" });
}

function openEmployerJob(jobId) {
  const job = jobs.find((item) => item.id === jobId);
  if (!job) {
    return;
  }

  addAudit(`Employer apply link opened for ${job.title} at ${job.company}.`);
  packagePreview.innerHTML = `
    <p><strong>${escapeHtml(job.company)} apply link opened.</strong></p>
    <p>Manual apply records a click or open event only. Direct submission still requires paid plan, review, and consent.</p>
  `;
}

function toggleSavedJob(jobId) {
  if (state.savedJobs.includes(jobId)) {
    state.savedJobs = state.savedJobs.filter((id) => id !== jobId);
  } else {
    state.savedJobs.push(jobId);
  }
  saveState();
  renderJobs();
}

function loadDemoCandidate() {
  state.user = {
    email: "demo.candidate@example.com",
    name: "Demo Candidate",
    createdAt: new Date().toISOString()
  };
  state.plan = "Pro";
  state.resume = {
    name: "Demo_Candidate_Resume.pdf",
    type: "application/pdf",
    size: 184000,
    uploadedAt: new Date().toISOString(),
    parsed: true
  };
  state.profile = {
    ...state.profile,
    firstName: "Demo",
    lastName: "Candidate",
    email: "demo.candidate@example.com",
    phone: "312-555-0148",
    city: "Chicago",
    state: "IL",
    country: "United States",
    workAuthorization: "Authorized to work in the US",
    sponsorshipRequired: "No",
    currentCompany: "Launch Systems",
    currentTitle: "Backend Engineer",
    yearsExperience: "6",
    highestEducation: "Bachelor's degree",
    university: "University of Illinois",
    degree: "Computer Science",
    graduationYear: "2018",
    targetTitles: "Backend Engineer, Full Stack Engineer, Platform Engineer",
    preferredLocations: "Remote, Chicago, Austin",
    remotePreference: "Remote",
    salaryMin: "125000",
    salaryMax: "165000",
    noticePeriod: "2 weeks",
    linkedinUrl: "https://linkedin.com/in/demo-candidate",
    githubUrl: "https://github.com/demo-candidate",
    portfolioUrl: "https://demo-candidate.example.com"
  };
  addAudit("Demo candidate loaded.");
  saveState();
  renderAll();
}

function clearDemoData() {
  state = createDefaultState();
  selectedJobs.clear();
  saveState();
  renderAll();
}

window.addEventListener("scroll", () => {
  header.dataset.elevated = String(window.scrollY > 12);
});

navToggle.addEventListener("click", () => {
  const open = !header.classList.contains("open");
  header.classList.toggle("open", open);
  navToggle.setAttribute("aria-expanded", String(open));
});

document.querySelectorAll(".site-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    header.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

document.querySelectorAll("[data-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.action === "logout") {
      return;
    }
    openModal(button.dataset.modal);
  });
});

loginButton.addEventListener("click", (event) => {
  if (event.currentTarget.dataset.action === "logout") {
    state.user = null;
    addAudit("User logged out.");
    saveState();
    renderAll();
    return;
  }

  openModal("login");
});

document.querySelector(".modal-close").addEventListener("click", closeModal);

authModal.addEventListener("click", (event) => {
  if (event.target === authModal) {
    closeModal();
  }
});

document.querySelector(".auth-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const email = String(formData.get("email") || "").trim();
  if (!email) {
    return;
  }

  state.user = {
    email,
    name: email.split("@")[0],
    createdAt: new Date().toISOString()
  };

  if (!state.profile.email) {
    state.profile.email = email;
  }

  addAudit(`${currentAuthMode === "login" ? "Login" : "Signup"} completed for ${email}.`);
  saveState();
  closeModal();
  renderAll();
});

document.querySelectorAll(".filter-button").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".filter-button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderJobs();
  });
});

jobSearch.addEventListener("input", renderJobs);

document.querySelectorAll(".plan-choice").forEach((button) => {
  button.addEventListener("click", () => setPlan(button.dataset.plan));
});

jobList.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-job-id]");
  if (!checkbox) {
    return;
  }

  if (checkbox.checked) {
    selectedJobs.add(checkbox.dataset.jobId);
  } else {
    selectedJobs.delete(checkbox.dataset.jobId);
  }

  saveState();
  renderSelectionUI();
});

jobList.addEventListener("click", (event) => {
  const opener = event.target.closest("[data-open-job]");
  const saver = event.target.closest("[data-save-job]");

  if (opener) {
    openEmployerJob(opener.dataset.openJob);
  }

  if (saver) {
    toggleSavedJob(saver.dataset.saveJob);
  }
});

prepareButton.addEventListener("click", prepareApplications);

resumeUpload.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  state.resume = {
    name: file.name,
    type: file.type || "unknown",
    size: file.size,
    uploadedAt: new Date().toISOString(),
    parsed: true
  };
  addAudit(`Resume uploaded and parsed: ${file.name}.`);
  saveState();
  renderAll();
});

profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(profileForm);
  Object.keys(defaultProfile).forEach((field) => {
    state.profile[field] = String(formData.get(field) || "").trim();
  });

  if (state.profile.email && state.user) {
    state.user.email = state.profile.email;
  }

  profileStatus.textContent = "Profile saved.";
  addAudit("Candidate profile saved.");
  saveState();
  renderAll();
});

document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

document.querySelector("#seed-demo").addEventListener("click", loadDemoCandidate);
document.querySelector("#clear-demo").addEventListener("click", clearDemoData);
document.querySelector("#clear-applications").addEventListener("click", () => {
  state.applications = [];
  addAudit("Application tracker cleared.");
  saveState();
  renderAll();
});

consentCheck.addEventListener("change", renderApplications);

trackerList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-app-action]");
  if (!button) {
    return;
  }

  const card = button.closest("[data-application-id]");
  const application = state.applications.find((item) => item.id === card.dataset.applicationId);
  const job = jobs.find((item) => item.id === application?.jobId);
  if (!application) {
    return;
  }

  if (button.dataset.appAction === "approve") {
    application.status = "APPROVED";
    application.updatedAt = new Date().toISOString();
    addAudit(`Application approved for ${job.title}.`);
  }

  if (button.dataset.appAction === "submit") {
    if (!consentCheck.checked) {
      return;
    }
    application.status = "SUBMITTED";
    application.externalApplicationId = `ATS-${Math.floor(Math.random() * 900000 + 100000)}`;
    application.submittedAt = new Date().toISOString();
    application.updatedAt = new Date().toISOString();
    addAudit(`Direct application submitted through ${job.ats} for ${job.title}.`);
  }

  if (button.dataset.appAction === "assist") {
    application.status = "ASSISTED_OPENED";
    application.updatedAt = new Date().toISOString();
    addAudit(`Assisted apply opened for ${job.title}.`);
  }

  if (button.dataset.appAction === "manual") {
    application.status = "SUBMITTED";
    application.submittedAt = new Date().toISOString();
    application.updatedAt = new Date().toISOString();
    addAudit(`Application marked submitted manually for ${job.title}.`);
  }

  saveState();
  renderAll();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !authModal.hidden) {
    closeModal();
  }
});

renderAll();
