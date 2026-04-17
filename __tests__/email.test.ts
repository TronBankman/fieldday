/**
 * Tests for lib/email.ts — Resend-based email notifications.
 *
 * Mocks global fetch to verify Resend API calls without hitting the network.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Set env before importing the module
process.env.RESEND_API_KEY = "re_test_key";
process.env.RESEND_FROM_EMAIL = "Test <noreply@test.fieldday.app>";
process.env.FIELDDAY_NOTIFY_EMAIL = "team@fieldday.app";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

import { sendRegistrationConfirmation } from "../lib/email";

const mockOrg = {
  name: "Test Sports Org",
  slug: "test-org",
  primaryColor: "#ff0000",
  contactEmail: "admin@testorg.com",
};

describe("lib/email", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), { status: 200 })
    );
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe("sendRegistrationConfirmation", () => {
    it("sends to the participant with correct subject and body", async () => {
      const result = await sendRegistrationConfirmation(
        "player@example.com",
        "Jane Doe",
        "Spring League",
        mockOrg
      );

      expect(result.success).toBe(true);
      expect(fetchSpy).toHaveBeenCalledOnce();

      const [url, opts] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://api.resend.com/emails");

      const body = JSON.parse(opts!.body as string);
      expect(body.to).toEqual(["player@example.com"]);
      expect(body.subject).toContain("Registration received");
      expect(body.subject).toContain("Test Sports Org");
      expect(body.html).toContain("Jane Doe");
      expect(body.html).toContain("Spring League");
      expect(body.from).toBe("Test <noreply@test.fieldday.app>");
    });

    it("escapes HTML characters in user-supplied content (XSS safety)", async () => {
      await sendRegistrationConfirmation(
        "player@example.com",
        '<script>alert("xss")</script>',
        "Normal Session",
        mockOrg
      );

      const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
      expect(body.html).not.toContain("<script>");
      expect(body.html).toContain("&lt;script&gt;");
    });

    it("handles fetch network errors gracefully", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("Network error"));

      const result = await sendRegistrationConfirmation(
        "player@example.com",
        "Jane",
        "Session",
        mockOrg
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to send email");
    });

    it("returns error on non-2xx response from Resend", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response("Rate limited", { status: 429 })
      );

      const result = await sendRegistrationConfirmation(
        "player@example.com",
        "Jane",
        "",
        mockOrg
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to send email");
    });
  });
});
