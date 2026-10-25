import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import hljs from "highlight.js/lib/common";
import { marked, Renderer } from "marked";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const articlesDirectory = path.join(projectRoot, "content", "articles");
const publicDirectory = path.join(projectRoot, "public");
const articleAssetsDirectory = path.join(publicDirectory, "articles");

export const ARTICLE_CATEGORIES = [
  "Data Structures",
  "System Design",
  "Distributed Systems",
  "Databases",
  "Backend Engineering",
  "Infrastructure",
  "Reliability",
  "Architecture",
];

const REQUIRED_FIELDS = [
  "title",
  "description",
  "slug",
  "date",
  "tags",
  "category",
  "difficulty",
  "published",
  "featured",
  "author",
  "cover",
];
const ALLOWED_FIELDS = new Set([...REQUIRED_FIELDS, "updated"]);
const DIFFICULTIES = new Set(["beginner", "intermediate", "advanced"]);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      throw new Error(`Invalid quoted value: ${trimmed}`);
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replaceAll("''", "'");
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  return trimmed;
}

export function parseArticle(source, fileName = "article.md") {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) throw new Error(`${fileName}: missing or malformed frontmatter`);

  const metadata = {};
  const lines = match[1].split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    const field = line.match(/^([a-zA-Z][a-zA-Z0-9_]*):(?:\s*(.*))?$/);
    if (!field) throw new Error(`${fileName}: malformed frontmatter at line ${index + 1}`);

    const [, key, rawValue = ""] = field;
    if (!ALLOWED_FIELDS.has(key)) throw new Error(`${fileName}: unknown field "${key}"`);
    if (Object.hasOwn(metadata, key)) throw new Error(`${fileName}: duplicate field "${key}"`);
    if (rawValue.trim()) {
      metadata[key] = parseScalar(rawValue);
      continue;
    }

    const values = [];
    while (index + 1 < lines.length && /^\s+-\s+/.test(lines[index + 1])) {
      index += 1;
      values.push(parseScalar(lines[index].replace(/^\s+-\s+/, "")));
    }
    if (!values.length) throw new Error(`${fileName}: missing value for "${key}"`);
    metadata[key] = values;
  }

  for (const key of REQUIRED_FIELDS) {
    if (!Object.hasOwn(metadata, key)) throw new Error(`${fileName}: missing required field "${key}"`);
  }
  validateArticleMetadata(metadata, fileName);
  return { metadata, body: match[2].trim(), sourceFile: fileName };
}

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function validateArticleMetadata(metadata, fileName = "article.md") {
  for (const key of ["title", "description", "slug", "category", "difficulty", "author"]) {
    if (typeof metadata[key] !== "string" || !metadata[key].trim()) {
      throw new Error(`${fileName}: "${key}" must be a non-empty string`);
    }
  }
  if (!SLUG_PATTERN.test(metadata.slug)) throw new Error(`${fileName}: invalid slug "${metadata.slug}"`);
  if (!isValidDate(metadata.date)) throw new Error(`${fileName}: date must be a valid YYYY-MM-DD date`);
  if (metadata.updated !== undefined && !isValidDate(metadata.updated)) {
    throw new Error(`${fileName}: updated must be a valid YYYY-MM-DD date`);
  }
  if (metadata.updated && metadata.updated < metadata.date) {
    throw new Error(`${fileName}: updated cannot be earlier than date`);
  }
  if (!ARTICLE_CATEGORIES.includes(metadata.category)) {
    throw new Error(`${fileName}: unsupported category "${metadata.category}"`);
  }
  if (!DIFFICULTIES.has(metadata.difficulty)) {
    throw new Error(`${fileName}: difficulty must be beginner, intermediate, or advanced`);
  }
  if (typeof metadata.published !== "boolean" || typeof metadata.featured !== "boolean") {
    throw new Error(`${fileName}: published and featured must be booleans`);
  }
  if (!Array.isArray(metadata.tags) || metadata.tags.length === 0 ||
      metadata.tags.some((tag) => typeof tag !== "string" || !tag.trim())) {
    throw new Error(`${fileName}: tags must be a non-empty list of strings`);
  }
  if (metadata.cover !== null &&
      (typeof metadata.cover !== "string" || !metadata.cover.startsWith("/articles/"))) {
    throw new Error(`${fileName}: cover must be null or a local /articles/ asset path`);
  }
}

export function calculateReadingTime(markdown) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[`*_>#~]/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function assertLocalArticleAssets(article) {
  const paths = [];
  if (article.metadata.cover) paths.push(article.metadata.cover);
  for (const match of article.body.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g)) {
    if (!match[1].startsWith("/articles/")) {
      throw new Error(`${article.sourceFile}: article images must use local /articles/ assets`);
    }
    paths.push(match[1]);
  }
  for (const assetPath of paths) {
    const resolvedPath = path.resolve(publicDirectory, `.${assetPath}`);
    if (!resolvedPath.startsWith(`${articleAssetsDirectory}${path.sep}`) ||
        !fs.existsSync(resolvedPath)) {
      throw new Error(`${article.sourceFile}: missing or invalid local asset "${assetPath}"`);
    }
  }
}

export function loadArticles() {
  if (!fs.existsSync(articlesDirectory)) return [];
  const files = fs.readdirSync(articlesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md")
    .map((entry) => entry.name)
    .sort();
  const articles = files.map((file) => {
    const article = parseArticle(fs.readFileSync(path.join(articlesDirectory, file), "utf8"), file);
    assertLocalArticleAssets(article);
    return {
      ...article,
      readingTime: calculateReadingTime(article.body),
    };
  });
  return validateArticleCollection(articles);
}

export function validateArticleCollection(articles) {
  const publishedSlugs = new Set();
  for (const article of articles.filter((entry) => entry.metadata.published)) {
    if (publishedSlugs.has(article.metadata.slug)) {
      throw new Error(`Duplicate published article slug "${article.metadata.slug}"`);
    }
    publishedSlugs.add(article.metadata.slug);
  }
  for (const article of articles.filter((entry) => entry.metadata.published)) {
    for (const match of article.body.matchAll(/\]\(\/articles\/([a-z0-9-]+)(?:[?#)][^)]*)?\)/g)) {
      if (!publishedSlugs.has(match[1])) {
        throw new Error(`${article.sourceFile}: link references unpublished or unknown article "${match[1]}"`);
      }
    }
  }
  return articles;
}

export function selectPublishedArticles(articles) {
  return articles
    .filter((article) => article.metadata.published)
    .sort((a, b) => b.metadata.date.localeCompare(a.metadata.date));
}

export function getPublishedArticles() {
  return selectPublishedArticles(loadArticles());
}

export function getArticleMetadata(article) {
  const { body, readingTime } = article;
  const details = article.metadata || article;
  return { ...details, readingTime: readingTime || calculateReadingTime(body || "") };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function safeLinkUrl(value) {
  const url = String(value || "").trim();
  if (!url || /[\u0000-\u001f]/.test(url) || url.startsWith("//")) return null;
  if (/^(?:https?:|mailto:)/i.test(url)) return url;
  if (/^[a-z][a-z\d+.-]*:/i.test(url)) return null;
  return url.startsWith("/") || url.startsWith("#") || !url.startsWith("\\") ? url : null;
}

function safeImageUrl(value) {
  const url = safeLinkUrl(value);
  return url?.startsWith("/articles/") ? url : null;
}

function slugifyHeading(text) {
  return text.toLowerCase().replace(/[`*_~]/g, "").trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "-");
}

function getHeadings(body) {
  const seen = new Map();
  return marked.lexer(body).filter((token) => token.type === "heading").map((token) => {
    const base = slugifyHeading(token.text);
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    return { depth: token.depth, text: token.text, id: count ? `${base}-${count}` : base };
  });
}

export function renderArticleMarkdown(body) {
  const headingIds = new Map();
  const renderer = new Renderer();
  renderer.html = ({ text }) => escapeHtml(text);
  renderer.link = ({ href, title, tokens }) => {
    const content = renderer.parser.parseInline(tokens);
    const safeHref = safeLinkUrl(href);
    if (!safeHref) return content;
    const titleAttribute = title ? ` title="${escapeHtml(title)}"` : "";
    const external = /^https?:\/\//i.test(safeHref)
      ? ' target="_blank" rel="noopener noreferrer"'
      : "";
    return `<a href="${escapeHtml(safeHref)}"${titleAttribute}${external}>${content}</a>`;
  };
  renderer.image = ({ href, title, text }) => {
    const safeHref = safeImageUrl(href);
    if (!safeHref) return escapeHtml(text);
    const titleAttribute = title ? ` title="${escapeHtml(title)}"` : "";
    return `<img src="${escapeHtml(safeHref)}" alt="${escapeHtml(text)}" loading="lazy"${titleAttribute}>`;
  };
  renderer.code = ({ text, lang }) => {
    const language = lang?.split(/\s+/)[0].toLowerCase();
    const safeLanguage = language && /^[a-z0-9_-]+$/.test(language) ? language : "";
    const code = safeLanguage && hljs.getLanguage(safeLanguage)
      ? hljs.highlight(text, { language: safeLanguage, ignoreIllegals: true }).value
      : escapeHtml(text);
    const className = safeLanguage ? ` class="language-${safeLanguage}"` : "";
    return `<pre><code${className}>${code}</code></pre>\n`;
  };
  renderer.heading = ({ depth, text, tokens }) => {
    const base = slugifyHeading(text);
    const count = headingIds.get(base) || 0;
    headingIds.set(base, count + 1);
    const id = count ? `${base}-${count}` : base;
    return `<h${depth} id="${escapeHtml(id)}">${renderer.parser.parseInline(tokens)}</h${depth}>\n`;
  };
  return {
    html: marked.parse(body, { gfm: true, breaks: false, renderer }),
    headings: getHeadings(body).filter((heading) => heading.depth === 2 || heading.depth === 3),
  };
}
