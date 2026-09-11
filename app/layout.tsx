import type { Metadata } from "next";
import "./globals.css";
import "./additional.css";
import AuthGate from "./auth-gate";
import LogoutHandler from "./logout-handler";
import AdminEnhancer from "./admin-enhancer";
import NotificationBell from "./notification-bell";
import IncidentEnhancer from "./incident-enhancer";
import OfficerLock from "./officer-lock";
import CaseStatusEditor from "./case-status-editor";

export const metadata: Metadata = {
  title: "Opaline Police Department | Records Terminal",
  description: "Fictional roleplay driver license records system",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head><link rel="stylesheet" href="/admin.css" /></head>
      <body><AuthGate><LogoutHandler /><AdminEnhancer /><NotificationBell /><IncidentEnhancer /><OfficerLock /><CaseStatusEditor />{children}</AuthGate></body>
    </html>
  );
}
