import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ org: string }>;
}): Promise<Metadata> {
  const { org } = await params;
  const headerStore = await headers();
  const orgName = headerStore.get("x-fieldday-org-name") ?? org;

  return {
    title: `${orgName} — Powered by Fieldday`,
    robots: { index: false, follow: false },
  };
}

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ org: string }>;
}) {
  await params; // ensure params are resolved

  // Middleware injects x-fieldday-org-id when the org is found.
  // If the header is missing the middleware already returned 404, but
  // we double-check here as a safety net for direct rendering in tests.
  const headerStore = await headers();
  const orgId = headerStore.get("x-fieldday-org-id");
  if (!orgId) {
    notFound();
  }

  return <>{children}</>;
}
