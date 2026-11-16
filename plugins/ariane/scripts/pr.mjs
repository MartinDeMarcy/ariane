#!/usr/bin/env node
// Les deux gestes de Clio qui prenaient le plus d'échanges : attendre la CI d'une pull request, puis la fusionner.
// Avant, chaque attente était une boucle `gh` relancée quatre ou cinq fois (un échange, donc une relecture de sa
// conversation, à chaque fois) ; ici, une seule commande attend et rend une ligne.
//
//   node pr.mjs wait <n> [--minutes 9]          → attend la fin de la CI (9 minutes au plus, 20 s entre deux relevés)
//   node pr.mjs merge <n> [--dry-run]           → fusionne la pull request (CI verte exigée), supprime sa branche,
//                                                  remet l'ordinateur sur la branche de base à jour
//   node pr.mjs --project <dossier> …           → un autre dossier que le dossier courant
//
// Écrit une ligne de JSON : {status, ...}. Codes de sortie : 0 = ok (CI verte / fusionnée), 1 = pas ok, 2 = erreur d'emploi.
//   wait  → status : "success" | "failure" | "pending" (délai dépassé) | "no_checks" | "closed"
//   merge → status : "merged" | "refused" | "error" | "dry_run" (essai à blanc : tout est vérifié, rien n'est fait)
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, resolve } from "node:path";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const out = (value, code = 0) => {
  process.stdout.write(JSON.stringify(value) + "\n");
  process.exit(code);
};

const cmd = args.find((a) => a === "wait" || a === "merge");
const number = args.find((a, i) => /^\d+$/.test(a) && args[i - 1] !== "--minutes" && args[i - 1] !== "--project");
if (!cmd || !number) out({ status: "error", message: "Usage : node pr.mjs wait|merge <numéro de pull request> [--minutes 9] [--dry-run] [--project <dossier>]" }, 2);
const root = resolve(flag("--project") || process.cwd());

// `gh` est parfois installé hors du PATH (Windows) : on ajoute son dossier habituel.
// Sous Windows la variable s'appelle souvent `Path` : écrire `env.PATH` en créerait une seconde, vide hors notre
// ajout, qui masquerait la vraie et rendrait `git` introuvable. On garde le nom que l'environnement utilise.
const env = { ...process.env, GH_PROMPT_DISABLED: "1" };
const pathKey = Object.keys(env).find((k) => k.toLowerCase() === "path") || "PATH";
for (const dir of ["C:\\Program Files\\GitHub CLI", "/usr/local/bin", "/opt/homebrew/bin"]) {
  if (existsSync(dir) && !(env[pathKey] || "").split(delimiter).includes(dir)) env[pathKey] = `${env[pathKey] || ""}${delimiter}${dir}`;
}
// Pour les tests : ARIANE_GH_SCRIPT remplace `gh` par un script node, ARIANE_PR_POLL_MS et ARIANE_PR_EMPTY_MS
// raccourcissent l'intervalle entre deux relevés (20 s) et l'attente d'une première vérification (90 s).
const fakeGh = process.env.ARIANE_GH_SCRIPT;
const run = (bin, a, timeout = 90_000) =>
  bin === "gh" && fakeGh
    ? spawnSync(process.execPath, [fakeGh, ...a], { cwd: root, env, encoding: "utf8", timeout, stdio: ["ignore", "pipe", "pipe"], shell: false })
    : spawnSync(bin, a, { cwd: root, env, encoding: "utf8", timeout, stdio: ["ignore", "pipe", "pipe"], shell: false });
const POLL_MS = Number(process.env.ARIANE_PR_POLL_MS) || 20_000;
const EMPTY_MS = Number(process.env.ARIANE_PR_EMPTY_MS) || 90_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const view = () => {
  const r = run("gh", ["pr", "view", number, "--json", "state,mergeable,baseRefName,headRefName,url,statusCheckRollup"], 30_000);
  if (r.error || r.status !== 0) return { error: (r.error?.code || r.stderr || "gh a échoué").toString().trim().split("\n")[0] };
  try {
    return JSON.parse(r.stdout);
  } catch {
    return { error: "réponse de gh illisible" };
  }
};

// Une vérification est « finie » quand elle a un résultat ; « verte » si ce résultat est bon ou neutre.
// Seule la CI du projet (la vérification nommée `ci`) décide : un déploiement de prévisualisation Vercel en
// retard ou en erreur ne bloque pas la fusion. Sans vérification `ci`, toutes comptent.
const summarize = (pr) => {
  const all = (pr.statusCheckRollup || []).map((c) => ({
    name: c.name || c.context,
    done: c.status === "COMPLETED" || (c.state && c.state !== "PENDING" && c.state !== "EXPECTED"),
    ok: ["SUCCESS", "NEUTRAL", "SKIPPED"].includes(c.conclusion || c.state),
  }));
  const checks = all.some((c) => c.name === "ci") ? all.filter((c) => c.name === "ci") : all;
  return { checks, pending: checks.filter((c) => !c.done), failing: checks.filter((c) => c.done && !c.ok) };
};

if (cmd === "wait") {
  const deadline = Date.now() + Math.min(9.5, Number(flag("--minutes")) || 9) * 60_000;
  let seenChecks = false;
  const emptyUntil = Date.now() + EMPTY_MS; // les vérifications mettent parfois un moment à apparaître après le push
  for (;;) {
    const pr = view();
    if (pr.error) out({ status: "error", pr: Number(number), message: pr.error }, 1);
    if (pr.state !== "OPEN") out({ status: "closed", pr: Number(number), state: pr.state, url: pr.url }, 1);
    const s = summarize(pr);
    if (s.checks.length) seenChecks = true;
    if (s.failing.length) out({ status: "failure", pr: Number(number), failing: s.failing.map((c) => c.name), url: pr.url }, 1);
    if (seenChecks && !s.pending.length) out({ status: "success", pr: Number(number), checks: s.checks.length, mergeable: pr.mergeable, url: pr.url }, 0);
    if (!seenChecks && Date.now() > emptyUntil) out({ status: "no_checks", pr: Number(number), url: pr.url }, 1);
    if (Date.now() > deadline) out({ status: "pending", pr: Number(number), waiting_for: s.pending.map((c) => c.name), url: pr.url }, 1);
    await sleep(POLL_MS);
  }
}

// merge
const pr = view();
if (pr.error) out({ status: "error", pr: Number(number), message: pr.error }, 1);
if (pr.state !== "OPEN") out({ status: "refused", pr: Number(number), message: `La pull request n'est pas ouverte (${pr.state}).` }, 1);
const s = summarize(pr);
if (s.failing.length || s.pending.length) out({ status: "refused", pr: Number(number), message: "La CI n'est pas verte.", failing: s.failing.map((c) => c.name), pending: s.pending.map((c) => c.name) }, 1);
if (pr.mergeable === "CONFLICTING") out({ status: "refused", pr: Number(number), message: "Conflit avec la branche de base : à résoudre avant la fusion." }, 1);
const status = run("git", ["status", "--porcelain", "--untracked-files=no"], 15_000);
if (status.error || status.status !== 0) out({ status: "error", pr: Number(number), message: `git status a échoué : ${(status.error?.code || status.stderr || "").toString().trim().split("\n")[0]}` }, 1);
const dirty = status.stdout.trim();
if (dirty) out({ status: "refused", pr: Number(number), message: "Des changements ne sont pas enregistrés dans le dossier : enregistre-les ou mets-les de côté avant la fusion." }, 1);
if (args.includes("--dry-run")) out({ status: "dry_run", pr: Number(number), would_merge: `${pr.headRefName} -> ${pr.baseRefName}`, message: "Essai à blanc : rien n'a été fait." }, 0);

// On se place d'abord sur la branche de base : `--delete-branch` ne peut pas supprimer la branche où l'on se trouve.
const sw = run("git", ["switch", pr.baseRefName], 30_000);
if (sw.status !== 0) out({ status: "error", pr: Number(number), message: `Impossible de passer sur ${pr.baseRefName} : ${(sw.stderr || "").trim().split("\n")[0]}` }, 1);
const m = run("gh", ["pr", "merge", number, "--merge", "--delete-branch"], 120_000);
const after = view();
if (after.state !== "MERGED") out({ status: "error", pr: Number(number), message: (m.stderr || m.stdout || "La fusion a échoué.").trim().split("\n")[0] }, 1);
const pull = run("git", ["pull", "--ff-only", "--quiet"], 60_000);
const head = run("git", ["rev-parse", "--short", "HEAD"], 15_000).stdout.trim();
out({ status: "merged", pr: Number(number), base: pr.baseRefName, deleted_branch: pr.headRefName, head, pulled: pull.status === 0, url: after.url });
