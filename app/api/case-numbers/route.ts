import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "../../../lib/db";
import { getCurrentUser } from "../../../lib/auth";

export const dynamic = "force-dynamic";

const clean = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : "";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    await ensureSchema();

    const type = clean(new URL(request.url).searchParams.get("type"));
    if (type !== "incident" && type !== "warrant") {
      return NextResponse.json({ error: "Type must be incident or warrant." }, { status: 400 });
    }

    const year = new Date().getFullYear();
    const p = db();
    const table = type === "incident" ? "incidents" : "warrants";
    const column = type === "incident" ? "incident_number" : "warrant_number";
    const pattern = type === "incident" ? `^OPD-${year}-[0-9]+$` : `^W-${year}-[0-9]+$`;
    const prefix = type === "incident" ? `OPD-${year}-` : `W-${year}-`;
    const result = await p.query(`
      SELECT COALESCE(MAX(CASE WHEN ${column} ~ $1 THEN CAST(SUBSTRING(${column} FROM LENGTH($2) + 1) AS INTEGER) ELSE 0 END),0) AS max_number,
             COALESCE(MAX(CASE WHEN ${column} ~ $1 THEN LENGTH(SUBSTRING(${column} FROM LENGTH($2) + 1)) ELSE 3 END),3) AS number_width
      FROM ${table}
    `, [pattern, prefix]);

    const next = Number(result.rows[0]?.max_number || 0) + 1;
    const width = Math.max(3, Number(result.rows[0]?.number_width || 3));
    const number = `${prefix}${String(next).padStart(width, "0")}`;
    return NextResponse.json({ type, number, year });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not determine the next case number." }, { status: 500 });
  }
}
