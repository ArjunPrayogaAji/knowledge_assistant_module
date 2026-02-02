import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Adamant SaaS",
  description: "Adamant SaaS Dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
