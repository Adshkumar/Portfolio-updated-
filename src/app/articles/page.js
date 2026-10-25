import ArticleIndex from "@/components/ArticleIndex";
import ThemeNavbar from "@/components/ThemeNavbar";
import { getArticleMetadata, getPublishedArticles } from "@/lib/articles.mjs";
import { siteConfig } from "@/config/portfolio";

export const metadata = {
  title: "Articles | Adarsh Kumar",
  description: "Practical explanations of software systems, algorithms, and engineering trade-offs.",
  alternates: { canonical: `${siteConfig.url}/articles` },
  openGraph: {
    title: "Articles | Adarsh Kumar",
    description: "Practical explanations of software systems, algorithms, and engineering trade-offs.",
    url: `${siteConfig.url}/articles`,
    type: "website",
  },
};

export default function ArticlesPage() {
  const articles = getPublishedArticles().map(getArticleMetadata);
  return (
    <>
      <ArticleIndex articles={articles} />
      <ThemeNavbar />
    </>
  );
}
