"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db, users } from "@/lib/db";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth";
import { newId } from "@/lib/ids";
import { clean } from "@/lib/validate";
import { rateLimit } from "@/lib/ratelimit";

// Constant-cost comparison target for unknown emails, so login timing doesn't
// reveal whether an account exists.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

async function authRateLimited(bucket: string): Promise<boolean> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "unknown";
  return !rateLimit(`${bucket}:${ip}`, 10, 60_000);
}

export async function signup(formData: FormData) {
  if (await authRateLimited("signup")) redirect("/signup?error=Too many attempts. Wait a minute and try again.");
  const name = clean(formData.get("name"));
  const email = clean(formData.get("email")).toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (name.length < 2) redirect("/signup?error=Enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/signup?error=Enter a valid email.");
  if (password.length < 8) redirect("/signup?error=Password needs at least 8 characters.");

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) redirect("/signup?error=An account with that email already exists.");

  const id = newId();
  await db.insert(users).values({
    id,
    email,
    name,
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: Date.now(),
  });
  await setSessionCookie(id);
  redirect("/teacher");
}

export async function login(formData: FormData) {
  if (await authRateLimited("login")) redirect("/login?error=Too many attempts. Wait a minute and try again.");
  const email = clean(formData.get("email")).toLowerCase();
  const password = String(formData.get("password") ?? "");

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    redirect("/login?error=Wrong email or password.");
  }
  await setSessionCookie(user.id);
  redirect("/teacher");
}

export async function logout() {
  await clearSessionCookie();
  redirect("/");
}
