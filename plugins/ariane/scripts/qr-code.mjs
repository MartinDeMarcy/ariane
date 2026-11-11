#!/usr/bin/env node
// Fabrique un QR code à scanner avec l'appareil photo d'un téléphone (lien de test ou de production).
// Usage : node qr-code.mjs <url> [--title "Texte"] [--out fichier.html] [--ascii]
//   --out    écrit une page HTML autonome (QR code, lien cliquable, consignes) ; défaut : .ariane/qr/qr.html
//   --ascii  affiche en plus le QR code dans le terminal (secours quand on ne peut pas ouvrir la page)
// Aucune dépendance à installer ni requête réseau : la bibliothèque est incluse (scripts/vendor).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import qrcode from './vendor/qrcode-generator.mjs';

const args = process.argv.slice(2);
const flagValue = (name) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : undefined;
};
const valueFlags = new Set(['--title', '--out']);
const url = args.find((a, i) => !a.startsWith('--') && !valueFlags.has(args[i - 1]));
const title = flagValue('--title') || 'Teste ton application sur ton téléphone';
const out = resolve(flagValue('--out') || '.ariane/qr/qr.html');
const wantAscii = args.includes('--ascii');

if (!url) {
  console.error('Usage : node qr-code.mjs <url> [--title "Texte"] [--out fichier.html] [--ascii]');
  process.exit(2);
}

let parsed;
try {
  parsed = new URL(url);
} catch {
  console.error(`Adresse invalide : ${url}`);
  process.exit(1);
}
if (!['https:', 'http:'].includes(parsed.protocol)) {
  console.error('Seules les adresses http et https sont acceptées.');
  process.exit(1);
}

const qr = qrcode(0, 'M');
qr.addData(parsed.href);
qr.make();
const n = qr.getModuleCount();
const QUIET = 4; // marge blanche obligatoire autour du code

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// SVG : un seul tracé pour tous les modules sombres.
let path = '';
for (let r = 0; r < n; r++) {
  for (let c = 0; c < n; c++) {
    if (qr.isDark(r, c)) path += `M${c + QUIET},${r + QUIET}h1v1h-1z`;
  }
}
const size = n + QUIET * 2;
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="QR code vers ${escapeHtml(parsed.href)}" shape-rendering="crispEdges">` +
  `<rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>QR code · ${escapeHtml(parsed.hostname)}</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f1f5f9; color: #0f172a; font: 16px/1.5 system-ui, sans-serif; }
    main { box-sizing: border-box; width: min(92vw, 420px); margin: 24px; padding: 28px 24px; text-align: center; background: #fff; border-radius: 20px; box-shadow: 0 4px 24px rgba(15, 23, 42, .12); }
    h1 { margin: 0 0 16px; font-size: 1.25rem; }
    .qr { width: 100%; max-width: 320px; margin: 0 auto; }
    .qr svg { display: block; width: 100%; height: auto; }
    .steps { margin: 20px 0 0; padding: 0; list-style: none; color: #334155; }
    a { color: #1d4ed8; word-break: break-all; }
    details { margin-top: 16px; text-align: left; color: #475569; font-size: .9rem; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <div class="qr">${svg}</div>
    <ul class="steps">
      <li>Ouvre l'appareil photo de ton téléphone et vise le code.</li>
      <li>Touche le lien qui apparaît.</li>
    </ul>
    <p>Ou ouvre directement : <a href="${escapeHtml(parsed.href)}">${escapeHtml(parsed.href)}</a></p>
    <details>
      <summary>Installer l'application sur le téléphone</summary>
      <p><strong>iPhone</strong> (Safari) : bouton Partager, puis « Sur l'écran d'accueil ».<br>
      <strong>Android</strong> (Chrome) : menu ⋮, puis « Installer l'application ».</p>
    </details>
  </main>
</body>
</html>
`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`Page créée : ${out}`);
console.log(`Adresse : ${parsed.href}`);

if (wantAscii) {
  // Deux lignes de modules par ligne de texte, avec des demi-blocs.
  const dark = (r, c) => r >= 0 && c >= 0 && r < n && c < n && qr.isDark(r, c);
  const lines = [];
  for (let r = -QUIET; r < n + QUIET; r += 2) {
    let line = '';
    for (let c = -QUIET; c < n + QUIET; c++) {
      const top = dark(r, c);
      const bottom = dark(r + 1, c);
      line += top && bottom ? '█' : top ? '▀' : bottom ? '▄' : ' ';
    }
    lines.push(line);
  }
  console.log('\n' + lines.join('\n'));
}
