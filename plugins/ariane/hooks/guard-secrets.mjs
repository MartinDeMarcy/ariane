// Garde-fou anti-secrets d'Ariane : aucune clé dans un fichier versionné.
import { readInput, isArianeProject, block } from "./lib.mjs";

const input = readInput();
if (!isArianeProject(input)) process.exit(0);

const tool = input.tool_input ?? {};
const filePath = String(tool.file_path ?? "").replace(/\\/g, "/");

// Les fichiers locaux de secrets sont faits pour ça (et ne sont jamais versionnés).
if (/(^|\/)\.env(\.[^/]*)?\.local$/.test(filePath)) process.exit(0);

const texts = [tool.content, tool.new_string, ...(Array.isArray(tool.edits) ? tool.edits.map((e) => e.new_string) : [])]
  .filter((t) => typeof t === "string")
  .join("\n");

const patterns = [
  { re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, what: "un jeton JWT (clé Supabase ?)" },
  { re: /\bsb_secret_[A-Za-z0-9_-]{10,}/, what: "une clé secrète Supabase" },
  { re: /\b(sk_live|sk_test|rk_live)_[A-Za-z0-9]{10,}/, what: "une clé Stripe" },
  { re: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}/, what: "un jeton GitHub" },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, what: "une clé privée" },
  { re: /\bAKIA[0-9A-Z]{16}\b/, what: "une clé AWS" },
  { re: /SERVICE_ROLE[A-Z_]*\s*[=:]\s*["']?[A-Za-z0-9_.-]{20,}/, what: "la clé service_role de Supabase" },
];

for (const { re, what } of patterns) {
  if (re.test(texts)) {
    block(`le contenu écrit dans ${filePath || "ce fichier"} semble contenir ${what}. Les secrets vont dans .env.local (non versionné) ou dans les réglages Vercel ; dans le code, lis-les depuis process.env.`);
  }
}

process.exit(0);
