"use client";

import { useState, useEffect } from "react";

/**
 * Player portal for an org.
 * Same auth pattern as the Falcons player portal.
 * Org context comes from the x-fieldday-org-* headers set by middleware.
 */
export default function OrgPortalPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("fieldday_player_token");
    if (token) setAuthed(true);
    setChecking(false);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoading(true);
    try {
      const res = await fetch("/api/org/player/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const json = await res.json();
        setLoginError((json as { error?: string }).error ?? "Invalid credentials");
      } else {
        const json = await res.json();
        localStorage.setItem("fieldday_player_token", (json as { token: string }).token);
        setAuthed(true);
      }
    } catch {
      setLoginError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("fieldday_player_token");
    setAuthed(false);
  }

  if (checking) return null;

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-extrabold text-[#f2f2f4] mb-2">Player Portal</h1>
          <p className="text-[#a8aab0] mb-8">Sign in to view your schedule, payments, and team.</p>

          <form onSubmit={handleLogin} className="grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-medium text-[#f2f2f4]">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 rounded-lg border border-[#2e2e36] bg-[#16161a] px-3 text-[#f2f2f4] focus:outline-none focus:border-[#d4af37]/60"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium text-[#f2f2f4]">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11 rounded-lg border border-[#2e2e36] bg-[#16161a] px-3 text-[#f2f2f4] focus:outline-none focus:border-[#d4af37]/60"
              />
            </label>

            {loginError && <p className="text-red-400 text-sm">{loginError}</p>}

            <button
              type="submit"
              disabled={loading}
              className="h-11 rounded-xl font-bold bg-[#d4af37] text-[#0a0a0c] hover:bg-[#e8c84a] disabled:opacity-60 transition-colors"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="w-[min(1120px,calc(100%-2rem))] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-extrabold text-[#f2f2f4]">Player Portal</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-[#a8aab0] hover:text-[#f2f2f4] transition-colors"
          >
            Sign out
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            { title: "My Schedule", description: "View upcoming sessions and games." },
            { title: "My Payments", description: "See payment history and upcoming installments." },
            { title: "My Team", description: "View your roster and team communications." },
            { title: "My Profile", description: "Update your contact info and preferences." },
          ].map((card) => (
            <div
              key={card.title}
              className="border border-[#2e2e36] rounded-xl p-5 bg-[#16161a]"
            >
              <h2 className="text-base font-bold text-[#d4af37] m-0 mb-1">{card.title}</h2>
              <p className="text-sm text-[#a8aab0] m-0">{card.description}</p>
              <p className="text-xs text-[#555560] m-0 mt-3">Coming in Phase 3</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
