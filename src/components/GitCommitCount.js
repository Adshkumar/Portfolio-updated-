"use client";

import { useEffect, useState } from "react";

const COMMITS_URL = "/data/github-commits.json";
const REFRESH_INTERVAL = 5 * 60 * 1000;

function isValidCommitData(data) {
  return (
    data &&
    data.metric === "repository-commits" &&
    Number.isSafeInteger(data.total) &&
    data.total >= 0 &&
    Array.isArray(data.years) &&
    data.years.length === 2 &&
    data.years.every(
      ({
        year,
        commits,
        publicCommits,
        privateCommits,
      }) =>
        Number.isInteger(year) &&
        Number.isSafeInteger(commits) &&
        commits >= 0 &&
        Number.isSafeInteger(publicCommits) &&
        publicCommits >= 0 &&
        Number.isSafeInteger(privateCommits) &&
        privateCommits >= 0 &&
        commits === publicCommits + privateCommits
    ) &&
    data.years[1].year === data.years[0].year + 1 &&
    data.total ===
      data.years.reduce((total, { commits }) => total + commits, 0)
  );
}

function needsInitialSync(data) {
  return (
    (data?.total === null &&
      data.metric === "repository-commits" &&
      Array.isArray(data.years) &&
      data.years.length === 0) ||
    (data?.metric !== "repository-commits" &&
      Number.isSafeInteger(data?.total) &&
      Array.isArray(data?.years) &&
      data.years.every(({ year, contributions }) =>
        Number.isInteger(year) &&
        Number.isSafeInteger(contributions) &&
        contributions >= 0
      ))
  );
}

export default function GitCommitCount() {
  const [commitData, setCommitData] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const [syncPending, setSyncPending] = useState(true);

  useEffect(() => {
    let active = true;
    let controller;
    let refreshTimeout;

    const refreshCommitData = async () => {
      clearTimeout(refreshTimeout);
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;

      try {
        const response = await fetch(
          `${COMMITS_URL}?refresh=${Date.now()}`,
          {
            cache: "no-store",
            signal: requestController.signal,
          }
        );
        if (!response.ok) {
          throw new Error(`Commit data returned HTTP ${response.status}`);
        }

        const data = await response.json();
        if (needsInitialSync(data)) {
          if (active) {
            setCommitData(null);
            setSyncPending(true);
            setUnavailable(false);
          }
          return;
        }
        if (!isValidCommitData(data)) {
          throw new Error("Commit data has not been synced or is invalid");
        }

        if (active) {
          setCommitData(data);
          setSyncPending(false);
          setUnavailable(false);
        }
      } catch (error) {
        if (active && error.name !== "AbortError") {
          console.error("Unable to retrieve GitHub commit totals:", error);
          setUnavailable(true);
        }
      } finally {
        if (active && !requestController.signal.aborted) {
          refreshTimeout = window.setTimeout(
            refreshCommitData,
            REFRESH_INTERVAL
          );
        }
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshCommitData();
    };

    refreshCommitData();
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      clearTimeout(refreshTimeout);
      controller?.abort();
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  const currentYear = new Date().getUTCFullYear();
  const yearRange = commitData
    ? `${commitData.years[0].year}–${commitData.years[1].year}`
    : `${currentYear - 1}–${currentYear}`;
  const description = commitData
    ? `${commitData.total.toLocaleString()} repository commits from ${commitData.years[0].year} and ${commitData.years[1].year}`
    : "Repository commits for the previous and current calendar years";
  const publicCommits =
    commitData?.years.reduce(
      (total, { publicCommits: count }) => total + count,
      0
    ) ?? 0;
  const privateCommits =
    commitData?.years.reduce(
      (total, { privateCommits: count }) => total + count,
      0
    ) ?? 0;

  return (
    <>
      <span
        className="statNumber"
        aria-label={
          commitData
            ? description
            : "Waiting for GitHub commit data"
        }
        aria-live="polite"
      >
        {commitData ? commitData.total.toLocaleString() : "—"}
      </span>
      <span
        className="statLabel"
        title={
          syncPending
            ? "Waiting for the first commit-only sync. GitHub Actions will count public and private repositories accessible to CONTRIBUTIONS_TOKEN."
            : unavailable && commitData
              ? "Showing the last successful sync; check the GitHub Actions commit sync"
              : unavailable
                ? "Commit totals are unavailable; check the GitHub Actions sync, token permissions, and public data file"
                : privateCommits > 0
                  ? `${publicCommits.toLocaleString()} public + ${privateCommits.toLocaleString()} private repository commits`
                  : `${publicCommits.toLocaleString()} public commits; no commits were returned from private repositories accessible to the sync token`
        }
      >
        {yearRange} Git Commits{syncPending ? " · sync pending" : ""}
      </span>
    </>
  );
}
