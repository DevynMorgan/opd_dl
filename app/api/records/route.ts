import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "../../../lib/db";

export const dynamic = "force-dynamic";
const categories = ["people", "licenses", "vehicles", "citations", "warrants", "incidents", "messages"] as const;
type Category = typeof categories[number];
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const isCategory = (value: string): value is Category => categories.includes(value as Category);

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    const type = clean(searchParams.get("type") || "people");
    const q = clean(searchParams.get("q"));
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 200);
    const p = db();
    if (!isCategory(type)) return NextResponse.json({ error: "Unknown record type" }, { status: 400 });

    if (type === "people") {
      const result = await p.query(`
        SELECT p.*, COALESCE(l.license_number,'') AS license_number,
          COALESCE(l.status,'NO LICENSE') AS license_status,
          COALESCE(v.vehicle_label,'No registered vehicles') AS vehicle_label
        FROM people p
        LEFT JOIN LATERAL (SELECT license_number,status FROM licenses WHERE person_id=p.id ORDER BY id DESC LIMIT 1) l ON true
        LEFT JOIN LATERAL (SELECT CONCAT(year,' ',COALESCE(color,''),' ',COALESCE(make,''),' ',COALESCE(model,'')) AS vehicle_label FROM vehicles WHERE person_id=p.id ORDER BY id DESC LIMIT 1) v ON true
        WHERE ($1::text='' OR CONCAT_WS(' ',p.first_name,p.last_name) ILIKE '%'||$1::text||'%' OR p.first_name ILIKE '%'||$1::text||'%' OR p.last_name ILIKE '%'||$1::text||'%' OR COALESCE(p.alias,'') ILIKE '%'||$1::text||'%' OR COALESCE(TO_CHAR(p.dob,'MM/DD/YYYY'),'') ILIKE '%'||$1::text||'%')
        ORDER BY p.last_name,p.first_name LIMIT $2::integer`, [q, limit]);
      return NextResponse.json(result.rows);
    }
    if (type === "licenses") {
      const result = await p.query(`SELECT l.*,p.first_name,p.last_name,p.dob,p.height,p.weight,p.eyes,p.hair,p.address,p.notes AS person_notes FROM licenses l JOIN people p ON p.id=l.person_id WHERE ($1::text='' OR l.license_number ILIKE '%'||$1::text||'%' OR CONCAT_WS(' ',p.first_name,p.last_name) ILIKE '%'||$1::text||'%' OR TO_CHAR(p.dob,'MM/DD/YYYY') ILIKE '%'||$1::text||'%') ORDER BY p.last_name,p.first_name LIMIT $2::integer`, [q, limit]);
      return NextResponse.json(result.rows);
    }
    if (type === "vehicles") {
      const result = await p.query(`SELECT v.*,p.first_name,p.last_name,CONCAT_WS(' ',p.first_name,p.last_name) AS owner FROM vehicles v LEFT JOIN people p ON p.id=v.person_id WHERE ($1::text='' OR v.plate ILIKE '%'||$1::text||'%' OR COALESCE(v.vin,'') ILIKE '%'||$1::text||'%' OR CONCAT_WS(' ',v.year,v.make,v.model,v.color) ILIKE '%'||$1::text||'%' OR CONCAT_WS(' ',p.first_name,p.last_name) ILIKE '%'||$1::text||'%') ORDER BY v.id DESC LIMIT $2::integer`, [q, limit]);
      return NextResponse.json(result.rows);
    }
    if (type === "citations") {
      const result = await p.query(`SELECT c.*,CONCAT_WS(' ',p.first_name,p.last_name) AS name FROM citations c LEFT JOIN people p ON p.id=c.person_id WHERE ($1::text='' OR c.citation_number ILIKE '%'||$1::text||'%' OR c.charge ILIKE '%'||$1::text||'%' OR CONCAT_WS(' ',p.first_name,p.last_name) ILIKE '%'||$1::text||'%') ORDER BY c.issued_at DESC LIMIT $2::integer`, [q, limit]);
      return NextResponse.json(result.rows);
    }
    if (type === "warrants") {
      const result = await p.query(`SELECT w.*,CONCAT_WS(' ',p.first_name,p.last_name) AS name FROM warrants w LEFT JOIN people p ON p.id=w.person_id WHERE ($1::text='' OR w.warrant_number ILIKE '%'||$1::text||'%' OR w.title ILIKE '%'||$1::text||'%' OR CONCAT_WS(' ',p.first_name,p.last_name) ILIKE '%'||$1::text||'%') ORDER BY w.issued_at DESC LIMIT $2::integer`, [q, limit]);
      return NextResponse.json(result.rows);
    }
    if (type === "incidents") {
      const result = await p.query(`SELECT * FROM incidents WHERE ($1::text='' OR incident_number ILIKE '%'||$1::text||'%' OR title ILIKE '%'||$1::text||'%' OR COALESCE(location,'') ILIKE '%'||$1::text||'%') ORDER BY occurred_at DESC LIMIT $2::integer`, [q, limit]);
      return NextResponse.json(result.rows);
    }
    const result = await p.query(`SELECT * FROM messages WHERE ($1::text='' OR subject ILIKE '%'||$1::text||'%' OR body ILIKE '%'||$1::text||'%') ORDER BY created_at DESC LIMIT $2::integer`, [q, limit]);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error(error);
    const detail = error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json({ error: "Database request failed.", detail }, { status: 503 });
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
      const r = await p.query(`INSERT INTO people (first_name,last_name,dob,alias,address,height,weight,eyes,hair,status,notes) VALUES ($1::text,$2::text,$3::date,$4::text,$5::text,$6::text,$7::text,$8::text,$9::text,$10::text,$11::text) RETURNING *`, [clean(body.first_name),clean(body.last_name),body.dob||null,clean(body.alias),clean(body.address),clean(body.height),clean(body.weight),clean(body.eyes),clean(body.hair),clean(body.status)||"ACTIVE",clean(body.notes)]);
      return NextResponse.json(r.rows[0], { status: 201 });
    }
    if (type === "licenses") {
      const r = await p.query(`INSERT INTO licenses (person_id,license_number,license_class,status,issue_date,expiration_date,restrictions,notes) VALUES ($1::bigint,$2::text,$3::text,$4::text,$5::date,$6::date,$7::text,$8::text) RETURNING *`, [Number(body.person_id),clean(body.license_number),clean(body.license_class)||"C",clean(body.status)||"VALID",body.issue_date||null,body.expiration_date||null,clean(body.restrictions),clean(body.notes)]);
      return NextResponse.json(r.rows[0], { status: 201 });
    }
    if (type === "vehicles") {
      const r = await p.query(`INSERT INTO vehicles (person_id,plate,vin,year,make,model,color,registration_status,notes) VALUES ($1::bigint,$2::text,$3::text,$4::integer,$5::text,$6::text,$7::text,$8::text,$9::text) RETURNING *`, [body.person_id?Number(body.person_id):null,clean(body.plate),clean(body.vin),body.year?Number(body.year):null,clean(body.make),clean(body.model),clean(body.color),clean(body.registration_status)||"ACTIVE",clean(body.notes)]);
      return NextResponse.json(r.rows[0], { status: 201 });
    }
    if (type === "citations") {
      const r = await p.query(`INSERT INTO citations (person_id,citation_number,charge,location,status,issued_at,officer,notes) VALUES ($1::bigint,$2::text,$3::text,$4::text,$5::text,$6::timestamptz,$7::text,$8::text) RETURNING *`, [body.person_id?Number(body.person_id):null,clean(body.citation_number),clean(body.charge),clean(body.location),clean(body.status)||"OPEN",body.issued_at||new Date().toISOString(),clean(body.officer)||"1027",clean(body.notes)]);
      return NextResponse.json(r.rows[0], { status: 201 });
    }
    if (type === "warrants") {
      const r = await p.query(`INSERT INTO warrants (person_id,warrant_number,title,priority,status,issued_at,location,officer,notes) VALUES ($1::bigint,$2::text,$3::text,$4::text,$5::text,$6::timestamptz,$7::text,$8::text,$9::text) RETURNING *`, [body.person_id?Number(body.person_id):null,clean(body.warrant_number),clean(body.title),clean(body.priority)||"STANDARD",clean(body.status)||"ACTIVE",body.issued_at||new Date().toISOString(),clean(body.location),clean(body.officer)||"1027",clean(body.notes)]);
      return NextResponse.json(r.rows[0], { status: 201 });
    }
    if (type === "incidents") {
      const r = await p.query(`INSERT INTO incidents (incident_number,title,location,status,occurred_at,officer,notes) VALUES ($1::text,$2::text,$3::text,$4::text,$5::timestamptz,$6::text,$7::text) RETURNING *`, [clean(body.incident_number),clean(body.title),clean(body.location),clean(body.status)||"OPEN",body.occurred_at||new Date().toISOString(),clean(body.officer)||"1027",clean(body.notes)]);
      return NextResponse.json(r.rows[0], { status: 201 });
    }
    if (type === "messages") {
      const r = await p.query(`INSERT INTO messages (subject,body,sender,priority) VALUES ($1::text,$2::text,$3::text,$4::text) RETURNING *`, [clean(body.subject),clean(body.body),clean(body.sender)||"OPD ADMIN",clean(body.priority)||"NORMAL"]);
      return NextResponse.json(r.rows[0], { status: 201 });
    }
    return NextResponse.json({ error: "Unknown record type" }, { status: 400 });
  } catch (error) {
    console.error(error);
    const detail = error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json({ error: "Could not save record.", detail }, { status: 500 });
  }
}
