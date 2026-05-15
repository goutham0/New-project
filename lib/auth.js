import crypto from "crypto";
import { cookies } from "next/headers";
import { getUserById } from "@/lib/store";

const cookieName = "applypilot_session";
const sessionMaxAge = 60 * 60 * 24 * 30;

function secret() {
  return process.env.SESSION_SECRET || "dev-only-change-this-secret-before-deploy";
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const candidate = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256");
  const storedBuffer = Buffer.from(hash, "hex");
  return storedBuffer.length === candidate.length && crypto.timingSafeEqual(storedBuffer, candidate);
}

function sign(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verify(token) {
  if (!token || !token.includes(".")) return null;
  const [encoded, signature] = token.split(".");
  const expected = crypto.createHmac("sha256", secret()).update(encoded).digest("base64url");
  if (Buffer.byteLength(signature) !== Buffer.byteLength(expected)) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  if (payload.expiresAt && Date.now() > payload.expiresAt) return null;
  return payload;
}

export function setSessionCookie(response, user, request) {
  const token = sign({
    userId: user.id,
    email: user.email,
    expiresAt: Date.now() + 1000 * sessionMaxAge
  });
  response.cookies.set(cookieName, token, cookieOptions(sessionMaxAge, request));
}

function cookieOptions(maxAge, request) {
  const configuredDomain = process.env.COOKIE_DOMAIN;
  const hostname = request ? new URL(request.url).hostname : "";
  const domainName = configuredDomain?.replace(/^\./, "");
  const options = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge
  };

  if (configuredDomain && hostname.endsWith(domainName)) {
    options.domain = configuredDomain;
  }

  return options;
}

export function createExtensionToken(user) {
  return sign({
    userId: user.id,
    email: user.email,
    scope: "extension",
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30
  });
}

export async function userFromExtensionRequest(request) {
  const header = request.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  const payload = verify(token);
  if (payload?.scope !== "extension" || !payload.userId) return null;
  return getUserById(payload.userId);
}

export function clearSessionCookie(response, request) {
  response.cookies.set(cookieName, "", cookieOptions(0, request));
}

export async function currentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  const payload = verify(token);
  if (!payload?.userId) return null;
  return getUserById(payload.userId);
}
