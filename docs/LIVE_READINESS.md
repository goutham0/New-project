# ApplyFriend live workflow

The supported release workflow is account -> profile -> original resume -> live job search -> AI document preparation -> candidate review -> employer form -> candidate-confirmed tracking.

## What changed

- Original resume binaries persist in PostgreSQL, not Vercel's temporary filesystem. Authenticated original downloads verify ownership.
- AI tailoring extracts the source history first, preserves employers/titles/dates, rejects reduced role coverage, and saves DOCX/PDF outputs for later downloads.
- AI failures return errors instead of substituting a locally fabricated resume. Resume match analysis is labeled as an estimate, not a proprietary ATS score.
- Live Adzuna results no longer mix with demo listings by default. Identical jobs have the same ID across modes. Search supports location and pagination.
- Preparation runs one job per request with saved status, a database claim, and retry after failure or an expired ten-minute claim. It is not a durable background queue: keep the tab open for bulk preparation; retry unfinished items if interrupted.
- Direct submission is blocked because this repository has no employer-authorized submission connector. Previous mock IDs are excluded from the submitted tracker. Manual/assisted submissions are explicitly candidate-confirmed.
- Extension 1.4.0 fetches packages through its background worker, fills on candidate action, preserves existing text values, and does not submit forms. Handoff tokens are not forwarded to employer URLs.
- Feedback reports storage failure honestly. Placeholder settings and footer links now lead to implemented workflows.

## Configuration

Set these server environment variables in Vercel: DATABASE_URL, SESSION_SECRET (32+ random characters), OPENAI_API_KEY, OPENAI_MODEL, ADZUNA_APP_ID, ADZUNA_APP_KEY. Set NEXT_PUBLIC_APP_URL to the canonical site URL. Optional Adzuna country/results/location/query settings remain supported. Never prefix secrets with NEXT_PUBLIC_.

ENABLE_DEMO_JOBS defaults off. Turn it on only for explicitly labeled development fixtures.

Database tables are initialized idempotently by the existing store. Backups and a separately managed migration process are still recommended before broader scale. File records are stored as bytea; move to private object storage if document volume becomes large. Uploaded resumes are limited to 4 MB. AI endpoints allow 60 requests per account per hour, enforced in PostgreSQL.

## Verification

`npm run test` runs offline regressions for DOCX generation, job deduplication, source-role preservation, PDF text retention and extension mapping.

`npm run dev` starts the application. In another terminal, run `node --env-file=.env.local scripts/verify-live.mjs`. This creates a synthetic account, verifies authentication, persistent original-file upload/download, feedback and unsupported-direct-submit rejection, then removes that run's test account. With TEST_AI=true it additionally calls the configured OpenAI provider and checks saved resume downloads and match analysis. These AI tests use synthetic data and consume API usage. TEST_BASE_URL may target the intended deployment.

The live tests passed locally against configured Neon, Adzuna and OpenAI services. They do not prove that all external employer forms work or that resume facts are semantically perfect.

## Remaining launch work

- Next.js is patched to 16.3.8 and compatible security fixes are installed. npm audit still reports a moderate sprintf-js advisory through mammoth's argparse CLI dependency. The application uses mammoth's library API, not that CLI; monitor the upstream fix. Do not use npm audit fix --force to downgrade the DOCX parser.
- Direct submission requires an authorized ATS connector with employer credentials and verified response handling.
- Extension installation uses Load unpacked until a Chrome Web Store listing is published. Custom widgets, cross-origin iframes, closed shadow roots and file upload fields may require manual input. Real employer-site coverage must be tested with candidate consent.
- No email delivery, password reset, email verification, recruiter service, interview scheduling, two-factor authentication or operational admin dashboard is implemented in this release. Do not advertise those as available.
- Bulk preparation is sequential and retryable, not a worker-backed queue that continues after the browser closes. No load-test evidence supports thousands of concurrent users.
- PDF extraction still uses the existing limited parser; scanned PDFs require OCR outside this release. DOCX or pasted text is the reliable fallback.
- AI writing must be reviewed by the candidate. Source extraction and factual preservation checks reduce omissions but cannot prove every generated claim.
- Existing local-only originals from older deployments cannot be recovered automatically. Upload those originals again.
- Existing Adzuna IDs from before this release included apply mode; historical duplicates may require a reviewed migration.

## Extension packaging

On Windows run `Compress-Archive -Path extension/* -DestinationPath public/applyfriend-extension.zip -Force` after extension changes. The archive is ignored by the repository's existing rules, so include it explicitly when publishing. The configured production domains and localhost:3000 are the permitted API origins.
