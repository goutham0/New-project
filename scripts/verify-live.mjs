import assert from "node:assert/strict";
import crypto from "node:crypto";
import pg from "pg";
import { Document, Paragraph, Packer } from "docx";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const email = `applyfriend-test-${crypto.randomUUID()}@example.invalid`;
const password = crypto.randomBytes(24).toString("base64url");
let cookie = "";
let userId;
const jobId = `verification-${crypto.randomUUID()}`;
async function request(route, body, method = "POST") {
  const response = await fetch(`${base}${route}`, { method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }) }, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body), signal: AbortSignal.timeout(290000) });
  const data = await response.json();
  return { response, data };
}
try {
  assert.equal((await request("/api/resumes", undefined, "GET")).response.status, 401);
  const signup = await request("/api/auth/signup", { email, password, name: "Verification Candidate" });
  assert.equal(signup.response.status, 200, signup.data.error);
  userId = signup.data.user.id;
  cookie = signup.response.headers.get("set-cookie").split(";")[0];
  assert.equal((await request("/api/candidate/profile", undefined, "GET")).response.status, 200);
  console.log("PASS signup and authenticated profile");
  const text = "Alex Example\nPROFESSIONAL SUMMARY\nSoftware engineer building reliable Java services and SQL applications.\nTECHNICAL SKILLS\nLanguages: Java, SQL\nPROFESSIONAL EXPERIENCE\nExample Company, Austin, TX Jan 2020 - Present Software Engineer\nDeveloped Java services and tested SQL queries for reporting workflows.\nEDUCATION\nExample University Bachelor of Science 2019";
  const buffer = await Packer.toBuffer(new Document({ sections: [{ children: text.split("\n").map((line) => new Paragraph(line)) }] }));
  const form = new FormData();
  form.set("resume", new Blob([buffer]), "verification-resume.docx");
  const upload = await request("/api/resumes/upload", form);
  assert.equal(upload.response.status, 200, upload.data.error);
  assert.match(upload.data.resume.originalFilePath, /^postgres:/);
  const parsed = await request(`/api/resumes/${upload.data.resume.id}`, undefined, "GET");
  assert.match(parsed.data.resume.parsedText, /Example Company/);
  const original = await fetch(`${base}/api/resumes/${upload.data.resume.id}?download=1`, { headers: { Cookie: cookie } });
  assert.equal(original.status, 200);
  assert.deepEqual(Buffer.from(await original.arrayBuffer()), buffer);
  console.log("PASS original DOCX stored persistently and parsed");
  assert.equal((await request("/api/applications/submit", { applicationIds: ["not-real"], action: "submit", consentConfirmed: true })).response.status, 409);
  console.log("PASS unsupported direct submission blocked");
  const feedback = await request("/api/feedback", { name: "Verification", email, message: "Automated verification feedback", type: "Bug", rating: 5 });
  assert.equal(feedback.data.stored, true);
  if (process.env.TEST_AI === "true") {
    const generated = await request("/api/ai/tailor", { resumeText: text, jobDescription: "Software Engineer building reliable Java services and SQL reporting. Experience writing tests and maintaining reporting workflows." });
    assert.equal(generated.response.status, 200, JSON.stringify(generated.data));
    assert.equal(generated.data.result.aiUsed, true);
    assert.equal(Buffer.from(generated.data.docxBase64, "base64").subarray(0, 2).toString(), "PK");
    assert.equal(Buffer.from(generated.data.pdfBase64, "base64").subarray(0, 4).toString(), "%PDF");
    assert.ok(generated.data.result.experience.some((role) => role.company === "Example Company"));
    const download = await fetch(`${base}${generated.data.downloadUrl}`, { headers: { Cookie: cookie } });
    assert.equal(download.status, 200);
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), Buffer.from(generated.data.docxBase64, "base64"));
    const scoreForm = new FormData();
    scoreForm.set("resumeText", text);
    scoreForm.set("jobDescription", "Software engineer using Java and SQL.");
    const score = await request("/api/ai/ats-score", scoreForm);
    assert.equal(score.response.status, 200);
    assert.equal(score.data.result.aiUsed, true);
    assert.ok(score.data.result.overallScore >= 0 && score.data.result.overallScore <= 100);
    console.log("PASS saved tailored download and live resume match analysis");
    console.log("PASS real AI generation and PDF/DOCX signatures");
    const profile = { firstName: "Alex", lastName: "Example", email, phone: "555-0100", city: "Austin", state: "TX", country: "United States", workAuthorization: "Requires confirmation", sponsorshipRequired: "Candidate must confirm", currentTitle: "Software Engineer", yearsExperience: "3", highestEducation: "Bachelor", targetTitles: "Software Engineer", preferredLocations: "Austin", remotePreference: "Any", expectedSalaryMin: "80000", expectedSalaryMax: "100000", noticePeriod: "2 weeks" };
    assert.equal((await request("/api/candidate/profile", { profile }, "PUT")).response.status, 200);
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL.replace("sslmode=require", "sslmode=verify-full"), connectionTimeoutMillis: 10000 });
    try {
      const job = { id: jobId, title: "Software Engineer", company: "Verification Employer", location: "Austin", description: "Develop Java services, test SQL queries and support reporting workflows.", skills: ["Java", "SQL"], questions: ["Are you authorized to work?"], applyType: "assisted", directApplySupported: false, applyUrl: "https://example.invalid/test-application" };
      await pool.query("insert into job_cache (id, source, data, expires_at) values ($1, 'Verification', $2, now() + interval '1 hour')", [jobId, job]);
    } finally { await pool.end(); }
    const preparations = await Promise.all([request("/api/applications/prepare", { jobIds: [jobId] }), request("/api/applications/prepare", { jobIds: [jobId] })]);
    assert.deepEqual(preparations.map((item) => item.response.status).sort(), [200, 409]);
    const application = preparations.find((item) => item.response.status === 200).data.applications[0];
    assert.equal(application.status, "NEEDS_REVIEW");
    const reused = await request("/api/applications/prepare", { jobIds: [jobId] });
    assert.equal(reused.data.applications[0].id, application.id);
    const packageResponse = await fetch(`${base}/api/extension/prepared-application?token=${encodeURIComponent(application.handoffToken)}`);
    assert.equal(packageResponse.status, 200);
    const marked = await request("/api/applications/submit", { applicationIds: [application.id], action: "manual" });
    assert.equal(marked.data.applications[0].status, "MANUAL_SUBMITTED");
    console.log("PASS concurrent preparation, idempotent retry, extension package and candidate-confirmed tracking");
  }
  const logout = await request("/api/auth/logout", {});
  assert.equal(logout.response.status, 200);
  cookie = "";
  assert.equal((await request("/api/resumes", undefined, "GET")).response.status, 401);
  const login = await request("/api/auth/login", { email, password });
  assert.equal(login.response.status, 200, login.data.error);
  console.log("PASS logout and returning-user login");
} finally {
  if (userId && process.env.DATABASE_URL) {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL.replace("sslmode=require", "sslmode=verify-full"), connectionTimeoutMillis: 10000 });
    try {
      // Only remove the synthetic account created by this run and its test records.
      await pool.query("delete from audit where user_id = $1", [userId]);
      await pool.query("delete from feedback where user_id = $1", [userId]);
      await pool.query("delete from request_limits where key = $1", [`ai:${userId}`]);
      await pool.query("delete from job_cache where id = $1 and source = 'Verification'", [jobId]);
      await pool.query("delete from users where id = $1 and email = $2", [userId, email]);
      console.log("Removed this run's synthetic test account");
    } finally { await pool.end(); }
  }
}
