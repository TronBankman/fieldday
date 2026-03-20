import { headers } from "next/headers";
import Link from "next/link";

/**
 * Public landing page for an individual org.
 * Branding is pulled from headers set by the org middleware.
 */
export default async function OrgLandingPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org } = await params;
  const headerStore = await headers();

  const orgName = headerStore.get("x-fieldday-org-name") ?? org;
  const orgSport = headerStore.get("x-fieldday-org-sport") ?? "";
  const primaryColor = headerStore.get("x-fieldday-org-color") ?? "#d4af37";

  return (
    <>
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 border-b border-[#2e2e36] backdrop-blur-md"
        style={{ background: "rgba(13,13,15,0.88)" }}
      >
        <div className="w-[min(1120px,calc(100%-2rem))] mx-auto flex items-center justify-between h-14">
          <span
            className="text-xl font-bold tracking-tight"
            style={{ color: primaryColor }}
          >
            {orgName}
          </span>
          <div className="flex items-center gap-3">
            <Link
              href={`/${org}/register`}
              className="inline-flex items-center justify-center h-9 rounded-lg px-4 text-sm font-semibold text-[#0a0a0c] transition-colors"
              style={{ background: primaryColor }}
            >
              Register
            </Link>
            <Link
              href={`/${org}/portal`}
              className="inline-flex items-center justify-center h-9 rounded-lg px-4 text-sm font-semibold border border-[#2e2e36] text-[#f2f2f4] hover:border-[#d4af37]/40 transition-colors"
            >
              Player Portal
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="w-[min(1120px,calc(100%-2rem))] mx-auto pt-20 pb-16 max-md:pt-12 max-md:pb-10">
        <div className="max-w-[720px]">
          {orgSport && (
            <p
              className="uppercase tracking-[0.14em] text-sm font-semibold m-0 mb-3"
              style={{ color: primaryColor }}
            >
              {orgSport}
            </p>
          )}
          <h1 className="text-[clamp(2.4rem,6vw,4rem)] font-extrabold leading-[1.05] tracking-tight m-0 mb-4 text-[#f2f2f4]">
            Welcome to {orgName}
          </h1>
          <p className="text-[#a8aab0] text-xl max-w-[60ch] m-0 mb-8 leading-relaxed">
            Registration, payments, scheduling, and your player portal — all in
            one place.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link
              href={`/${org}/register`}
              className="inline-flex items-center justify-center h-12 rounded-xl px-7 font-bold text-[#0a0a0c] no-underline transition-colors text-base"
              style={{ background: primaryColor }}
            >
              Register Now
            </Link>
            <Link
              href={`/${org}/portal`}
              className="inline-flex items-center justify-center h-12 rounded-xl px-7 font-bold text-[#f2f2f4] no-underline bg-[#1a1a1e] border border-[#2e2e36] hover:border-[#d4af37]/40 transition-colors text-base"
            >
              Player Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Quick links */}
      <main className="w-[min(1120px,calc(100%-2rem))] mx-auto grid gap-4 pb-16 md:grid-cols-3">
        <QuickCard
          href={`/${org}/register`}
          title="Register"
          description="Sign up for a session or program."
          color={primaryColor}
        />
        <QuickCard
          href={`/${org}/portal`}
          title="Player Portal"
          description="View your schedule, payments, and team."
          color={primaryColor}
        />
        <QuickCard
          href={`/${org}/admin`}
          title="Admin"
          description="Manage registrations, sessions, and finances."
          color={primaryColor}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2e2e36] mt-4">
        <div className="w-[min(1120px,calc(100%-2rem))] mx-auto py-6 flex items-center justify-between flex-wrap gap-4">
          <p className="text-sm text-[#a8aab0] m-0">
            {orgName} · Powered by{" "}
            <Link href="/" className="hover:text-[#d4af37] transition-colors">
              Fieldday
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
}

function QuickCard({
  href,
  title,
  description,
  color,
}: {
  href: string;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="border border-[#2e2e36] rounded-xl p-5 bg-[#16161a] hover:-translate-y-1 hover:border-[#d4af37]/40 transition-all duration-200 no-underline block"
    >
      <h2 className="text-base font-bold m-0 mb-1" style={{ color }}>
        {title}
      </h2>
      <p className="text-sm text-[#a8aab0] m-0">{description}</p>
    </Link>
  );
}
