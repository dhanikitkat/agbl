/**
 * Konfigurasi script. Untuk jual ke klien lain, cukup ubah sheet + password default.
 * Spreadsheet aktif = spreadsheet yang ter-bound ke project Apps Script ini.
 */

var APP_CONFIG = {
  APP_NAME: 'POS Warung',
  SESSION_HOURS: 12,
  // Salt sederhana untuk hash password (ubah per toko saat jual)
  PASSWORD_SALT: 'agbl-pos-v1',
  // Nama sheet (aktif di spreadsheet yang sama)
  SHEETS: {
    SETTINGS: 'Settings',
    MENU: 'Menu',
    ORDERS: 'Orders',
    USERS: 'Users'
  },
  DEFAULT_SETTINGS: [
    ['setting_key', 'setting_value'],
    ['store_name', 'Ayam Gepuk Bu Leny'],
    ['wallet_number', '082210403837 (DANA/Gopay/Shopeepay)'],
    ['rek_mandiri', 'Bank Mandiri 1234567890 (a/n. Muhammad Ramdhani)'],
    ['rek_permata', 'Bank Permata 1234567890 (a/n. Muhammad Ramdhani)'],
    ['rek_jago', 'Bank Jago 1234567890 (a/n. M Ramdhani)'],
    ['qris_url', 'https://drive.google.com/file/d/1kyqPGE6N7z-nYONurZBxQxeKikfR0pZS/view'],
    ['wa_number', '6282210403837'],
    ['settings_version', '1']
  ],
  DEFAULT_MENU: [
    ['id', 'name', 'description', 'price', 'active', 'sort_order'],
    ['m01', 'Nasi Tatem Dada', 'Nasi, Ayam Dada, Tahu, Tempe, Sambel, Lalap', 23000, 'TRUE', 1],
    ['m02', 'Nasi Tatem Paha', 'Nasi, Ayam Paha, Tahu, Tempe, Sambel, Lalap', 23000, 'TRUE', 2],
    ['m03', 'Nasi Ayam Dada', 'Nasi, Ayam Dada, Sambel, Lalap', 20000, 'TRUE', 3],
    ['m04', 'Nasi Ayam Paha', 'Nasi, Ayam Paha, Sambel, Lalap', 20000, 'TRUE', 4],
    ['m05', 'Ayam Dada', 'Ayam Dada, Sambel, Lalap', 17000, 'TRUE', 5],
    ['m06', 'Ayam Paha', 'Ayam Paha, Sambel, Lalap', 17000, 'TRUE', 6],
    ['m07', 'Paket Tatem', '2 Tahu, 2 Tempe, Sambel', 7000, 'TRUE', 7],
    ['m08', 'Nasi', 'Nasi 1 Porsi', 4000, 'TRUE', 8],
    ['m09', 'Nasi ½ Porsi', 'Nasi ½ Porsi', 3000, 'TRUE', 9],
    ['m10', 'Extra Sambal Terasi', 'Sambal Terasi 1 Porsi', 5000, 'TRUE', 10],
    ['m11', 'Extra Sambal Gepuk', 'Sambal Gepuk 1 Porsi', 5000, 'TRUE', 11],
    ['m12', 'Sayur Asem 1 Porsi', 'Seporsi Sayur Asem', 7000, 'TRUE', 12],
    ['m13', 'Sayur Asem ½ Porsi', 'Setengah Porsi Sayur Asem', 4000, 'TRUE', 13],
    ['m14', 'Tahu', '', 2000, 'TRUE', 14],
    ['m15', 'Tempe', '', 1500, 'TRUE', 15],
    ['m16', 'Es Teh Manis', '', 4000, 'TRUE', 16],
    ['m17', 'Kerupuk', '', 1000, 'TRUE', 17]
  ],
  // Password default: owner123 / kasir123 — ganti segera setelah setup
  DEFAULT_USERS: [
    ['username', 'password_hash', 'role', 'display_name', 'active'],
    ['owner', '', 'owner', 'Pemilik', 'TRUE'],
    ['kasir', '', 'kasir', 'Kasir', 'TRUE']
  ]
};
