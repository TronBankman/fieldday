import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[#2e2e36] bg-[rgba(13,13,15,0.88)] backdrop-blur-md">
        <div className="w-[min(1120px,calc(100%-2rem))] mx-auto flex items-center justify-between h-14">
          <span className="text-xl font-bold tracking-tight text-[#f2f2f4]">
            <span className="text-[#d4af37]">Field</span>day
          </span>
          <div className="flex items-center gap-3">
            <a
              href="#pricing"
              className="text-sm text-[#a8aab0] hover:text-[#f2f2f4] transition-colors hidden sm:inline"
            >
              Pricing
            </a>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center h-9 rounded-lg px-4 text-sm font-semibold bg-[#d4af37] text-[#0a0a0c] hover:bg-[#e8c84a] transition-colors"
            >
              Book a Demo
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="w-[min(1120px,calc(100%-2rem))] mx-auto pt-20 pb-16 max-md:pt-12 max-md:pb-10">
        <div className="animate-rise max-w-[720px]">
          <p className="text-[#d4af37] uppercase tracking-[0.14em] text-sm font-semibold m-0 mb-3">
            Sports Organization Software
          </p>
          <h1 className="text-[clamp(2.4rem,6vw,4rem)] font-extrabold leading-[1.05] tracking-tight m-0 mb-4">
            Run your sports org without the spreadsheets.
          </h1>
          <p className="text-[#a8aab0] text-xl max-w-[60ch] m-0 mb-8 leading-relaxed">
            Registration, payments, attendance, scheduling — all in one place.
            Flat $149/month, no transaction fees.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center h-12 rounded-xl px-7 font-bold text-[#0a0a0c] no-underline bg-[#d4af37] hover:bg-[#e8c84a] transition-colors shadow-[0_8px_24px_rgba(212,175,55,0.25)] text-base"
            >
              Book a Demo
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center h-12 rounded-xl px-7 font-bold text-[#f2f2f4] no-underline bg-[#1a1a1e] border border-[#2e2e36] hover:border-[#d4af37]/40 transition-colors text-base"
            >
              See Features
            </a>
          </div>
        </div>

        {/* Stats bar */}
        <div
          className="animate-rise mt-14 grid grid-cols-3 gap-4 max-w-[640px] max-md:grid-cols-3 max-md:gap-3"
          style={{ animationDelay: "120ms" }}
        >
          {[
            { stat: "50+", label: "Sessions managed" },
            { stat: "100+", label: "Registrations" },
            { stat: "$0", label: "Per-transaction fees" },
          ].map((item) => (
            <div
              key={item.label}
              className="border border-[#2e2e36] rounded-xl p-4 bg-[#16161a] text-center max-md:p-3"
            >
              <p className="text-2xl font-extrabold text-[#d4af37] m-0 leading-none max-md:text-xl">
                {item.stat}
              </p>
              <p className="text-xs text-[#a8aab0] m-0 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </header>

      <main className="w-[min(1120px,calc(100%-2rem))] mx-auto grid gap-4 pb-16">
        {/* Social proof */}
        <section
          className="animate-rise border border-[#d4af37]/25 rounded-2xl bg-gradient-to-br from-[rgba(40,32,8,0.9)] to-[rgba(18,18,20,0.9)] p-6 max-md:p-4"
          style={{ animationDelay: "60ms" }}
        >
          <div className="flex items-start gap-5 max-md:flex-col">
            {/* Logo shape */}
            <div className="shrink-0 w-16 h-16 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/30 grid place-items-center max-md:w-12 max-md:h-12">
              <svg
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-8 h-8 max-md:w-6 max-md:h-6"
              >
                <path
                  d="M16 4L28 10V22L16 28L4 22V10L16 4Z"
                  fill="#d4af37"
                  opacity="0.2"
                  stroke="#d4af37"
                  strokeWidth="1.5"
                />
                <path
                  d="M10 16L14 20L22 12"
                  stroke="#d4af37"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-[#d4af37] text-sm uppercase tracking-[0.12em] font-semibold m-0 mb-1">
                Case Study — BC Falcons Hockey
              </p>
              <p className="text-[#f2f2f4] text-lg font-semibold m-0 mb-2">
                &ldquo;Built for BC Falcons Hockey — 50+ sessions, 100+
                registrations managed&rdquo;
              </p>
              <p className="text-[#a8aab0] text-sm m-0 leading-relaxed max-w-[70ch]">
                BC Falcons runs their entire spring hockey program on Fieldday.
                Parents register online, pay via Stripe, and manage their
                accounts — while coaches track attendance and send bulk
                communications. Zero spreadsheets. Zero per-transaction fees.
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          className="animate-rise border border-[#2e2e36] rounded-2xl bg-gradient-to-br from-[rgba(26,26,30,0.95)] to-[rgba(18,18,20,0.95)] p-6 max-md:p-4"
          id="features"
          style={{ animationDelay: "80ms" }}
        >
          <p className="text-[#d4af37] uppercase tracking-[0.12em] text-sm font-semibold m-0">
            Features
          </p>
          <h2 className="text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold leading-tight tracking-tight mt-1 mb-2">
            Everything your org needs, nothing it doesn&apos;t.
          </h2>
          <p className="text-[#a8aab0] max-w-[65ch] mb-6 m-0">
            One platform purpose-built for sports organizations. No bolt-ons,
            no per-seat pricing, no surprise fees.
          </p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                  <path
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    stroke="#d4af37"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 12l2 2 4-4"
                    stroke="#d4af37"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
              title="Online Registration"
              description="Custom registration forms for each program. Parents fill out player details, sign waivers, and submit in minutes."
            />
            <FeatureCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                  <rect
                    x="2"
                    y="5"
                    width="20"
                    height="14"
                    rx="2"
                    stroke="#d4af37"
                    strokeWidth="1.75"
                  />
                  <path
                    d="M2 10h20"
                    stroke="#d4af37"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              }
              title="Payment Collection"
              description="Stripe-powered checkout with full payment or installment deposit plans. No transaction fees — your revenue stays yours."
            />
            <FeatureCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="18"
                    rx="2"
                    stroke="#d4af37"
                    strokeWidth="1.75"
                  />
                  <path
                    d="M16 2v4M8 2v4M3 10h18"
                    stroke="#d4af37"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              }
              title="Session Scheduling"
              description="Create and manage practice sessions, games, and tournaments. Players see their schedule in a clean portal."
            />
            <FeatureCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                  <path
                    d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
                    stroke="#d4af37"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="9"
                    cy="7"
                    r="4"
                    stroke="#d4af37"
                    strokeWidth="1.75"
                  />
                  <path
                    d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                    stroke="#d4af37"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              }
              title="Attendance Tracking"
              description="Mark attendance per session with one click. Exportable reports so coaches and admins stay on the same page."
            />
            <FeatureCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                  <path
                    d="M20 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"
                    stroke="#d4af37"
                    strokeWidth="1.75"
                  />
                  <path
                    d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"
                    stroke="#d4af37"
                    strokeWidth="1.75"
                  />
                </svg>
              }
              title="Coach Management"
              description="Assign coaches to teams and sessions. Track hours, expenses, and compensation — all in the admin panel."
            />
            <FeatureCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                  <path
                    d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                    stroke="#d4af37"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
              title="Parent Communication"
              description="Send bulk emails to any session's registrants. Payment reminders, schedule updates, and announcements — built in."
            />
            <FeatureCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                  <path
                    d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                    stroke="#d4af37"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
              title="Player Portal"
              description="Parents log in to view registration status, payment schedule, team roster, availability, and announcements."
            />
            <FeatureCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                  <path
                    d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
                    stroke="#d4af37"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
              title="Admin Dashboard"
              description="Full financial overview, credit management, manual payment marking, and bulk actions — everything in one place."
            />
            <FeatureCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                  <path
                    d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                    stroke="#d4af37"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                  <path
                    d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
                    stroke="#d4af37"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              }
              title="CSV Exports"
              description="Export registrations, payments, and attendance data anytime. Your data, your format, no lock-in."
            />
          </div>
        </section>

        {/* Pricing */}
        <section
          className="animate-rise border border-[#2e2e36] rounded-2xl bg-gradient-to-br from-[rgba(26,26,30,0.95)] to-[rgba(18,18,20,0.95)] p-6 max-md:p-4"
          id="pricing"
          style={{ animationDelay: "100ms" }}
        >
          <p className="text-[#d4af37] uppercase tracking-[0.12em] text-sm font-semibold m-0">
            Pricing
          </p>
          <h2 className="text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold leading-tight tracking-tight mt-1 mb-2">
            One plan. No surprises.
          </h2>
          <p className="text-[#a8aab0] max-w-[55ch] mb-8">
            Most platforms charge per-transaction. On a typical org with 100
            players at $300 each, TeamSnap&apos;s 3.25% + $1.50 adds up to
            over $4,500 a year. Fieldday is $149/month flat — period.
          </p>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr] max-w-[800px]">
            {/* Fieldday plan */}
            <div className="border-2 border-[#d4af37]/60 rounded-2xl p-6 bg-gradient-to-br from-[rgba(40,32,8,0.7)] to-[rgba(18,18,20,0.7)] relative">
              <div className="absolute -top-3 left-5">
                <span className="bg-[#d4af37] text-[#0a0a0c] text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Recommended
                </span>
              </div>
              <p className="text-[#d4af37] font-bold text-lg m-0 mb-1">
                Fieldday
              </p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-extrabold text-[#f2f2f4]">
                  $149
                </span>
                <span className="text-[#a8aab0] mb-1">/month</span>
              </div>
              <p className="text-[#a8aab0] text-sm m-0 mb-5">
                Flat rate. All features. No per-transaction fees.
              </p>
              <ul className="grid gap-2 m-0 p-0 list-none mb-6">
                {[
                  "Unlimited registrations",
                  "Stripe payments — 0% platform fee",
                  "Unlimited sessions & scheduling",
                  "Attendance tracking",
                  "Coach management",
                  "Parent communication tools",
                  "CSV exports",
                  "Full admin dashboard",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-[#f2f2f4]"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      className="w-4 h-4 shrink-0"
                    >
                      <circle cx="8" cy="8" r="7" fill="#d4af37" opacity="0.2" />
                      <path
                        d="M5 8l2 2 4-4"
                        stroke="#d4af37"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center w-full h-11 rounded-xl font-bold text-[#0a0a0c] no-underline bg-[#d4af37] hover:bg-[#e8c84a] transition-colors"
              >
                Book a Demo
              </Link>
            </div>

            {/* TeamSnap comparison */}
            <div className="border border-[#2e2e36] rounded-2xl p-6 bg-[#13131600]">
              <p className="text-[#a8aab0] font-bold text-lg m-0 mb-1">
                TeamSnap (typical)
              </p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-extrabold text-[#a8aab0]">
                  $375+
                </span>
                <span className="text-[#a8aab0] mb-1">/month</span>
              </div>
              <p className="text-[#a8aab0] text-sm m-0 mb-5">
                Based on 100 players × $300, 3.25% + $1.50/transaction
              </p>
              <ul className="grid gap-2 m-0 p-0 list-none">
                {[
                  "3.25% + $1.50 per transaction",
                  "$4,500+/year in transaction fees",
                  "Per-seat pricing on higher tiers",
                  "Complex feature gating",
                  "Designed for large franchises",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-[#a8aab0]"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      className="w-4 h-4 shrink-0"
                    >
                      <circle cx="8" cy="8" r="7" fill="#e51b24" opacity="0.15" />
                      <path
                        d="M10 6L6 10M6 6l4 4"
                        stroke="#e51b24"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-[#a8aab0] text-sm mt-5 m-0">
            * Stripe&apos;s standard processing fee (2.9% + 30¢) still applies.
            That&apos;s their fee, not ours — and it&apos;s the same rate you&apos;d get
            anywhere.
          </p>
        </section>

        {/* Supported sports */}
        <section
          className="animate-rise border border-[#2e2e36] rounded-2xl bg-gradient-to-br from-[rgba(26,26,30,0.95)] to-[rgba(18,18,20,0.95)] p-6 max-md:p-4"
          style={{ animationDelay: "120ms" }}
        >
          <p className="text-[#d4af37] uppercase tracking-[0.12em] text-sm font-semibold m-0">
            Built for any sport
          </p>
          <h2 className="text-[clamp(1.6rem,3.5vw,2.2rem)] font-extrabold leading-tight tracking-tight mt-1 mb-4">
            If you run a sports organization, Fieldday works for you.
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[
              "Hockey",
              "Soccer",
              "Lacrosse",
              "Basketball",
              "Baseball",
              "Volleyball",
              "Softball",
              "Football",
            ].map((sport) => (
              <div
                key={sport}
                className="border border-[#2e2e36] rounded-xl p-3 bg-[#16161a] text-center text-sm font-semibold text-[#f2f2f4]"
              >
                {sport}
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section
          className="animate-rise border border-[#d4af37]/25 rounded-2xl bg-gradient-to-br from-[rgba(40,32,8,0.85)] to-[rgba(18,18,20,0.85)] p-8 max-md:p-5 text-center"
          style={{ animationDelay: "140ms" }}
        >
          <p className="text-[#d4af37] uppercase tracking-[0.12em] text-sm font-semibold m-0">
            Get Started
          </p>
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-extrabold leading-tight tracking-tight mt-1 mb-3">
            Ready to ditch the spreadsheets?
          </h2>
          <p className="text-[#a8aab0] max-w-[50ch] mx-auto mb-6">
            Book a 30-minute demo. We&apos;ll show you the platform, answer your
            questions, and get you set up — usually same week.
          </p>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center h-13 rounded-xl px-10 font-bold text-[#0a0a0c] no-underline bg-[#d4af37] hover:bg-[#e8c84a] transition-colors shadow-[0_8px_32px_rgba(212,175,55,0.3)] text-lg"
          >
            Book a Demo →
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2e2e36] mt-4">
        <div className="w-[min(1120px,calc(100%-2rem))] mx-auto py-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-lg font-bold m-0">
              <span className="text-[#d4af37]">Field</span>day
            </p>
            <p className="text-[#a8aab0] text-sm m-0 mt-1">
              Sports org management without the spreadsheets.
            </p>
          </div>
          <div className="text-sm text-[#a8aab0]">
            <a
              href="mailto:hello@fieldday.app"
              className="text-[#a8aab0] hover:text-[#d4af37] transition-colors"
            >
              hello@fieldday.app
            </a>
            <span className="mx-2">·</span>
            <Link
              href="/demo"
              className="text-[#a8aab0] hover:text-[#d4af37] transition-colors"
            >
              Book a Demo
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="border border-[#2e2e36] rounded-xl p-4 bg-[#16161a] transition-all duration-200 hover:-translate-y-1 hover:border-[#d4af37]/40 hover:shadow-[0_16px_28px_rgba(0,0,0,0.3)]">
      <div className="w-9 h-9 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 grid place-items-center mb-3">
        {icon}
      </div>
      <h3 className="mt-0 mb-1 text-base font-bold text-[#f2f2f4]">{title}</h3>
      <p className="text-[#a8aab0] text-sm m-0 leading-relaxed">{description}</p>
    </article>
  );
}
