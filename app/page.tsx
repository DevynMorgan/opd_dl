"use client";

import { useMemo, useState } from "react";
import { Search, UserRound, Car, FileWarning, FileText, BarChart3, Mail, Settings, RotateCcw, LogOut, UserPlus, History, AlertTriangle, Shield, CalendarDays, IdCard, UsersRound } from "lucide-react";

const records = [
  {name:"Bryce Fane",license:"OP-482917",dob:"04/17/1998",status:"VALID",type:"License",first:"Bryce",last:"Fane",vehicle:"No registered vehicles"},
  {name:"Majken Blomqvist",license:"",dob:"03/14/1992",status:"VALID",type:"Person",first:"Majken",last:"Blomqvist",vehicle:"2021 White Sedan"},
  {name:"Devyn Kitchi",license:"OP-337221",dob:"06/22/1995",status:"VALID",type:"License",first:"Devyn",last:"Kitchi",vehicle:"2024 Black SUV"},
  {name:"Ryan Morrison",license:"OP-7719",dob:"12/09/1990",status:"VALID",type:"Vehicle",first:"Ryan",last:"Morrison",vehicle:"2020 Gray Pickup"},
  {name:"Emilee Caldwell",license:"",dob:"06/27/1996",status:"SUSPENDED",type:"Person",first:"Emilee",last:"Caldwell",vehicle:"2018 Red Coupe"},
  {name:"Emi Vale",license:"OP-318204",dob:"11/02/1996",status:"SUSPENDED",type:"License",first:"Emi",last:"Vale",vehicle:"2019 Black Sedan"},
  {name:"Matt Holloway",license:"OP-771493",dob:"08/21/1994",status:"VALID",type:"License",first:"Matt",last:"Holloway",vehicle:"2022 Gray Pickup"},
];

const recentTimes = ["11:42","10:28","09:17","22:11","20:03"];
const recentOfficers = ["1027","1027","1041","1027","1033"];

export default function Home(){
 const [firstName,setFirstName]=useState("");
 const [lastName,setLastName]=useState("");
 const [license,setLicense]=useState("");
 const [dob,setDob]=useState("");
 const [searched,setSearched]=useState(false);
 const [selected,setSelected]=useState<(typeof records)[number]|null>(null);
 const [activeTab,setActiveTab]=useState("Person / License");

 const results=useMemo(()=>{
  const f=firstName.trim().toLowerCase(), l=lastName.trim().toLowerCase(), lic=license.trim().toLowerCase(), d=dob.trim();
  if(!f&&!l&&!lic&&!d) return records.slice(0,5);
  return records.filter(r=>(!f||r.first.toLowerCase().includes(f))&&(!l||r.last.toLowerCase().includes(l))&&(!lic||r.license.toLowerCase().includes(lic))&&(!d||r.dob.includes(d)));
 },[firstName,lastName,license,dob]);

 function doSearch(){setSearched(true);setSelected(results[0]??null)}
 function clear(){setFirstName("");setLastName("");setLicense("");setDob("");setSearched(false);setSelected(null)}

 return <main className="shell">
  <header className="topbar">
   <div className="brand">
    <img className="patch" src="/Opaline_FR_Patch.png" alt="Opaline First Responders"/>
    <div className="brand-copy"><strong>OPALINE FIRST RESPONDERS</strong><span>FIRE&nbsp;&nbsp;•&nbsp;&nbsp; EMS&nbsp;&nbsp;•&nbsp;&nbsp; POLICE</span><i>PEOPLE&nbsp;&nbsp;•&nbsp;&nbsp; SERVICE&nbsp;&nbsp;•&nbsp;&nbsp; A STRONGER TOMORROW</i></div>
    <div className="mountain-brand"><b>OPALINE</b><span>COMMUNITY · SAFETY · TOGETHER</span></div>
   </div>
   <div className="account"><div className="account-line"><UserRound size={25}/><span>OFFICER: 1027<br/><b>OPD</b></span><span className="chev">⌄</span></div><button><LogOut size={21}/> LOG OUT</button></div>
  </header>

  <div className="content">
   <aside className="sidebar">
    <nav>
     <button className="active"><Search/>Search</button>
     <button><IdCard/>Driver Licenses</button>
     <button><UserRound/>People / Records</button>
     <button><Car/>Vehicles</button>
     <button><FileText/>Citations</button>
     <button><UsersRound/>Warrants</button>
     <button><Shield/>Incidents</button>
     <button><BarChart3/>Reports</button>
     <button><Mail/>Messages</button>
     <button><Settings/>Admin</button>
    </nav>
    <div className="sidebar-note"><div className="mini-mountains"/><b>OPALINE</b><span>A STRONGER<br/>TOMORROW<br/>TOGETHER</span></div>
   </aside>

   <section className="workspace">
    <div className="maincol">
     <section className="search-card">
      <div className="section-heading"><Search size={45}/><div><h1>SEARCH RECORDS</h1><p>Search by name, license number, date of birth or other information.</p></div></div>
      <div className="tabs">{["Person / License","Vehicle","Warrant","Citation","Incident"].map(tab=><button key={tab} className={activeTab===tab?"on":""} onClick={()=>setActiveTab(tab)}>{tab}</button>)}</div>
      <div className="form-grid">
       <label>First Name<input value={firstName} onChange={e=>setFirstName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSearch()} placeholder="Enter first name"/></label>
       <label>License Number<input value={license} onChange={e=>setLicense(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSearch()} placeholder="e.g. OP-123456"/></label>
       <label>Last Name<input value={lastName} onChange={e=>setLastName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSearch()} placeholder="Enter last name"/></label>
       <label>Date of Birth><div className="input-icon"><input value={dob} onChange={e=>setDob(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSearch()} placeholder="mm/dd/yyyy"/><CalendarDays size={19}/></div></label>
      </div>
      <div className="actions"><button className="primary" onClick={doSearch}><Search/>SEARCH</button><button onClick={clear}><RotateCcw/>CLEAR</button></div>
     </section>

     <section className="recent-card">
      <div className="section-heading small"><FileText size={42}/><div><h2>{searched?"SEARCH RESULTS":"RECENT SEARCHES"}</h2><p>{searched?`${results.length} matching fictional record${results.length===1?"":"s"}.`:"Your most recent record lookups."}</p></div></div>
      <div className="table-wrap">
       <table><thead><tr><th>NAME</th><th>TYPE</th><th>DETAILS</th><th>DATE / TIME</th><th>OFFICER</th></tr></thead>
        <tbody>{results.map((r,i)=><tr key={`${r.name}-${r.license}`} onClick={()=>setSelected(r)}><td>{r.name.split(" ").reverse().join(", ")}</td><td>{r.type}</td><td>{r.license||`DOB: ${r.dob}`}</td><td>09/09/2026&nbsp;&nbsp;{recentTimes[i]||"19:44"}</td><td>{recentOfficers[i]||"1027"}</td></tr>)}</tbody>
       </table>
      </div>
      <button className="view-all" onClick={()=>{setSearched(false);setSelected(null)}}>View All Searches <span>→</span></button>
     </section>

     {selected&&<section className="selected-record"><div><small>SELECTED RECORD</small><h3>{selected.name}</h3><p>{selected.license||"Person record"}{selected.dob&&` · DOB ${selected.dob}`} · {selected.vehicle}</p></div><span className={`status ${selected.status.toLowerCase()}`}>{selected.status}</span></section>}
    </div>

    <aside className="rightcol">
     <div className="scenic-card"><div className="scenic-overlay"><b>OPALINE</b><span>COMMUNITY · PEOPLE · HOME</span><i>Stronger Together.</i></div></div>
     <div className="quick-card"><h2>QUICK LINKS</h2><button><UserPlus/>New Record</button><button><IdCard/>Scan ID / License</button><button><Car/>Vehicle Lookup</button><button><History/>Recent Searches</button><button><AlertTriangle/>BOLO / Alerts</button></div>
     <div className="system-card"><h3>SYSTEM STATUS</h3><div className="status-row"><b><span className="online-dot"/> ONLINE</b><span>September 9, 2026</span></div><strong>11:47 AM</strong><div className="system-footer">SERVICE&nbsp;&nbsp;•&nbsp;&nbsp; INTEGRITY&nbsp;&nbsp;•&nbsp;&nbsp; COMMUNITY</div></div>
    </aside>
   </section>
  </div>

  <footer><span>OPALINE FIRST RESPONDERS&nbsp;&nbsp; | &nbsp;&nbsp; RECORDS MANAGEMENT SYSTEM</span><span>AUTHORIZED USE ONLY&nbsp;&nbsp; | &nbsp;&nbsp; UNLAWFUL ACCESS IS PROHIBITED</span></footer>
 </main>
}
