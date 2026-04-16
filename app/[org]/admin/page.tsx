"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { getToken, setToken, clearToken, adminFetch } from "@/lib/admin-api";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Registration {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  birthYear: string;
  guardianName: string;
  signupType: string;
  sessionId: string;
  participantRole: string;
  jersey1: string;
  jersey2: string;
  jersey3: string;
  tshirtSize: string;
  sweatshirtSize: string;
  comments: string;
  paidStatus: string;
  approvalStatus: string;
  amountDue: number;
  amountPaid: number;
  timestamp: string;
}

interface SessionData {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  program: string;
  teamId: string;
  openToPublic: boolean;
  price: number;
  forwardSpots: number;
  defenceSpots: number;
  skaterSpots: number;
  goalieSpots: number;
  birthYearMin: number;
  birthYearMax: number;
  durationMinutes: number;
  allowInstallments: boolean;
  installmentCount: number;
}

type Tab = "registrations" | "sessions" | "payments";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function groupBy<T>(items: T[], getKey: (item: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  items.forEach((item) => {
    const key = getKey(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  });
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

const INPUT_CLS =
  "h-10 rounded-lg border border-[#2e2e36] bg-[#16161a] px-3 text-[#f2f2f4] text-sm focus:outline-none focus:border-[#d4af37]/60";
const BTN_GOLD =
  "h-10 rounded-xl font-bold bg-[#d4af37] text-[#0a0a0c] hover:bg-[#e8c84a] disabled:opacity-60 transition-colors px-5 text-sm";
const BTN_OUTLINE =
  "h-8 rounded-lg border border-[#2e2e36] text-xs px-3 text-[#a8aab0] hover:text-[#f2f2f4] hover:border-[#d4af37]/40 transition-colors";

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export default function OrgAdminPage() {
  const params = useParams<{ org: string }>();
  const orgSlug = params.org;

  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  // Login state
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Dashboard state
  const [tab, setTab] = useState<Tab>("registrations");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  // Session form
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionData | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) setAuthed(true);
    setChecking(false);
  }, []);

  /* ---------- Data loading ---------- */

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [regRes, sesRes] = await Promise.all([
        adminFetch("/api/org/admin/registrations"),
        adminFetch("/api/org/admin/sessions"),
      ]);
      if (regRes.ok) {
        const json = await regRes.json();
        setRegistrations((json as { registrations: Registration[] }).registrations);
      }
      if (sesRes.ok) {
        const json = await sesRes.json();
        setSessions((json as { sessions: SessionData[] }).sessions);
      }
    } catch {
      // adminFetch handles 401 (token expired) automatically
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
      const res = await fetch("/api/org/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fieldday-org-slug": orgSlug,
        },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const json = await res.json();
        setLoginError((json as { error?: string }).error ?? "Invalid credentials");
      } else {
        const json = await res.json();
        setToken((json as { token: string }).token);
        setAuthed(true);
      }
    } catch {
      setLoginError("Network error. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    clearToken();
    setAuthed(false);
    setRegistrations([]);
    setSessions([]);
  }

  /* ---------- Registration actions ---------- */

  async function updateRegistration(
    id: string,
    updates: Partial<Pick<Registration, "approvalStatus" | "paidStatus">>
  ) {
    setActionMsg("");
    try {
      const res = await adminFetch("/api/org/admin/registrations", {
        method: "PATCH",
        body: JSON.stringify({ id, ...updates }),
      });
      if (!res.ok) {
        const json = await res.json();
        setActionMsg((json as { error?: string }).error ?? "Update failed");
        return;
      }
      // Refresh data after update
      await loadData();
      setActionMsg("Updated successfully");
      setTimeout(() => setActionMsg(""), 2000);
    } catch {
      setActionMsg("Network error");
    }
  }

  /* ---------- Session actions ---------- */

  async function handleSessionSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setActionMsg("");
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      name: form.get("name"),
      date: form.get("date"),
      time: form.get("time"),
      location: form.get("location"),
      program: form.get("program") || "",
      price: Number(form.get("price") || 0),
      forwardSpots: Number(form.get("forwardSpots") || 0),
      defenceSpots: Number(form.get("defenceSpots") || 0),
      skaterSpots: Number(form.get("skaterSpots") || 0),
      goalieSpots: Number(form.get("goalieSpots") || 0),
      birthYearMin: form.get("birthYearMin") || "",
      birthYearMax: form.get("birthYearMax") || "",
      durationMinutes: Number(form.get("durationMinutes") || 60),
      openToPublic: form.get("openToPublic") === "on",
      allowInstallments: form.get("allowInstallments") === "on",
      installmentCount: Number(form.get("installmentCount") || 3),
    };

    if (editingSession) {
      payload.id = editingSession.id;
    }

    try {
      const res = await adminFetch("/api/org/admin/sessions", {
        method: editingSession ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json();
        setActionMsg((json as { error?: string }).error ?? "Save failed");
        return;
      }
      setShowSessionForm(false);
      setEditingSession(null);
      await loadData();
      setActionMsg(editingSession ? "Session updated" : "Session created");
      setTimeout(() => setActionMsg(""), 2000);
    } catch {
      setActionMsg("Network error");
    }
  }

  async function deleteSession(id: string) {
    if (!confirm("Remove this session? (It can be re-created.)")) return;
    try {
      const res = await adminFetch("/api/org/admin/sessions", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        await loadData();
        setActionMsg("Session removed");
        setTimeout(() => setActionMsg(""), 2000);
      }
    } catch {
      setActionMsg("Network error");
    }
  }

  /* ---------- Render: loading / login ---------- */

  if (checking) return null;

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-extrabold text-[#f2f2f4] mb-2">Admin Login</h1>
          <p className="text-[#a8aab0] mb-8">Sign in to manage your organization.</p>

          <form onSubmit={handleLogin} className="grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-medium text-[#f2f2f4]">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className={INPUT_CLS + " h-11"}
              />
            </label>

            {loginError && <p className="text-red-400 text-sm">{loginError}</p>}

            <button type="submit" disabled={loginLoading} className={BTN_GOLD + " h-11"}>
              {loginLoading ? "Signing in\u2026" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ---------- Computed data ---------- */

  const sessionMap = new Map(sessions.map((s) => [s.id, s]));
  const grouped = groupBy(registrations, (r) => r.sessionId || "unassigned");

  const totalDue = registrations.reduce((sum, r) => sum + r.amountDue, 0);
  const totalPaid = registrations.reduce((sum, r) => sum + r.amountPaid, 0);
  const totalOutstanding = totalDue - totalPaid;
  const unpaidRegs = registrations.filter((r) => r.paidStatus !== "Yes" && r.amountDue > 0);

  /* ---------- Render: dashboard ---------- */

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="w-[min(1120px,calc(100%-2rem))] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold text-[#f2f2f4]">Admin Panel</h1>
          <button onClick={handleLogout} className="text-sm text-[#a8aab0] hover:text-[#f2f2f4] transition-colors">
            Sign out
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-[#2e2e36] pb-px">
          {(["registrations", "sessions", "payments"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                tab === t
                  ? "bg-[#16161a] text-[#d4af37] border border-[#2e2e36] border-b-transparent -mb-px"
                  : "text-[#a8aab0] hover:text-[#f2f2f4]"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Action message */}
        {actionMsg && (
          <div className="mb-4 text-sm text-[#d4af37] bg-[#16161a] border border-[#2e2e36] rounded-lg px-4 py-2">
            {actionMsg}
          </div>
        )}

        {dataLoading && <p className="text-[#a8aab0] text-sm mb-4">Loading\u2026</p>}

        {/* Registrations Tab */}
        {tab === "registrations" && (
          <div className="grid gap-6">
            {registrations.length === 0 && !dataLoading && (
              <p className="text-[#a8aab0] text-sm">No registrations yet.</p>
            )}
            {grouped.map(([sessionId, regs]) => {
              const session = sessionMap.get(sessionId);
              const label = session
                ? `${session.name} — ${session.date}`
                : sessionId === "unassigned"
                  ? "No Session Assigned"
                  : sessionId;
              return (
                <div key={sessionId} className="border border-[#2e2e36] rounded-xl bg-[#16161a] overflow-hidden">
                  <div className="px-5 py-3 border-b border-[#2e2e36] bg-[#111113]">
                    <h3 className="text-sm font-bold text-[#d4af37]">{label}</h3>
                    <span className="text-xs text-[#a8aab0]">{regs.length} registration{regs.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="divide-y divide-[#2e2e36]">
                    {regs.map((r) => (
                      <div key={r.id} className="px-5 py-3 grid gap-2">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-[#f2f2f4]">{r.fullName}</p>
                            <p className="text-xs text-[#a8aab0]">
                              {r.email}
                              {r.phone ? ` \u00B7 ${r.phone}` : ""}
                              {r.participantRole ? ` \u00B7 ${r.participantRole}` : ""}
                            </p>
                            {r.guardianName && (
                              <p className="text-xs text-[#555560]">Guardian: {r.guardianName}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                r.approvalStatus === "approved"
                                  ? "bg-[#1db954]/20 text-[#1db954]"
                                  : r.approvalStatus === "rejected"
                                    ? "bg-[#e51b24]/20 text-[#e51b24]"
                                    : "bg-[#d4af37]/20 text-[#d4af37]"
                              }`}
                            >
                              {r.approvalStatus}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                r.paidStatus === "Yes"
                                  ? "bg-[#1db954]/20 text-[#1db954]"
                                  : "bg-[#555560]/20 text-[#a8aab0]"
                              }`}
                            >
                              {r.paidStatus === "Yes" ? "Paid" : "Unpaid"}
                            </span>
                          </div>
                        </div>
                        {(r.amountDue > 0 || r.amountPaid > 0) && (
                          <p className="text-xs text-[#a8aab0]">
                            Due: {formatCents(r.amountDue)} \u00B7 Paid: {formatCents(r.amountPaid)}
                          </p>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          {r.approvalStatus !== "approved" && (
                            <button
                              onClick={() => updateRegistration(r.id, { approvalStatus: "approved" })}
                              className={BTN_OUTLINE + " hover:border-[#1db954]/60 hover:text-[#1db954]"}
                            >
                              Approve
                            </button>
                          )}
                          {r.approvalStatus !== "rejected" && (
                            <button
                              onClick={() => updateRegistration(r.id, { approvalStatus: "rejected" })}
                              className={BTN_OUTLINE + " hover:border-[#e51b24]/60 hover:text-[#e51b24]"}
                            >
                              Reject
                            </button>
                          )}
                          {r.paidStatus !== "Yes" && (
                            <button
                              onClick={() => updateRegistration(r.id, { paidStatus: "Yes" })}
                              className={BTN_OUTLINE + " hover:border-[#1db954]/60 hover:text-[#1db954]"}
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sessions Tab */}
        {tab === "sessions" && (
          <div className="grid gap-4">
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setEditingSession(null);
                  setShowSessionForm(true);
                }}
                className={BTN_GOLD}
              >
                + New Session
              </button>
            </div>

            {showSessionForm && (
              <SessionForm
                session={editingSession}
                onSubmit={handleSessionSubmit}
                onCancel={() => {
                  setShowSessionForm(false);
                  setEditingSession(null);
                }}
              />
            )}

            {sessions.length === 0 && !dataLoading && !showSessionForm && (
              <p className="text-[#a8aab0] text-sm">No sessions yet. Create one to get started.</p>
            )}

            {sessions.map((s) => {
              const regCount = registrations.filter((r) => r.sessionId === s.id).length;
              return (
                <div key={s.id} className="border border-[#2e2e36] rounded-xl bg-[#16161a] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-[#f2f2f4]">{s.name}</h3>
                      <p className="text-xs text-[#a8aab0] mt-1">
                        {s.date} at {s.time} \u00B7 {s.location}
                        {s.program ? ` \u00B7 ${s.program}` : ""}
                      </p>
                      <p className="text-xs text-[#555560] mt-1">
                        {formatCents(s.price)} \u00B7 {s.durationMinutes}min \u00B7 {regCount} registered
                        {s.openToPublic ? " \u00B7 Public" : ""}
                        {s.allowInstallments ? ` \u00B7 ${s.installmentCount} installments` : ""}
                      </p>
                      {(s.forwardSpots > 0 || s.defenceSpots > 0 || s.skaterSpots > 0 || s.goalieSpots > 0) && (
                        <p className="text-xs text-[#555560] mt-0.5">
                          Spots: {s.forwardSpots}F {s.defenceSpots}D {s.skaterSpots}S {s.goalieSpots}G
                        </p>
                      )}
                      {(s.birthYearMin > 0 || s.birthYearMax > 0) && (
                        <p className="text-xs text-[#555560] mt-0.5">
                          Birth year: {s.birthYearMin || "any"}\u2013{s.birthYearMax || "any"}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditingSession(s);
                          setShowSessionForm(true);
                        }}
                        className={BTN_OUTLINE}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteSession(s.id)}
                        className={BTN_OUTLINE + " hover:border-[#e51b24]/60 hover:text-[#e51b24]"}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Payments Tab */}
        {tab === "payments" && (
          <div className="grid gap-6">
            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="border border-[#2e2e36] rounded-xl bg-[#16161a] p-5 text-center">
                <p className="text-xs text-[#a8aab0] mb-1">Total Due</p>
                <p className="text-2xl font-extrabold text-[#f2f2f4]">{formatCents(totalDue)}</p>
              </div>
              <div className="border border-[#2e2e36] rounded-xl bg-[#16161a] p-5 text-center">
                <p className="text-xs text-[#a8aab0] mb-1">Collected</p>
                <p className="text-2xl font-extrabold text-[#1db954]">{formatCents(totalPaid)}</p>
              </div>
              <div className="border border-[#2e2e36] rounded-xl bg-[#16161a] p-5 text-center">
                <p className="text-xs text-[#a8aab0] mb-1">Outstanding</p>
                <p className="text-2xl font-extrabold text-[#d4af37]">{formatCents(totalOutstanding)}</p>
              </div>
            </div>

            {/* Unpaid list */}
            <div>
              <h3 className="text-sm font-bold text-[#f2f2f4] mb-3">
                Unpaid Registrations ({unpaidRegs.length})
              </h3>
              {unpaidRegs.length === 0 && (
                <p className="text-[#a8aab0] text-sm">All registrations are paid up.</p>
              )}
              <div className="grid gap-2">
                {unpaidRegs.map((r) => {
                  const session = sessionMap.get(r.sessionId);
                  return (
                    <div
                      key={r.id}
                      className="border border-[#2e2e36] rounded-lg bg-[#16161a] px-4 py-3 flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="text-sm text-[#f2f2f4]">{r.fullName}</p>
                        <p className="text-xs text-[#a8aab0]">
                          {session ? session.name : r.sessionId || "No session"}
                          {" \u00B7 "}Due: {formatCents(r.amountDue)} \u00B7 Paid: {formatCents(r.amountPaid)}
                        </p>
                      </div>
                      <button
                        onClick={() => updateRegistration(r.id, { paidStatus: "Yes" })}
                        className={BTN_OUTLINE + " hover:border-[#1db954]/60 hover:text-[#1db954]"}
                      >
                        Mark Paid
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Session Form (create / edit)                                      */
/* ------------------------------------------------------------------ */

function SessionForm({
  session,
  onSubmit,
  onCancel,
}: {
  session: SessionData | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="border border-[#2e2e36] rounded-xl bg-[#16161a] p-5 grid gap-4"
    >
      <h3 className="text-sm font-bold text-[#d4af37]">
        {session ? "Edit Session" : "New Session"}
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-xs text-[#a8aab0]">Name *</span>
          <input name="name" required defaultValue={session?.name ?? ""} className={INPUT_CLS} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-[#a8aab0]">Program</span>
          <input name="program" defaultValue={session?.program ?? ""} className={INPUT_CLS} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-[#a8aab0]">Date *</span>
          <input name="date" type="date" required defaultValue={session?.date ?? ""} className={INPUT_CLS} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-[#a8aab0]">Time *</span>
          <input name="time" type="time" required defaultValue={session?.time ?? ""} className={INPUT_CLS} />
        </label>
        <label className="grid gap-1 sm:col-span-2">
          <span className="text-xs text-[#a8aab0]">Location *</span>
          <input name="location" required defaultValue={session?.location ?? ""} className={INPUT_CLS} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-[#a8aab0]">Price ($)</span>
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={session ? (session.price / 100).toFixed(2) : "0"}
            className={INPUT_CLS}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-[#a8aab0]">Duration (min)</span>
          <input
            name="durationMinutes"
            type="number"
            min="15"
            defaultValue={session?.durationMinutes ?? 60}
            className={INPUT_CLS}
          />
        </label>
      </div>

      {/* Spots */}
      <div>
        <p className="text-xs text-[#a8aab0] mb-2">Spots by Position</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className="grid gap-1">
            <span className="text-xs text-[#555560]">Forward</span>
            <input name="forwardSpots" type="number" min="0" defaultValue={session?.forwardSpots ?? 0} className={INPUT_CLS} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-[#555560]">Defence</span>
            <input name="defenceSpots" type="number" min="0" defaultValue={session?.defenceSpots ?? 0} className={INPUT_CLS} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-[#555560]">Skater</span>
            <input name="skaterSpots" type="number" min="0" defaultValue={session?.skaterSpots ?? 0} className={INPUT_CLS} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-[#555560]">Goalie</span>
            <input name="goalieSpots" type="number" min="0" defaultValue={session?.goalieSpots ?? 0} className={INPUT_CLS} />
          </label>
        </div>
      </div>

      {/* Birth year range */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-xs text-[#a8aab0]">Min Birth Year</span>
          <input name="birthYearMin" type="number" defaultValue={session?.birthYearMin || ""} className={INPUT_CLS} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-[#a8aab0]">Max Birth Year</span>
          <input name="birthYearMax" type="number" defaultValue={session?.birthYearMax || ""} className={INPUT_CLS} />
        </label>
      </div>

      {/* Toggles */}
      <div className="flex gap-6 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-[#a8aab0]">
          <input
            name="openToPublic"
            type="checkbox"
            defaultChecked={session?.openToPublic ?? false}
            className="accent-[#d4af37]"
          />
          Open to public
        </label>
        <label className="flex items-center gap-2 text-sm text-[#a8aab0]">
          <input
            name="allowInstallments"
            type="checkbox"
            defaultChecked={session?.allowInstallments ?? false}
            className="accent-[#d4af37]"
          />
          Allow installments
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-[#555560]">Installment count</span>
          <input
            name="installmentCount"
            type="number"
            min="2"
            max="12"
            defaultValue={session?.installmentCount ?? 3}
            className={INPUT_CLS + " w-20"}
          />
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button type="submit" className={BTN_GOLD}>
          {session ? "Save Changes" : "Create Session"}
        </button>
        <button type="button" onClick={onCancel} className={BTN_OUTLINE + " h-10"}>
          Cancel
        </button>
      </div>
    </form>
  );
}
