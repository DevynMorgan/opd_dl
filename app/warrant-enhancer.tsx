"use client";

import { useEffect } from "react";

export default function WarrantEnhancer() {
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function isAdmin() {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await r.json();
        return r.ok && data?.user?.role === "ADMIN";
      } catch { return false; }
    }

    async function render() {
      if (disposed) return;
      if (!(await isAdmin())) return;
      const headings = Array.from(document.querySelectorAll("h2"));
      const heading = headings.find(el => el.textContent?.trim() === "WARRANTS & BOLO");
      const panel = heading?.closest("section.module-card") as HTMLElement | null;
      if (!panel || panel.dataset.warrantEnhanced === "true") return;
      panel.dataset.warrantEnhanced = "true";

      const toolbar = panel.querySelector(".module-toolbar") as HTMLElement | null;
      if (!toolbar) return;
      const button = document.createElement("button");
      button.className = "header-action warrant-new-button";
      button.innerHTML = "＋ NEW WARRANT";
      button.addEventListener("click", () => openModal());
      toolbar.appendChild(button);
    }

    const openModal = () => {
      if (document.getElementById("warrant-create-modal")) return;
      const backdrop = document.createElement("div");
      backdrop.id = "warrant-create-modal";
      backdrop.className = "modal-backdrop";
      backdrop.innerHTML = `
        <div class="record-modal warrant-entry-modal" role="dialog" aria-modal="true" aria-label="New warrant">
          <button class="modal-close" id="warrant-close" type="button">×</button>
          <div class="modal-head">
            <div class="modal-icon">⚖</div>
            <div><small>OPALINE POLICE DEPARTMENT</small><h2>NEW WARRANT</h2><p>Create a fictional warrant record for the OPD RP database.</p></div>
          </div>
          <div id="warrant-error" class="auth-error" style="display:none;margin-top:15px"></div>
          <div class="new-form">
            <label>Warrant Number *<input id="warrant-number" placeholder="W-2026-0001" /></label>
            <label>Warrant Type<select id="warrant-type"><option>Arrest</option><option>Search</option><option>Bench</option><option>Probation / Parole</option><option>Other</option></select></label>
            <label>Subject<select id="warrant-person"><option value="">Select person</option></select></label>
            <label>Priority<select id="warrant-priority"><option>STANDARD</option><option>LOW</option><option>HIGH</option><option>CRITICAL</option></select></label>
            <label>Charge / Reason *<input id="warrant-charge" placeholder="Enter charge or reason" /></label>
            <label>Status<select id="warrant-status"><option>ACTIVE</option><option>SERVED</option><option>RECALLED</option><option>QUASHED</option><option>EXPIRED</option></select></label>
            <label>Issue Date / Time<input id="warrant-issued" type="datetime-local" /></label>
            <label>Expiration Date<input id="warrant-expiration" type="date" /></label>
            <label>Issuing Authority<input id="warrant-authority" placeholder="Opaline Municipal Court" /></label>
            <label>Case Number<input id="warrant-case" placeholder="CASE-2026-0001" /></label>
            <label>Bond<input id="warrant-bond" placeholder="No bond / $ amount" /></label>
            <label>Last Known Location<input id="warrant-location" placeholder="Address or area" /></label>
            <label>Issuing Officer<input id="warrant-officer" placeholder="Officer / badge" /></label>
            <label style="grid-column:1/-1">Probable Cause / Description<textarea id="warrant-description" rows="4" placeholder="Describe the reason for the warrant and relevant RP details..."></textarea></label>
            <label style="grid-column:1/-1">Special Instructions / Notes<textarea id="warrant-notes" rows="3" placeholder="Approach instructions, cautions, or other RP notes..."></textarea></label>
          </div>
          <div class="modal-actions" style="display:flex;justify-content:flex-end;gap:8px">
            <button id="warrant-cancel" type="button">CANCEL</button>
            <button class="primary" id="warrant-save" type="button">SAVE WARRANT</button>
          </div>
        </div>`;
      document.body.appendChild(backdrop);

      const close = () => backdrop.remove();
      backdrop.addEventListener("click", e => { if (e.target === backdrop) close(); });
      backdrop.querySelector("#warrant-close")?.addEventListener("click", close);
      backdrop.querySelector("#warrant-cancel")?.addEventListener("click", close);

      const issued = backdrop.querySelector("#warrant-issued") as HTMLInputElement;
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      issued.value = now.toISOString().slice(0, 16);

      const peopleSelect = backdrop.querySelector("#warrant-person") as HTMLSelectElement;
      fetch("/api/records?type=people&limit=200", { cache: "no-store" }).then(r => r.ok ? r.json() : []).then(people => {
        if (!Array.isArray(people)) return;
        people.forEach((person: any) => {
          const option = document.createElement("option");
          option.value = String(person.id);
          option.textContent = `${person.first_name} ${person.last_name}`;
          peopleSelect.appendChild(option);
        });
      }).catch(() => {});

      backdrop.querySelector("#warrant-save")?.addEventListener("click", async () => {
        const save = backdrop.querySelector("#warrant-save") as HTMLButtonElement;
        const error = backdrop.querySelector("#warrant-error") as HTMLElement;
        const value = (id: string) => (backdrop.querySelector(`#${id}`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)?.value.trim() || "";
        const number = value("warrant-number");
        const charge = value("warrant-charge");
        if (!number || !charge) { error.textContent = "Warrant number and charge / reason are required."; error.style.display = "block"; return; }
        save.disabled = true; save.textContent = "SAVING…"; error.style.display = "none";
        try {
          const r = await fetch("/api/warrants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
            warrant_number: number, warrant_type: value("warrant-type"), person_id: value("warrant-person"), priority: value("warrant-priority"),
            charge, title: charge, status: value("warrant-status"), issued_at: value("warrant-issued"), expiration_date: value("warrant-expiration"),
            issuing_authority: value("warrant-authority"), case_number: value("warrant-case"), bond: value("warrant-bond"), location: value("warrant-location"),
            officer: value("warrant-officer"), notes: `${value("warrant-description")}\n\nSpecial Instructions / Notes:\n${value("warrant-notes")}`
          }) });
          const data = await r.json();
          if (!r.ok) throw new Error(data.error || "Could not save warrant.");
          close();
          window.location.reload();
        } catch (e) {
          error.textContent = e instanceof Error ? e.message : "Could not save warrant.";
          error.style.display = "block";
          save.disabled = false; save.textContent = "SAVE WARRANT";
        }
      });
    };

    const bind = () => { clearTimeout(timer); timer = setTimeout(render, 80); };
    const observer = new MutationObserver(bind);
    observer.observe(document.body, { childList: true, subtree: true });
    bind();
    return () => { disposed = true; observer.disconnect(); if (timer) clearTimeout(timer); };
  }, []);
  return null;
}
