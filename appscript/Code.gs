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
          variants: getVariantCatalog_(),
          server_time: new Date().toISOString()
        };

      case 'createOrder':
        return createOrderApi_(params);

      case 'sendOrderEmail':
        return sendOrderEmailApi_(params);

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
  var customerEmail = String(params.customer_email || '').trim();
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
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    throw new Error('Format email tidak valid.');
  }

  var menuById = {};
  var menuByName = {};
  getActiveMenu_().forEach(function (m) {
    menuById[m.id] = m;
    menuByName[m.name] = m;
  });

  var normalized = [];
  var grandTotal = 0;
  items.forEach(function (it) {
    var menu = null;
    if (it.menu_id && menuById[String(it.menu_id)]) menu = menuById[String(it.menu_id)];
    else if (it.name && menuByName[String(it.name)]) menu = menuByName[String(it.name)];
    var qty = Number(it.quantity) || 0;
    if (!menu || qty < 1) return;

    var selected = it.selected_variants || it.variants_selected || {};
    if (typeof selected === 'string') {
      try { selected = JSON.parse(selected); } catch (e) { selected = {}; }
    }
    var priced = validateAndPriceVariants_(menu.id, selected);
    var unit = menu.price + priced.extra;
    var line = {
      id: menu.id,
      name: menu.name,
      base_price: menu.price,
      price: unit,
      quantity: qty,
      total: unit * qty,
      variants: priced.variants
    };
    normalized.push(line);
    grandTotal += line.total;
  });
  if (!normalized.length) throw new Error('Item pesanan tidak valid.');

  if (params.token) {
    try {
      var sess = requireAuth_(params.token, ['owner', 'kasir']);
      createdBy = sess.username;
    } catch (e) { /* guest ok */ }
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
      customer_email: customerEmail,
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

function sendOrderEmailApi_(params) {
  var customerEmail = String(params.customer_email || '').trim();
  var settings = publicSettings_();
  var notify = String(settings.notify_email || '').trim();
  var toList = [];
  if (customerEmail) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      throw new Error('Format email customer tidak valid.');
    }
    toList.push(customerEmail);
  }
  if (notify && toList.indexOf(notify) === -1) toList.push(notify);
  if (!toList.length) {
    throw new Error('Isi email customer atau Settings.notify_email dulu.');
  }

  var customerName = String(params.customer_name || 'Pelanggan').trim();
  var orderId = String(params.order_id || '').trim();
  var items = params.items;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch (e) { items = []; }
  }
  if (!Array.isArray(items) || !items.length) throw new Error('Item kosong.');

  var rows = items.map(function (it, idx) {
    var variantTxt = '';
    if (it.variants && it.variants.length) {
      variantTxt = '<br><small>' + it.variants.map(function (g) {
        return g.group_label + ': ' + (g.options || []).map(function (o) { return o.label; }).join(', ');
      }).join(' · ') + '</small>';
    }
    return '<tr><td>' + (idx + 1) + '</td><td>' + escapeHtml_(it.name) + variantTxt +
      '</td><td>' + Number(it.quantity || 0) + '</td><td>Rp ' + formatId_(it.price) +
      '</td><td>Rp ' + formatId_(it.total || (it.price * it.quantity)) + '</td></tr>';
  }).join('');

  var total = Number(params.grand_total);
  if (!total) {
    total = items.reduce(function (s, it) {
      return s + (Number(it.total) || (Number(it.price) * Number(it.quantity)) || 0);
    }, 0);
  }

  var thank = settings.email_thankyou_text || 'Terima kasih sudah pesan!';
  var subject = (settings.email_subject_prefix || 'Nota') + ' ' + settings.store_name +
    (orderId ? ' · ' + orderId : '');

  var html =
    '<div style="font-family:Arial,sans-serif;color:#1a1208">' +
    '<h2 style="color:#c2410c;margin:0 0 8px">' + escapeHtml_(settings.store_name) + '</h2>' +
    '<p style="margin:0 0 16px">' + escapeHtml_(thank) + '</p>' +
    '<p>Halo <b>' + escapeHtml_(customerName) + '</b>,' +
    (orderId ? ' berikut nota <b>' + escapeHtml_(orderId) + '</b>.' : ' berikut ringkasan pesananmu.') +
    '</p>' +
    '<table style="border-collapse:collapse;width:100%;margin:16px 0" cellpadding="8">' +
    '<thead><tr style="background:#ffe566"><th align="left">No</th><th align="left">Menu</th>' +
    '<th>Qty</th><th>Harga</th><th>Total</th></tr></thead><tbody>' + rows +
    '<tr><td colspan="4"><b>Grand Total</b></td><td><b>Rp ' + formatId_(total) + '</b></td></tr>' +
    '</tbody></table>' +
    '<p style="color:#6e5a3d;font-size:13px">Pesan ini dikirim otomatis dari sistem order.</p></div>';

  return withScriptLock_(function () {
    MailApp.sendEmail({
      to: toList.join(','),
      subject: subject,
      htmlBody: html,
      name: settings.store_name || 'POS Warung'
    });
    return { ok: true, sent_to: toList };
  });
}

function formatId_(n) {
  return Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

function escapeHtml_(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
