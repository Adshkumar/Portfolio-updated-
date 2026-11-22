"use client";

import { useCallback, useEffect, useState } from "react";

const counterUrl = process.env.NEXT_PUBLIC_VISITOR_COUNTER_URL;
const visitorIdKey = "portfolio-visitor-id:v1";

function createVisitorId() {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export default function VisitorCounter() {
  const [result, setResult] = useState({ status: "loading", total: null });

  const loadCount = useCallback(async () => {
    if (!counterUrl) {
      setResult({ status: "unconfigured", total: null });
      return;
    }

    setResult((current) => ({ ...current, status: "loading" }));

    try {
      let visitorId = window.localStorage.getItem(visitorIdKey);
      if (!visitorId) {
        visitorId = createVisitorId();
        window.localStorage.setItem(visitorIdKey, visitorId);
      }

      const response = await fetch(counterUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId }),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Visitor counter returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!Number.isSafeInteger(data.total) || data.total < 0) {
        throw new Error("Visitor counter returned an invalid total");
      }

      setResult({ status: "ready", total: data.total });
    } catch (error) {
      console.error("Unable to load the portfolio visitor count", error);
      setResult({ status: "error", total: null });
    }
  }, []);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  const message =
    result.status === "ready"
      ? `${result.total.toLocaleString()} unique visitors`
      : result.status === "loading"
        ? "Loading visitor count"
        : result.status === "unconfigured"
          ? "Visitor counter is not configured"
          : "Visitor count is unavailable";

  return (
    <aside
      className="visitorCounter"
      aria-label="Portfolio visitor count"
      title="Unique browsers counted once; not a count of individual people"
    >
      <i className="fas fa-users" aria-hidden="true"></i>
      <span className="visitorCounterLabel">Visitors</span>
      <strong aria-live="polite">
        {result.status === "ready" ? result.total.toLocaleString() : "—"}
      </strong>
      {result.status === "error" && (
        <button type="button" onClick={loadCount} aria-label="Retry visitor count">
          Retry
        </button>
      )}
      <span className="srOnly">{message}</span>
    </aside>
  );
}
