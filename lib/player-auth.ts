import { NextRequest, NextResponse } from "next/server";
import { verifyPlayerToken } from "./auth";

export interface PlayerClaims {
  playerId: string;
  orgId: string;
  email: string;
}

/**
 * Extract and verify the player token from a request.
 * Returns player claims or null if unauthorized.
 */
export function getPlayerClaims(req: NextRequest): PlayerClaims | null {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const claims = verifyPlayerToken(token);
  if (!claims) return null;
  return {
    playerId: claims.sub,
    orgId: claims.org,
    email: claims.email,
  };
}

/**
 * Standard 401 response for unauthorized player requests.
 */
export function playerUnauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
