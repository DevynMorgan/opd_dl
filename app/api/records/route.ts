import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "../../../lib/db";
import { getCurrentUser, requireAdmin } from "../../../lib/auth";

export const dynamic = "force-dynamic";
const categories = ["people", "licenses", "warrants", "incidents", "messages"] as const;
type Category = typeof categories[number];
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const isCategory = (value: string): value is Category => categories.includes(value as Category);
const sqlText = (value: unknown) => `'${clean(value).replace(/'/g, "''")}'`;
const sqlNullableText = (value: unknown) => { const text = clean(value); return text ? sqlText(text) : "NULL"; };
const sqlNullableDate = (value: unknown) => { const text = clean(value); return text ? `${sqlText(text)}::date` : "NULL"; };
const sqlNullableTimestamp = (value: unknown) => { const text = clean(value); return text ? `${sqlText(text)}::timestamptz` : "NULL"; };
const sqlNullableBigInt = (value: unknown) => { if (value === null || value === undefined || value === "") return "NULL"; const n = Number(value); return Number.isSafeInteger(n) ? String(n) : "NULL"; };
const unauthorized = (error: unknown) => error instanceof Error && error.message === "UNAUTHORIZED";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("UNAUTHORIZED");
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    const type = clean(searchParams.get("type") || "people");
    const q = clean(searchParams.get("q"));
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 200);
    const p = db();
    if (!isCategory(type)) return NextResponse.json({ error: "Unknown record type" }, { status: 400 });
    const search = sqlText(q);
    const limitSql = String(Math.trunc(limit));
    if (type === "people") {
      const result = await p.query(`SELECT p.*, COALESCE(l.license_number,'') AS license_number, COALESCE(l.license_class,'') AS license_class, COALESCE(l.status,'NO LICENSE') AS license_status FROM people p LEFT JOIN LATERAL (SELECT license_number,license_class,status FROM licenses WHERE person_id=p.id ORDER BY id DESC LIMIT 1) l ON true WHERE (${search}='' OR CONCAT_WS(' ',p.first_name,p.last_name) ILIKE '%'||${search}||'%' OR p.first_name ILIKE '%'||${search}||'%' OR p.last_name ILIKE '%'||${search}||'%' OR COALESCE(p.alias,'') ILIKE '%'||${search}||'%' OR COALESCE(TO_CHAR(p.dob,'MM/DD/YYYY'),'') ILIKE '%'||${search}||'%') ORDER BY p.last_name,p.first_name LIMIT ${limitSql}`);
      return NextResponse.json(result.rows);
    }
    if (type === "licenses") {
      const result = await p.query(`SELECT l.*,p.first_name,p.last_name,p.dob,p.height,p.weight,p.eyes,p.hair,p.address,p.notes AS person_notes FROM licenses l JOIN people p ON p.id=l.person_id WHERE (${search}='' OR l.license_number ILIKE '%'||${search}||'%' OR CONCAT_WS(' ',p.first_name,p.last_name) ILIKE '%'||${search}||'%' OR TO_CHAR(p.dob,'MM/DD/YYYY') ILIKE '%'||${search}||'%') ORDER BY p.last_name,p.first_name LIMIT ${limitSql}`);
      return NextResponse.json(result.rows);
    }
    if (type === "warrants") {
      const result = await p.query(`SELECT w.*,CONCAT_WS(' ',p.first_name,p.last_name) AS name FROM warrants w LEFT JOIN people p ON p.id=w.person_id WHERE (${search}='' OR w.warrant_number ILIKE '%'||${search}||'%' OR w.title ILIKE '%'||${search}||'%' OR CONCAT_WS(' ',p.first_name,p.last_name) ILIKE '%'||${search}||'%') ORDER BY w.issued_at DESC LIMIT ${limitSql}`);
      return NextResponse.json(result.rows);
    }
    if (type === "incidents") {
      const result = await p.query(`SELECT * FROM incidents WHERE (${search}='' OR incident_number ILIKE '%'||${search}||'%' OR title ILIKE '%'||${search}||'%' OR COALESCE(location,'') ILIKE '%'||${search}||'%' OR COALESCE(incident_type,'') ILIKE '%'||${search}||'%' OR COALESCE(case_number,'') ILIKE '%'||${search}||'%' OR COALESCE(officer,'') ILIKE '%'||${search}||'%') ORDER BY occurred_at DESC LIMIT ${limitSql}`);
      return NextResponse.json(result.rows);
    }
    const result = await p.query(`SELECT * FROM messages WHERE (${search}='' OR subject ILIKE '%'||${search}||'%' OR body ILIKE '%'||${search}||'%') ORDER BY created_at DESC LIMIT ${limitSql}`);
    return NextResponse.json(result.rows);
  } catch (error) {
    if (unauthorized(error)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    console.error(error);
    const detail = error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json({ error: `Database request failed: ${detail}`, detail }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    await ensureSchema();
    const body = await request.json();
    const type = clean(body.type);
    const p = db();
    if (type === "people") {
      if (!clean(body.first_name) || !clean(body.last_name)) return NextResponse.json({ error: "First and last name are required" }, { status: 400 });
      const r = await p.query(`INSERT INTO people (first_name,last_name,dob,gender,alias,address,height,weight,eyes,hair,status,notes) VALUES (${sqlText(body.first_name)},${sqlText(body.last_name)},${sqlNullableDate(body.dob)},${sqlNullableText(body.gender)},${sqlNullableText(body.alias)},${sqlNullableText(body.address)},${sqlNullableText(body.height)},${sqlNullableText(body.weight)},${sqlNullableText(body.eyes)},${sqlNullableText(body.hair)},${sqlText(clean(body.status)||"ACTIVE")},${sqlNullableText(body.notes)}) RETURNING *`);
      return NextResponse.json(r.rows[0], { status: 201 });
    }
    if (type === "licenses") {
      const personId = sqlNullableBigInt(body.person_id);
      if (personId === "NULL") return NextResponse.json({ error: "A valid person ID is required" }, { status: 400 });
      const r = await p.query(`INSERT INTO licenses (person_id,license_number,license_class,status,issue_date,expiration_date,restrictions,notes) VALUES (${personId},${sqlText(body.license_number)},${sqlText(clean(body.license_class)||"C")},${sqlText(clean(body.status)||"VALID")},${sqlNullableDate(body.issue_date)},${sqlNullableDate(body.expiration_date)},${sqlNullableText(body.restrictions)},${sqlNullableText(body.notes)}) RETURNING *`);
      return NextResponse.json(r.rows[0], { status: 201 });
    }
    if (type === "warrants") {
      const issuedAt = body.issued_at || new Date().toISOString();
      const r = await p.query(`INSERT INTO warrants (person_id,warrant_number,title,priority,status,issued_at,location,officer,notes) VALUES (${sqlNullableBigInt(body.person_id)},${sqlText(body.warrant_number)},${sqlText(body.title)},${sqlText(clean(body.priority)||"STANDARD")},${sqlText(clean(body.status)||"ACTIVE")},${sqlNullableTimestamp(issuedAt)},${sqlNullableText(body.location)},${sqlText(user.username)},${sqlNullableText(body.notes)}) RETURNING *`);
      return NextResponse.json(r.rows[0], { status: 201 });
    }
    if (type === "incidents") {
      const occurredAt = body.occurred_at || new Date().toISOString();
      let incidentNumber = clean(body.incident_number);
      if (!incidentNumber) {
        await p.query("SELECT pg_advisory_xact_lock(hashtext('opd_incident_number'))");
        const year = new Date(occurredAt).getFullYear();
        const next = await p.query(`SELECT COALESCE(MAX(CASE WHEN incident_number ~ '^OPD-${year}-[0-9]+$' THEN CAST(SUBSTRING(incident_number FROM 10) AS INTEGER) ELSE 0 END),0)+1 AS next_number FROM incidents`);
        incidentNumber = `OPD-${year}-${String(Number(next.rows[0].next_number)).padStart(4, "0")}`;
      }
      if (!clean(body.title)) return NextResponse.json({ error: "Incident title is required" }, { status: 400 });
      const r = await p.query(`INSERT INTO incidents (incident_number,title,location,status,occurred_at,officer,notes,incident_type,case_number,description,persons_involved,evidence,officer_notes,related_warrant) VALUES (${sqlText(incidentNumber)},${sqlText(body.title)},${sqlNullableText(body.location)},${sqlText(clean(body.status)||"OPEN")},${sqlNullableTimestamp(occurredAt)},${sqlText(user.username)},${sqlNullableText(body.notes)},${sqlNullableText(body.incident_type)},${sqlNullableText(body.case_number)},${sqlNullableText(body.description)},${sqlNullableText(body.persons_involved)},${sqlNullableText(body.evidence)},${sqlNullableText(body.officer_notes)},${sqlNullableText(body.related_warrant)}) RETURNING *`);
      return NextResponse.json(r.rows[0], { status: 201 });
    }
    if (type === "messages") {
      const r = await p.query(`INSERT INTO messages (subject,body,sender,priority) VALUES (${sqlText(body.subject)},${sqlText(body.body)},${sqlText(clean(body.sender)||"OPD ADMIN")},${sqlText(clean(body.priority)||"NORMAL")}) RETURNING *`);
      return NextResponse.json(r.rows[0], { status: 201 });
    }
    return NextResponse.json({ error: "Unknown record type" }, { status: 400 });
  } catch (error) {
    if (unauthorized(error)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    console.error(error);
    const detail = error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json({ error: `Could not save record: ${detail}`, detail }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    await ensureSchema();
    const body = await request.json();
    const type = clean(body.type);
    const id = sqlNullableBigInt(body.id);
    if (id === "NULL") return NextResponse.json({ error: "A valid record ID is required" }, { status: 400 });
    const p = db();
    if (type === "people") {
      if (!clean(body.first_name) || !clean(body.last_name)) return NextResponse.json({ error: "First and last name are required" }, { status: 400 });
      let personId = id;
      const personCheck = await p.query(`SELECT id FROM people WHERE id=${id} LIMIT 1`);
      if (!personCheck.rows.length) {
        const licenseOwner = await p.query(`SELECT person_id FROM licenses WHERE id=${id} LIMIT 1`);
        if (licenseOwner.rows.length && licenseOwner.rows[0].person_id !== null) personId = String(licenseOwner.rows[0].person_id);
      }
      const r = await p.query(`UPDATE people SET first_name=${sqlText(body.first_name)}, last_name=${sqlText(body.last_name)}, dob=${sqlNullableDate(body.dob)}, gender=${sqlNullableText(body.gender)}, alias=${sqlNullableText(body.alias)}, address=${sqlNullableText(body.address)}, height=${sqlNullableText(body.height)}, weight=${sqlNullableText(body.weight)}, eyes=${sqlNullableText(body.eyes)}, hair=${sqlNullableText(body.hair)}, status=${sqlText(clean(body.status)||"ACTIVE")}, notes=${sqlNullableText(body.notes)} WHERE id=${personId} RETURNING *`);
      if (!r.rows.length) return NextResponse.json({ error: "Person record not found" }, { status: 404 });
      if (body.license_number !== undefined || body.license_class !== undefined) {
        const license = sqlNullableText(body.license_number); const licenseClass = sqlText(clean(body.license_class) || "C");
        const existing = await p.query(`SELECT id FROM licenses WHERE person_id=${personId} ORDER BY id DESC LIMIT 1`);
        if (license === "NULL") { if (existing.rows.length) await p.query(`DELETE FROM licenses WHERE id=${existing.rows[0].id}`); }
        else if (existing.rows.length) await p.query(`UPDATE licenses SET license_number=${license},license_class=${licenseClass} WHERE id=${existing.rows[0].id}`);
        else await p.query(`INSERT INTO licenses (person_id,license_number,license_class,status,notes) VALUES (${personId},${license},${licenseClass},'VALID','RP record')`);
      }
      const updated = await p.query(`SELECT p.*, COALESCE((SELECT license_number FROM licenses WHERE person_id=p.id ORDER BY id DESC LIMIT 1),'') AS license_number, COALESCE((SELECT license_class FROM licenses WHERE person_id=p.id ORDER BY id DESC LIMIT 1),'') AS license_class FROM people p WHERE p.id=${personId}`);
      return NextResponse.json(updated.rows[0]);
    }
    return NextResponse.json({ error: "Editing is currently supported for person records." }, { status: 400 });
  } catch (error) {
    if (unauthorized(error)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    console.error(error);
    const detail = error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json({ error: `Could not update record: ${detail}`, detail }, { status: 500 });
  }
}
