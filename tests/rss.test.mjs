import assert from "node:assert/strict";
import test from "node:test";
import { parseArticle } from "../src/lib/articles.mjs";
import { generateRssFeed } from "../src/lib/rss.mjs";

const articleSource = `---
title: "A & B: <Systems>"
description: 'A summary with "quotes" & <markup>.'
slug: "a-systems-article"
date: "2026-10-25"
tags:
  - "Distributed & Reliable"
category: "Distributed Systems"
difficulty: "intermediate"
published: true
featured: false
author: "Portfolio Author"
cover: null
---

Article body.`;

test("RSS feed lists published articles and excludes drafts", () => {
  const article = parseArticle(articleSource);
  const draft = {
    ...article,
    metadata: { ...article.metadata, published: false, slug: "unpublished-draft" },
  };
  const feed = generateRssFeed({
    articles: [draft, article],
    siteUrl: "https://example.com/",
    siteName: "Portfolio & Site",
    description: "A <portfolio> & its work.",
  });
  assert.equal((feed.match(/<item>/g) || []).length, 1);
  assert.match(feed, /<title>A &amp; B: &lt;Systems&gt;<\/title>/);
  assert.match(feed, /<link>https:\/\/example\.com\/articles\/a-systems-article<\/link>/);
  assert.match(
    feed,
    /<description>A summary with &quot;quotes&quot; &amp; &lt;markup&gt;\.<\/description>/
  );
  assert.match(feed, /<category>Distributed &amp; Reliable<\/category>/);
  assert.doesNotMatch(feed, /unpublished-draft/);
});
