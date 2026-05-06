"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type SlugStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "taken" }
  | { state: "reserved" }
  | { state: "invalid" };

type Preset = "sports" | "fitness" | "dance" | "tutoring";

const PRESET_INFO: Record<Preset, { label: string; sub: string }> = {
  sports: { label: "Sports", sub: "Players & Sessions" },
  fitness: { label: "Fitness", sub: "Members & Classes" },
  dance: { label: "Dance", sub: "Dancers & Classes" },
  tutoring: { label: "Tutoring", sub: "Students & Lessons" },
};

const SLUG_RE = /^[a-z0-9-]+$/;

const INPUT_CLS =
  "w-full h-11 rounded-lg border border-[#2e2e36] bg-[#16161a] px-3 text-[#f2f2f4] text-sm focus:outline-none focus:border-[#d4af37]/60 transition-colors";
const LABEL_CLS = "text-sm font-medium text-[#f2f2f4]";
const ERROR_CLS = "text-xs text-red-400 mt-1";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terminology, setTerminology] = useState<Preset>("sports");

  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ state: "idle" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced slug availability check
  const checkSlug = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value || value.length < 3 || value.length > 40 || !SLUG_RE.test(value)) {
      if (value) setSlugStatus({ state: "invalid" });
      else setSlugStatus({ state: "idle" });
      return;
    }

    setSlugStatus({ state: "checking" });
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/signup/slug-available?slug=${encodeURIComponent(value)}`,
        );
        const json = (await res.json()) as {
          available: boolean;
          reason?: string;
        };
        if (json.available) {
          setSlugStatus({ state: "available" });
        } else if (json.reason === "reserved") {
          setSlugStatus({ state: "reserved" });
        } else if (json.reason === "taken") {
          setSlugStatus({ state: "taken" });
        } else {
          setSlugStatus({ state: "invalid" });
        }
      } catch {
        setSlugStatus({ state: "idle" });
      }
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleSlugChange(value: string) {
    // Auto-lowercase and strip invalid chars as user types
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(cleaned);
    checkSlug(cleaned);
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) {
      errs.name = "Organization name is required (2-80 characters)";
    }
    if (!slug || slug.length < 3 || !SLUG_RE.test(slug)) {
      errs.slug = "URL slug must be 3-40 lowercase characters, numbers, or hyphens";
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "A valid email address is required";
    }
    if (!password || password.length < 10) {
      errs.password = "Password must be at least 10 characters";
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug,
          ownerEmail: email.trim(),
          password,
          terminology,
        }),
      });

      const json = (await res.json()) as {
        ok?: boolean;
        stripeOnboardingUrl?: string;
        token?: string;
        error?: string;
      };

      if (!res.ok || !json.ok) {
        setServerError(json.error ?? "Something went wrong. Please try again.");
        return;
      }

      // Store token in localStorage (matching existing admin login pattern)
      if (json.token) {
        localStorage.setItem("fieldday_admin_token", json.token);
      }

      // Hard navigate to Stripe onboarding
      if (json.stripeOnboardingUrl) {
        window.location.href = json.stripeOnboardingUrl;
      }
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-[#f2f2f4] mb-2">
            Create your organization
          </h1>
          <p className="text-[#a8aab0] text-sm">
            Set up your Fieldday account in under 2 minutes.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#16161a] border border-[#2e2e36] rounded-2xl p-6 grid gap-5"
        >
          {/* Org Name */}
          <label className="grid gap-1.5">
            <span className={LABEL_CLS}>Organization name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Oakville Figure Skating Club"
              maxLength={80}
              className={INPUT_CLS}
            />
            {errors.name && <p className={ERROR_CLS}>{errors.name}</p>}
          </label>

          {/* URL Slug */}
          <label className="grid gap-1.5">
            <span className={LABEL_CLS}>URL slug</span>
            <div className="relative">
              <input
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="your-org-name"
                maxLength={40}
                className={INPUT_CLS + " pr-8"}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
                {slugStatus.state === "checking" && (
                  <span className="text-[#a8aab0]">...</span>
                )}
                {slugStatus.state === "available" && (
                  <span className="text-green-400">&#10003;</span>
                )}
                {slugStatus.state === "taken" && (
                  <span className="text-red-400">&#10007;</span>
                )}
                {slugStatus.state === "reserved" && (
                  <span className="text-red-400">&#10007;</span>
                )}
                {slugStatus.state === "invalid" && (
                  <span className="text-red-400">&#10007;</span>
                )}
              </span>
            </div>
            {slug && (
              <p className="text-xs text-[#555560]">
                fieldday.app/<span className="text-[#a8aab0]">{slug}</span>
              </p>
            )}
            {slugStatus.state === "taken" && (
              <p className={ERROR_CLS}>Already taken</p>
            )}
            {slugStatus.state === "reserved" && (
              <p className={ERROR_CLS}>Reserved — pick another</p>
            )}
            {slugStatus.state === "invalid" && slug && (
              <p className={ERROR_CLS}>Invalid format</p>
            )}
            {errors.slug && <p className={ERROR_CLS}>{errors.slug}</p>}
          </label>

          {/* Owner Email */}
          <label className="grid gap-1.5">
            <span className={LABEL_CLS}>Owner email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={INPUT_CLS}
            />
            {errors.email && <p className={ERROR_CLS}>{errors.email}</p>}
          </label>

          {/* Password */}
          <label className="grid gap-1.5">
            <span className={LABEL_CLS}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 10 characters"
              autoComplete="new-password"
              className={INPUT_CLS}
            />
            {errors.password && <p className={ERROR_CLS}>{errors.password}</p>}
          </label>

          {/* Terminology Preset */}
          <fieldset className="grid gap-2">
            <legend className={LABEL_CLS + " mb-1"}>What type of organization?</legend>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(PRESET_INFO) as [Preset, { label: string; sub: string }][]).map(
                ([key, info]) => (
                  <label
                    key={key}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                      terminology === key
                        ? "border-[#d4af37] bg-[#d4af37]/10"
                        : "border-[#2e2e36] hover:border-[#555560]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="terminology"
                      value={key}
                      checked={terminology === key}
                      onChange={() => setTerminology(key)}
                      className="accent-[#d4af37] mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-[#f2f2f4]">
                        {info.label}
                      </p>
                      <p className="text-xs text-[#a8aab0]">{info.sub}</p>
                    </div>
                  </label>
                ),
              )}
            </div>
          </fieldset>

          {/* Server error */}
          {serverError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
              <p className="text-sm text-red-400">{serverError}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="h-12 rounded-xl font-bold bg-[#d4af37] text-[#0a0a0c] hover:bg-[#e8c84a] disabled:opacity-60 transition-colors text-sm"
          >
            {submitting ? "Creating..." : "Create my organization"}
          </button>
        </form>

        <p className="text-center text-xs text-[#555560] mt-4">
          Already have an account?{" "}
          <a href="/login" className="text-[#d4af37] hover:underline">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}
