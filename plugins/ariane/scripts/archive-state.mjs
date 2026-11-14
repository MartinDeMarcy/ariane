#!/usr/bin/env node
// Range l'état du projet à la fin d'un lot ou d'une version, pour que les
// fichiers relus à chaque session restent petits.
//
//   node archive-state.mjs --lot 04        → .ariane/history/lot-04.md
//   node archive-state.mjs --version 0.1.0 → .ariane/history/v0.1.0.md
//   node archive-state.mjs --clean         → .ariane/history/nettoyage-AAAA-MM-JJ.md (hors fin de lot)
//
// - Déplace dans ce fichier d'historique les lignes anciennes de
//   state.history (les 20 dernières restent) et les notes des stories et des
//   lots terminés.
// - Avec --version, les lots et les stories livrés sortent aussi de l'état
//   (state.counters garde leur dernier numéro).
// - Ne supprime rien : tout ce qui sort de state.json est écrit dans
//   l'historique avant.
// - Range les entrées anciennes du journal de bord (.ariane/log.md) : les 15
//   dernières restent, les autres passent dans le fichier d'historique.
// - Garde les 3 derniers lots dans docs/wiki/historique.md et range les plus
//   anciens dans docs/wiki/archives/historique.md ; mesure les pages du wiki
//   (wiki_over : plus de 25 000 caractères, à condenser par Diderot).
// - Mesure la mémoire du projet (.ariane/memory.md) et les notes du carnet
//   technique (.ariane/notes/) et dit lesquelles dépassent leur plafond :
//   c'est Ariane qui fait alors le tri.
// - Écrit une ligne JSON sur la sortie ; code de sortie 0 sauf erreur d'usage.
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const KEEP_HISTORY = 20;
const KEEP_LOG = 15; // entrées du journal de bord gardées dans log.md
export const NOTE_MAX_CHARS = 15000; // au-delà, une note du carnet technique est à condenser
export const WIKI_PAGE_MAX_CHARS = 25000; // au-delà, une page du wiki est à condenser
const KEEP_WIKI_HISTORY = 3; // lots gardés dans docs/wiki/historique.md
export const MEMORY_MAX_ENTRIES = 60;
export const MEMORY_MAX_CHARS = 12000;

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const done = (result, code = 0) => {
  process.stdout.write(JSON.stringify(result) + "\n");
  process.exit(code);
};

const lot = flag("--lot");
const version = flag("--version");
const clean = args.includes("--clean");
const root = resolve(flag("--project") || process.cwd());
if (!lot && !version && !clean) done({ status: "error", message: "Indique --lot NN, --version x.y.z ou --clean." }, 1);
if ((lot && !/^[\w.-]+$/.test(lot)) || (version && !/^[\w.-]+$/.test(version))) {
  done({ status: "error", message: "Nom de lot ou de version invalide." }, 1);
}

const dir = existsSync(join(root, ".ariane")) ? join(root, ".ariane") : join(root, ".bharness");
const statePath = join(dir, "state.json");
let state;
try {
  state = JSON.parse(readFileSync(statePath, "utf8"));
} catch {
  done({ status: "error", message: "state.json introuvable ou illisible." }, 1);
}

const name = clean ? `nettoyage-${new Date().toISOString().slice(0, 10)}` : lot ? `lot-${lot}` : `v${version}`;
const title = clean ? "nettoyage" : lot ? `lot ${lot}` : `version ${version}`;
const sections = [];

// 1. Les lignes anciennes de l'historique d'état.
const history = Array.isArray(state.history) ? state.history : [];
const oldHistory = history.length > KEEP_HISTORY ? history.slice(0, history.length - KEEP_HISTORY) : [];
if (oldHistory.length > 0) {
  state.history = history.slice(history.length - KEEP_HISTORY);
  sections.push(
    "## Étapes\n\n" +
      oldHistory.map((h) => `- ${h.date || "?"} · ${h.agent || "?"} · ${String(h.event || "").replace(/\s+/g, " ")}`).join("\n") +
      "\n",
  );
}

// 2. Les notes des stories et des lots terminés.
const noteLines = [];
const drain = (items, label) => {
  for (const item of Array.isArray(items) ? items : []) {
    if (item?.status !== "done" || !Array.isArray(item.notes) || item.notes.length === 0) continue;
    noteLines.push(`### ${label} ${item.id}${item.title ? ` · ${item.title}` : ""}\n`);
    for (const note of item.notes) {
      noteLines.push(`- ${typeof note === "string" ? note : JSON.stringify(note)}`.replace(/\s+/g, " "));
    }
    noteLines.push("");
    item.notes = [];
  }
};
drain(state.lots, "Lot");
drain(state.stories, "Story");
if (noteLines.length > 0) sections.push("## Notes des lots et des stories terminés\n\n" + noteLines.join("\n") + "\n");

// 3. À une mise en ligne : les lots et les stories livrés sortent de l'état.
// Leur numéro reste connu (state.counters), pour que la suite continue.
const numberOf = (id) => (/^\d+$/.test(String(id)) ? Number(id) : 0);
const before = JSON.stringify(state.counters || null);
state.counters = {
  lot: Math.max(state.counters?.lot || 0, ...(state.lots || []).map((l) => numberOf(l.id))),
  story: Math.max(state.counters?.story || 0, ...(state.stories || []).map((s) => numberOf(s.id))),
};
let changed = JSON.stringify(state.counters) !== before;
if (version) {
  const doneLots = (state.lots || []).filter((l) => l.status === "done");
  const doneStories = (state.stories || []).filter((s) => s.status === "done");
  if (doneLots.length > 0 || doneStories.length > 0) {
    const rows = [];
    for (const l of doneLots) {
      rows.push(`- Lot ${l.id} · ${l.title || ""} · validé le ${l.validated_at || "?"} · ${l.branch || ""}${l.pull_request ? ` · PR ${l.pull_request}` : ""}`);
      for (const s of doneStories.filter((one) => one.lot === l.id)) {
        rows.push(`  - Story ${s.id} · ${s.title || ""} · ${s.branch || ""}${s.pull_request ? ` · PR ${s.pull_request}` : ""}`);
      }
    }
    for (const s of doneStories.filter((one) => !doneLots.some((l) => l.id === one.lot))) {
      rows.push(`- Story ${s.id} · ${s.title || ""} · ${s.branch || ""}`);
    }
    sections.push(`## Lots et stories livrés dans la ${title}\n\n` + rows.join("\n") + "\n");
    state.lots = (state.lots || []).filter((l) => l.status !== "done");
    state.stories = (state.stories || []).filter((s) => s.status !== "done");
  }
}

// 4. Le journal de bord : seules les dernières entrées restent dans log.md.
const logPath = join(dir, "log.md");
let archivedLog = 0;
let logText = null;
if (existsSync(logPath)) {
  const text = readFileSync(logPath, "utf8");
  const lines = text.split(/\r?\n/);
  const starts = lines.reduce((acc, line, i) => (/^## \d{4}-\d{2}-\d{2}/.test(line) ? [...acc, i] : acc), []);
  if (starts.length > KEEP_LOG) {
    const cut = starts[starts.length - KEEP_LOG];
    const head = lines.slice(0, starts[0]);
    const old = lines.slice(starts[0], cut);
    archivedLog = starts.length - KEEP_LOG;
    sections.push(
      "## Journal de bord (entrées rangées)\n\n" + old.map((l) => (l.startsWith("## ") ? "#" + l : l)).join("\n").trim() + "\n",
    );
    logText = [...head, `<!-- Les entrées plus anciennes sont dans .ariane/history/ (rangées avec le ${title}). -->`, "", ...lines.slice(cut)].join("\n");
  }
}

let file = null;
if (sections.length === 0 && changed) writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
if (sections.length > 0) {
  const folder = join(dir, "history");
  mkdirSync(folder, { recursive: true });
  file = join(folder, `${name}.md`);
  const today = new Date().toISOString().slice(0, 10);
  if (!existsSync(file)) {
    writeFileSync(
      file,
      `# Historique : ${title}\n\nCe qui a été rangé hors de l'état et de la mémoire du projet à la fin du ${title}. Rien n'est perdu : c'est ici qu'on le retrouve.\n\n`,
    );
  }
  appendFileSync(file, `<!-- rangé le ${today} -->\n\n` + sections.join("\n"));
  writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
  // Le journal n'est raccourci qu'une fois ses entrées écrites dans l'historique.
  if (logText !== null) writeFileSync(logPath, logText);
}

// 5. Le carnet technique : chaque note est mesurée, jamais modifiée ici.
const notesOver = [];
try {
  for (const name of readdirSync(join(dir, "notes"))) {
    if (!name.endsWith(".md")) continue;
    const chars = readFileSync(join(dir, "notes", name), "utf8").length;
    if (chars > NOTE_MAX_CHARS) notesOver.push({ note: name, chars });
  }
} catch {
  // pas de carnet technique
}

// 5b. Le wiki (docs/wiki) : l'historique garde les derniers lots, les plus anciens passent dans
// docs/wiki/archives/historique.md ; chaque page est mesurée, jamais modifiée ici.
let archivedWikiHistory = 0;
const wikiOver = [];
const wikiDir = join(root, "docs", "wiki");
if (existsSync(wikiDir)) {
  const histPath = join(wikiDir, "historique.md");
  if (existsSync(histPath)) {
    const text = readFileSync(histPath, "utf8");
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    const lines = text.split(/\r?\n/);
    const cuts = lines.reduce((acc, line, i) => (line.startsWith("## ") ? [...acc, i] : acc), []);
    const blocks = cuts.map((from, k) => ({ from, to: cuts[k + 1] ?? lines.length, dated: /^## \d{4}-\d{2}-\d{2}/.test(lines[from]) }));
    let seen = 0;
    const moved = blocks.filter((b) => b.dated && ++seen > KEEP_WIKI_HISTORY);
    if (moved.length > 0) {
      const movedText = moved.map((b) => lines.slice(b.from, b.to).join(eol).trim()).join(eol + eol);
      const archiveDir = join(wikiDir, "archives");
      const archivePath = join(archiveDir, "historique.md");
      mkdirSync(archiveDir, { recursive: true });
      if (existsSync(archivePath)) {
        const old = readFileSync(archivePath, "utf8");
        const at = old.search(/^## /m);
        const head = at >= 0 ? old.slice(0, at) : old.trimEnd() + eol + eol;
        writeFileSync(archivePath, head + movedText + eol + eol + (at >= 0 ? old.slice(at) : ""));
      } else {
        writeFileSync(
          archivePath,
          `# Historique : lots plus anciens${eol}${eol}Les lots rangés ici sortent de [l'historique](../historique.md) pour qu'il reste court. Rien n'est perdu.${eol}${eol}${movedText}${eol}`,
        );
      }
      const drop = new Set(moved.flatMap((b) => Array.from({ length: b.to - b.from }, (_, i) => b.from + i)));
      const kept = lines.filter((_, i) => !drop.has(i));
      const pointer = "Les lots plus anciens sont dans [archives/historique.md](archives/historique.md).";
      if (!kept.some((l) => l.includes("archives/historique.md"))) {
        const first = kept.findIndex((l) => l.startsWith("## "));
        kept.splice(first >= 0 ? first : kept.length, 0, pointer, "");
      }
      writeFileSync(histPath, kept.join(eol).replace(/(\r?\n){3,}/g, eol + eol).trimEnd() + eol);
      archivedWikiHistory = moved.length;
    }
  }
  const walk = (folder, rel = "") => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name !== "archives") walk(join(folder, entry.name), `${rel}${entry.name}/`);
      } else if (entry.name.endsWith(".md")) {
        const chars = readFileSync(join(folder, entry.name), "utf8").length;
        if (chars > WIKI_PAGE_MAX_CHARS) wikiOver.push({ page: rel + entry.name, chars });
      }
    }
  };
  walk(wikiDir);
  wikiOver.sort((a, b) => b.chars - a.chars);
}

// 6. La mémoire du projet : mesurée, jamais modifiée ici.
let memory = null;
try {
  const text = readFileSync(join(dir, "memory.md"), "utf8");
  const entries = text.split("\n").filter((line) => line.startsWith("- ")).length;
  memory = {
    entries,
    chars: text.length,
    max_entries: MEMORY_MAX_ENTRIES,
    max_chars: MEMORY_MAX_CHARS,
    over: entries > MEMORY_MAX_ENTRIES || text.length > MEMORY_MAX_CHARS,
  };
} catch {
  memory = null;
}

done({
  status: "ok",
  file: file ? file.replace(/\\/g, "/") : null,
  archived_history: oldHistory.length,
  archived_notes: noteLines.filter((l) => l.startsWith("- ")).length,
  archived_log_entries: archivedLog,
  notes_over: notesOver,
  note_max_chars: NOTE_MAX_CHARS,
  archived_wiki_history: archivedWikiHistory,
  wiki_over: wikiOver,
  wiki_page_max_chars: WIKI_PAGE_MAX_CHARS,
  state_chars: JSON.stringify(state, null, 2).length,
  memory,
});
