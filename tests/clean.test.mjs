import assert from "node:assert/strict";
import { existsSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { makeProject, readJson, runScript } from "./helpers.mjs";

const doneLots = (...ids) => ids.map((id) => ({ id, status: "done" }));
const state = (over = {}) => ({ project: { name: "T" }, lots: [], stories: [], history: [], ...over });
const clean = (root, args = []) => runScript("clean.mjs", [...args, "--project", root]);
const days = (n) => new Date(Date.now() - n * 86_400_000);

test("erreur claire sans state.json", (t) => {
  const root = makeProject(t, state(), {}, ".autre");
  const r = clean(root);
  assert.equal(r.code, 1);
  assert.equal(r.json.status, "error");
});

test("--due : jamais nettoyé, il faut deux lots terminés", (t) => {
  assert.equal(clean(makeProject(t, state({ lots: doneLots("01") })), ["--due"]).json.due, false);
  const r = clean(makeProject(t, state({ lots: doneLots("01", "02") })), ["--due"]);
  assert.equal(r.json.due, true);
  assert.equal(r.json.lots_since_clean, 2);
  assert.equal(r.json.every, 2);
  assert.equal(r.json.last_clean, null);
});

test("--due compte les lots terminés depuis le dernier nettoyage", (t) => {
  const last = { lot: "02", at: "2026-11-01" };
  assert.equal(clean(makeProject(t, state({ last_clean: last, lots: doneLots("01", "02", "03") })), ["--due"]).json.due, false);
  const r = clean(makeProject(t, state({ last_clean: last, lots: doneLots("01", "02", "03", "04") })), ["--due"]);
  assert.equal(r.json.due, true);
  assert.equal(r.json.lots_since_clean, 2);
});

test("--due ignore les lots non terminés et ne modifie rien", (t) => {
  const root = makeProject(t, state({ lots: [...doneLots("01"), { id: "02", status: "in_progress" }, { id: "03", status: "todo" }] }));
  const before = JSON.stringify(readJson(root, ".ariane/state.json"));
  assert.equal(clean(root, ["--due"]).json.due, false);
  assert.equal(JSON.stringify(readJson(root, ".ariane/state.json")), before);
});

test("--done note le dernier lot terminé et la date", (t) => {
  const root = makeProject(t, state({ lots: doneLots("03", "05", "04") }));
  const r = clean(root, ["--done"]);
  assert.equal(r.json.last_clean.lot, "05");
  assert.match(r.json.last_clean.at, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(readJson(root, ".ariane/state.json").last_clean.lot, "05");
  assert.equal(clean(root, ["--due"]).json.lots_since_clean, 0);
});

test("--done ne revient jamais en arrière", (t) => {
  const root = makeProject(t, state({ last_clean: { lot: "09", at: "2026-11-01" }, lots: doneLots("03") }));
  assert.equal(clean(root, ["--done"]).json.last_clean.lot, "09");
});

test("le nettoyage purge les vieilles sorties d'outils de .ariane/tmp, pas les récentes ni .gitignore", (t) => {
  const root = makeProject(t, state(), {
    ".ariane/tmp/.gitignore": "*\n",
    ".ariane/tmp/vieux.log": "x".repeat(100),
    ".ariane/tmp/frais.log": "y",
  });
  utimesSync(join(root, ".ariane/tmp/vieux.log"), days(3), days(3));
  utimesSync(join(root, ".ariane/tmp/.gitignore"), days(30), days(30));
  const r = clean(root);
  assert.equal(r.code, 0);
  assert.deepEqual(r.json.purged_tmp, { files: 1, bytes: 100 });
  assert.ok(!existsSync(join(root, ".ariane/tmp/vieux.log")));
  assert.ok(existsSync(join(root, ".ariane/tmp/frais.log")));
  assert.ok(existsSync(join(root, ".ariane/tmp/.gitignore")));
});

test("le nettoyage sans dossier tmp ne plante pas", (t) => {
  const r = clean(makeProject(t, state()));
  assert.equal(r.json.status, "ok");
  assert.deepEqual(r.json.purged_tmp, { files: 0, bytes: 0 });
  assert.deepEqual(r.json.to_condense, []);
  assert.deepEqual(r.json.watch, []);
  assert.equal(r.json.total_to_condense_chars, 0);
});

test("liste ce qui reste trop gros, du plus gros au plus petit", (t) => {
  const root = makeProject(t, state(), {
    "docs/wiki/page.md": "w".repeat(26_000),
    ".ariane/notes/sujet.md": "n".repeat(16_000),
    ".ariane/decisions.md": "d".repeat(30_000),
    ".ariane/issues.md": "i".repeat(15_000), // juste au plafond : pas signalé
    ".ariane/memory.md": Array.from({ length: 70 }, (_, i) => `- ${i}`).join("\n"),
  });
  const r = clean(root).json;
  assert.deepEqual(
    r.to_condense.map((f) => [f.file, f.kind]),
    [
      [".ariane/decisions.md", "ariane"],
      ["docs/wiki/page.md", "wiki"],
      [".ariane/notes/sujet.md", "carnet"],
      [".ariane/memory.md", "ariane"],
    ],
  );
  assert.equal(r.to_condense[0].chars, 30_000);
  assert.equal(r.to_condense[0].max, 15_000);
  assert.equal(r.to_condense[3].entries, 70);
  assert.equal(r.total_to_condense_chars, r.to_condense.reduce((s, f) => s + f.chars, 0));
});

test("signale les documents de référence très gros sans les condenser", (t) => {
  const root = makeProject(t, state(), { "docs/02-prd.md": "p".repeat(60_001), "docs/04-architecture.md": "a".repeat(60_000) });
  const r = clean(root).json;
  assert.deepEqual(r.watch, [{ file: "docs/02-prd.md", chars: 60_001 }]);
  assert.deepEqual(r.to_condense, []);
});

test("le nettoyage range l'historique d'état et rapporte ce qu'il a archivé", (t) => {
  const history = Array.from({ length: 24 }, (_, i) => ({ date: "2026-11-01", agent: "ada", event: `e${i}` }));
  const root = makeProject(t, state({ history }));
  const r = clean(root).json;
  assert.equal(r.archived.state_history, 4);
  assert.match(r.archived.file, /nettoyage-/);
  assert.equal(readJson(root, ".ariane/state.json").history.length, 20);
});
