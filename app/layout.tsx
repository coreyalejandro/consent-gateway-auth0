import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Consent Gateway — Auth0",
  description: "7-stage consent gateway for AI agents — policy, step-up, connection-scoped token issuance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
