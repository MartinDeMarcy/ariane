import assert from "node:assert/strict";
import { test } from "node:test";
import { makeProject, runScript } from "./helpers.mjs";

const lot = (id, over = {}) => ({ id, title: `Titre ${id}`, status: "todo", stories: [], notes: [], ...over });
const story = (id, over = {}) => ({ id, title: `Story ${id}`, status: "todo", notes: [], ...over });
const state = (over = {}) => ({ ariane: "0.26.0", project: { name: "Booker" }, phase: "build", lots: [], stories: [], history: [], ...over });

const brief = (t, s, args = [], dirName) => {
  const root = makeProject(t, s, {}, dirName);
  return runScript("state-brief.mjs", ["--project", root, ...args]);
};
const titleOf = (t, s) => brief(t, s).json.title;

test("rend un résumé ok avec les compteurs et la phase", (t) => {
  const r = brief(t, state({ counters: { lot: 3, story: 9 }, current_lot: "02", lots: [lot("01", { status: "done" }), lot("02", { status: "in_progress" })] }));
  assert.equal(r.code, 0);
  assert.equal(r.json.status, "ok");
  assert.equal(r.json.phase, "build");
  assert.deepEqual(r.json.counters, { lot: 3, story: 9 });
  assert.equal(r.json.lots.done, 1);
  assert.equal(r.json.lots.open.length, 1);
  assert.equal(r.json.current_lot, "02");
});

test("lit aussi un ancien dossier .bharness", (t) => {
  const r = brief(t, state({ project: { name: "Vieux" } }), [], ".bharness");
  assert.equal(r.json.status, "ok");
  assert.equal(r.json.project.name, "Vieux");
});

test("erreur claire quand state.json manque ou est illisible", (t) => {
  const r = runScript("state-brief.mjs", ["--project", makeProject(t, state(), {}, ".autre")]);
  assert.equal(r.code, 1);
  assert.equal(r.json.status, "error");
  const bad = makeProject(t, state(), { ".ariane/state.json": "{ pas du json" });
  assert.equal(runScript("state-brief.mjs", ["--project", bad]).code, 1);
});

test("--lot et --story rendent l'élément en entier, ou une erreur", (t) => {
  const s = state({ lots: [lot("10", { notes: ["a", "b"] })], stories: [story("042", { notes: ["x"] })] });
  const l = brief(t, s, ["--lot", "10"]);
  assert.equal(l.json.lot.notes.length, 2);
  const st = brief(t, s, ["--story", "042"]);
  assert.equal(st.json.story.title, "Story 042");
  assert.equal(brief(t, s, ["--lot", "99"]).code, 1);
  assert.equal(brief(t, s, ["--story", "999"]).json.status, "error");
});

test("ne rend que le nombre de notes, pas les notes, dans le résumé", (t) => {
  const s = state({ current_lot: "01", lots: [lot("01", { status: "in_progress", stories: ["001"], notes: ["n1", "n2", "n3"] })], stories: [story("001", { notes: ["a", "b"] })] });
  const r = brief(t, s).json;
  assert.equal(r.lots.open[0].notes, 3);
  assert.equal(r.stories_of_current_lot[0].notes, 2);
});

test("distingue les stories du lot en cours des autres, comptées par statut", (t) => {
  const s = state({
    current_lot: "02",
    lots: [lot("02", { status: "in_progress", stories: ["003", "004"] })],
    stories: [story("001", { status: "done" }), story("002", { status: "done" }), story("003", { status: "in_progress" }), story("004"), story("005")],
  });
  const r = brief(t, s).json;
  assert.deepEqual(r.stories_of_current_lot.map((x) => x.id), ["003", "004"]);
  assert.deepEqual(r.stories_other, { done: 2, todo: 1 });
});

test("l'historique : 5 lignes par défaut, --history en demande plus, repli sur event", (t) => {
  const history = Array.from({ length: 8 }, (_, i) => ({ date: `2026-11-0${i + 1}`, agent: "ada", event: `événement ${i + 1}` }));
  history[7].short = "résumé court";
  const s = state({ history });
  const def = brief(t, s).json.history;
  assert.equal(def.length, 5);
  assert.equal(def[0].short, "événement 4");
  assert.equal(def[4].short, "résumé court");
  assert.equal(brief(t, s, ["--history", "7"]).json.history.length, 7);
  assert.equal(brief(t, s, ["--history", "0"]).json.history.length, 5); // 0 n'est pas un nombre utile
});

test("n'inclut que les deux dernières versions livrées", (t) => {
  const r = brief(t, state({ releases: [{ v: "1" }, { v: "2" }, { v: "3" }] })).json;
  assert.deepEqual(r.releases, [{ v: "2" }, { v: "3" }]);
});

test("environments : seulement les environnements renseignés", (t) => {
  const r = brief(t, state({ environments: { test: { url: "x" }, production: null } })).json;
  assert.deepEqual(r.environments, ["test"]);
});

// ---- le titre de la session ----

test("titre : phases avant la construction", (t) => {
  assert.equal(titleOf(t, state({ phase: "prd" })), "Booker · Le cahier des charges");
  assert.equal(titleOf(t, state({ phase: "ux" })), "Booker · Les écrans");
  assert.equal(titleOf(t, state({ phase: "done" })), "Booker · En ligne");
  assert.equal(titleOf(t, state({ phase: "inconnue" })), "Booker · Où on en est");
});

test("titre : une version en cours", (t) => {
  assert.equal(titleOf(t, state({ phase: "ideation", cycle: { version: "1.1.0" } })), "Booker · Préparer la version 1.1.0");
  assert.equal(titleOf(t, state({ phase: "release", cycle: { version: "1.1.0" } })), "Booker · Mise en ligne de la version 1.1.0");
  assert.equal(titleOf(t, state({ phase: "release" })), "Booker · Mise en ligne");
});

test("titre : sans nom de projet", (t) => {
  assert.equal(titleOf(t, state({ project: undefined, phase: "prd" })), "Projet · Le cahier des charges");
});

test("titre : un lot à lancer, en construction, puis aux étapes de fin", (t) => {
  assert.equal(titleOf(t, state({ lots: [lot("11", { title: "Les réparations" })] })), "Booker · Lot 11 : Les réparations");
  const building = state({ lots: [lot("11", { status: "in_progress", stories: ["042"] })], stories: [story("042", { status: "in_progress" })] });
  assert.equal(titleOf(t, building), "Booker · Lot 11 en construction, story 042");
  assert.equal(titleOf(t, state({ lots: [lot("11", { status: "in_progress", step: "test" })] })), "Booker · Test du lot 11");
  assert.equal(titleOf(t, state({ lots: [lot("11", { status: "in_progress", step: "wiki" })] })), "Booker · Documentation du lot 11");
  assert.equal(titleOf(t, state({ lots: [lot("11", { status: "in_progress", step: "merge" })] })), "Booker · Fusion du lot 11");
  assert.equal(titleOf(t, state({ lots: [lot("11", { status: "in_progress", step: "demo" })] })), "Booker · Démo du lot 11");
  assert.equal(titleOf(t, state({ lots: [lot("11", { status: "demo" })] })), "Booker · Démo du lot 11");
});

test("titre : le lot commencé passe avant un lot à lancer", (t) => {
  const s = state({ lots: [lot("10"), lot("11", { status: "in_progress" })] });
  assert.equal(titleOf(t, s), "Booker · Lot 11 : Titre 11");
});

test("titre : tous les lots terminés", (t) => {
  assert.equal(titleOf(t, state({ lots: [lot("01", { status: "done" })] })), "Booker · Tous les lots sont terminés");
});

test("titre : 60 caractères au plus, avec une ellipse", (t) => {
  const long = titleOf(t, state({ project: { name: "A".repeat(80) }, phase: "prd" }));
  assert.equal(long.length, 60);
  assert.ok(long.endsWith("…"));
  const exact = titleOf(t, state({ project: { name: "B".repeat(60 - " · Le cahier des charges".length) }, phase: "prd" }));
  assert.equal(exact.length, 60);
  assert.ok(!exact.endsWith("…"));
});
