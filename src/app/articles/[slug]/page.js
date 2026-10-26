import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleAuthorHeader from "@/components/ArticleAuthorHeader";
import ArticleProse from "@/components/ArticleProse";
import ThemeNavbar from "@/components/ThemeNavbar";
import {
  getPublishedArticles,
  renderArticleMarkdown,
} from "@/lib/articles.mjs";
import { siteConfig } from "@/config/portfolio";

export const dynamicParams = false;

export function generateStaticParams() {
  return getPublishedArticles().map((article) => ({ slug: article.metadata.slug }));
}

async function findArticle(params) {
  const { slug } = await params;
  return getPublishedArticles().find((article) => article.metadata.slug === slug);
}

export async function generateMetadata({ params }) {
  const article = await findArticle(params);
  if (!article) return {};
  const { metadata: details } = article;
  const canonical = `${siteConfig.url}/articles/${details.slug}`;
  return {
    title: `${details.title} | Articles`,
    description: details.description,
    alternates: { canonical },
    openGraph: {
      title: details.title,
      description: details.description,
      url: canonical,
      type: "article",
      publishedTime: details.date,
      authors: [details.author],
      tags: details.tags,
      ...(details.cover ? { images: [details.cover] } : {}),
    },
  };
}

export default async function ArticlePage({ params }) {
  const article = await findArticle(params);
  if (!article) notFound();

  const { metadata: details, body, readingTime } = article;
  const { html, headings } = renderArticleMarkdown(body);
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: details.title,
    description: details.description,
    datePublished: details.date,
    ...(details.updated ? { dateModified: details.updated } : {}),
    author: { "@type": "Person", name: details.author },
    mainEntityOfPage: `${siteConfig.url}/articles/${details.slug}`,
  };

  return (
    <>
      <div className="page articlePage">
        <main className="articleContainer">
          <ArticleAuthorHeader />
          <nav className="articleBreadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/articles">Articles</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{details.title}</span>
          </nav>
          <header className="articleHeader">
            <p className="articlesEyebrow">{details.category}</p>
            <h1>{details.title}</h1>
            <p className="articleDescription">{details.description}</p>
            <div className="articleByline">
              <span>{details.author}</span>
              <time dateTime={details.date}>
                {new Date(`${details.date}T00:00:00.000Z`).toLocaleDateString("en", {
                  month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
                })}
              </time>
              {details.updated && (
                <time dateTime={details.updated}>
                  Updated {new Date(`${details.updated}T00:00:00.000Z`).toLocaleDateString("en", {
                    month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
                  })}
                </time>
              )}
              <span>{readingTime} min read</span>
            </div>
            <div className="articleTagList">
              {details.tags.map((tag) => (
                <a key={tag} href={`/articles?tag=${encodeURIComponent(tag)}`} className="articleTag">{tag}</a>
              ))}
            </div>
          </header>

          {headings.length >= 4 && (
            <nav className="articleToc" aria-label="Table of contents">
              <h2>On this page</h2>
              <ol>
                {headings.map((heading) => (
                  <li key={heading.id} className={heading.depth === 3 ? "articleTocNested" : ""}>
                    <a href={`#${heading.id}`}>{heading.text}</a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <ArticleProse html={html} />
        </main>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replaceAll("<", "\\u003c") }}
      />
      <ThemeNavbar />
    </>
  );
}
