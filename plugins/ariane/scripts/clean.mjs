#!/usr/bin/env node
// /ariane:clean : remet le projet d'aplomb sans dépenser de tokens, puis dit ce qui reste à
// condenser à la main (par Diderot).
//
//   node clean.mjs                  → range, purge, mesure
//   node clean.mjs --due            → lecture seule : est-ce le moment ? (2 lots terminés depuis le
//                                     dernier nettoyage, noté dans state.last_clean)
//   node clean.mjs --done           → note le nettoyage terminé dans state.last_clean
//   node clean.mjs --project <dir>  → un autre dossier que le dossier courant
//
// Mécanique, sans rien perdre :
// - lance archive-state.mjs --clean : anciennes lignes de state.history, notes des lots terminés,
//   entrées anciennes du journal de bord (.ariane/log.md), historique du wiki (3 derniers lots
//   gardés, les autres dans docs/wiki/archives/historique.md) ;
// - supprime de .ariane/tmp les sorties d'outils vieilles de plus de 2 jours (non versionnées).
// Mesure, sans modifier :
// - to_condense : les fichiers qui dépassent leur plafond, du plus gros au plus petit :
//   pages du wiki (25 000 caractères), notes du carnet technique (15 000), decisions.md et
//   issues.md (15 000), mémoire (60 entrées ou 12 000 caractères) ;
// - watch : les documents de référence très gros (PRD, architecture, UX), qu'on ne condense pas
//   automatiquement, et le poids de docs/qa.
// Écrit une ligne JSON sur la sortie.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CLEAN_EVERY_LOTS = 2; // un nettoyage tous les 2 lots terminés
const TMP_MAX_AGE_DAYS = 2;
const FILE_MAX_CHARS = 15000; // decisions.md, issues.md
const WATCH_MAX_CHARS = 60000; // documents de référence
const here = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const done = (result, code = 0) => {
  process.stdout.write(JSON.stringify(result) + "\n");
  process.exit(code);
};

const root = resolve(flag("--project") || process.cwd());
const dir = existsSync(join(root, ".ariane")) ? join(root, ".ariane") : join(root, ".bharness");
if (!existsSync(join(dir, "state.json"))) done({ status: "error", message: "state.json introuvable : lance le script depuis le dossier du projet." }, 1);

// Le rythme : un nettoyage tous les 2 lots terminés. Le dernier est noté dans state.last_clean.
const statePath = join(dir, "state.json");
const state = JSON.parse(readFileSync(statePath, "utf8"));
const numberOf = (id) => (/^\d+$/.test(String(id)) ? Number(id) : 0);
const doneLots = (state.lots || []).filter((l) => l.status === "done").map((l) => numberOf(l.id));
const lastClean = numberOf(state.last_clean?.lot);
const lotsSince = doneLots.filter((n) => n > lastClean).length;

if (args.includes("--due")) {
  // Lecture seule : est-ce le moment ? (à lancer une fois le lot fusionné dans main)
  done({ status: "ok", due: lotsSince >= CLEAN_EVERY_LOTS, lots_since_clean: lotsSince, every: CLEAN_EVERY_LOTS, last_clean: state.last_clean || null });
}
if (args.includes("--done")) {
  // Note le nettoyage terminé : le compte repart de zéro.
  state.last_clean = { lot: String(Math.max(lastClean, ...doneLots)).padStart(2, "0"), at: new Date().toISOString().slice(0, 10) };
  writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
  done({ status: "ok", last_clean: state.last_clean });
}

// 1. Le rangement mécanique.
const run = spawnSync(process.execPath, [join(here, "archive-state.mjs"), "--clean", "--project", root], { encoding: "utf8" });
let archive;
try {
  archive = JSON.parse(run.stdout.trim().split("\n").pop());
} catch {
  done({ status: "error", message: "archive-state.mjs n'a rien rendu de lisible.", detail: (run.stderr || "").slice(0, 300) }, 1);
}
if (archive.status !== "ok") done({ status: "error", message: archive.message || "archive-state.mjs a échoué." }, 1);

// 2. Les sorties d'outils anciennes de .ariane/tmp (jamais versionnées).
let purged = { files: 0, bytes: 0 };
const tmp = join(dir, "tmp");
if (existsSync(tmp)) {
  const limit = Date.now() - TMP_MAX_AGE_DAYS * 86_400_000;
  for (const entry of readdirSync(tmp, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name === ".gitignore") continue;
    const path = join(tmp, entry.name);
    const info = statSync(path);
    if (info.mtimeMs < limit) {
      unlinkSync(path);
      purged.files++;
      purged.bytes += info.size;
    }
  }
}

// 3. Ce qui reste trop gros.
const sizeOf = (path) => {
  try {
    return readFileSync(path, "utf8").length;
  } catch {
    return 0;
  }
};
const toCondense = [];
for (const w of archive.wiki_over || []) toCondense.push({ file: `docs/wiki/${w.page}`, kind: "wiki", chars: w.chars, max: archive.wiki_page_max_chars });
for (const n of archive.notes_over || []) toCondense.push({ file: `${basename(dir)}/notes/${n.note}`, kind: "carnet", chars: n.chars, max: archive.note_max_chars });
for (const name of ["decisions.md", "issues.md"]) {
  const chars = sizeOf(join(dir, name));
  if (chars > FILE_MAX_CHARS) toCondense.push({ file: `${basename(dir)}/${name}`, kind: "ariane", chars, max: FILE_MAX_CHARS });
}
if (archive.memory?.over) {
  toCondense.push({ file: `${basename(dir)}/memory.md`, kind: "ariane", chars: archive.memory.chars, max: archive.memory.max_chars, entries: archive.memory.entries });
}
toCondense.sort((a, b) => b.chars - a.chars);

const watch = [];
for (const name of ["01-brief.md", "02-prd.md", "03-ux.md", "04-architecture.md"]) {
  const chars = sizeOf(join(root, "docs", name));
  if (chars > WATCH_MAX_CHARS) watch.push({ file: `docs/${name}`, chars });
}

done({
  status: "ok",
  archived: {
    state_history: archive.archived_history,
    state_notes: archive.archived_notes,
    log_entries: archive.archived_log_entries,
    wiki_history_lots: archive.archived_wiki_history,
    file: archive.file,
  },
  purged_tmp: purged,
  to_condense: toCondense,
  watch,
  total_to_condense_chars: toCondense.reduce((sum, f) => sum + f.chars, 0),
});
