import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "../../../lib/db";
import { getCurrentUser } from "../../../lib/auth";

export const dynamic = "force-dynamic";

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const sqlText = (value: unknown) => `'${clean(value).replace(/'/g, "''")}'`;
const sqlId = (value: unknown) => { const n = Number(value); return Number.isSafeInteger(n) && n > 0 ? String(n) : ""; };

const warrantStatuses = ["ACTIVE", "SERVED", "RECALLED", "QUASHED", "EXPIRED"];
const incidentStatuses = ["OPEN", "CLOSED", "SUSPENDED", "ACTIVE INVESTIGATION"];

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    await ensureSchema();

    const body = await request.json();
    const type = clean(body.type).toLowerCase();
    const id = sqlId(body.id);
    const status = clean(body.status).toUpperCase();

    if (!id || !["warrant", "incident"].includes(type)) {
      return NextResponse.json({ error: "A valid incident or warrant is required." }, { status: 400 });
    }

    const allowed = type === "warrant" ? warrantStatuses : incidentStatuses;
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: "Invalid status for this record type." }, { status: 400 });
    }

    const table = type === "warrant" ? "warrants" : "incidents";
    const result = await db().query(`UPDATE ${table} SET status=${sqlText(status)} WHERE id=${id} RETURNING *`);
    if (!result.rows.length) return NextResponse.json({ error: "Record not found." }, { status: 404 });

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not update case status." }, { status: 500 });
  }
}
