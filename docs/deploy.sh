#!/usr/bin/env bash
# Helper checklist deploy Apps Script (manual / clasp).
# Tidak bisa auto-deploy tanpa akun Google kamu.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cat <<EOF
=== Deploy checklist POS Sheets ===

1. Buka spreadsheet toko → Extensions → Apps Script
2. Pastikan file berikut ada di project:
$(ls -1 "$ROOT/appscript" | sed 's/^/   - /')

3. Jalankan fungsi: setupWorkbook
4. Deploy → New deployment → Web app
   - Execute as: Me
   - Who has access: Anyone
5. Salin URL /exec
6. (GitHub Pages) isi SCRIPT_URL di web/config.js

Opsional clasp:
  npm i -g @google/clasp
  clasp login
  cd appscript && clasp create --type sheets --title "POS Toko" 
  # atau clasp clone <scriptId>
  clasp push
  clasp deploy

Dokumentasi lengkap: docs/SETUP.md
EOF
