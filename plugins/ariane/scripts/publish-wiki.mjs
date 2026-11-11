#!/usr/bin/env node
// Publie le wiki du projet (docs/wiki) dans le wiki GitHub du dépôt (<dépôt>.wiki.git).
// - La source de vérité reste docs/wiki : la publication est à sens unique et ne modifie jamais le projet.
// - Ne publie que du contenu validé : branche principale, rien d'en cours dans docs/wiki.
// - Sans effet (statut "unavailable") quand GitHub ne propose pas le wiki à ce compte (dépôt privé en offre gratuite).
// - Ne supprime jamais une page du wiki qu'elle n'a pas écrite elle-même (liste dans .ariane-wiki.json).
// Usage : node publish-wiki.mjs [--source docs/wiki] [--dry-run] [--allow-branch]
//   Variables de test : ARIANE_WIKI_URL (adresse ou chemin du dépôt de wiki), ARIANE_WIKI_SKIP_GITHUB=1,
//   ARIANE_WIKI_TEST_GITHUB (JSON simulant la réponse de GitHub : { private, has_wiki, owner_type, plan }).
// Résultat : une ligne JSON { status, ... } sur la sortie standard.
//   published | unchanged | unavailable | needs_first_page | wrong_branch | uncommitted | no_source | error
import { createHash } from 'node:crypto';
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, posix, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const flagValue = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const dryRun = args.includes('--dry-run');
const allowBranch = args.includes('--allow-branch');
const sourceDir = resolve(flagValue('--source') || 'docs/wiki');
const projectRoot = resolve('.');

let workDir = null; // dossier temporaire du clone du wiki, supprimé à la sortie
const done = (obj, code = 0) => {
  if (workDir) rmSync(workDir, { recursive: true, force: true });
  console.log(JSON.stringify(obj));
  process.exit(code);
};

const run = (cmd, cmdArgs, cwd) => spawnSync(cmd, cmdArgs, { cwd, encoding: 'utf8' });
const git = (cmdArgs, cwd = projectRoot) => run('git', cmdArgs, cwd);
const gh = (cmdArgs) => run('gh', cmdArgs, projectRoot);

// ---------- Le projet et son dépôt ----------
const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
};
const state = readJson(join(projectRoot, '.ariane', 'state.json')) || readJson(join(projectRoot, '.bharness', 'state.json'));
const defaultBranch = state?.repo?.default_branch || 'main';
let repoUrl = state?.repo?.url || git(['remote', 'get-url', 'origin']).stdout.trim();
const match = /github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(repoUrl || '');
if (!match && !process.env.ARIANE_WIKI_URL) done({ status: 'error', message: "Dépôt GitHub introuvable (state.repo.url ou remote origin)." }, 1);
const [owner, repo] = match ? [match[1], match[2]] : ['test', 'test'];
const wikiGitUrl = process.env.ARIANE_WIKI_URL || `https://github.com/${owner}/${repo}.wiki.git`;
const wikiWebUrl = `https://github.com/${owner}/${repo}/wiki`;

if (!existsSync(join(sourceDir, 'index.md'))) done({ status: 'no_source', message: 'docs/wiki/index.md est absent.' });

// ---------- Garde-fous : on ne publie que du contenu validé ----------
if (!allowBranch) {
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
  if (branch !== defaultBranch) done({ status: 'wrong_branch', branch, expected: defaultBranch });
  const rel = relative(projectRoot, sourceDir) || '.';
  if (git(['status', '--porcelain', '--', rel]).stdout.trim()) done({ status: 'uncommitted', path: rel });
}
const headSha = git(['rev-parse', '--short', 'HEAD']).stdout.trim() || 'inconnu';

// ---------- Le wiki est-il disponible pour ce compte ? ----------
let ghInfo = null;
let planName = '';
if (process.env.ARIANE_WIKI_TEST_GITHUB) {
  ghInfo = JSON.parse(process.env.ARIANE_WIKI_TEST_GITHUB);
  planName = String(ghInfo.plan || '').toLowerCase();
} else if (!process.env.ARIANE_WIKI_SKIP_GITHUB && match) {
  const r = gh(['api', `repos/${owner}/${repo}`, '--jq', '{private: .private, has_wiki: .has_wiki, owner_type: .owner.type}']);
  if (r.status === 0) {
    try { ghInfo = JSON.parse(r.stdout); } catch { ghInfo = null; }
  }
  if (ghInfo?.private) {
    const planCmd = ghInfo.owner_type === 'Organization' ? ['api', `orgs/${owner}`, '--jq', '.plan.name'] : ['api', 'user', '--jq', '.plan.name'];
    const plan = gh(planCmd);
    planName = plan.status === 0 ? plan.stdout.trim().toLowerCase() : '';
  }
}
// Dépôt privé en offre gratuite : GitHub ne propose pas le wiki. On ne change rien, on ne demande rien.
if (ghInfo?.private && planName === 'free') done({ status: 'unavailable', reason: 'private_free_plan' });
if (ghInfo && ghInfo.has_wiki === false && !dryRun) {
  gh(['repo', 'edit', `${owner}/${repo}`, '--enable-wiki']);
}

// ---------- Lecture de la source ----------
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    return e.name.endsWith('.md') && !e.name.startsWith('_') ? [full] : [];
  });
const sources = walk(sourceDir).map((full) => posix.normalize(relative(sourceDir, full).split(sep).join('/')));

const TITLES = {
  donnees: 'Données', ecarts: 'Écarts', fonctionnalites: 'Fonctionnalités', 'guide-utilisateur': 'Guide-utilisateur',
};
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const segmentName = (seg) => TITLES[seg] || cap(seg);

const pageOf = new Map(); // chemin source (posix) -> nom de page
const used = new Set(['Home', '_Sidebar', '_Footer']);
const uniquePage = (name) => {
  let n = name;
  for (let i = 2; used.has(n); i++) n = `${name}-${i}`;
  used.add(n);
  return n;
};
for (const rel of sources) {
  if (rel === 'index.md') { pageOf.set(rel, 'Home'); continue; }
  const parts = rel.replace(/\.md$/, '').split('/');
  pageOf.set(rel, uniquePage(parts.map(segmentName).join('-')));
}
// Une page d'accueil par dossier (ex. la liste des fonctionnalités).
const dirPages = new Map(); // dossier (posix) -> nom de page
for (const rel of sources) {
  const d = posix.dirname(rel);
  if (d !== '.' && !dirPages.has(d)) dirPages.set(d, uniquePage(d.split('/').map(segmentName).join('-')));
}

const h1Of = (text, fallback) => /^#\s+(.+)$/m.exec(text)?.[1].trim() || fallback;

// ---------- Réécriture des liens et des images ----------
const out = new Map(); // fichier du wiki -> contenu (texte ou Buffer)
const imageOf = new Map();
const inProject = (abs) => abs === projectRoot || abs.startsWith(projectRoot + sep);
const blobUrl = (relFromRoot) => `https://github.com/${owner}/${repo}/blob/${defaultBranch}/${relFromRoot}`;

const rewrite = (text, relSource) => {
  let inFence = false;
  const baseDir = posix.dirname(relSource);
  return text
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; return line; }
      if (inFence) return line;
      return line.replace(/(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (all, bang, label, target) => {
        if (/^([a-z][a-z0-9+.-]*:|#)/i.test(target)) return all;
        const clean = target.split('#')[0].split('?')[0];
        if (!clean) return all;
        const inSource = posix.normalize(posix.join(baseDir, clean));
        const dirKey = inSource.replace(/\/$/, '');
        if (pageOf.has(inSource)) return `[[${label.replace(/\|/g, '/')}|${pageOf.get(inSource)}]]`;
        if (dirPages.has(dirKey)) return `[[${label.replace(/\|/g, '/')}|${dirPages.get(dirKey)}]]`;
        const abs = resolve(sourceDir, ...inSource.split('/'));
        if (!inProject(abs) || !existsSync(abs) || !statSync(abs).isFile()) return all;
        if (bang && /\.(png|jpe?g|gif|svg|webp)$/i.test(abs)) {
          if (!imageOf.has(abs)) {
            const hash = createHash('sha1').update(relative(projectRoot, abs)).digest('hex').slice(0, 6);
            const name = `images/${basename(abs, extname(abs))}-${hash}${extname(abs)}`;
            imageOf.set(abs, name);
            out.set(name, readFileSync(abs));
          }
          return `![${label}](${imageOf.get(abs)})`;
        }
        // Fichier du projet hors du wiki : lien vers le dépôt.
        return `${bang}[${label}](${blobUrl(relative(projectRoot, abs).split(sep).join('/'))})`;
      });
    })
    .join('\n');
};

for (const rel of sources) {
  const text = readFileSync(join(sourceDir, ...rel.split('/')), 'utf8');
  out.set(`${pageOf.get(rel)}.md`, rewrite(text, rel));
}

const title = (page) => {
  const rel = [...pageOf].find(([, p]) => p === page)?.[0];
  if (!rel) return page.replace(/-/g, ' ');
  return h1Of(readFileSync(join(sourceDir, ...rel.split('/')), 'utf8'), page.replace(/-/g, ' '));
};
for (const [dir, page] of dirPages) {
  const items = sources.filter((s) => posix.dirname(s) === dir).sort();
  const lines = items.map((s) => `- [[${title(pageOf.get(s)).replace(/\|/g, '/')}|${pageOf.get(s)}]]`);
  out.set(`${page}.md`, `# ${dir.split('/').map(segmentName).join(' · ')}\n\n${lines.join('\n')}\n`);
}

// ---------- Barre latérale et pied de page ----------
const ORDER = ['Home', 'Parcours', 'Données', 'Architecture', 'Guide-utilisateur', 'Exploitation', 'Écarts', 'Historique'];
const side = ['**[[Accueil|Home]]**', ''];
const listed = new Set(['Home']);
for (const [dir, page] of dirPages) {
  side.push(`- [[${segmentName(dir.split('/')[0])}|${page}]]`);
  for (const s of sources.filter((x) => posix.dirname(x) === dir).sort()) {
    side.push(`  - [[${title(pageOf.get(s)).replace(/\|/g, '/')}|${pageOf.get(s)}]]`);
    listed.add(pageOf.get(s));
  }
  listed.add(page);
}
const allPages = [...pageOf.values()];
for (const p of ORDER.slice(1)) if (allPages.includes(p)) { side.push(`- [[${title(p).replace(/\|/g, '/')}|${p}]]`); listed.add(p); }
for (const p of [...allPages].sort()) if (!listed.has(p)) { side.push(`- [[${title(p).replace(/\|/g, '/')}|${p}]]`); listed.add(p); }
out.set('_Sidebar.md', side.join('\n') + '\n');
out.set('_Footer.md', "Cette documentation est publiée automatiquement par Ariane à partir du dossier `docs/wiki` du dépôt. Pour la modifier, change les fichiers du dépôt : les changements faits directement ici seront écrasés.\n");

const pageCount = () => [...out.keys()].filter((k) => k.endsWith('.md') && !k.startsWith('_')).length;

if (dryRun) done({ status: 'dry_run', pages: pageCount(), files: [...out.keys()].sort() });

// ---------- Récupération du wiki, mise à jour, envoi ----------
workDir = mkdtempSync(join(tmpdir(), 'ariane-wiki-'));
const clone = join(workDir, 'wiki');
{
  const cl = run('git', ['clone', '--quiet', wikiGitUrl, clone], workDir);
  if (cl.status !== 0) {
    // Dépôt privé dont on ne connaît pas l'offre : on ne sait pas si le wiki est possible, donc on ne dérange personne.
    if (ghInfo?.private && !planName) done({ status: 'unavailable', reason: 'private_unknown_plan' });
    // Le dépôt du wiki n'existe qu'après la création de la première page sur le site de GitHub.
    done({ status: 'needs_first_page', url: wikiWebUrl, private: ghInfo?.private ?? null });
  }

  const manifestPath = join(clone, '.ariane-wiki.json');
  // Ancien nom du fichier (avant le renommage) : on le reprend pour ne pas laisser de pages orphelines.
  const legacyManifestPath = join(clone, '.bharness-wiki.json');
  const previous = (readJson(manifestPath) || readJson(legacyManifestPath))?.managed || [];
  rmSync(legacyManifestPath, { force: true });
  const keep = new Set(out.keys());
  for (const old of previous) {
    if (!keep.has(old)) rmSync(join(clone, ...old.split('/')), { force: true });
  }
  for (const [file, content] of out) {
    const dest = join(clone, ...file.split('/'));
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, content);
  }
  writeFileSync(manifestPath, JSON.stringify({ managed: [...keep].sort() }, null, 2) + '\n');

  git(['add', '-A'], clone);
  if (!git(['status', '--porcelain'], clone).stdout.trim()) {
    done({ status: 'unchanged', url: wikiWebUrl, pages: pageCount() });
  }
  const commit = git(['commit', '--quiet', '-m', `docs(wiki): sync from project (${headSha})`], clone);
  if (commit.status !== 0) done({ status: 'error', message: `Commit impossible : ${commit.stderr.trim() || commit.stdout.trim()}` }, 1);

  let push = git(['push', '--quiet', 'origin', 'HEAD'], clone);
  if (push.status !== 0) {
    // Quelqu'un a modifié le wiki directement : on fusionne en gardant nos pages, sans réécrire l'historique.
    git(['pull', '--quiet', '--no-rebase', '--no-edit', '-X', 'ours'], clone);
    push = git(['push', '--quiet', 'origin', 'HEAD'], clone);
  }
  if (push.status !== 0) done({ status: 'error', message: `Envoi impossible : ${push.stderr.trim()}` }, 1);

  done({ status: 'published', url: wikiWebUrl, pages: pageCount(), project_commit: headSha });
}
