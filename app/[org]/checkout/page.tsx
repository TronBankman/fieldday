"use client";

import { Suspense, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const BTN_GOLD =
  "h-11 rounded-xl font-bold bg-[#d4af37] text-[#0a0a0c] hover:bg-[#e8c84a] disabled:opacity-60 transition-colors px-6 text-sm w-full";

function CheckoutForm() {
  const params = useParams<{ org: string }>();
  const orgSlug = params.org;
  const searchParams = useSearchParams();

  const regId = searchParams.get("reg") || "";
  const amount = Number(searchParams.get("amount") || "0");
  const sessionName = searchParams.get("name") || "Registration";

  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  if (!regId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-[#f2f2f4] mb-2">
            Payment
          </h1>
          <p className="text-[#a8aab0] text-sm mb-4">
            No registration found. Please register first.
          </p>
          <Link
            href={`/${orgSlug}/register`}
            className="text-[#d4af37] text-sm font-bold hover:underline"
          >
            Go to Registration
          </Link>
        </div>
      </div>
    );
  }

  async function handlePay(planType: "full" | "deposit") {
    setLoading(planType);
    setError("");

    try {
      const res = await fetch("/api/org/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fieldday-org-slug": orgSlug,
        },
        body: JSON.stringify({ registrationId: regId, planType }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(
          (data as { error?: string }).error || "Unable to start checkout"
        );
        setLoading("");
        return;
      }

      if ((data as { url?: string }).url) {
        window.location.href = (data as { url: string }).url;
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading("");
    }
  }

  const depositAmount = Math.ceil(amount / 3);
  const remainingPayments = 2;
  const remainingPerPayment = Math.ceil((amount - depositAmount) / remainingPayments);

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-extrabold text-[#f2f2f4] mb-2">
          Payment Options
        </h1>
        <p className="text-[#a8aab0] text-sm mb-1">
          Registration: <span className="text-[#f2f2f4] font-medium">{sessionName}</span>
        </p>
        {amount > 0 && (
          <p className="text-[#a8aab0] text-sm mb-6">
            Total:{" "}
            <span className="text-[#d4af37] text-lg font-extrabold">
              {formatCents(amount)}
            </span>
          </p>
        )}

        <div className="grid gap-4">
          {/* Pay in Full */}
          <button
            onClick={() => handlePay("full")}
            disabled={!!loading}
            className="border border-[#2e2e36] rounded-xl bg-[#16161a] p-5 text-left hover:border-[#d4af37]/60 transition-colors disabled:opacity-60"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-bold text-[#f2f2f4]">Pay in Full</h3>
              {amount > 0 && (
                <span className="text-[#d4af37] font-bold text-sm">
                  {formatCents(amount)}
                </span>
              )}
            </div>
            <p className="text-xs text-[#a8aab0] mt-1">
              One-time payment via credit card
            </p>
            {loading === "full" && (
              <p className="text-xs text-[#d4af37] mt-2">
                Redirecting to Stripe...
              </p>
            )}
          </button>

          {/* Payment Plan — only show if amount > $60 */}
          {amount > 6000 && (
            <button
              onClick={() => handlePay("deposit")}
              disabled={!!loading}
              className="border border-[#2e2e36] rounded-xl bg-[#16161a] p-5 text-left hover:border-[#d4af37]/60 transition-colors disabled:opacity-60"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold text-[#f2f2f4]">
                  Payment Plan
                </h3>
                <span className="text-[#d4af37] font-bold text-sm">
                  {formatCents(depositAmount)} now
                </span>
              </div>
              <p className="text-xs text-[#a8aab0] mt-1">
                Deposit today + {remainingPayments} installments of{" "}
                {formatCents(remainingPerPayment)} each
              </p>
              {loading === "deposit" && (
                <p className="text-xs text-[#d4af37] mt-2">
                  Redirecting to Stripe...
                </p>
              )}
            </button>
          )}
        </div>

        {error && (
          <p className="text-red-400 text-sm mt-4">{error}</p>
        )}

        <div className="mt-6 text-center">
          <Link
            href={`/${orgSlug}/portal`}
            className="text-[#a8aab0] text-sm hover:text-[#f2f2f4] transition-colors"
          >
            Back to Portal
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-[#a8aab0] text-sm">Loading...</p>
        </div>
      }
    >
      <CheckoutForm />
    </Suspense>
  );
}
