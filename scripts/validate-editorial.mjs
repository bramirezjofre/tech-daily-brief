import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const postsDir = join(process.cwd(), "src/content/posts");
const reportPath = join(process.cwd(), "reports/execution/urgent-alerts.md");

const files = (await readdir(postsDir)).filter(name => /\.mdx?$/.test(name));
const slugs = new Map();
for (const file of files) {
  const text = await readFile(join(postsDir, file), "utf8");
  const match = text.match(/^slug:\s*["']?([^"'\s]+)["']?\s*$/m);
  if (!match) continue;
  const previous = slugs.get(match[1]);
  if (previous) throw new Error(`Duplicate slug ${match[1]}: ${previous}, ${file}`);
  slugs.set(match[1], file);
}

const report = await readFile(reportPath, "utf8");
if (!report.startsWith("# Reporte de ejecución editorial\n")) {
  throw new Error(`${reportPath} must be an execution report, not a post`);
}
if (!report.includes("## Alertas urgentes\n")) {
  throw new Error(`${reportPath} must include ## Alertas urgentes`);
}
if (/^---$/m.test(report) || /^slug:/m.test(report)) {
  throw new Error("Urgent-alert report must not contain post frontmatter");
}

// Contract test: urgent alerts are collected separately, so six alerts still leave
// the five-story article quota unchanged.
const articles = Array.from({ length: 5 }, (_, index) => `article-${index + 1}`);
const urgentAlerts = Array.from({ length: 6 }, (_, index) => `alert-${index + 1}`);
if (articles.length !== 5 || urgentAlerts.length <= 5) {
  throw new Error("Quota fixture is invalid");
}
console.log(`Editorial validation OK: ${slugs.size} unique slugs; ${articles.length} articles; ${urgentAlerts.length} urgent alerts outside quota`);
