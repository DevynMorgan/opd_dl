import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { db, ensureSchema } from "../../../../lib/db";
import { requireAdmin } from "../../../../lib/auth";

const hashPassword = (password: string, salt: string) => createHash("sha256").update(`${salt}${password}`).digest("hex");
const esc = (value: string) => value.replace(/'/g, "''");

export async function GET() {
  try {
    await requireAdmin();
    await ensureSchema();
    const result = await db().query(`SELECT id,username,role,active,created_at FROM opd_admin_users ORDER BY CASE WHEN role='ADMIN' THEN 0 ELSE 1 END, username`);
    return NextResponse.json(result.rows);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    console.error(error);
    return NextResponse.json({ error: "Unable to load users." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    await ensureSchema();
    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!username || !/^[a-z0-9._-]{3,32}$/.test(username)) return NextResponse.json({ error: "Username must be 3-32 characters using letters, numbers, dots, underscores, or hyphens." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    const role = body.role === "ADMIN" ? "ADMIN" : "OFFICER";
    const salt = randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt);
    const result = await db().query(`INSERT INTO opd_admin_users (username,password_salt,password_hash,role,active) VALUES ('${esc(username)}','${salt}','${passwordHash}','${role}',TRUE) RETURNING id,username,role,active,created_at`);
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    if (String(error).includes("duplicate key")) return NextResponse.json({ error: "That username already exists." }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Unable to create user." }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    await ensureSchema();
    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Invalid user." }, { status: 400 });
    if (body.action === "toggle") {
      const result = await db().query(`UPDATE opd_admin_users SET active=NOT active WHERE id=${id} RETURNING id,username,role,active,created_at`);
      return NextResponse.json(result.rows[0] || {}, { status: result.rows.length ? 200 : 404 });
    }
    if (body.action === "reset_password") {
      const password = typeof body.password === "string" ? body.password : "";
      if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
      const salt = randomBytes(16).toString("hex");
      const passwordHash = hashPassword(password, salt);
      const result = await db().query(`UPDATE opd_admin_users SET password_salt='${salt}',password_hash='${passwordHash}' WHERE id=${id} RETURNING id,username,role,active,created_at`);
      return NextResponse.json(result.rows[0] || {}, { status: result.rows.length ? 200 : 404 });
    }
    return NextResponse.json({ error: "Unknown user action." }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    console.error(error);
    return NextResponse.json({ error: "Unable to update user." }, { status: 503 });
  }
}
