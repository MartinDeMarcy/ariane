// Outils communs aux tests des scripts d'Ariane : un projet jetable dans un dossier temporaire,
// et le lancement d'un script comme le fait Ariane (en ligne de commande, sortie JSON).
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SCRIPTS = resolve(dirname(fileURLToPath(import.meta.url)), "..", "plugins", "ariane", "scripts");

/** Un dossier temporaire, à supprimer avec `t.after(() => cleanup(dir))`. */
// realpath : sous Windows, tmpdir() peut être un nom court (RUNNER~1) alors que les outils rendent le nom long.
export const tempDir = (prefix = "ariane-test-") => realpathSync.native(mkdtempSync(join(tmpdir(), prefix)));
export const cleanup = (dir) => rmSync(dir, { recursive: true, force: true, maxRetries: 3 });

/** Écrit des fichiers (chemin relatif → contenu ; un objet est écrit en JSON) sous `root`. */
export const write = (root, files) => {
  for (const [rel, content] of Object.entries(files)) {
    const path = join(root, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, typeof content === "string" ? content : JSON.stringify(content, null, 2) + "\n");
  }
};

export const read = (root, rel) => readFileSync(join(root, rel), "utf8");
export const readJson = (root, rel) => JSON.parse(read(root, rel));

/** Un projet Ariane minimal : `.ariane/state.json` plus les fichiers demandés. */
export const makeProject = (t, state, files = {}, dirName = ".ariane") => {
  const root = tempDir();
  t.after(() => cleanup(root));
  write(root, { [`${dirName}/state.json`]: state, ...files });
  return root;
};

/** Comme runScript, mais sans bloquer le processus de test (utile quand le test sert un serveur local). */
export const runScriptAsync = (script, args = [], { cwd, env } = {}) =>
  new Promise((done) => {
    const child = spawn(process.execPath, [join(SCRIPTS, script), ...args], { cwd, env: { ...process.env, ...env } });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => {
      const lines = stdout.trim().split("\n").filter(Boolean);
      let json = null;
      try {
        json = JSON.parse(lines[lines.length - 1]);
      } catch {
        // pas du JSON
      }
      done({ code, stdout, stderr, json });
    });
  });

/** Lance un script et lit sa dernière ligne de sortie comme du JSON (null si ce n'en est pas). */
export const runScript = (script, args = [], { cwd, env } = {}) => {
  const r = spawnSync(process.execPath, [join(SCRIPTS, script), ...args], {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
    timeout: 60_000,
  });
  const lines = (r.stdout || "").trim().split("\n").filter(Boolean);
  let json = null;
  try {
    json = JSON.parse(lines[lines.length - 1]);
  } catch {
    // pas du JSON : on regarde stdout
  }
  return { code: r.status, stdout: r.stdout || "", stderr: r.stderr || "", json };
};
