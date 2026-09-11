"use client";

import { useEffect, useState } from "react";
import { officerIdentity } from "../lib/officer-identity";

type Incident = Record<string, any>;

type Props = { records: Incident[]; loading: boolean; onRefresh: () => void };

const statuses = ["OPEN", "ACTIVE INVESTIGATION", "SUSPENDED", "CLOSED"];
const prettyDate = (value: unknown) => {
  if (!value) return "";
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
};
const shortDate = (value: unknown) => {
  if (!value) return "";
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function IncidentPanel({ records, loading, onRefresh }: Props) {
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [officer, setOfficer] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("OPEN");
  const [form, setForm] = useState({
    incident_number: "", incident_type: "General Incident", title: "", status: "OPEN", case_number: "",
    occurred_at: "", location: "", description: "", persons_involved: "", evidence: "", officer_notes: "", related_warrant: ""
  });

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" }).then(r => r.json()).then(d => {
      if (d?.user?.username) setOfficer(officerIdentity(String(d.user.username)));
    }).catch(() => {});
  }, []);

  function set(key: string, value: string) { setForm(f => ({ ...f, [key]: value })); }
  function closeNew() { setShowNew(false); setError(""); setSaving(false); }

  async function saveNew() {
    if (!form.title.trim()) { setError("Incident title is required."); return; }
    setSaving(true); setError("");
    try {
      const r = await fetch("/api/records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "incidents", ...form }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Could not save incident.");
      closeNew(); onRefresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save incident."); setSaving(false); }
  }

  async function saveStatus() {
    if (!selected?.id) return;
    setSaving(true); setError("");
    try {
      const r = await fetch("/api/case-status", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "incident", id: selected.id, status: newStatus }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Could not update status.");
      setSelected({ ...selected, status: data.status }); setEditingStatus(false); onRefresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update status."); }
    finally { setSaving(false); }
  }

  function openIncident(record: Incident) { setSelected(record); setNewStatus(String(record.status || "OPEN").toUpperCase()); setError(""); setEditingStatus(false); }

  return <>
    <div className="incident-react-toolbar"><div className="incident-search-note">Click any incident to open the complete case file.</div><button className="header-action incident-new-button" type="button" onClick={() => setShowNew(true)}>＋ NEW INCIDENT REPORT</button></div>
    {loading ? <div className="loading-box">Loading persistent records…</div> : <div className="table-wrap incident-board"><table><thead><tr><th>INCIDENT #</th><th>DATE</th><th>TYPE</th><th>LOCATION</th><th>OFFICER</th><th>STATUS</th></tr></thead><tbody>{records.length ? records.map(r => { const status = String(r.status || "OPEN").toUpperCase(); return <tr key={r.id} onClick={() => openIncident(r)} title="Open incident report"><td><b>{r.incident_number}</b>{r.case_number && <span className="incident-case-sub">{r.case_number}</span>}</td><td className="incident-date">{shortDate(r.occurred_at)}</td><td className="incident-type">{r.incident_type || "General Incident"}</td><td className="incident-location">{r.location || "Not specified"}</td><td className="incident-officer">{r.officer || officer || "OPD Officer"}</td><td className="incident-status-cell"><span className={`incident-status-pill ${status.toLowerCase().replace(/\s+/g, "-")}`}>{status}</span></td></tr>; }) : <tr><td colSpan={6} className="incident-empty">No matching fictional records.</td></tr>}</tbody></table></div>}

    {selected && <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}><div className="record-modal incident-detail-modal" role="dialog" aria-modal="true" aria-label="Incident report">
      <button className="modal-close" type="button" onClick={() => setSelected(null)}>×</button>
      <div className="incident-report-head"><div className="incident-report-icon">▣</div><div><small>OPALINE POLICE DEPARTMENT</small><h2>INCIDENT REPORT</h2><p>{selected.incident_number} · {selected.incident_type || selected.title}</p></div><span className={`incident-status ${String(selected.status || "OPEN").toLowerCase().replace(/\s+/g, "-")}`}>{String(selected.status || "OPEN").toUpperCase()}</span></div>
      <div className="incident-grid"><div><label>INCIDENT NUMBER</label><strong>{selected.incident_number}</strong></div><div><label>CASE NUMBER</label><strong>{selected.case_number || "Not assigned"}</strong></div><div><label>INCIDENT TYPE</label><strong>{selected.incident_type || "General Incident"}</strong></div><div><label>DATE / TIME</label><strong>{prettyDate(selected.occurred_at)}</strong></div><div><label>LOCATION</label><strong>{selected.location || "Not specified"}</strong></div><div><label>REPORTING OFFICER</label><strong>{selected.officer || officer || "OPD Officer"}</strong></div></div>
      <section className="incident-section"><h3>INCIDENT SUMMARY</h3><div className="incident-title">{selected.title}</div><p>{selected.description || selected.notes || "No narrative has been entered."}</p></section>
      <section className="incident-section"><h3>PERSONS INVOLVED</h3><p>{selected.persons_involved || "No persons have been listed."}</p></section>
      <section className="incident-section"><h3>EVIDENCE / ATTACHMENTS</h3><p>{selected.evidence || "No evidence has been logged."}</p></section>
      <div className="incident-two"><section className="incident-section"><h3>OFFICER NOTES</h3><p>{selected.officer_notes || "No officer notes."}</p></section><section className="incident-section"><h3>RELATED WARRANT</h3><p>{selected.related_warrant || "None listed"}</p></section></div>
      {error && <div className="auth-error" style={{ marginTop: 12 }}>{error}</div>}
      {editingStatus && <div className="incident-status-editor"><label>CASE STATUS<select value={newStatus} onChange={e => setNewStatus(e.target.value)}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label><div><button type="button" onClick={() => { setEditingStatus(false); setError(""); }}>CANCEL</button><button className="primary" type="button" disabled={saving} onClick={saveStatus}>{saving ? "SAVING…" : "SAVE STATUS"}</button></div></div>}
      <div className="incident-case-footer"><span>CREATED {prettyDate(selected.created_at)}</span><button className="header-action" type="button" onClick={() => setEditingStatus(v => !v)}>{editingStatus ? "CLOSE STATUS EDIT" : "EDIT STATUS"}</button><span>FICTIONAL ROLEPLAY RECORD</span></div>
    </div></div>}

    {showNew && <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) closeNew(); }}><div className="record-modal incident-entry-modal" role="dialog" aria-modal="true" aria-label="New incident report">
      <button className="modal-close" type="button" onClick={closeNew}>×</button><div className="modal-head"><div className="modal-icon">▣</div><div><small>OPALINE POLICE DEPARTMENT</small><h2>NEW INCIDENT REPORT</h2><p>Create a fictional case file for the OPD RP database.</p></div></div>
      {error && <div className="auth-error" style={{ display: "block", marginTop: 15 }}>{error}</div>}
      <div className="new-form"><label>Incident Number<input value={form.incident_number} onChange={e => set("incident_number", e.target.value)} placeholder="Automatic: OPD-2026-0001" /></label><label>Incident Type<select value={form.incident_type} onChange={e => set("incident_type", e.target.value)}><option>General Incident</option><option>Missing Person</option><option>Suspicious Death</option><option>Homicide</option><option>Assault</option><option>Burglary</option><option>Domestic Disturbance</option><option>Drug Offense</option><option>Traffic Incident</option><option>Welfare Check</option><option>Other</option></select></label><label>Incident Title *<input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Short case title" /></label><label>Status<select value={form.status} onChange={e => set("status", e.target.value)}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label><label>Case Number<input value={form.case_number} onChange={e => set("case_number", e.target.value)} placeholder="CASE-2026-0001" /></label><label>Date / Time<input type="datetime-local" value={form.occurred_at} onChange={e => set("occurred_at", e.target.value)} /></label><label>Location<input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Address, business, area, or scene" /></label><label>Reporting Officer<input value={officer} readOnly aria-readonly="true" /></label><label style={{ gridColumn: "1/-1" }}>Incident Narrative<textarea value={form.description} onChange={e => set("description", e.target.value)} rows={5} /></label><label style={{ gridColumn: "1/-1" }}>Persons Involved<textarea value={form.persons_involved} onChange={e => set("persons_involved", e.target.value)} rows={3} /></label><label style={{ gridColumn: "1/-1" }}>Evidence / Attachments<textarea value={form.evidence} onChange={e => set("evidence", e.target.value)} rows={3} /></label><label style={{ gridColumn: "1/-1" }}>Officer Notes<textarea value={form.officer_notes} onChange={e => set("officer_notes", e.target.value)} rows={3} /></label><label style={{ gridColumn: "1/-1" }}>Related Warrant<input value={form.related_warrant} onChange={e => set("related_warrant", e.target.value)} /></label></div>
      <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button type="button" onClick={closeNew}>CANCEL</button><button className="primary" type="button" disabled={saving} onClick={saveNew}>{saving ? "SAVING…" : "SAVE INCIDENT"}</button></div>
    </div></div>}
  </>;
}
