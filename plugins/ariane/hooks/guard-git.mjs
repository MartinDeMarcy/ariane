// Garde-fou Git d'Ariane : l'historique ne se réécrit jamais, aucun secret n'est commité.
import { execSync } from "node:child_process";
import { readInput, isArianeProject, block } from "./lib.mjs";

const input = readInput();
if (input.tool_name !== "Bash" || !isArianeProject(input)) process.exit(0);

const command = String(input.tool_input?.command ?? "");
const cwd = input.cwd || process.cwd();

// Découpe la commande en sous-commandes (&&, ||, ;, |, retours à la ligne).
const parts = command.split(/&&|\|\||;|\||\n/).map((p) => p.trim()).filter(Boolean);

const rules = [
  {
    test: (c) => /^git\s+push\b/.test(c) && /(\s--force(-with-lease)?\b|\s-f\b|\s\+\S+)/.test(c),
    why: "pas de push forcé : l'historique publié ne se réécrit pas. Crée un nouveau commit à la place.",
  },
  {
    test: (c) => /^git\s+push\b/.test(c) && /(\s--delete\b|\s-d\b|\s:\S+)/.test(c),
    why: "pas de suppression de branche ou d'étiquette par push. Les branches fusionnées sont supprimées par « gh pr merge --delete-branch ».",
  },
  {
    test: (c) => /^git\s+reset\b/.test(c) && /--hard\b/.test(c),
    why: "pas de « git reset --hard ». Pour annuler un changement publié, utilise « git revert ».",
  },
  {
    test: (c) => /^git\s+rebase\b/.test(c) && !/--(abort|quit)\b/.test(c),
    why: "pas de rebase : Ariane fusionne par commits de fusion pour garder l'historique complet.",
  },
  {
    test: (c) => /^git\s+(filter-branch|filter-repo)\b/.test(c),
    why: "pas de réécriture de l'historique.",
  },
  {
    test: (c) => /^git\s+tag\b/.test(c) && /\s(-d|--delete)\b/.test(c),
    why: "pas de suppression d'étiquette de version.",
  },
  {
    test: (c) => /^git\s+push\b/.test(c) && /\s(HEAD:)?(refs\/heads\/)?main\b/.test(c) && remoteMainExists(),
    why: "pas d'envoi direct sur main : passe par une branche et une pull request (gh pr create, puis gh pr merge --merge).",
  },
];

function remoteMainExists() {
  try {
    execSync("git rev-parse --verify --quiet refs/remotes/origin/main", { cwd, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

for (const part of parts) {
  for (const rule of rules) {
    if (rule.test(part)) block(`${part} → ${rule.why}`);
  }
}

// Avant un commit : aucun fichier .env (hors .env.example) ne doit être indexé.
if (parts.some((p) => /^git\s+commit\b/.test(p))) {
  let staged = "";
  try {
    staged = execSync("git diff --cached --name-only", { cwd, encoding: "utf8" });
  } catch {
    process.exit(0);
  }
  const leaked = staged
    .split(/\r?\n/)
    .filter((f) => /(^|\/)\.env(\..+)?$/.test(f) && !/\.env\.example$/.test(f));
  if (leaked.length) {
    block(`fichier(s) de secrets indexé(s) : ${leaked.join(", ")}. Retire-les (git restore --staged <fichier>) et vérifie le .gitignore.`);
  }
}

process.exit(0);
