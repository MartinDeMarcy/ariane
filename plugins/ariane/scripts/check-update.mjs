#!/usr/bin/env node
// Vérifie s'il existe une version plus récente d'Ariane sur GitHub.
// - Au plus une vérification réseau par jour ; en cas d'échec (hors ligne), silence total.
// - Ne signale une mise à jour (notify: true) qu'une fois par jour : « plus tard » est donc respecté.
// - Seule requête réseau : lecture publique du plugin.json de la branche main. Rien n'est envoyé.
// Usage : node check-update.mjs [--force]
// Variables de test : ARIANE_HOME (dossier du cache), ARIANE_CURRENT_VERSION (version installée simulée), ARIANE_MANIFEST_URL.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MANIFEST_URL =
  process.env.ARIANE_MANIFEST_URL ||
  'https://raw.githubusercontent.com/MartinDeMarcy/ariane/main/plugins/ariane/.claude-plugin/plugin.json';
const DAY_MS = 24 * 60 * 60 * 1000;

const force = process.argv.includes('--force');
const here = dirname(fileURLToPath(import.meta.url));
const cacheFile = join(process.env.ARIANE_HOME || join(homedir(), '.ariane'), 'update-check.json');

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
};

const isNewer = (a, b) => {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
};

const current =
  process.env.ARIANE_CURRENT_VERSION ||
  readJson(join(here, '..', '.claude-plugin', 'plugin.json'))?.version;

if (!current) {
  console.log(JSON.stringify({ current: null, latest: null, updateAvailable: false, notify: false }));
  process.exit(0);
}

const cache = (existsSync(cacheFile) && readJson(cacheFile)) || {};
const now = Date.now();
let { latest, checkedAt = 0, notifiedAt = 0 } = cache;

if (force || !latest || now - checkedAt > DAY_MS) {
  try {
    const res = await fetch(MANIFEST_URL, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const manifest = await res.json();
      if (typeof manifest.version === 'string') {
        latest = manifest.version;
        checkedAt = now;
      }
    }
  } catch {
    // hors ligne ou GitHub injoignable : on réessaiera plus tard, sans bruit
  }
}

const updateAvailable = Boolean(latest) && isNewer(latest, current);
const notify = updateAvailable && (force || now - notifiedAt > DAY_MS);
if (notify) notifiedAt = now;

try {
  mkdirSync(dirname(cacheFile), { recursive: true });
  writeFileSync(cacheFile, JSON.stringify({ latest, checkedAt, notifiedAt }));
} catch {
  // cache non inscriptible : sans conséquence
}

console.log(JSON.stringify({ current, latest: latest ?? null, updateAvailable, notify }));
