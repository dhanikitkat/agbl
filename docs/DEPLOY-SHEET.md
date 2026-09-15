# Deploy ke Spreadsheet kamu

## Target
- **Spreadsheet:** https://docs.google.com/spreadsheets/d/11rRX_69jGmqu7AgKJod7yx1XXh1FvAMy8QZU149NSoY/edit
- **Folder Drive foto/logo:** https://drive.google.com/drive/folders/1FO1qFwt0zzeCLzt_wSydaDlzV2TeI9ax

Folder ID sudah di-seed di Settings (`menu_photos_folder_id`). **Mau ganti folder?** cukup edit value di sheet `Settings` (atau Dashboard → Settings), lalu klik **Sync foto dari Drive**.

## Opsi A — Manual (paling cepat, 5 menit)

1. Buka [spreadsheet](https://docs.google.com/spreadsheets/d/11rRX_69jGmqu7AgKJod7yx1XXh1FvAMy8QZU149NSoY/edit)
2. **Extensions → Apps Script**
3. Hapus `Code.gs` default
4. Buat file-file berikut (salin dari folder `appscript/` di repo):

| Jenis | File |
|---|---|
| JSON | `appsscript.json` (Project Settings → Show "appsscript.json") |
| .gs | `Config.gs`, `Sheets.gs`, `Auth.gs`, `Setup.gs`, `Code.gs`, `Photos.gs` |
| .html | `Index.html`, `Dashboard.html`, `Styles.html`, `Common.html`, `OrderApp.html`, `DashboardApp.html` |

5. Jalankan **`setupWorkbook`** → Allow permissions  
6. (Opsional) Jalankan **`syncMenuPhotosFromDrive`** setelah foto di folder Drive dinamai `m01.jpg`, `logo.jpg`, dst.  
7. **Deploy → New deployment → Web app**  
   - Execute as: **Me**  
   - Who has access: **Anyone**  
8. Salin URL → isi `web/config.js` → `SCRIPT_URL`

## Opsi B — clasp (dari mesin yang sudah login Google)

```bash
chmod +x docs/deploy-to-sheet.sh
./docs/deploy-to-sheet.sh
```

Lalu lanjut langkah 5–8 di atas (setupWorkbook + Deploy).

## Ganti folder Drive nanti

Di sheet **Settings**:

| setting_key | setting_value |
|---|---|
| `menu_photos_folder_id` | ID folder baru |
| `menu_photos_folder_url` | URL folder (opsional) |

Atau Dashboard (login owner) → Settings → field folder → Simpan → **Sync foto dari Drive**.

## Nama file di folder Drive

- Menu: `m01.jpg`, `m02.webp`, … (pakai ID menu)
- Logo: `logo.jpg` (atau `logo.png`) → otomatis isi `logo_url` saat sync
