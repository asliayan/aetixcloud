/**
 * Shared orders API — works for ALL users across devices
 * GET  /.netlify/functions/orders  → list all orders
 * POST /.netlify/functions/orders  → create order
 * PUT  /.netlify/functions/orders  → replace all / update status
 */
import { getStore } from "@netlify/blobs";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

async function readOrders(store) {
  try {
    const raw = await store.get("all-orders");
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeOrders(store, orders) {
  await store.set("all-orders", JSON.stringify(orders));
}

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  try {
    const store = getStore("aetix-orders");

    // GET — list orders
    if (req.method === "GET") {
      const orders = await readOrders(store);
      return json({ ok: true, orders });
    }

    // POST — add one order
    if (req.method === "POST") {
      const body = await req.json();
      const order = body.order || body;
      if (!order || !order.id) {
        return json({ ok: false, error: "order with id required" }, 400);
      }
      const orders = await readOrders(store);
      // avoid duplicates
      const idx = orders.findIndex((o) => o.id === order.id);
      if (idx >= 0) orders[idx] = { ...orders[idx], ...order };
      else orders.unshift(order);
      // keep last 500
      if (orders.length > 500) orders.length = 500;
      await writeOrders(store, orders);
      return json({ ok: true, order });
    }

    // PUT — update status or full replace
    if (req.method === "PUT") {
      const body = await req.json();
      if (body.orders && Array.isArray(body.orders)) {
        await writeOrders(store, body.orders);
        return json({ ok: true, count: body.orders.length });
      }
      if (body.id && body.status) {
        const orders = await readOrders(store);
        const idx = orders.findIndex((o) => o.id === body.id);
        if (idx === -1) return json({ ok: false, error: "not found" }, 404);
        orders[idx] = { ...orders[idx], ...body };
        await writeOrders(store, orders);
        return json({ ok: true, order: orders[idx] });
      }
      return json({ ok: false, error: "invalid body" }, 400);
    }

    return json({ ok: false, error: "method not allowed" }, 405);
  } catch (e) {
    // Blobs may not be available in some plans — return clear error
    return json({ ok: false, error: e.message || "server error" }, 500);
  }
};

