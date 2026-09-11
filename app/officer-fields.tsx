"use client";

import { useEffect } from "react";

const names: Record<string,string> = {
  sistergrimm: "Devyn Grimm",
  admin: "Chief",
  maxvonb: "Max VonB",
  rowanc: "RowanC",
  killianm: "KillianM",
  malcomh: "MalcomH",
};
const numbers: Record<string,string> = {
  maxvonb: "301",
  rowanc: "203",
  killianm: "304",
  malcomh: "404",
};

export default function OfficerFields() {
  useEffect(() => {
    let disposed = false;
    let userLabel = "OPD (#OPD)";
    async function load() {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await r.json();
        const username = String(data?.user?.username || "").trim().toLowerCase();
        if (username) userLabel = `${names[username] || username} (#${numbers[username] || "OPD"})`;
      } catch {}
      if (!disposed) apply();
    }
    function apply() {
      document.querySelectorAll<HTMLInputElement>("#incident-officer, #warrant-officer").forEach(input => {
        input.value = userLabel;
        input.readOnly = true;
        input.setAttribute("aria-readonly", "true");
        input.title = "Automatically assigned from the signed-in account.";
      });
    }
    const observer = new MutationObserver(() => apply());
    observer.observe(document.body, { childList: true, subtree: true });
    apply();
    load();
    return () => { disposed = true; observer.disconnect(); };
  }, []);
  return null;
}
