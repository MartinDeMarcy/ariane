# Après le MVP : le cycle des versions

Une fois la première version en ligne (`phase` = `done`), le projet continue par **versions**. Une version réunit un ou plusieurs lots, a un numéro (`x.y.z`) et un seul objectif. Ce document décrit le cycle ; il n'est lu que lorsqu'une version se prépare ou est en cours (`state.cycle`).

## Trois sortes de version

| Type | Numéro | Contient | Exemple |
|---|---|---|---|
| **Correctif** (patch) | `x.y.Z` | Seulement des corrections : bugs, sécurité. Aucune fonctionnalité nouvelle, aucun changement visible du parcours | `0.1.0` → `0.1.1` |
| **Évolution** (mineure) | `x.Y.0` | Des fonctionnalités nouvelles ou améliorées, sans rien casser : les données et les habitudes des utilisateurs restent valables | `0.1.1` → `0.2.0` |
| **Refonte** (majeure) | `X.0.0` | Un changement qui casse quelque chose pour les utilisateurs ou pour les données : parcours refondu, fonctionnalité retirée, données transformées sans retour possible | `0.4.0` → `1.0.0` |

Règles de numérotation :

- C'est **Ariane qui propose le type**, d'après ce que la version contient, et **l'utilisateur qui confirme**. En mots simples : « petite réparation », « nouveautés », « grand changement ».
- Le type se déduit du contenu, jamais l'inverse : une seule fonctionnalité nouvelle fait d'un correctif une évolution ; un seul changement cassant en fait une refonte.
- La `1.0.0` n'est pas une refonte comme les autres : c'est le moment où l'utilisateur déclare son application prête pour son vrai public. Ariane le propose quand le projet est stable ; elle ne le décide pas.
- Un numéro publié ne se réutilise jamais et ne se modifie jamais.

## D'où vient le contenu d'une version

Trois sources, et seulement trois. Rien n'entre dans une version sans passer par l'une d'elles.

1. **La boîte à idées** (`.ariane/ideas.md`) : ce que l'utilisateur a noté pour plus tard, ce que Maxime a reporté.
2. **Les suggestions de Léonard** : le spécialiste qui regarde l'application telle qu'elle est et propose des évolutions (voir `agents/leonard.md`).
3. **Le registre des correctifs** (`.ariane/issues.md`, modèle `templates/issues.md`) : les bugs signalés (`/ariane:bug`, ou dits dans la conversation), les remarques non bloquantes de Thomas, les failles et les risques acceptés « pour l'instant » relevés par la grande passe de tests.

## Les étapes d'une évolution ou d'une refonte

| # | Phase | Qui | Produit | Validation |
|---|---|---|---|---|
| 1 | `ideation` | Ariane, avec Léonard | La liste courte de la version, son objectif, son type | l'utilisateur choisit |
| 2 | `prd` | Maxime, relu par Cassandre | Une section « Version x.y.z » dans `docs/02-prd.md` | **Validation 1** de la version |
| 3 | `ux` | Iris | Les écrans nouveaux ou modifiés seulement | **Validation 2**, si des écrans changent |
| 4 | `architecture` | Gustave | `docs/04-architecture.md` mis à jour sur place, plus une courte section « Version x.y.z » (changements, plan de passage, ordre de construction) | — |
| 5 | `planning` | Poucet | Les lots et les stories de la version | l'utilisateur confirme les lots |
| 6 | `build` | Ada, Thomas, Clio | Les lots, un par un | **Validation 3** : la démo de chaque lot |
| 7 | `wiki` | Diderot | Le wiki et les notes de version | — |
| 8 | `release` | Thomas, Clio, Neil | La grande passe de tests, l'étiquette `vx.y.z`, la mise en ligne | **Validation 4** |

Ce sont les phases du MVP, rejouées en plus court. Chacune suit sa section de `/ariane:next` et de `workflow.md`, avec ces différences :

- **`ideation`** (nouvelle) : voir « La préparation d'une version » ci-dessous.
- **`prd`** : Maxime n'écrit pas un nouveau PRD. Il ajoute une section « Version x.y.z » : l'objectif, les fonctionnalités avec leurs critères d'acceptation, ce qui est reporté. Cassandre la relit comme pour le MVP.
- **`ux`** : sautée si aucun écran ne change (Ariane le dit en une phrase et passe la phase à `done`).
- **`architecture`** : pour une évolution, Gustave ne revoit que ce que la version touche (données, routes, dépendances). **Pour une refonte, il écrit aussi le plan de passage** : comment les données et les utilisateurs existants arrivent dans la nouvelle version, et comment on revient en arrière.
- **`planning`** : les numéros de lots et de stories **continuent** (`state.counters`), ils ne repartent pas de 1.

## Le chemin court d'un correctif

Un correctif ne passe ni par l'idéation, ni par le PRD, ni par les écrans :

1. Ariane présente les correctifs retenus (une ligne chacun) et l'utilisateur confirme.
2. Poucet en fait des stories de correction, dans **un seul lot**.
3. Le lot se déroule comme les autres (Ada, Thomas, Clio), avec sa démo.
4. La grande passe de tests est proportionnée : toute la suite en local, les parcours principaux en ligne, et la revue de sécurité sur ce qui a été touché.
5. Mise en ligne, étiquette `vx.y.Z`.

**Une faille de sécurité ou un bug qui empêche d'utiliser l'application est un correctif urgent** : Ariane le propose tout de suite, sans attendre la version en cours. Voir « Les branches » ci-dessous.

## La préparation d'une version (`ideation`)

Ariane mène cette phase elle-même ; elle est courte.

1. **Faire le point** : en trois lignes, ce qui est en ligne, depuis quand, et ce qui attend (combien d'idées, combien de correctifs, dont combien de sécurité).
2. **S'il y a un correctif urgent** (sécurité, application inutilisable) : le proposer d'abord, seul, en correctif. Le reste attend.
3. **Demander l'envie de l'utilisateur**, en une question : qu'est-ce qui lui manque le plus, ou qu'ont dit ses utilisateurs ? S'il ne sait pas, on passe à la suite.
4. **Lancer Léonard** (`ariane:leonard`) : il rend cinq suggestions au plus, classées, chacune avec ce qu'elle apporte, ce qu'elle coûte (petit, moyen, gros) et son type.
5. **Lancer Occam** (`ariane:occam`) pour la relecture du code, et proposer le lot d'entretien (voir « Le lot d'entretien »).
6. **Composer la liste courte** avec l'utilisateur, à partir des trois sources : une idée ou une suggestion à la fois, « Dans cette version », « Plus tard », « Écarter ». Les idées retenues passent dans « Retenues pour la suite » de la boîte à idées ; les suggestions écartées sont notées pour que Léonard ne les repropose pas.
7. **Garder la version petite** : un objectif en une phrase, **quatre lots au plus**. Au-delà, Ariane propose de couper en deux versions. Une version qui mélange tout ne se termine pas.
8. **Proposer le type et le numéro**, et les faire confirmer.
9. Enregistrer `state.cycle`, noter la décision dans `decisions.md`, passer à `prd` (ou au chemin court).

## Un code qui reste propre

- **Un lot, un sujet** : on ne mélange pas dans un même lot des fonctionnalités et des corrections sans rapport. Les corrections d'une évolution ont leur propre lot.
- **Un lot d'entretien à chaque version**, quand il y a de quoi : voir « Le lot d'entretien » ci-dessous.
- **On ne laisse pas traîner** : en fin de version, chaque correctif est fermé ou explicitement reporté, chaque idée livrée passe dans « Réalisées », et les risques acceptés sont représentés à l'utilisateur.
- **Les notes de version** : Diderot tient `CHANGELOG.md` à la racine du projet, une entrée par version, en mots simples (ajouté, modifié, corrigé).
- **Le rangement** : à la mise en ligne, `scripts/archive-state.mjs --version x.y.z` range dans `.ariane/history/vx.y.z.md` les lots et les stories de la version, pour que l'état reparte léger.

## Le lot d'entretien

À chaque évolution et à chaque refonte, Ariane propose un **lot d'entretien** : le code a grandi lot après lot, il a besoin d'être relu comme un tout.

1. **Occam relit** (`ariane:occam`, voir `agents/occam.md`) : il regarde le code dans son ensemble et sa façon de fonctionner, et écrit `docs/entretien/v<version>.md` : huit propositions au plus (simplification, doublons, performance, dépendances, tests), chacune avec son gain, son risque et sa taille, et deux phrases en mots simples en tête du rapport. Il ne modifie pas le code.
2. **Ariane le propose à l'utilisateur, à sa mesure** :
   - **à un néophyte** (profil `newcomer` ou `intermediate`, détail `simple`) : seulement les deux phrases simples et le nombre de points, **sans le détail** : « Occam a relu tout le code : quatre points d'entretien. Rien ne changera pour toi, mais l'application sera plus rapide et plus facile à faire évoluer. » Puis AskUserQuestion : « Oui, fais l'entretien » (recommandé), « Montre-moi le détail », « Pas cette fois ».
   - **à un développeur confirmé** (profil `developer`, ou détail `detailed`), **ou dès qu'il le demande** : le rapport envoyé en bouton, une ligne par proposition (quoi, gain, risque, taille), et le choix proposition par proposition.
3. **Ce qui est retenu devient un lot** : Poucet en fait des stories dans un lot à part (« Entretien »), jamais mélangées aux fonctionnalités. Ada réalise, Thomas vérifie. Ariane note le sort de chaque proposition en bas du rapport ; ce qui est refusé n'est pas reproposé.
4. **La règle du lot d'entretien** : le comportement ne change pas. Tous les tests existants passent sans être modifiés pour passer ; si un test doit changer, ce n'est plus de l'entretien. La démo du lot se résume à « rien ne doit avoir changé pour toi », avec les gains mesurés (temps de chargement, durée des tests) en une ligne.
5. **Ce qui n'en fait pas partie** : une faille trouvée par Occam va au registre des correctifs ; une amélioration qui change ce que voit l'utilisateur va à la boîte à idées.

Pas de relecture pour un correctif, ni quand le code n'a presque pas bougé depuis la dernière : Occam le dit, et Ariane n'insiste pas. L'utilisateur peut toujours refuser l'entretien ; au bout de deux versions sans entretien, Ariane dit franchement ce que ça coûte de le repousser.

## Les branches

- Les lots partent de `main` et y reviennent après leur démo, comme pour le MVP. `main` contient donc, pendant une version, des lots validés qui ne sont **pas encore en production**.
- La mise en ligne part d'une branche `release/x.y.z` créée depuis `main`, avec l'étiquette `vx.y.z`.
- **Correctif urgent pendant qu'une version est en cours** : il ne part pas de `main` (il emporterait des lots pas encore publiés). Clio crée `release/x.y.Z` **depuis l'étiquette de la version en production**, le lot du correctif part de cette branche et y revient ; après la mise en ligne, Clio reporte le correctif dans `main` par une pull request. Hors de ce cas, un correctif part de `main` comme tout le reste.
- Jamais de réécriture d'historique, jamais d'envoi direct sur `main`.

## L'état d'une version : `state.cycle`

```json
{
  "version": "0.2.0",
  "type": "minor",
  "goal": "Pouvoir réserver pour quelqu'un d'autre",
  "status": "in_progress",
  "started_at": "2026-12-01",
  "from": "0.1.0",
  "items": [
    { "source": "idea", "title": "Réserver pour un collègue" },
    { "source": "suggestion", "title": "Rappel la veille par notification" },
    { "source": "issue", "title": "Le bouton Annuler est trop petit sur téléphone" }
  ],
  "lots": ["07", "08"],
  "urgent": false
}
```

- `type` : `patch`, `minor` ou `major`. `status` : `in_progress`, puis `done` à la mise en ligne (la version rejoint alors `state.releases` et `cycle` repasse à `null`).
- Au démarrage d'une version, Ariane remet `phases` à neuf pour le cycle (`ideation` en cours, les autres à `todo` ; `ux` et `architecture` passeront à `done` sans rien faire si elles sont sautées), efface les dates de `gates` (elles sont déjà dans l'historique de la version précédente) et passe `phase` à `ideation`.
- `state.counters` (`{ "lot": 6, "story": 18 }`) garde le dernier numéro utilisé : Poucet continue à partir de là.

## Ce qu'Ariane dit à l'utilisateur

Jamais « patch », « mineure », « majeure », ni « semver » à un néophyte : « une petite réparation », « une version avec des nouveautés », « un grand changement ». Le numéro se donne à la fin, comme une information. À un développeur, les termes exacts.
