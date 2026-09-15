# Setup POS Sheets + Apps Script

Sistem ini mengganti hardcode di `index.html` dengan **Google Sheets sebagai database** dan **Apps Script sebagai API + UI**.

## Yang didapat

- Menu, settings toko, rekening, QRIS dinamis dari sheet **aktif**
- Simpan pesanan ke sheet `Orders` (dengan **LockService** + **idempotency key** → aman dari race / double-submit)
- Offline-first: cache menu/settings + antrean sync
- Indikator Online / Offline
- Halaman order publik + dashboard login (owner / kasir)
- Toast menggantikan `alert()`
- Siap dijual ulang: tiap klien = 1 Spreadsheet + 1 Apps Script

## 1) Buat Spreadsheet

1. Buat Google Sheet baru (contoh: `POS Ayam Gepuk Bu Leny`)
2. Extensions → **Apps Script**
3. Hapus `Code.gs` default, lalu salin semua file dari folder `appscript/`:
   - `appsscript.json` (Project Settings → Show `appsscript.json`)
   - `Config.gs`, `Sheets.gs`, `Auth.gs`, `Setup.gs`, `Code.gs`, `Photos.gs`
   - HTML: `Index.html`, `Dashboard.html`, `Styles.html`, `Common.html`, `OrderApp.html`, `DashboardApp.html`
4. Di editor Apps Script, jalankan fungsi **`setupWorkbook`** (pilih di dropdown → Run)
5. Izinkan permission Google Sheets saat diminta

Seed default sudah sesuai data toko kamu (nama, wallet, rekening, QRIS Drive, menu).

### Atau import CSV

Folder `sample-data/` berisi:

- `Settings.csv`
- `Menu.csv`

Buat sheet bernama tepat: `Settings`, `Menu`, `Orders`, `Users` lalu paste/import.

## 2) Sheet yang dipakai (aktif saja)

| Sheet | Fungsi |
|---|---|
| `Settings` | `setting_key` / `setting_value` (nama toko, rekening, QRIS, WA) |
| `Menu` | daftar menu aktif |
| `Orders` | database pesanan |
| `Users` | login owner/kasir |

### Settings keys

| key | contoh |
|---|---|
| `store_name` | Ayam Gepuk Bu Leny |
| `logo_url` | `assets/brand/logo.jpg` atau link Drive logo |
| `wallet_number` | 082210403837 (DANA/Gopay/Shopeepay) |
| `rek_mandiri` | Bank Mandiri ... |
| `rek_permata` | Bank Permata ... |
| `rek_jago` | Bank Jago ... |
| `qris_url` | link Drive file QRIS |
| `wa_number` | `6282210403837` (format internasional, tanpa +) |
| `menu_photos_folder_id` | ID folder Drive berisi foto menu |
| `menu_photos_folder_url` | (opsional) URL folder Drive |
| `menu_photos_base_url` | URL GitHub Pages (agar `assets/menu/...` jalan dari Apps Script) |
| `settings_version` | auto (jangan diedit manual kecuali perlu) |

### Foto menu

Ada 2 cara (bisa digabung):

**A. Upload ke website (GitHub Pages)**  
1. Taruh file di `assets/menu/` dengan nama ID menu: `m01.jpg`, `m02.webp`, dst.  
2. Isi kolom `Menu.image_url` = `assets/menu/m01.jpg` (atau kosongkan — otomatis dicari).  
3. Commit & push. Lihat `assets/menu/README.md`.

**B. Satu folder Google Drive**  
1. Upload foto ke 1 folder Drive, nama file = ID menu (`m01.jpg`).  
2. Share folder **Anyone with the link**.  
3. Isi `menu_photos_folder_id` (atau URL folder).  
4. Dashboard owner → **Sync foto dari Drive** (atau jalankan `syncMenuPhotosFromDrive`).  
5. Kolom `image_url` terisi otomatis.

Placeholder abu-abu muncul jika foto belum ada.

### QRIS dinamis

Isi `qris_url` dengan link Drive (view link boleh). Script otomatis konversi ke URL gambar.

**Penting:** file QRIS di Drive harus di-share **Anyone with the link** (Viewer), kalau tidak gambar tidak muncul.

### Users (default setelah setup)

| username | password | role |
|---|---|---|
| `owner` | `owner123` | owner (settings + menu + laporan) |
| `kasir` | `kasir123` | kasir (order + laporan) |

Ganti password: jalankan `hashPasswordForSheet('passwordBaru')` di Apps Script, lalu paste hasil hash ke kolom `password_hash`.

## 3) Deploy Web App

1. Deploy → **New deployment**
2. Type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. Deploy → salin URL (`https://script.google.com/macros/s/.../exec`)

Buka:

- Order: `URL`
- Dashboard: `URL?page=dashboard`

Setiap update kode: Deploy → **Manage deployments** → pensil → **New version**.

## 4) GitHub Pages (opsional)

Repo ini tetap bisa di GitHub Pages:

1. Salin `web/config.example.js` → `web/config.js`
2. Isi `SCRIPT_URL` dengan URL Web App
3. Halaman:
   - `/` atau `index.html` → order
   - `/dashboard.html` → dashboard

Tanpa `SCRIPT_URL`, UI tetap tampil dari **cache/fallback lokal**, tapi simpan database butuh Apps Script.

## 5) Race conditions & offline

- **LockService** saat create order / update settings / upsert menu
- **Idempotency key** per submit → refresh/double-click tidak dobel order
- **settings_version** (optimistic lock) saat owner simpan settings
- Harga order divalidasi ulang dari sheet Menu (bukan percaya harga client)
- Offline: pesanan masuk `localStorage` queue → auto flush saat online
- Indikator status + soft ping 30 detik

## 6) Jual ke klien lain

Checklist handoff:

1. Duplikasi Spreadsheet template
2. Bind / copy project Apps Script
3. Jalankan `setupWorkbook`
4. Ganti `PASSWORD_SALT` di `Config.gs` (opsional tapi disarankan)
5. Ganti password owner/kasir
6. Isi Settings + QRIS milik klien
7. Deploy Web App baru → kirim URL ke klien
8. (Opsional) arahkan domain / GitHub Pages mereka ke `SCRIPT_URL` yang sama

## Troubleshooting

| Gejala | Cek |
|---|---|
| CORS / fetch gagal | Pastikan request `Content-Type: text/plain` (sudah di `Common.html`) dan deployment **Anyone** |
| QRIS blank | Share Drive file public + pastikan ID file benar |
| Login gagal | Pastikan `Users.password_hash` dari `hashPasswordForSheet` |
| Order dobel | Jangan hapus `idempotency_key`; client sudah generate UUID baru tiap submit sukses |
| Settings conflict | Owner lain sudah simpan; refresh dashboard lalu edit ulang |
