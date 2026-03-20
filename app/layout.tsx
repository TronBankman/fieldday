import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://fieldday.app"),
  title: "Fieldday — Sports Org Management Without the Spreadsheets",
  description:
    "Online registration, payment collection, scheduling, attendance, and parent communication — all in one place. Flat $149/month, no transaction fees.",
  keywords: [
    "sports organization management",
    "youth sports software",
    "hockey registration software",
    "soccer team management",
    "lacrosse registration",
    "sports admin software",
    "no transaction fees",
    "TeamSnap alternative",
  ],
  openGraph: {
    title: "Fieldday — Sports Org Management Without the Spreadsheets",
    description:
      "Registration, payments, attendance, scheduling — all in one place. Flat $149/month, no transaction fees.",
    type: "website",
    locale: "en_CA",
    url: "https://fieldday.app",
    siteName: "Fieldday",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
