"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function StripeRefreshContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("org") ?? "";
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) {
      setError("Missing organization identifier.");
      return;
    }

    async function refresh() {
      try {
        const res = await fetch("/api/signup/stripe-refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });

        if (!res.ok) {
          const json = (await res.json()) as { error?: string };
          setError(json.error ?? "Failed to refresh Stripe link.");
          return;
        }

        const json = (await res.json()) as { url: string };
        if (json.url) {
          window.location.href = json.url;
        } else {
          setError("No Stripe URL received.");
        }
      } catch {
        setError("Network error. Please try again.");
      }
    }

    refresh();
  }, [slug]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-[#f2f2f4] mb-2">
            Unable to refresh
          </h1>
          <p className="text-[#a8aab0] text-sm mb-4">{error}</p>
          <a
            href={slug ? `/${slug}/admin` : "/signup"}
            className="text-[#d4af37] hover:underline text-sm"
          >
            Go to {slug ? "admin dashboard" : "signup"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-xl font-bold text-[#f2f2f4] mb-2">
          Redirecting to Stripe...
        </h1>
        <p className="text-[#a8aab0] text-sm">
          Your payment setup link has expired. Generating a fresh one.
        </p>
      </div>
    </div>
  );
}

export default function StripeRefreshPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-xl font-bold text-[#f2f2f4] mb-2">
              Redirecting to Stripe...
            </h1>
            <p className="text-[#a8aab0] text-sm">Loading...</p>
          </div>
        </div>
      }
    >
      <StripeRefreshContent />
    </Suspense>
  );
}
