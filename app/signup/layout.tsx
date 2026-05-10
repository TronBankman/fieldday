import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create your Fieldday account and start managing registrations, payments, and scheduling for your sports organization in minutes.",
  openGraph: {
    title: "Sign Up — Fieldday",
    description:
      "Create your Fieldday account and start managing your sports organization in minutes.",
    url: "https://fieldday.app/signup",
  },
  alternates: {
    canonical: "https://fieldday.app/signup",
  },
  robots: { index: true, follow: true },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
