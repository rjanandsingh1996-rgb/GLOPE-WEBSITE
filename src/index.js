const API_PREFIX = "/api/admin/";
const encoder = new TextEncoder();

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

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

function decodeJsonSegment(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
}

async function verifyAccessJwt(request, env) {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  const teamDomain = env.ACCESS_TEAM_DOMAIN;
  const audience = env.ACCESS_AUD;
  if (!token || !teamDomain || !audience) return false;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const header = decodeJsonSegment(parts[0]);
    const claims = decodeJsonSegment(parts[1]);
    const issuer = teamDomain.replace(/\/$/, "");
    if (header.alg !== "RS256" || claims.iss !== issuer) return false;
    if (!Array.isArray(claims.aud) || !claims.aud.includes(audience)) return false;
    const now = Math.floor(Date.now() / 1000);
    if (typeof claims.exp !== "number" || claims.exp <= now) return false;
    if (typeof claims.nbf === "number" && claims.nbf > now) return false;

    const jwksResponse = await fetch(issuer + "/cdn-cgi/access/certs", { cf: { cacheTtl: 300 } });
    if (!jwksResponse.ok) return false;
    const jwks = await jwksResponse.json();
    const jwk = jwks.keys?.find(key => key.kid === header.kid && key.kty === "RSA");
    if (!jwk) return false;
    const publicKey = await crypto.subtle.importKey(
      "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]
    );
    const signedData = encoder.encode(parts[0] + "." + parts[1]);
    return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, decodeBase64Url(parts[2]), signedData);
  } catch {
    return false;
  }
}

function isAdminPath(path) {
  return path === "/admin" || path === "/admin/" || path.startsWith("/admin/") || path.startsWith(API_PREFIX);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (isAdminPath(path)) {
      // Verify the Cloudflare Access JWT in the Worker as defense in depth.
      // Cloudflare Access must also have a path-based application protecting
      // /admin* and /api/admin/* on this hostname, with an allowlist policy.
      if (!(await verifyAccessJwt(request, env))) {
        return new Response("Sign-in required. This private workspace is not available.", {
          status: 401,
          headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" }
        });
      }

      if (path.startsWith(API_PREFIX)) {
        if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
        if (path === "/api/admin/health") {
          if (!env.DB) return json({ ok: false, database: "not_configured" }, 503);
          try {
            await env.DB.prepare("SELECT 1 AS ok").first();
            return json({ ok: true, database: "connected" });
          } catch {
            return json({ ok: false, database: "unavailable" }, 503);
          }
        }
        return json({ error: "Not found" }, 404);
      }

      const assetPath = path === "/admin" || path === "/admin/" ? "/admin/index.html" : path;
      return env.ASSETS.fetch(new Request(new URL(assetPath, url), request));
    }

    return env.ASSETS.fetch(request);
  }
};
