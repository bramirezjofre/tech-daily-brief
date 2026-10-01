#!/usr/bin/env node
// scripts/export-covers.mjs
// -----------------------------------------------------------------------------
// Para cada post sin `ogImage` ni imagen Markdown local:
//   1. Copia `dist/posts/<slug>/index.png` (generado por satori en el build)
//      a `src/assets/images/<slug>-cover.png`.
//   2. Parchea el Markdown: añade `ogImage: "../../assets/images/<slug>-cover.png"`
//      en el frontmatter (justo después de `description:`) y una línea
//      `![Imagen de referencia](../../assets/images/<slug>-cover.png)` al
//      inicio del cuerpo.
//
// Uso:
//   node scripts/export-covers.mjs                 # procesa los posts faltantes
//   node scripts/export-covers.mjs --dry-run       # muestra el plan, no escribe
//
// El script es idempotente: procesa solo los posts sin imagen local. Si se
// necesita regenerar portadas existentes, eso debe hacerse en un flujo aparte
// (el build dinámico de Astro solo emite PNGs para posts sin `ogImage`).
//
// Salir con código 1 si falta algún PNG para los posts candidatos.
// -----------------------------------------------------------------------------
import { readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(process.cwd());
const POSTS_DIR = join(ROOT, "src/content/posts");
const ASSETS_DIR = join(ROOT, "src/assets/images");
const DIST_DIR = join(ROOT, "dist/posts");

const DRY_RUN = process.argv.includes("--dry-run");

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function parsePost(filePath) {
  const raw = readFileSync(filePath, "utf8");
  const m = raw.match(FRONTMATTER_RE);
  if (!m) throw new Error(`frontmatter inválido en ${filePath}`);
  const [, fm, body] = m;
  const slugMatch = fm.match(/^slug:\s*["']?([^"'\n]+)["']?/m);
  const slug = slugMatch
    ? slugMatch[1].trim()
    : filePath.replace(POSTS_DIR + "/", "").replace(/\.mdx?$/, "");
  return { raw, fm, body, slug };
}

function hasLocalImage(fm, body, slug) {
  if (/^ogImage:\s*\S/m.test(fm)) return true;
  if (/!\[[^\]]*\]\(\.\.\/\.\.\/assets\/images\//.test(body)) return true;
  if (existsSync(join(ASSETS_DIR, `${slug}-cover.jpg`))) return true;
  if (existsSync(join(ASSETS_DIR, `${slug}-cover.png`))) return true;
  return false;
}

function patchFrontmatter(fm, slug) {
  const ogLine = `ogImage: "../../assets/images/${slug}-cover.png"`;
  if (/^ogImage:\s*\S/m.test(fm)) return fm;
  if (/^description:\s*(.*)$/m.test(fm)) {
    return fm.replace(/^(description:\s*.*)$/m, `$1\n${ogLine}`);
  }
  return `${fm.trimEnd()}\n${ogLine}\n`;
}

function patchBody(body, slug) {
  const imgLine = `![Imagen de referencia](../../assets/images/${slug}-cover.png)`;
  if (/!\[[^\]]*\]\(\.\.\/\.\.\/assets\/images\//.test(body)) return body;
  const trimmed = body.replace(/^\r?\n+/, "");
  return `${imgLine}\n\n${trimmed}`;
}

const files = readdirSync(POSTS_DIR)
  .filter((f) => /\.(md|mdx)$/.test(f) && !f.startsWith("_"))
  .map((f) => join(POSTS_DIR, f));

const plan = [];
const skipped = [];
const missingPngs = [];

for (const file of files) {
  const { fm, body, slug } = parsePost(file);
  if (hasLocalImage(fm, body, slug)) {
    skipped.push(slug);
    continue;
  }
  const srcPng = join(DIST_DIR, slug, "index.png");
  if (!existsSync(srcPng)) {
    missingPngs.push({ slug, file, srcPng });
    continue;
  }
  plan.push({ file, srcPng, destPng: join(ASSETS_DIR, `${slug}-cover.png`), slug });
}

function emit(msg) {
  process.stdout.write(`${msg}\n`);
}
function emitErr(msg) {
  process.stderr.write(`${msg}\n`);
}

emit(`posts totales: ${files.length}`);
emit(`ya con imagen (se omiten): ${skipped.length}`);
emit(`a generar: ${plan.length}`);
emit(`sin PNG de origen: ${missingPngs.length}`);

if (missingPngs.length > 0) {
  emitErr("\n✗ No existen los PNG generados por el build para:");
  for (const m of missingPngs) {
    emitErr(`  - ${m.slug}  (buscado en ${m.srcPng})`);
  }
  emitErr("Asegúrate de ejecutar `pnpm run build` antes de este script.");
  process.exit(1);
}

if (DRY_RUN) {
  emit("\n--dry-run: no se modifica nada en disco.");
  for (const p of plan)
    emit(`  [DRY] copy ${p.srcPng} -> ${p.destPng}; patch ${p.file}`);
  process.exit(0);
}

let copiedAssets = 0;
let patchedFiles = 0;
for (const { file, srcPng, destPng, slug } of plan) {
  copyFileSync(srcPng, destPng);
  copiedAssets += 1;
  const raw = readFileSync(file, "utf8");
  const m = raw.match(FRONTMATTER_RE);
  if (!m) {
    emitErr(`  ⚠ no se pudo re-parsear ${file}; omitiendo parche`);
    continue;
  }
  const [, fm, body] = m;
  const next = `---\n${patchFrontmatter(fm, slug)}\n---\n${patchBody(body, slug)}`;
  writeFileSync(file, next);
  patchedFiles += 1;
}

emit(`\n✓ assets copiados: ${copiedAssets}`);
emit(`✓ markdowns parchados: ${patchedFiles}`);