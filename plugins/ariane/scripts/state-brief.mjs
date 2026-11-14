#!/usr/bin/env node
// Un résumé de .ariane/state.json, pour qu'Ariane ne relise pas tout le fichier (30 à 45 Ko sur un
// projet avancé, relus à chaque échange de la conversation).
//
//   node state-brief.mjs                 → l'essentiel : phase, lot en cours, stories du lot,
//                                          dernières étapes, version en cours, compteurs
//   node state-brief.mjs --lot 10        → le lot 10 en entier (avec ses notes et sa démo)
//   node state-brief.mjs --story 042     → la story 042 en entier
//   node state-brief.mjs --history 15    → les 15 dernières lignes de history (5 par défaut)
//   node state-brief.mjs --project <dir> → un autre dossier que le dossier courant
//
// Écrit du JSON compact sur la sortie. Pour modifier l'état, un petit script node suffit
// (lire, changer une valeur, réécrire en JSON indenté de deux espaces) : pas besoin de tout lire.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const out = (value, code = 0) => {
  process.stdout.write(JSON.stringify(value) + "\n");
  process.exit(code);
};

const root = resolve(flag("--project") || process.cwd());
const dir = existsSync(join(root, ".ariane")) ? join(root, ".ariane") : join(root, ".bharness");
let state;
try {
  state = JSON.parse(readFileSync(join(dir, "state.json"), "utf8"));
} catch {
  out({ status: "error", message: "state.json introuvable ou illisible : lance le script depuis le dossier du projet." }, 1);
}

const lots = Array.isArray(state.lots) ? state.lots : [];
const stories = Array.isArray(state.stories) ? state.stories : [];

if (flag("--lot")) {
  const lot = lots.find((l) => String(l.id) === String(flag("--lot")));
  out(lot ? { status: "ok", lot } : { status: "error", message: `Lot ${flag("--lot")} introuvable.` }, lot ? 0 : 1);
}
if (flag("--story")) {
  const story = stories.find((s) => String(s.id) === String(flag("--story")));
  out(story ? { status: "ok", story } : { status: "error", message: `Story ${flag("--story")} introuvable.` }, story ? 0 : 1);
}

const trimStory = (s) => ({ id: s.id, title: s.title, status: s.status, branch: s.branch, pull_request: s.pull_request, notes: (s.notes || []).length });
const trimLot = (l) => ({
  id: l.id,
  title: l.title,
  status: l.status,
  step: l.step ?? null,
  branch: l.branch,
  preview_url: l.preview_url,
  pull_request: l.pull_request,
  validated_at: l.validated_at,
  stories: l.stories,
  notes: (l.notes || []).length,
});

const openLots = lots.filter((l) => l.status !== "done");
const current = lots.find((l) => String(l.id) === String(state.current_lot)) || openLots[0] || null;
const shownStories = current ? stories.filter((s) => (current.stories || []).map(String).includes(String(s.id))) : [];
const n = Math.max(1, Number(flag("--history")) || 5);
const history = (Array.isArray(state.history) ? state.history : []).slice(-n).map((h) => ({ date: h.date, agent: h.agent, short: h.short || String(h.event || "").slice(0, 80) }));

out({
  status: "ok",
  ariane: state.ariane,
  project: state.project,
  user: state.user && { os: state.user.os, profile: state.user.profile, detail: state.user.detail, learning: state.user.learning },
  phase: state.phase,
  phases: state.phases,
  gates: state.gates,
  maturity: state.maturity && { target: state.maturity.target, recommended: state.maturity.recommended },
  cycle: state.cycle ? { version: state.cycle.version, type: state.cycle.type, goal: state.cycle.goal, status: state.cycle.status, lots: state.cycle.lots, urgent: state.cycle.urgent } : null,
  current_lot: state.current_lot,
  current_story: state.current_story,
  lots: { done: lots.filter((l) => l.status === "done").length, open: openLots.map(trimLot) },
  stories_of_current_lot: shownStories.map(trimStory),
  stories_other: stories.filter((s) => !shownStories.includes(s)).reduce((acc, s) => ({ ...acc, [s.status]: (acc[s.status] || 0) + 1 }), {}),
  counters: state.counters,
  last_clean: state.last_clean || null,
  repo: state.repo,
  environments: state.environments && Object.keys(state.environments).filter((k) => state.environments[k]),
  wiki: state.wiki && { status: state.wiki.status, url: state.wiki.url },
  feedback: state.feedback && { enabled: state.feedback.enabled },
  releases: (state.releases || []).slice(-2),
  history,
});
