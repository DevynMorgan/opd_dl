"use client";

import { useEffect } from "react";

const esc = (value: unknown) => String(value ?? "").replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c] as string));
const prettyDate = (value: unknown) => { if (!value) return ""; const d = new Date(String(value)); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }); };

export default function IncidentEnhancer() {
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function currentUser() { try { const r = await fetch("/api/auth/me", { cache: "no-store" }); const d = await r.json(); return d?.user || null; } catch { return null; } }
    async function render() {
      if (disposed) return;
      const heading = Array.from(document.querySelectorAll("h2")).find(el => el.textContent?.trim() === "INCIDENTS");
      const panel = heading?.closest("section.module-card") as HTMLElement | null;
      if (!panel) return;
      const user = await currentUser(); const admin = user?.role === "ADMIN";
      if (panel.dataset.incidentEnhanced !== "true") {
        panel.dataset.incidentEnhanced = "true";
        const toolbar = panel.querySelector(".module-toolbar") as HTMLElement | null;
        if (toolbar && admin && !toolbar.querySelector(".incident-new-button")) {
          const button = document.createElement("button"); button.className = "header-action incident-new-button"; button.innerHTML = "＋ NEW INCIDENT REPORT"; button.addEventListener("click", () => openCreateModal()); toolbar.appendChild(button);
        }
      }
      const table = panel.querySelector("table") as HTMLTableElement | null; if (!table) return;
      table.querySelectorAll("tbody tr").forEach(row => {
        if ((row as HTMLElement).dataset.incidentBound === "true") return;
        const incidentNumber = row.children[0]?.textContent?.trim() || ""; if (!incidentNumber || incidentNumber === "No matching fictional records.") return;
        (row as HTMLElement).dataset.incidentBound = "true"; (row as HTMLElement).style.cursor = "pointer"; (row as HTMLElement).title = "Open incident report";
        row.addEventListener("click", e => { e.stopPropagation(); openDetail(incidentNumber); }, true);
      });
    }
    async function fetchIncident(number: string) { const r = await fetch(`/api/records?type=incidents&q=${encodeURIComponent(number)}&limit=10`, { cache: "no-store" }); const data = await r.json(); if (!r.ok || !Array.isArray(data)) throw new Error(data.error || "Could not load incident."); return data.find((x: any) => x.incident_number === number) || data[0]; }
    function openDetail(number: string) {
      if (document.getElementById("incident-detail-modal")) return;
      const backdrop = document.createElement("div"); backdrop.id = "incident-detail-modal"; backdrop.className = "modal-backdrop";
      backdrop.innerHTML = `<div class="record-modal incident-detail-modal" role="dialog" aria-modal="true" aria-label="Incident report"><button class="modal-close" id="incident-detail-close" type="button">×</button><div id="incident-detail-content"><div class="incident-loading">Loading incident report…</div></div></div>`;
      document.body.appendChild(backdrop); const close = () => backdrop.remove(); backdrop.addEventListener("click", e => { if (e.target === backdrop) close(); }); backdrop.querySelector("#incident-detail-close")?.addEventListener("click", close);
      fetchIncident(number).then((r: any) => {
        if (!r) throw new Error("Incident not found."); const content = backdrop.querySelector("#incident-detail-content") as HTMLElement; const status = String(r.status || "OPEN").toUpperCase();
        content.innerHTML = `<div class="incident-report-head"><div class="incident-report-icon">▣</div><div><small>OPALINE POLICE DEPARTMENT</small><h2>INCIDENT REPORT</h2><p>${esc(r.incident_number)} · ${esc(r.incident_type || r.title)}</p></div><span class="incident-status ${status.toLowerCase().replace(/\s+/g,"-")}">${esc(status)}</span></div>
          <div class="incident-grid"><div><label>INCIDENT NUMBER</label><strong>${esc(r.incident_number)}</strong></div><div><label>CASE NUMBER</label><strong>${esc(r.case_number || "Not assigned")}</strong></div><div><label>INCIDENT TYPE</label><strong>${esc(r.incident_type || "General Incident")}</strong></div><div><label>DATE / TIME</label><strong>${esc(prettyDate(r.occurred_at))}</strong></div><div><label>LOCATION</label><strong>${esc(r.location || "Not specified")}</strong></div><div><label>REPORTING OFFICER</label><strong>${esc(r.officer || "OPD Officer")}</strong></div></div>
          <section class="incident-section"><h3>INCIDENT SUMMARY</h3><div class="incident-title">${esc(r.title)}</div><p>${esc(r.description || r.notes || "No narrative has been entered.")}</p></section>
          <section class="incident-section"><h3>PERSONS INVOLVED</h3><p>${esc(r.persons_involved || "No persons have been listed.")}</p></section>
          <section class="incident-section"><h3>EVIDENCE / ATTACHMENTS</h3><p>${esc(r.evidence || "No evidence has been logged.")}</p></section>
          <div class="incident-two"><section class="incident-section"><h3>OFFICER NOTES</h3><p>${esc(r.officer_notes || "No officer notes.")}</p></section><section class="incident-section"><h3>RELATED WARRANT</h3><p>${esc(r.related_warrant || "None listed")}</p></section></div>
          <div class="incident-case-footer"><span>CREATED ${esc(prettyDate(r.created_at))}</span><span>FICTIONAL ROLEPLAY RECORD</span></div>`;
      }).catch((e: any) => { (backdrop.querySelector("#incident-detail-content") as HTMLElement).innerHTML = `<div class="auth-error">${esc(e.message || "Could not load incident.")}</div>`; });
    }
    function openCreateModal() {
      if (document.getElementById("incident-create-modal")) return;
      const backdrop = document.createElement("div"); backdrop.id = "incident-create-modal"; backdrop.className = "modal-backdrop";
      backdrop.innerHTML = `<div class="record-modal incident-entry-modal" role="dialog" aria-modal="true" aria-label="New incident report"><button class="modal-close" id="incident-close" type="button">×</button><div class="modal-head"><div class="modal-icon">▣</div><div><small>OPALINE POLICE DEPARTMENT</small><h2>NEW INCIDENT REPORT</h2><p>Create a fictional case file for the OPD RP database.</p></div></div><div id="incident-error" class="auth-error" style="display:none;margin-top:15px"></div><div class="new-form">
        <label>Incident Number<input id="incident-number" placeholder="Automatic: OPD-2026-0001" /></label><label>Incident Type<select id="incident-type"><option>General Incident</option><option>Missing Person</option><option>Suspicious Death</option><option>Homicide</option><option>Assault</option><option>Burglary</option><option>Domestic Disturbance</option><option>Drug Offense</option><option>Traffic Incident</option><option>Welfare Check</option><option>Other</option></select></label>
        <label>Incident Title *<input id="incident-title" placeholder="Short case title" /></label><label>Status<select id="incident-status"><option>OPEN</option><option>CLOSED</option><option>SUSPENDED</option><option>ACTIVE INVESTIGATION</option></select></label><label>Case Number<input id="incident-case" placeholder="CASE-2026-0001" /></label><label>Date / Time<input id="incident-occurred" type="datetime-local" /></label>
        <label>Location<input id="incident-location" placeholder="Address, business, area, or scene" /></label><label>Reporting Officer<input id="incident-officer" placeholder="Officer / badge" /></label>
        <label style="grid-column:1/-1">Incident Narrative<textarea id="incident-description" rows="5" placeholder="Describe what happened, the response, and relevant RP details..."></textarea></label><label style="grid-column:1/-1">Persons Involved<textarea id="incident-persons" rows="3" placeholder="Victim, witness, suspect, or other involved persons..."></textarea></label><label style="grid-column:1/-1">Evidence / Attachments<textarea id="incident-evidence" rows="3" placeholder="Evidence collected, photographs, statements, samples, or attachments..."></textarea></label><label style="grid-column:1/-1">Officer Notes<textarea id="incident-officer-notes" rows="3" placeholder="Follow-up, investigative notes, or reminders..."></textarea></label><label>Related Warrant<input id="incident-warrant" placeholder="Warrant number or None" /></label>
      </div><div class="modal-actions" style="display:flex;justify-content:flex-end;gap:8px"><button id="incident-cancel" type="button">CANCEL</button><button class="primary" id="incident-save" type="button">FILE INCIDENT REPORT</button></div></div>`;
      document.body.appendChild(backdrop); const close = () => backdrop.remove(); backdrop.addEventListener("click", e => { if (e.target === backdrop) close(); }); backdrop.querySelector("#incident-close")?.addEventListener("click", close); backdrop.querySelector("#incident-cancel")?.addEventListener("click", close);
      const occurred = backdrop.querySelector("#incident-occurred") as HTMLInputElement; const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); occurred.value = now.toISOString().slice(0,16);
      const officer = backdrop.querySelector("#incident-officer") as HTMLInputElement; fetch("/api/auth/me", { cache:"no-store" }).then(r=>r.json()).then(d=>{ if(d?.user?.username) officer.value=d.user.username; }).catch(()=>{});
      backdrop.querySelector("#incident-save")?.addEventListener("click", async () => {
        const save = backdrop.querySelector("#incident-save") as HTMLButtonElement; const error = backdrop.querySelector("#incident-error") as HTMLElement; const value=(id:string)=>(backdrop.querySelector(`#${id}`) as HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement)?.value.trim()||"";
        if(!value("incident-title")){ error.textContent="Incident title is required."; error.style.display="block"; return; } save.disabled=true; save.textContent="FILING…"; error.style.display="none";
        try { const r=await fetch("/api/records",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"incidents",incident_number:value("incident-number"),incident_type:value("incident-type"),title:value("incident-title"),status:value("incident-status"),case_number:value("incident-case"),occurred_at:value("incident-occurred"),location:value("incident-location"),officer:value("incident-officer"),description:value("incident-description"),persons_involved:value("incident-persons"),evidence:value("incident-evidence"),officer_notes:value("incident-officer-notes"),related_warrant:value("incident-warrant")})}); const data=await r.json(); if(!r.ok) throw new Error(data.error||"Could not file incident report."); close(); window.location.reload(); } catch(e){ error.textContent=e instanceof Error?e.message:"Could not file incident report."; error.style.display="block"; save.disabled=false; save.textContent="FILE INCIDENT REPORT"; }
      });
    }
    const bind=()=>{clearTimeout(timer);timer=setTimeout(render,80)}; const observer=new MutationObserver(bind); observer.observe(document.body,{childList:true,subtree:true}); bind(); return()=>{disposed=true;observer.disconnect();if(timer)clearTimeout(timer)};
  }, []);
  return null;
}
