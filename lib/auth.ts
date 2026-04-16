import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const TOKEN_EXPIRY = "12h";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable must be set");
  }
  return secret;
}

/**
 * Create an admin JWT scoped to an organization.
 */
export function createAdminToken(orgId: string): string {
  return jwt.sign({ sub: orgId, role: "admin" }, getJwtSecret(), {
    expiresIn: TOKEN_EXPIRY,
  });
}

/**
 * Verify an admin JWT and extract claims.
 * Returns null if the token is invalid or expired.
 */
export function verifyAdminToken(
  token: string
): { sub: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as {
      sub: string;
      role: string;
    };
    if (decoded.role !== "admin") return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Create a player JWT scoped to an org.
 * `sub` = playerId, `org` = orgId, `email` = player email.
 */
export function createPlayerToken(
  orgId: string,
  playerId: string,
  email: string
): string {
  return jwt.sign(
    { sub: playerId, org: orgId, email, role: "player" },
    getJwtSecret(),
    { expiresIn: TOKEN_EXPIRY }
  );
}

/**
 * Verify a player JWT and extract claims.
 * Returns null if the token is invalid or expired.
 */
export function verifyPlayerToken(
  token: string
): { sub: string; org: string; email: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as {
      sub: string;
      org: string;
      email: string;
      role: string;
    };
    if (decoded.role !== "player") return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function verifyPassword(
  plaintext: string,
  stored: string
): Promise<boolean> {
  if (stored.startsWith("$2a$") || stored.startsWith("$2b$")) {
    return bcrypt.compare(plaintext, stored);
  }
  return plaintext === stored;
}

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, 10);
}
