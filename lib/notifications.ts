import { db } from "./db";

export type SystemNotificationKind = "INCIDENT_ADDED" | "WARRANT_ADDED" | "OPD_NOTICE";

export async function createSystemNotification(kind: SystemNotificationKind, subject: string, body: string, priority = "NORMAL") {
  const result = await db().query(
    `INSERT INTO opd_notifications (kind,subject,body,priority) VALUES ('${String(kind).replace(/'/g, "''")}','${String(subject).replace(/'/g, "''")}','${String(body).replace(/'/g, "''")}','${String(priority).replace(/'/g, "''")}') RETURNING *`
  );
  return result.rows[0];
}
