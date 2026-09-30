#!/usr/bin/env node
// scripts/verify-dist.mjs
// -----------------------------------------------------------------------------
// Post-build guard: scans `dist/` and fails the process if anything that should
// never be served leaks into the artifact (Markdown source, sourcemaps, hidden
// config files, .git, etc.).
// -----------------------------------------------------------------------------
import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, extname, relative, resolve } from "node:path";

const DIST = resolve(process.argv[2] ?? "dist");

if (!existsSync(DIST)) {
  console.error(`✗ verify-dist: ${DIST} does not exist. Run \`pnpm run build\` first.`);
  process.exit(2);
}

const FORBIDDEN_EXT = new Set([".md", ".mdx", ".markdown"]);
const FORBIDDEN_TOP = new Set([".git", ".env", "src", "content", "node_modules"]);

const issues = [];
let walkCount = 0;

function walk(dir, prefix = "") {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const rel = join(prefix, entry);
    const st = statSync(full);

    if (st.isDirectory()) {
      // Never allow source-tree directories inside dist.
      if (FORBIDDEN_TOP.has(entry)) {
        issues.push(`forbidden directory: /${rel}`);
        continue;
      }
      walk(full, rel);
      continue;
    }

    walkCount += 1;
    const ext = extname(entry).toLowerCase();
    if (FORBIDDEN_EXT.has(ext)) {
      issues.push(`forbidden source file: /${rel}`);
    }

    if (entry.endsWith(".map")) {
      issues.push(`sourcemap leaked: /${rel}`);
    }

    if (entry === "package.json" || entry === "tsconfig.json" || entry === ".env") {
      issues.push(`config leaked: /${rel}`);
    }
  }
}

walk(DIST);

// Also spot-check: every post URL should resolve to HTML, not the raw Markdown.
const required = ["index.html", "404.html", "sitemap-index.xml", "rss.xml", "robots.txt"];
for (const f of required) {
  if (!existsSync(join(DIST, f))) {
    issues.push(`missing required file: ${f}`);
  }
}

if (issues.length === 0) {
  console.log(`✓ verify-dist: ${relative(process.cwd(), DIST)} looks clean (${walkCount} files scanned)`);
  process.exit(0);
}

console.error(`✗ verify-dist: ${issues.length} problem(s) found in ${relative(process.cwd(), DIST)}`);
for (const i of issues) console.error(`  - ${i}`);
process.exit(1);
