/**
 * Web App entry + JSON API.
 *
 * Deploy: Deploy > New deployment > Web app
 * Execute as: Me
 * Who has access: Anyone
 *
 * UI:
 *   /exec                -> kasir/order
 *   /exec?page=dashboard -> owner/kasir dashboard
 *
 * API (POST JSON body { action, ... } atau GET ?action=):
 *   bootstrap, createOrder, login, logout, me, orders, stats,
 *   updateSettings, upsertMenu, ping
 */

function doGet(e) {
  e = e || { parameter: {} };
  var action = (e.parameter && e.parameter.action) || '';

  if (action) {
    return jsonResponse_(handleApi_('GET', e.parameter, null));
  }

  var page = (e.parameter && e.parameter.page) || 'order';
  var file = page === 'dashboard' ? 'Dashboard' : 'Index';
  var template = HtmlService.createTemplateFromFile(file);
  template.SCRIPT_URL = ScriptApp.getService().getUrl();
  return template
    .evaluate()
    .setTitle(APP_CONFIG.APP_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  var body = {};
  try {
    body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
  } catch (err) {
    return jsonResponse_({ ok: false, error: 'JSON tidak valid.' });
  }
  var params = Object.assign({}, (e && e.parameter) || {}, body);
  return jsonResponse_(handleApi_('POST', params, body));
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleApi_(method, params, body) {
  var action = String(params.action || '').trim();
  try {
    switch (action) {
      case 'ping':
        return { ok: true, ts: new Date().toISOString(), online: true };

      case 'bootstrap':
        return {
          ok: true,
          settings: publicSettings_(),
          menu: getActiveMenu_(),
          server_time: new Date().toISOString()
        };

      case 'createOrder':
        return createOrderApi_(params);

      case 'login':
        return (function () {
          var session = loginUser_(params.username, params.password);
          return { ok: true, token: session.token, user: session.user };
        })();

      case 'logout':
        return logoutUser_(params.token);

      case 'me':
        return { ok: true, user: requireAuth_(params.token) };

      case 'orders':
        requireAuth_(params.token, ['owner', 'kasir']);
        return { ok: true, orders: listOrders_(Number(params.limit) || 100) };

      case 'stats':
        requireAuth_(params.token, ['owner', 'kasir']);
        return { ok: true, stats: computeStats_() };

      case 'updateSettings':
        return updateSettingsApi_(params);

      case 'upsertMenu':
        return upsertMenuApi_(params);

      case 'syncMenuPhotos':
        requireAuth_(params.token, ['owner']);
        return syncMenuPhotosFromDrive();

      case 'getMenuAll':
        requireAuth_(params.token, ['owner']);
        return { ok: true, menu: getAllMenu_() };

      default:
        return { ok: false, error: 'Action tidak dikenal: ' + action };
    }
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
}

function createOrderApi_(params) {
  var customerName = String(params.customer_name || '').trim();
  var customerType = String(params.customer_type || 'perorangan').trim();
  var pabrikName = String(params.pabrik_name || '').trim();
  var idempotencyKey = String(params.idempotency_key || '').trim();
  var source = String(params.source || 'web').trim();
  var createdBy = String(params.created_by || 'guest').trim();
  var clientCreatedAt = String(params.client_created_at || '');
  var items = params.items;

  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch (e) { items = []; }
  }
  if (!Array.isArray(items) || !items.length) {
    throw new Error('Minimal pilih satu menu.');
  }
  if (!customerName) throw new Error('Nama customer wajib diisi.');
  if (customerType === 'pabrik' && !pabrikName) {
    throw new Error('Nama pabrik wajib diisi.');
  }
  if (!idempotencyKey) {
    throw new Error('idempotency_key wajib (cegah double-submit).');
  }

  // Validasi harga dari Menu sheet (jangan percaya harga client)
  var menuByName = {};
  getActiveMenu_().forEach(function (m) {
    menuByName[m.name] = m;
  });

  var normalized = [];
  var grandTotal = 0;
  items.forEach(function (it) {
    var name = String(it.name || '').trim();
    var qty = Number(it.quantity) || 0;
    if (!name || qty < 1) return;
    var menu = menuByName[name];
    if (!menu) throw new Error('Menu tidak ditemukan / nonaktif: ' + name);
    var line = {
      id: menu.id,
      name: menu.name,
      price: menu.price,
      quantity: qty,
      total: menu.price * qty
    };
    normalized.push(line);
    grandTotal += line.total;
  });
  if (!normalized.length) throw new Error('Item pesanan tidak valid.');

  // Optional auth: jika token dikirim, catat sebagai kasir/owner
  if (params.token) {
    try {
      var sess = requireAuth_(params.token, ['owner', 'kasir']);
      createdBy = sess.username;
    } catch (e) {
      // guest tetap boleh order dari halaman publik
    }
  }

  return withScriptLock_(function () {
    var existing = findOrderByIdempotency_(idempotencyKey);
    if (existing) {
      return {
        ok: true,
        duplicate: true,
        order_id: existing.order_id,
        grand_total: Number(existing.grand_total) || 0,
        message: 'Pesanan sudah tercatat (idempotent).'
      };
    }

    var orderId = 'ORD-' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd-HHmmss') + '-' +
      Utilities.getUuid().slice(0, 8);

    appendOrder_({
      order_id: orderId,
      created_at: new Date().toISOString(),
      customer_name: customerName,
      customer_type: customerType,
      pabrik_name: pabrikName,
      items_json: JSON.stringify(normalized),
      grand_total: grandTotal,
      status: 'new',
      source: source,
      idempotency_key: idempotencyKey,
      created_by: createdBy,
      client_created_at: clientCreatedAt
    });

    return {
      ok: true,
      duplicate: false,
      order_id: orderId,
      grand_total: grandTotal,
      items: normalized
    };
  });
}

function updateSettingsApi_(params) {
  requireAuth_(params.token, ['owner']);
  var expectedVersion = String(params.expected_version || '');
  var updates = params.settings || {};

  return withScriptLock_(function () {
    var current = getSettingsMap_();
    if (expectedVersion && String(current.settings_version || '1') !== expectedVersion) {
      return {
        ok: false,
        conflict: true,
        error: 'Settings sudah diubah orang lain. Muat ulang lalu coba lagi.',
        settings: publicSettings_()
      };
    }

    Object.keys(updates).forEach(function (key) {
      if (key === 'settings_version') return;
      setSetting_(key, updates[key]);
    });
    var newVer = bumpSettingsVersion_();
    var settings = publicSettings_();
    settings.settings_version = String(newVer);
    return { ok: true, settings: settings };
  });
}

function upsertMenuApi_(params) {
  requireAuth_(params.token, ['owner']);
  var item = params.item || {};
  if (!item.name) throw new Error('Nama menu wajib.');

  return withScriptLock_(function () {
    var sheet = ensureMenuSchema_();
    var rows = sheetToObjects_(sheet);
    var id = String(item.id || '').trim();
    if (!id) id = 'm' + Utilities.getUuid().slice(0, 8);

    var found = null;
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].id) === id) {
        found = rows[i];
        break;
      }
    }

    var values = [
      id,
      String(item.name),
      String(item.description || ''),
      Number(item.price) || 0,
      item.active === false || item.active === 'FALSE' ? 'FALSE' : 'TRUE',
      Number(item.sort_order) || 0,
      String(item.image_url || '')
    ];

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var colCount = Math.max(headers.length, 7);

    if (found) {
      sheet.getRange(found._row, 1, found._row, colCount).setValues([values.concat(Array(Math.max(0, colCount - values.length)).fill('')).slice(0, colCount)]);
    } else {
      sheet.appendRow(values);
    }

    return { ok: true, menu: getAllMenu_() };
  });
}
