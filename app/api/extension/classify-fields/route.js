import { NextResponse } from "next/server";
import { currentUser, userFromExtensionRequest } from "@/lib/auth";

export async function POST(request) {
  const user = (await currentUser()) || (await userFromExtensionRequest(request));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const fields = Array.isArray(body.fields) ? body.fields : [];
  return NextResponse.json({
    classifications: fields.map((field) => classifyField(field))
  });
}

function classifyField(field = {}) {
  const text = normalize([field.label, field.name, field.id, field.placeholder, field.type].filter(Boolean).join(" "));
  const mappings = [
    ["firstName", 0.95, /\bfirst name\b/],
    ["lastName", 0.95, /\blast name\b/],
    ["email", 0.95, /\bemail\b/],
    ["phone", 0.9, /\b(phone|mobile|telephone)\b/],
    ["address", 0.86, /\baddress\b/],
    ["city", 0.86, /\bcity\b/],
    ["state", 0.86, /\bstate\b/],
    ["zipCode", 0.86, /\b(zip|postal)\b/],
    ["linkedinUrl", 0.9, /\blinkedin\b/],
    ["githubUrl", 0.88, /\bgithub\b/],
    ["portfolioUrl", 0.82, /\b(portfolio|website)\b/],
    ["workAuthorization", 0.82, /\b(authori[sz]ed|work authorization|eligible to work)\b/],
    ["sponsorshipRequired", 0.82, /\b(sponsor|visa)\b/],
    ["coverLetter", 0.82, /\bcover letter|additional information|anything else\b/],
    ["yearsExperience", 0.78, /\byears.*experience\b/]
  ];
  const match = mappings.find(([, , pattern]) => pattern.test(text));
  return {
    fieldId: field.id || field.name || "",
    mapping: match?.[0] || "",
    confidence: match?.[1] || 0,
    requiresConfirmation: !match || match[1] < 0.7
  };
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
