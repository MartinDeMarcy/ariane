// Outils communs aux garde-fous d'Ariane. Sans dépendance, compatible Windows.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export function readInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return {};
  }
}

// Les garde-fous ne s'appliquent qu'aux projets menés avec Ariane.
export function isArianeProject(input) {
  const dir = input.cwd || process.cwd();
  // « .bharness » : projets créés avant le renommage, tant qu'Ariane ne les a pas migrés.
  return existsSync(join(dir, ".ariane", "state.json")) || existsSync(join(dir, ".bharness", "state.json"));
}

// Bloque l'action : le message est renvoyé à Claude (code de sortie 2).
export function block(message) {
  process.stderr.write(`Ariane · action bloquée : ${message}\n`);
  process.exit(2);
}
