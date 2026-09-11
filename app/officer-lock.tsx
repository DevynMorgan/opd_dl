"use client";

import { useEffect } from "react";
import { officerIdentity } from "../lib/officer-identity";

export default function OfficerLock() {
  useEffect(() => {
    let label = "";
    const apply = () => {
      ["incident-officer", "warrant-officer"].forEach(id => {
        const input = document.getElementById(id) as HTMLInputElement | null;
        if (!input) return;
        if (label) input.value = label;
        input.readOnly = true;
        input.setAttribute("aria-readonly", "true");
        input.title = "Automatically assigned from the signed-in account. This field cannot be changed.";
        input.onkeydown = e => e.preventDefault();
        input.onbeforeinput = e => e.preventDefault();
        input.onpaste = e => e.preventDefault();
        input.oncut = e => e.preventDefault();
        input.ondrop = e => e.preventDefault();
        input.oninput = () => { if (label && input.value !== label) input.value = label; };
        input.style.cursor = "not-allowed";
        input.style.backgroundColor = "#e8eef4";
        input.style.color = "#526d89";
        input.style.fontWeight = "700";
      });
    };

    fetch("/api/auth/me", { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        const username = String(data?.user?.username || "").trim();
        if (username) label = officerIdentity(username);
        apply();
      })
      .catch(() => {});

    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    const interval = window.setInterval(apply, 250);
    apply();
    return () => { observer.disconnect(); window.clearInterval(interval); };
  }, []);
  return null;
}
