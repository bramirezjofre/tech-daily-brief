#!/usr/bin/env node
// scripts/format-diff.mjs
// -----------------------------------------------------------------------------
// Ejecuta `prettier --check` solo sobre los archivos modificados respecto del
// merge-base con la rama base. Permite validar formato en CI sin reescribir
// el repo entero cuando hay cientos de archivos preexistentes fuera de estilo.
//
// Resolución de la base:
//   1. Variable de entorno `FORMAT_BASE` (CI la fija).
//   2. `origin/<rama_actual>` si existe y el ref está disponible.
//   3. `HEAD~1` como último recurso (modo local, un commit).
// -----------------------------------------------------------------------------
import { execSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function branchName() {
  return sh("git rev-parse --abbrev-ref HEAD");
}

function resolveBase() {
  if (process.env.FORMAT_BASE) return process.env.FORMAT_BASE;

  const branch = branchName();
  if (branch && existsSync(".git")) {
    const remoteRef = `origin/${branch}`;
    if (sh(`git rev-parse --verify --quiet ${remoteRef}`)) {
      const base = sh(`git merge-base HEAD ${remoteRef}`);
      if (base) return base;
    }
  }
  const prev = sh("git rev-parse --verify --quiet HEAD~1");
  return prev || "HEAD";
}

const base = resolveBase();
const changed = sh(`git diff --name-only ${base}...HEAD`)
  .split("\n")
  .filter(Boolean)
  .filter((f) => /\.(md|mdx|astro|ts|tsx|mjs|cjs|js|jsx|json|yml|yaml|css|scss)$/i.test(f));

if (changed.length === 0) {
  process.stderr.write("format:diff: sin archivos modificados; nada que comprobar.\n");
  process.exit(0);
}

process.stderr.write(`format:diff: base=${base} archivos=${changed.length}\n`);
const res = spawnSync("pnpm", ["exec", "prettier", "--check", ...changed], {
  stdio: "inherit",
});
process.exit(res.status ?? 1);