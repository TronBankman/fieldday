/**
 * Client-side funnel tracking. Generates a per-visitor session_id stored
 * in localStorage and fires events via sendBeacon (or fetch fallback) so
 * a slow/failed track call never blocks UI.
 *
 * Server-side imports are forbidden — this module reads window/navigator.
 */

const SESSION_KEY = "fd_funnel_session";
const TRACK_URL = "/api/track";

export type FunnelEvent =
  | "page_view_home"
  | "page_view_demo"
  | "form_start"
  | "form_submit_success"
  | "form_submit_error";

function makeSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = makeSessionId();
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return makeSessionId();
  }
}

export function track(event: FunnelEvent, metadata?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({
    session_id: getSessionId(),
    event_type: event,
    path: window.location.pathname + window.location.search,
    referrer: document.referrer,
    metadata: metadata ?? {},
  });

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      const ok = navigator.sendBeacon(TRACK_URL, blob);
      if (ok) return;
    }
    void fetch(TRACK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Tracking must never throw into product code.
  }
}
