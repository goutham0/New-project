import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import pg from "pg";
import { enrichJobForDedupe } from "./jobDedupe.js";

const { Pool } = pg;
const dataDir = path.join(process.cwd(), ".local-data");
const dataFile = path.join(dataDir, "app.json");

let pool;
let schemaReady = false;

const emptyData = {
  users: [],
  profiles: [],
  resumes: [],
  tailoredResumes: [],
  applications: [],
  applicationBatches: [],
  jobs: [],
  feedback: [],
  audit: []
};

function usePostgres() {
  return Boolean(process.env.DATABASE_URL);
}

function databaseUrl() {
  return String(process.env.DATABASE_URL || "").replace("sslmode=require", "sslmode=verify-full");
}

function getPool() {
  if (!pool) {
    const connectionString = databaseUrl();
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost") ? false : undefined
    });
  }
  return pool;
}

async function ensureSchema() {
  if (!usePostgres() || schemaReady) {
    return;
  }

  const db = getPool();
  await db.query(`
    create table if not exists users (
      id text primary key,
      email text unique not null,
      password_hash text not null,
      name text,
      role text not null default 'candidate',
      plan text not null default 'Free',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists profiles (
      user_id text primary key references users(id) on delete cascade,
      data jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    );

    create table if not exists resumes (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      file_name text not null,
      file_type text,
      content text,
      original_file_path text,
      parsed_json jsonb not null default '{}'::jsonb,
      checksum_sha256 text,
      is_primary boolean not null default false,
      created_at timestamptz not null default now()
    );

    alter table resumes add column if not exists original_file_path text;
    alter table resumes add column if not exists parsed_json jsonb not null default '{}'::jsonb;
    alter table resumes add column if not exists checksum_sha256 text;
    alter table resumes add column if not exists is_primary boolean not null default false;

    create table if not exists tailored_resumes (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      resume_id text references resumes(id) on delete set null,
      job_id text,
      job_description_hash text,
      tailored_docx_path text,
      tailored_pdf_path text,
      tailored_json jsonb not null default '{}'::jsonb,
      tailoring_notes jsonb not null default '[]'::jsonb,
      ats_score_before int,
      ats_score_after int,
      created_at timestamptz not null default now()
    );

    create table if not exists applications (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      job_id text not null,
      application_type text not null,
      status text not null,
      match_score int,
      package jsonb not null default '{}'::jsonb,
      external_application_id text,
      failure_reason text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists applications_user_job_idx on applications(user_id, job_id);
    create index if not exists applications_user_status_idx on applications(user_id, status);

    create table if not exists job_cache (
      id text primary key,
      source text,
      canonical_job_key text,
      data jsonb not null default '{}'::jsonb,
      expires_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    alter table job_cache add column if not exists canonical_job_key text;
    create index if not exists job_cache_canonical_key_idx on job_cache(canonical_job_key);

    create table if not exists audit (
      id text primary key,
      user_id text,
      event_type text not null,
      message text not null,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );

    create table if not exists feedback (
      id text primary key,
      user_id text,
      name text,
      email text,
      feedback_type text,
      rating int,
      message text not null,
      created_at timestamptz not null default now()
    );
  `);
  schemaReady = true;
}

async function readJson() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    const raw = await fs.readFile(dataFile, "utf8");
    return { ...emptyData, ...JSON.parse(raw) };
  } catch (error) {
    await fs.writeFile(dataFile, JSON.stringify(emptyData, null, 2));
    return { ...emptyData };
  }
}

async function writeJson(data) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
}

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
}

function normalizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash || row.passwordHash,
    name: row.name || "",
    role: row.role || "candidate",
    plan: row.plan || "Free",
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt
  };
}

export async function createUser({ email, passwordHash, name }) {
  const normalizedEmail = email.toLowerCase().trim();
  if (usePostgres()) {
    await ensureSchema();
    const user = {
      id: id("usr"),
      email: normalizedEmail,
      passwordHash,
      name: name || normalizedEmail.split("@")[0],
      role: "candidate",
      plan: "Free"
    };
    await getPool().query(
      "insert into users (id, email, password_hash, name, role, plan) values ($1, $2, $3, $4, $5, $6)",
      [user.id, user.email, user.passwordHash, user.name, user.role, user.plan]
    );
    await saveProfile(user.id, {});
    return user;
  }

  const data = await readJson();
  if (data.users.some((user) => user.email === normalizedEmail)) {
    throw new Error("Account already exists.");
  }
  const user = {
    id: id("usr"),
    email: normalizedEmail,
    passwordHash,
    name: name || normalizedEmail.split("@")[0],
    role: "candidate",
    plan: "Free",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.users.push(user);
  data.profiles.push({ userId: user.id, data: {}, updatedAt: new Date().toISOString() });
  await writeJson(data);
  return user;
}

export async function getUserByEmail(email) {
  const normalizedEmail = email.toLowerCase().trim();
  if (usePostgres()) {
    await ensureSchema();
    const result = await getPool().query("select * from users where email = $1", [normalizedEmail]);
    return normalizeUser(result.rows[0]);
  }
  const data = await readJson();
  return normalizeUser(data.users.find((user) => user.email === normalizedEmail));
}

export async function getUserById(userId) {
  if (!userId) return null;
  if (usePostgres()) {
    await ensureSchema();
    const result = await getPool().query("select * from users where id = $1", [userId]);
    return normalizeUser(result.rows[0]);
  }
  const data = await readJson();
  return normalizeUser(data.users.find((user) => user.id === userId));
}

export async function updateUser(userId, updates) {
  if (usePostgres()) {
    await ensureSchema();
    const current = await getUserById(userId);
    const next = { ...current, ...updates, updatedAt: new Date().toISOString() };
    await getPool().query(
      "update users set email = $2, name = $3, plan = $4, updated_at = now() where id = $1",
      [userId, next.email, next.name, next.plan]
    );
    return next;
  }
  const data = await readJson();
  const index = data.users.findIndex((user) => user.id === userId);
  data.users[index] = { ...data.users[index], ...updates, updatedAt: new Date().toISOString() };
  await writeJson(data);
  return normalizeUser(data.users[index]);
}

export async function getProfile(userId) {
  if (usePostgres()) {
    await ensureSchema();
    const result = await getPool().query("select data from profiles where user_id = $1", [userId]);
    return result.rows[0]?.data || {};
  }
  const data = await readJson();
  return data.profiles.find((profile) => profile.userId === userId)?.data || {};
}

export async function saveProfile(userId, profile) {
  if (usePostgres()) {
    await ensureSchema();
    await getPool().query(
      `insert into profiles (user_id, data, updated_at)
       values ($1, $2, now())
       on conflict (user_id) do update set data = excluded.data, updated_at = now()`,
      [userId, profile]
    );
    return profile;
  }
  const data = await readJson();
  const existing = data.profiles.find((item) => item.userId === userId);
  if (existing) {
    existing.data = profile;
    existing.updatedAt = new Date().toISOString();
  } else {
    data.profiles.push({ userId, data: profile, updatedAt: new Date().toISOString() });
  }
  await writeJson(data);
  return profile;
}

export async function saveResume({ userId, fileName, fileType, content, filePath = "", parsedJson = {}, checksum = "", isPrimary = false }) {
  const resume = {
    id: id("res"),
    userId,
    fileName,
    fileType,
    content,
    originalFilePath: filePath,
    parsedJson,
    checksumSha256: checksum,
    isPrimary,
    createdAt: new Date().toISOString()
  };

  if (usePostgres()) {
    await ensureSchema();
    if (isPrimary) {
      await getPool().query("update resumes set is_primary = false where user_id = $1", [userId]);
    }
    await getPool().query(
      `insert into resumes
       (id, user_id, file_name, file_type, content, original_file_path, parsed_json, checksum_sha256, is_primary)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [resume.id, userId, fileName, fileType, content, filePath, parsedJson, checksum, isPrimary]
    );
    return resume;
  }
  const data = await readJson();
  if (isPrimary) {
    data.resumes.forEach((item) => {
      if (item.userId === userId) item.isPrimary = false;
    });
  }
  data.resumes.push(resume);
  await writeJson(data);
  return resume;
}

export async function getLatestResume(userId) {
  if (usePostgres()) {
    await ensureSchema();
    const result = await getPool().query(
      "select * from resumes where user_id = $1 order by is_primary desc, created_at desc limit 1",
      [userId]
    );
    return normalizeResumeRow(result.rows[0]);
  }
  const data = await readJson();
  return data.resumes
    .filter((resume) => resume.userId === userId)
    .sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)) || new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
}

export async function listResumes(userId) {
  if (usePostgres()) {
    await ensureSchema();
    const result = await getPool().query("select * from resumes where user_id = $1 order by created_at desc", [userId]);
    return result.rows.map(normalizeResumeRow).filter(Boolean);
  }
  const data = await readJson();
  return data.resumes.filter((resume) => resume.userId === userId).reverse();
}

export async function getResumeById(userId, resumeId) {
  if (usePostgres()) {
    await ensureSchema();
    const result = await getPool().query("select * from resumes where user_id = $1 and id = $2", [userId, resumeId]);
    return normalizeResumeRow(result.rows[0]);
  }
  const data = await readJson();
  return data.resumes.find((resume) => resume.userId === userId && resume.id === resumeId) || null;
}

export async function saveTailoredResume({
  userId,
  resumeId,
  jobId = "",
  jobDescriptionHash = "",
  tailoredDocxPath = "",
  tailoredPdfPath = "",
  tailoredJson = {},
  tailoringNotes = [],
  atsScoreBefore = null,
  atsScoreAfter = null
}) {
  const item = {
    id: id("tr"),
    userId,
    resumeId,
    jobId,
    jobDescriptionHash,
    tailoredDocxPath,
    tailoredPdfPath,
    tailoredJson,
    tailoringNotes,
    atsScoreBefore,
    atsScoreAfter,
    createdAt: new Date().toISOString()
  };

  if (usePostgres()) {
    await ensureSchema();
    await getPool().query(
      `insert into tailored_resumes
       (id, user_id, resume_id, job_id, job_description_hash, tailored_docx_path, tailored_pdf_path, tailored_json, tailoring_notes, ats_score_before, ats_score_after)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        item.id,
        userId,
        resumeId || null,
        jobId || null,
        jobDescriptionHash || null,
        tailoredDocxPath || null,
        tailoredPdfPath || null,
        tailoredJson,
        tailoringNotes,
        atsScoreBefore,
        atsScoreAfter
      ]
    );
    return item;
  }

  const data = await readJson();
  data.tailoredResumes = data.tailoredResumes || [];
  data.tailoredResumes.push(item);
  await writeJson(data);
  return item;
}

export async function getTailoredResumeById(userId, tailoredResumeId) {
  if (usePostgres()) {
    await ensureSchema();
    const result = await getPool().query("select * from tailored_resumes where user_id = $1 and id = $2", [userId, tailoredResumeId]);
    return normalizeTailoredResumeRow(result.rows[0]);
  }
  const data = await readJson();
  return (data.tailoredResumes || []).find((item) => item.userId === userId && item.id === tailoredResumeId) || null;
}

function normalizeTailoredResumeRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id || row.userId,
    resumeId: row.resume_id || row.resumeId,
    jobId: row.job_id || row.jobId || "",
    jobDescriptionHash: row.job_description_hash || row.jobDescriptionHash || "",
    tailoredDocxPath: row.tailored_docx_path || row.tailoredDocxPath || "",
    tailoredPdfPath: row.tailored_pdf_path || row.tailoredPdfPath || "",
    tailoredJson: row.tailored_json || row.tailoredJson || {},
    tailoringNotes: row.tailoring_notes || row.tailoringNotes || [],
    atsScoreBefore: row.ats_score_before ?? row.atsScoreBefore ?? null,
    atsScoreAfter: row.ats_score_after ?? row.atsScoreAfter ?? null,
    createdAt: row.created_at || row.createdAt
  };
}

function normalizeResumeRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id || row.userId,
    fileName: row.file_name || row.fileName,
    fileType: row.file_type || row.fileType,
    content: row.content || "",
    originalFilePath: row.original_file_path || row.originalFilePath || "",
    parsedJson: row.parsed_json || row.parsedJson || {},
    checksumSha256: row.checksum_sha256 || row.checksumSha256 || "",
    isPrimary: Boolean(row.is_primary ?? row.isPrimary),
    createdAt: row.created_at || row.createdAt
  };
}

export async function listApplications(userId) {
  if (usePostgres()) {
    await ensureSchema();
    const result = await getPool().query(
      "select * from applications where user_id = $1 order by created_at desc",
      [userId]
    );
    return result.rows.map(normalizeApplicationRow);
  }
  const data = await readJson();
  return data.applications.filter((application) => application.userId === userId).reverse();
}

export async function createApplication(application) {
  const item = {
    id: id("app"),
    status: "NEEDS_REVIEW",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...application
  };

  if (usePostgres()) {
    await ensureSchema();
    const existing = await getPool().query(
      "select * from applications where user_id = $1 and job_id = $2 order by created_at desc limit 1",
      [item.userId, item.jobId]
    );
    if (existing.rows[0]) {
      return normalizeApplicationRow(existing.rows[0]);
    }
    await getPool().query(
      `insert into applications
       (id, user_id, job_id, application_type, status, match_score, package, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, now(), now())`,
      [item.id, item.userId, item.jobId, item.applicationType, item.status, item.matchScore, item.package]
    );
    return item;
  }
  const data = await readJson();
  const existing = data.applications.find((existingItem) => existingItem.userId === item.userId && existingItem.jobId === item.jobId);
  if (existing) return existing;
  data.applications.push(item);
  await writeJson(data);
  return item;
}

function normalizeApplicationRow(row) {
  return {
    id: row.id,
    userId: row.user_id || row.userId,
    jobId: row.job_id || row.jobId,
    applicationType: row.application_type || row.applicationType,
    status: row.status,
    matchScore: row.match_score ?? row.matchScore,
    package: row.package || {},
    externalApplicationId: row.external_application_id || row.externalApplicationId,
    failureReason: row.failure_reason || row.failureReason,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt
  };
}

export async function saveCachedJobs(jobs, { ttlHours = 24 } = {}) {
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
  const normalizedJobs = (jobs || []).filter((job) => job?.id).map(enrichJobForDedupe);
  if (!normalizedJobs.length) return [];

  if (usePostgres()) {
    await ensureSchema();
    const db = getPool();
    for (const job of normalizedJobs) {
      await db.query(
        `insert into job_cache (id, source, canonical_job_key, data, expires_at, updated_at)
         values ($1, $2, $3, $4, $5, now())
         on conflict (id) do update
         set source = excluded.source,
             canonical_job_key = excluded.canonical_job_key,
             data = excluded.data,
             expires_at = excluded.expires_at,
             updated_at = now()`,
        [job.id, job.source || null, job.canonicalJobKey || null, job, expiresAt]
      );
    }
    return normalizedJobs;
  }

  const data = await readJson();
  data.jobs = data.jobs || [];
  for (const job of normalizedJobs) {
    const record = {
      id: job.id,
      source: job.source || null,
      canonicalJobKey: job.canonicalJobKey || null,
      data: job,
      expiresAt,
      updatedAt: new Date().toISOString()
    };
    const index = data.jobs.findIndex((item) => item.id === job.id);
    if (index === -1) {
      data.jobs.push(record);
    } else {
      data.jobs[index] = { ...data.jobs[index], ...record };
    }
  }
  await writeJson(data);
  return normalizedJobs;
}

export async function getCachedJob(jobId) {
  if (!jobId) return null;

  if (usePostgres()) {
    await ensureSchema();
    const result = await getPool().query(
      "select data from job_cache where id = $1 and (expires_at is null or expires_at > now())",
      [jobId]
    );
    return result.rows[0]?.data || null;
  }

  const data = await readJson();
  const record = (data.jobs || []).find((item) => item.id === jobId);
  if (!record) return null;
  if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) return null;
  return record.data || null;
}

export async function updateApplication(userId, applicationId, updates) {
  if (usePostgres()) {
    await ensureSchema();
    const current = (await listApplications(userId)).find((item) => item.id === applicationId);
    if (!current) return null;
    const next = { ...current, ...updates, updatedAt: new Date().toISOString() };
    await getPool().query(
      `update applications
       set status = $3, external_application_id = $4, failure_reason = $5, updated_at = now()
       where user_id = $1 and id = $2`,
      [userId, applicationId, next.status, next.externalApplicationId || null, next.failureReason || null]
    );
    return next;
  }
  const data = await readJson();
  const index = data.applications.findIndex((item) => item.userId === userId && item.id === applicationId);
  if (index === -1) return null;
  data.applications[index] = {
    ...data.applications[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  await writeJson(data);
  return data.applications[index];
}

export async function addAudit({ userId, eventType, message, metadata = {} }) {
  const event = {
    id: id("evt"),
    userId,
    eventType,
    message,
    metadata,
    createdAt: new Date().toISOString()
  };

  if (usePostgres()) {
    await ensureSchema();
    await getPool().query(
      "insert into audit (id, user_id, event_type, message, metadata) values ($1, $2, $3, $4, $5)",
      [event.id, userId, eventType, message, metadata]
    );
    return event;
  }
  const data = await readJson();
  data.audit.push(event);
  await writeJson(data);
  return event;
}

export async function saveFeedback({ userId = null, name = "", email = "", type = "Other", rating = 5, message = "" }) {
  const item = {
    id: id("fb"),
    userId,
    name,
    email,
    type,
    rating: Math.max(1, Math.min(5, Number(rating) || 5)),
    message,
    createdAt: new Date().toISOString()
  };

  if (usePostgres()) {
    await ensureSchema();
    await getPool().query(
      `insert into feedback (id, user_id, name, email, feedback_type, rating, message)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [item.id, userId, name, email, type, item.rating, message]
    );
    return item;
  }

  const data = await readJson();
  data.feedback = data.feedback || [];
  data.feedback.push(item);
  await writeJson(data);
  return item;
}
