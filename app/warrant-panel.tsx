"use client";

import { useEffect, useState } from "react";
import { officerIdentity } from "../lib/officer-identity";

type Warrant = Record<string, any>;

type Props = {
  records: Warrant[];
  loading: boolean;
  onRefresh: () => void;
};

export default function WarrantPanel({ records, loading, onRefresh }: Props) {
  const [admin, setAdmin] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [officer, setOfficer] = useState("");
  const [people, setPeople] = useState<Warrant[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    warrant_number: "", warrant_type: "Arrest", person_id: "", priority: "STANDARD", charge: "",
    status: "ACTIVE", issued_at: "", expiration_date: "", issuing_authority: "Opaline Municipal Court",
    case_number: "", bond: "", location: "", notes: "", description: ""
  });

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" }).then(r => r.json()).then(d => {
      const user = d?.user;
      setAdmin(user?.role === "ADMIN");
      setCanCreate(Boolean(user));
      if (user?.username) setOfficer(officerIdentity(String(user.username)));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!showNew) return;
    fetch("/api/records?type=people&limit=200", { cache: "no-store" }).then(r => r.ok ? r.json() : []).then(d => setPeople(Array.isArray(d) ? d : [])).catch(() => setPeople([]));
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setForm(f => ({ ...f, issued_at: now.toISOString().slice(0, 16) }));
  }, [showNew]);

  function close() { setShowNew(false); setError(""); setSaving(false); }
  function set(key: string, value: string) { setForm(f => ({ ...f, [key]: value })); }

  async function save() {
    if (!form.warrant_number.trim() || !form.charge.trim()) { setError("Warrant number and charge / reason are required."); return; }
    setSaving(true); setError("");
    try {
      const r = await fetch("/api/warrants", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, title: form.charge, officer })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Could not save warrant.");
      close(); onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save warrant.");
      setSaving(false);
    }
  }

  async function remove(warrantNumber: string) {
    if (!window.confirm(`Delete warrant ${warrantNumber}?\n\nThis permanently removes the fictional warrant from the RP database.`)) return;
    try {
      const r = await fetch("/api/warrants", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ warrant_number: warrantNumber }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Could not delete warrant.");
      onRefresh();
    } catch (e) { window.alert(e instanceof Error ? e.message : "Could not delete warrant."); }
  }

  return <>
    {canCreate && <div style={{ display: "flex", justifyContent: "flex-end", margin: "0 0 10px" }}><button className="header-action" type="button" onClick={() => setShowNew(true)}>＋ NEW WARRANT</button></div>}
    {loading ? <div className="loading-box">Loading persistent records…</div> : <div className="table-wrap"><table><thead><tr><th>WARRANT #</th><th>NAME</th><th>PRIORITY</th><th>STATUS</th><th>ISSUED</th><th>LOCATION</th>{admin && <th>ADMIN</th>}</tr></thead><tbody>{records.length ? records.map(r => <tr key={r.id}><td>{r.warrant_number}</td><td>{r.name || "Unknown"}</td><td>{r.priority}</td><td>{r.status}</td><td>{r.issued_at ? new Date(r.issued_at).toLocaleDateString("en-US") : ""}</td><td>{r.location || ""}</td>{admin && <td><button className="warrant-delete-button" type="button" onClick={() => remove(String(r.warrant_number))}>DELETE</button></td>}</tr>) : <tr><td colSpan={admin ? 7 : 6}>No matching fictional records.</td></tr>}</tbody></table></div>}

    {showNew && <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) close(); }}><div className="record-modal warrant-entry-modal" role="dialog" aria-modal="true" aria-label="New warrant">
      <button className="modal-close" type="button" onClick={close}>×</button>
      <div className="modal-head"><div className="modal-icon">⚖</div><div><small>OPALINE POLICE DEPARTMENT</small><h2>NEW WARRANT</h2><p>Create a fictional warrant record for the OPD RP database.</p></div></div>
      {error && <div className="auth-error" style={{ display: "block", marginTop: 15 }}>{error}</div>}
      <div className="new-form">
        <label>Warrant Number *<input value={form.warrant_number} onChange={e => set("warrant_number", e.target.value)} placeholder="W-2026-0001" /></label>
        <label>Warrant Type<select value={form.warrant_type} onChange={e => set("warrant_type", e.target.value)}><option>Arrest</option><option>Search</option><option>Bench</option><option>Probation / Parole</option><option>Other</option></select></label>
        <label>Subject<select value={form.person_id} onChange={e => set("person_id", e.target.value)}><option value="">Select person</option>{people.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}</select></label>
        <label>Priority<select value={form.priority} onChange={e => set("priority", e.target.value)}><option>STANDARD</option><option>LOW</option><option>HIGH</option><option>CRITICAL</option></select></label>
        <label>Charge / Reason *<input value={form.charge} onChange={e => set("charge", e.target.value)} placeholder="Enter charge or reason" /></label>
        <label>Status<select value={form.status} onChange={e => set("status", e.target.value)}><option>ACTIVE</option><option>SERVED</option><option>RECALLED</option><option>QUASHED</option><option>EXPIRED</option></select></label>
        <label>Issue Date / Time<input type="datetime-local" value={form.issued_at} onChange={e => set("issued_at", e.target.value)} /></label>
        <label>Expiration Date<input type="date" value={form.expiration_date} onChange={e => set("expiration_date", e.target.value)} /></label>
        <label>Issuing Authority<input value={form.issuing_authority} onChange={e => set("issuing_authority", e.target.value)} /></label>
        <label>Case Number<input value={form.case_number} onChange={e => set("case_number", e.target.value)} placeholder="CASE-2026-0001" /></label>
        <label>Bond<input value={form.bond} onChange={e => set("bond", e.target.value)} placeholder="No bond / $ amount" /></label>
        <label>Last Known Location<input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Address or area" /></label>
        <label>Issuing Officer<input value={officer} readOnly aria-readonly="true" title="Automatically assigned from the signed-in account." style={{ background: "#e8eef4", color: "#526d89", fontWeight: 700, cursor: "not-allowed" }} /></label>
        <label style={{ gridColumn: "1/-1" }}>Probable Cause / Description<textarea value={form.description} onChange={e => set("description", e.target.value)} rows={4} /></label>
        <label style={{ gridColumn: "1/-1" }}>Special Instructions / Notes<textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} /></label>
      </div>
      <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button type="button" onClick={close}>CANCEL</button><button className="primary" type="button" disabled={saving} onClick={save}>{saving ? "SAVING…" : "SAVE WARRANT"}</button></div>
    </div></div>}
  </>;
}
