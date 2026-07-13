## CashFlow — Fase 3 (Kustomisasi, CRUD, Keamanan, Anggaran)

### 1. Branding "CashFlow"
- Update judul, meta description, dan manifest (`__root.tsx`, `public/manifest.webmanifest`) menjadi "CashFlow — Pencatat Keuangan".
- Ganti header/label "Keuangan" → "CashFlow" di layout `_app.tsx` dan layar lock.

### 2. Icon PWA (orange → kuning + cahaya putih)
- Generate `public/icon-512.png` (premium, transparan) via imagegen dengan prompt: "app icon, glossy rounded-square, warm orange to yellow gradient with soft white glow at top, subtle wave/flow line resembling a cashflow arrow, minimal, premium finish".
- Buat `public/icon-192.png` (resize) dan `public/favicon.png`.
- Register di manifest + `<link rel="icon">` + `<link rel="apple-touch-icon">`.
- Hapus `public/favicon.ico` default.

### 3. Kategori kustom
- Perluas `src/lib/categories.ts`: baca/tulis kategori kustom ke IndexedDB `settings` (`custom-categories`).
- Buat hook `useCategories()` yang menggabungkan default + kustom.
- Tambah section di `_app.settings.tsx`: daftar kategori, tombol tambah (nama + emoji picker sederhana), hapus (khusus custom).
- Update `TxForm` untuk memakai `useCategories()`.

### 4. Edit & hapus transaksi
- Tambah `updateTransaction` di `db.ts`.
- Extend `TxForm` menerima `editing?: Transaction` untuk mode edit (pre-fill).
- Di `_app.history.tsx`: klik row → buka sheet detail dengan tombol **Edit** dan **Hapus** (konfirmasi).
- Perbarui `use-transactions.ts` dengan `update()` dan `remove()`.

### 5. Rate-limit PIN + Auto-lock
- Di `app-state.tsx`: simpan `failedAttempts` & `lockUntil` (in-memory + persist minimum).
- Aturan: 5 percobaan salah → cooldown 30 detik; 10 salah → 5 menit.
- Auto-lock: `setUnlocked(false)` setelah 5 menit idle atau saat `visibilitychange` hidden > 60 detik.
- `lock.tsx`: tampilkan countdown saat locked out; disable keypad.

### 6. Import data JSON/CSV
- Tambah `importJSON` & `importCSV` di `backup.ts` (validasi shape, dedupe by id, opsi merge/replace).
- Section "Impor" di `_app.settings.tsx`: file input + dropdown mode (Gabungkan/Ganti semua) + preview jumlah baris + tombol konfirmasi.
- Toast sukses/error via sonner.

### 7. Anggaran + notifikasi lewat batas
- Store baru di `db.ts`: `budgets` (key = kategori expense, value = { limit, period: "monthly" }).
- Section "Anggaran" di `_app.settings.tsx`: set limit per kategori pengeluaran.
- Widget di dashboard: progress bar per kategori dengan warna hijau/kuning/merah + persentase.
- Notifikasi: toast otomatis saat menambah transaksi yang melewati batas bulan berjalan ("Anggaran Makan terlampaui: Rp X dari Rp Y").
- Opsional (jika izin diberikan): Web Notification API saat >100% limit.

### Technical notes
- Semua fitur tetap offline-first (IndexedDB).
- Migrasi DB: naikkan `DB_VERSION` ke 2, tambah object store `budgets` di `upgrade()`.
- Tidak mengubah palet warna orange-kuning.
- File baru: `src/hooks/use-categories.ts`, `src/hooks/use-budgets.ts`, `src/components/tx-detail-sheet.tsx`, `src/components/budget-widget.tsx`.
- Icon dibuat premium 1024×1024 lalu di-resize ke 512/192/favicon via ImageMagick di sandbox.

### Urutan implementasi
1. Rename → CashFlow + icon PWA (fondasi visual)
2. DB migration + hooks (categories, budgets, tx CRUD)
3. UI Settings (kategori, anggaran, impor)
4. History detail sheet (edit/hapus)
5. Rate-limit + auto-lock
6. Budget widget + notifikasi

Setuju untuk dieksekusi?