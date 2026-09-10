import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db, ensureSchema } from "./db";

const COOKIE_NAME = "opd_session";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actual = createHash("sha256").update(`${salt}${password}`).digest();
  const expected = Buffer.from(expectedHash, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

export async function login(username: string, password: string) {
  await ensureSchema();
  const normalized = username.trim().toLowerCase();
  const result = await db().query(`SELECT id,username,password_salt,password_hash,role FROM opd_admin_users WHERE LOWER(username)='${normalized.replace(/'/g, "''")}' AND active=TRUE LIMIT 1`);
  const user = result.rows[0];
  if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) return null;

  const token = randomBytes(32).toString("hex");
  await db().query(`INSERT INTO opd_sessions (token_hash,user_id,expires_at) VALUES ('${hash(token)}',${user.id},NOW()+INTERVAL '7 days')`);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return { username: user.username, role: user.role };
}

export async function getCurrentUser() {
  await ensureSchema();
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const result = await db().query(`SELECT u.id,u.username,u.role FROM opd_sessions s JOIN opd_admin_users u ON u.id=s.user_id WHERE s.token_hash='${hash(token)}' AND s.expires_at>NOW() AND u.active=TRUE LIMIT 1`);
  return result.rows[0] || null;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("UNAUTHORIZED");
  return user;
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) {
    await ensureSchema();
    await db().query(`DELETE FROM opd_sessions WHERE token_hash='${hash(token)}'`);
  }
  jar.set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}
