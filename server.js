const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ADMIN_PASS = "polatdemo3231";
const DB_FILE = path.join(__dirname, "keys.json");

function loadKeys() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), "utf8");
      return [];
    }
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveKeys(keys) {
  fs.writeFileSync(DB_FILE, JSON.stringify(keys, null, 2), "utf8");
}

function generateKeyCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = () =>
    Array.from({ length: 4 }, () => chars[crypto.randomInt(0, chars.length)]).join("");
  return `POLAT-${part()}-${part()}`;
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) {
        req.destroy();
        reject(new Error("Body too large"));
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({ _raw: raw });
      }
    });
    req.on("error", reject);
  });
}

function isAdmin(req, body = {}) {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return token === ADMIN_PASS || body.adminPass === ADMIN_PASS;
}

const PANEL_HTML = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Polat Story / Lisans</title>
  <style>
    :root {
      --bg: #111015;
      --card: #19181f;
      --input-bg: #25242d;
      --border: #2e2c38;
      --text: #f4f4f6;
      --muted: #9a98a6;
      --gold: #e2be6d;
      --gold-hover: #d4ae5a;
      --gold-text: #181510;
      --danger: #ef4444;
      --success: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: var(--bg); color: var(--text); min-height: 100vh; display: flex; flex-direction: column; padding: 22px 18px; }
    .hidden { display: none !important; }
    .header { max-width: 560px; width: 100%; margin: 0 auto 24px auto; display: flex; justify-content: space-between; align-items: center; }
    .brand { font-size: 20px; font-weight: 700; }
    .brand span { color: var(--muted); font-weight: 500; }
    .login-container { max-width: 440px; width: 100%; margin: auto; }
    .card, .panel-card { background: var(--card); border: 1px solid var(--border); border-radius: 18px; padding: 24px 20px; margin-bottom: 16px; }
    .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 1.4px; color: var(--gold); text-transform: uppercase; margin-bottom: 8px; }
    .hero-title { font-size: 28px; font-weight: 700; margin-bottom: 10px; color: #fff; }
    .hero-desc { font-size: 14px; color: var(--muted); margin-bottom: 20px; }
    .field-label { display: block; font-size: 13px; color: #d4d3dc; margin-bottom: 8px; }
    .dark-input { width: 100%; background: var(--input-bg); border: 1px solid var(--border); border-radius: 12px; padding: 13px 14px; font-size: 14px; color: #fff; outline: none; }
    .dark-input:focus { border-color: var(--gold); }
    .dark-input:disabled { opacity: 0.45; }
    .btn-gold { width: 100%; background: var(--gold); color: var(--gold-text); border: none; border-radius: 12px; padding: 13px 16px; font-size: 14.5px; font-weight: 700; cursor: pointer; margin-top: 18px; }
    .btn-gold:hover { background: var(--gold-hover); }
    .panel-container { max-width: 560px; width: 100%; margin: 0 auto; }
    .panel-title { font-size: 16px; font-weight: 700; margin-bottom: 14px; color: #fff; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
    @media (max-width: 480px) { .grid-2 { grid-template-columns: 1fr; } }
    .check-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 13px; color: var(--muted); }
    .btn-row { display: flex; gap: 10px; margin-top: 16px; }
    .btn-row .btn-gold { margin-top: 0; flex: 2; }
    .btn-ghost { background: var(--input-bg); color: var(--text); border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; font-size: 13.5px; font-weight: 600; cursor: pointer; flex: 1; }
    .btn-small { background: var(--input-bg); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .btn-del { background: rgba(239, 68, 68, 0.12); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 6px 10px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .key-list { display: flex; flex-direction: column; gap: 10px; }
    .key-item { background: var(--input-bg); border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
    .key-code { font-family: monospace; font-size: 15px; font-weight: 700; color: var(--gold); }
    .key-meta { font-size: 12px; color: var(--muted); margin-top: 4px; }
    .status-active { color: var(--success); font-weight: 600; }
    .status-passive { color: var(--danger); font-weight: 600; }
    .error-banner { background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); color: #fca5a5; padding: 10px 12px; border-radius: 10px; font-size: 13px; margin-bottom: 14px; }
    .footer { max-width: 560px; width: 100%; margin: 20px auto 0 auto; font-size: 12px; color: #6f6d7a; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">Polat Story <span>/ Lisans</span></div>
    <button id="logoutBtn" class="btn-small hidden">Çıkış</button>
  </div>

  <div id="loginScreen" class="login-container">
    <div class="card">
      <div class="eyebrow">YÖNETİCİ ALANI</div>
      <h1 class="hero-title">Kontrol sende.</h1>
      <p class="hero-desc">Anahtarlarını oluştur, sürelerini takip et ve istediğin zaman iptal et.</p>
      <div id="loginError" class="error-banner hidden">Yönetici şifresi hatalı.</div>
      <form id="loginForm">
        <label class="field-label" for="adminPassInput">Yönetici şifresi</label>
        <input type="password" id="adminPassInput" class="dark-input" required />
        <button type="submit" class="btn-gold">Giriş yap</button>
      </form>
    </div>
  </div>

  <div id="panelScreen" class="panel-container hidden">
    <div class="panel-card">
      <div class="eyebrow">ANAHTAR OLUŞTURUCU</div>
      <div class="panel-title">Yeni Lisans Anahtarı</div>
      <form id="keyForm">
        <label class="field-label" for="customKey">Anahtar Kodu</label>
        <input type="text" id="customKey" class="dark-input" placeholder="POLAT-XXXX-XXXX" />
        <div class="grid-2">
          <div>
            <label class="field-label" for="daysInput">Süre (Gün)</label>
            <input type="number" id="daysInput" class="dark-input" min="1" value="7" />
            <label class="check-row"><input type="checkbox" id="unlimitedDays" /> Sınırsız gün</label>
          </div>
          <div>
            <label class="field-label" for="devicesInput">Cihaz Sınırı</label>
            <input type="number" id="devicesInput" class="dark-input" min="1" value="1" />
            <label class="check-row"><input type="checkbox" id="unlimitedDevices" /> Sınırsız cihaz</label>
          </div>
        </div>
        <div class="btn-row">
          <button type="submit" class="btn-gold">Anahtar Oluştur</button>
          <button type="button" id="randomBtn" class="btn-ghost">Rastgele</button>
        </div>
      </form>
    </div>

    <div class="panel-card">
      <div class="eyebrow">KAYITLI ANAHTARLAR</div>
      <div class="panel-title">Oluşturulan Anahtarlar</div>
      <div id="keyList" class="key-list"></div>
    </div>
  </div>

  <div class="footer" id="apiInfo">Polat Story · Canlı Sunucu Aktif</div>

  <script>
    let authPass = sessionStorage.getItem("polat_pass") || "";
    const loginScreen = document.getElementById("loginScreen");
    const panelScreen = document.getElementById("panelScreen");
    const logoutBtn = document.getElementById("logoutBtn");
    const loginError = document.getElementById("loginError");
    const keyListEl = document.getElementById("keyList");
    const daysInput = document.getElementById("daysInput");
    const unlimitedDays = document.getElementById("unlimitedDays");
    const devicesInput = document.getElementById("devicesInput");
    const unlimitedDevices = document.getElementById("unlimitedDevices");
    const customKeyInput = document.getElementById("customKey");

    document.getElementById("apiInfo").textContent =
      "Doğrulama URL: " + window.location.origin + "/api/verify";

    async function api(url, method = "GET", body = null) {
      const opts = {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + authPass
        }
      };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(url, opts);
      return { status: res.status, data: await res.json() };
    }

    async function renderKeys() {
      const { status, data } = await api("/api/keys");
      if (status === 401) {
        authPass = "";
        sessionStorage.removeItem("polat_pass");
        syncAuth();
        return;
      }
      const keys = data.keys || [];
      if (!keys.length) {
        keyListEl.innerHTML = '<div style="color:#9a98a6;font-size:13px;">Henüz anahtar oluşturulmadı.</div>';
        return;
      }
      keyListEl.innerHTML = keys.map((k) => {
        const expText = k.unlimitedDays ? "Sınırsız" : (k.days + " Gün");
        const devText = k.unlimitedDevices
          ? "Sınırsız Cihaz"
          : ((k.devices || []).length + "/" + k.maxDevices + " Cihaz");
        return \`
          <div class="key-item">
            <div>
              <div class="key-code">\${k.code}</div>
              <div class="key-meta">
                <span class="\${k.active ? "status-active" : "status-passive"}">\${k.active ? "Aktif" : "İptal"}</span>
                · Süre: <b>\${expText}</b> · Cihaz: <b>\${devText}</b>
              </div>
            </div>
            <div style="display:flex;gap:6px;">
              <button class="btn-small" onclick="navigator.clipboard?.writeText('\${k.code}');alert('Kopyalandı: \${k.code}')">Kopyala</button>
              <button class="btn-small" onclick="toggleKey('\${k.code}')">\${k.active ? "İptal Et" : "Aç"}</button>
              <button class="btn-del" onclick="deleteKey('\${k.code}')">Sil</button>
            </div>
          </div>
        \`;
      }).join("");
    }

    function syncAuth() {
      const ok = Boolean(authPass);
      loginScreen.classList.toggle("hidden", ok);
      panelScreen.classList.toggle("hidden", !ok);
      logoutBtn.classList.toggle("hidden", !ok);
      if (ok) renderKeys();
    }

    document.getElementById("loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const pass = document.getElementById("adminPassInput").value.trim();
      authPass = pass;
      const check = await fetch("/api/keys", { headers: { Authorization: "Bearer " + pass } });
      if (check.ok) {
        loginError.classList.add("hidden");
        sessionStorage.setItem("polat_pass", pass);
        document.getElementById("adminPassInput").value = "";
        syncAuth();
      } else {
        authPass = "";
        loginError.classList.remove("hidden");
      }
    });

    logoutBtn.addEventListener("click", () => {
      authPass = "";
      sessionStorage.removeItem("polat_pass");
      syncAuth();
    });

    unlimitedDays.addEventListener("change", () => { daysInput.disabled = unlimitedDays.checked; });
    unlimitedDevices.addEventListener("change", () => { devicesInput.disabled = unlimitedDevices.checked; });

    document.getElementById("randomBtn").addEventListener("click", () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const p = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      customKeyInput.value = "POLAT-" + p() + "-" + p();
    });

    document.getElementById("keyForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const res = await api("/api/keys", "POST", {
        code: customKeyInput.value.trim().toUpperCase(),
        unlimitedDays: unlimitedDays.checked,
        days: parseInt(daysInput.value || "7", 10),
        unlimitedDevices: unlimitedDevices.checked,
        maxDevices: parseInt(devicesInput.value || "1", 10)
      });
      if (res.status === 200 || res.status === 201) {
        customKeyInput.value = "";
        renderKeys();
      } else {
        alert(res.data.message || "Hata oluştu");
      }
    });

    window.toggleKey = async (code) => {
      await api("/api/keys/" + encodeURIComponent(code) + "/toggle", "POST");
      renderKeys();
    };

    window.deleteKey = async (code) => {
      await api("/api/keys/" + encodeURIComponent(code), "DELETE");
      renderKeys();
    };

    syncAuth();
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    return sendJson(res, 204, {});
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;

  if (req.method === "GET" && pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(PANEL_HTML);
  }

  if ((req.method === "POST" || req.method === "GET") && (pathname === "/api/verify" || pathname === "/v1/refresh")) {
    const body = req.method === "POST" ? await readBody(req) : {};
    const keyInput = String(
      body.key || body.license_key || parsedUrl.searchParams.get("key") || ""
    ).trim().toUpperCase();
    const deviceId = String(
      body.device_id || body.hwid || parsedUrl.searchParams.get("device_id") || "default-device"
    ).trim();

    if (!keyInput) {
      return sendJson(res, 400, { valid: false, ok: false, message: "Key gerekli." });
    }

    const keys = loadKeys();
    const record = keys.find((k) => k.code === keyInput);

    if (!record) {
      return sendJson(res, 404, { valid: false, ok: false, message: "Gecersiz key." });
    }

    if (!record.active) {
      return sendJson(res, 403, { valid: false, ok: false, message: "Key iptal edilmis." });
    }

    if (!record.unlimitedDays && record.expiresAt && Date.now() > record.expiresAt) {
      return sendJson(res, 403, { valid: false, ok: false, message: "Key suresi dolmus." });
    }

    record.devices = Array.isArray(record.devices) ? record.devices : [];
    if (!record.unlimitedDevices) {
      const alreadyUsed = record.devices.includes(deviceId);
      if (!alreadyUsed && record.devices.length >= record.maxDevices) {
        return sendJson(res, 403, { valid: false, ok: false, message: "Cihaz siniri doldu." });
      }
      if (!alreadyUsed) {
        record.devices.push(deviceId);
        saveKeys(keys);
      }
    }

    return sendJson(res, 200, {
      valid: true,
      ok: true,
      message: "Lisans dogrulandi.",
      key: record.code,
      expiresAt: record.unlimitedDays ? null : record.expiresAt
    });
  }

  if (req.method === "GET" && pathname === "/api/keys") {
    if (!isAdmin(req)) return sendJson(res, 401, { message: "Yetkisiz" });
    return sendJson(res, 200, { keys: loadKeys() });
  }

  if (req.method === "POST" && pathname === "/api/keys") {
    const body = await readBody(req);
    if (!isAdmin(req, body)) return sendJson(res, 401, { message: "Yetkisiz" });

    const keys = loadKeys();
    const code = (body.code ? String(body.code).trim().toUpperCase() : "") || generateKeyCode();
    if (keys.some((k) => k.code === code)) {
      return sendJson(res, 409, { message: "Bu anahtar zaten mevcut." });
    }

    const unlimitedDays = Boolean(body.unlimitedDays);
    const days = unlimitedDays ? null : Math.max(1, parseInt(body.days || 7, 10));
    const unlimitedDevices = Boolean(body.unlimitedDevices);
    const maxDevices = unlimitedDevices ? null : Math.max(1, parseInt(body.maxDevices || 1, 10));

    const newKey = {
      code,
      active: true,
      unlimitedDays,
      days,
      expiresAt: unlimitedDays ? null : Date.now() + days * 24 * 60 * 60 * 1000,
      unlimitedDevices,
      maxDevices,
      devices: [],
      createdAt: Date.now()
    };

    keys.unshift(newKey);
    saveKeys(keys);
    return sendJson(res, 201, { ok: true, key: newKey });
  }

  const toggleMatch = pathname.match(/^\/api\/keys\/([^/]+)\/toggle$/);
  if (req.method === "POST" && toggleMatch) {
    if (!isAdmin(req)) return sendJson(res, 401, { message: "Yetkisiz" });
    const targetCode = decodeURIComponent(toggleMatch[1]).toUpperCase();
    const keys = loadKeys();
    const item = keys.find((k) => k.code === targetCode);
    if (!item) return sendJson(res, 404, { message: "Bulunamadi" });
    item.active = !item.active;
    saveKeys(keys);
    return sendJson(res, 200, { ok: true, key: item });
  }

  const delMatch = pathname.match(/^\/api\/keys\/([^/]+)$/);
  if (req.method === "DELETE" && delMatch) {
    if (!isAdmin(req)) return sendJson(res, 401, { message: "Yetkisiz" });
    const targetCode = decodeURIComponent(delMatch[1]).toUpperCase();
    const keys = loadKeys().filter((k) => k.code !== targetCode);
    saveKeys(keys);
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { message: "Not Found" });
});

server.listen(PORT, () => {
  console.log(`Polat Story Lisans Sunucusu calisiyor: http://localhost:${PORT}`);
});
