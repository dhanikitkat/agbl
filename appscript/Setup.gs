/**
 * Setup awal sheet + seed data.
 * Jalankan sekali dari editor: Setup > setupWorkbook
 */

function setupWorkbook() {
  withScriptLock_(function () {
    var ss = getSpreadsheet_();

    // Settings
    var settings = ss.getSheetByName(APP_CONFIG.SHEETS.SETTINGS);
    if (!settings) {
      settings = ss.insertSheet(APP_CONFIG.SHEETS.SETTINGS);
      settings.getRange(1, 1, APP_CONFIG.DEFAULT_SETTINGS.length, 2).setValues(APP_CONFIG.DEFAULT_SETTINGS);
      settings.setFrozenRows(1);
    }

    // Menu
    var menu = ss.getSheetByName(APP_CONFIG.SHEETS.MENU);
    if (!menu) {
      menu = ss.insertSheet(APP_CONFIG.SHEETS.MENU);
      menu.getRange(1, 1, APP_CONFIG.DEFAULT_MENU.length, APP_CONFIG.DEFAULT_MENU[0].length)
        .setValues(APP_CONFIG.DEFAULT_MENU);
      menu.setFrozenRows(1);
    } else {
      ensureMenuSchema_();
    }

    // Pastikan key settings foto ada
    var settingsMap = getSettingsMap_();
    if (!('menu_photos_folder_id' in settingsMap)) setSetting_('menu_photos_folder_id', '');
    if (!('menu_photos_folder_url' in settingsMap)) setSetting_('menu_photos_folder_url', '');
    if (!('menu_photos_base_url' in settingsMap)) setSetting_('menu_photos_base_url', '');

    // Orders
    getOrCreateSheet_(APP_CONFIG.SHEETS.ORDERS, [
      'order_id', 'created_at', 'customer_name', 'customer_type', 'pabrik_name',
      'items_json', 'grand_total', 'status', 'source', 'idempotency_key', 'created_by', 'client_created_at'
    ]);

    // Users
    var users = ss.getSheetByName(APP_CONFIG.SHEETS.USERS);
    if (!users) {
      users = ss.insertSheet(APP_CONFIG.SHEETS.USERS);
      var ownerHash = hashPassword_('owner123');
      var kasirHash = hashPassword_('kasir123');
      var rows = [
        ['username', 'password_hash', 'role', 'display_name', 'active'],
        ['owner', ownerHash, 'owner', 'Pemilik', 'TRUE'],
        ['kasir', kasirHash, 'kasir', 'Kasir', 'TRUE']
      ];
      users.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
      users.setFrozenRows(1);
    }

    // Hapus Sheet1 kosong jika ada
    var sheet1 = ss.getSheetByName('Sheet1');
    if (sheet1 && ss.getSheets().length > 1) {
      try { ss.deleteSheet(sheet1); } catch (e) { /* ignore */ }
    }
  });
  return 'Setup selesai. Ganti password default segera.';
}

/**
 * Utility: hash password untuk update manual di sheet Users.
 * Jalankan di editor: hashPasswordForSheet('passwordBaru')
 */
function hashPasswordForSheet(plain) {
  return hashPassword_(plain);
}
