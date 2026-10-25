import { getPublishedArticles } from "@/lib/articles.mjs";
import { siteConfig } from "@/config/portfolio";

export const dynamic = "force-static";

export default function sitemap() {
  return [
    { url: `${siteConfig.url}/articles`, changeFrequency: "weekly", priority: 0.7 },
    ...getPublishedArticles().map((article) => ({
      url: `${siteConfig.url}/articles/${article.metadata.slug}`,
      lastModified: article.metadata.updated || article.metadata.date,
      changeFrequency: "monthly",
      priority: 0.6,
    })),
  ];
}
