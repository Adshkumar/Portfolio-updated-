"use client";

import { useCallback, useEffect, useState } from "react";

const counterUrl = process.env.NEXT_PUBLIC_VISITOR_COUNTER_URL;
const visitorIdKey = "portfolio-visitor-id:v1";
const refreshIntervalMs = 15_000;

async function readCounterTotal(response) {
  if (!response.ok) {
    throw new Error(`Visitor counter returned HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!Number.isSafeInteger(data.total) || data.total < 0) {
    throw new Error("Visitor counter returned an invalid total");
  }

  return data.total;
}

function createVisitorId() {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export default function VisitorCounter() {
  const [result, setResult] = useState({
    status: counterUrl ? "loading" : "unconfigured",
    total: null,
  });

  const loadCount = useCallback(() => {
    if (!counterUrl) return Promise.resolve();

    return Promise.resolve()
      .then(() => {
        let visitorId = window.localStorage.getItem(visitorIdKey);
        if (!visitorId) {
          visitorId = createVisitorId();
          window.localStorage.setItem(visitorIdKey, visitorId);
        }

        return fetch(counterUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId }),
          cache: "no-store",
        });
      })
      .then(readCounterTotal)
      .then((total) => setResult({ status: "ready", total }))
      .catch((error) => {
        console.error("Unable to load the portfolio visitor count", error);
        setResult({ status: "error", total: null });
      });
  }, []);

  const refreshCount = useCallback(async () => {
    if (!counterUrl || document.visibilityState !== "visible") return;

    try {
      const response = await fetch(counterUrl, { cache: "no-store" });
      const total = await readCounterTotal(response);
      setResult((current) => ({
        status: "ready",
        total: current.total === null ? total : Math.max(current.total, total),
      }));
    } catch (error) {
      console.error("Unable to refresh the portfolio visitor count", error);
      setResult((current) =>
        current.total === null ? { status: "error", total: null } : current
      );
    }
  }, []);

  const retryLoadCount = useCallback(() => {
    setResult({ status: "loading", total: null });
    loadCount();
  }, [loadCount]);

  useEffect(() => {
    loadCount();
    const intervalId = window.setInterval(refreshCount, refreshIntervalMs);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshCount();
    };

    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadCount, refreshCount]);

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
      title="Unique browsers counted once; updates every 15 seconds"
    >
      <i className="fas fa-users" aria-hidden="true"></i>
      <span className="visitorCounterLabel">Visitors</span>
      <strong aria-live="polite">
        {result.status === "ready" ? result.total.toLocaleString() : "—"}
      </strong>
      {result.status === "error" && (
        <button type="button" onClick={retryLoadCount} aria-label="Retry visitor count">
          Retry
        </button>
      )}
      <span className="srOnly">{message}</span>
    </aside>
  );
}
