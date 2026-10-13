const API_PREFIX = "/api/admin/";
const encoder = new TextEncoder();
const SESSION_COOKIE = "glope_admin_session";
const SESSION_SECONDS = 8 * 60 * 60;
const RATE_WINDOW_SECONDS = 15 * 60;
const MAX_FAILED_LOGINS = 5;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, private",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      ...extraHeaders
    }
  });
}

function textResponse(text, status = 200, extraHeaders = {}) {
  return new Response(text, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      ...extraHeaders
    }
  });
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function safeEqual(left, right) {
  const a = encoder.encode(String(left || ""));
  const b = encoder.encode(String(right || ""));
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) difference |= (a[i] || 0) ^ (b[i] || 0);
  return difference === 0;
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const item of header.split(";")) {
    const index = item.indexOf("=");
    if (index < 0) continue;
    if (item.slice(0, index).trim() === name) return item.slice(index + 1).trim();
  }
  return "";
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );
}

async function signSession(payload, secret) {
  const body = encodeBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return body + "." + encodeBase64Url(new Uint8Array(signature));
}

async function verifySession(request, env) {
  if (!env.ADMIN_USERNAME || !env.ADMIN_SESSION_SECRET || env.ADMIN_SESSION_SECRET.length < 32) return null;
  const token = getCookie(request, SESSION_COOKIE);
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  try {
    const key = await importHmacKey(env.ADMIN_SESSION_SECRET);
    const verified = await crypto.subtle.verify("HMAC", key, decodeBase64Url(parts[1]), encoder.encode(parts[0]));
    if (!verified) return null;
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])));
    const now = Math.floor(Date.now() / 1000);
    if (payload.sub !== env.ADMIN_USERNAME || typeof payload.exp !== "number" || payload.exp <= now) return null;
    if (typeof payload.iat !== "number" || payload.iat > now + 60) return null;
    return payload;
  } catch {
    return null;
  }
}

function cookieHeader(value, maxAge) {
  return SESSION_COOKIE + "=" + value + "; Path=/; Max-Age=" + maxAge + "; HttpOnly; Secure; SameSite=Strict";
}

function requestHasSameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function configReady(env) {
  return Boolean(
    env.ADMIN_USERNAME &&
    env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.length >= 16 &&
    env.ADMIN_SESSION_SECRET && env.ADMIN_SESSION_SECRET.length >= 32
  );
}

async function rateLimitKey(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(ip + ":" + env.ADMIN_SESSION_SECRET));
  return encodeBase64Url(new Uint8Array(digest));
}

async function getRateLimit(env, key) {
  const row = await env.DB.prepare(
    "SELECT attempts, window_started_at, blocked_until FROM admin_login_attempts WHERE bucket_key = ?1"
  ).bind(key).first();
  if (!row) return { blocked: false };
  const now = Math.floor(Date.now() / 1000);
  if (row.blocked_until && row.blocked_until > now) return { blocked: true, retryAfter: row.blocked_until - now };
  if (row.window_started_at <= now - RATE_WINDOW_SECONDS) return { blocked: false };
  return { blocked: false };
}

async function recordFailedLogin(env, key) {
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - RATE_WINDOW_SECONDS;
  await env.DB.prepare(
    "INSERT INTO admin_login_attempts (bucket_key, window_started_at, attempts, blocked_until) VALUES (?1, ?2, 1, NULL) " +
    "ON CONFLICT(bucket_key) DO UPDATE SET " +
    "attempts = CASE WHEN admin_login_attempts.window_started_at <= ?3 THEN 1 ELSE admin_login_attempts.attempts + 1 END, " +
    "window_started_at = CASE WHEN admin_login_attempts.window_started_at <= ?3 THEN excluded.window_started_at ELSE admin_login_attempts.window_started_at END, " +
    "blocked_until = CASE WHEN admin_login_attempts.window_started_at <= ?3 THEN NULL WHEN admin_login_attempts.attempts + 1 >= ?4 THEN ?5 ELSE admin_login_attempts.blocked_until END"
  ).bind(key, now, cutoff, MAX_FAILED_LOGINS, now + RATE_WINDOW_SECONDS).run();
}

async function clearFailedLogins(env, key) {
  await env.DB.prepare("DELETE FROM admin_login_attempts WHERE bucket_key = ?1").bind(key).run();
}

async function serveAsset(env, request, url, assetPath, noStore = false) {
  const response = await env.ASSETS.fetch(new Request(new URL(assetPath, url.origin), {
    method: request.method === "HEAD" ? "HEAD" : "GET",
    headers: request.headers
  }));
  if (!noStore) return response;
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store, private");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "no-referrer");
  headers.set("content-security-policy", "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function isAdminPath(path) {
  return path === "/admin" || path.startsWith("/admin/") || path.startsWith(API_PREFIX);
}

function isPublicAdminAsset(path) {
  return path === "/admin/admin.css" || path === "/admin/login.js" || path === "/admin/admin.js";
}

async function handleLogin(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { allow: "POST" });
  if (!requestHasSameOrigin(request)) return json({ error: "Request rejected" }, 403);
  if (!configReady(env)) return json({ error: "Admin login is not configured yet." }, 503);
  if (!env.DB) return json({ error: "Database is not configured yet." }, 503);
  if (Number(request.headers.get("Content-Length") || 0) > 4096) return json({ error: "Request too large" }, 413);
  if (!(request.headers.get("Content-Type") || "").toLowerCase().includes("application/json")) {
    return json({ error: "JSON request required" }, 415);
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  const username = typeof input.username === "string" ? input.username.slice(0, 120) : "";
  const password = typeof input.password === "string" ? input.password.slice(0, 512) : "";

  let key;
  try {
    key = await rateLimitKey(request, env);
    const limit = await getRateLimit(env, key);
    if (limit.blocked) {
      return json({ error: "Too many attempts. Try again later." }, 429, { "retry-after": String(limit.retryAfter) });
    }
  } catch {
    return json({ error: "Login protection is unavailable. Please try again later." }, 503);
  }

  const valid = safeEqual(username, env.ADMIN_USERNAME) && safeEqual(password, env.ADMIN_PASSWORD);
  if (!valid) {
    try {
      await recordFailedLogin(env, key);
    } catch {
      return json({ error: "Login protection is unavailable. Please try again later." }, 503);
    }
    return json({ error: "Incorrect username or password." }, 401);
  }

  try {
    await clearFailedLogins(env, key);
    const now = Math.floor(Date.now() / 1000);
    const token = await signSession({ sub: env.ADMIN_USERNAME, iat: now, exp: now + SESSION_SECONDS }, env.ADMIN_SESSION_SECRET);
    return json({ ok: true }, 200, { "set-cookie": cookieHeader(token, SESSION_SECONDS) });
  } catch {
    return json({ error: "Could not start a secure session. Please try again." }, 503);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/admin/login") return handleLogin(request, env);

    if (path === "/api/admin/session") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, { allow: "GET" });
      const session = await verifySession(request, env);
      return json({ authenticated: Boolean(session), user: session ? session.sub : null });
    }

    if (path === "/api/admin/logout") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { allow: "POST" });
      if (!requestHasSameOrigin(request)) return json({ error: "Request rejected" }, 403);
      const session = await verifySession(request, env);
      if (!session) return json({ error: "Not signed in" }, 401);
      return json({ ok: true }, 200, { "set-cookie": cookieHeader("", 0) });
    }

    if (isAdminPath(path)) {
      if (isPublicAdminAsset(path)) {
        if (request.method !== "GET" && request.method !== "HEAD") return textResponse("Method not allowed", 405, { allow: "GET, HEAD" });
        return serveAsset(env, request, url, path, false);
      }

      if (path === "/admin" || path === "/admin/") {
        if (request.method !== "GET" && request.method !== "HEAD") return textResponse("Method not allowed", 405, { allow: "GET, HEAD" });
        const session = await verifySession(request, env);
        return session
          ? Response.redirect(new URL("/admin/app", url.origin), 302)
          : serveAsset(env, request, url, "/admin/login.html", true);
      }

      if (path === "/admin/app" || path === "/admin/app/") {
        if (request.method !== "GET" && request.method !== "HEAD") return textResponse("Method not allowed", 405, { allow: "GET, HEAD" });
        const session = await verifySession(request, env);
        if (!session) return Response.redirect(new URL("/admin", url.origin), 302);
        return serveAsset(env, request, url, "/admin/index.html", true);
      }

      if (path.startsWith(API_PREFIX)) {
        const session = await verifySession(request, env);
        if (!session) return json({ error: "Authentication required" }, 401);
        if (!env.DB) return json({ error: "Database is not configured" }, 503);
        if (request.method !== "GET" && request.method !== "HEAD" && !requestHasSameOrigin(request)) return json({ error: "Request rejected" }, 403);

        if (path === "/api/admin/session" || path === "/api/admin/login" || path === "/api/admin/logout") {
          return json({ error: "Not found" }, 404);
        }

        if (path === "/api/admin/health") {
          if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, { allow: "GET" });
          try {
            await env.DB.prepare("SELECT 1 AS ok").first();
            return json({ ok: true, database: "connected" });
          } catch {
            return json({ ok: false, database: "unavailable" }, 503);
          }
        }

        const audit = async (action, type, id) => {
          try {
            await env.DB.prepare("INSERT INTO admin_audit_log (actor_email, action, record_type, record_id) VALUES (?1, ?2, ?3, ?4)")
              .bind(session.sub, action, type, id || null).run();
          } catch {}
        };
        const readJson = async () => {
          if (Number(request.headers.get("Content-Length") || 0) > 12000) throw new Error("Request too large");
          try { return await request.json(); } catch { throw new Error("Invalid JSON body"); }
        };
        const route = path.slice(API_PREFIX.length).split("/").filter(Boolean);

        if (route.length === 1 && route[0] === "leads") {
          if (request.method === "GET") {
            const result = await env.DB.prepare("SELECT id, customer_name, phone, product_interest, source, status, follow_up_at, notes, created_at, updated_at FROM leads ORDER BY created_at DESC LIMIT 200").all();
            return json({ items: result.results || [] });
          }
          if (request.method === "POST") {
            let input; try { input = await readJson(); } catch (e) { return json({ error: e.message }, 400); }
            const name = typeof input.customer_name === "string" ? input.customer_name.trim().slice(0,120) : "";
            const phone = typeof input.phone === "string" ? input.phone.trim().slice(0,20) : "";
            const product = typeof input.product_interest === "string" ? input.product_interest.trim().slice(0,120) : "GLOPE Honey";
            const source = typeof input.source === "string" ? input.source.trim().slice(0,80) : "WhatsApp";
            const notes = typeof input.notes === "string" ? input.notes.trim().slice(0,2000) : "";
            const follow = typeof input.follow_up_at === "string" && input.follow_up_at ? input.follow_up_at.slice(0,30) : null;
            if (name.length < 1 || phone.length < 7) return json({ error: "Enter a customer name and valid phone number." }, 400);
            try {
              const result = await env.DB.prepare("INSERT INTO leads (customer_name, phone, product_interest, source, notes, follow_up_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")
                .bind(name, phone, product || "GLOPE Honey", source || "WhatsApp", notes, follow).run();
              const id = result.meta?.last_row_id;
              await audit("created", "lead", id);
              const item = await env.DB.prepare("SELECT id, customer_name, phone, product_interest, source, status, follow_up_at, notes, created_at, updated_at FROM leads WHERE id = ?1").bind(id).first();
              return json({ item }, 201);
            } catch { return json({ error: "Could not save the enquiry. Please check the fields and try again." }, 400); }
          }
          return json({ error: "Method not allowed" }, 405, { allow: "GET, POST" });
        }

        if (route.length === 2 && route[0] === "leads" && /^\d+$/.test(route[1])) {
          if (request.method !== "PATCH") return json({ error: "Method not allowed" }, 405, { allow: "PATCH" });
          let input; try { input = await readJson(); } catch (e) { return json({ error: e.message }, 400); }
          const statuses = ["new","contacted","interested","order_confirmed","not_interested","follow_up"];
          if (!statuses.includes(input.status)) return json({ error: "Invalid enquiry status." }, 400);
          const id = Number(route[1]);
          const result = await env.DB.prepare("UPDATE leads SET status = ?1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?2").bind(input.status, id).run();
          if (!result.meta?.changes) return json({ error: "Enquiry not found." }, 404);
          await audit("updated status", "lead", id);
          return json({ ok: true });
        }

        if (route.length === 1 && route[0] === "orders") {
          if (request.method === "GET") {
            const result = await env.DB.prepare("SELECT o.id, o.lead_id, l.customer_name, l.phone, o.product_name, o.pack_size_g, o.quantity, o.unit_price_paise, o.shipping_fee_paise, o.total_paise, o.payment_status, o.order_status, o.payment_method, o.notes, o.created_at FROM orders o LEFT JOIN leads l ON l.id = o.lead_id ORDER BY o.created_at DESC LIMIT 200").all();
            return json({ items: result.results || [] });
          }
          if (request.method === "POST") {
            let input; try { input = await readJson(); } catch (e) { return json({ error: e.message }, 400); }
            const leadId = Number(input.lead_id);
            const size = Number(input.pack_size_g);
            const qty = Number(input.quantity);
            const unitRupees = Number(input.unit_price_rupees);
            const shippingRupees = Number(input.shipping_rupees ?? 50);
            const method = ["UPI","COD","Bank Transfer","Other"].includes(input.payment_method) ? input.payment_method : "COD";
            if (!Number.isInteger(leadId) || leadId < 1 || ![250,500,1000].includes(size) || !Number.isInteger(qty) || qty < 1 || qty > 10000 || !Number.isFinite(unitRupees) || unitRupees < 0 || !Number.isFinite(shippingRupees) || shippingRupees < 0) {
              return json({ error: "Check customer, pack size, quantity and price fields." }, 400);
            }
            const lead = await env.DB.prepare("SELECT id FROM leads WHERE id = ?1").bind(leadId).first();
            if (!lead) return json({ error: "Choose an existing enquiry/customer first." }, 400);
            const stockUpdate = await env.DB.prepare("UPDATE inventory SET stock_qty = stock_qty - ?1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE pack_size_g = ?2 AND stock_qty >= ?1").bind(qty, size).run();
            if (!stockUpdate.meta?.changes) return json({ error: "Not enough stock for this pack size. Update inventory first." }, 409);
            const unitPaise = Math.round(unitRupees * 100);
            const shippingPaise = Math.round(shippingRupees * 100);
            const totalPaise = unitPaise * qty + shippingPaise;
            const notes = typeof input.notes === "string" ? input.notes.trim().slice(0,2000) : "";
            try {
              const result = await env.DB.prepare("INSERT INTO orders (lead_id, product_name, pack_size_g, quantity, unit_price_paise, shipping_fee_paise, total_paise, payment_method, notes) VALUES (?1, 'GLOPE Honey', ?2, ?3, ?4, ?5, ?6, ?7, ?8)")
                .bind(leadId, size, qty, unitPaise, shippingPaise, totalPaise, method, notes).run();
              const id = result.meta?.last_row_id;
              await audit("created", "order", id);
              const item = await env.DB.prepare("SELECT o.id, o.lead_id, l.customer_name, l.phone, o.product_name, o.pack_size_g, o.quantity, o.unit_price_paise, o.shipping_fee_paise, o.total_paise, o.payment_status, o.order_status, o.payment_method, o.notes, o.created_at FROM orders o LEFT JOIN leads l ON l.id = o.lead_id WHERE o.id = ?1").bind(id).first();
              return json({ item }, 201);
            } catch {
              await env.DB.prepare("UPDATE inventory SET stock_qty = stock_qty + ?1 WHERE pack_size_g = ?2").bind(qty, size).run();
              return json({ error: "Could not save the order; stock has been restored." }, 400);
            }
          }
          return json({ error: "Method not allowed" }, 405, { allow: "GET, POST" });
        }

        if (route.length === 2 && route[0] === "orders" && /^\\d+$/.test(route[1])) {
          if (request.method !== "PATCH") return json({ error: "Method not allowed" }, 405, { allow: "PATCH" });
          let input; try { input = await readJson(); } catch (e) { return json({ error: e.message }, 400); }
          const id = Number(route[1]);
          const order = await env.DB.prepare("SELECT id, order_status, payment_status FROM orders WHERE id = ?1").bind(id).first();
          if (!order) return json({ error: "Order not found." }, 404);
          const orderStatuses = ["confirmed","packed","dispatched","delivered"];
          const paymentStatuses = ["pending","paid","partially_paid","refunded"];
          const nextOrderStatus = input.order_status === undefined ? order.order_status : input.order_status;
          const nextPaymentStatus = input.payment_status === undefined ? order.payment_status : input.payment_status;
          if (!orderStatuses.includes(nextOrderStatus) || !paymentStatuses.includes(nextPaymentStatus)) return json({ error: "Invalid order or payment status." }, 400);
          await env.DB.prepare("UPDATE orders SET order_status = ?1, payment_status = ?2, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?3").bind(nextOrderStatus, nextPaymentStatus, id).run();
          await audit("updated status", "order", id);
          return json({ ok: true });
        }

        if (route.length === 1 && route[0] === "inventory") {
          if (request.method === "GET") {
            const result = await env.DB.prepare("SELECT pack_size_g, product_name, stock_qty, updated_at FROM inventory ORDER BY pack_size_g").all();
            return json({ items: result.results || [] });
          }
          if (request.method === "PATCH") {
            let input; try { input = await readJson(); } catch (e) { return json({ error: e.message }, 400); }
            const size = Number(input.pack_size_g), qty = Number(input.stock_qty);
            if (![250,500,1000].includes(size) || !Number.isInteger(qty) || qty < 0 || qty > 1000000) return json({ error: "Enter a valid pack size and non-negative stock quantity." }, 400);
            const result = await env.DB.prepare("UPDATE inventory SET stock_qty = ?1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE pack_size_g = ?2").bind(qty, size).run();
            if (!result.meta?.changes) return json({ error: "Inventory pack not found." }, 404);
            await audit("set stock", "inventory", size);
            const item = await env.DB.prepare("SELECT pack_size_g, product_name, stock_qty, updated_at FROM inventory WHERE pack_size_g = ?1").bind(size).first();
            return json({ item });
          }
          return json({ error: "Method not allowed" }, 405, { allow: "GET, PATCH" });
        }

        if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "Method not allowed" }, 405);
        return json({ error: "Not found" }, 404);
      }

      return textResponse("Not found", 404);
    }

    return env.ASSETS.fetch(request);
  }
};
