"use client";

import { Crown, Settings, Trash2, Upload, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/brand";
import { CardSkeleton, FadeIn } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TenantSettings } from "@/lib/data";
import copy from "@/lib/locale/copy/id";
import { subdomainSchema } from "@/lib/schemas";
import { OwnerAction } from "@/lib/tenant";
import { getTenantSettings, updateTenantSettings } from "./actions";

/**
 * Tenant Settings Page — Task 20
 * -------------------------------
 * Tabs: Profil Bisnis, Pembayaran, Template WhatsApp, Tim, Langganan, Lanjutan.
 * Brand color edits update a live payment-page preview. WhatsApp templates
 * with variable chips and live preview. RBAC-gated advanced actions.
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 20.2, 20.3
 */

export default function PengaturanPage() {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [totalRooms, setTotalRooms] = useState<number>(0);

  useEffect(() => {
    getTenantSettings().then(setSettings);
    // Fetch total room count from properties for the Langganan tab
    import("../properti/actions").then(({ listProperties }) =>
      listProperties().then((properties) => {
        const total = properties.reduce((sum, p) => sum + p.totalRooms, 0);
        setTotalRooms(total);
      }),
    );
  }, []);

  if (!settings) {
    return (
      <section className="flex flex-col gap-6">
        <h1 className="font-display text-xl font-semibold text-foreground">Pengaturan</h1>
        <CardSkeleton />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-display text-xl font-semibold text-foreground">Pengaturan</h1>

      <FadeIn>
        <Tabs defaultValue="profil" className="w-full">
          <div className="overflow-x-auto">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="profil">Profil Bisnis</TabsTrigger>
              <TabsTrigger value="pembayaran">Pembayaran</TabsTrigger>
              <TabsTrigger value="whatsapp">Template WA</TabsTrigger>
              <TabsTrigger value="tim">Tim</TabsTrigger>
              <TabsTrigger value="langganan">Langganan</TabsTrigger>
              <TabsTrigger value="lanjutan">Lanjutan</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="profil" className="mt-4">
            <ProfilBisnisTab settings={settings} onSettingsChange={setSettings} />
          </TabsContent>

          <TabsContent value="pembayaran" className="mt-4">
            <PembayaranTab />
          </TabsContent>

          <TabsContent value="whatsapp" className="mt-4">
            <WhatsAppTemplateTab settings={settings} />
          </TabsContent>

          <TabsContent value="tim" className="mt-4">
            <TimTab />
          </TabsContent>

          <TabsContent value="langganan" className="mt-4">
            <LanggananTab settings={settings} currentRooms={totalRooms} />
          </TabsContent>

          <TabsContent value="lanjutan" className="mt-4">
            <LanjutanTab />
          </TabsContent>
        </Tabs>
      </FadeIn>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Profil Bisnis Tab                                                            */
/* -------------------------------------------------------------------------- */

function ProfilBisnisTab({
  settings,
  onSettingsChange,
}: {
  settings: TenantSettings;
  onSettingsChange: (s: TenantSettings) => void;
}) {
  const [brandColor, setBrandColor] = useState(settings.brandColor);
  const [name, setName] = useState(settings.name);
  const [subdomain, setSubdomain] = useState(settings.subdomain);
  const [subdomainError, setSubdomainError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleColorChange(color: string) {
    setBrandColor(color);
    onSettingsChange({ ...settings, brandColor: color });
  }

  function handleSubdomainChange(value: string) {
    setSubdomain(value);
    const result = subdomainSchema.safeParse(value);
    setSubdomainError(result.success ? null : (result.error.issues[0]?.message ?? null));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateTenantSettings({ name, brandColor });
      onSettingsChange({ ...settings, name, brandColor });
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Form */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">Informasi Bisnis</h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bizName" className="text-sm font-medium text-foreground">
              Nama Bisnis
            </label>
            <Input id="bizName" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="subdomain" className="text-sm font-medium text-foreground">
              Subdomain
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="subdomain"
                value={subdomain}
                onChange={(e) => handleSubdomainChange(e.target.value)}
                placeholder="kosbunga"
                className="w-48"
              />
              <span className="text-sm text-muted-foreground">.koskita.id</span>
            </div>
            {subdomainError && (
              <p className="text-xs text-destructive">{subdomainError}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Logo</span>
            <div className="flex items-center justify-center rounded-input border-2 border-dashed border-line bg-muted/30 px-4 py-8">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="lucide size-5" />
                <span className="text-xs">Unggah logo (PNG, SVG)</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="brandColor" className="text-sm font-medium text-foreground">
              Warna Brand
            </label>
            <div className="flex items-center gap-3">
              <input
                id="brandColor"
                type="color"
                value={brandColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-badge border border-line"
              />
              <Input
                value={brandColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-32 font-mono text-sm"
                maxLength={7}
              />
              {/* Preset swatches */}
              <div className="flex gap-1.5">
                {["#2F6B4F", "#C77D3A", "#1F5C8B", "#8B2F4F"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleColorChange(c)}
                    className="size-6 rounded-full border border-line transition-transform hover:scale-110"
                    style={{ backgroundColor: c }}
                    aria-label={`Pilih warna ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <Button className="self-start mt-2" onClick={handleSave} disabled={saving}>
            {saving ? "Menyimpan…" : copy.aksi.simpan}
          </Button>
        </CardContent>
      </Card>

      {/* Live Payment Page Preview */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">
            Preview Halaman Pembayaran
          </h2>
        </CardHeader>
        <CardContent>
          <div className="rounded-card border border-line overflow-hidden">
            {/* Header preview */}
            <div
              className="px-4 py-3 text-white text-sm font-medium"
              style={{ backgroundColor: brandColor }}
            >
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-full bg-white/20" />
                <span>{name || "Nama Bisnis"}</span>
              </div>
            </div>
            {/* Body preview */}
            <div className="p-4 space-y-3 bg-paper-50">
              <div className="h-3 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
              <div className="h-8 w-full rounded bg-muted/50" />
              <div
                className="h-9 w-full rounded-input flex items-center justify-center text-white text-xs font-medium"
                style={{ backgroundColor: brandColor }}
              >
                Bayar Sekarang
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Tampilan header dan tombol akan menggunakan warna brand Anda.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pembayaran Tab                                                               */
/* -------------------------------------------------------------------------- */

function PembayaranTab() {
  const [channels, setChannels] = useState({
    qris: true,
    va: true,
    ewallet: true,
    retail: false,
    manual: false,
  });
  const [feeBearer, setFeeBearer] = useState<"pemilik" | "penghuni" | "split">("pemilik");

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-foreground">Channel Pembayaran</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {/* Channel toggles */}
        <div className="flex flex-col gap-3">
          <ChannelToggle
            label="QRIS"
            description="Semua bank & e-wallet"
            checked={channels.qris}
            disabled
            onChange={() => {}}
          />
          <ChannelToggle
            label="Virtual Account (VA)"
            description="BCA, Mandiri, BNI, BRI"
            checked={channels.va}
            onChange={(v) => setChannels((c) => ({ ...c, va: v }))}
          />
          <ChannelToggle
            label="E-Wallet"
            description="GoPay, OVO, DANA, ShopeePay"
            checked={channels.ewallet}
            onChange={(v) => setChannels((c) => ({ ...c, ewallet: v }))}
          />
          <ChannelToggle
            label="Retail (Alfamart/Indomaret)"
            description="Bayar di gerai retail"
            checked={channels.retail}
            onChange={(v) => setChannels((c) => ({ ...c, retail: v }))}
          />
          <ChannelToggle
            label="Transfer Manual"
            description="Upload bukti transfer bank"
            checked={channels.manual}
            onChange={(v) => setChannels((c) => ({ ...c, manual: v }))}
          />
        </div>

        {/* Fee bearer */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">
            Biaya Admin Ditanggung
          </span>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            {(
              [
                { value: "pemilik", label: "Pemilik" },
                { value: "penghuni", label: "Penghuni" },
                { value: "split", label: "Split 50/50" },
              ] as const
            ).map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="feeBearer"
                  value={opt.value}
                  checked={feeBearer === opt.value}
                  onChange={() => setFeeBearer(opt.value)}
                  className="accent-brand-pandan-600"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChannelToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-input border border-line p-3 cursor-pointer hover:bg-muted/30 transition-colors">
      <div className="flex flex-col">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 accent-brand-pandan-600 rounded"
      />
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* WhatsApp Template Tab                                                        */
/* -------------------------------------------------------------------------- */

function WhatsAppTemplateTab({ settings }: { settings: TenantSettings }) {
  const [activeTemplate, setActiveTemplate] = useState<
    "invoiceIssued" | "paymentSuccess" | "reminder"
  >("invoiceIssued");
  const [templates, setTemplates] = useState(settings.waTemplates);
  const [saving, setSaving] = useState(false);

  const templateLabels = {
    invoiceIssued: "Tagihan Terbit",
    paymentSuccess: "Pembayaran Berhasil",
    reminder: "Pengingat",
  } as const;

  const variables = ["{nama}", "{jumlah}", "{jatuh_tempo}", "{kamar}", "{link}"];

  const sampleData: Record<string, string> = {
    "{nama}": "Budi Santoso",
    "{jumlah}": "Rp 1.250.000",
    "{jatuh_tempo}": "10 Feb 2025",
    "{kamar}": "A1",
    "{link}": "https://pay.koskita.id/INV-2025-0142",
  };

  function renderPreview(template: string): string {
    let result = template;
    for (const [key, value] of Object.entries(sampleData)) {
      result = result.replaceAll(key, value);
    }
    return result;
  }

  async function handleSaveTemplates() {
    setSaving(true);
    try {
      await updateTenantSettings({ waTemplates: templates });
    } catch (err) {
      console.error("Failed to save WA templates:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Editor */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">Template WhatsApp</h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Template selector */}
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(templateLabels) as Array<keyof typeof templateLabels>).map(
              (key) => (
                <Button
                  key={key}
                  variant={activeTemplate === key ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTemplate(key)}
                >
                  {templateLabels[key]}
                </Button>
              ),
            )}
          </div>

          {/* Variable chips */}
          <div className="flex flex-wrap gap-1.5">
            {variables.map((v) => (
              <Badge key={v} variant="secondary" className="cursor-pointer text-xs">
                {v}
              </Badge>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            value={templates[activeTemplate]}
            onChange={(e) =>
              setTemplates((t) => ({ ...t, [activeTemplate]: e.target.value }))
            }
            rows={5}
            className="w-full rounded-input border border-line bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />

          <Button className="self-start" onClick={handleSaveTemplates} disabled={saving}>
            {saving ? "Menyimpan…" : copy.aksi.simpan}
          </Button>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">Preview Pesan</h2>
        </CardHeader>
        <CardContent>
          <div className="rounded-card bg-[#DCF8C6] p-4 text-sm leading-relaxed">
            <p className="whitespace-pre-wrap">
              {renderPreview(templates[activeTemplate])}
            </p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Preview menggunakan data contoh. Variabel akan diganti dengan data asli saat
            pengiriman.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tim Tab                                                                      */
/* -------------------------------------------------------------------------- */

const MOCK_TEAM = [
  { name: "Andi Wijaya", email: "andi@kosbunga.id", role: "owner" as const },
  { name: "Rina Sari", email: "rina@kosbunga.id", role: "admin" as const },
  { name: "Dedi Kurniawan", email: "dedi@kosbunga.id", role: "staff" as const },
];

function TimTab() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Anggota Tim</h2>
        <Button variant="outline-ink" size="sm" iconLeft={UserPlus}>
          Undang Anggota
        </Button>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-line">
          {MOCK_TEAM.map((member) => (
            <div key={member.email} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-secondary">
                  <Users className="lucide size-4 text-brand-pandan-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
              </div>
              <Badge variant="secondary" className="capitalize text-xs">
                {member.role === "owner"
                  ? "Pemilik"
                  : member.role === "admin"
                    ? "Admin"
                    : "Staff"}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Langganan Tab                                                                */
/* -------------------------------------------------------------------------- */

function LanggananTab({
  settings,
  currentRooms,
}: {
  settings: TenantSettings;
  currentRooms: number;
}) {
  const planLabels: Record<string, string> = {
    starter: "Starter",
    pro: "Pro",
    enterprise: "Enterprise",
  };

  const planLimits: Record<string, number> = {
    starter: 15,
    pro: 50,
    enterprise: 999,
  };

  const roomLimit = planLimits[settings.plan] ?? 15;
  const usagePct = Math.min((currentRooms / roomLimit) * 100, 100);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-foreground">Langganan</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Crown className="lucide size-5 text-brand-kunyit" />
          <div>
            <p className="text-sm font-semibold">
              Paket {planLabels[settings.plan] ?? settings.plan}
            </p>
            <p className="text-xs text-muted-foreground">
              Status: <StatusBadge status={settings.status} />
            </p>
          </div>
        </div>

        {/* Room usage bar */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Penggunaan Kamar</span>
            <span className="font-mono text-xs tabular-nums">
              {currentRooms}/{roomLimit} kamar
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand-pandan-600 transition-all"
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </div>

        <Button variant="accent" className="self-start">
          Upgrade Paket
        </Button>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Lanjutan Tab                                                                 */
/* -------------------------------------------------------------------------- */

function LanjutanTab() {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-foreground">Pengaturan Lanjutan</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <OwnerAction>
          <Button variant="outline-ink" iconLeft={Settings}>
            Export Data
          </Button>
        </OwnerAction>

        <OwnerAction>
          <Button variant="danger" iconLeft={Trash2}>
            Hapus Akun
          </Button>
        </OwnerAction>

        <p className="text-xs text-muted-foreground">
          Tindakan di atas bersifat permanen dan hanya dapat dilakukan oleh Pemilik.
        </p>
      </CardContent>
    </Card>
  );
}
