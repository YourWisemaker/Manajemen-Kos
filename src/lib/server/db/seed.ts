/**
 * Database seed script — Task 1.4
 * --------------------------------
 * Inserts test data for local development. Aligns with the frontend mock
 * fixtures so the UI renders consistently when switching to the real DB.
 *
 * Run: npx tsx src/lib/server/db/seed.ts
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  billingComponent,
  contract,
  gatewayConfig,
  invoice,
  invoiceLine,
  kosTenant,
  paymentChannel,
  property,
  room,
  subscription,
  tenantSaas,
  userAccount,
} from "./schema";

// ---------------------------------------------------------------------------
// Fixed UUIDs — deterministic so re-running seed is idempotent-ish and
// aligns with frontend mock IDs where possible.
// ---------------------------------------------------------------------------

const TENANT_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const TENANT_GRIYA = "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e";
const TENANT_PONDOK = "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f";
const TENANT_MAWAR = "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80";
const TENANT_SENTOSA = "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8091";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";

const PROP_MELATI = "22222222-2222-4222-8222-222222222221";
const PROP_ANGGREK = "22222222-2222-4222-8222-222222222222";

const ROOM_IDS = {
  melatiA1: "33333333-3333-4333-8333-333333333301",
  melatiA2: "33333333-3333-4333-8333-333333333302",
  melatiA3: "33333333-3333-4333-8333-333333333303",
  melatiB1: "33333333-3333-4333-8333-333333333304",
  melatiB2: "33333333-3333-4333-8333-333333333305",
  melatiB3: "33333333-3333-4333-8333-333333333306",
};

const RESIDENT_IDS = {
  budi: "44444444-4444-4444-8444-444444444401",
  siti: "44444444-4444-4444-8444-444444444402",
  agus: "44444444-4444-4444-8444-444444444403",
  dewi: "44444444-4444-4444-8444-444444444404",
};

const CONTRACT_IDS = {
  budi: "55555555-5555-4555-8555-555555555501",
  siti: "55555555-5555-4555-8555-555555555502",
  agus: "55555555-5555-4555-8555-555555555503",
};

const INVOICE_IDS = {
  inv0142: "66666666-6666-4666-8666-666666666601",
  inv0143: "66666666-6666-4666-8666-666666666602",
  inv0144: "66666666-6666-4666-8666-666666666603",
  inv0145: "66666666-6666-4666-8666-666666666604",
  inv0146: "66666666-6666-4666-8666-666666666605",
};

const GATEWAY_ID = "77777777-7777-4777-8777-777777777701";

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. Cannot seed.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  console.log("🌱 Seeding database...");

  // -------------------------------------------------------------------------
  // 1. Tenants
  // -------------------------------------------------------------------------
  await db.insert(tenantSaas).values([
    {
      id: TENANT_ID,
      name: "Kos Bunga Melati",
      slug: "kosbunga",
      subdomain: "kosbunga",
      plan: "pro",
      status: "aktif",
      ownerEmail: "owner@kosbunga.id",
      ownerPhone: "+6281234567800",
      settings: {
        brandColor: "#2F6B4F",
        timezone: "Asia/Jakarta",
        locale: "id-ID",
        waTemplates: {
          invoiceIssued:
            "Halo {nama}, tagihan kos kamar {kamar} sebesar {jumlah} telah terbit. Jatuh tempo {jatuh_tempo}. Bayar di: {link}",
          paymentSuccess:
            "Terima kasih {nama}, pembayaran {jumlah} untuk kamar {kamar} sudah kami terima.",
          reminder:
            "Pengingat: tagihan kamar {kamar} sebesar {jumlah} jatuh tempo {jatuh_tempo}.",
        },
      },
    },
    {
      id: TENANT_GRIYA,
      name: "Griya Asri Kost",
      slug: "griyaasri",
      subdomain: "griyaasri",
      plan: "starter",
      status: "trial",
      ownerEmail: "admin@griyaasri.id",
      trialEndsAt: new Date("2025-03-01"),
    },
    {
      id: TENANT_PONDOK,
      name: "Pondok Indah Residence",
      slug: "pondokindah",
      subdomain: "pondokindah",
      plan: "enterprise",
      status: "aktif",
      ownerEmail: "admin@pondokindah.id",
    },
    {
      id: TENANT_MAWAR,
      name: "Mawar Kos Eksklusif",
      slug: "mawarkos",
      subdomain: "mawarkos",
      plan: "pro",
      status: "ditangguhkan",
      ownerEmail: "admin@mawarkos.id",
    },
    {
      id: TENANT_SENTOSA,
      name: "Sentosa Boarding House",
      slug: "sentosa",
      subdomain: "sentosa",
      plan: "starter",
      status: "berhenti",
      ownerEmail: "admin@sentosa.id",
    },
  ]);

  // -------------------------------------------------------------------------
  // 2. Owner user
  // -------------------------------------------------------------------------
  await db.insert(userAccount).values({
    id: OWNER_ID,
    tenantId: TENANT_ID,
    email: "owner@kosbunga.id",
    // Argon2id hash of "password123" — for dev only
    passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$placeholder_hash_for_dev",
    role: "owner",
    fullName: "Ibu Ratna Sari",
  });

  // -------------------------------------------------------------------------
  // 3. Properties
  // -------------------------------------------------------------------------
  await db.insert(property).values([
    {
      id: PROP_MELATI,
      tenantId: TENANT_ID,
      name: "Kos Melati Putih",
      address: "Jl. Kaliurang KM 5 No. 21, Caturtunggal, Depok",
      city: "Sleman, Yogyakarta",
      totalRooms: 6,
    },
    {
      id: PROP_ANGGREK,
      tenantId: TENANT_ID,
      name: "Kos Anggrek Biru",
      address: "Jl. Cendrawasih No. 8, Demangan, Gondokusuman",
      city: "Yogyakarta",
      totalRooms: 6,
    },
  ]);

  // -------------------------------------------------------------------------
  // 4. Rooms (6 rooms across 2 properties, mix of statuses)
  // -------------------------------------------------------------------------
  await db.insert(room).values([
    {
      id: ROOM_IDS.melatiA1,
      propertyId: PROP_MELATI,
      tenantId: TENANT_ID,
      number: "A1",
      type: "Standar",
      monthlyPrice: "1100000.00",
      status: "terisi",
      facilities: ["Kasur", "Lemari", "Kipas Angin", "WiFi"],
    },
    {
      id: ROOM_IDS.melatiA2,
      propertyId: PROP_MELATI,
      tenantId: TENANT_ID,
      number: "A2",
      type: "Standar",
      monthlyPrice: "1100000.00",
      status: "terisi",
      facilities: ["Kasur", "Lemari", "Kipas Angin", "WiFi"],
    },
    {
      id: ROOM_IDS.melatiA3,
      propertyId: PROP_MELATI,
      tenantId: TENANT_ID,
      number: "A3",
      type: "Standar",
      monthlyPrice: "1100000.00",
      status: "tersedia",
      facilities: ["Kasur", "Lemari", "Kipas Angin", "WiFi"],
    },
    {
      id: ROOM_IDS.melatiB1,
      propertyId: PROP_MELATI,
      tenantId: TENANT_ID,
      number: "B1",
      type: "AC",
      monthlyPrice: "1650000.00",
      status: "terisi",
      facilities: ["Kasur", "Lemari", "AC", "WiFi", "Kamar Mandi Dalam"],
    },
    {
      id: ROOM_IDS.melatiB2,
      propertyId: PROP_MELATI,
      tenantId: TENANT_ID,
      number: "B2",
      type: "AC",
      monthlyPrice: "1650000.00",
      status: "terisi",
      facilities: ["Kasur", "Lemari", "AC", "WiFi", "Kamar Mandi Dalam"],
    },
    {
      id: ROOM_IDS.melatiB3,
      propertyId: PROP_MELATI,
      tenantId: TENANT_ID,
      number: "B3",
      type: "AC",
      monthlyPrice: "1650000.00",
      status: "perbaikan",
      facilities: ["Kasur", "Lemari", "AC", "WiFi", "Kamar Mandi Dalam"],
    },
  ]);

  // -------------------------------------------------------------------------
  // 5. Residents (4 active residents)
  // -------------------------------------------------------------------------
  await db.insert(kosTenant).values([
    {
      id: RESIDENT_IDS.budi,
      tenantId: TENANT_ID,
      fullName: "Budi Santoso",
      ktpNumber: "3471025001990001",
      phone: "+6281234567801",
      email: "budi.santoso@example.com",
      emergencyContact: "Sri Wahyuni (+6281234560011)",
    },
    {
      id: RESIDENT_IDS.siti,
      tenantId: TENANT_ID,
      fullName: "Siti Nurhaliza",
      ktpNumber: "3471024207000002",
      phone: "+6281234567802",
      email: "siti.nurhaliza@example.com",
      emergencyContact: "Ahmad Fauzi (+6281234560022)",
    },
    {
      id: RESIDENT_IDS.agus,
      tenantId: TENANT_ID,
      fullName: "Agus Pratama",
      ktpNumber: "3471021503980003",
      phone: "+6281234567803",
      email: "agus.pratama@example.com",
      emergencyContact: "Dewi Lestari (+6281234560033)",
    },
    {
      id: RESIDENT_IDS.dewi,
      tenantId: TENANT_ID,
      fullName: "Dewi Anggraini",
      ktpNumber: "3471026011010004",
      phone: "+6281234567804",
      email: "dewi.anggraini@example.com",
      emergencyContact: "Bambang Sutrisno (+6281234560044)",
    },
  ]);

  // -------------------------------------------------------------------------
  // 6. Contracts (3 active)
  // -------------------------------------------------------------------------
  await db.insert(contract).values([
    {
      id: CONTRACT_IDS.budi,
      tenantId: TENANT_ID,
      roomId: ROOM_IDS.melatiA1,
      kosTenantId: RESIDENT_IDS.budi,
      startDate: "2024-08-01",
      endDate: "2025-07-31",
      depositAmount: "1100000.00",
      monthlyPrice: "1100000.00",
      status: "active",
    },
    {
      id: CONTRACT_IDS.siti,
      tenantId: TENANT_ID,
      roomId: ROOM_IDS.melatiA2,
      kosTenantId: RESIDENT_IDS.siti,
      startDate: "2024-09-01",
      endDate: "2025-08-31",
      depositAmount: "1100000.00",
      monthlyPrice: "1100000.00",
      status: "active",
    },
    {
      id: CONTRACT_IDS.agus,
      tenantId: TENANT_ID,
      roomId: ROOM_IDS.melatiB1,
      kosTenantId: RESIDENT_IDS.agus,
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      depositAmount: "1650000.00",
      monthlyPrice: "1650000.00",
      status: "active",
    },
  ]);

  // -------------------------------------------------------------------------
  // 7. Invoices (5 invoices, mix of statuses)
  // -------------------------------------------------------------------------
  await db.insert(invoice).values([
    {
      id: INVOICE_IDS.inv0142,
      tenantId: TENANT_ID,
      contractId: CONTRACT_IDS.budi,
      invoiceNumber: "INV-2025-0142",
      paymentLinkToken: "INV-2025-0142",
      periodStart: "2025-02-01",
      periodEnd: "2025-02-28",
      dueDate: "2025-02-10",
      total: "1250000.00",
      status: "tertagih",
    },
    {
      id: INVOICE_IDS.inv0143,
      tenantId: TENANT_ID,
      contractId: CONTRACT_IDS.siti,
      invoiceNumber: "INV-2025-0143",
      paymentLinkToken: "PAY-A2-FEB25",
      periodStart: "2025-02-01",
      periodEnd: "2025-02-28",
      dueDate: "2025-02-10",
      total: "1100000.00",
      status: "lunas",
    },
    {
      id: INVOICE_IDS.inv0144,
      tenantId: TENANT_ID,
      contractId: CONTRACT_IDS.agus,
      invoiceNumber: "INV-2025-0144",
      paymentLinkToken: "PAY-B1-JAN25",
      periodStart: "2025-01-01",
      periodEnd: "2025-01-31",
      dueDate: "2025-01-10",
      total: "1700000.00",
      status: "jatuh_tempo",
    },
    {
      id: INVOICE_IDS.inv0145,
      tenantId: TENANT_ID,
      contractId: CONTRACT_IDS.budi,
      invoiceNumber: "INV-2025-0145",
      paymentLinkToken: "PAY-A1-JAN25",
      periodStart: "2025-01-01",
      periodEnd: "2025-01-31",
      dueDate: "2025-01-10",
      total: "1100000.00",
      status: "lunas",
    },
    {
      id: INVOICE_IDS.inv0146,
      tenantId: TENANT_ID,
      contractId: CONTRACT_IDS.siti,
      invoiceNumber: "INV-2025-0146",
      paymentLinkToken: "PAY-A2-JAN25",
      periodStart: "2025-01-01",
      periodEnd: "2025-01-31",
      dueDate: "2025-01-10",
      total: "1100000.00",
      status: "draft",
    },
  ]);

  // -------------------------------------------------------------------------
  // 8. Invoice lines
  // -------------------------------------------------------------------------
  await db.insert(invoiceLine).values([
    {
      tenantId: TENANT_ID,
      invoiceId: INVOICE_IDS.inv0142,
      description: "Sewa kamar A1 — Februari 2025",
      amount: "1100000.00",
      componentType: "sewa",
    },
    {
      tenantId: TENANT_ID,
      invoiceId: INVOICE_IDS.inv0142,
      description: "Listrik & air",
      amount: "150000.00",
      componentType: "utilitas",
    },
    {
      tenantId: TENANT_ID,
      invoiceId: INVOICE_IDS.inv0143,
      description: "Sewa kamar A2 — Februari 2025",
      amount: "1100000.00",
      componentType: "sewa",
    },
    {
      tenantId: TENANT_ID,
      invoiceId: INVOICE_IDS.inv0144,
      description: "Sewa kamar B1 — Januari 2025",
      amount: "1650000.00",
      componentType: "sewa",
    },
    {
      tenantId: TENANT_ID,
      invoiceId: INVOICE_IDS.inv0144,
      description: "Denda keterlambatan",
      amount: "50000.00",
      componentType: "denda",
    },
    {
      tenantId: TENANT_ID,
      invoiceId: INVOICE_IDS.inv0145,
      description: "Sewa kamar A1 — Januari 2025",
      amount: "1100000.00",
      componentType: "sewa",
    },
    {
      tenantId: TENANT_ID,
      invoiceId: INVOICE_IDS.inv0146,
      description: "Sewa kamar A2 — Januari 2025",
      amount: "1100000.00",
      componentType: "sewa",
    },
  ]);

  // -------------------------------------------------------------------------
  // 9. Payment channels (QRIS + VA + e-wallet + retail + manual)
  // -------------------------------------------------------------------------
  await db.insert(gatewayConfig).values({
    id: GATEWAY_ID,
    tenantId: TENANT_ID,
    provider: "xendit",
    apiKeyEncrypted: "enc:placeholder_api_key_for_dev",
    webhookTokenEncrypted: "enc:placeholder_webhook_token_for_dev",
    callbackToken: "cb-kosbunga-xendit-001",
    settlementAccount: "1234567890",
    isActive: true,
  });

  await db.insert(paymentChannel).values([
    {
      tenantId: TENANT_ID,
      gatewayConfigId: GATEWAY_ID,
      channelType: "qris",
      channelCode: "QRIS",
      displayName: "QRIS",
      mdrPercent: "0.70",
      feeBearer: "owner",
      isEnabled: true,
    },
    {
      tenantId: TENANT_ID,
      gatewayConfigId: GATEWAY_ID,
      channelType: "va",
      channelCode: "BCA_VA",
      displayName: "Virtual Account BCA",
      mdrPercent: "0.00",
      feeBearer: "owner",
      isEnabled: true,
    },
    {
      tenantId: TENANT_ID,
      gatewayConfigId: GATEWAY_ID,
      channelType: "ewallet",
      channelCode: "GOPAY",
      displayName: "GoPay",
      mdrPercent: "2.00",
      feeBearer: "owner",
      isEnabled: true,
    },
    {
      tenantId: TENANT_ID,
      gatewayConfigId: GATEWAY_ID,
      channelType: "retail",
      channelCode: "ALFAMART",
      displayName: "Alfamart",
      mdrPercent: "0.00",
      feeBearer: "owner",
      isEnabled: true,
    },
    {
      tenantId: TENANT_ID,
      gatewayConfigId: GATEWAY_ID,
      channelType: "manual",
      channelCode: "MANUAL",
      displayName: "Transfer Manual",
      mdrPercent: "0.00",
      feeBearer: "owner",
      isEnabled: true,
    },
  ]);

  // -------------------------------------------------------------------------
  // 10. Billing components for Melati property
  // -------------------------------------------------------------------------
  await db.insert(billingComponent).values([
    {
      tenantId: TENANT_ID,
      propertyId: PROP_MELATI,
      name: "Sewa Kamar",
      calcMethod: "fixed",
    },
    {
      tenantId: TENANT_ID,
      propertyId: PROP_MELATI,
      name: "Listrik",
      calcMethod: "meter",
      defaultValue: "100000.00",
    },
    {
      tenantId: TENANT_ID,
      propertyId: PROP_MELATI,
      name: "Air",
      calcMethod: "meter",
      defaultValue: "50000.00",
    },
    {
      tenantId: TENANT_ID,
      propertyId: PROP_MELATI,
      name: "Kebersihan",
      calcMethod: "fixed",
      defaultValue: "50000.00",
    },
  ]);

  // -------------------------------------------------------------------------
  // 11. Subscriptions (primary tenant active, others varied)
  // -------------------------------------------------------------------------
  await db.insert(subscription).values([
    {
      tenantId: TENANT_ID,
      plan: "pro",
      amountMonthly: "499000.00",
      status: "active",
      currentPeriodStart: "2025-02-01",
      currentPeriodEnd: "2025-02-28",
    },
    {
      tenantId: TENANT_GRIYA,
      plan: "starter",
      amountMonthly: "199000.00",
      status: "trialing",
      currentPeriodStart: "2025-02-15",
      currentPeriodEnd: "2025-03-01",
    },
    {
      tenantId: TENANT_PONDOK,
      plan: "enterprise",
      amountMonthly: "1999000.00",
      status: "active",
      currentPeriodStart: "2025-02-01",
      currentPeriodEnd: "2025-02-28",
    },
  ]);

  console.log("✅ Seed complete!");
  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
