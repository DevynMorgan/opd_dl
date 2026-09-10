"use client";

import { useEffect } from "react";

export default function LogoutHandler() {
  useEffect(() => {
    async function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button");
      if (!button || button.textContent?.trim() !== "LOG OUT") return;

      event.preventDefault();
      button.setAttribute("disabled", "true");
      button.textContent = "LOGGING OUT...";

      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } finally {
        window.location.reload();
      }
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
