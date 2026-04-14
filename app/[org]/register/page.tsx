"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

interface SessionOption {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  price: number;
  allow_installments: boolean;
  installment_count: number;
}

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];

export default function OrgRegisterPage() {
  const params = useParams<{ org: string }>();
  const orgSlug = params.org;

  const [submitted, setSubmitted] = useState(false);
  const [registrationId, setRegistrationId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Signup type
  const [signupType, setSignupType] = useState("");

  // Load sessions on mount
  useEffect(() => {
    async function loadSessions() {
      try {
        const res = await fetch(`/api/org/sessions`, {
          headers: { "x-fieldday-org-slug": orgSlug },
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions || []);
        }
      } catch {
        // Sessions unavailable — form still works without them
      } finally {
        setSessionsLoading(false);
      }
    }
    loadSessions();
  }, [orgSlug]);

  const handleSessionChange = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = e.currentTarget;
    const get = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)?.value ?? "";

    const data = {
      full_name: get("full_name"),
      guardian_name: get("guardian_name"),
      email: get("email"),
      phone: get("phone"),
      birth_year: get("birth_year"),
      signup_type: get("signup_type"),
      session_id: get("session_id"),
      participant_role: get("participant_role"),
      jersey_1: get("jersey_1"),
      jersey_2: get("jersey_2"),
      jersey_3: get("jersey_3"),
      tshirt_size: get("tshirt_size"),
      sweatshirt_size: get("sweatshirt_size"),
      comments: get("comments"),
    };

    try {
      const res = await fetch(`/api/org/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Registration failed. Please try again.");
      } else {
        setRegistrationId(json.registrationId ?? "");
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
          <p className="text-[#a8aab0] mb-1">
            We&apos;ve received your registration. Check your email for next steps.
          </p>
          {registrationId && (
            <p className="text-[#a8aab0] text-sm">
              Reference: <span className="font-mono text-[#d4af37]">{registrationId}</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  const inputClass =
    "h-11 rounded-lg border border-[#2e2e36] bg-[#16161a] px-3 text-[#f2f2f4] focus:outline-none focus:border-[#d4af37]/60 w-full";
  const labelClass = "grid gap-1";
  const labelTextClass = "text-sm font-medium text-[#f2f2f4]";
  const requiredStar = <span className="text-red-400">*</span>;

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-extrabold text-[#f2f2f4] mb-2">Register</h1>
        <p className="text-[#a8aab0] mb-8">Fill out the form below to register.</p>

        <form onSubmit={handleSubmit} className="grid gap-4">
          {/* Player Full Name */}
          <label className={labelClass}>
            <span className={labelTextClass}>Player Full Name {requiredStar}</span>
            <input name="full_name" type="text" required autoComplete="name" className={inputClass} />
          </label>

          {/* Parent/Guardian Name */}
          <label className={labelClass}>
            <span className={labelTextClass}>Parent/Guardian Name</span>
            <input name="guardian_name" type="text" autoComplete="name" className={inputClass} />
          </label>

          {/* Email */}
          <label className={labelClass}>
            <span className={labelTextClass}>Email {requiredStar}</span>
            <input name="email" type="email" required autoComplete="email" className={inputClass} />
          </label>

          {/* Phone */}
          <label className={labelClass}>
            <span className={labelTextClass}>Phone</span>
            <input name="phone" type="tel" autoComplete="tel" className={inputClass} />
          </label>

          {/* Birth Year */}
          <label className={labelClass}>
            <span className={labelTextClass}>Birth Year</span>
            <input
              name="birth_year"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              placeholder="e.g. 2012"
              className={inputClass}
            />
          </label>

          {/* Signup Type */}
          <label className={labelClass}>
            <span className={labelTextClass}>Signup Type</span>
            <select
              name="signup_type"
              value={signupType}
              onChange={(e) => setSignupType(e.target.value)}
              className={inputClass}
            >
              <option value="">Select an option</option>
              <option value="Session Signup">Session Signup</option>
              <option value="Team Application">Team Application</option>
              <option value="Waitlist">Waitlist</option>
              <option value="General Interest">General Interest</option>
            </select>
          </label>

          {/* Session Dropdown */}
          <label className={labelClass}>
            <span className={labelTextClass}>Session</span>
            <select
              name="session_id"
              value={selectedSessionId}
              onChange={(e) => handleSessionChange(e.target.value)}
              className={inputClass}
              disabled={sessionsLoading}
            >
              <option value="">
                {sessionsLoading ? "Loading sessions..." : "Select a session (optional)"}
              </option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.date} {s.time} ({s.location})
                </option>
              ))}
            </select>
          </label>

          {/* Position / Role */}
          <label className={labelClass}>
            <span className={labelTextClass}>Position / Role</span>
            <select name="participant_role" className={inputClass}>
              <option value="">Select position</option>
              <option value="Forward">Forward</option>
              <option value="Defence">Defence</option>
              <option value="Goalie">Goalie</option>
              <option value="Skater">Skater</option>
            </select>
          </label>

          {/* Jersey Choices */}
          <div className="grid gap-4 sm:grid-cols-3">
            <label className={labelClass}>
              <span className={labelTextClass}>Jersey Choice #1</span>
              <input name="jersey_1" type="number" min={0} max={99} inputMode="numeric" placeholder="e.g. 9" className={inputClass} />
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>Jersey Choice #2</span>
              <input name="jersey_2" type="number" min={0} max={99} inputMode="numeric" placeholder="e.g. 19" className={inputClass} />
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>Jersey Choice #3</span>
              <input name="jersey_3" type="number" min={0} max={99} inputMode="numeric" placeholder="e.g. 91" className={inputClass} />
            </label>
          </div>

          {/* T-Shirt / Sweatshirt Sizes */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              <span className={labelTextClass}>T-Shirt Size</span>
              <select name="tshirt_size" className={inputClass}>
                <option value="">Select size</option>
                {SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>Sweatshirt Size</span>
              <select name="sweatshirt_size" className={inputClass}>
                <option value="">Select size</option>
                {SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Comments */}
          <label className={labelClass}>
            <span className={labelTextClass}>Comments</span>
            <textarea
              name="comments"
              rows={3}
              placeholder="Any additional info (experience, goals, schedule details)"
              className="rounded-lg border border-[#2e2e36] bg-[#16161a] px-3 py-2 text-[#f2f2f4] focus:outline-none focus:border-[#d4af37]/60 w-full resize-y"
            />
          </label>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="h-11 rounded-xl font-bold bg-[#d4af37] text-[#0a0a0c] hover:bg-[#e8c84a] disabled:opacity-60 transition-colors"
          >
            {loading ? "Submitting\u2026" : "Submit Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}
