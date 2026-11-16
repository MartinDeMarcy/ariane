// Un faux `gh` pour tester pr.mjs sans réseau ni compte GitHub.
// Son état est un fichier JSON (FAKE_GH_STATE) :
//   views      : les réponses successives de `gh pr view` (la dernière est rendue ensuite sans fin)
//   mergeFails : si vrai, `gh pr merge` échoue et la pull request reste ouverte
//   viewError  : si renseigné, `gh pr view` échoue avec ce message
//   rawView    : si renseigné, `gh pr view` écrit ce texte tel quel (réponse illisible)
//   calls      : (écrit par le faux) la liste des commandes reçues
import { readFileSync, writeFileSync } from "node:fs";

const file = process.env.FAKE_GH_STATE;
const state = JSON.parse(readFileSync(file, "utf8"));
const args = process.argv.slice(2);
state.calls = [...(state.calls || []), args.join(" ")];

const save = () => writeFileSync(file, JSON.stringify(state));

if (args[0] === "pr" && args[1] === "view") {
  if (state.viewError) {
    save();
    process.stderr.write(state.viewError + "\n");
    process.exit(1);
  }
  if (state.rawView !== undefined) {
    save();
    process.stdout.write(state.rawView);
    process.exit(0);
  }
  const view = state.views.length > 1 ? state.views.shift() : state.views[0];
  save();
  process.stdout.write(JSON.stringify(view));
} else if (args[0] === "pr" && args[1] === "merge") {
  if (state.mergeFails) {
    save();
    process.stderr.write("GraphQL: Pull request is not mergeable\n");
    process.exit(1);
  }
  state.views = [{ ...state.views[0], state: "MERGED" }];
  save();
} else {
  save();
  process.stderr.write(`faux gh : commande inconnue ${args.join(" ")}\n`);
  process.exit(1);
}
