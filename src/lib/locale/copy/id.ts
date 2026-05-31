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
 *
 * Requirement: 21.5
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
} as const;

/** Static type derived from the {@link copy} dictionary. */
export type Copy = typeof copy;

export default copy;
