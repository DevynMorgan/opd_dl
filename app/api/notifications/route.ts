import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "../../../lib/db";
import { getCurrentUser, requireAdmin } from "../../../lib/auth";
import { createSystemNotification } from "../../../lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    await ensureSchema();
    const result = await db().query(`
      SELECT n.id,n.kind,n.subject,n.body,n.priority,n.created_at,
             EXISTS(SELECT 1 FROM opd_notification_reads r WHERE r.notification_id=n.id AND r.user_id=${Number(user.id)}) AS read
      FROM opd_notifications n
      ORDER BY n.created_at DESC
      LIMIT 50
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not load notifications." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    await ensureSchema();
    const body = await request.json();
    if (body.kind !== "OPD_NOTICE") return NextResponse.json({ error: "Only OPD system notices can be created manually." }, { status: 400 });
    const subject = String(body.subject || "").trim();
    const message = String(body.body || "").trim();
    if (!subject || !message) return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });
    const notification = await createSystemNotification("OPD_NOTICE", subject, message, String(body.priority || "NORMAL"));
    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not create system notice." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    await ensureSchema();
    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isSafeInteger(id)) return NextResponse.json({ error: "Invalid notification." }, { status: 400 });
    await db().query(`INSERT INTO opd_notification_reads (notification_id,user_id) VALUES (${id},${Number(user.id)}) ON CONFLICT (notification_id,user_id) DO NOTHING`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not mark notification as read." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    await ensureSchema();
    const body = await request.json().catch(() => ({}));
    const id = Number(body.id);
    if (!Number.isSafeInteger(id)) return NextResponse.json({ error: "Invalid notification." }, { status: 400 });

    await db().query(`
      INSERT INTO opd_notification_reads (notification_id,user_id)
      VALUES (${id},${Number(user.id)})
      ON CONFLICT (notification_id,user_id) DO NOTHING
    `);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not clear notification." }, { status: 500 });
  }
}
