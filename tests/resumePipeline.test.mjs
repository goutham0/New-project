import assert from "node:assert/strict";
import test from "node:test";
import mammoth from "mammoth";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { extractResumeText } from "../lib/resumeText.js";
import { parseResumeTextToJson, tailorResumeToDocx, validateTailoredResume } from "../lib/resumePipeline.js";

test("DOCX resume parses, tailors truthfully, and renders a valid DOCX", async () => {
  const originalText = [
    "Goutham Vemula",
    "Email: vemulagoutham9@gmail.com Phone: (806) 401-7433",
    "PROFESSIONAL SUMMARY",
    "Senior Software Engineer experienced in Angular, TypeScript, .NET Core, SQL Server, OpenShift, REST APIs, and enterprise delivery.",
    "TECHNICAL SKILLS",
    "Languages: Java, C#, TypeScript, JavaScript, SQL",
    "Frameworks: Spring Boot, .NET Core, Angular, Node.js",
    "Cloud/DevOps: OpenShift, Kubernetes, Docker, CI/CD",
    "PROFESSIONAL EXPERIENCE",
    "Bank of America, Plano, TX Nov 2024 - Present Application Programmer",
    "Designed enterprise credit-risk applications using .NET Core, C#, Angular, TypeScript, SQL Server, OpenShift, and REST APIs.",
    "Developed reusable Angular components, backend services, SQL procedures, and production-ready release documentation.",
    "United Health Group, Dallas, TX Apr 2024 - Oct 2024 Full Stack Developer",
    "Built enterprise applications using C#, .NET Core, Angular, TypeScript, Node.js, SQL, and automation workflows.",
    "Collaborated with product and QA teams to test features, resolve defects, and support reliable deployments.",
    "EDUCATION",
    "Texas Tech University Master of Science 2024"
  ].join("\n");

  const sourceDocx = await Packer.toBuffer(new Document({
    sections: [{ children: originalText.split("\n").map((line) => new Paragraph({ children: [new TextRun(line)] })) }]
  }));
  const fakeFile = {
    name: "resume.docx",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    arrayBuffer: async () => sourceDocx.buffer.slice(sourceDocx.byteOffset, sourceDocx.byteOffset + sourceDocx.byteLength)
  };

  const extractedText = await extractResumeText(fakeFile);
  assert.match(extractedText, /Bank of America/);
  assert.match(extractedText, /United Health Group/);

  const parsed = parseResumeTextToJson(extractedText, { firstName: "Goutham", lastName: "Vemula" });
  assert.equal(parsed.experience.length, 2);

  const jobDescription = "Senior Java Full Stack Developer with Java, Spring Boot, Angular, TypeScript, SQL, REST APIs, CI/CD, Kubernetes, OpenShift, and Agile delivery.";
  const result = await tailorResumeToDocx({
    resumeText: extractedText,
    parsedResume: parsed,
    candidateProfile: { firstName: "Goutham", lastName: "Vemula" },
    jobDescription,
    useAi: false
  });

  assert.ok(result.docx.buffer.length > 1000);
  assert.equal(result.docx.buffer.slice(0, 2).toString("utf8"), "PK");
  assert.equal(result.validation.valid, true);
  assert.equal(validateTailoredResume(parsed, result.tailoredResume).valid, true);

  const rendered = await mammoth.extractRawText({ buffer: result.docx.buffer });
  assert.match(rendered.value, /Bank of America/);
  assert.match(rendered.value, /United Health Group/);
  assert.doesNotMatch(rendered.value, /Google|Microsoft/);
});
