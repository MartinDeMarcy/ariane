import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { makeProject, read, readJson, runScript, write } from "./helpers.mjs";

const baseState = (over = {}) => ({ project: { name: "T" }, lots: [], stories: [], history: [], ...over });
const archive = (root, args) => runScript("archive-state.mjs", [...args, "--project", root]);
const entries = (n) => Array.from({ length: n }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, "0")}`, agent: "ada", event: `événement ${i + 1}` }));

test("erreurs d'usage : aucun mode, nom invalide, état manquant", (t) => {
  const root = makeProject(t, baseState());
  assert.equal(archive(root, []).code, 1);
  assert.equal(archive(root, ["--lot", "../evil"]).code, 1);
  assert.equal(archive(root, ["--version", "a/b"]).json.status, "error");
  const empty = makeProject(t, baseState(), { ".ariane/state.json": "pas du json" });
  const r = archive(empty, ["--lot", "01"]);
  assert.equal(r.code, 1);
  assert.match(r.json.message, /state\.json/);
});

test("l'historique d'état : les 20 dernières lignes restent, les autres sont rangées sans rien perdre", (t) => {
  const root = makeProject(t, baseState({ history: entries(25) }));
  const r = archive(root, ["--lot", "04"]);
  assert.equal(r.code, 0);
  assert.equal(r.json.archived_history, 5);
  assert.match(r.json.file, /history\/lot-04\.md$/);
  const state = readJson(root, ".ariane/state.json");
  assert.equal(state.history.length, 20);
  assert.equal(state.history[0].event, "événement 6");
  const file = read(root, ".ariane/history/lot-04.md");
  for (let i = 1; i <= 5; i++) assert.ok(file.includes(`événement ${i}`), `événement ${i} doit être dans l'historique`);
  assert.ok(!file.includes("événement 6"));
});

test("un deuxième passage ne range plus rien et n'écrit pas de fichier", (t) => {
  const root = makeProject(t, baseState({ history: entries(25) }));
  archive(root, ["--lot", "04"]);
  const again = archive(root, ["--lot", "05"]);
  assert.equal(again.json.archived_history, 0);
  assert.equal(again.json.file, null);
  assert.ok(!existsSync(join(root, ".ariane/history/lot-05.md")));
});

test("les notes des lots et des stories terminés sont rangées, celles des éléments ouverts restent", (t) => {
  const root = makeProject(
    t,
    baseState({
      lots: [
        { id: "01", title: "Socle", status: "done", notes: ["note lot"] },
        { id: "02", status: "in_progress", notes: ["note ouverte"] },
      ],
      stories: [
        { id: "001", title: "Login", status: "done", notes: ["a", { k: "v" }] },
        { id: "002", status: "todo", notes: ["reste"] },
      ],
    }),
  );
  const r = archive(root, ["--lot", "01"]);
  assert.equal(r.json.archived_notes, 3);
  const state = readJson(root, ".ariane/state.json");
  assert.deepEqual(state.lots[0].notes, []);
  assert.deepEqual(state.lots[1].notes, ["note ouverte"]);
  assert.deepEqual(state.stories[0].notes, []);
  assert.deepEqual(state.stories[1].notes, ["reste"]);
  const file = read(root, ".ariane/history/lot-01.md");
  assert.ok(file.includes("### Lot 01 · Socle"));
  assert.ok(file.includes("note lot"));
  assert.ok(file.includes('{"k":"v"}'));
});

test("les compteurs gardent le dernier numéro de lot et de story", (t) => {
  const root = makeProject(t, baseState({ lots: [{ id: "03", status: "todo" }, { id: "12", status: "todo" }], stories: [{ id: "041", status: "todo" }], counters: { lot: 15, story: 10 } }));
  archive(root, ["--lot", "01"]);
  assert.deepEqual(readJson(root, ".ariane/state.json").counters, { lot: 15, story: 41 });
});

test("--version : les lots et stories livrés sortent de l'état, pas les autres", (t) => {
  const root = makeProject(
    t,
    baseState({
      lots: [
        { id: "01", title: "Socle", status: "done", branch: "feature/lot-01", validated_at: "2026-11-01", pull_request: 7 },
        { id: "02", title: "Suite", status: "in_progress" },
      ],
      stories: [
        { id: "001", title: "Login", status: "done", lot: "01", branch: "feature/001", pull_request: 3 },
        { id: "002", title: "Orpheline", status: "done", branch: "feature/002" },
        { id: "003", title: "En cours", status: "in_progress", lot: "02" },
      ],
    }),
  );
  const r = archive(root, ["--version", "1.0.0"]);
  assert.match(r.json.file, /history\/v1\.0\.0\.md$/);
  const state = readJson(root, ".ariane/state.json");
  assert.deepEqual(state.lots.map((l) => l.id), ["02"]);
  assert.deepEqual(state.stories.map((s) => s.id), ["003"]);
  assert.deepEqual(state.counters, { lot: 2, story: 3 }); // les numéros ne reculent pas
  const file = read(root, ".ariane/history/v1.0.0.md");
  assert.ok(file.includes("Lot 01 · Socle"));
  assert.ok(file.includes("PR 7"));
  assert.ok(file.includes("Story 001 · Login"));
  assert.ok(file.includes("Story 002 · Orpheline"));
  assert.ok(!file.includes("En cours"));
});

test("--lot ne supprime ni lot ni story de l'état", (t) => {
  const root = makeProject(t, baseState({ lots: [{ id: "01", status: "done" }], stories: [{ id: "001", status: "done" }] }));
  archive(root, ["--lot", "01"]);
  const state = readJson(root, ".ariane/state.json");
  assert.equal(state.lots.length, 1);
  assert.equal(state.stories.length, 1);
});

test("seuls les compteurs changent : l'état est réécrit sans fichier d'historique", (t) => {
  const root = makeProject(t, baseState({ lots: [{ id: "02", status: "todo" }] }));
  const r = archive(root, ["--lot", "01"]);
  assert.equal(r.json.file, null);
  assert.deepEqual(readJson(root, ".ariane/state.json").counters, { lot: 2, story: 0 });
});

test("le journal de bord : les 15 dernières entrées restent, les anciennes sont rangées", (t) => {
  const log = ["# Journal", "", "Introduction du journal.", ""];
  for (let i = 1; i <= 20; i++) log.push(`## 2026-11-${String(i).padStart(2, "0")} · entrée ${i}`, "", `Détail ${i}.`, "");
  const root = makeProject(t, baseState(), { ".ariane/log.md": log.join("\n") });
  const r = archive(root, ["--lot", "01"]);
  assert.equal(r.json.archived_log_entries, 5);
  const kept = read(root, ".ariane/log.md");
  assert.ok(kept.startsWith("# Journal"));
  assert.ok(kept.includes("Introduction du journal."));
  assert.ok(kept.includes("entrée 6"));
  assert.ok(kept.includes("entrée 20"));
  assert.ok(!kept.includes("entrée 5\n"));
  assert.ok(!kept.includes("Détail 1."));
  assert.match(kept, /rangées avec le lot 01/);
  const old = read(root, ".ariane/history/lot-01.md");
  for (let i = 1; i <= 5; i++) assert.ok(old.includes(`entrée ${i}`) && old.includes(`Détail ${i}.`));
  assert.ok(old.includes("### 2026-11-01"), "les titres rangés descendent d'un niveau");
});

test("un journal de 15 entrées ou moins n'est pas touché", (t) => {
  const log = Array.from({ length: 15 }, (_, i) => `## 2026-11-${String(i + 1).padStart(2, "0")}\nx`).join("\n");
  const root = makeProject(t, baseState(), { ".ariane/log.md": log });
  const r = archive(root, ["--lot", "01"]);
  assert.equal(r.json.archived_log_entries, 0);
  assert.equal(read(root, ".ariane/log.md"), log);
});

// ---- le wiki ----

const wikiBlocks = (lots, eol = "\n") =>
  ["# Historique", "", "Introduction.", "", ...lots.flatMap((n) => [`## 2026-11-0${n} · Lot ${n}`, "", `Contenu du lot ${n}.`, ""])].join(eol);

test("l'historique du wiki garde les trois premiers lots et range les autres, avec un renvoi", (t) => {
  const root = makeProject(t, baseState(), { "docs/wiki/historique.md": wikiBlocks([5, 4, 3, 2, 1]) });
  const r = archive(root, ["--lot", "05"]);
  assert.equal(r.json.archived_wiki_history, 2);
  const kept = read(root, "docs/wiki/historique.md");
  assert.ok(kept.includes("Lot 5") && kept.includes("Lot 4") && kept.includes("Lot 3"));
  assert.ok(!kept.includes("Contenu du lot 2") && !kept.includes("Contenu du lot 1"));
  assert.ok(kept.includes("archives/historique.md"), "renvoi vers les archives");
  assert.ok(kept.indexOf("archives/historique.md") < kept.indexOf("## 2026-11-05"), "le renvoi est avant le premier lot");
  const archived = read(root, "docs/wiki/archives/historique.md");
  assert.ok(archived.includes("Contenu du lot 2") && archived.includes("Contenu du lot 1"));
});

test("l'historique du wiki : rien à ranger, rien de modifié, et un second passage ne change rien", (t) => {
  const root = makeProject(t, baseState(), { "docs/wiki/historique.md": wikiBlocks([5, 4, 3]) });
  const before = read(root, "docs/wiki/historique.md");
  assert.equal(archive(root, ["--lot", "05"]).json.archived_wiki_history, 0);
  assert.equal(read(root, "docs/wiki/historique.md"), before);
  assert.ok(!existsSync(join(root, "docs/wiki/archives")));
  const many = makeProject(t, baseState(), { "docs/wiki/historique.md": wikiBlocks([5, 4, 3, 2, 1]) });
  archive(many, ["--lot", "05"]);
  const once = read(many, "docs/wiki/historique.md");
  assert.equal(archive(many, ["--lot", "06"]).json.archived_wiki_history, 0);
  assert.equal(read(many, "docs/wiki/historique.md"), once);
});

test("les archives du wiki s'enrichissent sans perdre l'ancien contenu", (t) => {
  const root = makeProject(t, baseState(), { "docs/wiki/historique.md": wikiBlocks([6, 5, 4, 3, 2]) });
  write(root, { "docs/wiki/archives/historique.md": "# Archives\n\nIntro.\n\n## 2026-10-01 · Lot 0\n\nVieux lot.\n" });
  archive(root, ["--lot", "06"]);
  const archived = read(root, "docs/wiki/archives/historique.md");
  assert.ok(archived.includes("Vieux lot."));
  assert.ok(archived.includes("Contenu du lot 3") && archived.includes("Contenu du lot 2"));
  assert.ok(archived.startsWith("# Archives"));
});

test("l'historique du wiki en fins de ligne Windows garde ses fins de ligne", (t) => {
  const root = makeProject(t, baseState(), { "docs/wiki/historique.md": wikiBlocks([5, 4, 3, 2, 1], "\r\n") });
  archive(root, ["--lot", "05"]);
  for (const f of ["docs/wiki/historique.md", "docs/wiki/archives/historique.md"]) {
    const text = read(root, f);
    assert.ok(text.includes("\r\n"), f);
    assert.ok(!/[^\r]\n/.test(text), `${f} ne doit pas mélanger les fins de ligne`);
  }
});

test("les titres non datés de l'historique ne sont jamais rangés", (t) => {
  const text = wikiBlocks([5, 4, 3, 2]) + "\n## Légende\n\nA garder.\n";
  const root = makeProject(t, baseState(), { "docs/wiki/historique.md": text });
  archive(root, ["--lot", "05"]);
  assert.ok(read(root, "docs/wiki/historique.md").includes("A garder."));
});

test("les pages du wiki trop grosses sont signalées, sauf dans archives/", (t) => {
  const big = (n) => "x".repeat(n);
  const root = makeProject(t, baseState(), {
    "docs/wiki/gros.md": big(25_001),
    "docs/wiki/limite.md": big(25_000),
    "docs/wiki/fonctionnalites/enorme.md": big(40_000),
    "docs/wiki/archives/ancien.md": big(90_000),
  });
  const r = archive(root, ["--lot", "01"]).json;
  assert.deepEqual(r.wiki_over, [
    { page: "fonctionnalites/enorme.md", chars: 40_000 },
    { page: "gros.md", chars: 25_001 },
  ]);
  assert.equal(r.wiki_page_max_chars, 25_000);
});

test("les notes du carnet trop grosses sont signalées, jamais modifiées", (t) => {
  const root = makeProject(t, baseState(), {
    ".ariane/notes/grosse.md": "y".repeat(15_001),
    ".ariane/notes/petite.md": "ok",
    ".ariane/notes/autre.txt": "y".repeat(20_000),
  });
  const r = archive(root, ["--lot", "01"]).json;
  assert.deepEqual(r.notes_over, [{ note: "grosse.md", chars: 15_001 }]);
  assert.equal(read(root, ".ariane/notes/grosse.md").length, 15_001);
});

test("la mémoire : mesurée contre ses deux plafonds, ou null sans fichier", (t) => {
  const ok = makeProject(t, baseState(), { ".ariane/memory.md": "# Mémoire\n\n- a\n- b\n" });
  assert.equal(archive(ok, ["--lot", "01"]).json.memory.over, false);
  assert.equal(archive(ok, ["--lot", "01"]).json.memory.entries, 2);
  const many = makeProject(t, baseState(), { ".ariane/memory.md": Array.from({ length: 61 }, (_, i) => `- ligne ${i}`).join("\n") });
  assert.equal(archive(many, ["--lot", "01"]).json.memory.over, true);
  const heavy = makeProject(t, baseState(), { ".ariane/memory.md": "- " + "z".repeat(12_001) });
  assert.equal(archive(heavy, ["--lot", "01"]).json.memory.over, true);
  const none = makeProject(t, baseState());
  assert.equal(archive(none, ["--lot", "01"]).json.memory, null);
});

test("--clean écrit un fichier nettoyage-AAAA-MM-JJ.md", (t) => {
  const root = makeProject(t, baseState({ history: entries(22) }));
  const r = archive(root, ["--clean"]);
  assert.match(r.json.file, /history\/nettoyage-\d{4}-\d{2}-\d{2}\.md$/);
  assert.match(read(root, ".ariane/history/" + r.json.file.split("/").pop()), /^# Historique : nettoyage/);
});

test("un ancien dossier .bharness est repris tel quel", (t) => {
  const root = makeProject(t, baseState({ history: entries(22) }), {}, ".bharness");
  const r = archive(root, ["--lot", "01"]);
  assert.equal(r.json.archived_history, 2);
  assert.ok(existsSync(join(root, ".bharness/history/lot-01.md")));
});
