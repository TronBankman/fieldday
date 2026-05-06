/**
 * Seed script: creates "Riverside Martial Arts" demo org
 * with 3 classes, 5 students (registrations), and 2 payment records.
 *
 * Usage: npx tsx scripts/seed-demo-org.ts
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ORG_ID = "demo-riverside";
const ORG_SLUG = "riverside-martial-arts";
const ADMIN_PASSWORD = "demo2026";

async function seed() {
  // 1. Create organization
  const adminHash = await hash(ADMIN_PASSWORD, 10);
  const { error: orgErr } = await supabase.from("organizations").upsert({
    id: ORG_ID,
    name: "Riverside Martial Arts",
    slug: ORG_SLUG,
    sport: "Martial Arts",
    primary_color: "#c41e3a",
    logo_url: "",
    stripe_account_id: "", // no Stripe Connect for demo — uses platform account
    contact_email: "demo@riverside-ma.com",
    admin_password_hash: adminHash,
  });
  if (orgErr) throw new Error(`Org insert failed: ${orgErr.message}`);
  console.log("+ Organization: Riverside Martial Arts");

  // 2. Create 3 sessions (classes)
  const sessions = [
    {
      id: `sess-${randomUUID().slice(0, 8)}`,
      org_id: ORG_ID,
      name: "Kids Karate (Ages 6-9)",
      date: "2026-06-02",
      time: "4:00 PM",
      location: "Riverside Community Center — Studio A",
      program: "Youth Karate",
      spots: 20,
      birth_year_min: 2017,
      birth_year_max: 2020,
      price: 14900, // $149 in cents
      description: "Beginner karate for ages 6-9. Builds discipline, coordination, and confidence.",
      open_to_public: true,
      duration_minutes: 60,
      allow_installments: true,
      installment_count: 3,
      active: true,
    },
    {
      id: `sess-${randomUUID().slice(0, 8)}`,
      org_id: ORG_ID,
      name: "Teen Jiu-Jitsu (Ages 13-17)",
      date: "2026-06-03",
      time: "5:30 PM",
      location: "Riverside Community Center — Mat Room",
      program: "Teen BJJ",
      spots: 15,
      birth_year_min: 2009,
      birth_year_max: 2013,
      price: 19900, // $199
      description: "Brazilian Jiu-Jitsu fundamentals for teens. No experience required.",
      open_to_public: true,
      duration_minutes: 75,
      allow_installments: false,
      installment_count: 3,
      active: true,
    },
    {
      id: `sess-${randomUUID().slice(0, 8)}`,
      org_id: ORG_ID,
      name: "Adult Kickboxing",
      date: "2026-06-04",
      time: "7:00 PM",
      location: "Riverside Community Center — Studio B",
      program: "Adult Fitness",
      spots: 25,
      birth_year_min: 1970,
      birth_year_max: 2008,
      price: 17900, // $179
      description: "High-energy kickboxing for adults. All fitness levels welcome.",
      open_to_public: true,
      duration_minutes: 60,
      allow_installments: true,
      installment_count: 2,
      active: true,
    },
  ];

  const { error: sessErr } = await supabase.from("sessions").upsert(sessions);
  if (sessErr) throw new Error(`Sessions insert failed: ${sessErr.message}`);
  console.log(`+ ${sessions.length} sessions created`);

  // 3. Create 5 registrations (students)
  const registrations = [
    {
      id: `reg-${randomUUID().slice(0, 8)}`,
      org_id: ORG_ID,
      full_name: "Ethan Rodriguez",
      email: "ethan.r@example.com",
      phone: "555-0101",
      birth_year: "2018",
      guardian_name: "Maria Rodriguez",
      signup_type: "Parent",
      participant_role: "Student",
      session_id: sessions[0].id,
      session_name: sessions[0].name,
      amount_due: sessions[0].price,
      amount_paid: sessions[0].price,
      paid_status: "Yes",
      approval_status: "approved",
    },
    {
      id: `reg-${randomUUID().slice(0, 8)}`,
      org_id: ORG_ID,
      full_name: "Sofia Chen",
      email: "sofia.chen@example.com",
      phone: "555-0102",
      birth_year: "2019",
      guardian_name: "Wei Chen",
      signup_type: "Parent",
      participant_role: "Student",
      session_id: sessions[0].id,
      session_name: sessions[0].name,
      amount_due: sessions[0].price,
      amount_paid: 0,
      paid_status: "No",
      approval_status: "approved",
    },
    {
      id: `reg-${randomUUID().slice(0, 8)}`,
      org_id: ORG_ID,
      full_name: "Liam Thompson",
      email: "liam.t@example.com",
      phone: "555-0103",
      birth_year: "2010",
      guardian_name: "David Thompson",
      signup_type: "Parent",
      participant_role: "Student",
      session_id: sessions[1].id,
      session_name: sessions[1].name,
      amount_due: sessions[1].price,
      amount_paid: sessions[1].price,
      paid_status: "Yes",
      approval_status: "approved",
    },
    {
      id: `reg-${randomUUID().slice(0, 8)}`,
      org_id: ORG_ID,
      full_name: "Ava Patel",
      email: "ava.patel@example.com",
      phone: "555-0104",
      birth_year: "2011",
      guardian_name: "Priya Patel",
      signup_type: "Parent",
      participant_role: "Student",
      session_id: sessions[1].id,
      session_name: sessions[1].name,
      amount_due: sessions[1].price,
      amount_paid: 0,
      paid_status: "No",
      approval_status: "pending",
    },
    {
      id: `reg-${randomUUID().slice(0, 8)}`,
      org_id: ORG_ID,
      full_name: "Marcus Johnson",
      email: "marcus.j@example.com",
      phone: "555-0105",
      birth_year: "1990",
      signup_type: "Self",
      participant_role: "Student",
      session_id: sessions[2].id,
      session_name: sessions[2].name,
      amount_due: sessions[2].price,
      amount_paid: sessions[2].price,
      paid_status: "Yes",
      approval_status: "approved",
    },
  ];

  const { error: regErr } = await supabase.from("registrations").upsert(registrations);
  if (regErr) throw new Error(`Registrations insert failed: ${regErr.message}`);
  console.log(`+ ${registrations.length} registrations created`);

  // 4. Create 2 payment records (for Ethan and Liam who paid)
  const payments = [
    {
      id: `pay-${randomUUID().slice(0, 8)}`,
      org_id: ORG_ID,
      registration_id: registrations[0].id, // Ethan
      amount: sessions[0].price,
      method: "stripe",
      status: "completed",
      stripe_session_id: "cs_demo_ethan_001",
      notes: "Full payment — Kids Karate",
    },
    {
      id: `pay-${randomUUID().slice(0, 8)}`,
      org_id: ORG_ID,
      registration_id: registrations[2].id, // Liam
      amount: sessions[1].price,
      method: "stripe",
      status: "completed",
      stripe_session_id: "cs_demo_liam_001",
      notes: "Full payment — Teen Jiu-Jitsu",
    },
  ];

  const { error: payErr } = await supabase.from("payments").upsert(payments);
  if (payErr) throw new Error(`Payments insert failed: ${payErr.message}`);
  console.log(`+ ${payments.length} payment records created`);

  console.log("\nDemo org seeded successfully.");
  console.log(`  Admin URL: /<slug>/admin`);
  console.log(`  Slug: ${ORG_SLUG}`);
  console.log(`  Admin password: ${ADMIN_PASSWORD}`);
  console.log(`  Registration URL: /${ORG_SLUG}/register`);
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
