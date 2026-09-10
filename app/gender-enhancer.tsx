"use client";

import { useEffect } from "react";

export default function GenderEnhancer() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.body && typeof init.body === "string" && input.toString().includes("/api/records")) {
        try {
          const body = JSON.parse(init.body);
          if (body && (body.type === "people") && (body.method === undefined || init.method === "POST" || init.method === "PUT")) {
            const genderInput = document.querySelector<HTMLSelectElement>('select[name="record-gender"]');
            if (genderInput?.value) {
              body.gender = genderInput.value;
              init = { ...init, body: JSON.stringify(body) };
            }
          }
        } catch {
          // Leave non-JSON requests untouched.
        }
      }
      return originalFetch(input, init);
    };

    const addGenderField = () => {
      const forms = document.querySelectorAll<HTMLElement>(".new-record .new-form");
      forms.forEach(form => {
        if (form.querySelector('select[name="record-gender"]')) return;
        const labels = Array.from(form.querySelectorAll<HTMLLabelElement>("label"));
        const dobLabel = labels.find(label => label.textContent?.trim().startsWith("Date of Birth"));
        if (!dobLabel) return;

        const label = document.createElement("label");
        label.textContent = "Gender";
        const select = document.createElement("select");
        select.name = "record-gender";
        const blank = document.createElement("option");
        blank.value = "";
        blank.textContent = "Select gender";
        const male = document.createElement("option");
        male.value = "Male";
        male.textContent = "Male";
        const female = document.createElement("option");
        female.value = "Female";
        female.textContent = "Female";
        select.append(blank, male, female);
        label.appendChild(select);
        dobLabel.insertAdjacentElement("afterend", label);
      });
    };

    const cleanDobDisplay = () => {
      const fields = document.querySelectorAll<HTMLElement>(".modal-grid > div");
      fields.forEach(field => {
        const label = field.querySelector("small");
        const value = field.querySelector("b");
        if (label?.textContent?.trim() !== "DOB" || !value) return;

        const match = value.textContent?.trim().match(/^(\d{4}-\d{2}-\d{2})(?:T.*)?$/);
        if (match) value.textContent = match[1];
      });
    };

    const enhance = () => {
      addGenderField();
      cleanDobDisplay();
    };

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
