// Copies the web app's pure-TypeScript logic into mobile/lib/shared so both
// apps compute cycles, fertility, tips, tablets, risk scores etc. identically.
// Edit the originals in frontend/lib, then run: npm run sync-shared
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "..", "frontend", "lib");
const dest = join(here, "..", "lib", "shared");

const FILES = [
  "anaemia", "babyGrowth", "cyclePhase", "fertility", "herGoal", "herInsights", "hygiene",
  "labs", "languages", "meals", "milestones", "mood", "painLog", "phaseTips", "postpartum",
  "pregnancyLogs", "pregnancyWeeks", "readings", "reliefTips", "tablets", "triage", "weight", "wellness",
  "ml/cycleForecast", "ml/scoring", "chat/offline/knowledge", "chat/offline/postnatal",
  "chat/offline/extract", "chat/safety", "chat/tone",
];
const ASSETS = ["ml/risk_models.json"];

const header = (f) => `// GENERATED from frontend/lib/${f} by scripts/sync-shared.mjs. Do not edit here.\n`;
const IMPORT_RE = /from (['"])@\/lib\/([A-Za-z/]+)\1/g;

mkdirSync(dest, { recursive: true });

for (const name of FILES) {
  const file = `${name}.ts`;
  let code = readFileSync(join(src, file), "utf8");
  // "@/lib/a/b" -> path relative to this file inside lib/shared
  const depth = name.split("/").length - 1;
  const up = depth === 0 ? "./" : "../".repeat(depth);
  code = code.replace(IMPORT_RE, (_m, q, p) => `from ${q}${up}${p}${q}`);
  const out = join(dest, file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, header(file) + code);
}

for (const a of ASSETS) {
  const out = join(dest, a);
  mkdirSync(dirname(out), { recursive: true });
  copyFileSync(join(src, a), out);
}

// Translations (8 languages) used for labels and copy
const tSrc = join(src, "translations");
const tDest = join(dest, "translations");
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
for (const f of walk(tSrc)) {
  const out = join(tDest, relative(tSrc, f));
  mkdirSync(dirname(out), { recursive: true });
  copyFileSync(f, out);
}
console.log(`Synced ${FILES.length} logic files, ${ASSETS.length} assets and translations into lib/shared`);
