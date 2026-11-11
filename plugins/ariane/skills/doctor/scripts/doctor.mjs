#!/usr/bin/env node
// Ariane doctor : vérifie les outils et la configuration du projet.
// Sans dépendance, compatible Windows, macOS et Linux.

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const platform = process.platform; // "win32" | "darwin" | "linux"
const cwd = process.cwd();
const results = [];

function run(cmd) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function add(status, label, detail = "", fix = "") {
  results.push({ status, label, detail, fix });
}

function installHint(tool) {
  const hints = {
    node: {
      win32: "PowerShell : winget install OpenJS.NodeJS.LTS (ou l'installateur sur https://nodejs.org)",
      darwin: "brew install node (ou l'installateur sur https://nodejs.org)",
      linux: "https://nodejs.org/fr/download (ou le gestionnaire de paquets de ta distribution)",
    },
    git: {
      win32: "PowerShell : winget install Git.Git (ou https://git-scm.com/download/win)",
      darwin: "xcode-select --install (ou brew install git)",
      linux: "sudo apt install git (ou l'équivalent de ta distribution)",
    },
    gh: {
      win32: "PowerShell : winget install GitHub.cli",
      darwin: "brew install gh",
      linux: "https://github.com/cli/cli#installation",
    },
  };
  return hints[tool][platform] ?? hints[tool].linux;
}

// 1. Node.js
const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor >= 20) {
  add("OK", "Node.js", `version ${process.versions.node}`);
} else {
  add("MANQUANT", "Node.js", `version ${process.versions.node}, il faut la version 20 ou plus`, installHint("node"));
}

// 2. npm
const npmVersion = run("npm --version");
npmVersion
  ? add("OK", "npm", `version ${npmVersion}`)
  : add("MANQUANT", "npm", "introuvable", "npm est installé avec Node.js : réinstalle Node.js LTS. " + installHint("node"));

// 3. Git
const gitVersion = run("git --version");
if (gitVersion) {
  add("OK", "Git", gitVersion.replace("git version ", "version "));
  const gitName = run("git config --global user.name");
  const gitEmail = run("git config --global user.email");
  gitName && gitEmail
    ? add("OK", "Identité Git", `${gitName} <${gitEmail}>`)
    : add(
        "ATTENTION",
        "Identité Git",
        "nom ou e-mail non configuré",
        'git config --global user.name "Ton Nom" puis git config --global user.email "ton@email"'
      );
} else {
  add("MANQUANT", "Git", "introuvable", installHint("git"));
}

// 4. GitHub CLI
const ghVersion = run("gh --version");
if (ghVersion) {
  add("OK", "GitHub CLI", ghVersion.split("\n")[0].replace("gh version ", "version "));
  const ghAuth = run("gh auth status");
  ghAuth !== null
    ? add("OK", "Connexion GitHub", "connecté")
    : add("MANQUANT", "Connexion GitHub", "non connecté", "gh auth login (choisis GitHub.com, HTTPS, et la connexion par navigateur)");
} else {
  add("MANQUANT", "GitHub CLI", "introuvable : Clio en a besoin pour gérer le dépôt", installHint("gh"));
}

// 5. Projet Ariane (si on est dans un projet)
const statePath = join(cwd, ".ariane", "state.json");
if (existsSync(statePath)) {
  try {
    const state = JSON.parse(readFileSync(statePath, "utf8"));
    add("OK", "Projet Ariane", `${state.project?.name || "sans nom"}, phase « ${state.phase} »`);
  } catch {
    add("ATTENTION", "Projet Ariane", ".ariane/state.json n'est pas un JSON valide", "Demande à Ariane de le réparer.");
  }

  const gitignorePath = join(cwd, ".gitignore");
  const gitignore = existsSync(gitignorePath) ? readFileSync(gitignorePath, "utf8") : "";
  /(^|\n)\.env\*?(\n|$)|(^|\n)\.env\.local/.test(gitignore)
    ? add("OK", "Secrets protégés", ".env.local est ignoré par Git")
    : add("ATTENTION", "Secrets protégés", ".env.local n'est pas dans .gitignore", "Ajoute la ligne .env*.local et !.env.example au .gitignore.");

  if (existsSync(join(cwd, "package.json"))) {
    existsSync(join(cwd, ".env.local"))
      ? add("OK", "Variables locales", ".env.local présent")
      : add("ATTENTION", "Variables locales", ".env.local absent", "Neil t'expliquera quelles clés du Supabase de test y copier.");
    existsSync(join(cwd, "node_modules"))
      ? add("OK", "Dépendances", "installées")
      : add("ATTENTION", "Dépendances", "non installées", "npm install");
  }
} else {
  add("INFO", "Projet Ariane", "aucun projet dans ce dossier (normal avant /ariane:start)");
}

// Affichage
const width = Math.max(...results.map((r) => r.label.length));
console.log(`Ariane doctor · ${platform} · ${cwd}\n`);
for (const r of results) {
  console.log(`${r.status.padEnd(9)} ${r.label.padEnd(width)}  ${r.detail}`);
  if (r.fix) console.log(`${" ".repeat(9)} ${" ".repeat(width)}  → ${r.fix}`);
}
const missing = results.filter((r) => r.status === "MANQUANT").length;
const warnings = results.filter((r) => r.status === "ATTENTION").length;
console.log(`\n${missing} manquant(s), ${warnings} point(s) d'attention.`);
process.exitCode = missing > 0 ? 1 : 0;
