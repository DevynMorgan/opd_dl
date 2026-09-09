"use client";

import { useMemo, useState } from "react";
import { Search, Shield, UserRound, Car, FileWarning, Database, ChevronRight } from "lucide-react";

const records = [
  {
    name: "Bryce Fane",
    license: "OP-482917",
    dob: "04/17/1998",
    status: "VALID",
    class: "C",
    height: "5'7\"",
    hair: "Black",
    eyes: "Green",
    warrants: "CLEAR",
    vehicle: "No registered vehicles",
  },
  {
    name: "Emi Vale",
    license: "OP-318204",
    dob: "11/02/1996",
    status: "SUSPENDED",
    class: "C",
    height: "5'5\"",
    hair: "Brown",
    eyes: "Hazel",
    warrants: "CLEAR",
    vehicle: "2019 Black Sedan",
  },
  {
    name: "Matt Holloway",
    license: "OP-771493",
    dob: "08/21/1994",
    status: "VALID",
    class: "C",
    height: "6'0\"",
    hair: "Brown",
    eyes: "Blue",
    warrants: "CLEAR",
    vehicle: "2022 Gray Pickup",
  },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<(typeof records)[number] | null>(null);
  const [searched, setSearched] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => r.name.toLowerCase().includes(q) || r.license.toLowerCase().includes(q) || r.dob.includes(q));
  }, [query]);

  function searchRecords() {
    setSearched(true);
    setSelected(results[0] ?? null);
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><div className="badge"><Shield size={23} /></div><div><strong>OPALINE POLICE DEPARTMENT</strong><span>LAW ENFORCEMENT RECORDS TERMINAL</span></div></div>
        <div className="secure"><span className="dot" /> SECURE CONNECTION <b>OPD</b></div>
      </header>

      <div className="content">
        <aside className="sidebar">
          <div className="officer"><div className="avatar"><UserRound size={24} /></div><div><small>OFFICER ACCESS</small><strong>AUTHORIZED USER</strong></div></div>
          <nav>
            <button className="active"><Database size={18}/> Records Search</button>
            <button><UserRound size={18}/> Driver Licenses</button>
            <button><Car size={18}/> Vehicle Records</button>
            <button><FileWarning size={18}/> Warrants & Alerts</button>
          </nav>
          <div className="sidebar-note"><b>RP DATABASE</b><span>Fictional community records only.</span></div>
        </aside>

        <section className="workspace">
          <div className="page-title"><div><p>OPD / RECORDS</p><h1>Driver License Search</h1><span>Search the fictional Opaline records database by name, license number, or date of birth.</span></div><div className="terminal">TERMINAL 07<br/><b>ONLINE</b></div></div>

          <div className="search-card">
            <label>SEARCH RECORDS</label>
            <div className="search-row"><Search size={21}/><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchRecords()} placeholder="Enter name, license number, or date of birth..."/><button onClick={searchRecords}>SEARCH</button></div>
            <div className="quick"><span>QUICK SEARCH:</span>{["Bryce Fane", "Emi Vale", "Matt Holloway"].map((n) => <button key={n} onClick={() => {setQuery(n); setSearched(true); setSelected(records.find(r => r.name === n) ?? null)}}>{n}</button>)}</div>
          </div>

          <div className="results-head"><div><small>DATABASE RESULTS</small><h2>{searched ? `${results.length} MATCH${results.length === 1 ? "" : "ES"} FOUND` : "RECENT RECORDS"}</h2></div><span>LAST SYNC: 09/09/2026</span></div>

          <div className="records-grid">
            <div className="record-list">
              {results.length ? results.map((r) => <button className={`record ${selected?.license === r.license ? "selected" : ""}`} key={r.license} onClick={() => setSelected(r)}><div className="record-icon"><UserRound size={20}/></div><div className="record-main"><strong>{r.name}</strong><span>{r.license} · DOB {r.dob}</span></div><span className={`status ${r.status.toLowerCase()}`}>{r.status}</span><ChevronRight size={18}/></button>) : <div className="empty"><Database size={32}/><strong>NO RECORD FOUND</strong><span>No fictional OPD record matches that search.</span></div>}
            </div>

            {selected && <div className="detail"><div className="detail-top"><div><small>DRIVER LICENSE RECORD</small><h2>{selected.name}</h2></div><span className={`status ${selected.status.toLowerCase()}`}>{selected.status}</span></div><div className="license-number">LICENSE NUMBER <b>{selected.license}</b></div><div className="fields"><div><small>DATE OF BIRTH</small><b>{selected.dob}</b></div><div><small>LICENSE CLASS</small><b>{selected.class}</b></div><div><small>HEIGHT</small><b>{selected.height}</b></div><div><small>HAIR</small><b>{selected.hair}</b></div><div><small>EYES</small><b>{selected.eyes}</b></div><div><small>WARRANT STATUS</small><b>{selected.warrants}</b></div></div><div className="vehicle"><Car size={20}/><div><small>REGISTERED VEHICLE</small><b>{selected.vehicle}</b></div></div><div className="footer-note">RECORD TYPE: FICTIONAL RP · FOR COMMUNITY USE ONLY</div></div>}
          </div>
        </section>
      </div>
    </main>
  );
}
