import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "../../../lib/db";
import { getCurrentUser, requireAdmin } from "../../../lib/auth";

export const dynamic = "force-dynamic";

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

async function ensureLicenseImageColumn() {
  await ensureSchema();
  await db().query("ALTER TABLE licenses ADD COLUMN IF NOT EXISTS license_image TEXT");
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    await ensureLicenseImageColumn();
    const params = new URL(request.url).searchParams;
    const id = clean(params.get("id"));
    const license = clean(params.get("license"));
    const p = db();
    let result;
    if (id && /^\d+$/.test(id)) {
      result = await p.query(`SELECT id,license_number,license_image FROM licenses WHERE id=${Number(id)} LIMIT 1`);
    } else if (license) {
      const escaped = license.replace(/'/g, "''");
      result = await p.query(`SELECT id,license_number,license_image FROM licenses WHERE license_number='${escaped}' LIMIT 1`);
    } else {
      return NextResponse.json({ error: "License ID or number is required." }, { status: 400 });
    }
    if (!result.rows.length) return NextResponse.json({ error: "License record not found." }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not load license image." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    await ensureLicenseImageColumn();
    const body = await request.json();
    const id = clean(body.id);
    const image = clean(body.image);
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: "A valid license ID is required." }, { status: 400 });
    if (!image.startsWith("data:image/")) return NextResponse.json({ error: "Please upload a valid image." }, { status: 400 });
    if (image.length > 4200000) return NextResponse.json({ error: "Image is too large. Please use a smaller image." }, { status: 413 });
    const escaped = image.replace(/'/g, "''");
    const result = await db().query(`UPDATE licenses SET license_image='${escaped}' WHERE id=${Number(id)} RETURNING id,license_number,license_image`);
    if (!result.rows.length) return NextResponse.json({ error: "License record not found." }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Administrator access required." }, { status: 401 });
    console.error(error);
    return NextResponse.json({ error: "Could not save license image." }, { status: 500 });
  }
}
