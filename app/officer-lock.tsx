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

export default function OfficerLock() {
  useEffect(() => {
    let label = "";
    const apply = () => {
      ["incident-officer", "warrant-officer"].forEach(id => {
        const input = document.getElementById(id) as HTMLInputElement | null;
        if (!input) return;
        input.readOnly = true;
        input.setAttribute("aria-readonly", "true");
        input.title = "Automatically assigned from the signed-in account.";
        if (label) input.value = label;
      });
    };
    fetch("/api/auth/me", { cache: "no-store" }).then(r => r.json()).then(data => {
      const username = String(data?.user?.username || "").trim().toLowerCase();
      if (username) label = `${names[username] || username} (#${numbers[username] || "OPD"})`;
      apply();
    }).catch(() => {});
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    apply();
    return () => observer.disconnect();
  }, []);
  return null;
}
