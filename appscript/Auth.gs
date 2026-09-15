/**
 * Auth sederhana berbasis Users sheet + CacheService session token.
 * Cocok untuk owner/kasir; bukan OAuth Google.
 */

function hashPassword_(plain) {
  var raw = APP_CONFIG.PASSWORD_SALT + '::' + String(plain);
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return digest.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function getUsers_() {
  var sheet = getOrCreateSheet_(APP_CONFIG.SHEETS.USERS, [
    'username', 'password_hash', 'role', 'display_name', 'active'
  ]);
  return sheetToObjects_(sheet);
}

function findUser_(username) {
  var users = getUsers_();
  var uname = String(username || '').trim().toLowerCase();
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].username).trim().toLowerCase() === uname) {
      return users[i];
    }
  }
  return null;
}

function createSession_(user) {
  var token = Utilities.getUuid() + '-' + Utilities.getUuid();
  var payload = {
    username: String(user.username),
    role: String(user.role),
    display_name: String(user.display_name || user.username),
    exp: Date.now() + APP_CONFIG.SESSION_HOURS * 60 * 60 * 1000
  };
  CacheService.getScriptCache().put('sess:' + token, JSON.stringify(payload), Math.min(21600, APP_CONFIG.SESSION_HOURS * 3600));
  return { token: token, user: payload };
}

function getSession_(token) {
  if (!token) return null;
  var raw = CacheService.getScriptCache().get('sess:' + token);
  if (!raw) return null;
  try {
    var payload = JSON.parse(raw);
    if (!payload.exp || payload.exp < Date.now()) {
      CacheService.getScriptCache().remove('sess:' + token);
      return null;
    }
    return payload;
  } catch (e) {
    return null;
  }
}

function requireAuth_(token, roles) {
  var session = getSession_(token);
  if (!session) {
    throw new Error('Sesi tidak valid. Silakan login ulang.');
  }
  if (roles && roles.length && roles.indexOf(session.role) === -1) {
    throw new Error('Akses ditolak untuk role ini.');
  }
  return session;
}

function loginUser_(username, password) {
  var user = findUser_(username);
  if (!user) throw new Error('Username atau password salah.');
  var active = String(user.active).toUpperCase();
  if (!(active === 'TRUE' || active === '1' || active === 'YES')) {
    throw new Error('Akun nonaktif.');
  }
  var hash = hashPassword_(password);
  if (String(user.password_hash) !== hash) {
    throw new Error('Username atau password salah.');
  }
  return createSession_(user);
}

function logoutUser_(token) {
  if (token) CacheService.getScriptCache().remove('sess:' + token);
  return { ok: true };
}
