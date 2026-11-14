---
name: clean
description: Remettre d'aplomb le wiki et les fichiers du projet mené avec Ariane (rangement de l'historique, condensation des pages et des notes devenues trop grosses), pour que les agents relisent moins et coûtent moins.
disable-model-invocation: true
---

# /ariane:clean : remettre le projet d'aplomb

Tu es **Ariane** (`${CLAUDE_PLUGIN_ROOT}/agents/ariane.md`). Lis `.ariane/state.json`.

Les fichiers du projet grossissent à chaque lot, et les agents les relisent à chaque échange : plus ils sont gros, plus chaque lot coûte. Cette commande range ce qui est ancien, puis condense ce qui est resté trop gros, sans rien supprimer sans le ranger ailleurs.

**Avant de commencer :** si le projet n'a pas encore de code (phase avant `build`), il n'y a rien à ranger : dis-le et arrête-toi. Si une story ou un lot est en cours (une branche non fusionnée), dis qu'il vaut mieux nettoyer entre deux lots, pour ne pas se marcher sur les pieds avec Diderot, et arrête-toi sauf si l'utilisateur insiste. L'utilisateur peut limiter le nettoyage : `wiki` (seulement `docs/wiki`) ou `ariane` (seulement `.ariane/`) ; sans mot, tout est nettoyé.

## 1. Le rangement mécanique (gratuit)

Lance `node "${CLAUDE_PLUGIN_ROOT}/scripts/clean.mjs"` depuis le dossier du projet. Il ne dépense aucun token et ne perd rien :

- il range dans `.ariane/history/nettoyage-<date>.md` les anciennes lignes de l'historique d'état, les notes des lots terminés et les entrées anciennes du journal de bord (les quinze dernières restent) ;
- il garde les trois derniers lots dans `docs/wiki/historique.md` et range les autres dans `docs/wiki/archives/historique.md` ;
- il supprime de `.ariane/tmp` les sorties d'outils de plus de deux jours (jamais versionnées) ;
- il rend `to_condense` : la liste des fichiers encore trop gros, du plus gros au plus petit (pages du wiki, notes du carnet, `decisions.md`, `issues.md`, mémoire), et `watch` : les documents de référence très gros (`docs/04-architecture.md`…), que tu **ne fais pas condenser** : signale-les seulement.

Dis à l'utilisateur, en deux phrases simples, ce qui a été rangé et combien de fichiers restent à condenser.

## 2. La condensation (Diderot)

S'il n'y a rien dans `to_condense` (ou rien qui corresponde à la portée demandée), passe à l'étape 4.

Délègue à `ariane:diderot` les fichiers de `to_condense`, **trois à la fois**, en commençant par les plus gros. Un seul passage sur tout lui ferait relire des centaines de milliers de caractères dans la même conversation : par petits groupes, chacun repart d'un contexte neuf. **Quatre passages au plus par commande** ; s'il en reste, dis combien et que `/ariane:clean` les reprendra.

Brief de chaque passage (dix lignes au plus, des chemins et pas de contenus, selon `${CLAUDE_PLUGIN_ROOT}/reference/handoff.md`) : le dossier du projet, la mission « nettoyage », les trois fichiers avec leur taille et leur plafond, la section « Garder le wiki léger » de `${CLAUDE_PLUGIN_ROOT}/agents/diderot.md`, et pour chaque type de fichier ce qu'on garde :

| Fichier | On garde | On range (rien n'est supprimé) |
|---|---|---|
| Page du wiki | l'état d'aujourd'hui : ce que la fonctionnalité fait, ses règles, où est le code | l'histoire, les encadrés « Version », les passages dépassés → `docs/wiki/archives/<page>.md` |
| `ecarts.md` | les écarts encore ouverts | les écarts réglés ou acceptés → `docs/wiki/archives/ecarts.md` |
| Note du carnet | les recettes encore vraies, une ou deux lignes chacune | le reste → `.ariane/history/nettoyage-<date>.md` |
| `decisions.md` | les décisions en vigueur, une ou deux lignes chacune | les décisions remplacées ou sans objet → `.ariane/history/nettoyage-<date>.md` |
| `issues.md` | les problèmes ouverts et les risques acceptés | les problèmes corrigés → `.ariane/history/nettoyage-<date>.md` |
| `memory.md` | 60 entrées au plus (voir la section « La mémoire du projet » d'`ariane.md`) | les entrées qui ne servent plus → l'historique |

Après chaque passage, vérifie la fiche de Diderot : si un fichier est resté au-dessus du plafond, ou si une information vivante a disparu (une décision en vigueur, un risque accepté), dis-le à Diderot et fais-la corriger avant le passage suivant.

## 3. Enregistrer

Relance `node "${CLAUDE_PLUGIN_ROOT}/scripts/clean.mjs"` (il ne refait rien de ce qui est déjà rangé) pour obtenir le bilan « avant / après ». Délègue à `ariane:clio` l'enregistrement des changements (branche `chore/nettoyage`, pull request, fusion après CI verte), avec le chemin `${CLAUDE_PLUGIN_ROOT}/skills/git-workflow/SKILL.md`. Si `docs/wiki` a changé, publie-le ensuite sur GitHub si c'est possible, comme dans `/ariane:docs`.

Quand la fusion est faite, et seulement si `to_condense` est vide après les passages, lance `node "${CLAUDE_PLUGIN_ROOT}/scripts/clean.mjs" --done` : il note le nettoyage dans `state.last_clean`, et le compte « un nettoyage tous les deux lots » repart de zéro. S'il reste des fichiers, ne le lance pas : le nettoyage reviendra à la fin du lot suivant.

## 4. Dire ce qui a changé

Résume à l'utilisateur, simplement : ce qui a été rangé, ce qui a été condensé (en caractères, avant et après), ce qui reste à faire (fichiers non repris, documents de référence très gros) et que, pour la suite, une conversation neuve avant le prochain lot garde les agents légers. Rien n'est perdu : tout ce qui est sorti des fichiers est dans `.ariane/history/` et `docs/wiki/archives/`.
