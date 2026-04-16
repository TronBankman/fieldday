const TOKEN_KEY = "fieldday_player_token";

export function getPlayerToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setPlayerToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearPlayerToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Fetch wrapper for player API routes.
 * Attaches the player JWT and handles 401 (session expired).
 */
export async function playerFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getPlayerToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    clearPlayerToken();
    window.location.reload();
    throw new Error("Session expired");
  }

  return response;
}
