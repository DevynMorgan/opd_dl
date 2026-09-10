import type { Metadata } from "next";
import "./globals.css";
import "./additional.css";
import GenderEnhancer from "./gender-enhancer";

export const metadata: Metadata = {
  title: "Opaline Police Department | Records Terminal",
  description: "Fictional roleplay driver license records system",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <GenderEnhancer />
        {children}
      </body>
    </html>
  );
}
