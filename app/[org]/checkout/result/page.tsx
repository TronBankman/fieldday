"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResultContent() {
  const params = useParams<{ org: string }>();
  const orgSlug = params.org;
  const searchParams = useSearchParams();

  const status = searchParams.get("status") || "";
  const isSuccess = status === "success";

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-sm text-center">
        {isSuccess ? (
          <>
            <div className="w-16 h-16 rounded-full bg-[#1db954]/20 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-[#1db954]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-[#f2f2f4] mb-2">
              Payment Successful
            </h1>
            <p className="text-[#a8aab0] text-sm mb-6">
              Your payment has been processed. You can view your updated payment
              status in your player portal.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-[#d4af37]/20 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-[#d4af37]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-[#f2f2f4] mb-2">
              Payment Cancelled
            </h1>
            <p className="text-[#a8aab0] text-sm mb-6">
              Your payment was not completed. You can try again from your player
              portal whenever you are ready.
            </p>
          </>
        )}

        <Link
          href={`/${orgSlug}/portal`}
          className="inline-block h-11 leading-[2.75rem] rounded-xl font-bold bg-[#d4af37] text-[#0a0a0c] hover:bg-[#e8c84a] transition-colors px-6 text-sm"
        >
          Back to Portal
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-[#a8aab0] text-sm">Loading...</p>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
