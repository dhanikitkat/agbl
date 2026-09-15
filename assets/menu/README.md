# Foto Menu

Upload foto makanan ke folder ini, lalu commit/push agar muncul di GitHub Pages.

## Cara cepat (website)

1. Simpan foto dengan nama **ID menu**, contoh:
   - `m01.jpg` → Nasi Tatem Dada
   - `m02.webp` → Nasi Tatem Paha
2. Format yang didukung: `.jpg` / `.jpeg` / `.png` / `.webp`
3. Di sheet `Menu`, kolom `image_url` bisa diisi:
   - `assets/menu/m01.jpg`, atau
   - dikosongkan (frontend otomatis mencoba `assets/menu/{id}.jpg|webp|png`)

## Cara Drive (folder satu tempat)

1. Buat folder di Google Drive, upload foto dengan nama `m01.jpg`, `m02.jpg`, dst.
2. Share folder **Anyone with the link** (Viewer).
3. Di sheet `Settings`:
   - `menu_photos_folder_id` = ID folder (dari URL `/folders/XXXX`)
   - atau `menu_photos_folder_url` = URL folder lengkap
4. Di Dashboard (owner) klik **Sync foto dari Drive**, atau jalankan `syncMenuPhotosFromDrive` di Apps Script.
5. Kolom `Menu.image_url` akan terisi otomatis.

## Tips

- Pakai foto landscape/persegi, crop fokus makanan.
- Ukuran ideal ~800–1200px lebar, file < 500KB agar cepat di HP.
- Setelah ganti foto di Drive, jalankan sync lagi (atau update `image_url` manual).
