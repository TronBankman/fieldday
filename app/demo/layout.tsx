import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a Demo",
  description:
    "See how Fieldday handles registration, payments, scheduling, and communication for your sports organization. Book a free 30-minute walkthrough.",
  openGraph: {
    title: "Book a Demo — Fieldday",
    description:
      "See how Fieldday handles registration, payments, scheduling, and communication for your sports org. Free 30-minute walkthrough.",
    url: "https://fieldday.app/demo",
  },
  alternates: {
    canonical: "https://fieldday.app/demo",
  },
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
