"use client";

import Link from "next/link";
import { useState } from "react";

type FormState = "idle" | "submitting" | "success" | "error";

export default function DemoPage() {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value.trim(),
      org: (form.elements.namedItem("org") as HTMLInputElement).value.trim(),
      email: (form.elements.namedItem("email") as HTMLInputElement).value.trim(),
      sport: (form.elements.namedItem("sport") as HTMLSelectElement).value,
      currentTool: (form.elements.namedItem("currentTool") as HTMLInputElement).value.trim(),
    };

    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? "Something went wrong");
      }

      setState("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  }

  return (
    <>
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[#2e2e36] bg-[rgba(13,13,15,0.88)] backdrop-blur-md">
        <div className="w-[min(1120px,calc(100%-2rem))] mx-auto flex items-center justify-between h-14">
          <Link href="/" className="text-xl font-bold tracking-tight text-[#f2f2f4] no-underline">
            <span className="text-[#d4af37]">Field</span>day
          </Link>
        </div>
      </nav>

      <main className="w-[min(560px,calc(100%-2rem))] mx-auto py-16 max-md:py-10">
        {state === "success" ? (
          <div className="animate-rise border border-[#d4af37]/30 rounded-2xl bg-gradient-to-br from-[rgba(40,32,8,0.9)] to-[rgba(18,18,20,0.9)] p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 grid place-items-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
                <path
                  d="M5 12l5 5L20 7"
                  stroke="#d4af37"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold m-0 mb-2">You&apos;re on the list.</h1>
            <p className="text-[#a8aab0] m-0 mb-6">
              We&apos;ll reach out within one business day to schedule your demo.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center h-10 rounded-lg px-5 text-sm font-semibold text-[#0a0a0c] no-underline bg-[#d4af37] hover:bg-[#e8c84a] transition-colors"
            >
              Back to home
            </Link>
          </div>
        ) : (
          <div className="animate-rise">
            <p className="text-[#d4af37] uppercase tracking-[0.12em] text-sm font-semibold m-0 mb-2">
              Book a Demo
            </p>
            <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold leading-tight tracking-tight m-0 mb-2">
              Let&apos;s show you around.
            </h1>
            <p className="text-[#a8aab0] m-0 mb-8">
              Fill this out and we&apos;ll reach out within one business day to
              book a 30-minute walkthrough.
            </p>

            <form
              onSubmit={handleSubmit}
              className="border border-[#2e2e36] rounded-2xl bg-gradient-to-br from-[rgba(26,26,30,0.95)] to-[rgba(18,18,20,0.95)] p-6 max-md:p-4 grid gap-4"
            >
              <FormField label="Your name" required>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Jane Smith"
                  className="w-full h-10 rounded-lg bg-[#111113] border border-[#2e2e36] text-[#f2f2f4] text-sm px-3 focus:outline-none focus:border-[#d4af37]/60 transition-colors"
                />
              </FormField>

              <FormField label="Organization name" required>
                <input
                  name="org"
                  type="text"
                  required
                  placeholder="BC Falcons Hockey"
                  className="w-full h-10 rounded-lg bg-[#111113] border border-[#2e2e36] text-[#f2f2f4] text-sm px-3 focus:outline-none focus:border-[#d4af37]/60 transition-colors"
                />
              </FormField>

              <FormField label="Email address" required>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="jane@bcfalcons.com"
                  className="w-full h-10 rounded-lg bg-[#111113] border border-[#2e2e36] text-[#f2f2f4] text-sm px-3 focus:outline-none focus:border-[#d4af37]/60 transition-colors"
                />
              </FormField>

              <FormField label="Sport" required>
                <select
                  name="sport"
                  required
                  className="w-full h-10 rounded-lg bg-[#111113] border border-[#2e2e36] text-[#f2f2f4] text-sm px-3 focus:outline-none focus:border-[#d4af37]/60 transition-colors appearance-none"
                >
                  <option value="">Select a sport</option>
                  <option value="hockey">Hockey</option>
                  <option value="soccer">Soccer</option>
                  <option value="lacrosse">Lacrosse</option>
                  <option value="basketball">Basketball</option>
                  <option value="baseball">Baseball</option>
                  <option value="volleyball">Volleyball</option>
                  <option value="softball">Softball</option>
                  <option value="football">Football</option>
                  <option value="other">Other</option>
                </select>
              </FormField>

              <FormField label="What are you currently using to manage your org?">
                <input
                  name="currentTool"
                  type="text"
                  placeholder="TeamSnap, spreadsheets, nothing, etc."
                  className="w-full h-10 rounded-lg bg-[#111113] border border-[#2e2e36] text-[#f2f2f4] text-sm px-3 focus:outline-none focus:border-[#d4af37]/60 transition-colors"
                />
              </FormField>

              {state === "error" && (
                <p className="text-[#e51b24] text-sm m-0 rounded-lg bg-[#e51b24]/10 border border-[#e51b24]/30 px-3 py-2">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={state === "submitting"}
                className="w-full h-11 rounded-xl font-bold text-[#0a0a0c] bg-[#d4af37] hover:bg-[#e8c84a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {state === "submitting" ? "Sending..." : "Request a Demo"}
              </button>
            </form>
          </div>
        )}
      </main>

      <footer className="border-t border-[#2e2e36] mt-4">
        <div className="w-[min(1120px,calc(100%-2rem))] mx-auto py-6 text-center">
          <p className="text-[#a8aab0] text-sm m-0">
            Questions?{" "}
            <a
              href="mailto:hello@fieldday.app"
              className="text-[#d4af37] hover:underline"
            >
              hello@fieldday.app
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-semibold text-[#f2f2f4]">
        {label}
        {required && <span className="text-[#d4af37] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
