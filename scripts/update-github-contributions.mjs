import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const token = process.env.CONTRIBUTIONS_TOKEN;
if (!token) {
  throw new Error(
    "Missing CONTRIBUTIONS_TOKEN. Add a GitHub token as an Actions secret with access to private repositories."
  );
}

const login = process.env.GITHUB_LOGIN || "Adshkumar";
const currentYear = new Date().getUTCFullYear();
const yearsToFetch = [currentYear - 1, currentYear];
const outputPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../public/data/github-contributions.json"
);
const query = `
  query($login: String!, $from: DateTime!, $to: DateTime!) {
    viewer {
      login
    }
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        restrictedContributionsCount
        contributionCalendar {
          totalContributions
        }
      }
    }
  }
`;

const years = [];
for (const year of yearsToFetch) {
  const from = new Date(Date.UTC(year, 0, 1)).toISOString();
  const to = new Date(Date.UTC(year + 1, 0, 1) - 1).toISOString();
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: { login, from, to },
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL returned HTTP ${response.status}`);
  }

  const result = await response.json();
  if (result.errors?.length) {
    throw new Error(
      `GitHub GraphQL failed: ${result.errors.map(({ message }) => message).join("; ")}`
    );
  }
  if (result.data?.viewer?.login?.toLowerCase() !== login.toLowerCase()) {
    throw new Error(
      `CONTRIBUTIONS_TOKEN must belong to the GitHub account ${login}`
    );
  }

  const collection = result.data?.user?.contributionsCollection;
  const visibleContributions =
    collection?.contributionCalendar?.totalContributions;
  const restrictedContributions = collection?.restrictedContributionsCount;
  if (
    !Number.isSafeInteger(visibleContributions) ||
    visibleContributions < 0 ||
    !Number.isSafeInteger(restrictedContributions) ||
    restrictedContributions < 0
  ) {
    throw new Error(`GitHub returned an invalid contribution total for ${year}`);
  }
  years.push({
    year,
    contributions: visibleContributions + restrictedContributions,
    calendarContributions: visibleContributions,
    restrictedContributions,
  });
}

const total = years.reduce(
  (sum, { contributions }) => sum + contributions,
  0
);

let existing;
try {
  existing = JSON.parse(await readFile(outputPath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

if (total === 0 && existing?.total > 0) {
  throw new Error(
    "GitHub returned zero contributions even though the previous sync had contributions. Keep “Include private contributions on my profile” enabled and turn off “Make profile private and hide activity”, then rerun the sync."
  );
}

if (
  existing?.total === total &&
  JSON.stringify(existing.years) === JSON.stringify(years)
) {
  console.log(`Contribution totals unchanged: ${total}`);
  process.exit(0);
}

const data = {
  years,
  total,
  updatedAt: new Date().toISOString(),
};
await writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(
  `Updated ${years[0].year}–${years[1].year} contribution total: ${total}`
);
