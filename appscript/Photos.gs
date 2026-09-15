/**
 * Resolusi URL foto menu + sync dari folder Google Drive.
 *
 * Cara pakai foto:
 * 1) Upload ke website: assets/menu/m01.jpg lalu isi image_url = assets/menu/m01.jpg
 *    (atau kosongkan — frontend otomatis coba assets/menu/{id}.jpg|webp|png)
 * 2) Link Drive per item di kolom image_url
 * 3) Taruh semua foto di 1 folder Drive, set Settings.menu_photos_folder_id,
 *    lalu jalankan syncMenuPhotosFromDrive / tombol di Dashboard
 */

var MENU_HEADERS_ = ['id', 'name', 'description', 'price', 'active', 'sort_order', 'image_url'];

function ensureMenuSchema_() {
  var sheet = getOrCreateSheet_(APP_CONFIG.SHEETS.MENU, MENU_HEADERS_);
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h || '').trim();
  });
  if (headers.indexOf('image_url') === -1) {
    var col = headers.filter(Boolean).length + 1;
    sheet.getRange(1, col).setValue('image_url');
  }
  return sheet;
}

function normalizeImageUrl_(url) {
  if (!url) return '';
  var s = String(url).trim();
  if (!s) return '';
  // Drive file link → direct view
  var m = s.match(/\/file\/d\/([^/]+)/) || s.match(/[?&]id=([^&]+)/);
  if (m && m[1] && (s.indexOf('drive.google') !== -1 || s.indexOf('docs.google') !== -1)) {
    return 'https://drive.google.com/uc?export=view&id=' + m[1];
  }
  return s;
}

function mapMenuRow_(r) {
  var raw = String(r.image_url || '').trim();
  return {
    id: String(r.id || ''),
    name: String(r.name || ''),
    description: String(r.description || ''),
    price: Number(r.price) || 0,
    active: String(r.active).toUpperCase() === 'TRUE' || String(r.active) === '1',
    sort_order: Number(r.sort_order) || 0,
    image_url: raw,
    image_src: normalizeImageUrl_(raw),
    _row: r._row
  };
}

/**
 * Ambil folder ID dari Settings (folder_id atau parse dari URL).
 * Bisa diganti kapan saja di sheet Settings.
 */
function resolvePhotosFolderId_() {
  var map = getSettingsMap_();
  var folderId = String(map.menu_photos_folder_id || '').trim();
  if (folderId) return folderId;
  var folderUrl = String(map.menu_photos_folder_url || '').trim();
  var fm = folderUrl.match(/\/folders\/([^/?]+)/);
  return fm ? fm[1] : '';
}

/**
 * Sync foto dari folder Drive ke kolom Menu.image_url.
 * Nama file disarankan: m01.jpg, m02.webp, dst (pakai id menu).
 * Juga cocok jika nama file = nama menu (spasi jadi - atau _).
 * Jika ada logo.jpg / logo.png / logo.webp di folder → isi Settings.logo_url.
 */
function syncMenuPhotosFromDrive() {
  return withScriptLock_(function () {
    var folderId = resolvePhotosFolderId_();
    if (!folderId) {
      throw new Error('Isi Settings.menu_photos_folder_id atau menu_photos_folder_url dulu.');
    }

    var folder = DriveApp.getFolderById(folderId);
    var files = folder.getFiles();
    var byBase = {};
    while (files.hasNext()) {
      var file = files.next();
      var name = file.getName();
      var base = name.replace(/\.[^.]+$/, '').toLowerCase();
      var mime = file.getMimeType() || '';
      if (mime.indexOf('image/') !== 0 && !/\.(jpe?g|png|webp|gif|svg)$/i.test(name)) continue;
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e) {
        // ignore jika domain restrict
      }
      byBase[base] = 'https://drive.google.com/uc?export=view&id=' + file.getId();
    }

    var sheet = ensureMenuSchema_();
    var rows = sheetToObjects_(sheet);
    var updated = 0;
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) {
      return String(h || '').trim();
    });
    var imgCol = headers.indexOf('image_url') + 1;
    if (imgCol < 1) throw new Error('Kolom image_url tidak ditemukan.');

    rows.forEach(function (r) {
      var id = String(r.id || '').trim().toLowerCase();
      var slug = String(r.name || '')
        .toLowerCase()
        .replace(/[½]/g, '1-2')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      var url = byBase[id] || byBase[slug] || byBase[slug.replace(/-/g, '_')];
      if (!url) return;
      sheet.getRange(r._row, imgCol).setValue(url);
      updated += 1;
    });

    // Auto-set logo dari folder jika ada
    var logoUrl = byBase.logo || byBase['logo-agbl'] || byBase['ayam-gepuk-bu-leny'];
    if (logoUrl) {
      setSetting_('logo_url', logoUrl);
    }

    // Simpan folder id yang terpakai (supaya jelas di Settings)
    setSetting_('menu_photos_folder_id', folderId);
    if (!getSettingsMap_().menu_photos_folder_url) {
      setSetting_('menu_photos_folder_url', 'https://drive.google.com/drive/folders/' + folderId);
    }

    bumpSettingsVersion_();
    return {
      ok: true,
      folder: folder.getName(),
      folder_id: folderId,
      matched: updated,
      logo_updated: !!logoUrl,
      files_found: Object.keys(byBase).length,
      message: 'Sync selesai: ' + updated + ' menu' + (logoUrl ? ' + logo' : '') + ' dari folder Drive.'
    };
  });
}
