"use client";

import { useState, useEffect, useCallback } from "react";
import { adminFetch } from "@/lib/admin-api";
import { getTerms, type Terms } from "@/lib/terminology";

interface OnboardingData {
  onboardingState: string;
  stripeOnboardingUrl: string;
  terminology: string;
}

const BTN_GOLD =
  "h-9 rounded-lg font-bold bg-[#d4af37] text-[#0a0a0c] hover:bg-[#e8c84a] disabled:opacity-60 transition-colors px-4 text-sm";
const BTN_OUTLINE =
  "h-8 rounded-lg border border-[#2e2e36] text-xs px-3 text-[#a8aab0] hover:text-[#f2f2f4] hover:border-[#d4af37]/40 transition-colors";

export default function WelcomeBanner({ orgSlug }: { orgSlug: string }) {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [checklist, setChecklist] = useState([false, false, false]);
  const [dismissing, setDismissing] = useState(false);

  const loadOnboarding = useCallback(async () => {
    try {
      const res = await adminFetch("/api/org/admin/onboarding");
      if (res.ok) {
        const json = (await res.json()) as OnboardingData;
        setData(json);
      }
    } catch {
      // Non-critical — banner just won't show
    }
  }, []);

  useEffect(() => {
    loadOnboarding();
  }, [loadOnboarding]);

  async function dismiss() {
    setDismissing(true);
    try {
      const res = await adminFetch("/api/org/admin/onboarding", {
        method: "PATCH",
        body: JSON.stringify({ onboardingState: "active" }),
      });
      if (res.ok) {
        setDismissed(true);
      }
    } catch {
      // Fail silently — user can try again
    } finally {
      setDismissing(false);
    }
  }

  function markStep(index: number) {
    setChecklist((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
  }

  // Auto-dismiss when all checklist items are done
  useEffect(() => {
    if (checklist.every(Boolean) && data && data.onboardingState !== "active") {
      dismiss();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checklist]);

  // Don't render if dismissed, still loading, or already active
  if (dismissed || !data || data.onboardingState === "active") {
    return null;
  }

  const terms: Terms = getTerms(data.terminology || "sports");

  // Stripe pending — tell owner to finish Stripe setup
  if (data.onboardingState === "stripe_pending") {
    return (
      <div className="mb-6 border border-[#d4af37]/30 rounded-xl bg-[#d4af37]/5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-[#d4af37] mb-1">
              Finish setting up payouts
            </h3>
            <p className="text-xs text-[#a8aab0]">
              Complete your Stripe setup so you can accept payments from your{" "}
              {terms.participants.toLowerCase()}.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {data.stripeOnboardingUrl && (
              <a
                href={data.stripeOnboardingUrl}
                className={BTN_GOLD + " inline-flex items-center no-underline"}
              >
                Set up Stripe
              </a>
            )}
            <button
              onClick={dismiss}
              disabled={dismissing}
              className={BTN_OUTLINE}
              title="Dismiss"
            >
              {dismissing ? "..." : "Dismiss"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Post-Stripe or failed — show welcome checklist
  return (
    <div className="mb-6 border border-[#2e2e36] rounded-xl bg-[#16161a] p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-bold text-[#d4af37] mb-1">
            Welcome to Fieldday
          </h3>
          <p className="text-xs text-[#a8aab0]">
            Get started with these three steps.
          </p>
        </div>
        <button
          onClick={dismiss}
          disabled={dismissing}
          className={BTN_OUTLINE}
        >
          {dismissing ? "..." : "Dismiss"}
        </button>
      </div>

      <div className="grid gap-2">
        <ChecklistItem
          done={checklist[0]}
          onMark={() => markStep(0)}
          label={`Create your first ${terms.session.toLowerCase()}`}
        />
        <ChecklistItem
          done={checklist[1]}
          onMark={() => markStep(1)}
          label={`Share your registration link: fieldday.app/${orgSlug}/register`}
        />
        <ChecklistItem
          done={checklist[2]}
          onMark={() => markStep(2)}
          label="Invite someone to test it"
        />
      </div>
    </div>
  );
}

function ChecklistItem({
  done,
  onMark,
  label,
}: {
  done: boolean;
  onMark: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <button
        onClick={onMark}
        disabled={done}
        className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
          done
            ? "bg-[#1db954]/20 border-[#1db954] text-[#1db954]"
            : "border-[#2e2e36] text-transparent hover:border-[#d4af37]/40"
        }`}
        aria-label={done ? `${label} — completed` : `Mark "${label}" as done`}
      >
        {done && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6L5 8.5L9.5 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
      <span
        className={`text-sm ${
          done ? "text-[#555560] line-through" : "text-[#f2f2f4]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
