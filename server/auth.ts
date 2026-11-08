import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import type { User } from "../drizzle/schema";
import * as db from "./db";
import { ENV } from "./_core/env";

const scryptAsync = promisify(scrypt);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

/** Passwords are hashed with scrypt (salt stored inline: salt:hash). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  return (
    derived.length === expected.length && timingSafeEqual(derived, expected)
  );
}

// ---------------------------------------------------------------------------
// Sessions (signed JWT stored in the httpOnly session cookie)
// ---------------------------------------------------------------------------

const getSessionKey = () => new TextEncoder().encode(ENV.cookieSecret);

export async function createSessionToken(
  openId: string,
  name: string
): Promise<string> {
  return new SignJWT({ openId, name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
    .sign(getSessionKey());
}

export type SessionClaims = { openId: string; name: string };

export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionKey(), {
      algorithms: ["HS256"],
    });
    const { openId, name } = payload as Record<string, unknown>;
    if (!isNonEmptyString(openId)) return null;
    return { openId, name: isNonEmptyString(name) ? name : "" };
  } catch {
    return null;
  }
}

function extractSessionToken(req: Request): string | undefined {
  const cookies = (req.headers.cookie ?? "")
    .split(";")
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const eq = part.indexOf("=");
      return eq === -1
        ? { key: part, value: "" }
        : {
            key: part.slice(0, eq),
            value: decodeURIComponent(part.slice(eq + 1)),
          };
    });
  const fromCookie = cookies.find(entry => entry.key === COOKIE_NAME)?.value;

  // Fallback: Authorization header (curl / API clients).
  if (fromCookie) return fromCookie;
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return undefined;
}

export async function authenticateRequest(req: Request): Promise<User | null> {
  const claims = await verifySessionToken(extractSessionToken(req));
  if (!claims) return null;
  const user = await db.getUserByOpenId(claims.openId);
  if (!user) return null;
  return user;
}

// ---------------------------------------------------------------------------
// Account creation
// ---------------------------------------------------------------------------

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

/** The first registered account becomes admin (or ADMIN_EMAIL if configured). */
async function resolveRole(email: string): Promise<"admin" | "user"> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail && email === adminEmail) return "admin";
  const count = await db.countUsers();
  return count === 0 ? "admin" : "user";
}

export async function registerUser(
  input: RegisterInput
): Promise<{ user: User; token: string } | { error: string }> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "invalid_email" };
  if (input.password.length < 8) return { error: "password_too_short" };

  const existing = await db.getUserByEmail(email);
  if (existing) return { error: "email_taken" };

  await db.ensureDbOrThrow();
  const openId = `local_${nanoid(20)}`;
  await db.createUser({
    openId,
    name: input.name.trim() || email.split("@")[0],
    email,
    passwordHash: await hashPassword(input.password),
    loginMethod: "password",
    role: await resolveRole(email),
    lastSignedIn: new Date(),
  });
  const created = await db.getUserByOpenId(openId);
  if (!created) return { error: "creation_failed" };
  return {
    user: created,
    token: await createSessionToken(openId, created.name ?? ""),
  };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: User; token: string } | { error: string }> {
  const normalized = email.trim().toLowerCase();
  const user = await db.getUserByEmail(normalized);
  if (!user?.passwordHash) return { error: "invalid_credentials" };
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { error: "invalid_credentials" };
  await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
  return {
    user,
    token: await createSessionToken(user.openId, user.name ?? ""),
  };
}
