# Technical Articles

Articles are Markdown files in this directory. Each file is parsed and validated at build time. The static site includes only entries with `published: true`; drafts do not appear in generated article routes, listing metadata, or the sitemap.

## Structure

```text
content/articles/
  README.md
  b-trees-and-lsm-trees.md
  distributed-rate-limiter.md
  idempotency-and-retries.md
  cache-invalidation-and-stampedes.md
  api-evolution-and-safe-migrations.md
  multi-tenant-saas-isolation.md
  webrtc-signaling-ice-and-media.md
  sfu-vs-mcu-group-video-architecture.md
  mediasoup-sfu-architecture.md
public/articles/images/
  btree-lsm-storage.svg
  rate-limiter-flow.svg
  idempotency-retry-flow.svg
  cache-invalidation-flow.svg
  api-evolution-migration.svg
  multi-tenant-isolation.svg
  webrtc-connection-flow.svg
  sfu-vs-mcu-topologies.svg
  mediasoup-room-flow.svg
```

There is one file per article. Add files directly in `content/articles/`; no application-code change is needed. Put local diagram or image assets under `public/articles/` and reference them from Markdown with an absolute site path such as `/articles/images/diagram.svg`.
The Articles index automatically groups published entries by the year in `date`, with the newest entries first. It displays a dated timeline rather than article cards; adding a dated Markdown file is enough for it to appear in the appropriate year after deployment.

## Metadata

Every article requires the following frontmatter:

```yaml
---
title: "An Accurate, Specific Title"
description: "A useful summary for readers and search results."
slug: "an-accurate-specific-title"
date: "2026-10-25"
tags:
  - Distributed Systems
  - Reliability
category: "Distributed Systems"
difficulty: "advanced"
published: false
featured: false
author: "Adarsh Kumar"
cover: null
---
```

Use a unique lowercase kebab-case slug, an ISO calendar date, a supported category (`Data Structures`, `System Design`, `Distributed Systems`, `Databases`, `Backend Engineering`, `Infrastructure`, `Reliability`, or `Architecture`), and `beginner`, `intermediate`, or `advanced` difficulty. Tags must be a non-empty list of strings. `cover` is either `null` or a local `/articles/...` asset. An optional `updated: "YYYY-MM-DD"` date is only for a real content update and cannot predate the original publication date.

The metadata parser intentionally supports this constrained YAML subset: quoted strings, `true`/`false`, `null`, and dash lists. Avoid YAML features that are not shown here. Validation detects missing or unknown fields, invalid types and dates, duplicate published slugs, invalid local image paths, and links to unpublished or unknown article slugs. Reading time is calculated from prose at approximately 220 words per minute.

## Write, preview, publish

1. Create a Markdown file with a complete metadata block and set `published: false`.
2. Write and technically review the full article, checking claims, examples, and trade-offs.
3. Add local SVG diagrams when they materially improve understanding. Give every image useful alt text and explain its flow, boundaries, and failure cases in nearby prose.
4. Preview using `npm run dev` and open `/articles` and `/articles/<slug>`. Draft routes are intentionally absent from the static build; preview draft content by temporarily setting `published: true` locally, then restore it until ready to publish.
5. Run `npm run validate:articles`, `npm run test:articles`, `npm run lint`, and `npm run build`.
6. Set `published: true` only after review. Commit and deploy using the repository's existing static export workflow.
7. To unpublish an article, set `published: false` and rebuild. The route and its listing/search/sitemap entries will no longer be generated.

## Markdown, diagrams, and security

The renderer supports GitHub-Flavored Markdown tables, lists, quotes, inline code, and fenced code blocks. Highlight.js highlights supported language labels during static generation; unrecognized or unlabeled blocks remain safely escaped plain text. Raw HTML is escaped rather than executed. Link schemes are restricted; images must be local `/articles/` assets, and article images are lazy-loaded. Code samples are displayed, never executed.

Use self-contained SVGs for diagrams. Give the SVG a `<title>` and `<desc>`, keep labels legible on mobile, avoid color-only distinctions, and include a Markdown alt description and a prose caption/explanation. Mermaid source is not executed or rendered; provide a reviewed static SVG instead. This avoids shipping a large client-side diagram runtime and avoids interpreting article text as executable diagram instructions.

Internal links to other articles use `/articles/<slug>` and are checked against published slugs. Review other local links and code examples manually. Do not include remote images or private information in article assets.

## Checks and deployment

`npm run validate:articles` parses every Markdown article, including drafts. `npm run test:articles` exercises metadata parsing, date validation, reading time, public metadata separation, Markdown safety, and heading IDs. `npm run build` emits the static site and sitemap. As a static export, new and unpublished content becomes visible only after the normal build and deployment; there is no runtime database, search API, or server-side draft preview.
