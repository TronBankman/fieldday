"use client";

import { useState } from "react";

/**
 * Registration flow for an org.
 * Phase 2: collects the basics. Full Falcons-style form can be
 * ported here in Phase 3 once per-org API routes are wired up.
 */
export default function OrgRegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = e.currentTarget;
    const data = {
      full_name: (form.elements.namedItem("full_name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
    };

    try {
      // POST to the org-scoped register API (wired up in Phase 3)
      const res = await fetch("", { method: "POST", body: JSON.stringify(data) });
      if (!res.ok) {
        const json = await res.json();
        setError((json as { error?: string }).error ?? "Registration failed. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <div className="w-16 h-16 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 grid place-items-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8">
              <path
                d="M5 13l4 4L19 7"
                stroke="#d4af37"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#f2f2f4] mb-2">
            You&apos;re registered!
          </h1>
          <p className="text-[#a8aab0]">
            We&apos;ve received your registration. Check your email for next steps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-extrabold text-[#f2f2f4] mb-2">Register</h1>
        <p className="text-[#a8aab0] mb-8">Fill out the form below to register.</p>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-[#f2f2f4]">
              Full name <span className="text-red-400">*</span>
            </span>
            <input
              name="full_name"
              type="text"
              required
              autoComplete="name"
              className="h-11 rounded-lg border border-[#2e2e36] bg-[#16161a] px-3 text-[#f2f2f4] focus:outline-none focus:border-[#d4af37]/60"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-[#f2f2f4]">
              Email <span className="text-red-400">*</span>
            </span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="h-11 rounded-lg border border-[#2e2e36] bg-[#16161a] px-3 text-[#f2f2f4] focus:outline-none focus:border-[#d4af37]/60"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-[#f2f2f4]">Phone</span>
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              className="h-11 rounded-lg border border-[#2e2e36] bg-[#16161a] px-3 text-[#f2f2f4] focus:outline-none focus:border-[#d4af37]/60"
            />
          </label>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="h-11 rounded-xl font-bold bg-[#d4af37] text-[#0a0a0c] hover:bg-[#e8c84a] disabled:opacity-60 transition-colors"
          >
            {loading ? "Submitting…" : "Submit Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}
