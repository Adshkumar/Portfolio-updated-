import { selectPublishedArticles } from "./articles.mjs";

function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  })[character]);
}

export function generateRssFeed({ articles, siteUrl, siteName, description }) {
  const baseUrl = siteUrl.replace(/\/$/, "");
  const publishedArticles = selectPublishedArticles(articles);
  const latestDate = publishedArticles[0]?.metadata.date;
  const items = publishedArticles.map(({ metadata }) => {
    const articleUrl = `${baseUrl}/articles/${metadata.slug}`;
    const categories = metadata.tags
      .map((tag) => `      <category>${escapeXml(tag)}</category>`)
      .join("\n");

    return `    <item>
      <title>${escapeXml(metadata.title)}</title>
      <link>${articleUrl}</link>
      <guid isPermaLink="true">${articleUrl}</guid>
      <description>${escapeXml(metadata.description)}</description>
      <pubDate>${new Date(`${metadata.date}T00:00:00.000Z`).toUTCString()}</pubDate>
${categories ? `${categories}\n` : ""}    </item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)} Articles</title>
    <link>${baseUrl}/articles</link>
    <description>${escapeXml(description)}</description>
    <language>en</language>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
${latestDate ? `    <lastBuildDate>${new Date(`${latestDate}T00:00:00.000Z`).toUTCString()}</lastBuildDate>\n` : ""}${items.join("\n")}
  </channel>
</rss>
`;
}
