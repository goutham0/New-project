import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeApplyUrl, dedupeJobs, enrichJobForDedupe } from "../lib/jobDedupe.js";

test("canonicalizeApplyUrl removes tracking params", () => {
  const url = canonicalizeApplyUrl("https://example.com/jobs/123?utm_source=x&gh_src=y&keep=1#section");
  assert.equal(url, "https://example.com/jobs/123?keep=1");
});

test("dedupeJobs removes duplicate external jobs and preserves one primary job", () => {
  const jobs = dedupeJobs([
    {
      id: "a",
      source: "Adzuna",
      externalJobId: "123",
      company: "Bank of America Inc.",
      title: "Senior Software Developer",
      location: "Plano, TX",
      description: "Build APIs.",
      applyUrl: "https://example.com/a?utm_source=adzuna",
      skills: ["Java"]
    },
    {
      id: "b",
      source: "Adzuna",
      externalJobId: "123",
      company: "Bank of America",
      title: "Sr. Software Dev",
      location: "Plano, TX",
      description: "Build APIs.",
      applyUrl: "https://example.com/a?utm_medium=cpc",
      skills: ["Spring Boot"]
    }
  ]);

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].id, "a");
  assert.deepEqual(jobs[0].skills.sort(), ["Java", "Spring Boot"].sort());
});

test("enrichJobForDedupe creates stable canonical key without external id", () => {
  const first = enrichJobForDedupe({
    id: "one",
    company: "United Health Group LLC",
    title: "Full Stack Developer",
    location: "Remote",
    description: "Angular and APIs",
    applyUrl: "https://example.com/job?utm_campaign=test"
  });
  const second = enrichJobForDedupe({
    id: "two",
    company: "United Health Group",
    title: "Full Stack Developer",
    location: "remote",
    description: "Angular and APIs",
    applyUrl: "https://example.com/job?ref=abc"
  });

  assert.equal(first.canonicalJobKey, second.canonicalJobKey);
});
