import { loadArticles } from "../src/lib/articles.mjs";

const articles = loadArticles();
console.log(`Validated ${articles.length} article${articles.length === 1 ? "" : "s"}.`);
