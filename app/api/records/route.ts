import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "../../../lib/db";

export const dynamic = "force-dynamic";
const categories = ["people", "licenses", "vehicles", "citations", "warrants", "incidents", "messages"] as const;
type Category = typeof categories[number];
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const isCategory = (value: string): value is Category => categories.includes(value as Category);

// Use SQL literals for this API instead of PostgreSQL bind parameters.
// This avoids the PgBouncer/Supabase prepared-statement issue that was
// producing "could not determine data type of parameter $1" even when
// explicit casts were present in the SQL.
const sqlText = (value: unknown) => `'${clean(value).replace(/'/g, "''")}'`;
const sqlNullableText = (value: unknown) => {
  const text = clean(value);
  return text ? sqlText(text) : "NULL";
};
const sqlNullableDate = (value: unknown) => {
  const text = clean(value);
  return text ? `${sqlText(text)}::date` : "NULL";
};
const sqlNullableTimestamp = (value: unknown) => {
  const text = clean(value);
  return text ? `${sqlText(text)}::timestamptz` : "NULL";
};
const sqlNullableInteger = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "NULL";
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.trunc(n)) : "NULL";
};
const sqlNullableBigInt = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "NULL";
  const n = Number(value);
  return Number.isSafeInteger(n) ? String(n) : "NULL";
};

export async function GET(request: NextRequest) {
  try {
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
      const result = await p.query(`
        SELECT p.*, COALESCE(l.license_number,'') AS license_number,
          COALESCE(l.status,'NO LICENSE') AS license_status,
          COALESCE(v.vehicle_label,'No registered vehicles') AS vehicle_label
        FROM people p
        LEFT JOIN LATERAL (SELECT license_number,status FROM licenses WHERE person_id=p.id ORDER BY id DESC LIMIT 1) l ON true
        LEFT JOIN LATERAL (SELECT CONCAT(year,' ',COALESCE(color,''),' ',COALESCE(make,''),' ',COALESCE(model,'')) AS vehicle_label FROM vehicles WHERE person_id=p.id ORDER BY id DESC LIMIT 1) v ON true
        WHERE (${search}='' OR CONCAT_WS(' ',p.first_name,p.last_name) ILIKE '%'||${search}||'%' OR p.first_name ILIKE '%'||${search}||'%' OR p.last_name ILIKE '%'||${search}||'%' OR COALESCE(p.alias,'') ILIKE '%'||${search}||'%' OR COALESCE(TO_CHAR(p.dob,'MM/DD/YYYY'),'') ILIKE '%'||${search}||'%')
        ORDER BY p.last_name,p.first_name LIMIT ${limitSql}`);
      return NextResponse.json(result.rows);
    }
    if (type === "licenses") {
      const result = await p.query(`SELECT l.*,p.first_name,p.last_name,p.dob,p.height,p.weight,p.eyes,p.hair,p.address,p.notes AS person_notes FROM licenses l JOIN people p ON p.id=l.person_id WHERE (${search}='' OR l.license_number ILIKE '%'||${search}||'%' OR CONCAT_WS(' ',p.first_name,p.last_name) ILIKE '%'||${search}||'%' OR TO_CHAR(p.dob,'MM/DD/YYYY') ILIKE '%'||${search}||'%') ORDER BY p.last_name,p.first_name LIMIT ${limitSql}`);
      return NextResponse.json(result.rows);
    }
    if (type === "vehicles") {
      const result = await p.query(`SELECT v.*,p.first_name,p.last_name,CONCAT_WS(' ',p.first_name,p.last_name) AS owner FROM vehicles v LEFT JOIN people p ON p.id=v.person_id WHERE (${search}='' OR v.plate ILIKE '%'||${search}||'%' OR COALESCE(v.vin,'') ILIKE '%'||${search}||'%' OR CONCAT_WS(' ',v.year,v.make,v.model,v.color) ILIKE '%'||${search}||'%' OR CONCAT_WS(' ',p.first_name,p.last_name) ILIKE '%'||${search}||'%') ORDER BY v.id DESC LIMIT ${limitSql}`);
      return NextResponse.json(result.rows);
    }
    if (type === "citations") {
      const result = await p.query(`SELECT c.*,CONCAT_WS(' ',p.first_name,p.last_name) AS name FROM citations c LEFT JOIN people p ON p.id=c.person_id WHERE (${search}='' OR c.citation_number ILIKE '%'||${search}||'%' OR c.charge ILIKE '%'||${search}||'%' OR CONCAT_WS(' ',p.first_name,p.last_name) ILIKE '%'||${search}||'%') ORDER BY c.issued_at DESC LIMIT ${limitSql}`);
      return NextResponse.json(result.rows);
    }
    if (type === "warrants") {
      const result = await p.query(`SELECT w.*,CONCAT_WS(' ',p.first_name,p.last_name) AS name FROM warrants w LEFT JOIN people p ON p.id=w.person_id WHERE (${search}='' OR w.warrant_number ILIKE '%'||${search}||'%' OR w.title ILIKE '%'||${search}||'%' OR CONCAT_WS(' ',p.first_name,p.last_name) ILIKE '%'||${search}||'%') ORDER BY w.issued_at DESC LIMIT ${limitSql}`);
      return NextResponse.json(result.rows);
    }
    if (type === "incidents") {
      const result = await p.query(`SELECT * FROM incidents WHERE (${search}='' OR incident_number ILIKE '%'||${search}||'%' OR title ILIKE '%'||${search}||'%' OR COALESCE(location,'') ILIKE '%'||${search}||'%') ORDER BY occurred_at DESC LIMIT ${limitSql}`);
      return NextResponse.json(result.rows);
    }
    const result = await p.query(`SELECT * FROM messages WHERE (${search}='' OR subject ILIKE '%'||${search}||'%' OR body ILIKE '%'||${search}||'%') ORDER BY created_at DESC LIMIT ${limitSql}`);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error(error);
    const detail = error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json({ error: `Database request failed: ${detail}`, detail }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    const body = await request.json();
    const type = clean(body.type);
    const p = db();

    if (type === "people") {
      if (!clean(body.first_name) || !clean(body.last_name)) return NextResponse.json({ error: "First and last name are required" }, { status: 400 });
      const r = await p.query(`INSERT INTO people (first_name,last_name,dob,alias,address,height,weight,eyes,hair,status,notes) VALUES (${sqlText(body.first_name)},${sqlText(body.last_name)},${sqlNullableDate(body.dob)},${sqlNullableText(body.alias)},${sqlNullableText(body.address)},${sqlNullableText(body.height)},${sqlNullableText(body.weight)},${sqlNullableText(body.eyes)},${sqlNullableText(body.hair)},${sqlText(clean(body.status)||"ACTIVE")},${sqlNullableText(body.notes)}) RETURNING *`);
      return NextResponse.json(r.rows[0], { status: 201 });
    }
    if (type === "licenses") {
      const personId = sqlNullableBigInt(body.person_id);
      if (personId === "NULL") return NextResponse.json({ error: "A valid person ID is required" }, { status: 400 });
      const r = await p.query(`INSERT INTO licenses (person_id,license_number,license_class,status,issue_date,expiration_date,restrictions,notes) VALUES (${personId},${sqlText(body.license_number)},${sqlText(clean(body.license_class)||"C")},${sqlText(clean(body.status)||"VALID")},${sqlNullableDate(body.issue_date)},${sqlNullableDate(body.expiration_date)},${sqlNullableText(body.restrictions)},${sqlNullableText(body.notes)}) RETURNING *`);
      return NextResponse.json(r.rows[0], { status: 201 });
    }
    if (type === "vehicles") {
      const r = await p.query(`INSERT INTO vehicles (person_id,plate,vin,year,make,model,color,registration_status,notes) VALUES (${sqlNullableBigInt(body.person_id)},${sqlText(body.plate)},${sqlNullableText(body.vin)},${sqlNullableInteger(body.year)},${sqlNullableText(body.make)},${sqlNullableText(body.model)},${sqlNullableText(body.color)},${sqlText(clean(body.registration_status)||"ACTIVE")},${sqlNullableText(body.notes)}) RETURNING *`);
      return NextResponse.json(r.rows[0], { status: 201 });
    }
    if (type === "citations") {
      const issuedAt = body.issued_at || new Date().toISOString();
      const r = await p.query(`INSERT INTO citations (person_id,citation_number,charge,location,status,issued_at,officer,notes) VALUES (${sqlNullableBigInt(body.person_id)},${sqlText(body.citation_number)},${sqlText(body.charge)},${sqlNullableText(body.location)},${sqlText(clean(body.status)||"OPEN")},${sqlNullableTimestamp(issuedAt)},${sqlText(clean(body.officer)||"1027")},${sqlNullableText(body.notes)}) RETURNING *`);
      return NextResponse.json(r.rows[0], { status: 201 });
    }
    if (type === "warrants") {
      const issuedAt = body.issued_at || new Date().toISOString();
      const r = await p.query(`INSERT INTO warrants (person_id,warrant_number,title,priority,status,issued_at,location,officer,notes) VALUES (${sqlNullableBigInt(body.person_id)},${sqlText(body.warrant_number)},${sqlText(body.title)},${sqlText(clean(body.priority)||"STANDARD")},${sqlText(clean(body.status)||"ACTIVE")},${sqlNullableTimestamp(issuedAt)},${sqlNullableText(body.location)},${sqlText(clean(body.officer)||"1027")},${sqlNullableText(body.notes)}) RETURNING *`);
      return NextResponse.json(r.rows[0], { status: 201 });
    }
    if (type === "incidents") {
      const occurredAt = body.occurred_at || new Date().toISOString();
      const r = await p.query(`INSERT INTO incidents (incident_number,title,location,status,occurred_at,officer,notes) VALUES (${sqlText(body.incident_number)},${sqlText(body.title)},${sqlNullableText(body.location)},${sqlText(clean(body.status)||"OPEN")},${sqlNullableTimestamp(occurredAt)},${sqlText(clean(body.officer)||"1027")},${sqlNullableText(body.notes)}) RETURNING *`);
      return NextResponse.json(r.rows[0], { status: 201 });
    }
    if (type === "messages") {
      const r = await p.query(`INSERT INTO messages (subject,body,sender,priority) VALUES (${sqlText(body.subject)},${sqlText(body.body)},${sqlText(clean(body.sender)||"OPD ADMIN")},${sqlText(clean(body.priority)||"NORMAL")}) RETURNING *`);
      return NextResponse.json(r.rows[0], { status: 201 });
    }
    return NextResponse.json({ error: "Unknown record type" }, { status: 400 });
  } catch (error) {
    console.error(error);
    const detail = error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json({ error: `Could not save record: ${detail}`, detail }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureSchema();
    const body = await request.json();
    const type = clean(body.type);
    const id = sqlNullableBigInt(body.id);
    if (id === "NULL") return NextResponse.json({ error: "A valid record ID is required" }, { status: 400 });
    const p = db();

    if (type === "people") {
      if (!clean(body.first_name) || !clean(body.last_name)) return NextResponse.json({ error: "First and last name are required" }, { status: 400 });
      const r = await p.query(`UPDATE people SET first_name=${sqlText(body.first_name)}, last_name=${sqlText(body.last_name)}, dob=${sqlNullableDate(body.dob)}, alias=${sqlNullableText(body.alias)}, address=${sqlNullableText(body.address)}, height=${sqlNullableText(body.height)}, weight=${sqlNullableText(body.weight)}, eyes=${sqlNullableText(body.eyes)}, hair=${sqlNullableText(body.hair)}, status=${sqlText(clean(body.status)||"ACTIVE")}, notes=${sqlNullableText(body.notes)} WHERE id=${id} RETURNING *`);
      if (!r.rows.length) return NextResponse.json({ error: "Person record not found" }, { status: 404 });
      return NextResponse.json(r.rows[0]);
    }

    return NextResponse.json({ error: "Editing is currently supported for person records." }, { status: 400 });
  } catch (error) {
    console.error(error);
    const detail = error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json({ error: `Could not update record: ${detail}`, detail }, { status: 500 });
  }
}
