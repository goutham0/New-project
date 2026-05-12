# ApplyPilot Website

ApplyPilot is a working static MVP for an AI-powered job application assistant.

## Open The Website

Open `index.html` directly in a browser:

```text
C:\Users\vemul\OneDrive\Documentos\New project\index.html
```

No build step is required. The demo uses browser `localStorage`, so signup, profile data, uploaded resume file name, plan selection, prepared applications, approvals, and tracker events persist locally in the browser.

## What Works Now

- Public landing page with service positioning, pricing, job search preview, FAQ, and employer/integration messaging.
- Demo signup/login/logout.
- Resume upload simulation.
- Mandatory candidate profile form.
- Free, Pro, and Premium plan switching.
- Searchable/filterable job list.
- Save jobs and open employer apply links.
- Paid-plan gating for application preparation.
- AI application package simulation with tailored resume, cover letter, and screening answers.
- Candidate approval, consent checkbox, direct API submission simulation, assisted apply simulation, and manual submitted state.
- Admin dashboard preview with audit log and usage counts.

## Production Inputs Needed Later

- Backend stack choice and repository layout.
- Stripe publishable key, secret key, price IDs, and webhook secret.
- OpenAI or Azure OpenAI credentials.
- Email provider credentials.
- S3 or object storage bucket settings.
- Database and queue configuration.
- Approved ATS or employer API credentials for direct apply.
- Chrome extension signing and distribution setup.

## Recommended Next Build Phase

Convert this static MVP into a framework app such as Next.js, then add Java Spring Boot APIs, a Python FastAPI AI service, PostgreSQL, Stripe, OpenAI, and ATS connectors.
# New-project
# New-project
