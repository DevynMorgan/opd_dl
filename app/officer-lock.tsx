"use client";

import { useEffect } from "react";

export default function OfficerLock() {
  useEffect(() => {
    let username = "";
    const apply = () => {
      ["incident-officer", "warrant-officer"].forEach(id => {
        const input = document.getElementById(id) as HTMLInputElement | null;
        if (!input) return;
        input.readOnly = true;
        input.setAttribute("aria-readonly", "true");
        if (username) input.value = username;
      });
    };
    fetch("/api/auth/me", { cache: "no-store" }).then(r => r.json()).then(data => {
      username = data?.user?.username || "";
      apply();
    }).catch(() => {});
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    apply();
    return () => observer.disconnect();
  }, []);
  return null;
}
