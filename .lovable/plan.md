# Rencana: PowerPoint Presentasi Aplikasi Sistem Inventaris Sarpras Sekolah

Saya akan membuat file `.pptx` yang siap diunduh, berisi paparan lengkap tiga tahap pengerjaan (Analisis Kebutuhan, Ideasi, Prototipe) untuk aplikasi Sistem Inventaris Sarana & Prasarana Sekolah yang sudah dibangun.

## Struktur Slide (±18 slide)

**Pembuka**
1. Cover — judul aplikasi "Sistem Inventaris Sarpras Sekolah", subtitle Design Thinking Process
2. Daftar Isi / 3 Tahapan

**Tahap 1 — Analisis Kebutuhan**
3. Latar Belakang Masalah (pengelolaan aset sekolah masih manual, data tersebar, sulit pelaporan)
4. Target Pengguna (Admin, Petugas Sarpras, Guru, Kepala Sekolah) — kartu per peran
5. Pain Point Pengguna (per peran, ikon + deskripsi)
6. Rumusan Masalah
7. How Might We (3-4 pertanyaan HMW)

**Tahap 2 — Ideasi**
8. Metode yang digunakan (Brainstorming + Mind Mapping + SCAMPER)
9. Mind Map / Brainstorming (diagram cabang fitur)
10. 3 Ide Solusi (Aplikasi Web Terpusat / Spreadsheet Bersama / Aplikasi Mobile-only) — tabel perbandingan
11. Alasan Memilih Ide Terbaik (web responsif + role-based)
12. Deskripsi Konsep Produk

**Tahap 3 — Prototipe**
13. Jenis Prototipe (Low-Fi & High-Fi)
14. Low-Fidelity — wireframe sketsa (ASCII/shape) Dashboard & Items
15. High-Fidelity — screenshot/mockup Dashboard
16. High-Fidelity — Inventaris & Peminjaman
17. Alur Penggunaan (flow: Login → Role-based menu → Transaksi → Laporan)
18. Fitur Utama (Dashboard, Items, Loans, Maintenance, Reports, Users) — grid ikon
19. Penutup / Terima Kasih

## Teknis Pembuatan
- Tools: `pptxgenjs` (Node) sesuai skill PPTX bawaan
- Palet warna: **Midnight Executive** — navy `#1E2761`, ice blue `#CADCFC`, gold accent `#D4AF37` (selaras tema sekolah profesional aplikasi)
- Font: Georgia (heading) + Calibri (body)
- Resolusi 1920×1080 (16:9), title 44-54pt, body 22-28pt
- Tidak ada underline aksen di bawah judul; pakai whitespace
- Screenshot Hi-Fi: render via `browser--view_preview` halaman `/`, `/items`, `/loans`, simpan PNG, embed base64
- QA: konversi ke PDF via LibreOffice → render setiap slide ke JPG → inspeksi visual (overflow, kontras, overlap) → perbaiki → re-render
- Output: `/mnt/documents/Sistem-Inventaris-Sarpras-DesignThinking.pptx`

## Deliverable
Satu file PPTX siap unduh via `<presentation-artifact>` tag. Tidak ada perubahan kode aplikasi.

Setujui untuk saya mulai mengerjakan?
