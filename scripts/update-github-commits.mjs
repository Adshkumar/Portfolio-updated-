import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const token = process.env.CONTRIBUTIONS_TOKEN;
if (!token) {
  throw new Error(
    "Missing CONTRIBUTIONS_TOKEN. Add a GitHub token as an Actions secret with access to the repositories to count."
  );
}

const login = process.env.GITHUB_LOGIN || "Adshkumar";
if (!/^[A-Za-z0-9-]+$/.test(login)) {
  throw new Error("GITHUB_LOGIN must be a valid GitHub username.");
}

const currentYear = new Date().getUTCFullYear();
const yearsToFetch = [currentYear - 1, currentYear];
const since = new Date(Date.UTC(currentYear - 1, 0, 1)).toISOString();
const until = new Date(Date.UTC(currentYear + 1, 0, 1) - 1).toISOString();
const yearCounts = new Map(
  yearsToFetch.map((year) => [
    year,
    {
      public: new Set(),
      private: new Set(),
      daily: new Map(),
    },
  ])
);
const outputPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../public/data/github-commits.json"
);
const headers = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "X-GitHub-Api-Version": "2022-11-28",
};
function nextPage(linkHeader) {
  const next = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
  return next?.[1] ?? null;
}

async function getJson(url, action) {
  const response = await fetch(url, { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      `${action} returned HTTP ${response.status}: ${
        data.message || "Unknown GitHub API error"
      }`
    );
  }
  return { data, linkHeader: response.headers.get("Link") };
}

async function getRepositories() {
  const repositories = [];
  let url = new URL("https://api.github.com/user/repos");
  url.search = new URLSearchParams({
    visibility: "all",
    affiliation: "owner,collaborator,organization_member",
    per_page: "100",
  }).toString();

  while (url) {
    const { data, linkHeader } = await getJson(
      url,
      "GitHub repository listing"
    );
    if (!Array.isArray(data)) {
      throw new Error("GitHub returned an invalid repository listing.");
    }
    repositories.push(...data);
    url = nextPage(linkHeader);
  }

  return repositories;
}

const { data: viewer } = await getJson(
  "https://api.github.com/user",
  "Authenticated GitHub account lookup"
);
if (viewer.login?.toLowerCase() !== login.toLowerCase()) {
  throw new Error(
    `CONTRIBUTIONS_TOKEN must belong to the GitHub account ${login}.`
  );
}

async function getRepositoryBranches(repository) {
  const branches = [];
  let url = new URL(
    `https://api.github.com/repos/${encodeURIComponent(
      repository.owner.login
    )}/${encodeURIComponent(repository.name)}/branches`
  );
  url.search = new URLSearchParams({
    per_page: "100",
  }).toString();

  while (url) {
    const { data, linkHeader } = await getJson(
      url,
      `Branch listing for ${repository.full_name}`
    );
    if (!Array.isArray(data)) {
      throw new Error(`GitHub returned an invalid branch listing for ${repository.full_name}.`);
    }
    branches.push(...data);
    url = nextPage(linkHeader);
  }

  if (!branches.length) {
    throw new Error(`GitHub returned no branches for ${repository.full_name}.`);
  }
  return branches;
}

async function addBranchCommits(repository, branch) {
  let url = new URL(
    `https://api.github.com/repos/${encodeURIComponent(
      repository.owner.login
    )}/${encodeURIComponent(repository.name)}/commits`
  );
  url.search = new URLSearchParams({
    author: login,
    sha: branch.name,
    since,
    until,
    per_page: "100",
  }).toString();

  while (url) {
    const { data, linkHeader } = await getJson(
      url,
      `Commit history for ${repository.full_name} (${branch.name})`
    );
    if (!Array.isArray(data)) {
      throw new Error(
        `GitHub returned an invalid commit history for ${repository.full_name} (${branch.name}).`
      );
    }
    for (const commit of data) {
      const authoredAt = new Date(commit.commit?.author?.date);
      if (Number.isNaN(authoredAt.getTime())) {
        throw new Error(
          `GitHub returned a commit with an invalid author date for ${repository.full_name}.`
        );
      }
      const year = authoredAt.getUTCFullYear();
      const counts = yearCounts.get(year);
      if (!counts) continue;
      if (typeof commit.sha !== "string" || commit.sha.length === 0) {
        throw new Error(
          `GitHub returned a commit without a SHA for ${repository.full_name}.`
        );
      }

      const visibility = repository.private ? "private" : "public";
      const date = authoredAt.toISOString().slice(0, 10);
      const day = counts.daily.get(date) || {
        public: new Set(),
        private: new Set(),
      };
      if (visibility === "public") {
        counts.public.add(commit.sha);
        counts.private.delete(commit.sha);
        day.public.add(commit.sha);
        day.private.delete(commit.sha);
      } else if (!counts.public.has(commit.sha)) {
        counts.private.add(commit.sha);
        day.private.add(commit.sha);
      }
      counts.daily.set(date, day);
    }

    url = nextPage(linkHeader);
  }
}

const repositories = await getRepositories();
for (const repository of repositories) {
  if (
    typeof repository.owner?.login !== "string" ||
    typeof repository.name !== "string" ||
    typeof repository.full_name !== "string" ||
    typeof repository.private !== "boolean"
  ) {
    throw new Error("GitHub returned a repository with invalid metadata.");
  }
  const branches = await getRepositoryBranches(repository);
  for (const branch of branches) {
    if (typeof branch.name !== "string" || !branch.name) {
      throw new Error(
        `GitHub returned a branch without a name for ${repository.full_name}.`
      );
    }
    await addBranchCommits(repository, branch);
  }
}

const years = yearsToFetch.map((year) => {
  const counts = yearCounts.get(year);
  const publicCommits = counts.public.size;
  const privateCommits = counts.private.size;
  const daily = [...counts.daily.entries()]
    .map(([date, day]) => {
      const publicDailyCommits = day.public.size;
      const privateDailyCommits = day.private.size;
      return {
        date,
        commits: publicDailyCommits + privateDailyCommits,
        publicCommits: publicDailyCommits,
        privateCommits: privateDailyCommits,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  return {
    year,
    commits: publicCommits + privateCommits,
    publicCommits,
    privateCommits,
    daily,
  };
});
const total = years.reduce((sum, { commits }) => sum + commits, 0);

let existing;
try {
  existing = JSON.parse(await readFile(outputPath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

if (
  total === 0 &&
  existing?.metric === "repository-commits" &&
  existing.total > 0
) {
  throw new Error(
    "GitHub returned zero repository commits even though the previous commit sync had results. Check that CONTRIBUTIONS_TOKEN can access the account's repositories."
  );
}

if (
  existing?.metric === "repository-commits" &&
  existing.total === total &&
  JSON.stringify(existing.years) === JSON.stringify(years)
) {
  console.log(`Repository commit totals unchanged: ${total}`);
  process.exit(0);
}

const data = {
  metric: "repository-commits",
  years,
  total,
  updatedAt: new Date().toISOString(),
};
await writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(
  `Updated ${years[0].year}–${years[1].year} repository commit total: ${total} across ${repositories.length} accessible repositories`
);
