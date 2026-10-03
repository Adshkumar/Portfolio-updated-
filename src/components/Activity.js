"use client";

import { useEffect, useMemo, useState } from "react";

const COMMITS_API = "/data/github-commits.json";
const LEETCODE_CALENDAR_API =
  "https://alfa-leetcode-api.onrender.com/Adarsh_kumar62041/calendar";
const CONTRIBUTIONS_REFRESH_INTERVAL = 5 * 60 * 1000;
const ACTIVITY_CACHE_PREFIX = "portfolio-activity-v2";
const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function getCalendarWeeks(year, contributions) {
  const contributionsByDate = new Map(
    contributions.map((day) => [day.date, day])
  );
  const start = new Date(year, 0, 1);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(year, 11, 31);
  end.setDate(end.getDate() + (6 - end.getDay()));

  const weeks = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const week = [];
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
      const date = new Date(cursor);
      const isoDate = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");
      const contribution = contributionsByDate.get(isoDate);

      week.push(
        date.getFullYear() === year && contribution
          ? { ...contribution, date: isoDate }
          : null
      );
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

function getRollingCalendar(contributions, today) {
  const contributionsByDate = new Map(
    contributions.map((day) => [day.date, day])
  );
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  start.setDate(start.getDate() - 364);
  const gridStart = new Date(start);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const gridEnd = new Date(today);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

  const weeks = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    const week = [];
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
      const date = new Date(cursor);
      const isoDate = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");
      const contribution = contributionsByDate.get(isoDate);

      week.push(
        date >= start && date <= today
          ? contribution || { date: isoDate, count: 0, level: 0 }
          : null
      );
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

function getMonthPositions(year) {
  const firstDay = new Date(year, 0, 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  return MONTH_LABELS.map((label, month) => {
    const monthStart = new Date(year, month, 1);
    const daysFromGridStart = Math.round(
      (monthStart - gridStart) / (24 * 60 * 60 * 1000)
    );

    return {
      label,
      week: Math.floor(daysFromGridStart / 7),
    };
  });
}

function getRollingMonthPositions(today) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  start.setDate(start.getDate() - 364);
  const gridStart = new Date(start);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const positions = [];
  const month = new Date(start.getFullYear(), start.getMonth(), 1);
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  while (month < currentMonth) {
    const monthDate = new Date(month);
    const daysFromGridStart = Math.floor(
      (monthDate - gridStart) / (24 * 60 * 60 * 1000)
    );
    positions.push({
      label: MONTH_LABELS[month.getMonth()],
      week: Math.floor(daysFromGridStart / 7),
    });
    month.setMonth(month.getMonth() + 1);
  }

  return positions;
}

function toIsoDate(timestamp) {
  return new Date(Number(timestamp) * 1000).toISOString().slice(0, 10);
}

function getLeetCodeLevel(count) {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

function getGitHubCommitLevel(count) {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

function getLocalDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export default function Activity({ theme = "dark" }) {
  const year = new Date().getFullYear();
  const [today, setToday] = useState(() => new Date());
  const todayKey = getLocalDateKey(today);
  const isLeetCodeDay =
    theme === "dark" &&
    Math.floor(
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() /
        86400000
    ) %
      2 ===
      1;
  const platform = isLeetCodeDay ? "leetcode" : "github";
  const [contributionData, setContributionData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;
    let controller;

    try {
      const cachedData = localStorage.getItem(
        `${ACTIVITY_CACHE_PREFIX}:${platform}`
      );
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        if (
          parsedData.platform === platform &&
          Array.isArray(parsedData.contributions) &&
          typeof parsedData.total === "number"
        ) {
          setContributionData(parsedData);
        }
      }
    } catch (cacheError) {
      console.warn("Activity cache could not be read.", cacheError);
    }

    function saveActivityData(data) {
      setContributionData(data);
      try {
        localStorage.setItem(
          `${ACTIVITY_CACHE_PREFIX}:${platform}`,
          JSON.stringify(data)
        );
      } catch (cacheError) {
        console.warn("Activity cache could not be saved.", cacheError);
      }
    }

    async function loadGithubContributions() {
      controller?.abort();
      controller = new AbortController();

      try {
        const response = await fetch(
          `${COMMITS_API}?refresh=${Date.now()}`,
          { cache: "no-store", signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(
            `GitHub commit data request failed (${response.status}).`
          );
        }

        const result = await response.json();
        const yearData = result.years?.find(
          (yearEntry) => yearEntry.year === year
        );
        if (
          result.metric !== "repository-commits" ||
          !Array.isArray(yearData?.daily) ||
          !Number.isSafeInteger(yearData.commits) ||
          yearData.daily.some(
            ({ date, commits, publicCommits, privateCommits }) =>
              typeof date !== "string" ||
              !date.startsWith(`${year}-`) ||
              !Number.isSafeInteger(commits) ||
              commits < 0 ||
              !Number.isSafeInteger(publicCommits) ||
              publicCommits < 0 ||
              !Number.isSafeInteger(privateCommits) ||
              privateCommits < 0 ||
              commits !== publicCommits + privateCommits
          ) ||
          yearData.commits !==
            yearData.daily.reduce((total, day) => total + day.commits, 0)
        ) {
          throw new Error("GitHub commit data response was incomplete.");
        }

        if (!disposed) {
          const contributions = yearData.daily.map(({ date, commits }) => ({
            date,
            count: commits,
            level: getGitHubCommitLevel(commits),
          }));
          saveActivityData({
            platform: "github",
            total: yearData.commits,
            contributions,
          });
          setError("");
        }
      } catch (loadError) {
        if (!disposed && loadError.name !== "AbortError") {
          setError("GitHub commits could not be refreshed.");
        }
      }
    }

    async function loadLeetCodeContributions() {
      controller?.abort();
      controller = new AbortController();
      const years = [year - 1, year];

      try {
        const results = await Promise.all(
          years.map(async (calendarYear) => {
            const response = await fetch(
              `${LEETCODE_CALENDAR_API}?year=${calendarYear}`,
              { signal: controller.signal }
            );

            if (!response.ok) {
              throw new Error(
                `LeetCode calendar request failed (${response.status}).`
              );
            }

            const result = await response.json();
            if (typeof result.submissionCalendar !== "string") {
              throw new Error("LeetCode calendar response was incomplete.");
            }

            return JSON.parse(result.submissionCalendar);
          })
        );

        const start = new Date(today);
        start.setDate(start.getDate() - 364);
        const startKey = [
          start.getFullYear(),
          String(start.getMonth() + 1).padStart(2, "0"),
          String(start.getDate()).padStart(2, "0"),
        ].join("-");
        const dailyCounts = new Map();

        results.forEach((calendar) => {
          Object.entries(calendar).forEach(([timestamp, count]) => {
            const date = toIsoDate(timestamp);
            if (date >= startKey && date <= todayKey) {
              dailyCounts.set(date, Number(count));
            }
          });
        });

        const contributions = [];
        const cursor = new Date(start);
        let total = 0;
        while (cursor <= today) {
          const date = [
            cursor.getFullYear(),
            String(cursor.getMonth() + 1).padStart(2, "0"),
            String(cursor.getDate()).padStart(2, "0"),
          ].join("-");
          const count = dailyCounts.get(date) || 0;
          total += count;
          contributions.push({
            date,
            count,
            level: getLeetCodeLevel(count),
          });
          cursor.setDate(cursor.getDate() + 1);
        }

        if (!disposed) {
          saveActivityData({
            platform: "leetcode",
            total,
            contributions,
          });
          setError("");
        }
      } catch (loadError) {
        if (!disposed && loadError.name !== "AbortError") {
          setError("LeetCode submissions could not be refreshed.");
        }
      }
    }

    const loadContributions =
      platform === "leetcode"
        ? loadLeetCodeContributions
        : loadGithubContributions;

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        setToday((previous) => {
          const now = new Date();
          return getLocalDateKey(previous) === getLocalDateKey(now)
            ? previous
            : now;
        });
        loadContributions();
      }
    }

    loadContributions();
    const intervalId = window.setInterval(() => {
      setToday((previous) => {
        const now = new Date();
        return getLocalDateKey(previous) === getLocalDateKey(now)
          ? previous
          : now;
      });
      loadContributions();
    }, CONTRIBUTIONS_REFRESH_INTERVAL);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);

    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, [platform, year, today, todayKey]);

  const weeks = useMemo(
    () =>
      contributionData
        ? contributionData.platform === "leetcode"
          ? getRollingCalendar(contributionData.contributions, today)
          : getCalendarWeeks(year, contributionData.contributions)
        : [],
    [contributionData, today, year]
  );
  const monthPositions = useMemo(
    () =>
      contributionData?.platform === "leetcode"
        ? getRollingMonthPositions(today)
        : getMonthPositions(year),
    [contributionData?.platform, today, year]
  );
  const visibleContributionData =
    contributionData?.platform === platform ? contributionData : null;

  return (
    <section id="activity" className="section reveal">
      <h2 className="sectionTitle">Activity</h2>
      <p className="sectionLead">
        GitHub contributions and LeetCode submissions.
      </p>
      <div className="contributionCalendar">
        {!visibleContributionData && error ? (
          <p className="contributionMessage" role="status">
            {error} Please try again later.
          </p>
        ) : visibleContributionData ? (
          <>
            <div className="contributionHeader">
              <p className="contributionSummary">
                {visibleContributionData.platform === "leetcode"
                  ? `${visibleContributionData.total} submissions in the past one year`
                  : `${visibleContributionData.total} commits in ${year}`}
              </p>
              <a
                className="contributionSettings"
                href={
                  visibleContributionData.platform === "leetcode"
                    ? "https://leetcode.com/u/Adarsh_kumar62041/"
                    : "https://github.com/search?q=owner%3AAdshkumar+commits&type=commits"
                }
                target="_blank"
                rel="noreferrer"
              >
                {visibleContributionData.platform === "leetcode"
                  ? "LeetCode profile"
                  : "Contribution settings"}{" "}
                <span aria-hidden="true">⌄</span>
              </a>
            </div>
            {error ? (
              <p className="contributionMessage" role="status">
                {error} Showing the latest available data.
              </p>
            ) : null}
            <div className="contributionGridWrap">
              <div className="contributionWeekdays" aria-hidden="true">
                {WEEKDAY_LABELS.map((label, index) => (
                  <span key={index}>{label}</span>
                ))}
              </div>
              <div className="contributionCalendarBody">
                <div className="contributionMonths" aria-hidden="true">
                  {monthPositions.map(({ label, week }) => (
                    <span key={label} style={{ gridColumn: week + 1 }}>
                      {label}
                    </span>
                  ))}
                </div>
                <div
                  className="contributionWeeks"
                  role="grid"
                  aria-label={
                    visibleContributionData.platform === "leetcode"
                      ? "LeetCode submissions in the past year"
                      : `GitHub commits in ${year}`
                  }
                >
                  {weeks.map((week, weekIndex) => (
                    <div
                      className="contributionWeek"
                      role="row"
                      key={weekIndex}
                    >
                      {week.map((day, dayIndex) =>
                        day ? (
                          <span
                            className="contributionDay"
                            data-level={day.level}
                            role="gridcell"
                            aria-label={`${day.count} ${visibleContributionData.platform === "leetcode" ? "submissions" : "commits"} on ${day.date}`}
                            title={`${day.count} ${visibleContributionData.platform === "leetcode" ? "submissions" : "commits"} on ${day.date}`}
                            key={day.date}
                          />
                        ) : (
                          <span
                            className="contributionDay contributionDayEmpty"
                            aria-hidden="true"
                            key={`empty-${weekIndex}-${dayIndex}`}
                          />
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="contributionFooter">
              <a
                className="contributionLearnMore"
                href={
                  visibleContributionData.platform === "leetcode"
                    ? "https://leetcode.com/u/Adarsh_kumar62041/"
                    : "https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference"
                }
                target="_blank"
                rel="noreferrer"
              >
                {visibleContributionData.platform === "leetcode"
                  ? "LeetCode submissions"
                  : "GitHub commits across public and private repositories"}
              </a>
              <div
                className="contributionLegend"
                aria-label="Contribution levels"
              >
                <span>Less</span>
                {[0, 1, 2, 3, 4].map((level) => (
                  <span
                    className="contributionDay"
                    data-level={level}
                    aria-hidden="true"
                    key={level}
                  />
                ))}
                <span>More</span>
              </div>
            </div>
          </>
        ) : (
          <p className="contributionMessage" role="status">
            Loading{" "}
            {platform === "leetcode"
              ? "LeetCode submissions"
              : `${year} GitHub commits`}
            ...
          </p>
        )}
      </div>
    </section>
  );
}
