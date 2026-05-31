import {
  Building2,
  ChevronDown,
  CreditCard,
  MessageCircle,
  PieChart,
  Receipt,
  Users,
} from "lucide-react";
import Link from "next/link";
import { BrandMark, RupiahText } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Marketing / Landing Page — Task 10.1
 * ------------------------------------
 * The public-facing root page at koskita.id. Editorial hero with the single
 * allowed pandan→teal gradient + anyaman motif, headline in Bricolage
 * Grotesque, primary CTA "Coba Gratis 14 Hari" in kunyit accent.
 *
 * Sections: hero, masalah→solusi, fitur unggulan, paket harga, testimoni,
 * FAQ, footer. Mobile-first; sticky slim header with CTA below mobile bp.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

/* -------------------------------------------------------------------------- */
/* Data                                                                       */
/* -------------------------------------------------------------------------- */

const PROBLEMS = [
  {
    title: "Pencatatan Manual",
    description:
      "Buku catatan dan spreadsheet yang berantakan, rawan hilang, dan sulit dilacak.",
  },
  {
    title: "Pembayaran Tidak Terpantau",
    description:
      "Sulit mengetahui siapa yang sudah bayar dan siapa yang menunggak setiap bulan.",
  },
  {
    title: "Tidak Ada Visibilitas",
    description:
      "Pemilik kos tidak punya gambaran real-time tentang okupansi dan pendapatan.",
  },
];

const FEATURES = [
  {
    icon: Receipt,
    title: "Tagihan Otomatis",
    description: "Generate tagihan bulanan secara otomatis untuk semua penghuni.",
  },
  {
    icon: CreditCard,
    title: "Pembayaran Digital",
    description: "Terima pembayaran via QRIS, VA, e-wallet, dan transfer bank.",
  },
  {
    icon: Building2,
    title: "Multi-Properti",
    description: "Kelola beberapa kos sekaligus dalam satu dashboard terpadu.",
  },
  {
    icon: PieChart,
    title: "Laporan & Analitik",
    description: "Pantau okupansi, pendapatan, dan tunggakan dengan grafik visual.",
  },
  {
    icon: MessageCircle,
    title: "Notifikasi WhatsApp",
    description: "Kirim pengingat tagihan dan konfirmasi pembayaran otomatis via WA.",
  },
  {
    icon: Users,
    title: "Manajemen Tim",
    description: "Undang admin dan staf dengan kontrol akses berbasis peran.",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: 99_000,
    description: "Untuk pemilik kos dengan 1 properti kecil.",
    features: [
      "Hingga 10 kamar",
      "Tagihan otomatis",
      "Pembayaran digital (QRIS)",
      "1 pengguna",
      "Laporan dasar",
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    price: 249_000,
    description: "Untuk pemilik kos yang berkembang.",
    features: [
      "Hingga 50 kamar",
      "Multi-properti (3 lokasi)",
      "Semua metode pembayaran",
      "5 pengguna + peran",
      "Laporan lengkap",
      "Notifikasi WhatsApp",
      "Kontrak digital",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: null,
    description: "Untuk jaringan kos besar.",
    features: [
      "Kamar tak terbatas",
      "Properti tak terbatas",
      "Pengguna tak terbatas",
      "API akses",
      "Dedicated support",
      "Custom branding",
    ],
    highlighted: false,
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Sejak pakai KosKita, saya tidak perlu lagi menagih satu per satu. Penghuni bayar sendiri lewat link pembayaran.",
    name: "Ibu Ratna",
    role: "Pemilik Kos Melati, Yogyakarta",
  },
  {
    quote:
      "Dashboard-nya sangat membantu. Saya bisa lihat langsung mana kamar yang kosong dan berapa tunggakan bulan ini.",
    name: "Pak Hendra",
    role: "Pemilik 3 Kos, Bandung",
  },
  {
    quote:
      "Staf saya sekarang bisa input data penghuni sendiri tanpa harus tanya saya terus. Peran aksesnya pas.",
    name: "Mbak Dian",
    role: "Pemilik Kos Putri, Malang",
  },
];

const FAQS = [
  {
    question: "Apakah ada biaya setup atau kontrak jangka panjang?",
    answer:
      "Tidak ada biaya setup. Anda bisa mulai dengan trial gratis 14 hari dan berlangganan bulanan tanpa kontrak jangka panjang.",
  },
  {
    question: "Bagaimana penghuni membayar sewa?",
    answer:
      "Penghuni menerima link pembayaran via WhatsApp atau SMS. Mereka bisa bayar lewat QRIS, transfer bank (VA), e-wallet, atau minimarket — tanpa perlu install aplikasi.",
  },
  {
    question: "Apakah data saya aman?",
    answer:
      "Ya. Data disimpan terenkripsi di server Indonesia. Setiap tenant terisolasi dan hanya bisa diakses oleh tim Anda.",
  },
  {
    question: "Bisa diakses dari HP?",
    answer:
      "Tentu. KosKita dirancang mobile-first — semua fitur bisa diakses dari browser HP tanpa perlu download aplikasi.",
  },
  {
    question: "Bagaimana jika saya punya lebih dari satu kos?",
    answer:
      "Paket Pro dan Enterprise mendukung multi-properti. Anda bisa kelola semua kos dari satu dashboard dengan data terpisah per lokasi.",
  },
];

/* -------------------------------------------------------------------------- */
/* Page Component                                                             */
/* -------------------------------------------------------------------------- */

export default function MarketingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Sticky mobile header */}
      <StickyHeader />

      {/* Hero */}
      <HeroSection />

      {/* Problem → Solution */}
      <ProblemSection />

      {/* Features */}
      <FeaturesSection />

      {/* Pricing */}
      <PricingSection />

      {/* Testimonials */}
      <TestimonialSection />

      {/* FAQ */}
      <FaqSection />

      {/* Footer */}
      <Footer />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sections                                                                   */
/* -------------------------------------------------------------------------- */

function StickyHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background/95 backdrop-blur-sm lg:relative lg:border-0">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 lg:h-16 lg:px-6">
        <BrandMark size="sm" />
        <Button variant="accent" size="sm" asChild>
          <Link href="/daftar">Coba Gratis 14 Hari</Link>
        </Button>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Gradient background accent */}
      <div className="absolute inset-0 bg-gradient-pandan opacity-[0.04]" />
      {/* Anyaman motif at low opacity */}
      <div className="absolute inset-0 bg-anyaman opacity-[0.03]" />

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 text-center lg:px-6 lg:pb-28 lg:pt-24">
        <h1 className="text-display mx-auto max-w-4xl font-bold text-foreground">
          Kelola Kos Anda <span className="text-gradient-pandan">Secara Digital</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground lg:text-xl">
          Platform manajemen kos modern untuk pemilik yang ingin menghemat waktu,
          mengurangi tunggakan, dan memantau bisnis dari mana saja.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button variant="accent" size="lg" asChild>
            <Link href="/daftar">Coba Gratis 14 Hari</Link>
          </Button>
          <Button variant="outline-ink" size="lg" asChild>
            <Link href="#fitur">Lihat Fitur</Link>
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Tanpa kartu kredit · Setup 5 menit · Batal kapan saja
        </p>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="border-t border-line bg-card py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-bold">Masalah yang Kami Selesaikan</h2>
          <p className="mt-3 text-muted-foreground">
            Mengelola kos secara manual membuang waktu dan uang Anda.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {PROBLEMS.map((problem) => (
            <div
              key={problem.title}
              className="rounded-card border border-line bg-background p-6"
            >
              <h3 className="text-base font-semibold">{problem.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{problem.description}</p>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-12 max-w-2xl text-center">
          <p className="text-lg font-medium text-foreground">
            KosKita mengubah semua itu menjadi{" "}
            <span className="text-gradient-pandan font-semibold">
              satu platform terpadu
            </span>{" "}
            yang bekerja untuk Anda.
          </p>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="fitur" className="py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-bold">Fitur Unggulan</h2>
          <p className="mt-3 text-muted-foreground">
            Semua yang Anda butuhkan untuk mengelola kos secara profesional.
          </p>
        </div>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-secondary">
                  <Icon className="lucide h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="harga" className="border-t border-line bg-card py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-bold">Paket Harga</h2>
          <p className="mt-3 text-muted-foreground">
            Pilih paket yang sesuai dengan skala bisnis kos Anda.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={
                plan.highlighted
                  ? "relative border-primary ring-1 ring-primary"
                  : undefined
              }
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-badge bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                  Populer
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                <div className="mt-4">
                  {plan.price !== null ? (
                    <span className="flex items-baseline gap-1">
                      <RupiahText amount={plan.price} size="xl" showSymbol />
                      <span className="text-sm text-muted-foreground">/bulan</span>
                    </span>
                  ) : (
                    <span className="text-xl font-semibold">Hubungi Kami</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="mt-0.5 text-success">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Button
                    variant={plan.highlighted ? "accent" : "outline-ink"}
                    size="md"
                    className="w-full"
                    asChild
                  >
                    <Link href="/daftar">
                      {plan.price !== null ? "Mulai Gratis" : "Hubungi Sales"}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialSection() {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-bold">Dipercaya Pemilik Kos</h2>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-card border border-line bg-card p-6">
              <p className="text-sm italic text-muted-foreground">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-4">
                <p className="text-sm font-medium text-foreground">{t.name}</p>
                <p className="text-caption text-muted-foreground">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="border-t border-line bg-card py-16 lg:py-24">
      <div className="mx-auto max-w-3xl px-4 lg:px-6">
        <div className="text-center">
          <h2 className="font-bold">Pertanyaan Umum</h2>
        </div>
        <div className="mt-12 space-y-0 divide-y divide-line">
          {FAQS.map((faq) => (
            <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group py-5">
      <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-foreground">
        {question}
        <ChevronDown className="lucide h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{answer}</p>
    </details>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line py-10">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <BrandMark size="sm" />
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="#fitur" className="hover:text-foreground">
              Fitur
            </Link>
            <Link href="#harga" className="hover:text-foreground">
              Harga
            </Link>
            <Link href="/masuk" className="hover:text-foreground">
              Masuk
            </Link>
            <Link href="/daftar" className="hover:text-foreground">
              Daftar
            </Link>
          </nav>
        </div>
        <div className="mt-8 border-t border-line pt-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} KosKita. Dibuat di Indonesia 🇮🇩</p>
        </div>
      </div>
    </footer>
  );
}
