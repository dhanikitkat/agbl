/**
 * Helper akses Google Sheets (spreadsheet aktif saja).
 * Semua write order dilindungi LockService untuk race condition.
 */

function getSpreadsheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('Tidak ada spreadsheet aktif. Bind script ke Google Sheet toko.');
  }
  return ss;
}

function getOrCreateSheet_(name, headers) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function sheetToObjects_(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(function (h) {
    return String(h).trim();
  });
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (row.every(function (c) { return c === '' || c === null; })) continue;
    var obj = {};
    headers.forEach(function (h, idx) {
      obj[h] = row[idx];
    });
    obj._row = i + 1;
    rows.push(obj);
  }
  return rows;
}

function getSettingsMap_() {
  var sheet = getOrCreateSheet_(APP_CONFIG.SHEETS.SETTINGS, ['setting_key', 'setting_value']);
  var rows = sheetToObjects_(sheet);
  var map = {};
  rows.forEach(function (r) {
    var key = String(r.setting_key || '').trim();
    if (key) map[key] = String(r.setting_value == null ? '' : r.setting_value);
  });
  return map;
}

function setSetting_(key, value) {
  var sheet = getOrCreateSheet_(APP_CONFIG.SHEETS.SETTINGS, ['setting_key', 'setting_value']);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function bumpSettingsVersion_() {
  var map = getSettingsMap_();
  var ver = parseInt(map.settings_version || '1', 10) || 1;
  setSetting_('settings_version', String(ver + 1));
  return ver + 1;
}

function getActiveMenu_() {
  var sheet = ensureMenuSchema_();
  var rows = sheetToObjects_(sheet);
  return rows
    .filter(function (r) {
      var active = String(r.active).toUpperCase();
      return active === 'TRUE' || active === '1' || active === 'YES';
    })
    .map(function (r) {
      var mapped = mapMenuRow_(r);
      return {
        id: mapped.id,
        name: mapped.name,
        description: mapped.description,
        price: mapped.price,
        sort_order: mapped.sort_order,
        image_url: mapped.image_url,
        image_src: mapped.image_src
      };
    })
    .sort(function (a, b) {
      return a.sort_order - b.sort_order;
    });
}

function getAllMenu_() {
  var sheet = ensureMenuSchema_();
  return sheetToObjects_(sheet).map(mapMenuRow_).sort(function (a, b) {
    return a.sort_order - b.sort_order;
  });
}

/**
 * Konversi link Drive view menjadi URL yang bisa di-embed sebagai gambar.
 */
function normalizeQrisUrl_(url) {
  return normalizeImageUrl_(url);
}

function publicSettings_() {
  var map = getSettingsMap_();
  return {
    store_name: map.store_name || 'Toko',
    logo_url: map.logo_url || '',
    logo_image_url: normalizeImageUrl_(map.logo_url || ''),
    wallet_number: map.wallet_number || '',
    rek_mandiri: map.rek_mandiri || '',
    rek_permata: map.rek_permata || '',
    rek_jago: map.rek_jago || '',
    qris_url: map.qris_url || '',
    qris_image_url: normalizeQrisUrl_(map.qris_url || ''),
    wa_number: map.wa_number || '',
    menu_photos_folder_id: map.menu_photos_folder_id || '',
    menu_photos_folder_url: map.menu_photos_folder_url || '',
    menu_photos_base_url: map.menu_photos_base_url || '',
    settings_version: map.settings_version || '1'
  };
}

/**
 * Write aman dengan LockService (mencegah race condition saat banyak order bersamaan).
 */
function withScriptLock_(fn, timeoutMs) {
  var lock = LockService.getScriptLock();
  var wait = timeoutMs || 15000;
  if (!lock.tryLock(wait)) {
    throw new Error('Sistem sibuk. Coba lagi sebentar.');
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function findOrderByIdempotency_(key) {
  if (!key) return null;
  var sheet = getOrCreateSheet_(APP_CONFIG.SHEETS.ORDERS, [
    'order_id', 'created_at', 'customer_name', 'customer_type', 'pabrik_name',
    'items_json', 'grand_total', 'status', 'source', 'idempotency_key', 'created_by', 'client_created_at'
  ]);
  var rows = sheetToObjects_(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].idempotency_key) === String(key)) {
      return rows[i];
    }
  }
  return null;
}

function appendOrder_(order) {
  var sheet = getOrCreateSheet_(APP_CONFIG.SHEETS.ORDERS, [
    'order_id', 'created_at', 'customer_name', 'customer_type', 'pabrik_name',
    'items_json', 'grand_total', 'status', 'source', 'idempotency_key', 'created_by', 'client_created_at'
  ]);
  sheet.appendRow([
    order.order_id,
    order.created_at,
    order.customer_name,
    order.customer_type,
    order.pabrik_name,
    order.items_json,
    order.grand_total,
    order.status,
    order.source,
    order.idempotency_key,
    order.created_by,
    order.client_created_at
  ]);
}

function listOrders_(limit) {
  var sheet = getOrCreateSheet_(APP_CONFIG.SHEETS.ORDERS, [
    'order_id', 'created_at', 'customer_name', 'customer_type', 'pabrik_name',
    'items_json', 'grand_total', 'status', 'source', 'idempotency_key', 'created_by', 'client_created_at'
  ]);
  var rows = sheetToObjects_(sheet);
  rows.sort(function (a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  });
  var lim = limit || 100;
  return rows.slice(0, lim).map(function (r) {
    var items = [];
    try {
      items = JSON.parse(r.items_json || '[]');
    } catch (e) {
      items = [];
    }
    return {
      order_id: r.order_id,
      created_at: r.created_at,
      customer_name: r.customer_name,
      customer_type: r.customer_type,
      pabrik_name: r.pabrik_name,
      items: items,
      grand_total: Number(r.grand_total) || 0,
      status: r.status,
      source: r.source,
      created_by: r.created_by
    };
  });
}

function computeStats_() {
  var orders = listOrders_(5000);
  var today = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
  var todayOrders = orders.filter(function (o) {
    var d = Utilities.formatDate(new Date(o.created_at), 'Asia/Jakarta', 'yyyy-MM-dd');
    return d === today && String(o.status) !== 'cancelled';
  });
  var todayRevenue = todayOrders.reduce(function (sum, o) {
    return sum + (Number(o.grand_total) || 0);
  }, 0);
  var allRevenue = orders
    .filter(function (o) { return String(o.status) !== 'cancelled'; })
    .reduce(function (sum, o) {
      return sum + (Number(o.grand_total) || 0);
    }, 0);
  return {
    today_orders: todayOrders.length,
    today_revenue: todayRevenue,
    total_orders: orders.length,
    total_revenue: allRevenue
  };
}
