/**
 * Bahasa Indonesia copy dictionary — Task 2.5
 * -------------------------------------------
 * The single source of truth for user-facing strings. Surfaces and shared
 * primitives (loading/empty/not-found states, forms, buttons) pull their copy
 * from here so wording stays consistent and reviewable in one place.
 *
 * The object is frozen with `as const` and the {@link Copy} type is derived
 * from it, giving call sites autocomplete and compile-time safety against
 * typos or missing keys.
 *
 * Organized into namespaces:
 *   - `umum`   general/loading-state strings
 *   - `error`  error + not-found state strings
 *   - `kosong` empty-state titles/descriptions per surface
 *   - `validasi` generic form-validation messages
 *   - `aksi`   common action / button labels
 *   - `rbac`   visual role-based access (RBAC) strings
 *
 * Requirement: 21.5, 20.3
 */

export const copy = {
  /** General-purpose and loading-state strings. */
  umum: {
    appName: "KosKita",
    memuat: "Memuat…",
    memuatData: "Memuat data…",
    menyimpan: "Menyimpan…",
    mohonTunggu: "Mohon tunggu sebentar.",
    tidakAdaData: "Belum ada data.",
  },

  /** Error and "not found" state strings. */
  error: {
    judulUmum: "Terjadi kesalahan",
    deskripsiUmum: "Maaf, terjadi kesalahan. Silakan coba lagi.",
    cobaLagi: "Coba lagi",
    tidakDitemukanJudul: "Tidak ditemukan",
    tidakDitemukanDeskripsi:
      "Halaman atau data yang Anda cari tidak ditemukan atau sudah tidak tersedia.",
    tidakDitemukanKembali: "Kembali ke beranda",
  },

  /** Empty-state copy per surface (illustration keys mirror `EmptyState`). */
  kosong: {
    kamar: {
      judul: "Belum ada kamar",
      deskripsi: "Tambahkan kamar pertama untuk mulai mengelola unit di properti ini.",
    },
    penghuni: {
      judul: "Belum ada penghuni",
      deskripsi: "Data penghuni akan muncul di sini setelah Anda menambahkannya.",
    },
    tagihan: {
      judul: "Belum ada tagihan",
      deskripsi: "Buat tagihan pertama untuk mulai menagih pembayaran penghuni.",
    },
    laporan: {
      judul: "Belum ada data laporan",
      deskripsi: "Laporan akan tampil setelah ada transaksi pada periode yang dipilih.",
    },
    umum: {
      judul: "Belum ada data",
      deskripsi: "Data akan muncul di sini setelah tersedia.",
    },
  },

  /** Generic form-validation messages in Bahasa Indonesia. */
  validasi: {
    wajibDiisi: "Wajib diisi.",
    tidakBolehKosong: "Tidak boleh kosong.",
    emailTidakValid: "Format email tidak valid.",
    passwordMinimal: "Kata sandi minimal 8 karakter.",
    angkaTidakValid: "Masukkan angka yang valid.",
    nilaiNegatif: "Nilai tidak boleh negatif.",
    nilaiTidakBulat: "Nilai harus berupa angka bulat (tanpa desimal).",
    ktpTidakValid: "Nomor KTP harus terdiri dari 16 digit angka.",
    teleponTidakValid: "Nomor telepon tidak valid.",
    subdomainTidakValid:
      "Subdomain hanya boleh huruf kecil, angka, dan tanda hubung (3–30 karakter).",
    tanggalTidakValid: "Tanggal tidak valid.",
    rentangTanggalTidakValid: "Tanggal selesai harus setelah tanggal mulai.",
  },

  /** Common action / button labels. */
  aksi: {
    simpan: "Simpan",
    batal: "Batal",
    hapus: "Hapus",
    ubah: "Ubah",
    tambah: "Tambah",
    tutup: "Tutup",
    kembali: "Kembali",
    lanjut: "Lanjut",
    selesai: "Selesai",
    cari: "Cari",
    filter: "Filter",
    lihatDetail: "Lihat detail",
  },

  /** Visual role-based access (RBAC) strings — Requirement 20.3. */
  rbac: {
    /** Tooltip shown on Owner-only actions disabled for other roles. */
    hanyaUntukPemilik: "Hanya untuk Pemilik",
  },

  /** Five-step onboarding wizard copy — Requirement 7. */
  onboarding: {
    /** Step 1 — light account/welcome confirmation. */
    daftar: {
      judul: "Selamat datang di KosKita",
      deskripsi:
        "Sedikit lagi kos Anda siap dikelola secara digital. Konfirmasi nama Anda untuk memulai.",
      namaLabel: "Nama Anda",
      namaPlaceholder: "Nama lengkap Anda",
    },
    /** Step 2 — plan selection. */
    paket: {
      judul: "Pilih Paket",
      deskripsi:
        "Pilih paket yang sesuai dengan kebutuhan Anda. Anda bisa upgrade kapan saja.",
      perBulan: "/bulan",
      populer: "Populer",
    },
    /** Step 3 — first property form. */
    properti: {
      judul: "Buat Properti",
      deskripsi: "Masukkan informasi properti kos pertama Anda.",
      namaLabel: "Nama Properti",
      namaPlaceholder: "Contoh: Kos Bunga Melati",
      alamatLabel: "Alamat",
      alamatPlaceholder: "Jl. Contoh No. 123",
      kotaLabel: "Kota",
      kotaPlaceholder: "Contoh: Jakarta Selatan",
      jumlahKamarLabel: "Jumlah Kamar",
      jumlahKamarPlaceholder: "Contoh: 10",
      jumlahKamarTidakValid: "Masukkan jumlah kamar yang valid.",
      tipeLabel: "Tipe Kamar",
      tipePlaceholder: "Contoh: Standar / Eksklusif",
      hargaLabel: "Harga Sewa per Bulan",
      hargaPlaceholder: "Contoh: 1.500.000",
    },
    /** Step 4 — payment gateway connection stub. */
    pembayaran: {
      judul: "Hubungkan Pembayaran",
      deskripsi:
        "Pilih gateway pembayaran untuk menerima pembayaran dari penghuni kos Anda.",
      hubungkan: "Hubungkan",
      menghubungkan: "Menghubungkan…",
      terhubungSuffix: "terhubung",
      qrisAktif: "QRIS aktif secara default untuk semua bank & e-wallet.",
    },
    /** Step 5 — invite staff. */
    tim: {
      judul: "Undang Staff",
      deskripsi:
        "Undang anggota tim Anda untuk membantu mengelola kos. Anda bisa melewati langkah ini dan mengundang nanti.",
      tambahEmail: "Tambah email",
      emailPlaceholder: "nama@email.com",
      lewati: "Lewati",
    },
    /** Post-completion trial banner shown on the dashboard. */
    trial: {
      prefix: "Masa coba gratis berakhir dalam",
      hari: "hari",
      tutup: "Tutup pemberitahuan",
    },
  },
} as const;

/** Static type derived from the {@link copy} dictionary. */
export type Copy = typeof copy;

export default copy;
