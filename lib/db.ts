import { Pool, PoolClient } from "pg";

let pool: Pool | undefined;

function getDatabaseUrl() {
  // The Supabase Vercel integration provisions POSTGRES_URL. Prefer it so
  // an older Neon DATABASE_URL cannot accidentally be selected.
  return (
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.DATABASE_URL
  );
}

function getPool() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("No Supabase/Postgres database connection variable is configured in Vercel.");
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

let schemaReady: Promise<void> | null = null;

export function db() {
  return getPool();
}

async function createSchema(client: PoolClient) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('opd_dl_schema_v1'))");

  await client.query(`
    CREATE TABLE IF NOT EXISTS people (
      id BIGSERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      dob DATE,
      alias TEXT,
      address TEXT,
      height TEXT,
      weight TEXT,
      eyes TEXT,
      hair TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS licenses (
      id BIGSERIAL PRIMARY KEY,
      person_id BIGINT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      license_number TEXT UNIQUE NOT NULL,
      license_class TEXT DEFAULT 'C',
      status TEXT NOT NULL DEFAULT 'VALID',
      issue_date DATE,
      expiration_date DATE,
      restrictions TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id BIGSERIAL PRIMARY KEY,
      person_id BIGINT REFERENCES people(id) ON DELETE SET NULL,
      plate TEXT UNIQUE NOT NULL,
      vin TEXT,
      year INTEGER,
      make TEXT,
      model TEXT,
      color TEXT,
      registration_status TEXT NOT NULL DEFAULT 'ACTIVE',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS citations (
      id BIGSERIAL PRIMARY KEY,
      person_id BIGINT REFERENCES people(id) ON DELETE SET NULL,
      citation_number TEXT UNIQUE NOT NULL,
      charge TEXT NOT NULL,
      location TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      officer TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS warrants (
      id BIGSERIAL PRIMARY KEY,
      person_id BIGINT REFERENCES people(id) ON DELETE SET NULL,
      warrant_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'STANDARD',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      location TEXT,
      officer TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id BIGSERIAL PRIMARY KEY,
      incident_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      location TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      officer TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id BIGSERIAL PRIMARY KEY,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      sender TEXT NOT NULL DEFAULT 'OPD ADMIN',
      priority TEXT NOT NULL DEFAULT 'NORMAL',
      read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS people_name_idx ON people(last_name, first_name);
    CREATE INDEX IF NOT EXISTS people_dob_idx ON people(dob);
    CREATE INDEX IF NOT EXISTS licenses_number_idx ON licenses(license_number);
    CREATE INDEX IF NOT EXISTS vehicles_plate_idx ON vehicles(plate);
    CREATE INDEX IF NOT EXISTS citations_number_idx ON citations(citation_number);
    CREATE INDEX IF NOT EXISTS warrants_number_idx ON warrants(warrant_number);
    CREATE INDEX IF NOT EXISTS incidents_number_idx ON incidents(incident_number);
  `);

  const count = await client.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM people");
  if (count.rows[0].count !== "0") return;

  const people = [
    ["Bryce", "Fane", "1998-04-17", null, "", "5'7\"", "145", "Green", "Black", "ACTIVE", "Fictional RP record"],
    ["Majken", "Blomqvist", "1992-03-14", null, "", "5'8\"", "150", "Blue", "Blonde", "ACTIVE", "Fictional RP record"],
    ["Devyn", "Kitchi", "1995-06-22", null, "", "5'6\"", "135", "Hazel", "Brown", "ACTIVE", "Fictional RP record"],
    ["Ryan", "Morrison", "1990-12-09", null, "", "6'0\"", "190", "Blue", "Brown", "ACTIVE", "Fictional RP record"],
    ["Emilee", "Caldwell", "1996-06-27", null, "", "5'5\"", "130", "Brown", "Brown", "ACTIVE", "Fictional RP record"],
    ["Emi", "Vale", "1996-11-02", null, "", "5'5\"", "128", "Hazel", "Brown", "ACTIVE", "Fictional RP record"],
    ["Matt", "Holloway", "1994-08-21", null, "", "6'0\"", "185", "Blue", "Brown", "ACTIVE", "Fictional RP record"],
  ];

  const ids: number[] = [];
  for (const person of people) {
    const r = await client.query<{ id: number }>(
      `INSERT INTO people (first_name,last_name,dob,alias,address,height,weight,eyes,hair,status,notes)
       VALUES ($1::text,$2::text,$3::date,$4::text,$5::text,$6::text,$7::text,$8::text,$9::text,$10::text,$11::text)
       RETURNING id`,
      person,
    );
    ids.push(r.rows[0].id);
  }

  await client.query(`INSERT INTO licenses (person_id,license_number,license_class,status,issue_date,expiration_date,restrictions,notes) VALUES
    ($1::bigint,'OP-482917','C','VALID','2024-04-17','2029-04-17','None','Fictional RP record'),
    ($2::bigint,'OP-318204','C','SUSPENDED','2023-11-02','2028-11-02','Corrective lenses','Fictional RP record'),
    ($3::bigint,'OP-337221','C','VALID','2025-06-22','2030-06-22','None','Fictional RP record'),
    ($4::bigint,'OP-7719','C','VALID','2022-12-09','2027-12-09','None','Fictional RP record'),
    ($5::bigint,'OP-771493','C','VALID','2024-08-21','2029-08-21','None','Fictional RP record')`, [ids[0], ids[1], ids[2], ids[3], ids[6]]);

  await client.query(`INSERT INTO vehicles (person_id,plate,vin,year,make,model,color,registration_status,notes) VALUES
    ($2::bigint,'OP-VALE','RP2019VALE0001',2019,'Black','Sedan','Black','ACTIVE','Fictional RP record'),
    ($3::bigint,'OP-KIT2','RP2024KIT0001',2024,'Black','SUV','Black','ACTIVE','Fictional RP record'),
    ($4::bigint,'OP-MORR','RP2020MOR0001',2020,'Gray','Pickup','Gray','ACTIVE','Fictional RP record'),
    ($5::bigint,'OP-CALD','RP2018CAL0001',2018,'Red','Coupe','Red','ACTIVE','Fictional RP record'),
    ($7::bigint,'OP-HOLL','RP2022HOL0001',2022,'Gray','Pickup','Gray','ACTIVE','Fictional RP record')`, ids);

  await client.query(`INSERT INTO citations (person_id,citation_number,charge,location,status,issued_at,officer,notes) VALUES
    ($4::bigint,'CIT-260901','Failure to obey traffic control','Opaline Ave','OPEN','2026-09-01 14:20:00','1027','Fictional RP record'),
    ($5::bigint,'CIT-260884','Expired registration','North Ridge Rd','PAID','2026-08-28 10:15:00','1033','Fictional RP record')`, ids);

  await client.query(`INSERT INTO warrants (person_id,warrant_number,title,priority,status,issued_at,location,officer,notes) VALUES
    ($5::bigint,'W-260117','Failure to appear','STANDARD','ACTIVE','2026-09-02 09:00:00','Opaline County','1033','Fictional RP record')`, ids);

  await client.query(`INSERT INTO incidents (incident_number,title,location,status,occurred_at,officer,notes) VALUES
    ('INC-260905-01','Missing Person Report','Opaline','OPEN','2026-09-05 06:15:00','1027','Fictional RP record'),
    ('INC-260904-03','Vehicle Collision','Shattered Spine Rd','CLOSED','2026-09-04 22:11:00','1041','Fictional RP record')`);

  await client.query(`INSERT INTO messages (subject,body,sender,priority) VALUES
    ('Records System Online','OPD records management system is connected to the persistent RP database.','OPD ADMIN','NORMAL'),
    ('Fictional Data Notice','All records in this system are fictional roleplay data and are not real-world identity records.','OPD ADMIN','HIGH')`);
}

export async function ensureSchema() {
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      await createSchema(client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}
