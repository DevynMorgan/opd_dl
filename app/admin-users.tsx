"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Shield, UserPlus, UserRound, UserX, X } from "lucide-react";

type UserRow = { id:number; username:string; role:string; active:boolean; created_at:string };

export default function AdminUsers() {
  const [users,setUsers] = useState<UserRow[]>([]);
  const [show,setShow] = useState(false);
  const [username,setUsername] = useState("");
  const [password,setPassword] = useState("");
  const [role,setRole] = useState("OFFICER");
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const [reset,setReset] = useState<UserRow|null>(null);
  const [resetPassword,setResetPassword] = useState("");

  async function load() {
    const r = await fetch("/api/admin/users",{cache:"no-store"});
    const data = await r.json();
    if (r.ok) setUsers(data); else setError(data.error || "Unable to load users.");
  }
  useEffect(()=>{load();},[]);

  async function createUser() {
    setBusy(true); setError(""); setMessage("");
    try {
      const r = await fetch("/api/admin/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password,role})});
      const data=await r.json();
      if(!r.ok){setError(data.error||"Unable to create user.");return;}
      setShow(false); setUsername(""); setPassword(""); setRole("OFFICER"); setMessage(`Account ${data.username} created successfully.`); await load();
    } finally { setBusy(false); }
  }

  async function toggle(user:UserRow) {
    const r=await fetch("/api/admin/users",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:user.id,action:"toggle"})});
    const data=await r.json();
    if(r.ok){setMessage(`${data.username} is now ${data.active?"ACTIVE":"DISABLED"}.`);await load();} else setError(data.error||"Unable to update account.");
  }

  async function doReset() {
    if(!reset) return;
    setBusy(true);setError("");
    try {
      const r=await fetch("/api/admin/users",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:reset.id,action:"reset_password",password:resetPassword})});
      const data=await r.json();
      if(!r.ok){setError(data.error||"Unable to reset password.");return;}
      setMessage(`Password reset for ${data.username}.`);setReset(null);setResetPassword("");
    } finally {setBusy(false);}
  }

  return <div className="admin-users">
    <div className="admin-section-head"><div><h2>USER &amp; ACCESS MANAGEMENT</h2><p>Create and manage fictional OPD personnel accounts.</p></div><button className="primary admin-add" onClick={()=>{setError("");setShow(true)}}><UserPlus/>ADD PD USER</button></div>
    {message&&<div className="admin-message"><CheckCircle2 size={17}/>{message}</div>}
    {error&&<div className="admin-error">{error}</div>}
    <div className="user-list">{users.map(u=><div className="user-row" key={u.id}>
      <div className="user-avatar">{u.role==="ADMIN"?<Shield/>:<UserRound/>}</div>
      <div className="user-main"><strong>{u.username}</strong><span>{u.role==="ADMIN"?"Administrator • Full Access":"Police Officer • Search & View Only"}</span></div>
      <span className={`user-status ${u.active?"active":"disabled"}`}>{u.active?"ACTIVE":"DISABLED"}</span>
      <div className="user-actions"><button onClick={()=>setReset(u)} title="Reset password"><KeyRound/>RESET</button><button onClick={()=>toggle(u)} title={u.active?"Disable account":"Enable account"}>{u.active?<UserX/>:<CheckCircle2/>}{u.active?"DISABLE":"ENABLE"}</button></div>
    </div>)}</div>
    <div className="access-note"><Shield size={18}/><div><strong>ACCESS LEVELS</strong><span><b>ADMIN</b> can manage records, users, and system settings. <b>OFFICER</b> accounts can search and view records but cannot create, edit, or administer the system.</span></div></div>

    {show&&<div className="modal-backdrop" onClick={()=>setShow(false)}><div className="record-modal new-record" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShow(false)}><X/></button><div className="modal-head"><div className="modal-icon"><UserPlus/></div><div><small>ADMIN / USER MANAGEMENT</small><h2>ADD PD USER</h2><p>Create a search-only police personnel login.</p></div></div><div className="new-form"><label>Username<input value={username} onChange={e=>setUsername(e.target.value)} placeholder="e.g. officer204" autoFocus/></label><label>Role<select value={role} onChange={e=>setRole(e.target.value)}><option value="OFFICER">OFFICER • Search Only</option><option value="ADMIN">ADMIN • Full Access</option></select></label><label className="full-width">Temporary / Initial Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimum 8 characters"/></label></div>{error&&<div className="save-alert">{error}</div>}<div className="actions modal-actions"><button className="primary" onClick={createUser} disabled={busy}><UserPlus/>{busy?"CREATING...":"CREATE ACCOUNT"}</button><button onClick={()=>setShow(false)} disabled={busy}>CANCEL</button></div></div></div>}
    {reset&&<div className="modal-backdrop" onClick={()=>setReset(null)}><div className="record-modal new-record" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setReset(null)}><X/></button><div className="modal-head"><div className="modal-icon"><KeyRound/></div><div><small>ADMIN / ACCOUNT SECURITY</small><h2>RESET PASSWORD</h2><p>Set a new password for {reset.username}.</p></div></div><div className="new-form"><label className="full-width">New Password<input type="password" value={resetPassword} onChange={e=>setResetPassword(e.target.value)} placeholder="Minimum 8 characters" autoFocus/></label></div>{error&&<div className="save-alert">{error}</div>}<div className="actions modal-actions"><button className="primary" onClick={doReset} disabled={busy}><KeyRound/>{busy?"RESETTING...":"RESET PASSWORD"}</button><button onClick={()=>setReset(null)} disabled={busy}>CANCEL</button></div></div></div>}
  </div>;
}
