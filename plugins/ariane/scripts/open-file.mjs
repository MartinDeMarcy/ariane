#!/usr/bin/env node
// Ouvre un fichier avec l'application par défaut de l'ordinateur (navigateur pour une maquette HTML).
// Usage : node open-file.mjs <chemin> [--chrome] [--dry-run]
// --chrome : ouvre dans Google Chrome ; s'il est introuvable, on retombe sur le navigateur par défaut.
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const SAFE_EXTENSIONS = new Set(['.html', '.htm', '.pdf', '.png', '.jpg', '.jpeg', '.svg', '.md', '.txt']);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const wantChrome = args.includes('--chrome');
const target = args.find((a) => !a.startsWith('--'));

if (!target) {
  console.error('Usage : node open-file.mjs <chemin> [--chrome] [--dry-run]');
  process.exit(2);
}

const file = resolve(target);

if (!existsSync(file)) {
  console.error(`Fichier introuvable : ${file}`);
  process.exit(1);
}

// On n'ouvre que des documents : jamais un programme ou un script.
if (!SAFE_EXTENSIONS.has(extname(file).toLowerCase())) {
  console.error(`Type de fichier non pris en charge : ${extname(file) || '(sans extension)'}`);
  process.exit(1);
}

// Cherche Google Chrome aux emplacements habituels ; renvoie [programme, arguments] ou null.
const chromeCommand = () => {
  if (process.platform === 'win32') {
    const roots = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean);
    for (const root of roots) {
      const exe = join(root, 'Google', 'Chrome', 'Application', 'chrome.exe');
      if (existsSync(exe)) return [exe, [pathToFileURL(file).href]];
    }
    return null;
  }
  if (process.platform === 'darwin') {
    return existsSync('/Applications/Google Chrome.app') ? ['open', ['-a', 'Google Chrome', file]] : null;
  }
  return ['google-chrome', [pathToFileURL(file).href]];
};

const defaultCommand = () =>
  process.platform === 'win32'
    ? ['cmd', ['/c', 'start', '', file]]
    : process.platform === 'darwin'
      ? ['open', [file]]
      : ['xdg-open', [file]];

const chrome = wantChrome ? chromeCommand() : null;
if (wantChrome && !chrome) console.error("Chrome est introuvable : j'utilise le navigateur par défaut.");
const [command, commandArgs] = chrome || defaultCommand();

if (dryRun) {
  console.log(`${command} ${commandArgs.map((a) => JSON.stringify(a)).join(' ')}`);
  process.exit(0);
}

const child = spawn(command, commandArgs, { detached: true, stdio: 'ignore' });
child.on('error', (err) => {
  console.error(`Impossible d'ouvrir le fichier : ${err.message}`);
  process.exit(1);
});
child.unref();
console.log(`Ouvert : ${file}`);
