const ADMIN_PREFIX = "/admin";
const API_PREFIX = "/api/admin/";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, private",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer"
    }
  });
}

function isAdminPath(path) {
  return path === "/admin" || path.startsWith("/admin/") || path.startsWith(API_PREFIX);
}

async function requireAccess(ctx) {
  if (!ctx?.access) return null;
  try {
    const identity = await ctx.access.getIdentity();
    if (!identity?.email) return null;
    return identity;
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // All admin HTML, assets, and APIs are denied unless Cloudflare Access
    // has authenticated the request. Also configure an Access allow policy
    // for the owner's exact email and cover /admin* plus /api/admin/*.
    if (isAdminPath(path)) {
      const identity = await requireAccess(ctx);
      if (!identity) {
        return new Response("Sign-in required. Configure Cloudflare Access for this admin path.", {
          status: 401,
          headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" }
        });
      }

      if (path.startsWith(API_PREFIX)) {
        if (request.method !== "GET") {
          return json({ error: "Method not allowed" }, 405);
        }

        if (path === "/api/admin/health") {
          if (!env.DB) {
            return json({ ok: false, database: "not_configured" }, 503);
          }
          try {
            await env.DB.prepare("SELECT 1 AS ok").first();
            return json({ ok: true, database: "connected" });
          } catch {
            return json({ ok: false, database: "unavailable" }, 503);
          }
        }
        return json({ error: "Not found" }, 404);
      }

      if (path === "/admin" || path === "/admin/") {
        return env.ASSETS.fetch(new Request(new URL("/admin/index.html", url), request));
      }
      return env.ASSETS.fetch(request);
    }

    // Keep the public website and all non-admin assets on the existing
    // static-assets path without changing their content.
    return env.ASSETS.fetch(request);
  }
};
