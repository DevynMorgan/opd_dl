"use client";

import { useMemo, useState } from "react";
import { Search, Shield, UserRound, Car, FileWarning, Database, ChevronRight, FileText, BarChart3, Mail, Settings, RotateCcw } from "lucide-react";

const records = [
  {name:"Bryce Fane",license:"OP-482917",dob:"04/17/1998",status:"VALID",class:"C",height:"5'7\"",hair:"Black",eyes:"Green",warrants:"CLEAR",vehicle:"No registered vehicles"},
  {name:"Emi Vale",license:"OP-318204",dob:"11/02/1996",status:"SUSPENDED",class:"C",height:"5'5\"",hair:"Brown",eyes:"Hazel",warrants:"CLEAR",vehicle:"2019 Black Sedan"},
  {name:"Matt Holloway",license:"OP-771493",dob:"08/21/1994",status:"VALID",class:"C",height:"6'0\"",hair:"Brown",eyes:"Blue",warrants:"CLEAR",vehicle:"2022 Gray Pickup"},
];

export default function Home(){
 const [query,setQuery]=useState(""); const [selected,setSelected]=useState<(typeof records)[number]|null>(null); const [searched,setSearched]=useState(false);
 const results=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return records;return records.filter(r=>r.name.toLowerCase().includes(q)||r.license.toLowerCase().includes(q)||r.dob.includes(q))},[query]);
 function searchRecords(){setSearched(true);setSelected(results[0]??null)}
 function clearSearch(){setQuery("");setSearched(false);setSelected(null)}
 return <main className="shell">
  <header className="topbar">
   <div className="brand"><div className="badge"><Shield size={50}/><small>OPALINE</small></div><div><strong>OPALINE FIRST RESPONDERS</strong><span>FIRE · EMS · POLICE</span><i>PEOPLE · SERVICE · A STRONGER TOMORROW</i></div></div>
   <div className="secure"><UserRound size={19}/> OFFICER: 1027<br/><b>OPD · SECURE</b></div>
  </header>
  <div className="content">
   <aside className="sidebar"><nav>
    <button className="active"><Search size={20}/> Search</button><button><Database size={20}/> Driver Licenses</button><button><UserRound size={20}/> People / Records</button><button><Car size={20}/> Vehicles</button><button><FileText size={20}/> Citations</button><button><FileWarning size={20}/> Warrants</button><button><Shield size={20}/> Incidents</button><button><BarChart3 size={20}/> Reports</button><button><Mail size={20}/> Messages</button><button><Settings size={20}/> Admin</button>
   </nav><div className="sidebar-note"><b>OPALINE</b><span>A STRONGER TOMORROW<br/>TOGETHER</span></div></aside>
   <section className="workspace">
    <div className="maincol">
     <div className="search-card"><div className="card-title"><Search size={38}/><div><h1>SEARCH RECORDS</h1><p>Search by name, license number, date of birth or other information.</p></div></div>
      <div className="tabs"><button className="on">Person / License</button><button>Vehicle</button><button>Warrant</button><button>Citation</button><button>Incident</button></div>
      <div className="search-form"><label>Search Record<input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchRecords()} placeholder="Name, license number, or date of birth"/></label></div>
      <div className="actions"><button className="primary" onClick={searchRecords}><Search size={19}/> SEARCH</button><button onClick={clearSearch}><RotateCcw size={19}/> CLEAR</button></div>
     </div>
     <div className="results-panel"><div className="card-title small"><FileText size={31}/><div><h2>{searched?"SEARCH RESULTS":"RECENT RECORDS"}</h2><p>{searched?`${results.length} matching fictional record${results.length===1?"":"s"}.`:"Select a record to view driver information."}</p></div></div>
      <div className="records-grid"><div className="record-list">{results.length?results.map(r=><button className={`record ${selected?.license===r.license?"selected":""}`} key={r.license} onClick={()=>setSelected(r)}><div className="record-icon"><UserRound size={20}/></div><div className="record-main"><strong>{r.name}</strong><span>{r.license} · DOB {r.dob}</span></div><span className={`status ${r.status.toLowerCase()}`}>{r.status}</span><ChevronRight size={18}/></button>):<div className="empty"><Database size={32}/><strong>NO RECORD FOUND</strong><span>No fictional Opaline record matches that search.</span></div>}</div>
      {selected&&<div className="detail"><div className="detail-top"><div><small>DRIVER LICENSE RECORD</small><h2>{selected.name}</h2></div><span className={`status ${selected.status.toLowerCase()}`}>{selected.status}</span></div><div className="license-number">LICENSE NUMBER <b>{selected.license}</b></div><div className="fields"><div><small>DATE OF BIRTH</small><b>{selected.dob}</b></div><div><small>LICENSE CLASS</small><b>{selected.class}</b></div><div><small>HEIGHT</small><b>{selected.height}</b></div><div><small>HAIR</small><b>{selected.hair}</b></div><div><small>EYES</small><b>{selected.eyes}</b></div><div><small>WARRANT STATUS</small><b>{selected.warrants}</b></div></div><div className="vehicle"><Car size={20}/><div><small>REGISTERED VEHICLE</small><b>{selected.vehicle}</b></div></div></div>}</div>
     </div>
    </div>
    <aside className="rightcol"><div className="opaline-card"><strong>OPALINE</strong><span>COMMUNITY · PEOPLE · HOME</span><i>Stronger Together</i></div><div className="quick-card"><h2>QUICK LINKS</h2><button><UserRound/> New Record</button><button><Database/> Scan ID / License</button><button><Car/> Vehicle Lookup</button><button><Search/> Recent Searches</button><button><FileWarning/> BOLO / Alerts</button></div><div className="system-card"><h3>SYSTEM STATUS</h3><b><span className="dot"/> ONLINE</b><p>September 9, 2026<br/><strong>11:47 AM</strong></p></div></aside>
   </section>
  </div><footer>OPALINE FIRST RESPONDERS · RECORDS MANAGEMENT SYSTEM <span>AUTHORIZED USE ONLY · FICTIONAL RP DATABASE</span></footer>
 </main>
}
