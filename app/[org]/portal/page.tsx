"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  getPlayerToken,
  setPlayerToken,
  clearPlayerToken,
  playerFetch,
} from "@/lib/player-api";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface PlayerProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  birthYear: string;
  guardianName: string;
}

interface ScheduleEntry {
  id: string;
  timestamp: string;
  signupType: string;
  sessionId: string;
  sessionName: string;
  sessionDate: string;
  sessionTime: string;
  sessionLocation: string;
  sessionProgram: string;
  sessionDuration: number;
  participantRole: string;
  approvalStatus: string;
  availability: string;
}

interface PaymentEntry {
  registrationId: string;
  sessionName: string;
  sessionDate: string;
  amountDue: number;
  amountPaid: number;
  paidStatus: string;
  allowInstallments: boolean;
  installmentCount: number;
}

interface PaymentSummary {
  totalDue: number;
  totalPaid: number;
  outstanding: number;
}

type Tab = "schedule" | "payments" | "profile";
type AuthView = "login" | "signup";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const INPUT_CLS =
  "h-11 rounded-lg border border-[#2e2e36] bg-[#16161a] px-3 text-[#f2f2f4] text-sm focus:outline-none focus:border-[#d4af37]/60 w-full";
const BTN_GOLD =
  "h-11 rounded-xl font-bold bg-[#d4af37] text-[#0a0a0c] hover:bg-[#e8c84a] disabled:opacity-60 transition-colors px-6 text-sm";
const BTN_OUTLINE =
  "h-9 rounded-lg border border-[#2e2e36] text-sm px-4 text-[#a8aab0] hover:text-[#f2f2f4] hover:border-[#d4af37]/40 transition-colors";

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export default function OrgPortalPage() {
  const params = useParams<{ org: string }>();
  const orgSlug = params.org;

  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  // Auth view toggle
  const [authView, setAuthView] = useState<AuthView>("login");

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  // Dashboard state
  const [tab, setTab] = useState<Tab>("schedule");
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary>({
    totalDue: 0,
    totalPaid: 0,
    outstanding: 0,
  });
  const [dataLoading, setDataLoading] = useState(false);

  // Profile edit
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  useEffect(() => {
    const token = getPlayerToken();
    if (token) setAuthed(true);
    setChecking(false);
  }, []);

  /* ---------- Data loading ---------- */

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [profRes, schedRes, payRes] = await Promise.all([
        playerFetch("/api/org/player/profile"),
        playerFetch("/api/org/player/schedule"),
        playerFetch("/api/org/player/payments"),
      ]);
      if (profRes.ok) {
        const json = await profRes.json();
        setProfile((json as { player: PlayerProfile }).player);
      }
      if (schedRes.ok) {
        const json = await schedRes.json();
        setSchedule(
          (json as { registrations: ScheduleEntry[] }).registrations
        );
      }
      if (payRes.ok) {
        const json = await payRes.json();
        const data = json as {
          payments: PaymentEntry[];
          summary: PaymentSummary;
        };
        setPayments(data.payments);
        setPaymentSummary(data.summary);
      }
    } catch {
      // playerFetch handles 401 automatically
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) loadData();
  }, [authed, loadData]);

  /* ---------- Login ---------- */

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await fetch("/api/org/player/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fieldday-org-slug": orgSlug,
        },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const json = await res.json();
        setLoginError(
          (json as { error?: string }).error ?? "Invalid credentials"
        );
      } else {
        const json = await res.json();
        setPlayerToken((json as { token: string }).token);
        setAuthed(true);
      }
    } catch {
      setLoginError("Network error. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  }

  /* ---------- Signup ---------- */

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSignupError("");
    setSignupLoading(true);
    try {
      const res = await fetch("/api/org/player/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fieldday-org-slug": orgSlug,
        },
        body: JSON.stringify({
          fullName: signupName,
          email: signupEmail,
          password: signupPassword,
          phone: signupPhone,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        setSignupError(
          (json as { error?: string }).error ?? "Signup failed"
        );
      } else {
        const json = await res.json();
        setPlayerToken((json as { token: string }).token);
        setAuthed(true);
      }
    } catch {
      setSignupError("Network error. Please try again.");
    } finally {
      setSignupLoading(false);
    }
  }

  function handleLogout() {
    clearPlayerToken();
    setAuthed(false);
    setProfile(null);
    setSchedule([]);
    setPayments([]);
  }

  /* ---------- RSVP ---------- */

  async function updateAvailability(
    registrationId: string,
    availability: string
  ) {
    try {
      const res = await playerFetch("/api/org/player/availability", {
        method: "PUT",
        body: JSON.stringify({ registrationId, availability }),
      });
      if (res.ok) {
        setSchedule((prev) =>
          prev.map((e) =>
            e.id === registrationId ? { ...e, availability } : e
          )
        );
      }
    } catch {
      // silent — availability is non-critical
    }
  }

  /* ---------- Profile update ---------- */

  async function handleProfileSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileMsg("");
    const form = new FormData(e.currentTarget);
    const payload = {
      fullName: form.get("fullName"),
      phone: form.get("phone"),
      birthYear: form.get("birthYear"),
      guardianName: form.get("guardianName"),
    };
    try {
      const res = await playerFetch("/api/org/player/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        setProfile((json as { player: PlayerProfile }).player);
        setEditingProfile(false);
        setProfileMsg("Profile updated");
        setTimeout(() => setProfileMsg(""), 2000);
      } else {
        const json = await res.json();
        setProfileMsg(
          (json as { error?: string }).error ?? "Update failed"
        );
      }
    } catch {
      setProfileMsg("Network error");
    }
  }

  /* ---------- Render: checking ---------- */

  if (checking) return null;

  /* ---------- Render: auth forms ---------- */

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-extrabold text-[#f2f2f4] mb-2">
            Player Portal
          </h1>
          <p className="text-[#a8aab0] mb-6">
            {authView === "login"
              ? "Sign in to view your schedule, payments, and profile."
              : "Create an account to access your player portal."}
          </p>

          {/* Toggle buttons */}
          <div className="flex gap-1 mb-6 border-b border-[#2e2e36] pb-px">
            <button
              onClick={() => {
                setAuthView("login");
                setSignupError("");
              }}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                authView === "login"
                  ? "bg-[#16161a] text-[#d4af37] border border-[#2e2e36] border-b-transparent -mb-px"
                  : "text-[#a8aab0] hover:text-[#f2f2f4]"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthView("signup");
                setLoginError("");
              }}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                authView === "signup"
                  ? "bg-[#16161a] text-[#d4af37] border border-[#2e2e36] border-b-transparent -mb-px"
                  : "text-[#a8aab0] hover:text-[#f2f2f4]"
              }`}
            >
              Create Account
            </button>
          </div>

          {authView === "login" ? (
            <form onSubmit={handleLogin} className="grid gap-4">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-[#f2f2f4]">
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={INPUT_CLS}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium text-[#f2f2f4]">
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className={INPUT_CLS}
                />
              </label>

              {loginError && (
                <p className="text-red-400 text-sm">{loginError}</p>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className={BTN_GOLD}
              >
                {loginLoading ? "Signing in\u2026" : "Sign In"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="grid gap-4">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-[#f2f2f4]">
                  Full Name <span className="text-red-400">*</span>
                </span>
                <input
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  required
                  autoComplete="name"
                  className={INPUT_CLS}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium text-[#f2f2f4]">
                  Email <span className="text-red-400">*</span>
                </span>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={INPUT_CLS}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium text-[#f2f2f4]">
                  Password <span className="text-red-400">*</span>
                </span>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={INPUT_CLS}
                />
                <span className="text-xs text-[#555560]">
                  At least 8 characters
                </span>
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium text-[#f2f2f4]">
                  Phone
                </span>
                <input
                  type="tel"
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(e.target.value)}
                  autoComplete="tel"
                  className={INPUT_CLS}
                />
              </label>

              {signupError && (
                <p className="text-red-400 text-sm">{signupError}</p>
              )}

              <button
                type="submit"
                disabled={signupLoading}
                className={BTN_GOLD}
              >
                {signupLoading ? "Creating account\u2026" : "Create Account"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  /* ---------- Render: dashboard ---------- */

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="w-[min(1120px,calc(100%-2rem))] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#f2f2f4]">
              Player Portal
            </h1>
            {profile && (
              <p className="text-sm text-[#a8aab0] mt-0.5">
                Welcome, {profile.fullName}
              </p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-[#a8aab0] hover:text-[#f2f2f4] transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-[#2e2e36] pb-px">
          {(["schedule", "payments", "profile"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                tab === t
                  ? "bg-[#16161a] text-[#d4af37] border border-[#2e2e36] border-b-transparent -mb-px"
                  : "text-[#a8aab0] hover:text-[#f2f2f4]"
              }`}
            >
              {t === "schedule"
                ? "My Schedule"
                : t === "payments"
                  ? "My Payments"
                  : "My Profile"}
            </button>
          ))}
        </div>

        {/* Status messages */}
        {profileMsg && (
          <div className="mb-4 text-sm text-[#d4af37] bg-[#16161a] border border-[#2e2e36] rounded-lg px-4 py-2">
            {profileMsg}
          </div>
        )}

        {dataLoading && (
          <p className="text-[#a8aab0] text-sm mb-4">Loading\u2026</p>
        )}

        {/* Schedule Tab */}
        {tab === "schedule" && (
          <div className="grid gap-4">
            {schedule.length === 0 && !dataLoading && (
              <div className="border border-[#2e2e36] rounded-xl bg-[#16161a] p-6 text-center">
                <p className="text-[#a8aab0] text-sm">
                  No registrations yet. Register for a session to see your
                  schedule here.
                </p>
              </div>
            )}
            {schedule.map((entry) => (
              <div
                key={entry.id}
                className="border border-[#2e2e36] rounded-xl bg-[#16161a] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#f2f2f4]">
                      {entry.sessionName || entry.signupType || "Registration"}
                    </h3>
                    {entry.sessionDate && (
                      <p className="text-xs text-[#a8aab0] mt-1">
                        {entry.sessionDate}
                        {entry.sessionTime ? ` at ${entry.sessionTime}` : ""}
                        {entry.sessionLocation
                          ? ` \u00B7 ${entry.sessionLocation}`
                          : ""}
                      </p>
                    )}
                    {entry.sessionProgram && (
                      <p className="text-xs text-[#555560] mt-0.5">
                        {entry.sessionProgram}
                      </p>
                    )}
                    {entry.participantRole && (
                      <p className="text-xs text-[#555560] mt-0.5">
                        Position: {entry.participantRole}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      entry.approvalStatus === "approved"
                        ? "bg-[#1db954]/20 text-[#1db954]"
                        : entry.approvalStatus === "rejected"
                          ? "bg-[#e51b24]/20 text-[#e51b24]"
                          : "bg-[#d4af37]/20 text-[#d4af37]"
                    }`}
                  >
                    {entry.approvalStatus}
                  </span>
                </div>
                {/* RSVP buttons */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {(
                    [
                      ["attending", "Attending"],
                      ["not_attending", "Not Attending"],
                      ["no_response", "No Response"],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => updateAvailability(entry.id, val)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        entry.availability === val
                          ? val === "attending"
                            ? "border-[#1db954] bg-[#1db954]/20 text-[#1db954]"
                            : val === "not_attending"
                              ? "border-[#e51b24] bg-[#e51b24]/20 text-[#e51b24]"
                              : "border-[#d4af37] bg-[#d4af37]/20 text-[#d4af37]"
                          : "border-[#2e2e36] text-[#a8aab0] hover:text-[#f2f2f4] hover:border-[#d4af37]/40"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payments Tab */}
        {tab === "payments" && (
          <div className="grid gap-6">
            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="border border-[#2e2e36] rounded-xl bg-[#16161a] p-5 text-center">
                <p className="text-xs text-[#a8aab0] mb-1">Total Due</p>
                <p className="text-2xl font-extrabold text-[#f2f2f4]">
                  {formatCents(paymentSummary.totalDue)}
                </p>
              </div>
              <div className="border border-[#2e2e36] rounded-xl bg-[#16161a] p-5 text-center">
                <p className="text-xs text-[#a8aab0] mb-1">Paid</p>
                <p className="text-2xl font-extrabold text-[#1db954]">
                  {formatCents(paymentSummary.totalPaid)}
                </p>
              </div>
              <div className="border border-[#2e2e36] rounded-xl bg-[#16161a] p-5 text-center">
                <p className="text-xs text-[#a8aab0] mb-1">Outstanding</p>
                <p className="text-2xl font-extrabold text-[#d4af37]">
                  {formatCents(paymentSummary.outstanding)}
                </p>
              </div>
            </div>

            {/* Payment items */}
            {payments.length === 0 && !dataLoading && (
              <p className="text-[#a8aab0] text-sm">No payment records yet.</p>
            )}
            <div className="grid gap-2">
              {payments.map((p) => (
                <div
                  key={p.registrationId}
                  className="border border-[#2e2e36] rounded-lg bg-[#16161a] px-4 py-3 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm text-[#f2f2f4]">{p.sessionName}</p>
                    {p.sessionDate && (
                      <p className="text-xs text-[#555560]">{p.sessionDate}</p>
                    )}
                    <p className="text-xs text-[#a8aab0] mt-0.5">
                      Due: {formatCents(p.amountDue)} \u00B7 Paid:{" "}
                      {formatCents(p.amountPaid)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        p.paidStatus === "Yes"
                          ? "bg-[#1db954]/20 text-[#1db954]"
                          : "bg-[#d4af37]/20 text-[#d4af37]"
                      }`}
                    >
                      {p.paidStatus === "Yes" ? "Paid" : "Unpaid"}
                    </span>
                    {p.paidStatus !== "Yes" && p.amountDue > 0 && (
                      <a
                        href={`/${orgSlug}/checkout?reg=${p.registrationId}&amount=${p.amountDue}`}
                        className="text-xs font-bold px-3 py-1 rounded-lg bg-[#d4af37] text-[#0a0a0c] hover:bg-[#e8c84a] transition-colors"
                      >
                        Pay Now
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {tab === "profile" && profile && (
          <div className="border border-[#2e2e36] rounded-xl bg-[#16161a] p-6">
            {editingProfile ? (
              <form onSubmit={handleProfileSave} className="grid gap-4">
                <h3 className="text-sm font-bold text-[#d4af37]">
                  Edit Profile
                </h3>
                <label className="grid gap-1">
                  <span className="text-xs text-[#a8aab0]">Full Name</span>
                  <input
                    name="fullName"
                    defaultValue={profile.fullName}
                    required
                    className={INPUT_CLS}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-[#a8aab0]">Phone</span>
                  <input
                    name="phone"
                    defaultValue={profile.phone}
                    className={INPUT_CLS}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-[#a8aab0]">Birth Year</span>
                  <input
                    name="birthYear"
                    defaultValue={profile.birthYear}
                    className={INPUT_CLS}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-[#a8aab0]">
                    Parent/Guardian Name
                  </span>
                  <input
                    name="guardianName"
                    defaultValue={profile.guardianName}
                    className={INPUT_CLS}
                  />
                </label>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className={BTN_GOLD}>
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProfile(false)}
                    className={BTN_OUTLINE}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-[#d4af37]">Profile</h3>
                  <button
                    onClick={() => setEditingProfile(true)}
                    className={BTN_OUTLINE}
                  >
                    Edit
                  </button>
                </div>
                <div className="grid gap-3">
                  <ProfileField label="Name" value={profile.fullName} />
                  <ProfileField label="Email" value={profile.email} />
                  <ProfileField label="Phone" value={profile.phone} />
                  <ProfileField label="Birth Year" value={profile.birthYear} />
                  <ProfileField
                    label="Parent/Guardian"
                    value={profile.guardianName}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Profile Field Display                                             */
/* ------------------------------------------------------------------ */

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#a8aab0]">{label}</p>
      <p className="text-sm text-[#f2f2f4]">{value || "\u2014"}</p>
    </div>
  );
}
