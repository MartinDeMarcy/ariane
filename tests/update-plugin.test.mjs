import assert from "node:assert/strict";
import { chmodSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { cleanup, runScript, tempDir, write } from "./helpers.mjs";

const isWindows = process.platform === "win32";
// Un PATH réduit, sans le vrai `claude` de cette machine : seulement de quoi lancer `where` / `which`.
const systemPath = isWindows ? join(process.env.SystemRoot || "C:\\Windows", "System32") : "/usr/bin:/bin";
const sep = isWindows ? ";" : ":";

// `Path: undefined` retire la variante « Path » de Windows, pour que seule notre valeur de PATH compte.
const envWith = (...dirs) => ({ Path: undefined, PATH: [...dirs, systemPath].join(sep) });

const sandbox = (t) => {
  const root = tempDir("ariane-update-");
  t.after(() => cleanup(root));
  const empty = join(root, "vide");
  mkdirSync(empty);
  return { root, empty, env: { APPDATA: empty, LOCALAPPDATA: empty } };
};

const dryRun = (env, cwd) => runScript("update-plugin.mjs", ["--dry-run"], { cwd, env });

test("retrouve `claude` dans le PATH et annonce les deux commandes, sans rien lancer (--dry-run)", (t) => {
  const { root, env } = sandbox(t);
  const bin = join(root, "bin");
  if (isWindows) {
    // le script sans extension que npm installe pour les shells Unix, listé avant le .cmd par `where`
    write(bin, { "claude": "#!/bin/sh\n", "claude.cmd": "@echo off\r\n" });
  } else {
    write(bin, { claude: "#!/bin/sh\nexit 0\n" });
    chmodSync(join(bin, "claude"), 0o755);
  }
  const r = dryRun({ ...env, ...envWith(bin) }, root);
  assert.equal(r.code, 0, r.stderr);
  assert.ok(r.stdout.includes(`Programme utilisé : ${join(bin, isWindows ? "claude.cmd" : "claude")}`), r.stdout);
  assert.match(r.stdout, /> claude plugin marketplace update ariane/);
  assert.match(r.stdout, /> claude plugin update ariane@ariane/);
  assert.match(r.stdout, /Simulation terminée/);
});

test("sous Windows, ne retient jamais le script sans extension (« code null »)", { skip: !isWindows }, (t) => {
  const { root, env } = sandbox(t);
  const bin = join(root, "npm");
  write(bin, { "claude": "#!/bin/sh\n", "claude.cmd": "@echo off\r\n" });
  const r = dryRun({ ...env, ...envWith(bin) }, root);
  assert.match(r.stdout, /Programme utilisé : .*claude\.cmd/);
  assert.ok(!/Programme utilisé : .*claude\r?\n/.test(r.stdout));
});

test("sous Windows, préfère le claude.exe rangé à côté du .cmd de npm", { skip: !isWindows }, (t) => {
  const { root, env } = sandbox(t);
  const bin = join(root, "npm");
  const real = join(bin, "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe");
  write(bin, { "claude.cmd": "@echo off\r\n", [join("node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe")]: "" });
  const r = dryRun({ ...env, ...envWith(bin) }, root);
  assert.ok(r.stdout.includes(`Programme utilisé : ${real}`), r.stdout);
});

test("sans claude dans le PATH, prend la version la plus récente de l'application de bureau", (t) => {
  const { root, env } = sandbox(t);
  const base = join(root, "appdata", "Claude", "claude-code");
  for (const version of ["1.9.0", "1.10.2", "1.10.10", "0.99.0"]) write(base, { [join(version, "abc123", "claude.exe")]: "" });
  const r = dryRun({ ...env, APPDATA: join(root, "appdata"), ...envWith() }, root);
  assert.equal(r.code, 0, r.stderr);
  assert.ok(r.stdout.includes(join(base, "1.10.10", "abc123", "claude.exe")), "1.10.10 > 1.10.2 > 1.9.0 : on compare les nombres, pas le texte\n" + r.stdout);
});

test("rien d'installé : message clair et code 3", (t) => {
  const { root, env } = sandbox(t);
  const r = dryRun({ ...env, ...envWith() }, root);
  assert.equal(r.code, 3);
  assert.match(r.stderr, /Impossible de retrouver le programme `claude`/);
});

test("un claude qui échoue : le code et la cause sont dits (--dry-run absent)", { skip: isWindows }, (t) => {
  const { root, env } = sandbox(t);
  const bin = join(root, "bin");
  write(bin, { claude: "#!/bin/sh\nexit 7\n" });
  chmodSync(join(bin, "claude"), 0o755);
  const r = runScript("update-plugin.mjs", [], { cwd: root, env: { ...env, ...envWith(bin) } });
  assert.equal(r.code, 7);
  assert.match(r.stderr, /Échec de « claude plugin marketplace update ariane » \(code 7/);
  assert.ok(!r.stdout.includes("Mise à jour terminée"));
});

test("un claude qui réussit : les deux étapes passent, la mise à jour est annoncée", { skip: isWindows }, (t) => {
  const { root, env } = sandbox(t);
  const bin = join(root, "bin");
  write(bin, { claude: `#!/bin/sh\necho "$@" >> "${join(root, "appels.txt")}"\nexit 0\n` });
  chmodSync(join(bin, "claude"), 0o755);
  const r = runScript("update-plugin.mjs", [], { cwd: root, env: { ...env, ...envWith(bin) } });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /Mise à jour terminée/);
  assert.equal(readFileSync(join(root, "appels.txt"), "utf8"), "plugin marketplace update ariane\nplugin update ariane@ariane\n");
});
