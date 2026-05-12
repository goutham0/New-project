import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import pg from "pg";

const { Pool } = pg;
const dataDir = path.join(process.cwd(), ".local-data");
const dataFile = path.join(dataDir, "app.json");

let pool;
let schemaReady = false;

const emptyData = {
  users: [],
  profiles: [],
  resumes: [],
  applications: [],
  audit: []
};

function usePostgres() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false }
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

    create table if not exists audit (
      id text primary key,
      user_id text,
      event_type text not null,
      message text not null,
      metadata jsonb not null default '{}'::jsonb,
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

export async function saveResume({ userId, fileName, fileType, content }) {
  const resume = {
    id: id("res"),
    userId,
    fileName,
    fileType,
    content,
    createdAt: new Date().toISOString()
  };

  if (usePostgres()) {
    await ensureSchema();
    await getPool().query(
      "insert into resumes (id, user_id, file_name, file_type, content) values ($1, $2, $3, $4, $5)",
      [resume.id, userId, fileName, fileType, content]
    );
    return resume;
  }
  const data = await readJson();
  data.resumes.push(resume);
  await writeJson(data);
  return resume;
}

export async function getLatestResume(userId) {
  if (usePostgres()) {
    await ensureSchema();
    const result = await getPool().query(
      "select * from resumes where user_id = $1 order by created_at desc limit 1",
      [userId]
    );
    const row = result.rows[0];
    return row
      ? {
          id: row.id,
          userId: row.user_id,
          fileName: row.file_name,
          fileType: row.file_type,
          content: row.content,
          createdAt: row.created_at
        }
      : null;
  }
  const data = await readJson();
  return data.resumes.filter((resume) => resume.userId === userId).at(-1) || null;
}

export async function listApplications(userId) {
  if (usePostgres()) {
    await ensureSchema();
    const result = await getPool().query(
      "select * from applications where user_id = $1 order by created_at desc",
      [userId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      jobId: row.job_id,
      applicationType: row.application_type,
      status: row.status,
      matchScore: row.match_score,
      package: row.package,
      externalApplicationId: row.external_application_id,
      failureReason: row.failure_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
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
    await getPool().query(
      `insert into applications
       (id, user_id, job_id, application_type, status, match_score, package, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, now(), now())`,
      [item.id, item.userId, item.jobId, item.applicationType, item.status, item.matchScore, item.package]
    );
    return item;
  }
  const data = await readJson();
  data.applications.push(item);
  await writeJson(data);
  return item;
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
