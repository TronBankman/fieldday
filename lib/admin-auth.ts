import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "./auth";

/**
 * Extract and verify the admin token from a request.
 * Returns the org ID from the JWT claims, or null if unauthorized.
 */
export function getAdminOrgId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const claims = verifyAdminToken(token);
  if (!claims) return null;
  return claims.sub; // sub = orgId
}

/**
 * Standard 401 response for unauthorized admin requests.
 */
export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
