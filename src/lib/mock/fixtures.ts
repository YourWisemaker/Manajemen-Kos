/**
 * Seeded mock fixtures — Task 3.2
 * -------------------------------
 * Realistic, believable Bahasa Indonesia seed data for the Phase 1 mock data
 * layer. Every value conforms to the frontend view-model types in
 * `./types.ts`. Money is integer Rupiah; dates are ISO strings interpreted in
 * Asia/Jakarta; KTP numbers are synthetic 16-digit strings and phones use the
 * `+62` prefix.
 *
 * The fixtures are organised around one richly-populated primary tenant
 * ("Kos Bunga Melati") that drives the tenant-facing surfaces, plus a roster
 * of additional tenants (Starter/Pro/Enterprise, varied statuses) that drive
 * the super-admin views. Tenants other than the primary one intentionally have
 * empty operational data so the UI's empty-state paths are exercised too.
 *
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
 */

import type {
  Contract,
  DashboardSummary,
  Invoice,
  PaymentChannelView,
  PlatformMetrics,
  Property,
  PublicInvoiceView,
  ReportBundle,
  Resident,
  Room,
  TenantSaasSummary,
  TenantSettings,
  UUID,
} from "./types";

/** The primary, fully-seeded tenant id used by the tenant-facing surfaces. */
export const PRIMARY_TENANT_ID: UUID = "tenant-kosbunga";

/** Property ids for the primary tenant (exported for deep-linking/tests). */
export const PROPERTY_IDS = {
  melati: "prop-melati",
  anggrek: "prop-anggrek",
  cendana: "prop-cendana",
} as const;

/** The known, deep-linkable public payment token wired into a PublicInvoiceView. */
export const KNOWN_PAYMENT_TOKEN = "INV-2025-0142";

/**
 * All data for a single tenant. The mock data source looks tenants up by id;
 * only {@link PRIMARY_TENANT_ID} carries rich operational data.
 */
export interface TenantSeed {
  settings: TenantSettings;
  properties: Property[];
  rooms: Room[];
  residents: Resident[];
  contracts: Contract[];
  invoices: Invoice[];
  /** invoiceId -> propertyId, used to support InvoiceFilter.propertyId. */
  invoicePropertyIndex: Record<UUID, UUID>;
  dashboard: DashboardSummary;
  reports: ReportBundle;
}

// ---------------------------------------------------------------------------
// Shared payment channels (QRIS always present first).
// ---------------------------------------------------------------------------

/** Payment channels offered on the public payment page; QRIS is always present. */
export const PAYMENT_CHANNELS: PaymentChannelView[] = [
  {
    code: "QRIS",
    type: "qris",
    displayName: "QRIS",
    feeLabel: "Semua bank & e-wallet",
    enabled: true,
  },
  {
    code: "BCA_VA",
    type: "va",
    displayName: "Virtual Account BCA",
    enabled: true,
  },
  {
    code: "GOPAY",
    type: "ewallet",
    displayName: "GoPay",
    feeLabel: "Gratis biaya admin",
    enabled: true,
  },
  {
    code: "ALFAMART",
    type: "retail",
    displayName: "Alfamart",
    enabled: true,
  },
  {
    code: "MANUAL",
    type: "manual",
    displayName: "Transfer Manual",
    feeLabel: "Unggah bukti transfer",
    enabled: true,
  },
];

// ---------------------------------------------------------------------------
// Primary tenant: "Kos Bunga Melati" — three properties across Yogyakarta &
// Bandung, ~16 rooms, residents, contracts, and invoices in varied statuses.
// ---------------------------------------------------------------------------

const primarySettings: TenantSettings = {
  id: PRIMARY_TENANT_ID,
  name: "Kos Bunga Melati",
  subdomain: "kosbunga",
  plan: "pro",
  status: "aktif",
  logoUrl: "/logos/kos-bunga-melati.svg",
  brandColor: "#2F6B4F",
  timezone: "Asia/Jakarta",
  locale: "id-ID",
  waTemplates: {
    invoiceIssued:
      "Halo {nama}, tagihan kos kamar {kamar} sebesar {jumlah} telah terbit. Jatuh tempo {jatuh_tempo}. Bayar di: {link}",
    paymentSuccess:
      "Terima kasih {nama}, pembayaran {jumlah} untuk kamar {kamar} sudah kami terima. Sampai jumpa bulan depan!",
    reminder:
      "Pengingat: tagihan kamar {kamar} sebesar {jumlah} jatuh tempo {jatuh_tempo}. Mohon segera diselesaikan ya, {nama}.",
  },
  trialEndsAt: undefined,
};

const primaryProperties: Property[] = [
  {
    id: PROPERTY_IDS.melati,
    name: "Kos Melati Putih",
    address: "Jl. Kaliurang KM 5 No. 21, Caturtunggal, Depok",
    city: "Sleman, Yogyakarta",
    totalRooms: 6,
    occupiedRooms: 4,
  },
  {
    id: PROPERTY_IDS.anggrek,
    name: "Kos Anggrek Biru",
    address: "Jl. Cendrawasih No. 8, Demangan, Gondokusuman",
    city: "Yogyakarta",
    totalRooms: 6,
    occupiedRooms: 5,
  },
  {
    id: PROPERTY_IDS.cendana,
    name: "Kos Cendana Asri",
    address: "Jl. Dipatiukur No. 112, Lebakgede, Coblong",
    city: "Bandung",
    totalRooms: 4,
    occupiedRooms: 2,
  },
];

const primaryRooms: Room[] = [
  // Kos Melati Putih (6 rooms)
  {
    id: "room-melati-a1",
    propertyId: PROPERTY_IDS.melati,
    number: "A1",
    type: "Standar",
    monthlyPrice: 1_100_000,
    status: "terisi",
    facilities: ["Kasur", "Lemari", "Kipas Angin", "WiFi"],
  },
  {
    id: "room-melati-a2",
    propertyId: PROPERTY_IDS.melati,
    number: "A2",
    type: "Standar",
    monthlyPrice: 1_100_000,
    status: "terisi",
    facilities: ["Kasur", "Lemari", "Kipas Angin", "WiFi"],
  },
  {
    id: "room-melati-a3",
    propertyId: PROPERTY_IDS.melati,
    number: "A3",
    type: "Standar",
    monthlyPrice: 1_100_000,
    status: "tersedia",
    facilities: ["Kasur", "Lemari", "Kipas Angin", "WiFi"],
  },
  {
    id: "room-melati-b1",
    propertyId: PROPERTY_IDS.melati,
    number: "B1",
    type: "AC",
    monthlyPrice: 1_650_000,
    status: "terisi",
    facilities: ["Kasur", "Lemari", "AC", "WiFi", "Kamar Mandi Dalam"],
  },
  {
    id: "room-melati-b2",
    propertyId: PROPERTY_IDS.melati,
    number: "B2",
    type: "AC",
    monthlyPrice: 1_650_000,
    status: "terisi",
    facilities: ["Kasur", "Lemari", "AC", "WiFi", "Kamar Mandi Dalam"],
  },
  {
    id: "room-melati-b3",
    propertyId: PROPERTY_IDS.melati,
    number: "B3",
    type: "AC",
    monthlyPrice: 1_650_000,
    status: "perbaikan",
    facilities: ["Kasur", "Lemari", "AC", "WiFi", "Kamar Mandi Dalam"],
  },

  // Kos Anggrek Biru (6 rooms)
  {
    id: "room-anggrek-101",
    propertyId: PROPERTY_IDS.anggrek,
    number: "101",
    type: "Standar",
    monthlyPrice: 950_000,
    status: "terisi",
    facilities: ["Kasur", "Lemari", "Kipas Angin"],
  },
  {
    id: "room-anggrek-102",
    propertyId: PROPERTY_IDS.anggrek,
    number: "102",
    type: "Standar",
    monthlyPrice: 950_000,
    status: "terisi",
    facilities: ["Kasur", "Lemari", "Kipas Angin"],
  },
  {
    id: "room-anggrek-103",
    propertyId: PROPERTY_IDS.anggrek,
    number: "103",
    type: "Standar",
    monthlyPrice: 950_000,
    status: "terisi",
    facilities: ["Kasur", "Lemari", "Kipas Angin"],
  },
  {
    id: "room-anggrek-201",
    propertyId: PROPERTY_IDS.anggrek,
    number: "201",
    type: "AC",
    monthlyPrice: 1_400_000,
    status: "terisi",
    facilities: ["Kasur", "Lemari", "AC", "WiFi"],
  },
  {
    id: "room-anggrek-202",
    propertyId: PROPERTY_IDS.anggrek,
    number: "202",
    type: "AC",
    monthlyPrice: 1_400_000,
    status: "terisi",
    facilities: ["Kasur", "Lemari", "AC", "WiFi"],
  },
  {
    id: "room-anggrek-203",
    propertyId: PROPERTY_IDS.anggrek,
    number: "203",
    type: "AC",
    monthlyPrice: 1_400_000,
    status: "tersedia",
    facilities: ["Kasur", "Lemari", "AC", "WiFi"],
  },

  // Kos Cendana Asri (4 rooms)
  {
    id: "room-cendana-1",
    propertyId: PROPERTY_IDS.cendana,
    number: "C1",
    type: "Premium",
    monthlyPrice: 2_250_000,
    status: "terisi",
    facilities: ["Kasur", "Lemari", "AC", "WiFi", "Kamar Mandi Dalam", "Water Heater"],
  },
  {
    id: "room-cendana-2",
    propertyId: PROPERTY_IDS.cendana,
    number: "C2",
    type: "Premium",
    monthlyPrice: 2_250_000,
    status: "terisi",
    facilities: ["Kasur", "Lemari", "AC", "WiFi", "Kamar Mandi Dalam", "Water Heater"],
  },
  {
    id: "room-cendana-3",
    propertyId: PROPERTY_IDS.cendana,
    number: "C3",
    type: "Premium",
    monthlyPrice: 2_250_000,
    status: "tersedia",
    facilities: ["Kasur", "Lemari", "AC", "WiFi", "Kamar Mandi Dalam", "Water Heater"],
  },
  {
    id: "room-cendana-4",
    propertyId: PROPERTY_IDS.cendana,
    number: "C4",
    type: "Premium",
    monthlyPrice: 2_250_000,
    status: "perbaikan",
    facilities: ["Kasur", "Lemari", "AC", "WiFi", "Kamar Mandi Dalam", "Water Heater"],
  },
];

const primaryResidents: Resident[] = [
  {
    id: "res-budi",
    fullName: "Budi Santoso",
    ktpNumber: "3471025001990001",
    phone: "+6281234567801",
    email: "budi.santoso@example.com",
    emergencyContact: "Sri Wahyuni (+6281234560011)",
    roomNumber: "A1",
    status: "aktif",
  },
  {
    id: "res-siti",
    fullName: "Siti Nurhaliza",
    ktpNumber: "3471024207000002",
    phone: "+6281234567802",
    email: "siti.nurhaliza@example.com",
    emergencyContact: "Ahmad Fauzi (+6281234560022)",
    roomNumber: "A2",
    status: "aktif",
  },
  {
    id: "res-agus",
    fullName: "Agus Pratama",
    ktpNumber: "3471021503980003",
    phone: "+6281234567803",
    email: "agus.pratama@example.com",
    emergencyContact: "Dewi Lestari (+6281234560033)",
    roomNumber: "B1",
    status: "aktif",
  },
  {
    id: "res-dewi",
    fullName: "Dewi Anggraini",
    ktpNumber: "3471026011010004",
    phone: "+6281234567804",
    email: "dewi.anggraini@example.com",
    emergencyContact: "Bambang Sutrisno (+6281234560044)",
    roomNumber: "B2",
    status: "aktif",
  },
  {
    id: "res-rizki",
    fullName: "Rizki Ramadhan",
    ktpNumber: "3471020907990005",
    phone: "+6281234567805",
    email: "rizki.ramadhan@example.com",
    emergencyContact: "Nuraini (+6281234560055)",
    roomNumber: "101",
    status: "aktif",
  },
  {
    id: "res-putri",
    fullName: "Putri Maharani",
    ktpNumber: "3471025512000006",
    phone: "+6281234567806",
    email: "putri.maharani@example.com",
    emergencyContact: "Hendra Wijaya (+6281234560066)",
    roomNumber: "201",
    status: "aktif",
  },
  {
    id: "res-fajar",
    fullName: "Fajar Nugroho",
    ktpNumber: "3273011808970007",
    phone: "+6281234567807",
    email: "fajar.nugroho@example.com",
    emergencyContact: "Retno Wulandari (+6281234560077)",
    roomNumber: "C1",
    status: "aktif",
  },
  {
    id: "res-maya",
    fullName: "Maya Kusuma",
    ktpNumber: "3273015003020008",
    phone: "+6281234567808",
    email: "maya.kusuma@example.com",
    emergencyContact: "Joko Susilo (+6281234560088)",
    roomNumber: "C2",
    status: "aktif",
  },
  {
    id: "res-eko",
    fullName: "Eko Prasetyo",
    ktpNumber: "3471022810960009",
    phone: "+6281234567809",
    email: "eko.prasetyo@example.com",
    emergencyContact: "Wati Rahayu (+6281234560099)",
    roomNumber: undefined,
    status: "keluar",
  },
];

const primaryContracts: Contract[] = [
  {
    id: "contract-budi",
    residentName: "Budi Santoso",
    roomNumber: "A1",
    startDate: "2024-08-01",
    endDate: "2025-07-31",
    depositAmount: 1_100_000,
    monthlyPrice: 1_100_000,
    status: "aktif",
  },
  {
    id: "contract-siti",
    residentName: "Siti Nurhaliza",
    roomNumber: "A2",
    startDate: "2024-09-01",
    endDate: "2025-08-31",
    depositAmount: 1_100_000,
    monthlyPrice: 1_100_000,
    status: "aktif",
  },
  {
    id: "contract-agus",
    residentName: "Agus Pratama",
    roomNumber: "B1",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    depositAmount: 1_650_000,
    monthlyPrice: 1_650_000,
    status: "aktif",
  },
  {
    id: "contract-dewi",
    residentName: "Dewi Anggraini",
    roomNumber: "B2",
    startDate: "2025-02-01",
    endDate: "2026-01-31",
    depositAmount: 1_650_000,
    monthlyPrice: 1_650_000,
    status: "aktif",
  },
  {
    id: "contract-rizki",
    residentName: "Rizki Ramadhan",
    roomNumber: "101",
    startDate: "2024-07-01",
    endDate: "2025-06-30",
    depositAmount: 950_000,
    monthlyPrice: 950_000,
    status: "aktif",
  },
  {
    id: "contract-fajar",
    residentName: "Fajar Nugroho",
    roomNumber: "C1",
    startDate: "2025-03-01",
    endDate: "2026-02-28",
    depositAmount: 2_250_000,
    monthlyPrice: 2_250_000,
    status: "aktif",
  },
  {
    id: "contract-eko",
    residentName: "Eko Prasetyo",
    roomNumber: "102",
    startDate: "2023-06-01",
    endDate: "2024-05-31",
    depositAmount: 950_000,
    monthlyPrice: 950_000,
    status: "berakhir",
  },
];

const primaryInvoices: Invoice[] = [
  // The known, deep-linkable invoice wired to the public payment page.
  {
    id: "inv-0142",
    invoiceNumber: KNOWN_PAYMENT_TOKEN,
    residentName: "Budi Santoso",
    roomNumber: "A1",
    periodStart: "2025-02-01",
    periodEnd: "2025-02-28",
    dueDate: "2025-02-10",
    lines: [
      { description: "Sewa kamar A1 — Februari 2025", amount: 1_100_000 },
      { description: "Listrik & air", amount: 150_000 },
    ],
    total: 1_250_000,
    status: "tertagih",
    paymentToken: KNOWN_PAYMENT_TOKEN,
  },
  {
    id: "inv-0143",
    invoiceNumber: "INV-2025-0143",
    residentName: "Siti Nurhaliza",
    roomNumber: "A2",
    periodStart: "2025-02-01",
    periodEnd: "2025-02-28",
    dueDate: "2025-02-10",
    lines: [{ description: "Sewa kamar A2 — Februari 2025", amount: 1_100_000 }],
    total: 1_100_000,
    status: "lunas",
    paymentToken: "PAY-A2-FEB25",
  },
  {
    id: "inv-0144",
    invoiceNumber: "INV-2025-0144",
    residentName: "Agus Pratama",
    roomNumber: "B1",
    periodStart: "2025-01-01",
    periodEnd: "2025-01-31",
    dueDate: "2025-01-10",
    lines: [
      { description: "Sewa kamar B1 — Januari 2025", amount: 1_650_000 },
      { description: "Denda keterlambatan", amount: 50_000 },
    ],
    total: 1_700_000,
    status: "jatuh_tempo",
    paymentToken: "PAY-B1-JAN25",
  },
  {
    id: "inv-0145",
    invoiceNumber: "INV-2025-0145",
    residentName: "Dewi Anggraini",
    roomNumber: "B2",
    periodStart: "2025-02-01",
    periodEnd: "2025-02-28",
    dueDate: "2025-02-10",
    lines: [{ description: "Sewa kamar B2 — Februari 2025", amount: 1_650_000 }],
    total: 1_650_000,
    status: "lunas",
    paymentToken: "PAY-B2-FEB25",
  },
  {
    id: "inv-0146",
    invoiceNumber: "INV-2025-0146",
    residentName: "Rizki Ramadhan",
    roomNumber: "101",
    periodStart: "2025-02-01",
    periodEnd: "2025-02-28",
    dueDate: "2025-02-05",
    lines: [{ description: "Sewa kamar 101 — Februari 2025", amount: 950_000 }],
    total: 950_000,
    status: "jatuh_tempo",
    paymentToken: "PAY-101-FEB25",
  },
  {
    id: "inv-0147",
    invoiceNumber: "INV-2025-0147",
    residentName: "Putri Maharani",
    roomNumber: "201",
    periodStart: "2025-02-01",
    periodEnd: "2025-02-28",
    dueDate: "2025-02-10",
    lines: [{ description: "Sewa kamar 201 — Februari 2025", amount: 1_400_000 }],
    total: 1_400_000,
    status: "lunas",
    paymentToken: "PAY-201-FEB25",
  },
  {
    id: "inv-0148",
    invoiceNumber: "INV-2025-0148",
    residentName: "Fajar Nugroho",
    roomNumber: "C1",
    periodStart: "2025-03-01",
    periodEnd: "2025-03-31",
    dueDate: "2025-03-10",
    lines: [
      { description: "Sewa kamar C1 — Maret 2025", amount: 2_250_000 },
      { description: "Listrik & air", amount: 200_000 },
    ],
    total: 2_450_000,
    status: "tertagih",
    paymentToken: "PAY-C1-MAR25",
  },
  {
    id: "inv-0149",
    invoiceNumber: "INV-2025-0149",
    residentName: "Maya Kusuma",
    roomNumber: "C2",
    periodStart: "2025-03-01",
    periodEnd: "2025-03-31",
    dueDate: "2025-03-10",
    lines: [{ description: "Sewa kamar C2 — Maret 2025", amount: 2_250_000 }],
    total: 2_250_000,
    status: "draft",
    paymentToken: "PAY-C2-MAR25",
  },
  {
    id: "inv-0150",
    invoiceNumber: "INV-2025-0150",
    residentName: "Eko Prasetyo",
    roomNumber: "102",
    periodStart: "2024-05-01",
    periodEnd: "2024-05-31",
    dueDate: "2024-05-10",
    lines: [{ description: "Sewa kamar 102 — Mei 2024", amount: 950_000 }],
    total: 950_000,
    status: "batal",
    paymentToken: "PAY-102-MAY24",
  },
];

/** Maps each primary invoice to the property it belongs to (for filtering). */
const primaryInvoicePropertyIndex: Record<UUID, UUID> = {
  "inv-0142": PROPERTY_IDS.melati,
  "inv-0143": PROPERTY_IDS.melati,
  "inv-0144": PROPERTY_IDS.melati,
  "inv-0145": PROPERTY_IDS.melati,
  "inv-0146": PROPERTY_IDS.anggrek,
  "inv-0147": PROPERTY_IDS.anggrek,
  "inv-0148": PROPERTY_IDS.cendana,
  "inv-0149": PROPERTY_IDS.cendana,
  "inv-0150": PROPERTY_IDS.anggrek,
};

/** The public payment view for the known token, with QRIS always first. */
export const primaryPublicInvoice: PublicInvoiceView = {
  tenantName: primarySettings.name,
  tenantLogoUrl: primarySettings.logoUrl,
  tenantBrandColor: primarySettings.brandColor,
  invoiceNumber: KNOWN_PAYMENT_TOKEN,
  residentName: "Budi Santoso",
  roomLabel: "Kamar A1 — Kos Melati Putih",
  lines: [
    { description: "Sewa kamar A1 — Februari 2025", amount: 1_100_000 },
    { description: "Listrik & air", amount: 150_000 },
  ],
  total: 1_250_000,
  dueDate: "2025-02-10",
  status: "tertagih",
  channels: PAYMENT_CHANNELS,
};

/** Lookup of every public-payable token -> its public invoice view. */
export const PUBLIC_INVOICES: Record<string, PublicInvoiceView> = {
  [KNOWN_PAYMENT_TOKEN]: primaryPublicInvoice,
  "PAY-C1-MAR25": {
    tenantName: primarySettings.name,
    tenantLogoUrl: primarySettings.logoUrl,
    tenantBrandColor: primarySettings.brandColor,
    invoiceNumber: "INV-2025-0148",
    residentName: "Fajar Nugroho",
    roomLabel: "Kamar C1 — Kos Cendana Asri",
    lines: [
      { description: "Sewa kamar C1 — Maret 2025", amount: 2_250_000 },
      { description: "Listrik & air", amount: 200_000 },
    ],
    total: 2_450_000,
    dueDate: "2025-03-10",
    status: "tertagih",
    channels: PAYMENT_CHANNELS,
  },
};

const primaryDashboard: DashboardSummary = {
  properties: primaryProperties.length,
  totalRooms: primaryProperties.reduce((sum, p) => sum + p.totalRooms, 0),
  occupiedRooms: primaryProperties.reduce((sum, p) => sum + p.occupiedRooms, 0),
  monthlyRevenue: 14_850_000,
  outstanding: 2_650_000,
  overdueInvoices: 2,
  recentPayments: [
    { residentName: "Siti Nurhaliza", amount: 1_100_000, paidAt: "2025-02-08T03:12:00Z" },
    { residentName: "Dewi Anggraini", amount: 1_650_000, paidAt: "2025-02-07T08:45:00Z" },
    { residentName: "Putri Maharani", amount: 1_400_000, paidAt: "2025-02-06T01:30:00Z" },
  ],
  revenueTrend: [
    { month: "2024-09", amount: 12_300_000 },
    { month: "2024-10", amount: 12_950_000 },
    { month: "2024-11", amount: 13_400_000 },
    { month: "2024-12", amount: 13_900_000 },
    { month: "2025-01", amount: 14_200_000 },
    { month: "2025-02", amount: 14_850_000 },
  ],
};

const primaryReports: ReportBundle = {
  occupancyByProperty: [
    { property: "Kos Melati Putih", occupancyPct: 67 },
    { property: "Kos Anggrek Biru", occupancyPct: 83 },
    { property: "Kos Cendana Asri", occupancyPct: 50 },
  ],
  revenueByMonth: [
    { month: "2024-09", amount: 12_300_000 },
    { month: "2024-10", amount: 12_950_000 },
    { month: "2024-11", amount: 13_400_000 },
    { month: "2024-12", amount: 13_900_000 },
    { month: "2025-01", amount: 14_200_000 },
    { month: "2025-02", amount: 14_850_000 },
  ],
  agingBuckets: [
    { bucket: "Belum jatuh tempo", amount: 6_350_000 },
    { bucket: "1–30 hari", amount: 1_700_000 },
    { bucket: "31–60 hari", amount: 950_000 },
    { bucket: "60+ hari", amount: 0 },
  ],
  channelBreakdown: [
    { channel: "QRIS", amount: 7_200_000 },
    { channel: "Virtual Account BCA", amount: 4_150_000 },
    { channel: "GoPay", amount: 2_300_000 },
    { channel: "Transfer Manual", amount: 1_200_000 },
  ],
};

/** Fully-assembled seed for the primary tenant. */
export const PRIMARY_TENANT_SEED: TenantSeed = {
  settings: primarySettings,
  properties: primaryProperties,
  rooms: primaryRooms,
  residents: primaryResidents,
  contracts: primaryContracts,
  invoices: primaryInvoices,
  invoicePropertyIndex: primaryInvoicePropertyIndex,
  dashboard: primaryDashboard,
  reports: primaryReports,
};

// ---------------------------------------------------------------------------
// Secondary tenants — settings only (empty operational data). These exercise
// the super-admin views and the tenant-settings surface for other plans.
// ---------------------------------------------------------------------------

const emptyDashboard: DashboardSummary = {
  properties: 0,
  totalRooms: 0,
  occupiedRooms: 0,
  monthlyRevenue: 0,
  outstanding: 0,
  overdueInvoices: 0,
  recentPayments: [],
  revenueTrend: [],
};

const emptyReports: ReportBundle = {
  occupancyByProperty: [],
  revenueByMonth: [],
  agingBuckets: [],
  channelBreakdown: [],
};

const secondaryTenantSettings: TenantSettings[] = [
  {
    id: "tenant-griya-asri",
    name: "Griya Asri Kost",
    subdomain: "griyaasri",
    plan: "starter",
    status: "trial",
    brandColor: "#C77D3A",
    timezone: "Asia/Jakarta",
    locale: "id-ID",
    waTemplates: {
      invoiceIssued:
        "Halo {nama}, tagihan {jumlah} telah terbit. Jatuh tempo {jatuh_tempo}.",
      paymentSuccess: "Terima kasih {nama}, pembayaran {jumlah} telah kami terima.",
      reminder: "Pengingat: tagihan {jumlah} jatuh tempo {jatuh_tempo}.",
    },
    trialEndsAt: "2025-03-01",
  },
  {
    id: "tenant-pondok-indah",
    name: "Pondok Indah Residence",
    subdomain: "pondokindah",
    plan: "enterprise",
    status: "aktif",
    brandColor: "#1F5C8B",
    timezone: "Asia/Jakarta",
    locale: "id-ID",
    waTemplates: {
      invoiceIssued:
        "Halo {nama}, tagihan {jumlah} telah terbit. Jatuh tempo {jatuh_tempo}.",
      paymentSuccess: "Terima kasih {nama}, pembayaran {jumlah} telah kami terima.",
      reminder: "Pengingat: tagihan {jumlah} jatuh tempo {jatuh_tempo}.",
    },
  },
  {
    id: "tenant-mawar-kos",
    name: "Mawar Kos Eksklusif",
    subdomain: "mawarkos",
    plan: "pro",
    status: "ditangguhkan",
    brandColor: "#8B2F4F",
    timezone: "Asia/Jakarta",
    locale: "id-ID",
    waTemplates: {
      invoiceIssued:
        "Halo {nama}, tagihan {jumlah} telah terbit. Jatuh tempo {jatuh_tempo}.",
      paymentSuccess: "Terima kasih {nama}, pembayaran {jumlah} telah kami terima.",
      reminder: "Pengingat: tagihan {jumlah} jatuh tempo {jatuh_tempo}.",
    },
  },
  {
    id: "tenant-sentosa",
    name: "Sentosa Boarding House",
    subdomain: "sentosa",
    plan: "starter",
    status: "berhenti",
    brandColor: "#4F6B3A",
    timezone: "Asia/Jakarta",
    locale: "id-ID",
    waTemplates: {
      invoiceIssued:
        "Halo {nama}, tagihan {jumlah} telah terbit. Jatuh tempo {jatuh_tempo}.",
      paymentSuccess: "Terima kasih {nama}, pembayaran {jumlah} telah kami terima.",
      reminder: "Pengingat: tagihan {jumlah} jatuh tempo {jatuh_tempo}.",
    },
  },
];

/** All tenant seeds keyed by tenant id; primary is richly populated. */
export const TENANT_SEEDS: Record<UUID, TenantSeed> = {
  [PRIMARY_TENANT_ID]: PRIMARY_TENANT_SEED,
  ...Object.fromEntries(
    secondaryTenantSettings.map((settings) => [
      settings.id,
      {
        settings,
        properties: [],
        rooms: [],
        residents: [],
        contracts: [],
        invoices: [],
        invoicePropertyIndex: {},
        dashboard: emptyDashboard,
        reports: emptyReports,
      } satisfies TenantSeed,
    ]),
  ),
};

// ---------------------------------------------------------------------------
// Super-admin platform views.
// ---------------------------------------------------------------------------

/** One row per tenant for the super-admin tenant table. */
export const TENANT_SAAS_SUMMARIES: TenantSaasSummary[] = [
  {
    id: PRIMARY_TENANT_ID,
    name: "Kos Bunga Melati",
    plan: "pro",
    status: "aktif",
    rooms: 16,
    mrr: 499_000,
    joinedAt: "2024-06-15",
  },
  {
    id: "tenant-griya-asri",
    name: "Griya Asri Kost",
    plan: "starter",
    status: "trial",
    rooms: 8,
    mrr: 0,
    joinedAt: "2025-02-15",
  },
  {
    id: "tenant-pondok-indah",
    name: "Pondok Indah Residence",
    plan: "enterprise",
    status: "aktif",
    rooms: 120,
    mrr: 1_999_000,
    joinedAt: "2023-11-02",
  },
  {
    id: "tenant-mawar-kos",
    name: "Mawar Kos Eksklusif",
    plan: "pro",
    status: "ditangguhkan",
    rooms: 24,
    mrr: 499_000,
    joinedAt: "2024-03-20",
  },
  {
    id: "tenant-sentosa",
    name: "Sentosa Boarding House",
    plan: "starter",
    status: "berhenti",
    rooms: 6,
    mrr: 0,
    joinedAt: "2024-01-10",
  },
];

/** Platform-wide metrics for the super-admin dashboard. */
export const PLATFORM_METRICS: PlatformMetrics = {
  mrr: 2_997_000,
  activeTenants: 2,
  trialTenants: 1,
  churnPct: 4.2,
  failedWebhooks: 3,
  mrrTrend: [
    { month: "2024-09", amount: 1_998_000 },
    { month: "2024-10", amount: 2_198_000 },
    { month: "2024-11", amount: 2_497_000 },
    { month: "2024-12", amount: 2_497_000 },
    { month: "2025-01", amount: 2_698_000 },
    { month: "2025-02", amount: 2_997_000 },
  ],
};
