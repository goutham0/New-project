# ApplyFriend Fix Plan

## Current State

- The app is a Next.js App Router project with API routes, custom `pg` storage, and local JSON fallback storage.
- Authentication, profile, jobs, resume upload, applications, and extension endpoints already exist.
- Resume upload currently stores parsed text only; original files and tailored DOCX artifacts are not persisted.
- Tailored resume generation can create PDF output, but DOCX upload/download and artifact history are incomplete.
- Job data is mixed from static sample jobs and Adzuna results, with only basic cache upsert behavior.
- Application preparation exists, but it needs stronger idempotency, artifact references, and review-first workflows.

## Implementation Direction

1. Keep the existing Next.js/API route architecture for this phase.
2. Extend the current store instead of introducing Prisma midstream.
3. Add file storage abstraction for local development and Vercel-compatible future object storage.
4. Add a real DOCX pipeline:
   - Store original DOCX/PDF.
   - Extract readable text.
   - Parse structured resume JSON.
   - Tailor from original facts plus profile and JD.
   - Validate generated JSON.
   - Render a real downloadable DOCX.
5. Add job canonicalization and de-duplication helpers used during job ingestion/cache.
6. Add application idempotency so repeated clicks do not create duplicate prepared applications.
7. Add tests for resume parsing, DOCX generation, dedupe helpers, and application safety rules.

## Near-Term Limitations

- Direct apply remains a guarded/mock workflow unless an official employer/ATS submission API is configured.
- File storage is local first; production object storage can be added behind the same storage abstraction.
- Background queues are represented by DB-backed statuses in this phase; a real worker queue can replace the synchronous fallback later.
