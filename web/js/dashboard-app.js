(function () {
  var user = null;
  var settings = {};
  var settingsVersion = '1';
  var activeMenu = [];
  var posCart = [];

  function money(n) { return 'Rp ' + AGBL.formatCurrency(n); }

  function showTab(name) {
    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === name);
    });
    ['overview', 'orders', 'pos', 'settings', 'menu'].forEach(function (id) {
      var el = document.getElementById('tab-' + id);
      if (el) el.classList.toggle('hidden', id !== name);
    });
  }

  function setAuthed(u) {
    user = u;
    document.getElementById('loginPanel').classList.toggle('hidden', !!u);
    document.getElementById('appPanel').classList.toggle('hidden', !u);
    document.getElementById('btnLogout').classList.toggle('hidden', !u);
    document.querySelectorAll('.owner-only').forEach(function (el) {
      el.classList.toggle('hidden', !(u && u.role === 'owner'));
    });
    if (u) {
      document.getElementById('dashBrand').textContent = settings.store_name || 'Dashboard';
      document.getElementById('dashSub').textContent = (u.display_name || u.username) + ' · ' + u.role;
      refreshAll();
    }
  }

  function renderStats(stats) {
    var grid = document.getElementById('statsGrid');
    var items = [
      ['Pesanan hari ini', stats.today_orders],
      ['Omzet hari ini', money(stats.today_revenue)],
      ['Total pesanan', stats.total_orders],
      ['Total omzet', money(stats.total_revenue)]
    ];
    grid.innerHTML = items.map(function (it) {
      return '<div class="stat-card"><span>' + it[0] + '</span><strong>' + it[1] + '</strong></div>';
    }).join('');
  }

  function renderOrders(orders) {
    var body = document.getElementById('ordersBody');
    if (!orders.length) {
      body.innerHTML = '<tr><td colspan="6" class="empty">Belum ada pesanan.</td></tr>';
      return;
    }
    body.innerHTML = orders.map(function (o) {
      var when = o.created_at ? new Date(o.created_at).toLocaleString('id-ID') : '-';
      var cust = (o.customer_name || '') + (o.customer_type === 'pabrik' ? ' / ' + (o.pabrik_name || '') : '');
      return '<tr>' +
        '<td>' + when + '</td>' +
        '<td>' + (o.order_id || '') + '</td>' +
        '<td>' + cust + '</td>' +
        '<td>' + money(o.grand_total) + '</td>' +
        '<td>' + (o.status || '') + '</td>' +
        '<td>' + (o.created_by || '') + '</td>' +
        '</tr>';
    }).join('');
  }

  function fillSettingsForm(s) {
    settings = s || {};
    settingsVersion = String(s.settings_version || '1');
    ['store_name', 'wa_number', 'wallet_number', 'rek_mandiri', 'rek_permata', 'rek_jago', 'qris_url'].forEach(function (k) {
      var el = document.getElementById('set_' + k);
      if (el) el.value = s[k] || '';
    });
    document.getElementById('settingsVersionLabel').textContent = 'Versi settings: ' + settingsVersion;
  }

  function renderMenuAdmin(list) {
    var body = document.getElementById('menuAdminBody');
    body.innerHTML = (list || []).map(function (m) {
      return '<tr>' +
        '<td>' + m.id + '</td>' +
        '<td>' + m.name + '</td>' +
        '<td>' + money(m.price) + '</td>' +
        '<td>' + (m.active ? 'Ya' : 'Tidak') + '</td>' +
        '<td><button class="btn btn-secondary btn-sm" type="button" data-edit="' + m.id + '">Edit</button></td>' +
        '</tr>';
    }).join('');
    body.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-edit');
        var m = list.find(function (x) { return x.id === id; });
        if (!m) return;
        document.getElementById('menu_id').value = m.id;
        document.getElementById('menu_name').value = m.name;
        document.getElementById('menu_price').value = m.price;
        document.getElementById('menu_sort').value = m.sort_order;
        document.getElementById('menu_desc').value = m.description || '';
        document.getElementById('menu_active').value = m.active ? 'TRUE' : 'FALSE';
        showTab('menu');
      });
    });
  }

  function renderPosMenu() {
    var host = document.getElementById('posMenu');
    host.innerHTML = '';
    activeMenu.forEach(function (item) {
      var card = document.createElement('article');
      card.className = 'menu-card';
      card.innerHTML = '<h3></h3><p></p><div class="price"></div><button class="btn btn-primary btn-sm" type="button">+ Tambah</button>';
      card.querySelector('h3').textContent = item.name;
      card.querySelector('p').textContent = item.description || '—';
      card.querySelector('.price').textContent = money(item.price);
      card.querySelector('button').onclick = function () {
        var ex = posCart.find(function (c) { return c.name === item.name; });
        if (ex) ex.quantity += 1;
        else posCart.push({ name: item.name, price: item.price, quantity: 1 });
        renderPosCart();
      };
      host.appendChild(card);
    });
  }

  function renderPosCart() {
    var el = document.getElementById('posCart');
    var total = posCart.reduce(function (s, c) { return s + c.price * c.quantity; }, 0);
    document.getElementById('posTotal').textContent = money(total);
    if (!posCart.length) {
      el.className = 'empty';
      el.textContent = 'Keranjang kosong.';
      return;
    }
    el.className = '';
    el.innerHTML = '<table class="order-table"><thead><tr><th>Menu</th><th>Qty</th><th>Total</th><th></th></tr></thead><tbody>' +
      posCart.map(function (c) {
        return '<tr><td>' + c.name + '</td><td>' + c.quantity + '</td><td>' + money(c.price * c.quantity) +
          '</td><td><button class="btn btn-danger btn-sm" data-del="' + c.name + '" type="button">Hapus</button></td></tr>';
      }).join('') + '</tbody></table>';
    el.querySelectorAll('[data-del]').forEach(function (btn) {
      btn.onclick = function () {
        posCart = posCart.filter(function (c) { return c.name !== btn.getAttribute('data-del'); });
        renderPosCart();
      };
    });
  }

  function refreshAll() {
    return Promise.all([
      AGBL.api('stats', {}, { auth: true }),
      AGBL.api('orders', { limit: 50 }, { auth: true }),
      AGBL.api('bootstrap', {}),
      user && user.role === 'owner' ? AGBL.api('getMenuAll', {}, { auth: true }) : Promise.resolve(null)
    ]).then(function (results) {
      var statsRes = results[0];
      var ordersRes = results[1];
      var boot = results[2];
      var menuRes = results[3];
      if (statsRes && statsRes.ok) renderStats(statsRes.stats);
      if (ordersRes && ordersRes.ok) renderOrders(ordersRes.orders);
      if (boot && boot.ok) {
        fillSettingsForm(boot.settings);
        activeMenu = boot.menu || [];
        renderPosMenu();
        document.getElementById('dashBrand').textContent = boot.settings.store_name || 'Dashboard';
      }
      if (menuRes && menuRes.ok) renderMenuAdmin(menuRes.menu);
    }).catch(function (err) {
      AGBL.toast(err.message || 'Gagal memuat dashboard', 'err');
    });
  }

  function init() {
    AGBL.bindNetwork();

    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        showTab(tab.getAttribute('data-tab'));
      });
    });

    document.getElementById('btnLogin').onclick = function () {
      var username = document.getElementById('loginUser').value.trim();
      var password = document.getElementById('loginPass').value;
      AGBL.api('login', { username: username, password: password }).then(function (res) {
        if (!res.ok) throw new Error(res.error || 'Login gagal');
        AGBL.setToken(res.token);
        setAuthed(res.user);
        AGBL.toast('Login berhasil', 'ok');
      }).catch(function (err) {
        AGBL.toast(err.message || 'Login gagal', 'err');
      });
    };

    document.getElementById('btnLogout').onclick = function () {
      AGBL.api('logout', {}, { auth: true }).finally(function () {
        AGBL.setToken('');
        setAuthed(null);
        AGBL.toast('Logout.', 'ok');
      });
    };

    document.getElementById('btnRefreshOrders').onclick = refreshAll;

    document.getElementById('posType').onchange = function () {
      document.getElementById('posPabrikField').classList.toggle('hidden', this.value !== 'pabrik');
    };

    document.getElementById('btnPosClear').onclick = function () {
      posCart = [];
      renderPosCart();
    };

    document.getElementById('btnPosSave').onclick = function () {
      var customer = document.getElementById('posCustomer').value.trim();
      var type = document.getElementById('posType').value;
      var pabrik = document.getElementById('posPabrik').value.trim();
      if (!customer) return AGBL.toast('Nama customer wajib.', 'warn');
      if (type === 'pabrik' && !pabrik) return AGBL.toast('Nama pabrik wajib.', 'warn');
      if (!posCart.length) return AGBL.toast('Keranjang kosong.', 'warn');

      var payload = {
        customer_name: customer,
        customer_type: type,
        pabrik_name: pabrik,
        items: posCart.map(function (c) { return { name: c.name, quantity: c.quantity, price: c.price }; }),
        idempotency_key: AGBL.uuid(),
        source: 'dashboard',
        client_created_at: new Date().toISOString(),
        token: AGBL.getToken()
      };

      function okMsg(msg) {
        AGBL.toast(msg, 'ok');
        posCart = [];
        document.getElementById('posCustomer').value = '';
        renderPosCart();
        refreshAll();
      }

      if (!AGBL.isOnline()) {
        AGBL.enqueueOrder(payload);
        return AGBL.toast('Offline: antrean kasir disimpan.', 'warn');
      }

      AGBL.api('createOrder', payload, { auth: true }).then(function (res) {
        if (!res.ok) throw new Error(res.error || 'Gagal simpan');
        okMsg(res.duplicate ? 'Sudah tercatat sebelumnya' : 'Tersimpan ' + res.order_id);
      }).catch(function (err) {
        AGBL.enqueueOrder(payload);
        AGBL.toast((err && err.message) || 'Gagal. Masuk antrean offline.', 'warn');
      });
    };

    document.getElementById('btnSaveSettings').onclick = function () {
      var updates = {};
      ['store_name', 'wa_number', 'wallet_number', 'rek_mandiri', 'rek_permata', 'rek_jago', 'qris_url'].forEach(function (k) {
        updates[k] = document.getElementById('set_' + k).value.trim();
      });
      AGBL.api('updateSettings', {
        expected_version: settingsVersion,
        settings: updates
      }, { auth: true }).then(function (res) {
        if (res.conflict) {
          fillSettingsForm(res.settings);
          throw new Error(res.error || 'Conflict settings');
        }
        if (!res.ok) throw new Error(res.error || 'Gagal simpan');
        fillSettingsForm(res.settings);
        AGBL.toast('Settings tersimpan.', 'ok');
      }).catch(function (err) {
        AGBL.toast(err.message || 'Gagal simpan settings', 'err');
      });
    };

    document.getElementById('btnUpsertMenu').onclick = function () {
      var item = {
        id: document.getElementById('menu_id').value.trim(),
        name: document.getElementById('menu_name').value.trim(),
        description: document.getElementById('menu_desc').value.trim(),
        price: Number(document.getElementById('menu_price').value) || 0,
        sort_order: Number(document.getElementById('menu_sort').value) || 0,
        active: document.getElementById('menu_active').value === 'TRUE'
      };
      if (!item.name) return AGBL.toast('Nama menu wajib.', 'warn');
      AGBL.api('upsertMenu', { item: item }, { auth: true }).then(function (res) {
        if (!res.ok) throw new Error(res.error || 'Gagal');
        renderMenuAdmin(res.menu);
        AGBL.toast('Menu tersimpan.', 'ok');
        return AGBL.api('bootstrap', {});
      }).then(function (boot) {
        if (boot && boot.ok) {
          activeMenu = boot.menu || [];
          renderPosMenu();
        }
      }).catch(function (err) {
        AGBL.toast(err.message || 'Gagal simpan menu', 'err');
      });
    };

    // Resume session
    if (AGBL.getToken()) {
      AGBL.api('me', {}, { auth: true }).then(function (res) {
        if (res.ok) setAuthed(res.user);
        else {
          AGBL.setToken('');
          setAuthed(null);
        }
      }).catch(function () {
        AGBL.setToken('');
        setAuthed(null);
      });
    }

    AGBL.loadBootstrap().then(function (res) {
      fillSettingsForm(res.data.settings || {});
      activeMenu = res.data.menu || [];
      document.getElementById('dashBrand').textContent = (res.data.settings && res.data.settings.store_name) || 'Dashboard';
    }).catch(function () { /* ignore on login screen */ });
  }

  init();
})();
