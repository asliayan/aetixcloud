/* AetixCloud Services — optional integrations */
var _db = null, _firebaseReady = false;

async function initFirebase() {
  if (!AETIX_CONFIG || !AETIX_CONFIG.firebase || !AETIX_CONFIG.firebase.enabled) return false;
  try {
    var appMod = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js');
    var fsMod = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
    var app = appMod.initializeApp(AETIX_CONFIG.firebase);
    _db = fsMod.getFirestore(app);
    _firebaseReady = true;
    console.log('[Aetix] Firebase connected');
    return true;
  } catch (e) {
    console.warn('[Aetix] Firebase failed', e);
    return false;
  }
}

async function initEmailJS() {
  if (!AETIX_CONFIG || !AETIX_CONFIG.emailjs || !AETIX_CONFIG.emailjs.enabled) return;
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
  s.onload = function () { try { emailjs.init(AETIX_CONFIG.emailjs.publicKey); } catch (e) {} };
  document.head.appendChild(s);
}

async function sendEmail(templateId, params) {
  if (!AETIX_CONFIG || !AETIX_CONFIG.emailjs || !AETIX_CONFIG.emailjs.enabled || typeof emailjs === 'undefined') return false;
  try {
    await emailjs.send(AETIX_CONFIG.emailjs.serviceId, templateId, params);
    return true;
  } catch (e) { return false; }
}

async function notifyOrderPlaced(order) {
  if (!AETIX_CONFIG || !AETIX_CONFIG.emailjs) return;
  await sendEmail(AETIX_CONFIG.emailjs.templateOrderPlaced, {
    to_email: AETIX_CONFIG.emailjs.adminEmail,
    order_id: order.id, customer: order.customer, customer_email: order.customerEmail || '',
    plans: order.plans || order.plan, amount: order.price, method: order.method, txid: order.txid
  });
}

async function notifyOrderApproved(order) {
  if (!order.customerEmail || !AETIX_CONFIG || !AETIX_CONFIG.emailjs) return;
  await sendEmail(AETIX_CONFIG.emailjs.templateOrderApproved, {
    to_email: order.customerEmail, order_id: order.id, customer: order.customer,
    plans: order.plans || order.plan, amount: order.price,
    server_info: order.serverInfo || 'Check dashboard / Discord for details.'
  });
}

function initCrisp() {
  if (!AETIX_CONFIG || !AETIX_CONFIG.crisp || !AETIX_CONFIG.crisp.enabled || !AETIX_CONFIG.crisp.websiteId) return;
  window.$crisp = [];
  window.CRISP_WEBSITE_ID = AETIX_CONFIG.crisp.websiteId;
  var s = document.createElement('script');
  s.src = 'https://client.crisp.chat/l.js';
  s.async = true;
  document.head.appendChild(s);
}

function apiBase() {
  return (AETIX_CONFIG && AETIX_CONFIG.apiBase) ? AETIX_CONFIG.apiBase.replace(/\/$/, '') : '';
}

async function apiFetch(path, options) {
  options = options || {};
  var base = apiBase();
  if (!base) throw new Error('API not configured');
  var headers = { 'Content-Type': 'application/json' };
  if (options.admin && AETIX_CONFIG.adminApiKey) headers['Authorization'] = 'Bearer ' + AETIX_CONFIG.adminApiKey;
  var res = await fetch(base + path, { method: options.method || 'GET', headers: headers, body: options.body });
  var data = await res.json().catch(function () { return {}; });
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

async function startBkashPayment(opts) {
  var data = await apiFetch('/api/bkash/create', { method: 'POST', body: JSON.stringify(opts) });
  if (data.bkashURL) { window.location.href = data.bkashURL; return data; }
  throw new Error(data.error || 'No bkashURL');
}

async function approveOrderViaApi(order) {
  return apiFetch('/api/orders/approve', { method: 'POST', admin: true, body: JSON.stringify({ order: order }) });
}

async function sendDiscordWebhook(order) {
  var base = apiBase();
  if (base) {
    try { await apiFetch('/api/notify/discord', { method: 'POST', body: JSON.stringify({ order: order }) }); return; } catch (e) {}
  }
  var url = (AETIX_CONFIG && AETIX_CONFIG.discordWebhook) || '';
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '🛒 New Order — AetixCloud',
          color: 4052100,
          fields: [
            { name: 'Order ID', value: String(order.id), inline: true },
            { name: 'Plans', value: String(order.plans || order.plan), inline: true },
            { name: 'Amount', value: '৳' + order.price, inline: true },
            { name: 'Customer', value: order.customer || '—', inline: true }
          ],
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (e) {}
}

function getMonthlySales(orders) {
  var map = {};
  orders.filter(function (o) { return o.status === 'approved'; }).forEach(function (o) {
    var d = new Date(o.createdAt || o.date);
    if (isNaN(d.getTime())) return;
    var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    map[key] = (map[key] || 0) + (o.price || 0);
  });
  var keys = Object.keys(map).sort();
  return { labels: keys, data: keys.map(function (k) { return map[k]; }) };
}

function getStatusBreakdown(orders) {
  var counts = { pending: 0, approved: 0, rejected: 0 };
  orders.forEach(function (o) { if (counts[o.status] !== undefined) counts[o.status]++; });
  return counts;
}

function getPlanPopularity(orders) {
  var map = {};
  orders.forEach(function (o) {
    var plans = o.items ? o.items.map(function (i) { return i.plan; }) : [o.plan || o.plans];
    plans.forEach(function (p) { if (p) map[p] = (map[p] || 0) + 1; });
  });
  var entries = Object.keys(map).map(function (k) { return [k, map[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
  return { labels: entries.map(function (e) { return e[0]; }), data: entries.map(function (e) { return e[1]; }) };
}

(function boot() {
  if (typeof AETIX_CONFIG === 'undefined') return;
  initFirebase();
  initEmailJS();
  initCrisp();
})();
