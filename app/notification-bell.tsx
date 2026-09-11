"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Check, Megaphone, ShieldAlert, X } from "lucide-react";

type Notification = { id: number; kind: string; subject: string; body: string; priority: string; created_at: string; read: boolean };

export default function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const r = await fetch("/api/notifications", { cache: "no-store" });
      if (!r.ok) return;
      const data = await r.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {}
  }

  useEffect(() => {
    load();
    fetch("/api/auth/me", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(data => setAdmin(data?.user?.role === "ADMIN")).catch(() => {});
    const timer = window.setInterval(load, 30000);
    const outside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", outside);
    return () => { window.clearInterval(timer); document.removeEventListener("mousedown", outside); };
  }, []);

  const unread = items.filter(n => !n.read).length;
  const icon = (kind: string) => kind === "WARRANT_ADDED" ? <ShieldAlert size={17} /> : kind === "OPD_NOTICE" ? <Megaphone size={17} /> : <Bell size={17} />;
  const label = (kind: string) => kind === "WARRANT_ADDED" ? "WARRANT" : kind === "OPD_NOTICE" ? "OPD NOTICE" : "INCIDENT";
  const time = (value: string) => { const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); };

  async function markRead(item: Notification) {
    if (item.read) return;
    setItems(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
    await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }) }).catch(() => {});
  }

  async function clearNotification(id: number) {
    setItems(prev => prev.filter(n => n.id !== id));
    await fetch("/api/notifications", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => {});
  }

  async function createNotice() {
    if (!subject.trim() || !body.trim()) return;
    setSaving(true);
    const r = await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "OPD_NOTICE", subject, body }) });
    if (r.ok) { setSubject(""); setBody(""); setNoticeOpen(false); await load(); setOpen(true); }
    setSaving(false);
  }

  return <div className="notification-wrap" ref={ref}>
    <button className={`notification-button${unread ? " has-unread" : ""}`} aria-label="System notifications" onClick={() => setOpen(v => !v)}><Bell size={21} />{unread > 0 && <span className="notification-count">{unread > 99 ? "99+" : unread}</span>}</button>
    {open && <div className="notification-panel">
      <div className="notification-head"><div><small>OPD SYSTEM</small><h3>SYSTEM NOTIFICATIONS</h3></div><button onClick={() => setOpen(false)}><X size={17} /></button></div>
      <div className="notification-list">{items.length ? items.map(item => <div key={item.id} className={`notification-item${item.read ? " read" : ""}`} onClick={() => markRead(item)}><div className="notification-icon">{icon(item.kind)}</div><div className="notification-copy"><span>{label(item.kind)}{item.priority && item.priority !== "NORMAL" ? ` · ${item.priority}` : ""}</span><strong>{item.subject}</strong><p>{item.body}</p><small>{time(item.created_at)}</small></div><div className="notification-item-actions">{!item.read && <i className="notification-unread" />}<button className="notification-clear" aria-label={`Clear ${item.subject}`} title="Clear notification" onClick={e => { e.stopPropagation(); clearNotification(item.id); }}><X size={14} /></button></div></div>) : <div className="notification-empty">No system notifications.</div>}</div>
      {admin && <button className="notification-admin" onClick={() => setNoticeOpen(true)}><Megaphone size={16} /> NEW OPD SYSTEM NOTICE</button>}
    </div>}
    {noticeOpen && <div className="notice-backdrop"><div className="notice-modal"><button className="modal-close" onClick={() => setNoticeOpen(false)}><X /></button><div className="notification-head"><div><small>ADMINISTRATION</small><h3>NEW OPD SYSTEM NOTICE</h3></div></div><label>Subject<input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Important OPD notice" /></label><label>Message<textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Enter the system-wide notice..." rows={5} /></label><div className="notice-actions"><button onClick={() => setNoticeOpen(false)}>CANCEL</button><button className="primary" disabled={saving} onClick={createNotice}>{saving ? "POSTING…" : "POST NOTICE"}</button></div></div></div>}
  </div>;
}
