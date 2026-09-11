"use client";

import { useEffect } from "react";

export default function AdminEnhancer() {
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const render = async () => {
      if (disposed) return;
      const headings = Array.from(document.querySelectorAll("h1"));
      const heading = headings.find((el) => el.textContent?.trim() === "ADMINISTRATION");
      const panel = heading?.closest("section.reports-panel") as HTMLElement | null;
      if (!panel || panel.dataset.adminEnhanced === "true") return;

      panel.dataset.adminEnhanced = "true";
      panel.innerHTML = '<div class="admin-loading">Loading administration console…</div>';

      try {
        const response = await fetch("/api/admin", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Admin data unavailable");
        if (disposed) return;

        const c = data.counts || {};
        const admins = Array.isArray(data.admins) ? data.admins : [];
        const stat = (label: string, value: number, key: string) => `<div class="admin-stat"><span>${label}</span><strong>${value ?? 0}</strong><small>${key}</small></div>`;
        const adminRows = admins.map((u: any) => `<div class="admin-user"><div><strong>${escapeHtml(u.username)}</strong><span>${escapeHtml(u.role || "ADMIN")}</span></div><b class="${u.active ? "user-active" : "user-disabled"}">${u.active ? "ACTIVE" : "DISABLED"}</b></div>`).join("");

        panel.innerHTML = `
          <div class="admin-hero">
            <div class="admin-title"><div class="admin-shield">⚙</div><div><small>OPD SYSTEM CONTROL</small><h1>ADMINISTRATION</h1><p>Command center for fictional RP records, access, and system health.</p></div></div>
            <div class="admin-identity"><span>SIGNED IN AS</span><strong>${escapeHtml(data.currentUser?.username || "ADMIN")}</strong><b>FULL ADMIN ACCESS</b></div>
          </div>

          <div class="admin-actions"><button class="primary" id="admin-new-record">＋ NEW PERSON RECORD</button><button id="admin-refresh">↻ REFRESH DATABASE</button></div>

          <div class="admin-section-label">DATABASE OVERVIEW</div>
          <div class="admin-stats">
            ${stat("PEOPLE", c.people, "CHARACTER RECORDS")}
            ${stat("LICENSES", c.licenses, "DRIVER LICENSES")}
            ${stat("VEHICLES", c.vehicles, "REGISTRATIONS")}
            ${stat("OPEN WARRANTS", c.warrants, "WARRANT RECORDS")}
            ${stat("CITATIONS", c.citations, "CITATION HISTORY")}
            ${stat("INCIDENTS", c.incidents, "INCIDENT RECORDS")}
            ${stat("MESSAGES", c.messages, "DEPARTMENT MESSAGES")}
          </div>

          <div class="admin-columns">
            <div class="admin-box"><div class="admin-box-head"><div><small>USER & ACCESS MANAGEMENT</small><h2>AUTHORIZED ADMINS</h2></div><span>${admins.length} ACCOUNT${admins.length === 1 ? "" : "S"}</span></div><div class="admin-users">${adminRows || '<div class="admin-empty">No administrator accounts found.</div>'}</div><div class="admin-footnote">Both authorized administrator accounts have full record-edit access.</div></div>
            <div class="admin-box"><div class="admin-box-head"><div><small>SYSTEM HEALTH</small><h2>SERVICE STATUS</h2></div><span class="health-online">ONLINE</span></div><div class="health-list"><div><b>DATABASE</b><span><i></i>${escapeHtml(data.database || "CONNECTED")}</span></div><div><b>RECORDS API</b><span><i></i>OPERATIONAL</span></div><div><b>AUTHENTICATION</b><span><i></i>SECURE SESSION</span></div><div><b>ACTIVE SESSIONS</b><span><i></i>${data.activeSessions ?? 0}</span></div></div></div>
          </div>

          <div class="admin-columns admin-bottom"><div class="admin-box"><div class="admin-box-head"><div><small>ADMIN TOOLS</small><h2>QUICK ACTIONS</h2></div></div><div class="tool-grid"><button id="admin-tool-people">PEOPLE / RECORDS</button><button id="admin-tool-licenses">DRIVER LICENSES</button><button id="admin-tool-vehicles">VEHICLES</button><button id="admin-tool-warrants">WARRANTS & BOLO</button></div></div><div class="admin-box admin-notice"><div class="admin-box-head"><div><small>RP SYSTEM SETTINGS</small><h2>AUTHORIZED USE</h2></div></div><p>This terminal is for fictional roleplay data only. Administrative changes affect the persistent PostgreSQL database used by the OPD-DL RP system.</p><div class="integrity"><span></span> DATA INTEGRITY: NORMAL</div></div></div>
        `;

        panel.querySelector("#admin-new-record")?.addEventListener("click", () => {
          const quick = Array.from(document.querySelectorAll(".quick-card button")).find((b) => b.textContent?.trim() === "New Record") as HTMLButtonElement | undefined;
          quick?.click();
        });
        panel.querySelector("#admin-refresh")?.addEventListener("click", () => window.location.reload());
        bindNav(panel, "#admin-tool-people", "People / Records");
        bindNav(panel, "#admin-tool-licenses", "Driver Licenses");
        bindNav(panel, "#admin-tool-vehicles", "Vehicles");
        bindNav(panel, "#admin-tool-warrants", "Warrants");
      } catch (error) {
        panel.dataset.adminEnhanced = "false";
        panel.innerHTML = `<div class="admin-error">Administration data could not be loaded. <button id="admin-retry">RETRY</button></div>`;
        panel.querySelector("#admin-retry")?.addEventListener("click", () => render());
      }
    };

    const bind = () => {
      clearTimeout(timer);
      timer = setTimeout(render, 60);
    };
    const observer = new MutationObserver(bind);
    observer.observe(document.body, { childList: true, subtree: true });
    bind();

    return () => {
      disposed = true;
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}

function bindNav(panel: HTMLElement, selector: string, label: string) {
  panel.querySelector(selector)?.addEventListener("click", () => {
    const button = Array.from(document.querySelectorAll(".sidebar nav button")).find((b) => b.textContent?.trim() === label) as HTMLButtonElement | undefined;
    button?.click();
  });
}

function escapeHtml(value: any) {
  return String(value ?? "").replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char] || char));
}
