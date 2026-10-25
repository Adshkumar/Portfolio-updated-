"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

const PAGE_SIZE = 8;

function parseFilters(search) {
  const params = new URLSearchParams(search);
  return {
    query: params.get("q") || "",
    category: params.get("category") || "",
    tag: params.get("tag") || "",
  };
}

function subscribeToLocation(onChange) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function getLocationSearch() {
  return window.location.search;
}

function getServerSearch() {
  return "";
}

export default function ArticleIndex({ articles }) {
  const locationSearch = useSyncExternalStore(
    subscribeToLocation,
    getLocationSearch,
    getServerSearch
  );
  const [filterOverride, setFilterOverride] = useState(null);
  const [page, setPage] = useState(1);
  const filters = filterOverride || parseFilters(locationSearch);

  const categories = useMemo(
    () => [...new Set(articles.map((article) => article.category))].sort(),
    [articles]
  );
  const tags = useMemo(
    () => [...new Set(articles.flatMap((article) => article.tags))].sort(),
    [articles]
  );
  const filteredArticles = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return articles.filter((article) => {
      const matchesQuery = !query || [
        article.title,
        article.description,
        article.category,
        ...article.tags,
      ].join(" ").toLowerCase().includes(query);
      return matchesQuery &&
        (!filters.category || article.category === filters.category) &&
        (!filters.tag || article.tags.includes(filters.tag));
    });
  }, [articles, filters]);
  const visibleArticles = filteredArticles.slice(0, page * PAGE_SIZE);
  const groupedArticles = visibleArticles.reduce((groups, article) => {
    const year = article.date.slice(0, 4);
    if (!groups[year]) groups[year] = [];
    groups[year].push(article);
    return groups;
  }, {});

  const updateFilter = (name, value) => {
    setPage(1);
    setFilterOverride((current) => ({ ...(current || filters), [name]: value }));
  };

  return (
    <div className="articlesPage page">
      <main className="articlesContainer">
        <Link className="articlesBackLink" href="/#home">
          <i className="fas fa-arrow-left" aria-hidden="true"></i>
          Portfolio
        </Link>
        <header className="articlesHeader">
          <p className="articlesEyebrow">Engineering notes</p>
          <h1>Articles</h1>
          <p>
            Practical explanations of the systems, algorithms, and engineering
            trade-offs behind reliable software.
          </p>
        </header>

        <section className="articleListing" aria-labelledby="latest-heading">
          <h2 id="latest-heading" className="srOnly">Latest articles</h2>
          <div className="articleFilters" role="search">
            <label className="articleSearchField">
              <span className="srOnly">Search article titles and descriptions</span>
              <i className="fas fa-search" aria-hidden="true"></i>
              <input
                type="search"
                value={filters.query}
                onChange={(event) => updateFilter("query", event.target.value)}
                placeholder="Search articles"
              />
            </label>
            <label>
              <span className="srOnly">Filter by category</span>
              <select
                value={filters.category}
                onChange={(event) => updateFilter("category", event.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="srOnly">Filter by tag</span>
              <select
                value={filters.tag}
                onChange={(event) => updateFilter("tag", event.target.value)}
              >
                <option value="">All tags</option>
                {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            </label>
          </div>

          {visibleArticles.length > 0 ? (
            <>
              <div className="articleTimeline">
                {Object.entries(groupedArticles).map(([year, yearArticles]) => (
                  <section className="articleYearGroup" key={year} aria-labelledby={`year-${year}`}>
                    <header className="articleYearHeader">
                      <h2 id={`year-${year}`}>{year}</h2>
                      <span>({filteredArticles.filter((article) => article.date.startsWith(year)).length})</span>
                    </header>
                    <ol className="articleYearList">
                      {yearArticles.map((article) => (
                        <ArticleTimelineRow key={article.slug} article={article} />
                      ))}
                    </ol>
                  </section>
                ))}
              </div>
              {visibleArticles.length < filteredArticles.length && (
                <button
                  type="button"
                  className="articleLoadMore"
                  onClick={() => setPage((current) => current + 1)}
                >
                  Load more articles
                </button>
              )}
            </>
          ) : (
            <div className="articlesEmptyState">
              <i className="fas fa-book-open" aria-hidden="true"></i>
              <h3>{articles.length ? "No matching articles" : "No published articles yet"}</h3>
              <p>
                {articles.length
                  ? "Try another search term or clear the selected filters."
                  : "New technical articles will appear here after they are reviewed and published."}
              </p>
              {(filters.query || filters.category || filters.tag) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterOverride({ query: "", category: "", tag: "" });
                    setPage(1);
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ArticleTimelineRow({ article }) {
  const date = new Date(`${article.date}T00:00:00.000Z`);
  return (
    <li className="articleTimelineRow">
      <time dateTime={article.date}>
        {date.toLocaleDateString("en", { month: "short", day: "2-digit", timeZone: "UTC" })}
      </time>
      <div className="articleTimelineContent">
        <Link className="articleTimelineTitle" href={`/articles/${article.slug}`}>
          {article.title}
        </Link>
        <span className="articleTimelineReadingTime">{article.readingTime} min read</span>
        <div className="articleTimelineTags" aria-label="Article category and tags">
          <a href={`/articles?category=${encodeURIComponent(article.category)}`} className="articleTimelineTag">
            {article.category}
          </a>
        {article.tags.map((tag) => (
          <a key={tag} href={`/articles?tag=${encodeURIComponent(tag)}`} className="articleTimelineTag">
            {tag}
          </a>
        ))}
        </div>
      </div>
    </li>
  );
}
