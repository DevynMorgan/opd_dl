import { Pool, PoolClient } from "pg";

let queryPool: Pool | undefined;
let schemaPool: Pool | undefined;

function getQueryUrl() { return process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.SUPABASE_DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING; }
function getSchemaUrl() { return process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.SUPABASE_DATABASE_URL; }
function normalizeConnectionString(connectionString: string) { try { const url = new URL(connectionString); url.searchParams.delete("sslmode"); url.searchParams.delete("sslrootcert"); url.searchParams.delete("sslcert"); url.searchParams.delete("sslkey"); return url.toString(); } catch { return connectionString.replace(/([?&])sslmode=[^&]*&?/gi, "$1").replace(/([?&])sslrootcert=[^&]*&?/gi, "$1").replace(/([?&])sslcert=[^&]*&?/gi, "$1").replace(/([?&])sslkey=[^&]*&?/gi, "$1").replace(/[?&]$/g, ""); } }
function makePool(connectionString: string, max: number) { return new Pool({ connectionString: normalizeConnectionString(connectionString), ssl: { rejectUnauthorized: false }, max, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000 }); }
function getQueryPool() { const connectionString = getQueryUrl(); if (!connectionString) throw new Error("No Supabase/Postgres database connection variable is configured in Vercel."); if (!queryPool) queryPool = makePool(connectionString, 5); return queryPool; }
function getSchemaPool() { const connectionString = getSchemaUrl(); if (!connectionString) throw new Error("No Supabase/Postgres database connection variable is configured in Vercel."); if (!schemaPool) schemaPool = makePool(connectionString, 2); return schemaPool; }
let schemaReady: Promise<void> | null = null;
export function db() { return getQueryPool(); }

async function createSchema(client: PoolClient) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('opd_dl_schema_v7'))");
  await client.query(`
    CREATE TABLE IF NOT EXISTS people (id BIGSERIAL PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL, dob DATE, gender TEXT, alias TEXT, address TEXT, height TEXT, weight TEXT, eyes TEXT, hair TEXT, status TEXT NOT NULL DEFAULT 'ACTIVE', notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    ALTER TABLE people ADD COLUMN IF NOT EXISTS gender TEXT;
    CREATE TABLE IF NOT EXISTS licenses (id BIGSERIAL PRIMARY KEY, person_id BIGINT NOT NULL REFERENCES people(id) ON DELETE CASCADE, license_number TEXT UNIQUE NOT NULL, license_class TEXT DEFAULT 'C', status TEXT NOT NULL DEFAULT 'VALID', issue_date DATE, expiration_date DATE, restrictions TEXT, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS vehicles (id BIGSERIAL PRIMARY KEY, person_id BIGINT REFERENCES people(id) ON DELETE SET NULL, plate TEXT UNIQUE NOT NULL, vin TEXT, year INTEGER, make TEXT, model TEXT, color TEXT, registration_status TEXT NOT NULL DEFAULT 'ACTIVE', notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS citations (id BIGSERIAL PRIMARY KEY, person_id BIGINT REFERENCES people(id) ON DELETE SET NULL, citation_number TEXT UNIQUE NOT NULL, charge TEXT NOT NULL, location TEXT, status TEXT NOT NULL DEFAULT 'OPEN', issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), officer TEXT, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS warrants (id BIGSERIAL PRIMARY KEY, person_id BIGINT REFERENCES people(id) ON DELETE SET NULL, warrant_number TEXT UNIQUE NOT NULL, title TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'STANDARD', status TEXT NOT NULL DEFAULT 'ACTIVE', issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), location TEXT, officer TEXT, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS incidents (id BIGSERIAL PRIMARY KEY, incident_number TEXT UNIQUE NOT NULL, title TEXT NOT NULL, location TEXT, status TEXT NOT NULL DEFAULT 'OPEN', occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), officer TEXT, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS messages (id BIGSERIAL PRIMARY KEY, subject TEXT NOT NULL, body TEXT NOT NULL, sender TEXT NOT NULL DEFAULT 'OPD ADMIN', priority TEXT NOT NULL DEFAULT 'NORMAL', read BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS opd_admin_users (id BIGSERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_salt TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'ADMIN', active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS opd_sessions (id BIGSERIAL PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, user_id BIGINT NOT NULL REFERENCES opd_admin_users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS opd_notifications (id BIGSERIAL PRIMARY KEY, kind TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'NORMAL', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS opd_notification_reads (notification_id BIGINT NOT NULL REFERENCES opd_notifications(id) ON DELETE CASCADE, user_id BIGINT NOT NULL REFERENCES opd_admin_users(id) ON DELETE CASCADE, read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (notification_id,user_id));
    CREATE INDEX IF NOT EXISTS people_name_idx ON people(last_name, first_name);
    CREATE INDEX IF NOT EXISTS people_dob_idx ON people(dob);
    CREATE INDEX IF NOT EXISTS licenses_number_idx ON licenses(license_number);
    CREATE INDEX IF NOT EXISTS vehicles_plate_idx ON vehicles(plate);
    CREATE INDEX IF NOT EXISTS citations_number_idx ON citations(citation_number);
    CREATE INDEX IF NOT EXISTS warrants_number_idx ON warrants(warrant_number);
    CREATE INDEX IF NOT EXISTS incidents_number_idx ON incidents(incident_number);
    CREATE INDEX IF NOT EXISTS opd_sessions_token_idx ON opd_sessions(token_hash);
    CREATE INDEX IF NOT EXISTS opd_notifications_created_idx ON opd_notifications(created_at DESC);
  `);
  await client.query(`
    INSERT INTO opd_admin_users (username,password_salt,password_hash,role,active)
    VALUES
      ('sistergrimm','198a96279af78921a3305ffbf838c358','985d443ca40b38dc0175ac576587c211bcc1f2f4ae03d4b19d28d896f479bb59','ADMIN',TRUE),
      ('admin','a55cbc28783af032b797a93ab99296de','3b4dc86eccae5add2f0caa412909a8dab72a0b7ce411a4e1495aa72d61905990','ADMIN',TRUE)
    ON CONFLICT (username) DO UPDATE SET password_salt=EXCLUDED.password_salt,password_hash=EXCLUDED.password_hash,role=EXCLUDED.role,active=EXCLUDED.active
  `);
}

export async function ensureSchema() { if (schemaReady) return schemaReady; schemaReady = (async () => { const client = await getSchemaPool().connect(); try { await client.query("BEGIN"); await createSchema(client); await client.query("COMMIT"); } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); } })().catch((error) => { schemaReady = null; throw error; }); return schemaReady; }
