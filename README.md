# ApplyPilot

ApplyPilot is a full-stack MVP for an AI job application platform. It includes a polished public website, signup/login, candidate profile, resume upload, manual apply, assisted apply, direct bulk apply, applications tracker, resume tailoring, backend API routes, and a Chrome extension scaffold.

## Tech Stack

- Next.js App Router
- React
- Built-in API routes
- Local JSON storage for development
- PostgreSQL when `DATABASE_URL` is provided
- Adzuna job search when `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` are provided
- OpenAI-backed tailored resume and ATS scoring when `OPENAI_API_KEY` is provided
- Chrome extension scaffold for assisted apply

## Run Locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
```

If `DATABASE_URL` is empty, the app stores local development data in `.local-data/app.json`.

## Deploy To Vercel

1. Push this folder to GitHub.
2. Import the repo in Vercel.
3. Add environment variables:
   - `SESSION_SECRET`
   - `DATABASE_URL`
   - `NEXT_PUBLIC_APP_URL`
4. Deploy.

Recommended database providers: Supabase, Neon, Vercel Postgres, or any managed PostgreSQL.

## Production Variables Needed

Required for real deployment:

```text
SESSION_SECRET
DATABASE_URL
NEXT_PUBLIC_APP_URL
ADZUNA_APP_ID
ADZUNA_APP_KEY
ADZUNA_COUNTRY
```

Adzuna jobs are search/redirect listings. They are used for Manual Apply and Assisted Apply. Direct Bulk Apply remains limited to jobs where an employer or ATS submission API is available.

Needed for paid production features:

```text
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRO_PRICE_ID
STRIPE_PREMIUM_PRICE_ID
OPENAI_API_KEY
OPENAI_MODEL
EMAIL_PROVIDER_API_KEY
```

The resume tailoring page accepts a resume upload plus pasted job description, generates a tailored resume PDF, and scores ATS readiness. Without `OPENAI_API_KEY`, the page still works with a local fallback so the UI can be tested.

Needed for real direct apply:

```text
GREENHOUSE_API_KEY
LEVER_API_KEY
SMARTRECRUITERS_API_KEY
EMPLOYER_CONNECTOR_KEYS
```

Direct bulk apply currently uses a safe connector stub. Real submissions require approved ATS or employer API credentials.

## Chrome Extension

Open Chrome:

```text
chrome://extensions
```

Enable Developer Mode, choose "Load unpacked", and select the `extension` folder.

In ApplyPilot, open Assisted Apply and click **Connect extension**. Paste the generated token into the extension popup once. Then click **Prepare and open** on an assisted job, open the extension popup on the employer form, and click **Autofill page**.

The extension reads the latest prepared assisted-apply package from:

```text
/api/extension/prepared-application
```

The candidate must use the extension token generated from their logged-in ApplyPilot account.

## Main Routes

- `/` public website
- `/login`
- `/signup`
- `/dashboard`
- `/dashboard/profile`
- `/dashboard/manual-apply`
- `/dashboard/assisted-apply`
- `/dashboard/direct-bulk-apply`
- `/dashboard/tailor`
- `/dashboard/applications`

## API Routes

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/candidate/profile`
- `PUT /api/candidate/profile`
- `POST /api/resumes/upload`
- `GET /api/jobs`
- `GET /api/applications`
- `POST /api/applications/prepare`
- `POST /api/applications/submit`
- `POST /api/ai/tailor`
- `POST /api/ai/ats-score`
- `GET /api/extension/prepared-application`
