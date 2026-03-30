import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Consent Gateway — Auth0",
  description: "7-Stage Action Gateway for AI Agents (Token Vault)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
