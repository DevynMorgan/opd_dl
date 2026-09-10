"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, BarChart3, CalendarDays, Car, Clock3, Database, Eye,
  FileText, History, IdCard, LogOut, Mail, Pencil, Plus, RotateCcw, Search,
  Settings, Shield, UserPlus, UserRound, UsersRound, X
} from "lucide-react";

type RecordRow = Record<string, any>;

const navItems = [
  ["Search", Search], ["Driver Licenses", IdCard], ["People / Records", UserRound],
  ["Vehicles", Car], ["Citations", FileText], ["Warrants", UsersRound],
  ["Incidents", Shield], ["Reports", BarChart3], ["Messages", Mail], ["Admin", Settings]
] as const;

const apiType: Record<string, string> = {
  "Driver Licenses": "licenses", "People / Records": "people", Vehicles: "vehicles",
  Citations: "citations", Warrants: "warrants", Incidents: "incidents", Messages: "messages"
};

const fmt = (v: any) => {
  if (!v) return "";
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-US");
};

export default function Home() {
  const [section, setSection] = useState("Search");
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");
  const [query, setQuery] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [license, setLicense] = useState("");
  const [dob, setDob] = useState("");
  const [selected, setSelected] = useState<RecordRow | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editRecord, setEditRecord] = useState<RecordRow | null>(null);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newDob, setNewDob] = useState("");
  const [newLicense, setNewLicense] = useState("");
  const [newGender, setNewGender] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const type = apiType[section] || "people";

  async function loadRecords(target = type, q = query) {
    setLoading(true);
    setDbError("");
    try {
      const r = await fetch(`/api/records?type=${encodeURIComponent(target)}&q=${encodeURIComponent(q)}&limit=100`, { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Database request failed");
      setRecords(data);
    } catch (e) {
      setRecords([]);
      setDbError(e instanceof Error ? e.message : "Database unavailable");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (section === "Search") loadRecords("people", "");
    else if (section !== "Reports" && section !== "Admin") loadRecords(type, "");
  }, [section]);

  async function searchPeople() {
    const q = [firstName, lastName, license, dob].filter(Boolean).join(" ").trim();
    setQuery(q);
    await loadRecords("people", q);
  }

  function clearSearch() {
    setFirstName(""); setLastName(""); setLicense(""); setDob(""); setQuery(""); setSelected(null);
    loadRecords("people", "");
  }

  async function addPerson() {
    if (!newFirst.trim() || !newLast.trim()) return;
    setSaveMessage("");
    const r = await fetch("/api/records", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "people", first_name: newFirst, last_name: newLast, dob: newDob || null, gender: newGender || null, notes: "Fictional RP record." })
    });
    const data = await r.json();
    if (!r.ok) { setSaveMessage(data.error || "Could not save record"); return; }
    if (newLicense.trim()) {
      const lr = await fetch("/api/records", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "licenses", person_id: data.id, license_number: newLicense, license_class: "C", status: "VALID", notes: "Fictional RP record." })
      });
      if (!lr.ok) {
        const licenseData = await lr.json().catch(() => ({}));
        setSaveMessage(licenseData.error || "Person saved, but the license could not be saved.");
        await loadRecords("people", "");
        return;
      }
    }
    setShowNew(false); setNewFirst(""); setNewLast(""); setNewDob(""); setNewLicense(""); setNewGender("");
    setSection("People / Records"); setQuery(""); setSaveMessage("Record saved to the persistent RP database.");
    await loadRecords("people", "");
  }

  async function updatePerson(record: RecordRow, values: Record<string, string>) {
    setSaveMessage("");
    const r = await fetch("/api/records", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "people", id: record.id, ...values })
    });
    const data = await r.json();
    if (!r.ok) { setSaveMessage(data.error || "Could not update record"); return false; }
    setEditRecord(null);
    setSelected(data);
    setSaveMessage("Record updated successfully.");
    await loadRecords("people", query);
    return true;
  }

  const heading = section === "Search" ? ["SEARCH RECORDS", "Search the persistent fictional records database."]
    : section === "Driver Licenses" ? ["DRIVER LICENSES", "Review fictional driver license records and status."]
    : section === "People / Records" ? ["PEOPLE / RECORDS", "Character records and associated information."]
    : section === "Vehicles" ? ["VEHICLE RECORDS", "Search fictional registrations and vehicle records."]
    : section === "Citations" ? ["CITATIONS", "Citation history and current citation status."]
    : section === "Warrants" ? ["WARRANTS & BOLO", "Active fictional warrants, alerts, and review items."]
    : section === "Incidents" ? ["INCIDENTS", "Open and historical fictional incident records."]
    : section === "Reports" ? ["REPORTS", "Database-backed records overview."]
    : section === "Messages" ? ["MESSAGES", "Department messages and system notices."]
    : ["ADMINISTRATION", "Manage fictional RP records and system data."];

  const headers: Record<string, string[]> = {
    "Driver Licenses": ["NAME", "LICENSE", "CLASS", "DOB", "STATUS", "EXPIRES"],
    "People / Records": ["NAME", "DOB", "GENDER", "LICENSE", "VEHICLE", "STATUS"],
    Vehicles: ["PLATE", "VIN / RECORD ID", "REGISTERED OWNER", "VEHICLE", "STATUS"],
    Citations: ["CITATION", "NAME", "CHARGE", "STATUS", "DATE", "OFFICER"],
    Warrants: ["ID", "NAME", "PRIORITY", "STATUS", "ISSUED", "LOCATION"],
    Incidents: ["INCIDENT", "TITLE", "LOCATION", "DATE / TIME", "STATUS"],
    Messages: ["SUBJECT", "SENDER", "PRIORITY", "READ STATE", "DATE"]
  };

  const rows = useMemo(() => {
    if (section === "Driver Licenses") return records.map(r => [`${r.first_name} ${r.last_name}`, r.license_number, r.license_class || "C", fmt(r.dob), r.status, fmt(r.expiration_date)]);
    if (section === "People / Records") return records.map(r => [`${r.first_name} ${r.last_name}`, fmt(r.dob), r.gender || "—", r.license_number || "None", r.vehicle_label || "None", r.license_status || r.status]);
    if (section === "Vehicles") return records.map(r => [r.plate, r.vin || "", r.owner || "Unassigned", `${r.year || ""} ${r.color || ""} ${r.make || ""} ${r.model || ""}`.trim(), r.registration_status]);
    if (section === "Citations") return records.map(r => [r.citation_number, r.name || "Unknown", r.charge, r.status, fmt(r.issued_at), r.officer || "1027"]);
    if (section === "Warrants") return records.map(r => [r.warrant_number, r.name || "Unknown", r.priority, r.status, fmt(r.issued_at), r.location || ""]);
    if (section === "Incidents") return records.map(r => [r.incident_number, r.title, r.location || "", fmt(r.occurred_at), r.status]);
    if (section === "Messages") return records.map(r => [r.subject, r.sender, r.priority, r.read ? "READ" : "UNREAD", fmt(r.created_at)]);
    return [];
  }, [records, section]);

  return <main className="shell">
    <header className="topbar">
      <div className="brand">
        <img className="patch" src="/Opaline_FR_Patch.png" alt="Opaline First Responders" />
        <div className="brand-copy"><strong>OPALINE FIRST RESPONDERS</strong><span>FIRE&nbsp;&nbsp;•&nbsp;&nbsp; EMS&nbsp;&nbsp;•&nbsp;&nbsp; POLICE</span><i>PEOPLE&nbsp;&nbsp;•&nbsp;&nbsp; SERVICE&nbsp;&nbsp;•&nbsp;&nbsp; A STRONGER TOMORROW</i></div>
        <div className="mountain-brand"><b>OPALINE</b><span>COMMUNITY · SAFETY · TOGETHER</span></div>
      </div>
      <div className="account"><div className="account-line"><UserRound size={25} /><span>OFFICER: 1027<br /><b>OPD</b></span><span className="chev">⌄</span></div><button><LogOut size={21} /> LOG OUT</button></div>
    </header>

    <div className="content">
      <aside className="sidebar"><nav>{navItems.map(([label, Icon]) => <button key={label} className={section === label ? "active" : ""} onClick={() => { setSection(label); setSelected(null); setQuery(""); }}><Icon />{label}</button>)}</nav><div className="sidebar-note"><div className="mini-mountains" /><b>OPALINE</b><span>A STRONGER<br />TOMORROW<br />TOGETHER</span></div></aside>
      <section className="workspace"><div className="maincol">
        {dbError && <div className="db-alert"><Database size={19} /><span>{dbError}</span><button onClick={() => loadRecords(type, query)}>RETRY</button></div>}
        {saveMessage && <div className="save-alert">{saveMessage}</div>}

        {section === "Search" && <>
          <section className="search-card"><div className="section-heading"><Search size={45} /><div><h1>SEARCH RECORDS</h1><p>{heading[1]}</p></div></div>
            <div className="tabs">{["Person / License", "Vehicle", "Warrant", "Citation", "Incident"].map(tab => <button key={tab} className={tab === "Person / License" ? "on" : ""}>{tab}</button>)}</div>
            <div className="form-grid">
              <label>First Name<input value={firstName} onChange={e => setFirstName(e.target.value)} onKeyDown={e => e.key === "Enter" && searchPeople()} placeholder="Enter first name" /></label>
              <label>License Number<input value={license} onChange={e => setLicense(e.target.value)} onKeyDown={e => e.key === "Enter" && searchPeople()} placeholder="e.g. OP-123456" /></label>
              <label>Last Name<input value={lastName} onChange={e => setLastName(e.target.value)} onKeyDown={e => e.key === "Enter" && searchPeople()} placeholder="Enter last name" /></label>
              <label>Date of Birth<div className="input-icon"><input value={dob} onChange={e => setDob(e.target.value)} onKeyDown={e => e.key === "Enter" && searchPeople()} placeholder="mm/dd/yyyy" /><CalendarDays size={19} /></div></label>
            </div>
            <div className="actions"><button className="primary" onClick={searchPeople}><Search />SEARCH</button><button onClick={clearSearch}><RotateCcw />CLEAR</button></div>
          </section>
          <section className="recent-card"><div className="section-heading small"><FileText size={42} /><div><h2>{query ? "SEARCH RESULTS" : "RECENT RECORDS"}</h2><p>{loading ? "Loading persistent records…" : `${records.length} fictional record${records.length === 1 ? "" : "s"} in the database.`}</p></div></div><RecordTable headers={["NAME", "TYPE", "LICENSE / DOB", "VEHICLE", "STATUS"]} rows={records.map(r => [`${r.first_name} ${r.last_name}`, "Person / License", r.license_number || fmt(r.dob), r.vehicle_label || "None", r.license_status || r.status])} source={records} onSelect={setSelected} /></section>
        </>}

        {section !== "Search" && section !== "Reports" && section !== "Admin" && <section className="recent-card module-card"><div className="module-toolbar"><div className="section-heading small"><Database size={42} /><div><h2>{heading[0]}</h2><p>{heading[1]}</p></div></div>{section === "People / Records" && <button className="header-action" onClick={() => setShowNew(true)}><Plus size={18} /> NEW RECORD</button>}</div><div className="module-search"><Search size={19} /><input value={query} onChange={e => { setQuery(e.target.value); loadRecords(type, e.target.value); }} placeholder={`Search ${section.toLowerCase()}...`} /></div>{loading ? <div className="loading-box">Loading persistent records…</div> : <RecordTable headers={headers[section] || []} rows={rows} source={records} onSelect={setSelected} />}</section>}
        {section === "Reports" && <ReportsPanel />}
        {section === "Admin" && <AdminPanel onNew={() => setShowNew(true)} onRefresh={() => loadRecords("people", "")} />}
      </div>

      <aside className="rightcol"><div className="scenic-card"><div className="scenic-overlay"><b>OPALINE</b><span>COMMUNITY · PEOPLE · HOME</span><i>Stronger Together.</i></div></div><div className="quick-card"><h2>QUICK LINKS</h2><button onClick={() => setShowNew(true)}><UserPlus />New Record</button><button onClick={() => setSection("Driver Licenses")}><IdCard />Scan ID / License</button><button onClick={() => setSection("Vehicles")}><Car />Vehicle Lookup</button><button onClick={() => setSection("Search")}><History />Recent Searches</button><button onClick={() => setSection("Warrants")}><AlertTriangle />BOLO / Alerts</button></div><div className="system-card"><h3>SYSTEM STATUS</h3><div className="status-row"><b><span className="online-dot" /> ONLINE</b><span>September 9, 2026</span></div><strong>DATABASE CONNECTED</strong><div className="system-footer">SERVICE&nbsp;&nbsp;•&nbsp;&nbsp; INTEGRITY&nbsp;&nbsp;•&nbsp;&nbsp; COMMUNITY</div></div></aside>
      </section></div>
    <footer><span>OPALINE FIRST RESPONDERS&nbsp;&nbsp; | &nbsp;&nbsp; RECORDS MANAGEMENT SYSTEM</span><span>AUTHORIZED USE ONLY&nbsp;&nbsp; | &nbsp;&nbsp; FICTIONAL ROLEPLAY DATA</span></footer>
    {selected && <RecordModal record={selected} onClose={() => setSelected(null)} onEdit={() => setEditRecord(selected)} />}
    {editRecord && <EditPersonModal record={editRecord} onSave={values => updatePerson(editRecord, values)} onClose={() => setEditRecord(null)} />}
    {showNew && <NewPersonModal first={newFirst} last={newLast} dob={newDob} license={newLicense} gender={newGender} setFirst={setNewFirst} setLast={setNewLast} setDob={setNewDob} setLicense={setNewLicense} setGender={setNewGender} onSave={addPerson} onClose={() => setShowNew(false)} />}
  </main>;
}

function RecordTable({ headers, rows, source, onSelect }: { headers: string[]; rows: string[][]; source: RecordRow[]; onSelect: (r: RecordRow) => void }) {
  return <div className="table-wrap"><table><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, i) => <tr key={i} onClick={() => source[i] && onSelect(source[i])}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>) : <tr><td colSpan={headers.length}>No matching fictional records.</td></tr>}</tbody></table></div>;
}

function RecordModal({ record, onClose, onEdit }: { record: RecordRow; onClose: () => void; onEdit: () => void }) {
  const name = record.first_name && record.last_name ? `${record.first_name} ${record.last_name}` : record.name || record.subject || record.title || record.license_number || record.plate || "Record";
  const canEditPerson = Boolean(record.id && record.first_name && record.last_name);
  return <div className="modal-backdrop" onClick={onClose}><div className="record-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={onClose}><X /></button><div className="modal-head"><div className="modal-icon"><Eye /></div><div><small>FICTIONAL RP RECORD</small><h2>{name}</h2><p>{record.license_number || record.plate || record.incident_number || record.citation_number || record.warrant_number || "OPD database record"}</p></div></div><div className="modal-grid">{Object.entries(record).filter(([k]) => !k.endsWith("_id") && !["created_at", "person_id", "id", "eyes", "hair"].includes(k)).slice(0, 18).map(([key, value]) => <div key={key}><small>{key.replaceAll("_", " ").toUpperCase()}</small><b>{value === null || value === "" ? "—" : String(value)}</b></div>)}</div><div className="actions modal-actions"><button className="primary" onClick={canEditPerson ? onEdit : onClose} disabled={!canEditPerson}><Pencil />EDIT RECORD</button><button onClick={onClose}>CLOSE RECORD</button></div></div></div>;
}

function EditPersonModal({ record, onSave, onClose }: { record: RecordRow; onSave: (values: Record<string, string>) => Promise<boolean>; onClose: () => void }) {
  const [first, setFirst] = useState(record.first_name || "");
  const [last, setLast] = useState(record.last_name || "");
  const [dob, setDob] = useState(record.dob ? String(record.dob).slice(0, 10) : "");
  const [gender, setGender] = useState(record.gender || "");
  const [alias, setAlias] = useState(record.alias || "");
  const [address, setAddress] = useState(record.address || "");
  const [licenseNumber, setLicenseNumber] = useState(record.license_number || "");
  const [licenseClass, setLicenseClass] = useState(record.license_class || "C");
  const [height, setHeight] = useState(record.height || "");
  const [weight, setWeight] = useState(record.weight || "");
  const [status, setStatus] = useState(record.status || "ACTIVE");
  const [notes, setNotes] = useState(record.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!first.trim() || !last.trim()) { setError("First and last name are required."); return; }
    setSaving(true); setError("");
    const ok = await onSave({ first_name: first, last_name: last, dob, gender, alias, address, license_number: licenseNumber, license_class: licenseClass, height, weight, status, notes });
    if (!ok) setError("The record could not be updated.");
    setSaving(false);
  }

  return <div className="modal-backdrop" onClick={onClose}><div className="record-modal new-record" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={onClose}><X /></button><div className="modal-head"><div className="modal-icon"><Pencil /></div><div><small>ADMIN / RECORD EDIT</small><h2>EDIT PERSON RECORD</h2><p>Update the existing database record. This does not create a duplicate.</p></div></div><div className="new-form"><label>First Name<input value={first} onChange={e => setFirst(e.target.value)} autoFocus /></label><label>Last Name<input value={last} onChange={e => setLast(e.target.value)} /></label><label>Date of Birth<input type="date" value={dob} onChange={e => setDob(e.target.value)} /></label><label>Gender<select value={gender} onChange={e => setGender(e.target.value)}><option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option></select></label><label>Alias<input value={alias} onChange={e => setAlias(e.target.value)} placeholder="Optional" /></label><label>Address<input value={address} onChange={e => setAddress(e.target.value)} placeholder="Optional" /></label><label>License Number<input value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} placeholder="Optional OP-######" /></label><label>License Class<select value={licenseClass} onChange={e => setLicenseClass(e.target.value)}><option value="C">C</option><option value="A">A</option><option value="B">B</option><option value="M">M</option><option value="CDL">CDL</option><option value="D">D</option></select></label><label>Height<input value={height} onChange={e => setHeight(e.target.value)} placeholder="e.g. 5 FEET 8 INCHES" /></label><label>Weight<input value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 150" /></label><label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option>ACTIVE</option><option>INACTIVE</option><option>DECEASED</option><option>UNKNOWN</option></select></label><label className="full-width">Notes<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} /></label></div>{error && <div className="save-alert">{error}</div>}<div className="actions modal-actions"><button className="primary" onClick={save} disabled={saving}><Pencil />{saving ? "SAVING..." : "SAVE CHANGES"}</button><button onClick={onClose} disabled={saving}>CANCEL</button></div></div></div>;
}

function NewPersonModal({ first, last, dob, license, gender, setFirst, setLast, setDob, setLicense, setGender, onSave, onClose }: { first: string; last: string; dob: string; license: string; gender: string; setFirst: (v: string) => void; setLast: (v: string) => void; setDob: (v: string) => void; setLicense: (v: string) => void; setGender: (v: string) => void; onSave: () => void; onClose: () => void }) {
  return <div className="modal-backdrop" onClick={onClose}><div className="record-modal new-record" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={onClose}><X /></button><div className="modal-head"><div className="modal-icon"><UserPlus /></div><div><small>ADMIN / RECORD CREATION</small><h2>NEW PERSON RECORD</h2><p>Create a fictional RP character and optionally assign a license.</p></div></div><div className="new-form"><label>First Name<input value={first} onChange={e => setFirst(e.target.value)} placeholder="First name" autoFocus /></label><label>Last Name<input value={last} onChange={e => setLast(e.target.value)} placeholder="Last name" /></label><label>Date of Birth<input value={dob} onChange={e => setDob(e.target.value)} placeholder="YYYY-MM-DD" /></label><label>Gender<select value={gender} onChange={e => setGender(e.target.value)}><option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option></select></label><label>License Number<input value={license} onChange={e => setLicense(e.target.value)} placeholder="Optional OP-######" /></label></div><div className="actions modal-actions"><button className="primary" onClick={onSave}><Plus />SAVE TO DATABASE</button><button onClick={onClose}>CANCEL</button></div></div></div>;
}

function ReportsPanel() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => { Promise.all(["people", "licenses", "vehicles", "citations", "warrants", "incidents", "messages"].map(t => fetch(`/api/records?type=${t}&limit=200`).then(r => r.json()))).then(a => setCounts({ people: a[0].length, licenses: a[1].length, vehicles: a[2].length, citations: a[3].length, warrants: a[4].length, incidents: a[5].length, messages: a[6].length })).catch(() => {}); }, []);
  const items = [["People", counts.people || 0, UserRound], ["Licenses", counts.licenses || 0, IdCard], ["Vehicles", counts.vehicles || 0, Car], ["Citations", counts.citations || 0, FileText], ["Warrants", counts.warrants || 0, AlertTriangle], ["Incidents", counts.incidents || 0, Shield], ["Messages", counts.messages || 0, Mail]] as const;
  return <section className="recent-card reports-panel"><div className="section-heading"><BarChart3 size={45} /><div><h1>REPORTS</h1><p>Live counts from the persistent fictional RP database.</p></div></div><div className="stats-grid">{items.map(([label, count, Icon]) => <div className="stat-card" key={label}><Icon /><span>{label}</span><strong>{count}</strong></div>)}</div><div className="report-note"><Clock3 /> Counts are read directly from PostgreSQL.</div></section>;
}

function AdminPanel({ onNew, onRefresh }: { onNew: () => void; onRefresh: () => void }) {
  return <section className="recent-card reports-panel"><div className="section-heading"><Settings size={45} /><div><h1>ADMINISTRATION</h1><p>Manage fictional RP records and system data.</p></div></div><div className="actions"><button className="primary" onClick={onNew}><UserPlus />NEW PERSON RECORD</button><button onClick={onRefresh}><RotateCcw />REFRESH DATABASE</button></div><div className="admin-note">All records in this system are fictional roleplay data. Database persistence is provided by PostgreSQL when DATABASE_URL is configured.</div></section>;
}
