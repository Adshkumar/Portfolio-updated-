import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateReadingTime,
  getArticleMetadata,
  parseArticle,
  renderArticleMarkdown,
  selectPublishedArticles,
  validateArticleCollection,
} from "../src/lib/articles.mjs";

const validSource = `---
title: "A Test Article"
description: "A concise description."
slug: "a-test-article"
date: "2026-10-25"
tags:
  - Databases
category: "Databases"
difficulty: "intermediate"
published: false
featured: false
author: "Portfolio Author"
cover: null
---

Article body.`;

test("parses and validates article metadata", () => {
  const article = parseArticle(validSource);
  assert.equal(article.metadata.title, "A Test Article");
  assert.equal(article.metadata.published, false);
  assert.deepEqual(article.metadata.tags, ["Databases"]);
});

test("rejects malformed metadata and invalid dates", () => {
  assert.throws(() => parseArticle("No frontmatter"), /missing or malformed frontmatter/);
  assert.throws(
    () => parseArticle(validSource.replace("2026-10-25", "2026-02-30")),
    /valid YYYY-MM-DD date/
  );
});

test("calculates reading time from article prose", () => {
  assert.equal(calculateReadingTime("one two three"), 1);
  assert.equal(calculateReadingTime(Array(441).fill("word").join(" ")), 3);
});

test("public metadata does not include Markdown bodies or file paths", () => {
  const article = parseArticle(validSource);
  assert.deepEqual(Object.keys(getArticleMetadata(article)).sort(), [
    "author", "category", "cover", "date", "description", "difficulty",
    "featured", "published", "readingTime", "slug", "tags", "title",
  ].sort());
});

test("drafts are excluded from the published article collection", () => {
  const draft = parseArticle(validSource);
  const published = { ...draft, metadata: { ...draft.metadata, published: true } };
  assert.deepEqual(selectPublishedArticles([draft, published]), [published]);
});

test("duplicate published slugs are rejected", () => {
  const first = parseArticle(validSource);
  const duplicate = {
    ...first,
    sourceFile: "duplicate.md",
    metadata: { ...first.metadata, published: true },
  };
  const published = { ...first, metadata: { ...first.metadata, published: true } };
  assert.throws(
    () => validateArticleCollection([published, duplicate]),
    /Duplicate published article slug/
  );
});

test("renders Markdown without raw HTML or dangerous URL schemes", () => {
  const { html } = renderArticleMarkdown(
    '<script>alert("x")</script>\n\n[unsafe](javascript:alert(1))\n\n![remote](https://example.com/a.png)'
  );
  assert.doesNotMatch(html, /<script>/i);
  assert.doesNotMatch(html, /javascript:/i);
  assert.doesNotMatch(html, /<img/i);
  assert.match(html, /&lt;script&gt;/i);
});

test("highlights supported code and escapes unrecognized code languages", () => {
  const highlighted = renderArticleMarkdown("```js\nconst answer = 42;\n```").html;
  assert.match(highlighted, /hljs-keyword/);
  const plain = renderArticleMarkdown("```unknown<script>\n<unsafe>\n```").html;
  assert.match(plain, /&lt;unsafe&gt;/);
  assert.doesNotMatch(plain, /<unsafe>/);
});

test("generates stable unique heading IDs and table-of-contents entries", () => {
  const { html, headings } = renderArticleMarkdown("## Overview\n\n## Overview");
  assert.match(html, /id="overview"/);
  assert.match(html, /id="overview-1"/);
  assert.deepEqual(headings.map((heading) => heading.id), ["overview", "overview-1"]);
});
