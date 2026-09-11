"use client";

import { useEffect } from "react";

type CaseType = "incident" | "warrant";

const statusOptions: Record<CaseType, string[]> = {
  incident: ["OPEN", "ACTIVE INVESTIGATION", "SUSPENDED", "CLOSED"],
  warrant: ["ACTIVE", "SERVED", "RECALLED", "QUASHED", "EXPIRED"]
};

const esc = (value: unknown) => String(value ?? "").replace(/[&<>\"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export default function CaseStatusEditor() {
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "opd-case-status-editor";
    style.textContent = `
      .case-status-edit-btn{border:1px solid #b8c9d8;background:#fff;color:#315775;border-radius:5px;padding:6px 9px;font-size:8px;font-weight:900;letter-spacing:.7px;cursor:pointer;white-space:nowrap}
      .case-status-edit-btn:hover{background:#edf4f9;border-color:#8da9bf}
      .case-status-modal{width:min(430px,100%)}
      .case-status-modal .status-current{margin:14px 0;padding:10px 12px;background:#edf3f8;border:1px solid #d2dee9;border-radius:6px;color:#36516d;font-size:10px;font-weight:800}
      .case-status-modal label{display:block;margin-top:12px;color:#607995;font-size:9px;font-weight:900;letter-spacing:.8px}
      .case-status-modal select{width:100%;margin-top:6px;padding:10px;border:1px solid #c5d3df;border-radius:5px;background:#fff;color:#294967;font-weight:700}
      .case-status-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
      .case-status-actions button{padding:9px 13px;border:1px solid #c5d3df;border-radius:5px;background:#fff;color:#45627d;font-weight:800;cursor:pointer}
      .case-status-actions .primary{background:#173b68;color:#fff;border-color:#173b68}
    `;
    document.head.appendChild(style);

    const openEditor = (type: CaseType, id: string, label: string, current: string) => {
      if (!id) { window.alert("This record could not be identified. Please close and reopen it, then try again."); return; }
      if (document.getElementById("case-status-modal")) return;
      const backdrop = document.createElement("div");
      backdrop.id = "case-status-modal"; backdrop.className = "modal-backdrop";
      const options = statusOptions[type].map(value => `<option value="${esc(value)}"${value === current.toUpperCase() ? " selected" : ""}>${esc(value)}</option>`).join("");
      backdrop.innerHTML = `<div class="record-modal case-status-modal" role="dialog" aria-modal="true"><button class="modal-close" type="button" id="case-status-close">×</button><div class="modal-head"><div class="modal-icon">✓</div><div><small>OPALINE POLICE DEPARTMENT</small><h2>EDIT STATUS</h2><p>${type === "incident" ? "Incident" : "Warrant"} ${esc(label)}</p></div></div><div class="status-current">Current status: <strong>${esc(current || "UNKNOWN")}</strong></div><label>New Status<select id="case-status-value">${options}</select></label><div id="case-status-error" class="auth-error" style="display:none;margin-top:12px"></div><div class="case-status-actions"><button type="button" id="case-status-cancel">CANCEL</button><button type="button" class="primary" id="case-status-save">SAVE STATUS</button></div></div>`;
      document.body.appendChild(backdrop);
      const close = () => backdrop.remove();
      backdrop.addEventListener("click", e => { if (e.target === backdrop) close(); });
      backdrop.querySelector("#case-status-close")?.addEventListener("click", close);
      backdrop.querySelector("#case-status-cancel")?.addEventListener("click", close);
      backdrop.querySelector("#case-status-save")?.addEventListener("click", async () => {
        const button = backdrop.querySelector("#case-status-save") as HTMLButtonElement;
        const error = backdrop.querySelector("#case-status-error") as HTMLElement;
        const value = (backdrop.querySelector("#case-status-value") as HTMLSelectElement).value;
        button.disabled = true; button.textContent = "SAVING…";
        try {
          const r = await fetch("/api/case-status", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, id, status: value }) });
          const data = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(data.error || "Could not update status.");
          close(); window.location.reload();
        } catch (e) {
          error.textContent = e instanceof Error ? e.message : "Could not update status.";
          error.style.display = "block"; button.disabled = false; button.textContent = "SAVE STATUS";
        }
      });
    };

    const addWarrantControls = () => {
      const tables = Array.from(document.querySelectorAll("table"));
      for (const table of tables) {
        const headers = Array.from(table.querySelectorAll("thead th")).map(th => th.textContent?.trim().toUpperCase() || "");
        if (!headers.includes("WARRANT #")) continue;
        const head = table.querySelector("thead tr");
        if (head && !head.querySelector(".case-status-action-head")) {
          const th = document.createElement("th"); th.className = "case-status-action-head"; th.textContent = "ACTION"; head.appendChild(th);
        }
        const rows = Array.from(table.querySelectorAll("tbody tr")) as HTMLTableRowElement[];
        for (const row of rows) {
          if (row.dataset.caseStatusReady === "true") continue;
          const number = row.children[0]?.textContent?.trim() || "";
          if (!number || number === "No matching fictional records.") continue;
          const action = document.createElement("td");
          const button = document.createElement("button");
          button.type = "button"; button.className = "case-status-edit-btn"; button.textContent = "EDIT STATUS";
          button.addEventListener("click", async e => {
            e.preventDefault(); e.stopPropagation();
            const current = row.children[3]?.textContent?.trim() || "";
            try {
              const response = await fetch(`/api/records?type=warrants&q=${encodeURIComponent(number)}&limit=5`, { cache: "no-store" });
              const rows = await response.json();
              const record = Array.isArray(rows) ? rows.find((x:any) => x.warrant_number === number) || rows[0] : null;
              openEditor("warrant", record?.id ? String(record.id) : "", number, record?.status || current);
            } catch { openEditor("warrant", "", number, current); }
          });
          action.appendChild(button); row.appendChild(action); row.dataset.caseStatusReady = "true";
        }
      }
    };

    const addIncidentControl = () => {
      const modal = document.querySelector("#incident-detail-modal .incident-detail-modal") as HTMLElement | null;
      if (!modal || modal.dataset.caseStatusReady === "true") return;
      const content = modal.querySelector("#incident-detail-content") as HTMLElement | null;
      if (!content) return;
      const numberText = content.querySelector(".incident-report-head p")?.textContent || "";
      const number = numberText.split("·")[0]?.trim() || "";
      const status = Array.from(content.querySelectorAll(".incident-status"))[0]?.textContent?.trim() || "";
      const footer = content.querySelector(".incident-case-footer");
      if (!number || !footer) return;
      const idPromise = fetch(`/api/records?type=incidents&q=${encodeURIComponent(number)}&limit=5`, { cache: "no-store" }).then(r => r.json()).then(rows => Array.isArray(rows) ? rows.find((x:any) => x.incident_number === number) || rows[0] : null).catch(() => null);
      const button = document.createElement("button");
      button.type = "button"; button.className = "case-status-edit-btn"; button.textContent = "EDIT STATUS";
      button.addEventListener("click", async e => {
        e.preventDefault(); e.stopPropagation();
        const record = await idPromise;
        openEditor("incident", record?.id ? String(record.id) : "", number, record?.status || status);
      });
      footer.appendChild(button); modal.dataset.caseStatusReady = "true";
    };

    const observer = new MutationObserver(() => { addWarrantControls(); addIncidentControl(); });
    observer.observe(document.body, { childList: true, subtree: true });
    const interval = window.setInterval(() => { addWarrantControls(); addIncidentControl(); }, 500);
    addWarrantControls(); addIncidentControl();
    return () => { observer.disconnect(); window.clearInterval(interval); style.remove(); };
  }, []);

  return null;
}
