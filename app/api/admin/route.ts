import { NextResponse } from "next/server";
import { db, ensureSchema } from "../../../lib/db";
import { requireAdmin } from "../../../lib/auth";

export async function GET() {
  try {
    const current = await requireAdmin();
    await ensureSchema();
    const [people, licenses, vehicles, citations, warrants, incidents, messages, admins, sessions] = await Promise.all([
      db().query("SELECT COUNT(*)::int AS count FROM people"),
      db().query("SELECT COUNT(*)::int AS count FROM licenses"),
      db().query("SELECT COUNT(*)::int AS count FROM vehicles"),
      db().query("SELECT COUNT(*)::int AS count FROM citations"),
      db().query("SELECT COUNT(*)::int AS count FROM warrants"),
      db().query("SELECT COUNT(*)::int AS count FROM incidents"),
      db().query("SELECT COUNT(*)::int AS count FROM messages"),
      db().query("SELECT id,username,role,active,created_at FROM opd_admin_users ORDER BY id"),
      db().query("SELECT COUNT(*)::int AS count FROM opd_sessions WHERE expires_at>NOW()")
    ]);

    return NextResponse.json({
      currentUser: { username: current.username, role: current.role },
      counts: {
        people: people.rows[0].count,
        licenses: licenses.rows[0].count,
        vehicles: vehicles.rows[0].count,
        citations: citations.rows[0].count,
        warrants: warrants.rows[0].count,
        incidents: incidents.rows[0].count,
        messages: messages.rows[0].count,
      },
      admins: admins.rows,
      activeSessions: sessions.rows[0].count,
      database: "CONNECTED",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin data unavailable";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(error);
    return NextResponse.json({ error: "Admin data unavailable" }, { status: 503 });
  }
}
