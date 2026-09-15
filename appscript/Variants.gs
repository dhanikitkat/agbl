/**
 * Variant / sub-opsi menu (contoh: sambel).
 * - selection_type: single | multi
 * - excludes: daftar option_id yang saling meniadakan (comma-separated)
 */

var VARIANT_GROUP_HEADERS_ = [
  'id', 'menu_ids', 'label', 'selection_type', 'min_select', 'max_select', 'required', 'active', 'sort_order'
];
var VARIANT_OPTION_HEADERS_ = [
  'id', 'group_id', 'label', 'price_delta', 'excludes', 'active', 'sort_order'
];

function ensureVariantSheets_() {
  getOrCreateSheet_(APP_CONFIG.SHEETS.VARIANT_GROUPS, VARIANT_GROUP_HEADERS_);
  getOrCreateSheet_(APP_CONFIG.SHEETS.VARIANT_OPTIONS, VARIANT_OPTION_HEADERS_);
}

function isTruthy_(v) {
  var s = String(v).toUpperCase();
  return s === 'TRUE' || s === '1' || s === 'YES';
}

function parseExcludes_(raw) {
  return String(raw || '')
    .split(/[,;|]/)
    .map(function (x) { return String(x).trim(); })
    .filter(Boolean);
}

function getVariantCatalog_() {
  ensureVariantSheets_();
  var groupSheet = getOrCreateSheet_(APP_CONFIG.SHEETS.VARIANT_GROUPS, VARIANT_GROUP_HEADERS_);
  var optSheet = getOrCreateSheet_(APP_CONFIG.SHEETS.VARIANT_OPTIONS, VARIANT_OPTION_HEADERS_);
  var groups = sheetToObjects_(groupSheet).filter(function (g) { return isTruthy_(g.active); });
  var options = sheetToObjects_(optSheet).filter(function (o) { return isTruthy_(o.active); });

  var optsByGroup = {};
  options.forEach(function (o) {
    var gid = String(o.group_id || '').trim();
    if (!optsByGroup[gid]) optsByGroup[gid] = [];
    optsByGroup[gid].push({
      id: String(o.id || ''),
      label: String(o.label || ''),
      price_delta: Number(o.price_delta) || 0,
      excludes: parseExcludes_(o.excludes),
      sort_order: Number(o.sort_order) || 0
    });
  });
  Object.keys(optsByGroup).forEach(function (gid) {
    optsByGroup[gid].sort(function (a, b) { return a.sort_order - b.sort_order; });
  });

  return groups
    .map(function (g) {
      return {
        id: String(g.id || ''),
        menu_ids: String(g.menu_ids || '')
          .split(/[,;|]/)
          .map(function (x) { return String(x).trim(); })
          .filter(Boolean),
        label: String(g.label || ''),
        selection_type: String(g.selection_type || 'single').toLowerCase() === 'multi' ? 'multi' : 'single',
        min_select: Number(g.min_select) || 0,
        max_select: Number(g.max_select) || 1,
        required: isTruthy_(g.required),
        sort_order: Number(g.sort_order) || 0,
        options: optsByGroup[String(g.id || '')] || []
      };
    })
    .filter(function (g) { return g.id && g.options.length; })
    .sort(function (a, b) { return a.sort_order - b.sort_order; });
}

function getVariantGroupsForMenu_(menuId, catalog) {
  var id = String(menuId || '').trim();
  return (catalog || getVariantCatalog_()).filter(function (g) {
    if (!g.menu_ids.length) return false;
    if (g.menu_ids.indexOf('*') !== -1) return true;
    return g.menu_ids.indexOf(id) !== -1;
  });
}

/**
 * Validasi pilihan variant dari client.
 * selected: { group_id: [option_id, ...] }
 */
function validateAndPriceVariants_(menuId, selected) {
  selected = selected || {};
  var groups = getVariantGroupsForMenu_(menuId);
  var picked = [];
  var extra = 0;

  groups.forEach(function (g) {
    var chosen = selected[g.id];
    if (!Array.isArray(chosen)) chosen = chosen ? [chosen] : [];
    chosen = chosen.map(String).filter(Boolean);

    if (g.selection_type === 'single' && chosen.length > 1) {
      chosen = chosen.slice(0, 1);
    }
    if (chosen.length < g.min_select || (g.required && !chosen.length)) {
      throw new Error('Lengkapi pilihan: ' + g.label);
    }
    if (g.max_select && chosen.length > g.max_select) {
      throw new Error(g.label + ' maksimal ' + g.max_select + ' pilihan.');
    }

    var byId = {};
    g.options.forEach(function (o) { byId[o.id] = o; });

    // exclusion check
    chosen.forEach(function (oid) {
      var opt = byId[oid];
      if (!opt) throw new Error('Opsi tidak valid: ' + oid);
      opt.excludes.forEach(function (ex) {
        if (chosen.indexOf(ex) !== -1) {
          throw new Error('Pilihan bentrok di ' + g.label + ': ' + opt.label);
        }
      });
    });

    var groupPicked = [];
    chosen.forEach(function (oid) {
      var opt = byId[oid];
      groupPicked.push({
        id: opt.id,
        label: opt.label,
        price_delta: opt.price_delta
      });
      extra += opt.price_delta;
    });
    if (groupPicked.length) {
      picked.push({
        group_id: g.id,
        group_label: g.label,
        options: groupPicked
      });
    }
  });

  return { variants: picked, extra: extra };
}
