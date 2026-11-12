#!/usr/bin/env node
// Lance les vérifications du projet et n'affiche que l'essentiel, pour que la
// sortie des outils ne remplisse pas la conversation des agents.
//
//   node check.mjs                          → lint, typecheck, test, build
//   node check.mjs --only test,typecheck    → seulement ces étapes
//   node check.mjs --test src/lib/x.test.ts → tests unitaires d'un fichier
//   node check.mjs --e2e tests/e2e/lot-08/024-x.spec.ts
//                                           → un test de bout en bout, sur ordinateur
//   node check.mjs --e2e tests/e2e/lot-08 --all-devices
//   node check.mjs --only test -- -t "nom"  → ce qui suit « -- » est passé à l'outil
//
// - S'arrête à la première étape en échec (--keep-going pour tout lancer).
// - Pour chaque étape : une ligne (réussie ou non, durée, bilan des tests).
// - En cas d'échec : un extrait autour de la première erreur, 40 lignes au plus.
// - La sortie complète de chaque étape est gardée dans .ariane/tmp/check-<étape>.log :
//   on y cherche (Grep) au lieu de relancer.
// - Code de sortie 0 si tout passe, 1 sinon.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const EXCERPT_LINES = 40;

const argv = process.argv.slice(2);
const sep = argv.indexOf("--");
const args = sep >= 0 ? argv.slice(0, sep) : argv;
const passthrough = sep >= 0 ? argv.slice(sep + 1) : [];
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (name) => args.includes(name);

const root = resolve(flag("--project") || process.cwd());
let pkg;
try {
  pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
} catch {
  console.log("✗ package.json introuvable : lance le script depuis le dossier du projet (ou --project <dossier>).");
  process.exit(1);
}
const scripts = pkg.scripts || {};
const quote = (s) => (/[\s"']/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s);
const extra = (list) => (list.length ? " -- " + list.map(quote).join(" ") : "");

// Les étapes à lancer.
const steps = [];
const e2e = flag("--e2e");
const unit = flag("--test");
if (e2e) {
  const device = has("--all-devices") ? [] : ["--project=desktop"];
  steps.push({ name: "e2e", script: "test:e2e", cmd: "npm run test:e2e" + extra([...device, e2e, ...passthrough]) });
} else if (unit) {
  steps.push({ name: "test", script: "test", cmd: "npm test" + extra([unit, ...passthrough]) });
} else {
  const wanted = (flag("--only") || "lint,typecheck,test,build").split(",").map((s) => s.trim()).filter(Boolean);
  for (const name of wanted) {
    if (!scripts[name]) {
      console.log(`– ${name} : pas de script « ${name} » dans package.json, étape sautée`);
      continue;
    }
    const base = name === "test" ? "npm test" : `npm run ${name}`;
    steps.push({ name, script: name, cmd: base + (wanted.length === 1 ? extra(passthrough) : "") });
  }
}

const tmp = join(root, ".ariane", "tmp");
mkdirSync(tmp, { recursive: true });
if (!existsSync(join(tmp, ".gitignore"))) writeFileSync(join(tmp, ".gitignore"), "*\n");

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "").replace(/\r/g, "");
const summaryOf = (lines) =>
  lines
    .filter((l) => /^\s*(Test Files|Tests)\s+\d|^\s*\d+ (passed|failed|flaky|skipped|did not run)\b/i.test(l))
    .map((l) => l.trim().replace(/\s+/g, " "))
    .slice(0, 4)
    .join(" · ");
const ERROR = /(error|failed|failing|✗|×|✘|expected|received|exception|cannot find|not assignable|TS\d{4})/i;
const excerptOf = (lines) => {
  const kept = lines.filter((l) => l.trim() !== "");
  const first = kept.findIndex((l) => ERROR.test(l) && !/^\s*\d+ (passed|skipped)/i.test(l));
  const slice = first >= 0 ? kept.slice(Math.max(0, first - 3), first - 3 + EXCERPT_LINES) : kept.slice(-EXCERPT_LINES);
  return slice.map((l) => "    " + (l.length > 240 ? l.slice(0, 240) + "…" : l)).join("\n");
};

let failed = false;
for (const step of steps) {
  if (!scripts[step.script]) {
    console.log(`– ${step.name} : pas de script « ${step.script} » dans package.json, étape sautée`);
    continue;
  }
  const started = Date.now();
  const run = spawnSync(step.cmd, {
    cwd: root,
    shell: true,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, CI: process.env.CI || "1", FORCE_COLOR: "0", NO_COLOR: "1" },
  });
  const seconds = Math.round((Date.now() - started) / 1000);
  const output = stripAnsi(`${run.stdout || ""}\n${run.stderr || ""}`);
  const logFile = join(tmp, `check-${step.name}.log`);
  writeFileSync(logFile, `$ ${step.cmd}\n\n${output}`);
  const lines = output.split("\n");
  const summary = summaryOf(lines);
  const ok = run.status === 0;
  const rel = `.ariane/tmp/check-${step.name}.log`;
  console.log(`${ok ? "✓" : "✗"} ${step.name} (${seconds} s)${summary ? " · " + summary : ""}${ok ? "" : ` · sortie complète : ${rel}`}`);
  if (!ok) {
    failed = true;
    console.log(excerptOf(lines));
    if (!has("--keep-going")) break;
  }
}

if (steps.length === 0) console.log("Rien à lancer.");
else console.log(failed ? "Bilan : à corriger." : "Bilan : tout passe.");
process.exit(failed ? 1 : 0);
