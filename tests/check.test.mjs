import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { cleanup, read, runScript, tempDir, write } from "./helpers.mjs";

// Un projet jeté dont chaque script npm lance un petit fichier node, pour éviter tout souci de guillemets.
const project = (t, scripts, files = {}) => {
  const root = tempDir("ariane-check-");
  t.after(() => cleanup(root));
  const wired = {};
  for (const [name, body] of Object.entries(scripts)) {
    wired[name] = `node scripts-${name.replace(/\W/g, "_")}.mjs`;
    write(root, { [`scripts-${name.replace(/\W/g, "_")}.mjs`]: body });
  }
  write(root, { "package.json": { name: "jetable", version: "1.0.0", scripts: wired }, ...files });
  return root;
};
// --project avant le reste : ce qui suit « -- » est passé à l'outil, il ne faut pas que --project s'y retrouve.
const check = (root, args = []) => runScript("check.mjs", ["--project", root, ...args]);
const passes = "console.log('ça passe');";
const fails = (msg = "Error: expected 1 to be 2") => `console.log(${JSON.stringify(msg)}); process.exit(1);`;
const logFirstLine = (root, step) => read(root, `.ariane/tmp/check-${step}.log`).split("\n")[0];

test("sans package.json : message clair, code 1", (t) => {
  const root = tempDir();
  t.after(() => cleanup(root));
  const r = check(root);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /package\.json introuvable/);
});

test("tout passe : une ligne par étape, un bilan, code 0", (t) => {
  const root = project(t, { lint: passes, typecheck: passes, test: passes, build: passes });
  const r = check(root);
  assert.equal(r.code, 0, r.stdout);
  for (const step of ["lint", "typecheck", "test", "build"]) assert.match(r.stdout, new RegExp(`✓ ${step} \\(\\d+ s\\)`));
  assert.match(r.stdout, /Bilan : tout passe\./);
  assert.ok(!r.stdout.includes("ça passe"), "la sortie des outils ne remplit pas la conversation");
});

test("les étapes sans script sont sautées en le disant", (t) => {
  const root = project(t, { test: passes });
  const r = check(root);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /– lint : pas de script « lint »/);
  assert.match(r.stdout, /– build : pas de script « build »/);
  assert.match(r.stdout, /✓ test/);
});

test("une étape en échec s'arrête là, garde un extrait et la sortie complète", (t) => {
  const root = project(t, {
    lint: passes,
    test: fails("Error: expected 1 to be 2"),
    build: "require('node:fs');import('node:fs').then((fs) => fs.writeFileSync('build-lance.txt','oui'));",
  });
  const r = check(root);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /✗ test \(\d+ s\) · sortie complète : \.ariane\/tmp\/check-test\.log/);
  assert.match(r.stdout, /expected 1 to be 2/);
  assert.match(r.stdout, /Bilan : à corriger\./);
  assert.ok(!existsSync(join(root, "build-lance.txt")), "l'étape suivante n'est pas lancée");
  assert.match(logFirstLine(root, "test"), /^\$ npm test$/);
  assert.ok(read(root, ".ariane/tmp/check-test.log").includes("expected 1 to be 2"));
});

test("--keep-going lance toutes les étapes même après un échec", (t) => {
  const root = project(t, {
    lint: fails("Error: lint"),
    test: fails("Error: test"),
    build: "import('node:fs').then((fs) => fs.writeFileSync('build-lance.txt','oui'));",
  });
  const r = check(root, ["--keep-going"]);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /✗ lint/);
  assert.match(r.stdout, /✗ test/);
  assert.match(r.stdout, /✓ build/);
  assert.ok(existsSync(join(root, "build-lance.txt")));
});

test("le bilan des tests est extrait de la sortie, couleurs retirées", (t) => {
  const vitest = "console.log('\\x1b[32m Test Files  2 passed (2)\\x1b[0m'); console.log('      Tests  7 passed (7)');";
  const r = check(project(t, { test: vitest }), ["--only", "test"]);
  assert.match(r.stdout, /✓ test \(\d+ s\) · Test Files 2 passed \(2\) · Tests 7 passed \(7\)/);
  assert.ok(!r.stdout.includes("\x1b"));
});

test("l'extrait d'erreur tient en 40 lignes et raccourcit les lignes très longues", (t) => {
  const body = `console.log('Error: boom'); for (let i = 0; i < 200; i++) console.log('ligne ' + i); console.log('Error ' + 'x'.repeat(500)); process.exit(1);`;
  const root = project(t, { test: body });
  const r = check(root, ["--only", "test"]);
  const excerpt = r.stdout.split("\n").filter((l) => l.startsWith("    "));
  assert.ok(excerpt.length <= 40, `${excerpt.length} lignes`);
  assert.ok(excerpt.length > 5);
  const long = check(project(t, { test: `console.log('Error ' + 'x'.repeat(500)); process.exit(1);` }), ["--only", "test"]);
  assert.ok(long.stdout.includes("…"));
  assert.ok(Math.max(...long.stdout.split("\n").map((l) => l.length)) < 300);
});

test("--only ne lance que les étapes demandées et passe ce qui suit « -- » à l'outil", (t) => {
  const root = project(t, { lint: fails("Error: lint ne doit pas tourner"), typecheck: passes });
  const r = check(root, ["--only", "typecheck", "--", "--noEmit"]);
  assert.equal(r.code, 0, r.stdout);
  assert.ok(!r.stdout.includes("lint"));
  assert.match(logFirstLine(root, "typecheck"), /^\$ npm run typecheck -- --noEmit$/);
});

test("--test lance les tests unitaires d'un fichier", (t) => {
  const root = project(t, { test: passes });
  const r = check(root, ["--test", "src/lib/x.test.ts", "--", "-t", "un nom"]);
  assert.equal(r.code, 0);
  assert.match(logFirstLine(root, "test"), /^\$ npm test -- src\/lib\/x\.test\.ts -t "un nom"$/);
});

test("--e2e lit le projet Playwright « ordinateur » dans la config", (t) => {
  const config = (names) => `export default { projects: [${names.map((n) => `{ name: '${n}' }`).join(", ")}] };`;
  const cases = [
    [["mobile", "bureau"], "--project=bureau"],
    [["iphone", "desktop"], "--project=desktop"],
    [["Mobile Chrome", "Chrome"], "--project=Chrome"],
    [["Mobile Chrome", "Desktop Chrome"], '"--project=Desktop Chrome"'],
    [["Mobile Safari", "Pixel 5"], ""], // que du mobile : on ne filtre pas
    [["iphone", "tablette"], "--project=tablette"],
  ];
  for (const [names, expected] of cases) {
    const root = project(t, { "test:e2e": passes }, { "playwright.config.ts": config(names) });
    const r = check(root, ["--e2e", "tests/e2e/a.spec.ts"]);
    assert.equal(r.code, 0, r.stdout);
    assert.equal(logFirstLine(root, "e2e"), `$ npm run test:e2e -- ${expected ? expected + " " : ""}tests/e2e/a.spec.ts`, names.join());
  }
});

test("--e2e : --device force un nom, --all-devices n'en filtre aucun, sans config rien n'est filtré", (t) => {
  const config = "export default { projects: [{ name: 'bureau' }, { name: 'mobile' }] };";
  const root = project(t, { "test:e2e": passes }, { "playwright.config.ts": config });
  check(root, ["--e2e", "tests/e2e", "--device", "mobile"]);
  assert.equal(logFirstLine(root, "e2e"), "$ npm run test:e2e -- --project=mobile tests/e2e");
  check(root, ["--e2e", "tests/e2e", "--all-devices"]);
  assert.equal(logFirstLine(root, "e2e"), "$ npm run test:e2e -- tests/e2e");
  const bare = project(t, { "test:e2e": passes });
  check(bare, ["--e2e", "tests/e2e"]);
  assert.equal(logFirstLine(bare, "e2e"), "$ npm run test:e2e -- tests/e2e");
});

test("--e2e sans script test:e2e : étape sautée, pas d'échec", (t) => {
  const r = check(project(t, { test: passes }), ["--e2e", "tests/e2e"]);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /pas de script « test:e2e »/);
});

test("le dossier .ariane/tmp reçoit un .gitignore, sans écraser celui qui existe", (t) => {
  const root = project(t, { test: passes });
  check(root, ["--only", "test"]);
  assert.equal(read(root, ".ariane/tmp/.gitignore"), "*\n");
  write(root, { ".ariane/tmp/.gitignore": "perso\n" });
  check(root, ["--only", "test"]);
  assert.equal(read(root, ".ariane/tmp/.gitignore"), "perso\n");
});

test("sans aucune étape reconnue, dit qu'il n'y a rien à lancer", (t) => {
  const r = check(project(t, {}), ["--only", "lint"]);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /Rien à lancer/);
});
