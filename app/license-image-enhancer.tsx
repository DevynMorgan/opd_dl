"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Maximize2, Upload, X } from "lucide-react";

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not load image."));
      img.onload = () => {
        const maxWidth = 1200;
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Could not process image."));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function LicenseImagePanel({ licenseNumber }: { licenseNumber: string }) {
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewer, setViewer] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/license-image?license=${encodeURIComponent(licenseNumber)}`, { cache: "no-store" }).then(r => r.json()),
      fetch("/api/auth/me", { cache: "no-store" }).then(r => r.json())
    ]).then(([licenseData, authData]) => {
      if (cancelled) return;
      if (licenseData?.error) setError(licenseData.error);
      else setRecord(licenseData);
      setAdmin(authData?.user?.role === "ADMIN");
    }).catch(() => { if (!cancelled) setError("Could not load license image."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [licenseNumber]);

  async function upload(file: File) {
    if (!record?.id) return;
    setSaving(true); setError("");
    try {
      const image = await resizeImage(file);
      const response = await fetch("/api/license-image", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: record.id, image }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save license image.");
      setRecord(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save license image.");
    } finally { setSaving(false); }
  }

  if (loading) return <section className="license-image-panel"><div className="license-image-loading">Loading license image…</div></section>;

  return <>
    <section className="license-image-panel">
      <div className="license-image-head">
        <div><small>DRIVER LICENSE</small><h3>LICENSE IMAGE</h3></div>
        {record?.license_image && <button className="license-view-button" onClick={() => setViewer(true)}><Maximize2 size={15} /> VIEW</button>}
      </div>
      {record?.license_image ? <button className="license-image-frame" onClick={() => setViewer(true)} aria-label="View full license image"><img src={record.license_image} alt={`Front of ${licenseNumber} fictional driver license`} /></button> : <div className="license-image-empty"><ImagePlus size={28} /><strong>NO LICENSE IMAGE</strong><span>Front image has not been uploaded.</span></div>}
      {admin && record?.id && <label className="license-upload-button"><Upload size={16} />{saving ? "PROCESSING IMAGE…" : record?.license_image ? "REPLACE LICENSE IMAGE" : "UPLOAD LICENSE IMAGE"}<input type="file" accept="image/*" disabled={saving} onChange={e => { const file = e.target.files?.[0]; if (file) upload(file); e.currentTarget.value = ""; }} /></label>}
      {error && <div className="license-image-error">{error}</div>}
    </section>
    {viewer && record?.license_image && <div className="license-image-viewer" onClick={() => setViewer(false)}><div className="license-viewer-inner" onClick={e => e.stopPropagation()}><button className="license-viewer-close" onClick={() => setViewer(false)}><X /></button><img src={record.license_image} alt={`Front of ${licenseNumber} fictional driver license`} /></div></div>}
  </>;
}

export default function LicenseImageEnhancer() {
  const activeMount = useRef<HTMLElement | null>(null);
  const rootRef = useRef<any>(null);

  useEffect(() => {
    let disposed = false;
    let currentKey = "";

    const enhance = async () => {
      const modal = document.querySelector(".record-modal:not(.new-record)") as HTMLElement | null;
      if (!modal) {
        currentKey = "";
        return;
      }
      const marker = modal.querySelector(".modal-head p")?.textContent?.trim() || "";
      const licenseNumber = marker && !/^OPD database record$/i.test(marker) && !/^OPD database/i.test(marker) ? marker : "";
      if (!licenseNumber) return;
      const key = `${licenseNumber}|${modal.textContent?.slice(0, 120) || ""}`;
      if (key === currentKey && activeMount.current?.isConnected) return;
      currentKey = key;
      rootRef.current?.unmount?.();
      activeMount.current?.remove();
      const mount = document.createElement("div");
      mount.className = "license-image-mount";
      const actions = modal.querySelector(".modal-actions");
      if (actions) modal.insertBefore(mount, actions);
      else modal.appendChild(mount);
      activeMount.current = mount;
      const { createRoot } = await import("react-dom/client");
      if (disposed) return;
      rootRef.current = createRoot(mount);
      rootRef.current.render(<LicenseImagePanel licenseNumber={licenseNumber} />);
    };

    const observer = new MutationObserver(() => { void enhance(); });
    observer.observe(document.body, { childList: true, subtree: true });
    const interval = window.setInterval(() => { void enhance(); }, 300);
    void enhance();
    return () => {
      disposed = true;
      observer.disconnect();
      window.clearInterval(interval);
      rootRef.current?.unmount?.();
      activeMount.current?.remove();
    };
  }, []);

  return null;
}
