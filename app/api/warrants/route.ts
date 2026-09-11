import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "../../../lib/db";
import { requireAdmin } from "../../../lib/auth";

export const dynamic = "force-dynamic";

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const text = (value: unknown) => `'${clean(value).replace(/'/g, "''")}'`;
const nullableText = (value: unknown) => clean(value) ? text(value) : "NULL";
const nullableDate = (value: unknown) => clean(value) ? `${text(value)}::date` : "NULL";
const nullableTimestamp = (value: unknown) => clean(value) ? `${text(value)}::timestamptz` : "NULL";
const nullableBigInt = (value: unknown) => { const n = Number(value); return Number.isSafeInteger(n) ? String(n) : "NULL"; };

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    await ensureSchema();
    const body = await request.json();
    const p = db();

    await p.query(`
      ALTER TABLE warrants ADD COLUMN IF NOT EXISTS warrant_type TEXT;
      ALTER TABLE warrants ADD COLUMN IF NOT EXISTS charge TEXT;
      ALTER TABLE warrants ADD COLUMN IF NOT EXISTS expiration_date DATE;
      ALTER TABLE warrants ADD COLUMN IF NOT EXISTS bond TEXT;
      ALTER TABLE warrants ADD COLUMN IF NOT EXISTS case_number TEXT;
      ALTER TABLE warrants ADD COLUMN IF NOT EXISTS issuing_authority TEXT;
    `);

    const warrantNumber = clean(body.warrant_number);
    const charge = clean(body.charge);
    const title = charge || clean(body.title);
    if (!warrantNumber || !title) return NextResponse.json({ error: "Warrant number and charge / reason are required." }, { status: 400 });

    const issuedAt = clean(body.issued_at) ? body.issued_at : new Date().toISOString();
    const officer = clean(body.officer) || user.username;
    const personId = nullableBigInt(body.person_id);

    const result = await p.query(`
      INSERT INTO warrants (
        person_id,warrant_number,title,priority,status,issued_at,location,officer,notes,
        warrant_type,charge,expiration_date,bond,case_number,issuing_authority
      ) VALUES (
        ${personId},${text(warrantNumber)},${text(title)},${text(clean(body.priority) || "STANDARD")},
        ${text(clean(body.status) || "ACTIVE")},${nullableTimestamp(issuedAt)},${nullableText(body.location)},${text(officer)},${nullableText(body.notes)},
        ${nullableText(body.warrant_type)},${text(charge || title)},${nullableDate(body.expiration_date)},${nullableText(body.bond)},${nullableText(body.case_number)},${nullableText(body.issuing_authority)}
      ) RETURNING *
    `);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    console.error(error);
    const detail = error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json({ error: `Could not create warrant: ${detail}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    await ensureSchema();
    const body = await request.json();
    const id = Number(body.id);
    const warrantNumber = clean(body.warrant_number);
    if (!Number.isSafeInteger(id) && !warrantNumber) return NextResponse.json({ error: "Invalid warrant." }, { status: 400 });
    const where = Number.isSafeInteger(id) ? `id=${id}` : `warrant_number=${text(warrantNumber)}`;
    const result = await db().query(`DELETE FROM warrants WHERE ${where} RETURNING id`);
    if (!result.rows.length) return NextResponse.json({ error: "Warrant not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    console.error(error);
    return NextResponse.json({ error: "Could not delete warrant." }, { status: 500 });
  }
}
