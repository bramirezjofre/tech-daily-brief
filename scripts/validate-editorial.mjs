import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const postsDir = join(root, "src/content/posts");
const reportPath = join(root, "reports/execution/urgent-alerts.md");
const alertLine = /^- \*\*\[(INCIDENTE|VULNERABILIDAD)\] — estado:\*\* (activo); \*\*inicio:\*\* (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z); \*\*impacto:\*\* (.+?); \*\*acción:\*\* (.+?); \*\*Fuente:\*\* \[fuente primaria\]\((https:\/\/[^\s)]+)\)$/;
const primaryHosts = new Set(["status.aws.amazon.com", "status.cloud.google.com", "www.githubstatus.com", "status.cloud.microsoft", "status.openai.com", "nvd.nist.gov", "www.cisa.gov", "security.googleblog.com", "msrc.microsoft.com"]);

function validateAlert(alert, now = new Date()) {
  if (!alert.type || !["INCIDENTE", "VULNERABILIDAD"].includes(alert.type)) throw new Error("alert type must be INCIDENTE or VULNERABILIDAD");
  if (alert.status !== "activo") throw new Error("urgent alerts must be active");
  const started = new Date(alert.startedAt);
  if (Number.isNaN(started.valueOf())) throw new Error("alert start must be an ISO UTC timestamp");
  if (started > now) throw new Error("alert start cannot be in the future");
  if (now - started > 24 * 60 * 60 * 1000 && alert.confirmedActive !== true) throw new Error("incidents older than 24 hours need confirmed active evidence");
  if (!alert.impact?.trim()) throw new Error("alert impact is required");
  if (!alert.action?.trim()) throw new Error("alert action is required");
  if (alert.action !== "sin mitigación confirmada" && !alert.action.toLowerCase().includes("confirm")) throw new Error("alert action must be confirmed or exactly 'sin mitigación confirmada'");
  let url;
  try { url = new URL(alert.source); } catch { throw new Error("primary source must be a valid URL"); }
  if (url.protocol !== "https:" || url.username || url.password || url.hash || !primaryHosts.has(url.hostname)) throw new Error("source must be an accessible canonical primary source");
  return alert;
}

function parseReport(report, now = new Date()) {
  if (!report.startsWith("# Reporte de ejecución editorial\n")) throw new Error(`${reportPath} must be an execution report`);
  if (!report.includes("## Alertas urgentes\n")) throw new Error(`${reportPath} must include ## Alertas urgentes`);
  if (/^---$/m.test(report) || /^slug:/m.test(report)) throw new Error("Urgent-alert report must not contain post frontmatter");
  const section = report.split("## Alertas urgentes\n", 2)[1].split(/^## /m, 1)[0];
  if (section.includes("No hay alertas urgentes verificadas")) return [];
  const lines = section.split("\n").filter(line => line.startsWith("- "));
  if (!lines.length) throw new Error("urgent-alert section must contain a valid alert or the explicit empty marker");
  const alerts = lines.map(line => {
    const match = line.match(alertLine);
    if (!match) throw new Error(`malformed urgent alert: ${line}`);
    return validateAlert({ type: match[1], status: match[2], startedAt: match[3], impact: match[4], action: match[5], source: match[6], confirmedActive: true }, now);
  });
  const themes = new Set(alerts.map(alert => `${alert.type}:${alert.impact.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}`));
  if (themes.size !== alerts.length) throw new Error("urgent alerts must be deduplicated by theme");
  return alerts;
}

async function validatePosts() {
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
  return slugs.size;
}

function runFixtures() {
  const now = new Date("2026-11-13T12:00:00Z");
  const valid = { type: "INCIDENTE", status: "activo", startedAt: "2026-11-13T10:00:00Z", impact: "API de pagos", action: "mitigación confirmada por el proveedor", source: "https://status.aws.amazon.com/" };
  validateAlert(valid, now);
  const oldActive = { ...valid, startedAt: "2026-11-11T10:00:00Z", confirmedActive: true };
  validateAlert(oldActive, now);
  for (const bad of [
    { ...valid, source: "https://example.com/copy" },
    { ...valid, action: "parche aplicado" },
    { ...valid, startedAt: "2026-11-11T10:00:00Z" },
  ]) {
    let rejected = false;
    try { validateAlert(bad, now); } catch { rejected = true; }
    if (!rejected) throw new Error("representative invalid alert fixture was accepted");
  }
  const alertLines = Array.from({ length: 6 }, (_, index) => ({ ...valid, impact: `servicio-${index + 1}`, source: "https://status.aws.amazon.com/" }))
    .map(alert => `- **[${alert.type}] — estado:** ${alert.status}; **inicio:** ${alert.startedAt}; **impacto:** ${alert.impact}; **acción:** ${alert.action}; **Fuente:** [fuente primaria](${alert.source})`)
    .join("\n");
  const fixtureReport = `# Reporte de ejecución editorial\n\n## Alertas urgentes\n\n${alertLines}\n\n## Artículos publicados\n\n- Cuota: 5 artículos (las alertas urgentes no cuentan).\n`;
  if (parseReport(fixtureReport, now).length !== 6) throw new Error("six-alert fixture must remain outside the five-article quota");
  const duplicateReport = fixtureReport.replace(/servicio-2/g, "servicio-1");
  let duplicateRejected = false;
  try { parseReport(duplicateReport, now); } catch { duplicateRejected = true; }
  if (!duplicateRejected) throw new Error("duplicate-theme fixture was accepted");
}

runFixtures();
const slugCount = await validatePosts();
const report = await readFile(reportPath, "utf8");
const alerts = parseReport(report);
const articles = report.match(/^## Artículos publicados[\s\S]*?Cuota: (\d+) artículos/m);
if (!articles) throw new Error("report must declare article quota");
console.log(`Editorial validation OK: ${slugCount} unique slugs; ${articles[1]} articles; ${alerts.length} urgent alerts outside quota`);
