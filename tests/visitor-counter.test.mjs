import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerSource = await readFile(
  new URL("../visitor-counter/worker.js", import.meta.url),
  "utf8"
);
const { default: worker, VisitorCounter } = await import(
  `data:text/javascript;base64,${Buffer.from(workerSource).toString("base64")}`
);

function createCounter() {
  const visitorHashes = new Set();
  let total = 0;
  const sql = {
    exec(query, visitorHash) {
      if (query.startsWith("INSERT OR IGNORE INTO visitors")) {
        if (!visitorHashes.has(visitorHash)) {
          visitorHashes.add(visitorHash);
          total += 1;
        }
      }

      if (query.startsWith("SELECT total FROM visitor_total")) {
        return { toArray: () => [{ total }] };
      }

      return { toArray: () => [] };
    },
  };
  const durableObject = new VisitorCounter({ storage: { sql } });
  const env = {
    ALLOWED_ORIGINS: "https://adshkumar.is-a.dev",
    COUNTER: {
      idFromName: (name) => name,
      get: () => ({
        fetch: (url, init) => durableObject.fetch(new Request(url, init)),
      }),
    },
  };

  return { env, visitorHashes, worker };
}

function makeRequest(visitorId, options = {}) {
  const headers = new Headers({
    Origin: options.origin || "https://adshkumar.is-a.dev",
  });
  const init = { method: options.method || "POST", headers };

  if (options.method !== "OPTIONS" && options.method !== "GET") {
    headers.set("Content-Type", "application/json");
    init.body = JSON.stringify({ visitorId });
  }

  return new Request("https://counter.example/count", init);
}

test("counts each browser once and increments for a new browser", async () => {
  const { env } = createCounter();
  const firstVisitor = "00000000-0000-4000-8000-000000000001";
  const secondVisitor = "00000000-0000-4000-8000-000000000002";

  const first = await worker.fetch(makeRequest(firstVisitor), env);
  const reload = await worker.fetch(makeRequest(firstVisitor), env);
  const second = await worker.fetch(makeRequest(secondVisitor), env);

  assert.equal((await first.json()).total, 1);
  assert.equal((await reload.json()).total, 1);
  assert.equal((await second.json()).total, 2);
});

test("rejects invalid visitor IDs and unapproved origins", async () => {
  const { env } = createCounter();

  const invalidId = await worker.fetch(makeRequest("not-a-uuid"), env);
  const invalidOrigin = await worker.fetch(
    makeRequest("00000000-0000-4000-8000-000000000001", {
      origin: "https://unexpected.example",
    }),
    env
  );

  assert.equal(invalidId.status, 400);
  assert.equal(invalidOrigin.status, 403);
});

test("answers allowed CORS preflight requests", async () => {
  const { env } = createCounter();
  const response = await worker.fetch(
    makeRequest(null, { method: "OPTIONS" }),
    env
  );

  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get("Access-Control-Allow-Origin"),
    "https://adshkumar.is-a.dev"
  );
});
