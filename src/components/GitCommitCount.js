"use client";

import { useEffect, useState } from "react";

const CONTRIBUTIONS_URL = "/data/github-contributions.json";
const REFRESH_INTERVAL = 5 * 60 * 1000;

function isValidContributionData(data) {
  return (
    data &&
    Number.isSafeInteger(data.total) &&
    data.total >= 0 &&
    Array.isArray(data.years) &&
    data.years.length === 2 &&
    data.years.every(
      ({
        year,
        contributions,
        publicContributions,
        restrictedContributions,
      }) =>
        Number.isInteger(year) &&
        Number.isSafeInteger(contributions) &&
        contributions >= 0 &&
        Number.isSafeInteger(publicContributions) &&
        publicContributions >= 0 &&
        Number.isSafeInteger(restrictedContributions) &&
        restrictedContributions >= 0 &&
        contributions === publicContributions + restrictedContributions
    ) &&
    data.years[1].year === data.years[0].year + 1 &&
    data.total ===
      data.years.reduce((total, { contributions }) => total + contributions, 0)
  );
}

function needsInitialSync(data) {
  return (
    data?.total === null &&
    Array.isArray(data.years) &&
    data.years.length === 0
  );
}

export default function GitCommitCount() {
  const [contributions, setContributions] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    let active = true;
    let controller;
    let refreshTimeout;

    const refreshContributions = async () => {
      clearTimeout(refreshTimeout);
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;

      try {
        const response = await fetch(
          `${CONTRIBUTIONS_URL}?refresh=${Date.now()}`,
          {
            cache: "no-store",
            signal: requestController.signal,
          }
        );
        if (!response.ok) {
          throw new Error(`Contribution data returned HTTP ${response.status}`);
        }

        const data = await response.json();
        if (needsInitialSync(data)) {
          if (active) {
            setContributions(null);
            setSetupRequired(true);
            setUnavailable(false);
          }
          return;
        }
        if (!isValidContributionData(data)) {
          throw new Error("Contribution data has not been synced or is invalid");
        }

        if (active) {
          setContributions(data);
          setSetupRequired(false);
          setUnavailable(false);
        }
      } catch (error) {
        if (active && error.name !== "AbortError") {
          console.error("Unable to retrieve GitHub contribution totals:", error);
          setUnavailable(true);
        }
      } finally {
        if (active && !requestController.signal.aborted) {
          refreshTimeout = window.setTimeout(
            refreshContributions,
            REFRESH_INTERVAL
          );
        }
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshContributions();
    };

    refreshContributions();
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      clearTimeout(refreshTimeout);
      controller?.abort();
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  const currentYear = new Date().getUTCFullYear();
  const yearRange = contributions
    ? `${contributions.years[0].year}–${contributions.years[1].year}`
    : `${currentYear - 1}–${currentYear}`;
  const description = contributions
    ? `${contributions.total.toLocaleString()} GitHub contributions from ${contributions.years[0].year} and ${contributions.years[1].year}`
    : "GitHub contributions for the previous and current calendar years";
  const restrictedContributions =
    contributions?.years.reduce(
      (total, { restrictedContributions: count }) => total + count,
      0
    ) ?? 0;

  return (
    <>
      <span
        className="statNumber"
        aria-label={
          contributions
            ? description
            : "Waiting for GitHub contribution data"
        }
        aria-live="polite"
      >
        {contributions ? contributions.total.toLocaleString() : "—"}
      </span>
      <span
        className="statLabel"
        title={
          setupRequired
            ? "Add the CONTRIBUTIONS_TOKEN Actions secret to enable private contribution totals"
            : unavailable && contributions
              ? "Showing the last successful sync; check the GitHub Actions contribution sync"
              : unavailable
                ? "Contribution totals are unavailable; check the GitHub Actions sync and public data file"
                : restrictedContributions > 0
                  ? `Includes ${restrictedContributions.toLocaleString()} restricted contributions reported by GitHub`
                  : "GitHub reports no restricted contributions. If you expect private activity to count, enable “Include private contributions” in GitHub profile settings."
        }
      >
        {yearRange} Contributions{setupRequired ? " · setup required" : ""}
      </span>
    </>
  );
}
