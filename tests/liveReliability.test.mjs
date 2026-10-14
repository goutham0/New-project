import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import fs from "node:fs/promises";
import { fetchAdzunaJobs } from "../lib/adzuna.js";
import { generateTailoredResume } from "../lib/openaiResume.js";
import { extractResumeText } from "../lib/resumeText.js";
import { validateTailoredResume } from "../lib/resumePipeline.js";
import { resumeToPlainText } from "../lib/pdf.js";

test("same Adzuna job keeps identity across apply modes and preserves description", async () => {
  const savedFetch = global.fetch;
  const oldId = process.env.ADZUNA_APP_ID;
  const oldKey = process.env.ADZUNA_APP_KEY;
  process.env.ADZUNA_APP_ID = "test";
  process.env.ADZUNA_APP_KEY = "test";
  global.fetch = async () => Response.json({ count: 1, results: [{ id: "123", title: "Developer", description: "Detailed requirements. ".repeat(60) }] });
  try {
    const manual = await fetchAdzunaJobs({ mode: "manual" });
    const assisted = await fetchAdzunaJobs({ mode: "assisted" });
    assert.equal(manual.jobs[0].id, assisted.jobs[0].id);
    assert.equal(manual.jobs[0].directApplySupported, false);
    assert.ok(manual.jobs[0].description.length > 520);
  } finally {
    global.fetch = savedFetch;
    if (oldId === undefined) delete process.env.ADZUNA_APP_ID; else process.env.ADZUNA_APP_ID = oldId;
    if (oldKey === undefined) delete process.env.ADZUNA_APP_KEY; else process.env.ADZUNA_APP_KEY = oldKey;
  }
});

test("resume rewriting keeps all roles and more than nine bullets without padding", async () => {
  const savedFetch = global.fetch;
  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test";
  const source = {
    candidateName: "Alex Example", contactLine: "alex@example.invalid", targetRole: "Engineer",
    professionalSummary: "Software engineer experienced in Java and SQL systems with a focus on reliable service delivery and testing.",
    skills: [{ label: "Languages", items: ["Java", "SQL"] }],
    experience: Array.from({ length: 5 }, (_, index) => ({ company: `Example ${index}`, title: "Engineer", location: "Austin, TX", dates: `${2010 + index} - ${2011 + index}`, bullets: Array.from({ length: 12 }, (_, number) => `Built Java service ${number} and tested SQL integrations for business workflows.`) })),
    education: [], projects: [], certifications: [], coursework: [], atsKeywords: [], screeningAnswers: [], notes: [], coverLetter: ""
  };
  global.fetch = async () => Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(source) } }] });
  try {
    const result = await generateTailoredResume({ resumeText: "Original resume with five employers and detailed project history.", jobDescription: "Java engineer", requireAi: true });
    assert.equal(result.aiUsed, true);
    assert.equal(result.experience.length, 5);
    assert.equal(result.experience[0].bullets.length, 12);
    assert.deepEqual(result.experience, source.experience);
    assert.match(resumeToPlainText({ ...result, targetPageCount: 1 }), /Built Java service 11/);
  } finally {
    global.fetch = savedFetch;
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey;
  }
});

test("missing employer invalidates a tailored resume", () => {
  assert.equal(validateTailoredResume({ experience: [{ company: "Example", dates: "2020 - 2023" }] }, { experience: [] }).valid, false);
});

test("unreadable PDF is rejected instead of returning raw PDF syntax", async () => {
  const bytes = Buffer.from("%PDF-1.4\n" + "binary object stream ".repeat(30));
  await assert.rejects(extractResumeText({ name: "scan.pdf", arrayBuffer: async () => bytes }), /No readable text/);
});

test("autofill does not reverse negative authorization or guess technology experience", async () => {
  const context = { window: {} };
  vm.runInNewContext(await fs.readFile(new URL("../extension/src/fieldMappingEngine.js", import.meta.url), "utf8"), context);
  const mapping = context.window.ApplyFriendFieldMapping;
  assert.equal(mapping.choiceValueFor("Are you authorized to work?", { workAuthorization: "Not authorized" }, {}), "no");
  assert.equal(mapping.choiceMatches("No", "Not authorized"), true);
  assert.equal(mapping.choiceMatches("Yes", "Not authorized"), false);
  assert.equal(mapping.valueFor("Years of Java experience", { yearsExperience: 10 }, {}), "");
});
