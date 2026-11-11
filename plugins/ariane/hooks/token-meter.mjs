// Compteur de tokens d'Ariane : à la fin de chaque agent (SubagentStop) et de
// chaque tour de la conversation (Stop), il lit ce que la session a consommé
// et l'ajoute au dossier de retours d'expérience du projet.
//
// - Ne coûte aucun token : il tourne hors de la conversation.
// - N'écrit que dans un projet mené avec Ariane, et seulement si l'utilisateur
//   a accepté le journal de retours d'expérience (state.feedback.enabled).
// - Écrit .ariane/feedback/tokens.jsonl (une ligne par mesure) et régénère
//   .ariane/feedback/tokens.md (le tableau lisible). Rien n'est envoyé.
// - Ne bloque jamais : toute erreur est ignorée, le code de sortie est 0.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const FIELDS = ["input", "cache_write", "cache_read", "output"];

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
};

// Additionne l'usage d'un fichier de conversation. Une réponse y occupe
// plusieurs lignes avec le même usage : on ne la compte qu'une fois.
export function sumTranscript(path, { skipSidechain = false } = {}) {
  const total = { input: 0, cache_write: 0, cache_read: 0, output: 0, messages: 0 };
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return total;
  }
  const seen = new Map();
  for (const line of text.split("\n")) {
    if (!line.includes('"usage"')) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const usage = entry?.message?.usage;
    if (entry?.type !== "assistant" || !usage) continue;
    if (skipSidechain && entry.isSidechain) continue;
    seen.set(entry.message.id || entry.uuid, usage);
  }
  for (const usage of seen.values()) {
    total.input += usage.input_tokens || 0;
    total.cache_write += usage.cache_creation_input_tokens || 0;
    total.cache_read += usage.cache_read_input_tokens || 0;
    total.output += usage.output_tokens || 0;
    total.messages += 1;
  }
  return total;
}

const sumOf = (t) => t.input + t.cache_write + t.cache_read + t.output;
const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

// Le tableau lisible, régénéré à chaque mesure.
export function report(rows) {
  const group = (keyOf) => {
    const map = new Map();
    for (const row of rows) {
      const key = keyOf(row);
      if (key === null) continue;
      const g = map.get(key) || { count: 0, input: 0, cache_write: 0, cache_read: 0, output: 0 };
      g.count += 1;
      for (const f of FIELDS) g[f] += row[f] || 0;
      map.set(key, g);
    }
    return [...map.entries()].sort((a, b) => sumOf(b[1]) - sumOf(a[1]));
  };
  const table = (title, first, entries) => {
    if (entries.length === 0) return "";
    const lines = [
      `## ${title}`,
      "",
      `| ${first} | Mesures | Entrée | Cache écrit | Cache relu | Sortie | Total | Hors cache relu |`,
      "|---|---:|---:|---:|---:|---:|---:|---:|",
    ];
    for (const [key, g] of entries) {
      lines.push(
        `| ${key} | ${g.count} | ${fmt(g.input)} | ${fmt(g.cache_write)} | ${fmt(g.cache_read)} | ${fmt(g.output)} | ${fmt(sumOf(g))} | ${fmt(g.input + g.cache_write + g.output)} |`,
      );
    }
    return lines.join("\n") + "\n";
  };
  const all = group(() => "Tout le projet");
  const parts = [
    "# Consommation de tokens",
    "",
    "Mesurée automatiquement à la fin de chaque agent et de chaque tour de conversation. Ce fichier reste sur l'ordinateur et n'est pas versionné. « Cache relu » compte les tokens relus depuis le cache (bien moins chers) ; « Hors cache relu » est le total sans eux.",
    "",
    table("En tout", "Périmètre", all),
    table("Par phase", "Phase", group((r) => r.phase || "inconnue")),
    table("Par agent", "Agent", group((r) => r.agent || "inconnu")),
    table("Par lot", "Lot", group((r) => (r.lot ? `Lot ${r.lot}` : null))),
    table("Par story", "Story", group((r) => (r.story ? `Story ${r.story}` : null))),
    table(
      "Par étape (phase, story, agent)",
      "Étape",
      group((r) => [r.phase || "inconnue", r.story ? `story ${r.story}` : r.lot ? `lot ${r.lot}` : null, r.agent].filter(Boolean).join(" · ")),
    ),
  ];
  return parts.filter((p) => p !== "").join("\n");
}

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return;
  }
  const dir = input.cwd || process.cwd();
  const state = readJson(join(dir, ".ariane", "state.json"));
  if (!state || state.feedback?.enabled !== true) return;

  const isAgent = input.hook_event_name === "SubagentStop";
  const path = isAgent ? input.agent_transcript_path : input.transcript_path;
  if (!path || !existsSync(path)) return;

  const folder = join(dir, ".ariane", "feedback");
  mkdirSync(folder, { recursive: true });
  const memoPath = join(folder, "tokens-state.json");
  const memo = readJson(memoPath) || {};

  // On n'enregistre que ce qui s'est ajouté depuis la dernière mesure du même
  // agent ou de la même session.
  const key = isAgent ? `agent:${input.agent_id || path}` : `session:${input.session_id || path}`;
  const now = sumTranscript(path, { skipSidechain: !isAgent });
  const before = memo[key] || { input: 0, cache_write: 0, cache_read: 0, output: 0, messages: 0 };
  const delta = {};
  for (const f of [...FIELDS, "messages"]) delta[f] = Math.max(0, now[f] - (before[f] || 0));
  if (sumOf(delta) === 0) return;
  memo[key] = now;
  writeFileSync(memoPath, JSON.stringify(memo));

  const row = {
    at: new Date().toISOString(),
    event: isAgent ? "agent" : "tour",
    agent: isAgent ? String(input.agent_type || "agent").replace(/^ariane:/, "") : "ariane (conversation)",
    phase: state.phase || null,
    lot: state.current_lot || null,
    story: state.current_story || null,
    ...delta,
    total: sumOf(delta),
  };
  const logPath = join(folder, "tokens.jsonl");
  appendFileSync(logPath, JSON.stringify(row) + "\n");

  const rows = readFileSync(logPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  writeFileSync(join(folder, "tokens.md"), report(rows));
}

try {
  main();
} catch {
  // Un compteur ne doit jamais gêner le travail.
}
process.exit(0);
