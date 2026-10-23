/* ============================================================
   AetixCloud — Core Script
   ============================================================ */
const PAY_NUMBER = (typeof AETIX_CONFIG !== "undefined" && AETIX_CONFIG.payNumber) || "01XXXXXXXXX";
const ADMIN_PASSWORD = (typeof AETIX_CONFIG !== "undefined" && AETIX_CONFIG.adminPassword) || "aetix2026";

/* ----- Theme ----- */
function initTheme() {
  if (localStorage.getItem("aetix_theme") === "light") document.body.classList.add("light-mode");
  updateThemeBtn();
}
function toggleTheme() {
  document.body.classList.toggle("light-mode");
  localStorage.setItem("aetix_theme", document.body.classList.contains("light-mode") ? "light" : "dark");
  updateThemeBtn();
}
function updateThemeBtn() {
  document.querySelectorAll("[data-theme-btn]").forEach(function (b) {
    b.textContent = document.body.classList.contains("light-mode") ? "🌙" : "☀️";
  });
}

/* ----- Language ----- */
var currentLang = localStorage.getItem("aetix_lang") || "en";
var translations = {
  en: { "nav.features": "Features", "nav.plans": "Plans", "nav.faq": "FAQ", "nav.contact": "Contact", "nav.status": "Status", "nav.cart": "Cart", "nav.login": "Login", "nav.dashboard": "Dashboard", "lang.btn": "বাংলা" },
  bn: { "nav.features": "ফিচার", "nav.plans": "প্ল্যান", "nav.faq": "প্রশ্নোত্তর", "nav.contact": "যোগাযোগ", "nav.status": "স্ট্যাটাস", "nav.cart": "কার্ট", "nav.login": "লগইন", "nav.dashboard": "ড্যাশবোর্ড", "lang.btn": "English" }
};
function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("aetix_lang", lang);
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    var k = el.getAttribute("data-i18n");
    if (translations[lang] && translations[lang][k]) el.textContent = translations[lang][k];
  });
  var btn = document.getElementById("langToggle");
  if (btn && translations[lang]) btn.textContent = translations[lang]["lang.btn"];
}
function toggleLanguage() { setLanguage(currentLang === "en" ? "bn" : "en"); }

/* ----- Users / Auth ----- */
function getUsers() { try { return JSON.parse(localStorage.getItem("aetix_users") || "[]"); } catch (e) { return []; } }
function saveUsers(u) { localStorage.setItem("aetix_users", JSON.stringify(u)); }
function getCurrentUser() { try { return JSON.parse(localStorage.getItem("aetix_session") || "null"); } catch (e) { return null; } }
function setSession(user) {
  if (user) localStorage.setItem("aetix_session", JSON.stringify({ id: user.id, name: user.name, email: user.email, referralCode: user.referralCode || "" }));
  else localStorage.removeItem("aetix_session");
  updateAuthNav();
}
function genReferralCode(name) {
  return ((name || "USR").substring(0, 3).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase());
}
function registerUser(name, email, password, refCode) {
  var users = getUsers();
  if (users.find(function (u) { return u.email.toLowerCase() === email.toLowerCase(); })) return { ok: false, msg: "Email already registered" };
  if (password.length < 4) return { ok: false, msg: "Password min 4 characters" };
  var referredBy = null;
  if (refCode) {
    var ref = users.find(function (u) { return (u.referralCode || "").toUpperCase() === refCode.toUpperCase(); });
    if (ref) referredBy = ref.id;
  }
  var user = { id: "U" + Date.now(), name: name, email: email, password: password, referralCode: genReferralCode(name), referredBy: referredBy, createdAt: new Date().toISOString() };
  users.push(user);
  saveUsers(users);
  setSession(user);
  return { ok: true };
}
function loginUser(email, password) {
  var user = getUsers().find(function (u) { return u.email.toLowerCase() === email.toLowerCase() && u.password === password; });
  if (!user) return { ok: false, msg: "Invalid email or password" };
  setSession(user);
  return { ok: true };
}
function logoutUser() { setSession(null); window.location.href = "index.html"; }
function updateProfile(name, newPass) {
  var session = getCurrentUser();
  if (!session) return { ok: false, msg: "Not logged in" };
  var users = getUsers();
  var idx = users.findIndex(function (u) { return u.id === session.id; });
  if (idx === -1) return { ok: false, msg: "User not found" };
  if (name) users[idx].name = name;
  if (newPass && newPass.length >= 4) users[idx].password = newPass;
  saveUsers(users);
  setSession(users[idx]);
  return { ok: true };
}
function resetPassword(email, newPass) {
  var users = getUsers();
  var idx = users.findIndex(function (u) { return u.email.toLowerCase() === email.toLowerCase(); });
  if (idx === -1) return { ok: false, msg: "Email not found" };
  if (newPass.length < 4) return { ok: false, msg: "Password min 4 chars" };
  users[idx].password = newPass;
  saveUsers(users);
  return { ok: true, msg: "Password reset! You can login now." };
}
function updateAuthNav() {
  var user = getCurrentUser();
  document.querySelectorAll('[data-auth="guest"]').forEach(function (el) { el.style.display = user ? "none" : ""; });
  document.querySelectorAll('[data-auth="user"]').forEach(function (el) { el.style.display = user ? "" : "none"; });
  document.querySelectorAll("[data-user-name]").forEach(function (el) { if (user) el.textContent = user.name; });
  updateCartBadge();
}

/* ----- Cart ----- */
function getCart() { try { return JSON.parse(localStorage.getItem("aetix_cart") || "[]"); } catch (e) { return []; } }
function saveCart(c) { localStorage.setItem("aetix_cart", JSON.stringify(c)); updateCartBadge(); }
function addToCart(plan, price) {
  var cart = getCart();
  var existing = cart.find(function (i) { return i.plan === plan; });
  if (existing) existing.qty += 1;
  else cart.push({ plan: plan, price: price, qty: 1, id: Date.now() });
  saveCart(cart);
  showToast(plan + " added to cart!");
  closePlanDetail();
}
function removeFromCart(id) { saveCart(getCart().filter(function (i) { return i.id !== id; })); if (typeof renderCart === "function") renderCart(); }
function updateCartQty(id, delta) {
  var cart = getCart();
  var item = cart.find(function (i) { return i.id === id; });
  if (!item) return;
  item.qty += delta;
  if (item.qty < 1) saveCart(cart.filter(function (i) { return i.id !== id; }));
  else saveCart(cart);
  if (typeof renderCart === "function") renderCart();
}
function clearCart() { saveCart([]); if (typeof renderCart === "function") renderCart(); }
function cartTotal() { return getCart().reduce(function (s, i) { return s + i.price * i.qty; }, 0); }
function updateCartBadge() {
  var count = getCart().reduce(function (s, i) { return s + i.qty; }, 0);
  document.querySelectorAll("[data-cart-count]").forEach(function (el) {
    el.textContent = count;
    el.style.display = count > 0 ? "inline-flex" : "none";
  });
}
function showToast(msg) {
  var t = document.getElementById("aetixToast");
  if (!t) {
    t = document.createElement("div");
    t.id = "aetixToast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = "1";
  clearTimeout(t._timer);
  t._timer = setTimeout(function () { t.style.opacity = "0"; }, 2200);
}

/* ----- Plan detail modal ----- */
function showPlanDetail(plan) {
  var d = typeof PLAN_DETAILS !== "undefined" ? PLAN_DETAILS[plan] : null;
  if (!d) return;
  var overlay = document.getElementById("planDetailOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "planDetailOverlay";
    overlay.className = "plan-detail-overlay";
    overlay.onclick = function (e) { if (e.target === overlay) closePlanDetail(); };
    document.body.appendChild(overlay);
  }
  overlay.innerHTML =
    '<div class="plan-detail-box">' +
    '<button class="modal-close" onclick="closePlanDetail()">×</button>' +
    "<h2>" + plan + "</h2>" +
    '<div class="price">৳' + d.price + '<span style="font-size:14px;color:var(--text-muted);font-weight:500">/mo</span></div>' +
    "<ul>" +
    "<li><span>✓</span> CPU: " + d.cpu + "</li>" +
    "<li><span>✓</span> RAM: " + d.ram + "</li>" +
    "<li><span>✓</span> Storage: " + d.disk + " NVMe</li>" +
    "<li><span>✓</span> Backup: " + d.backup + "</li>" +
    "<li><span>✓</span> DDoS: " + d.ddos + "</li>" +
    "<li><span>✓</span> ~Players: " + d.players + "</li>" +
    "<li><span>✓</span> Free subdomain + Panel</li>" +
    "</ul>" +
    '<button class="btn btn-primary btn-block" onclick="addToCart(\'' + plan + "', " + d.price + ')">Add to Cart</button>' +
    "</div>";
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
}
function closePlanDetail() {
  var o = document.getElementById("planDetailOverlay");
  if (o) { o.classList.remove("active"); document.body.style.overflow = ""; }
}

/* ----- Orders ----- */
function getOrders() { try { return JSON.parse(localStorage.getItem("aetix_orders") || "[]"); } catch (e) { return []; } }
function saveOrders(o) {
  localStorage.setItem("aetix_orders", JSON.stringify(o));
  // fire-and-forget cloud sync
  if (typeof syncOrdersToCloud === "function") syncOrdersToCloud(o);
}
function getOrdersEndpoint() {
  // 1) explicit ordersApi
  if (typeof AETIX_CONFIG !== "undefined" && AETIX_CONFIG.ordersApi) {
    return String(AETIX_CONFIG.ordersApi).replace(/\/$/, "");
  }
  // 2) Netlify auto endpoint (works after Netlify deploy)
  if (typeof AETIX_CONFIG === "undefined" || AETIX_CONFIG.useNetlifyOrders !== false) {
    if (typeof location !== "undefined" && location.hostname && location.hostname.indexOf("localhost") === -1 && location.protocol !== "file:") {
      // prefer function path; _redirects also maps /api/orders
      return location.origin + "/.netlify/functions/orders";
    }
  }
  return "";
}
async function fetchOrdersFromCloud() {
  var ep = getOrdersEndpoint();
  if (!ep) return null;
  try {
    var res = await fetch(ep);
    if (!res.ok) return null;
    var data = await res.json();
    if (data && data.ok && Array.isArray(data.orders)) return data.orders;
    if (Array.isArray(data)) {
      var snaps = data.filter(function (d) { return d.type === "orders_snapshot" && Array.isArray(d.orders); });
      if (snaps.length) {
        snaps.sort(function (a, b) { return (b.updatedAt || "").localeCompare(a.updatedAt || ""); });
        return snaps[0].orders;
      }
      return data.filter(function (d) { return d.id && (d.plans || d.plan); }).map(function (o) {
        var c = Object.assign({}, o); delete c._id; return c;
      });
    }
    if (data && Array.isArray(data.orders)) return data.orders;
  } catch (e) { console.warn("[Aetix] fetch orders", e); }
  return null;
}
async function pushOrderToCloud(order) {
  var ep = getOrdersEndpoint();
  if (!ep || !order) return;
  try {
    // Netlify function expects { order }, crudcrud expects the object itself
    var isNetlify = ep.indexOf("netlify") !== -1 || ep.indexOf("/.netlify/") !== -1;
    var body = isNetlify ? { order: order } : Object.assign({ type: "order" }, order);
    var res = await fetch(ep, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) console.warn("[Aetix] push order status", res.status);
    else console.log("[Aetix] order synced to cloud");
  } catch (e) { console.warn("[Aetix] push order", e); }
}
async function syncOrderStatusToCloud(id, status) {
  var ep = getOrdersEndpoint();
  if (!ep) return;
  try {
    await fetch(ep, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id, status: status })
    });
  } catch (e) { console.warn(e); }
}
async function syncOrdersToCloud(orders) {
  var ep = getOrdersEndpoint();
  if (!ep) return;
  try {
    await fetch(ep, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders: orders })
    });
  } catch (e) {}
}
function generateOrderId() { return "AX" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase(); }
function getUserOrders() {
  var user = getCurrentUser();
  if (!user) return [];
  return getOrders().filter(function (o) { return o.userId === user.id || o.customerEmail === user.email; });
}

/* ----- Tickets ----- */
function getTickets() { try { return JSON.parse(localStorage.getItem("aetix_tickets") || "[]"); } catch (e) { return []; } }
function saveTickets(t) { localStorage.setItem("aetix_tickets", JSON.stringify(t)); }
function createTicket(subject, message) {
  var user = getCurrentUser();
  if (!user) return { ok: false };
  var tickets = getTickets();
  tickets.unshift({
    id: "TK" + Date.now().toString(36).toUpperCase(),
    userId: user.id, userName: user.name, userEmail: user.email,
    subject: subject, message: message, status: "open", replies: [],
    createdAt: new Date().toISOString(),
    date: new Date().toLocaleString("en-BD", { timeZone: "Asia/Dhaka" })
  });
  saveTickets(tickets);
  return { ok: true };
}
function getUserTickets() {
  var user = getCurrentUser();
  if (!user) return [];
  return getTickets().filter(function (t) { return t.userId === user.id; });
}

/* ----- Checkout ----- */
var appliedCoupon = null, discountAmount = 0, checkoutTotal = 0, currentMethod = "";

function applyCoupon() {
  var input = document.getElementById("couponInput");
  var msg = document.getElementById("couponMsg");
  if (!input || !msg) return;
  var code = input.value.trim().toUpperCase();
  if (!code) { msg.textContent = "Enter a coupon"; msg.style.color = "var(--danger)"; return; }
  var coupon = typeof COUPONS !== "undefined" ? COUPONS[code] : null;
  if (!coupon) { msg.textContent = "Invalid coupon"; msg.style.color = "var(--danger)"; appliedCoupon = null; discountAmount = 0; updateCheckoutPrice(); return; }
  appliedCoupon = code;
  discountAmount = coupon.type === "percent" ? Math.round(checkoutTotal * (coupon.value / 100)) : coupon.value;
  if (discountAmount > checkoutTotal) discountAmount = checkoutTotal;
  msg.textContent = "Coupon applied! -৳" + discountAmount;
  msg.style.color = "var(--green)";
  updateCheckoutPrice();
}
function updateCheckoutPrice() {
  var final = checkoutTotal - discountAmount;
  var el = document.getElementById("checkoutFinal");
  var disc = document.getElementById("discountDisplay");
  if (el) el.textContent = final;
  if (disc) {
    if (discountAmount > 0) {
      disc.style.display = "block";
      disc.innerHTML = '<span style="text-decoration:line-through;color:#999">৳' + checkoutTotal + "</span> → <strong>৳" + final + "</strong>";
    } else disc.style.display = "none";
  }
}
function applyCartCoupon() {
  var input = document.getElementById("cartCouponInput");
  var msg = document.getElementById("cartCouponMsg");
  if (!input || !msg) return;
  var code = input.value.trim().toUpperCase();
  var subtotal = cartTotal();
  if (!code) {
    msg.textContent = "Enter a coupon code";
    msg.style.color = "var(--danger)";
    return;
  }
  var coupon = typeof COUPONS !== "undefined" ? COUPONS[code] : null;
  if (!coupon) {
    msg.textContent = "Invalid coupon";
    msg.style.color = "var(--danger)";
    appliedCoupon = null;
    discountAmount = 0;
    updateCartSummaryTotals();
    return;
  }
  appliedCoupon = code;
  discountAmount = coupon.type === "percent" ? Math.round(subtotal * (coupon.value / 100)) : coupon.value;
  if (discountAmount > subtotal) discountAmount = subtotal;
  msg.textContent = "Coupon applied! -৳" + discountAmount + (coupon.type === "percent" ? " (" + coupon.value + "%)" : "");
  msg.style.color = "var(--green)";
  updateCartSummaryTotals();
}

function updateCartSummaryTotals() {
  var subtotal = cartTotal();
  var final = Math.max(0, subtotal - (discountAmount || 0));
  var t = document.getElementById("cartTotalAmount");
  var t2 = document.getElementById("cartTotalAmount2");
  var discRow = document.getElementById("cartDiscountRow");
  var discAmt = document.getElementById("cartDiscountAmount");
  if (t) t.textContent = "৳" + subtotal;
  if (t2) t2.textContent = "৳" + final;
  if (discRow && discAmt) {
    if (discountAmount > 0) {
      discRow.style.display = "flex";
      discAmt.textContent = "-৳" + discountAmount;
    } else {
      discRow.style.display = "none";
    }
  }
}

function openCheckout() {
  var user = getCurrentUser();
  if (!user) {
    localStorage.setItem("aetix_redirect", "cart.html");
    var authModal = document.getElementById("authRequiredModal");
    if (authModal) {
      authModal.classList.add("active");
      document.body.style.overflow = "hidden";
    } else {
      // fallback
      if (confirm("Checkout করতে Login বা Register করতে হবে।\n\nOK = Register\nCancel = Login")) {
        window.location.href = "register.html";
      } else {
        window.location.href = "login.html";
      }
    }
    return;
  }
  var cart = getCart();
  if (!cart.length) { alert("Cart is empty"); return; }
  checkoutTotal = cartTotal();
  // keep cart coupon if already applied; otherwise reset
  if (!appliedCoupon) { discountAmount = 0; }
  else {
    var coupon = typeof COUPONS !== "undefined" ? COUPONS[appliedCoupon] : null;
    if (coupon) {
      discountAmount = coupon.type === "percent" ? Math.round(checkoutTotal * (coupon.value / 100)) : coupon.value;
      if (discountAmount > checkoutTotal) discountAmount = checkoutTotal;
    }
  }
  var itemsEl = document.getElementById("checkoutItems");
  if (itemsEl) itemsEl.innerHTML = cart.map(function (i) {
    return '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px"><span>' + i.plan + " × " + i.qty + "</span><span>৳" + (i.price * i.qty) + "</span></div>";
  }).join("");
  if (document.getElementById("checkoutFinal")) document.getElementById("checkoutFinal").textContent = checkoutTotal;
  if (document.getElementById("modalPayNumber")) document.getElementById("modalPayNumber").textContent = PAY_NUMBER;
  var couponEl = document.getElementById("couponInput");
  var txidEl = document.getElementById("txidInput");
  if (txidEl) txidEl.value = "";
  if (couponEl) couponEl.value = appliedCoupon || (document.getElementById("cartCouponInput") && document.getElementById("cartCouponInput").value) || "";
  if (appliedCoupon) {
    var cm = document.getElementById("couponMsg");
    if (cm) { cm.textContent = "Coupon " + appliedCoupon + " applied (-৳" + discountAmount + ")"; cm.style.color = "var(--green)"; }
  }
  var cm = document.getElementById("couponMsg"); if (cm) cm.textContent = "";
  updateCheckoutPrice();
  var s1 = document.getElementById("step1"), s2 = document.getElementById("step2"), s3 = document.getElementById("step3");
  if (s1) s1.style.display = "block";
  if (s2) s2.style.display = "none";
  if (s3) s3.style.display = "none";
  var modal = document.getElementById("paymentModal");
  if (modal) { modal.classList.add("active"); document.body.style.overflow = "hidden"; }
}
function closePayment() {
  var m = document.getElementById("paymentModal");
  if (m) { m.classList.remove("active"); document.body.style.overflow = ""; }
}
function selectMethod(method) {
  currentMethod = method;
  var label = document.getElementById("selectedMethodLabel");
  if (label) {
    label.textContent = method;
    label.style.color = method === "bKash" ? "#e2136e" : method === "Nagad" ? "#f68712" : "#8c3494";
  }
  document.getElementById("step1").style.display = "none";
  document.getElementById("step2").style.display = "block";
}
function goStep1() {
  document.getElementById("step2").style.display = "none";
  document.getElementById("step1").style.display = "block";
}
function copyModalNumber() {
  var num = document.getElementById("modalPayNumber").textContent;
  if (navigator.clipboard) navigator.clipboard.writeText(num).then(function () { showToast("Copied!"); }).catch(function () { alert(num); });
  else alert(num);
}
function submitPayment() {
  var user = getCurrentUser();
  if (!user) { alert("Please login"); return; }
  var txid = document.getElementById("txidInput").value.trim();
  if (!txid || txid.length < 6) { alert("সঠিক TxID দিন"); return; }
  var cart = getCart();
  var finalPrice = checkoutTotal - discountAmount;
  var orderId = generateOrderId();
  var plansStr = cart.map(function (i) { return i.plan + (i.qty > 1 ? " x" + i.qty : ""); }).join(", ");
  var order = {
    id: orderId, userId: user.id, customer: user.name, customerEmail: user.email,
    plans: plansStr, items: cart.map(function (i) { return { plan: i.plan, price: i.price, qty: i.qty }; }),
    price: finalPrice, originalPrice: checkoutTotal, discount: discountAmount, coupon: appliedCoupon,
    method: currentMethod, txid: txid, status: "pending",
    createdAt: new Date().toISOString(),
    date: new Date().toLocaleString("en-BD", { timeZone: "Asia/Dhaka" })
  };
  var orders = getOrders();
  orders.unshift(order);
  saveOrders(orders);
  if (typeof pushOrderToCloud === "function") pushOrderToCloud(order);
  clearCart();
  if (typeof sendDiscordWebhook === "function") sendDiscordWebhook(order);
  if (typeof notifyOrderPlaced === "function") notifyOrderPlaced(order);
  document.getElementById("successPlan").textContent = plansStr;
  document.getElementById("successAmount").textContent = finalPrice;
  document.getElementById("successOrderId").textContent = orderId;
  document.getElementById("step2").style.display = "none";
  document.getElementById("step3").style.display = "block";
}

/* ----- Invoice ----- */
function showInvoice(orderId) {
  var order = getOrders().find(function (o) { return o.id === orderId; });
  if (!order) return;
  var overlay = document.getElementById("invoiceOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "invoiceOverlay";
    overlay.className = "plan-detail-overlay";
    overlay.onclick = function (e) { if (e.target === overlay) overlay.classList.remove("active"); };
    document.body.appendChild(overlay);
  }
  var items = (order.items || [{ plan: order.plans || order.plan, qty: 1, price: order.price }])
    .map(function (i) {
      return "<tr><td>" + i.plan + "</td><td>" + (i.qty || 1) + "</td><td>৳" + i.price + "</td><td>৳" + (i.price * (i.qty || 1)) + "</td></tr>";
    }).join("");
  overlay.innerHTML =
    '<div class="plan-detail-box" style="max-width:520px;background:#fff;color:#222">' +
    "<h2 style='color:#111'>⛏ AetixCloud Invoice</h2>" +
    '<p style="font-size:13px;color:#666;margin:8px 0 16px">Order: <strong>' + order.id + "</strong><br>Date: " + order.date + "<br>Customer: " + order.customer + "<br>Status: " + order.status + " | " + order.method + "</p>" +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:14px"><thead><tr style="color:#888;font-size:12px"><th style="text-align:left;padding:8px;border-bottom:1px solid #eee">Plan</th><th style="padding:8px;border-bottom:1px solid #eee">Qty</th><th style="padding:8px;border-bottom:1px solid #eee">Price</th><th style="padding:8px;border-bottom:1px solid #eee">Total</th></tr></thead><tbody>' + items + "</tbody></table>" +
    (order.discount ? '<p style="text-align:right;font-size:13px;color:#666">Discount: -৳' + order.discount + "</p>" : "") +
    '<div style="font-size:18px;font-weight:800;text-align:right;color:#111">Total: ৳' + order.price + "</div>" +
    '<div style="margin-top:20px;display:flex;gap:10px;justify-content:flex-end">' +
    '<button class="btn btn-outline btn-sm" onclick="document.getElementById(\'invoiceOverlay\').classList.remove(\'active\')">Close</button>' +
    '<button class="btn btn-primary btn-sm" onclick="window.print()">Print</button></div></div>';
  overlay.classList.add("active");
}

/* ----- Cart render ----- */
function renderCart() {
  var cart = getCart();
  var container = document.getElementById("cartContainer");
  var empty = document.getElementById("cartEmpty");
  var summary = document.getElementById("cartSummary");
  if (!container) return;
  if (!cart.length) {
    container.innerHTML = "";
    if (empty) empty.style.display = "block";
    if (summary) summary.style.display = "none";
    return;
  }
  if (empty) empty.style.display = "none";
  if (summary) summary.style.display = "block";
  container.innerHTML = cart.map(function (i) {
    return '<div class="cart-item"><div class="cart-item-info"><h3>' + i.plan + "</h3><p>৳" + i.price + "/mo</p></div>" +
      '<div class="cart-item-qty"><button onclick="updateCartQty(' + i.id + ',-1)">−</button><span>' + i.qty + '</span><button onclick="updateCartQty(' + i.id + ',1)">+</button></div>' +
      '<div class="cart-item-total">৳' + (i.price * i.qty) + '</div><button class="cart-remove" onclick="removeFromCart(' + i.id + ')">✕</button></div>';
  }).join("");
  updateCartSummaryTotals();
}

/* ----- Dashboard ----- */
function renderDashboard() {
  var user = getCurrentUser();
  if (!user) { window.location.href = "login.html"; return; }
  document.querySelectorAll("[data-dash-name]").forEach(function (el) { el.textContent = user.name; });
  document.querySelectorAll("[data-dash-email]").forEach(function (el) { el.textContent = user.email; });
  var fullUser = getUsers().find(function (u) { return u.id === user.id; });
  var refEl = document.getElementById("referralCode");
  if (refEl && fullUser) refEl.textContent = fullUser.referralCode || "—";
  var nameInput = document.getElementById("profileName");
  if (nameInput) nameInput.value = user.name;

  var orders = getUserOrders();
  if (document.getElementById("dashOrderCount")) document.getElementById("dashOrderCount").textContent = orders.length;
  if (document.getElementById("dashPending")) document.getElementById("dashPending").textContent = orders.filter(function (o) { return o.status === "pending"; }).length;
  if (document.getElementById("dashApproved")) document.getElementById("dashApproved").textContent = orders.filter(function (o) { return o.status === "approved"; }).length;

  var list = document.getElementById("dashOrders");
  var empty = document.getElementById("dashEmpty");
  if (list) {
    if (!orders.length) {
      list.innerHTML = "";
      if (empty) empty.style.display = "block";
    } else {
      if (empty) empty.style.display = "none";
      list.innerHTML = orders.map(function (o) {
        return '<div class="dash-order"><div class="dash-order-top"><strong>' + o.id + '</strong><span class="status-badge status-' + o.status + '">' + o.status + "</span></div>" +
          '<div class="dash-order-body"><div><span class="muted">Plans:</span> ' + (o.plans || o.plan) + "</div>" +
          "<div><span class=\"muted\">Amount:</span> ৳" + o.price + "</div>" +
          "<div><span class=\"muted\">Method:</span> " + o.method + "</div>" +
          "<div><span class=\"muted\">Date:</span> " + o.date + "</div></div>" +
          '<div style="margin-top:10px"><button class="btn btn-outline btn-sm" onclick="showInvoice(\'' + o.id + "')\">Invoice</button></div></div>";
      }).join("");
    }
  }
  var tickets = getUserTickets();
  var tList = document.getElementById("dashTickets");
  if (tList) {
    if (!tickets.length) tList.innerHTML = '<p style="color:var(--text-muted);font-size:14px">No tickets yet.</p>';
    else tList.innerHTML = tickets.map(function (t) {
      return '<div class="ticket-item"><div style="display:flex;justify-content:space-between"><span class="subject">' + t.subject + '</span><span class="status-badge status-' + (t.status === "open" ? "pending" : "approved") + '">' + t.status + "</span></div>" +
        '<div class="meta">' + t.date + " · " + t.id + '</div><p style="font-size:13px;color:var(--text-muted);margin-top:6px">' + t.message + "</p></div>";
    }).join("");
  }
}

/* ----- Admin ----- */
function initAdmin() {
  if (sessionStorage.getItem("aetix_admin") === "true") showAdminPanel();
  var form = document.getElementById("adminLoginForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var pass = document.getElementById("adminPass");
      if (pass && pass.value === ADMIN_PASSWORD) {
        sessionStorage.setItem("aetix_admin", "true");
        showAdminPanel();
      } else {
        var err = document.getElementById("loginError");
        if (err) { err.style.display = "block"; err.textContent = "Wrong password!"; }
      }
    });
  }
}
async function showAdminPanel() {
  var login = document.getElementById("adminLogin");
  var panel = document.getElementById("adminPanel");
  if (login) login.style.display = "none";
  if (panel) panel.style.display = "block";
  // Try load shared orders from cloud
  if (typeof fetchOrdersFromCloud === "function") {
    try {
      var cloud = await fetchOrdersFromCloud();
      if (cloud && cloud.length) {
        var local = getOrders();
        // merge by id
        var map = {};
        local.forEach(function (o) { map[o.id] = o; });
        cloud.forEach(function (o) { if (o && o.id) map[o.id] = Object.assign({}, map[o.id] || {}, o); });
        var merged = Object.keys(map).map(function (k) { return map[k]; });
        merged.sort(function (a, b) { return (b.createdAt || "").localeCompare(a.createdAt || ""); });
        localStorage.setItem("aetix_orders", JSON.stringify(merged));
      }
    } catch (e) { console.warn(e); }
  }
  renderOrders();
  renderAdminUsers();
  renderAdminTickets();
  if (typeof renderAnalytics === "function") setTimeout(renderAnalytics, 100);
}
function logoutAdmin() { sessionStorage.removeItem("aetix_admin"); location.reload(); }
function renderOrders() {
  var orders = getOrders();
  var tbody = document.getElementById("ordersBody");
  var emptyEl = document.getElementById("emptyOrders");
  var tableWrap = document.getElementById("ordersTableWrap");
  if (document.getElementById("statTotal")) document.getElementById("statTotal").textContent = orders.length;
  if (document.getElementById("statPending")) document.getElementById("statPending").textContent = orders.filter(function (o) { return o.status === "pending"; }).length;
  if (document.getElementById("statApproved")) document.getElementById("statApproved").textContent = orders.filter(function (o) { return o.status === "approved"; }).length;
  if (document.getElementById("statRevenue")) {
    var rev = orders.filter(function (o) { return o.status === "approved"; }).reduce(function (s, o) { return s + (o.price || 0); }, 0);
    document.getElementById("statRevenue").textContent = "৳" + rev.toLocaleString();
  }
  if (!tbody) return;
  if (!orders.length) {
    if (tableWrap) tableWrap.style.display = "none";
    if (emptyEl) emptyEl.style.display = "block";
    return;
  }
  if (tableWrap) tableWrap.style.display = "block";
  if (emptyEl) emptyEl.style.display = "none";
  tbody.innerHTML = orders.map(function (o) {
    return "<tr><td><strong>" + o.id + "</strong></td><td>" + (o.customer || "—") + '<br><small style="color:var(--text-muted)">' + (o.customerEmail || "") + "</small></td>" +
      "<td>" + (o.plans || o.plan || "—") + "</td><td>৳" + o.price + "</td><td>" + o.method + "</td>" +
      '<td><code style="font-size:12px">' + o.txid + "</code></td>" +
      '<td><span class="status-badge status-' + o.status + '">' + o.status + "</span></td>" +
      '<td style="font-size:12px;color:var(--text-muted)">' + (o.date || "—") + "</td>" +
      '<td><div class="admin-actions">' +
      (o.status === "pending" ? '<button class="btn-approve" onclick="updateOrderStatus(\'' + o.id + "','approved')\">Approve</button>" +
        '<button class="btn-reject" onclick="updateOrderStatus(\'' + o.id + "','rejected')\">Reject</button>" : "") +
      '<button class="btn-delete" onclick="deleteOrder(\'' + o.id + "')\">Delete</button>" +
      '<button class="btn-approve" onclick="showInvoice(\'' + o.id + "')\">Invoice</button></div></td></tr>";
  }).join("");
}
async function updateOrderStatus(id, status) {
  var orders = getOrders();
  var i = orders.findIndex(function (o) { return o.id === id; });
  if (i === -1) return;
  orders[i].status = status;
  saveOrders(orders);
  if (typeof syncOrderStatusToCloud === "function") syncOrderStatusToCloud(id, status);
  if (status === "approved") {
    if (typeof notifyOrderApproved === "function") notifyOrderApproved(orders[i]);
    if (typeof approveOrderViaApi === "function" && typeof apiBase === "function" && apiBase()) {
      try {
        var res = await approveOrderViaApi(orders[i]);
        if (res && res.server) { orders[i].serverInfo = "Pterodactyl server created"; saveOrders(orders); showToast("Server created!"); }
      } catch (e) { console.warn(e); }
    }
  }
  renderOrders();
  if (typeof renderAnalytics === "function") renderAnalytics();
}
function deleteOrder(id) { if (!confirm("Delete?")) return; saveOrders(getOrders().filter(function (o) { return o.id !== id; })); renderOrders(); }
function clearAllOrders() { if (!confirm("Delete ALL?")) return; saveOrders([]); renderOrders(); }
function renderAdminUsers() {
  var tbody = document.getElementById("usersBody");
  if (!tbody) return;
  var users = getUsers();
  tbody.innerHTML = users.map(function (u) {
    return "<tr><td>" + u.name + "</td><td>" + u.email + "</td><td><code>" + (u.referralCode || "—") + "</code></td>" +
      '<td style="font-size:12px;color:var(--text-muted)">' + new Date(u.createdAt).toLocaleDateString() + "</td>" +
      "<td>" + getOrders().filter(function (o) { return o.userId === u.id; }).length + "</td></tr>";
  }).join("") || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No users</td></tr>';
}
function renderAdminTickets() {
  var el = document.getElementById("adminTickets");
  if (!el) return;
  var tickets = getTickets();
  if (!tickets.length) { el.innerHTML = '<p style="color:var(--text-muted)">No tickets</p>'; return; }
  el.innerHTML = tickets.map(function (t) {
    return '<div class="ticket-item"><div style="display:flex;justify-content:space-between"><span class="subject">' + t.subject + '</span>' +
      '<span class="status-badge status-' + (t.status === "open" ? "pending" : "approved") + '">' + t.status + "</span></div>" +
      '<div class="meta">' + t.userName + " (" + t.userEmail + ") · " + t.date + "</div>" +
      '<p style="font-size:13px;margin-top:6px;color:var(--text-muted)">' + t.message + "</p>" +
      (t.status === "open" ? '<button class="btn btn-outline btn-sm" style="margin-top:8px" onclick="closeTicket(\'' + t.id + "')\">Mark Closed</button>" : "") +
      "</div>";
  }).join("");
}
function closeTicket(id) {
  var tickets = getTickets();
  var i = tickets.findIndex(function (t) { return t.id === id; });
  if (i !== -1) { tickets[i].status = "closed"; saveTickets(tickets); renderAdminTickets(); }
}

/* ----- bKash ----- */
async function startBkashCheckout() {
  var user = getCurrentUser();
  if (!user) {
    localStorage.setItem("aetix_redirect", "cart.html");
    var authModal = document.getElementById("authRequiredModal");
    if (authModal) { authModal.classList.add("active"); document.body.style.overflow = "hidden"; }
    else { location.href = "register.html"; }
    return;
  }
  var cart = getCart();
  if (!cart.length) { alert("Cart empty"); return; }
  if (typeof apiBase !== "function" || !apiBase()) {
    alert("bKash Auto Checkout চালু নেই। config.js এ apiBase সেট করো, অথবা Send Money ব্যবহার করো।");
    return;
  }
  var orderId = generateOrderId();
  var amount = cartTotal() - (discountAmount || 0);
  var plansStr = cart.map(function (i) { return i.plan + (i.qty > 1 ? " x" + i.qty : ""); }).join(", ");
  var order = {
    id: orderId, userId: user.id, customer: user.name, customerEmail: user.email,
    plans: plansStr, items: cart.map(function (i) { return { plan: i.plan, price: i.price, qty: i.qty }; }),
    price: amount, status: "pending_payment", method: "bKash Auto",
    createdAt: new Date().toISOString(),
    date: new Date().toLocaleString("en-BD", { timeZone: "Asia/Dhaka" })
  };
  localStorage.setItem("aetix_pending_bkash", JSON.stringify(order));
  try {
    showToast("Redirecting to bKash...");
    await startBkashPayment({ amount: amount, orderId: orderId, customer: user.name });
  } catch (e) { alert("bKash error: " + e.message); }
}

/* ----- Init ----- */
document.addEventListener("DOMContentLoaded", function () {
  initTheme();
  setLanguage(currentLang);
  updateAuthNav();

  var toggle = document.getElementById("mobileToggle");
  var navLinks = document.querySelector(".nav-links");
  if (toggle && navLinks) {
    toggle.addEventListener("click", function () {
      navLinks.classList.toggle("active");
      toggle.textContent = navLinks.classList.contains("active") ? "✕" : "☰";
    });
    document.querySelectorAll(".nav-links a").forEach(function (l) {
      l.addEventListener("click", function () { navLinks.classList.remove("active"); toggle.textContent = "☰"; });
    });
  }
  var navbar = document.getElementById("navbar");
  if (navbar) window.addEventListener("scroll", function () { navbar.classList.toggle("scrolled", window.scrollY > 40); });

  document.querySelectorAll(".faq-question").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var item = btn.parentElement;
      var was = item.classList.contains("active");
      document.querySelectorAll(".faq-item").forEach(function (i) { i.classList.remove("active"); });
      if (!was) item.classList.add("active");
    });
  });

  var paymentModal = document.getElementById("paymentModal");
  if (paymentModal) paymentModal.addEventListener("click", function (e) { if (e.target === this) closePayment(); });

  if (document.getElementById("adminLoginForm")) initAdmin();
  if (document.getElementById("cartContainer")) renderCart();
  if (document.getElementById("dashOrders")) renderDashboard();

  // bKash return
  var params = new URLSearchParams(location.search);
  var bk = params.get("bkash");
  if (bk) {
    var pending = localStorage.getItem("aetix_pending_bkash");
    if (bk === "success" && pending) {
      try {
        var order = JSON.parse(pending);
        order.status = "pending";
        order.method = "bKash Auto";
        order.txid = params.get("trx") || params.get("paymentID") || "BKASH";
        var orders = getOrders();
        orders.unshift(order);
        saveOrders(orders);
        if (typeof pushOrderToCloud === "function") pushOrderToCloud(order);
        clearCart();
        localStorage.removeItem("aetix_pending_bkash");
        if (typeof notifyOrderPlaced === "function") notifyOrderPlaced(order);
        if (typeof sendDiscordWebhook === "function") sendDiscordWebhook(order);
        alert("Payment success! Order " + order.id);
        location.href = "dashboard.html";
      } catch (e) { console.warn(e); }
    } else if (bk === "cancel" || bk === "failed" || bk === "error") {
      localStorage.removeItem("aetix_pending_bkash");
      alert("bKash payment was not completed.");
      history.replaceState({}, "", "cart.html");
    }
  }
});

function exportOrders() {
  var data = { orders: getOrders(), users: getUsers(), tickets: getTickets(), exportedAt: new Date().toISOString() };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "aetix-orders-" + Date.now() + ".json";
  a.click();
  showToast("Exported!");
}
function importOrdersFromFile(file) {
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var data = JSON.parse(reader.result);
      if (data.orders) { saveOrders(data.orders); }
      if (data.users) { localStorage.setItem("aetix_users", JSON.stringify(data.users)); }
      if (data.tickets) { localStorage.setItem("aetix_tickets", JSON.stringify(data.tickets)); }
      showToast("Imported!");
      if (typeof renderOrders === "function") renderOrders();
      if (typeof renderAdminUsers === "function") renderAdminUsers();
      if (typeof renderAdminTickets === "function") renderAdminTickets();
      if (typeof renderAnalytics === "function") renderAnalytics();
    } catch (e) { alert("Invalid file"); }
  };
  reader.readAsText(file);
}
