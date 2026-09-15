#!/usr/bin/env bash
# Deploy POS ke spreadsheet Ayam Gepuk Bu Leny
# Spreadsheet: 11rRX_69jGmqu7AgKJod7yx1XXh1FvAMy8QZU149NSoY
# Folder foto: 1FO1qFwt0zzeCLzt_wSydaDlzV2TeI9ax
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SS_ID="11rRX_69jGmqu7AgKJod7yx1XXh1FvAMy8QZU149NSoY"
APP_DIR="$ROOT/appscript"

cd "$ROOT"
if [[ ! -d node_modules/@google/clasp ]]; then
  npm install @google/clasp --no-save
fi

echo "==> Login Google (browser)…"
npx clasp login

cd "$APP_DIR"
if [[ ! -f .clasp.json ]] || ! grep -q '"scriptId"' .clasp.json 2>/dev/null; then
  echo "==> Membuat Apps Script ter-bound ke spreadsheet…"
  npx clasp create --type sheets --title "POS Ayam Gepuk Bu Leny" --parentId "$SS_ID" --rootDir .
fi

echo "==> Push kode…"
npx clasp push -f

echo ""
echo "Lanjut di browser Apps Script:"
echo "1) Buka spreadsheet → Extensions → Apps Script"
echo "2) Jalankan fungsi: setupWorkbook  (izinkan permission)"
echo "3) (Opsional) Jalankan: syncMenuPhotosFromDrive"
echo "4) Deploy → New deployment → Web app"
echo "   Execute as: Me | Who has access: Anyone"
echo "5) Salin URL /exec → isi web/config.js SCRIPT_URL"
echo ""
echo "Folder Drive sudah terisi di Settings (bisa diganti di sheet):"
echo "  menu_photos_folder_id = 1FO1qFwt0zzeCLzt_wSydaDlzV2TeI9ax"
