import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { cleanup, readJson, runScript, tempDir, write } from "./helpers.mjs";

const FAKE_GH = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "fake-gh.mjs");
const GIT_ENV = { GIT_AUTHOR_NAME: "T", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_NAME: "T", GIT_COMMITTER_EMAIL: "t@example.com" };

const git = (cwd, ...args) => {
  const r = spawnSync("git", ["-c", "commit.gpgsign=false", "-c", "core.autocrlf=false", ...args], { cwd, encoding: "utf8", env: { ...process.env, ...GIT_ENV } });
  assert.equal(r.status, 0, `git ${args.join(" ")} : ${r.stderr}`);
  return r.stdout.trim();
};

// Un dépôt jeté, cloné depuis un dépôt « distant » local, sur la branche feature/x.
const repo = (t) => {
  const base = tempDir("ariane-pr-");
  t.after(() => cleanup(base));
  const origin = join(base, "origin.git");
  const work = join(base, "work");
  git(base, "init", "--bare", "-b", "main", origin);
  git(base, "clone", origin, work);
  git(work, "switch", "-C", "main");
  write(work, { "a.txt": "un\n" });
  git(work, "add", ".");
  git(work, "commit", "-m", "init");
  git(work, "push", "-u", "origin", "main");
  git(work, "switch", "-c", "feature/x");
  return work;
};

const pr = (checks, over = {}) => ({ state: "OPEN", mergeable: "MERGEABLE", baseRefName: "main", headRefName: "feature/x", url: "https://example.test/pr/12", statusCheckRollup: checks, ...over });
const ok = (name = "ci") => ({ name, status: "COMPLETED", conclusion: "SUCCESS" });
const bad = (name = "ci") => ({ name, status: "COMPLETED", conclusion: "FAILURE" });
const running = (name = "ci") => ({ name, status: "IN_PROGRESS", conclusion: "" });

// Lance pr.mjs avec le faux gh ; `views` : les réponses successives de `gh pr view`.
const prRun = (t, args, state, cwd) => {
  const dir = tempDir("ariane-fakegh-");
  t.after(() => cleanup(dir));
  const stateFile = join(dir, "state.json");
  writeFileSync(stateFile, JSON.stringify(state));
  const r = runScript("pr.mjs", args, {
    cwd: cwd || dir,
    env: { ARIANE_GH_SCRIPT: FAKE_GH, FAKE_GH_STATE: stateFile, ARIANE_PR_POLL_MS: "30", ARIANE_PR_EMPTY_MS: "150" },
  });
  return { ...r, calls: readJson(dir, "state.json").calls || [] };
};

test("usage : il faut wait ou merge, et un numéro", (t) => {
  for (const args of [[], ["wait"], ["merge"], ["12"], ["deploy", "12"]]) {
    const r = runScript("pr.mjs", args);
    assert.equal(r.code, 2, args.join(" "));
    assert.equal(r.json.status, "error");
    assert.match(r.json.message, /Usage/);
  }
});

// ---- wait ----

test("wait : CI verte → success, code 0", (t) => {
  const r = prRun(t, ["wait", "12"], { views: [pr([ok()])] });
  assert.equal(r.code, 0);
  assert.equal(r.json.status, "success");
  assert.equal(r.json.pr, 12);
  assert.equal(r.json.checks, 1);
  assert.equal(r.json.mergeable, "MERGEABLE");
});

test("wait : seule la vérification « ci » décide, un déploiement Vercel en erreur ou en retard ne bloque pas", (t) => {
  assert.equal(prRun(t, ["wait", "12"], { views: [pr([ok(), bad("Vercel")])] }).json.status, "success");
  assert.equal(prRun(t, ["wait", "12"], { views: [pr([ok(), running("Vercel – Preview")])] }).json.status, "success");
});

test("wait : sans vérification « ci », toutes comptent", (t) => {
  const r = prRun(t, ["wait", "12"], { views: [pr([ok("build"), bad("lint")])] });
  assert.equal(r.code, 1);
  assert.equal(r.json.status, "failure");
  assert.deepEqual(r.json.failing, ["lint"]);
});

test("wait : la CI échoue → failure, code 1, avec le nom de la vérification", (t) => {
  const r = prRun(t, ["wait", "12"], { views: [pr([bad()])] });
  assert.equal(r.code, 1);
  assert.equal(r.json.status, "failure");
  assert.deepEqual(r.json.failing, ["ci"]);
});

test("wait : une vérification neutre ou ignorée est verte ; une ancienne forme « context/state » est lue aussi", (t) => {
  const checks = [{ name: "ci", status: "COMPLETED", conclusion: "NEUTRAL" }];
  assert.equal(prRun(t, ["wait", "12"], { views: [pr(checks)] }).json.status, "success");
  const legacy = [{ context: "ci", state: "SUCCESS" }];
  assert.equal(prRun(t, ["wait", "12"], { views: [pr(legacy)] }).json.status, "success");
  const legacyBad = [{ context: "ci", state: "FAILURE" }];
  assert.equal(prRun(t, ["wait", "12"], { views: [pr(legacyBad)] }).json.status, "failure");
});

test("wait : attend tant que la CI tourne, puis rend success", (t) => {
  const r = prRun(t, ["wait", "12"], { views: [pr([running()]), pr([running()]), pr([ok()])] });
  assert.equal(r.json.status, "success");
  assert.ok(r.calls.length >= 3, "plusieurs relevés");
});

test("wait : les vérifications qui apparaissent après le push sont attendues, pas prises pour une absence", (t) => {
  const r = prRun(t, ["wait", "12"], { views: [pr([]), pr([running()]), pr([ok()])] });
  assert.equal(r.json.status, "success");
});

test("wait : délai dépassé → pending, avec ce qu'on attend", (t) => {
  const r = prRun(t, ["wait", "12", "--minutes", "0.001"], { views: [pr([running()])] });
  assert.equal(r.code, 1);
  assert.equal(r.json.status, "pending");
  assert.deepEqual(r.json.waiting_for, ["ci"]);
});

test("wait : aucune vérification n'apparaît → no_checks", (t) => {
  const r = prRun(t, ["wait", "12"], { views: [pr([])] });
  assert.equal(r.code, 1);
  assert.equal(r.json.status, "no_checks");
});

test("wait : pull request déjà fermée ou fusionnée → closed", (t) => {
  const r = prRun(t, ["wait", "12"], { views: [pr([ok()], { state: "MERGED" })] });
  assert.equal(r.code, 1);
  assert.equal(r.json.status, "closed");
  assert.equal(r.json.state, "MERGED");
});

test("wait : gh échoue ou répond n'importe quoi → error avec la cause", (t) => {
  const failed = prRun(t, ["wait", "12"], { viewError: "GraphQL: Could not resolve to a PullRequest" });
  assert.equal(failed.json.status, "error");
  assert.match(failed.json.message, /Could not resolve/);
  const garbage = prRun(t, ["wait", "12"], { rawView: "<html>" });
  assert.equal(garbage.json.status, "error");
  assert.match(garbage.json.message, /illisible/);
});

test("wait : le numéro peut venir avant ou après --minutes, et --project est lu", (t) => {
  const r = prRun(t, ["--minutes", "1", "wait", "12", "--project", tempDir()], { views: [pr([ok()])] });
  assert.equal(r.json.status, "success");
  assert.equal(r.json.pr, 12);
});

// ---- merge ----

test("merge : CI verte, dossier propre → fusionne, supprime la branche, revient sur main à jour", (t) => {
  const work = repo(t);
  const r = prRun(t, ["merge", "12"], { views: [pr([ok()])] }, work);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.equal(r.json.status, "merged");
  assert.equal(r.json.base, "main");
  assert.equal(r.json.deleted_branch, "feature/x");
  assert.equal(r.json.pulled, true);
  assert.match(r.json.head, /^[0-9a-f]{4,}$/);
  assert.ok(r.calls.includes("pr merge 12 --merge --delete-branch"));
  assert.equal(git(work, "branch", "--show-current"), "main");
});

test("merge : fonctionne quand le PATH s'appelle « Path » (PowerShell et cmd sous Windows)", { skip: process.platform !== "win32" }, (t) => {
  const work = repo(t);
  const dir = tempDir("ariane-fakegh-");
  t.after(() => cleanup(dir));
  writeFileSync(join(dir, "state.json"), JSON.stringify({ views: [pr([ok()])] }));
  // Une seule variable, nommée « Path » comme dans un PowerShell ou un cmd ordinaire. Sans le correctif de pr.mjs,
  // Windows rend `git` introuvable ou non selon l'ordre dans lequel il trie deux variables de même nom : ce test a
  // échoué à chaque fois dans la CI, mais peut passer en local ; il garde le cas contre un retour en arrière.
  const r = runScript("pr.mjs", ["merge", "12"], {
    cwd: work,
    env: { PATH: undefined, Path: process.env.PATH, ARIANE_GH_SCRIPT: FAKE_GH, FAKE_GH_STATE: join(dir, "state.json") },
  });
  assert.equal(r.json?.status, "merged", r.stdout + r.stderr);
});

test("merge : sans dépôt distant, la fusion réussit quand même mais pulled est faux", (t) => {
  const work = repo(t);
  git(work, "remote", "remove", "origin");
  const r = prRun(t, ["merge", "12"], { views: [pr([ok()])] }, work);
  assert.equal(r.json.status, "merged");
  assert.equal(r.json.pulled, false);
});

test("merge : refuse quand la CI n'est pas verte, sans rien fusionner", (t) => {
  const work = repo(t);
  for (const checks of [[bad()], [running()]]) {
    const r = prRun(t, ["merge", "12"], { views: [pr(checks)] }, work);
    assert.equal(r.code, 1);
    assert.equal(r.json.status, "refused");
    assert.match(r.json.message, /CI/);
    assert.ok(!r.calls.some((c) => c.startsWith("pr merge")));
  }
  assert.equal(git(work, "branch", "--show-current"), "feature/x", "on n'a pas changé de branche");
});

test("merge : un déploiement Vercel en erreur ne bloque pas la fusion", (t) => {
  const r = prRun(t, ["merge", "12"], { views: [pr([ok(), bad("Vercel")])] }, repo(t));
  assert.equal(r.json.status, "merged");
});

test("merge : refuse en cas de conflit", (t) => {
  const r = prRun(t, ["merge", "12"], { views: [pr([ok()], { mergeable: "CONFLICTING" })] }, repo(t));
  assert.equal(r.json.status, "refused");
  assert.match(r.json.message, /[Cc]onflit/);
});

test("merge : refuse une pull request qui n'est plus ouverte", (t) => {
  const r = prRun(t, ["merge", "12"], { views: [pr([ok()], { state: "CLOSED" })] }, repo(t));
  assert.equal(r.json.status, "refused");
  assert.match(r.json.message, /CLOSED/);
});

test("merge : refuse quand des fichiers suivis ont des changements non enregistrés, mais pas pour un fichier non suivi", (t) => {
  const work = repo(t);
  write(work, { "nouveau.txt": "pas suivi\n" });
  assert.equal(prRun(t, ["merge", "12", "--dry-run"], { views: [pr([ok()])] }, work).json.status, "dry_run");
  write(work, { "a.txt": "modifié\n" });
  const r = prRun(t, ["merge", "12"], { views: [pr([ok()])] }, work);
  assert.equal(r.json.status, "refused");
  assert.match(r.json.message, /pas enregistrés/);
  assert.ok(!r.calls.some((c) => c.startsWith("pr merge")));
});

test("merge --dry-run : vérifie tout, ne fait rien", (t) => {
  const work = repo(t);
  const r = prRun(t, ["merge", "12", "--dry-run"], { views: [pr([ok()])] }, work);
  assert.equal(r.code, 0);
  assert.equal(r.json.status, "dry_run");
  assert.equal(r.json.would_merge, "feature/x -> main");
  assert.ok(!r.calls.some((c) => c.startsWith("pr merge")));
  assert.equal(git(work, "branch", "--show-current"), "feature/x");
});

test("merge : si gh ne fusionne pas, rend error avec son message", (t) => {
  const r = prRun(t, ["merge", "12"], { views: [pr([ok()])], mergeFails: true }, repo(t));
  assert.equal(r.code, 1);
  assert.equal(r.json.status, "error");
  assert.match(r.json.message, /not mergeable/);
});

test("merge : gh injoignable → error", (t) => {
  const r = prRun(t, ["merge", "12"], { viewError: "gh: not logged in" }, repo(t));
  assert.equal(r.json.status, "error");
  assert.match(r.json.message, /not logged in/);
});

test("le faux gh est bien celui qui répond (le test ne touche jamais GitHub)", (t) => {
  const r = prRun(t, ["wait", "12"], { views: [pr([ok()])] });
  assert.deepEqual(r.calls, ["pr view 12 --json state,mergeable,baseRefName,headRefName,url,statusCheckRollup"]);
});
