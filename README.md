# ApplyPilot

ApplyPilot is a full-stack MVP for an AI job application platform. It includes a polished public website, signup/login, candidate profile, resume upload, manual apply, assisted apply, direct bulk apply, applications tracker, resume tailoring, backend API routes, and a Chrome extension scaffold.

## Tech Stack

- Next.js App Router
- React
- Built-in API routes
- Local JSON storage for development
- PostgreSQL when `DATABASE_URL` is provided
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
```

Needed for paid production features:

```text
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRO_PRICE_ID
STRIPE_PREMIUM_PRICE_ID
OPENAI_API_KEY
EMAIL_PROVIDER_API_KEY
```

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

The extension reads the latest prepared assisted-apply package from:

```text
/api/extension/prepared-application
```

The candidate must be logged in to ApplyPilot in the same browser.

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
- `GET /api/extension/prepared-application`
