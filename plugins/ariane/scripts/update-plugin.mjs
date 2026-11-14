#!/usr/bin/env node
// Met Ariane à jour : rafraîchit la marketplace puis met à jour le plugin.
// Retrouve le programme `claude` même quand il n'est pas dans le PATH (application de bureau Claude sous Windows,
// dont le dossier d'installation a changé d'une version à l'autre).
// Une fois terminé, il faut fermer la session et en rouvrir une pour charger la nouvelle version.
// Usage : node update-plugin.mjs [--dry-run]
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const dryRun = process.argv.includes('--dry-run');
const isWindows = process.platform === 'win32';

// Retrouve `claude` dans le PATH (sans passer par un shell, pour ne pas avoir d'arguments à échapper).
const findOnPath = () => {
  const r = spawnSync(isWindows ? 'where' : 'which', ['claude'], { encoding: 'utf8' });
  if (r.status !== 0) return null;
  const lines = r.stdout.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
  if (!isWindows) return lines[0] || null;
  // Sous Windows, `where` liste aussi le script sans extension que npm installe pour les shells Unix
  // (`…\npm\claude`) : Windows ne sait pas le lancer (ENOENT, code null). On ne garde que ce qu'il sait lancer.
  const exe = lines.find((l) => /\.exe$/i.test(l));
  if (exe) return exe;
  const shim = lines.find((l) => /\.(cmd|bat)$/i.test(l));
  if (!shim) return null;
  // Le .cmd de npm ne fait que lancer le vrai programme, rangé à côté : on le vise directement.
  const real = join(dirname(shim), 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe');
  return existsSync(real) ? real : shim;
};

// Dans l'application de bureau sous Windows, le programme se trouve dans un dossier `claude-code\<version>\<hash>\claude.exe`
// dont l'emplacement a changé selon les versions de l'application : on regarde tous les endroits connus
// et on garde la version la plus récente.
const desktopBases = () => {
  const bases = [];
  const { APPDATA, LOCALAPPDATA } = process.env;
  if (APPDATA) bases.push(join(APPDATA, 'Claude', 'claude-code'));
  if (LOCALAPPDATA) {
    // %LOCALAPPDATA%\Claude-Data\<identifiant>\claude-code
    const data = join(LOCALAPPDATA, 'Claude-Data');
    if (existsSync(data)) {
      for (const d of readdirSync(data)) bases.push(join(data, d, 'claude-code'));
    }
    // Application installée depuis le Microsoft Store : %LOCALAPPDATA%\Packages\Claude_*\LocalCache\Roaming\Claude\claude-code
    const packages = join(LOCALAPPDATA, 'Packages');
    if (existsSync(packages)) {
      for (const d of readdirSync(packages)) {
        if (d.startsWith('Claude_')) bases.push(join(packages, d, 'LocalCache', 'Roaming', 'Claude', 'claude-code'));
      }
    }
  }
  return bases.filter((b) => existsSync(b));
};

const findDesktopBinary = () => {
  const versionKey = (v) => v.split('.').map((n) => String(Number(n) || 0).padStart(6, '0')).join('.');
  const found = [];
  for (const base of desktopBases()) {
    for (const version of readdirSync(base)) {
      const dir = join(base, version);
      let hashes = [];
      try {
        hashes = readdirSync(dir);
      } catch {
        continue;
      }
      for (const hash of hashes) {
        const exe = join(dir, hash, 'claude.exe');
        if (existsSync(exe)) found.push({ key: versionKey(version), exe });
      }
    }
  }
  found.sort((x, y) => y.key.localeCompare(x.key));
  return found[0]?.exe ?? null;
};

const claude = findOnPath() || findDesktopBinary();

if (!claude) {
  console.error("Impossible de retrouver le programme `claude` sur cet ordinateur.");
  process.exit(3);
}

const needsCmd = isWindows && /\.(cmd|bat)$/i.test(claude);
console.log(`Programme utilisé : ${claude}`);

const steps = [
  ['plugin', 'marketplace', 'update', 'ariane'],
  ['plugin', 'update', 'ariane@ariane'],
];

for (const args of steps) {
  console.log(`> claude ${args.join(' ')}`);
  if (dryRun) continue;
  const r = needsCmd
    ? spawnSync('cmd', ['/c', claude, ...args], { stdio: 'inherit' })
    : spawnSync(claude, args, { stdio: 'inherit' });
  if (r.status !== 0) {
    // Code null : le programme n'a pas pu démarrer (r.error dit pourquoi), ce n'est pas la commande qui a échoué.
    const why = r.error ? ` : ${r.error.code || r.error.message}` : '';
    console.error(`Échec de « claude ${args.join(' ')} » (code ${r.status}${why}).`);
    process.exit(r.status || 1);
  }
}

console.log(dryRun ? 'Simulation terminée (rien n\'a été modifié).' : 'Mise à jour terminée : ferme cette session et rouvres-en une.');
