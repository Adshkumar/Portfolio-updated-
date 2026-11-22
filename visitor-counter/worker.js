const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonResponse(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

function getCorsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowedOrigins = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!origin || !allowedOrigins.includes(origin)) return null;

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

const worker = {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(request, env);
    if (!corsHeaders) return jsonResponse({ error: "Origin not allowed" }, 403);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
    }

    if (typeof payload.visitorId !== "string" || !UUID_PATTERN.test(payload.visitorId)) {
      return jsonResponse({ error: "Invalid visitor identifier" }, 400, corsHeaders);
    }

    const counterId = env.COUNTER.idFromName("portfolio-unique-visitors");
    const counter = env.COUNTER.get(counterId);
    return counter.fetch("https://counter.internal/count", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: payload.visitorId }),
    }).then(async (response) =>
      jsonResponse(await response.json(), response.status, corsHeaders)
    );
  },
};

export default worker;

export class VisitorCounter {
  constructor(state) {
    this.sql = state.storage.sql;
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS visitors (visitor_hash TEXT PRIMARY KEY) WITHOUT ROWID"
    );
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS visitor_total (id INTEGER PRIMARY KEY CHECK (id = 1), total INTEGER NOT NULL)"
    );
    this.sql.exec("INSERT OR IGNORE INTO visitor_total (id, total) VALUES (1, 0)");
    this.sql.exec(`
      CREATE TRIGGER IF NOT EXISTS increment_visitor_total
      AFTER INSERT ON visitors
      BEGIN
        UPDATE visitor_total SET total = total + 1 WHERE id = 1;
      END
    `);
  }

  async fetch(request) {
    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    if (typeof payload.visitorId !== "string" || !UUID_PATTERN.test(payload.visitorId)) {
      return jsonResponse({ error: "Invalid visitor identifier" }, 400);
    }

    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(payload.visitorId)
    );
    const visitorKey = `visitor:${Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("")}`;

    this.sql.exec("INSERT OR IGNORE INTO visitors (visitor_hash) VALUES (?)", visitorKey);
    const [{ total }] = this.sql
      .exec("SELECT total FROM visitor_total WHERE id = 1")
      .toArray();

    return jsonResponse({ total }, 200);
  }
}
