import { siteConfig } from "@/config/portfolio";
import { getPublishedArticles } from "@/lib/articles.mjs";
import { generateRssFeed } from "@/lib/rss.mjs";

export const dynamic = "force-static";

export function GET() {
  const feed = generateRssFeed({
    articles: getPublishedArticles(),
    siteUrl: siteConfig.url,
    siteName: siteConfig.name,
    description: siteConfig.description,
  });

  return new Response(feed, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
