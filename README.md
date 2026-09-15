# Ayam Gepuk Bu Leny — POS (Sheets + Apps Script)

Website order makanan yang sebelumnya hardcode di HTML, sekarang terhubung ke **Google Sheets** via **Apps Script**.

## Fitur

- Menu, rekening, QRIS, WhatsApp dari sheet `Settings` / `Menu`
- Database pesanan di sheet `Orders`
- Offline-first + indikator online/offline
- Dashboard owner/kasir (performa, pesanan, kasir cepat, kelola settings/menu)
- Race-safe: LockService + idempotency + settings version
- UI toast (bukan `alert`)

## Mulai cepat

Baca panduan lengkap: **[docs/SETUP.md](docs/SETUP.md)**  
Deploy ke spreadsheet Bu Leny: **[docs/DEPLOY-SHEET.md](docs/DEPLOY-SHEET.md)**

Ringkas:

1. Buat Spreadsheet → Extensions → Apps Script
2. Salin isi folder `appscript/`
3. Jalankan `setupWorkbook`
4. Deploy sebagai Web App (Anyone)
5. (Opsional) isi `web/config.js` → `SCRIPT_URL` untuk GitHub Pages

## Struktur

```
appscript/     # source deploy ke Google Apps Script
web/           # config + assets untuk GitHub Pages
sample-data/   # CSV Settings & Menu
docs/SETUP.md  # panduan setup & jual ke klien
index.html     # halaman order (GitHub Pages)
dashboard.html # dashboard login
```

Default login setelah setup: `owner` / `owner123` dan `kasir` / `kasir123`.
