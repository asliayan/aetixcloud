/**
 * AetixCloud API — Cloudflare Worker
 * Routes:
 *  GET  /health
 *  POST /api/bkash/create     { amount, orderId, customer }
 *  POST /api/bkash/execute    { paymentID }
 *  POST /api/bkash/callback   (bKash redirect/callback)
 *  POST /api/ptero/create     { order }  + Authorization: Bearer ADMIN_API_KEY
 *  POST /api/notify/discord   { order }
 *  POST /api/orders           { order }  — store in KV if bound
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function err(msg, status = 400) {
  return json({ ok: false, error: msg }, status);
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function requireAdmin(request, env) {
  const key = env.ADMIN_API_KEY;
  if (!key) return true; // if not set, allow (dev)
  const auth = request.headers.get('Authorization') || '';
  return auth === `Bearer ${key}`;
}

// ---------- bKash Tokenized ----------
async function bkashGrantToken(env) {
  const base = env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta';
  const res = await fetch(`${base}/tokenized/checkout/token/grant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      username: env.BKASH_USERNAME,
      password: env.BKASH_PASSWORD,
    },
    body: JSON.stringify({
      app_key: env.BKASH_APP_KEY,
      app_secret: env.BKASH_APP_SECRET,
    }),
  });
  const data = await res.json();
  if (!data.id_token) throw new Error(data.statusMessage || 'bKash token failed');
  return data.id_token;
}

async function bkashCreatePayment(env, { amount, orderId, callbackURL }) {
  const token = await bkashGrantToken(env);
  const base = env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta';
  const res = await fetch(`${base}/tokenized/checkout/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: token,
      'X-APP-Key': env.BKASH_APP_KEY,
    },
    body: JSON.stringify({
      mode: '0011',
      payerReference: ' ',
      callbackURL: callbackURL,
      amount: String(amount),
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: orderId,
    }),
  });
  return res.json();
}

async function bkashExecutePayment(env, paymentID) {
  const token = await bkashGrantToken(env);
  const base = env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta';
  const res = await fetch(`${base}/tokenized/checkout/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: token,
      'X-APP-Key': env.BKASH_APP_KEY,
    },
    body: JSON.stringify({ paymentID }),
  });
  return res.json();
}

// ---------- Pterodactyl ----------
async function pteroCreateServer(env, order) {
  const panel = (env.PTERO_PANEL_URL || '').replace(/\/$/, '');
  const apiKey = env.PTERO_API_KEY;
  if (!panel || !apiKey) throw new Error('Pterodactyl not configured');

  // Map plan → resources (MB)
  const planName = order.items?.[0]?.plan || order.plan || 'Starter';
  const ramMap = {
    Starter: 1024, Basic: 2048, Pro: 4096, Plus: 6144,
    Premium: 8192, Elite: 12288, Ultimate: 16384, Extreme: 32768,
  };
  const diskMap = {
    Starter: 10240, Basic: 15360, Pro: 30720, Plus: 46080,
    Premium: 61440, Elite: 92160, Ultimate: 122880, Extreme: 204800,
  };
  const memory = ramMap[planName] || 2048;
  const disk = diskMap[planName] || 15360;

  const body = {
    name: `MC-${order.id}`,
    user: Number(env.PTERO_USER_ID || 1),
    egg: Number(env.PTERO_EGG_ID || 1),
    docker_image: env.PTERO_DOCKER_IMAGE || 'ghcr.io/pterodactyl/yolks:java_17',
    startup: 'java -Xms128M -XX:MaxRAMPercentage=95.0 -jar {{SERVER_JARFILE}}',
    environment: {
      SERVER_JARFILE: 'server.jar',
      BUILD_NUMBER: 'latest',
      MINECRAFT_VERSION: 'latest',
    },
    limits: {
      memory,
      swap: 0,
      disk,
      io: 500,
      cpu: 100,
    },
    feature_limits: {
      databases: 1,
      allocations: 1,
      backups: 2,
    },
    deploy: {
      locations: [Number(env.PTERO_LOCATION_ID || 1)],
      dedicated_ip: false,
      port_range: [],
    },
  };

  const res = await fetch(`${panel}/api/application/servers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.errors?.[0]?.detail || data.message || `Pterodactyl ${res.status}`);
  }
  return data;
}

// ---------- Discord ----------
async function notifyDiscord(env, order) {
  const url = env.DISCORD_WEBHOOK;
  if (!url) return;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: '🛒 AetixCloud Order',
        color: 4052100,
        fields: [
          { name: 'ID', value: order.id || '—', inline: true },
          { name: 'Plan', value: String(order.plans || order.plan || '—'), inline: true },
          { name: 'Amount', value: `৳${order.price || 0}`, inline: true },
          { name: 'Customer', value: order.customer || '—', inline: true },
          { name: 'Status', value: order.status || 'pending', inline: true },
        ],
        timestamp: new Date().toISOString(),
      }],
    }),
  });
}

// ---------- Router ----------
export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '') || '/';

    try {
      if (path === '/health' || path === '/') {
        return json({
          ok: true,
          service: 'aetixcloud-api',
          bkash: !!(env.BKASH_APP_KEY && env.BKASH_APP_SECRET),
          ptero: !!(env.PTERO_PANEL_URL && env.PTERO_API_KEY),
        });
      }

      // Create bKash payment → returns bkashURL to redirect user
      if (path === '/api/bkash/create' && request.method === 'POST') {
        if (!env.BKASH_APP_KEY) {
          return err('bKash not configured on server. Set secrets via wrangler.', 503);
        }
        const body = await readBody(request);
        if (!body?.amount || !body?.orderId) return err('amount and orderId required');

        const frontend = env.FRONTEND_URL || 'http://localhost:5500';
        const callbackURL = `${url.origin}/api/bkash/callback?orderId=${encodeURIComponent(body.orderId)}`;

        const result = await bkashCreatePayment(env, {
          amount: body.amount,
          orderId: body.orderId,
          callbackURL,
        });

        if (result.bkashURL || result.paymentID) {
          // Optionally store paymentID ↔ orderId in KV
          if (env.ORDERS_KV && result.paymentID) {
            await env.ORDERS_KV.put(`pay:${result.paymentID}`, JSON.stringify({
              orderId: body.orderId,
              amount: body.amount,
              customer: body.customer || null,
            }), { expirationTtl: 86400 });
          }
          return json({ ok: true, ...result });
        }
        return err(result.statusMessage || 'bKash create failed', 502);
      }

      // Execute after user pays (frontend can call this)
      if (path === '/api/bkash/execute' && request.method === 'POST') {
        if (!env.BKASH_APP_KEY) return err('bKash not configured', 503);
        const body = await readBody(request);
        if (!body?.paymentID) return err('paymentID required');

        const result = await bkashExecutePayment(env, body.paymentID);
        const success = result.statusCode === '0000' || result.transactionStatus === 'Completed';

        let orderMeta = null;
        if (env.ORDERS_KV) {
          const raw = await env.ORDERS_KV.get(`pay:${body.paymentID}`);
          if (raw) orderMeta = JSON.parse(raw);
        }

        if (success && orderMeta) {
          await notifyDiscord(env, {
            id: orderMeta.orderId,
            price: orderMeta.amount,
            customer: orderMeta.customer,
            status: 'paid',
            plans: 'bKash paid',
          });
        }

        return json({ ok: success, payment: result, order: orderMeta });
      }

      // bKash redirects here
      if (path === '/api/bkash/callback') {
        const paymentID = url.searchParams.get('paymentID');
        const status = url.searchParams.get('status');
        const orderId = url.searchParams.get('orderId') || '';
        const frontend = env.FRONTEND_URL || 'https://example.com';

        if (status === 'success' && paymentID && env.BKASH_APP_KEY) {
          try {
            const result = await bkashExecutePayment(env, paymentID);
            const ok = result.statusCode === '0000' || result.transactionStatus === 'Completed';
            const q = new URLSearchParams({
              orderId,
              paymentID,
              status: ok ? 'success' : 'failed',
              trx: result.trxID || '',
            });
            return Response.redirect(`${frontend}/cart.html?bkash=${q}`, 302);
          } catch (e) {
            return Response.redirect(`${frontend}/cart.html?bkash=error`, 302);
          }
        }
        return Response.redirect(`${frontend}/cart.html?bkash=${status || 'cancel'}`, 302);
      }

      // Pterodactyl create (admin only)
      if (path === '/api/ptero/create' && request.method === 'POST') {
        if (!requireAdmin(request, env)) return err('Unauthorized', 401);
        const body = await readBody(request);
        if (!body?.order) return err('order required');
        try {
          const server = await pteroCreateServer(env, body.order);
          await notifyDiscord(env, { ...body.order, status: 'server_created' });
          return json({ ok: true, server });
        } catch (e) {
          return err(e.message || 'Pterodactyl failed', 502);
        }
      }

      // Discord notify
      if (path === '/api/notify/discord' && request.method === 'POST') {
        const body = await readBody(request);
        if (!body?.order) return err('order required');
        await notifyDiscord(env, body.order);
        return json({ ok: true });
      }

      // Combined: approve order = optional ptero + discord
      if (path === '/api/orders/approve' && request.method === 'POST') {
        if (!requireAdmin(request, env)) return err('Unauthorized', 401);
        const body = await readBody(request);
        if (!body?.order) return err('order required');

        let server = null;
        let pteroError = null;
        if (env.PTERO_API_KEY && env.PTERO_PANEL_URL) {
          try {
            server = await pteroCreateServer(env, body.order);
          } catch (e) {
            pteroError = e.message;
          }
        }
        await notifyDiscord(env, { ...body.order, status: 'approved' });
        return json({ ok: true, server, pteroError });
      }

      return err('Not found', 404);
    } catch (e) {
      return err(e.message || 'Server error', 500);
    }
  },
};
