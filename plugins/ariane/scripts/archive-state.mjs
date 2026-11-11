#!/usr/bin/env node
// Range l'état du projet à la fin d'un lot ou d'une version, pour que les
// fichiers relus à chaque session restent petits.
//
//   node archive-state.mjs --lot 04        → .ariane/history/lot-04.md
//   node archive-state.mjs --version 0.1.0 → .ariane/history/v0.1.0.md
//
// - Déplace dans ce fichier d'historique les lignes anciennes de
//   state.history (les 20 dernières restent) et les notes des stories et des
//   lots terminés.
// - Avec --version, les lots et les stories livrés sortent aussi de l'état
//   (state.counters garde leur dernier numéro).
// - Ne supprime rien : tout ce qui sort de state.json est écrit dans
//   l'historique avant.
// - Mesure la mémoire du projet (.ariane/memory.md) et dit si elle dépasse
//   son plafond : c'est Ariane qui fait alors le tri.
// - Écrit une ligne JSON sur la sortie ; code de sortie 0 sauf erreur d'usage.
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { join, resolve } from "node:path";

const KEEP_HISTORY = 20;
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
const root = resolve(flag("--project") || process.cwd());
if (!lot && !version) done({ status: "error", message: "Indique --lot NN ou --version x.y.z." }, 1);
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

const name = lot ? `lot-${lot}` : `v${version}`;
const title = lot ? `lot ${lot}` : `version ${version}`;
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
}

// 4. La mémoire du projet : mesurée, jamais modifiée ici.
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
  state_chars: JSON.stringify(state, null, 2).length,
  memory,
});
