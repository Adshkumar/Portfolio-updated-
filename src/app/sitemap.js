import { getPublishedArticles } from "@/lib/articles.mjs";
import { siteConfig } from "@/config/portfolio";
import { caseStudies } from "@/config/caseStudies";

export const dynamic = "force-static";

export default function sitemap() {
  const baseUrl = siteConfig.url.replace(/\/$/, "");

  return [
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/articles`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/experience`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/experience/finance-tracker`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/borg`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...caseStudies.map(({ slug }) => ({
      url: `${baseUrl}/experience/${slug}`,
      changeFrequency: "monthly",
      priority: 0.7,
    })),
    ...getPublishedArticles().map((article) => ({
      url: `${baseUrl}/articles/${article.metadata.slug}`,
      lastModified: article.metadata.updated || article.metadata.date,
      changeFrequency: "monthly",
      priority: 0.6,
    })),
  ];
}
