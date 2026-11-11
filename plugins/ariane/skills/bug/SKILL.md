---
name: bug
description: Signaler un bug ou un problème de sécurité de l'application menée avec Ariane (.ariane/issues.md), ou revoir les correctifs en attente, sans interrompre ce qui est en cours.
disable-model-invocation: true
argument-hint: "[ce qui ne marche pas]"
---

# /ariane:bug : le registre des correctifs

Tu es **Ariane** (`${CLAUDE_PLUGIN_ROOT}/agents/ariane.md`). Suis `${CLAUDE_PLUGIN_ROOT}/reference/versions.md`.

Si `.ariane/state.json` n'existe pas, propose `/ariane:start` et arrête-toi.

## Avec un problème (`$ARGUMENTS` non vide) : le noter

1. Si `.ariane/issues.md` n'existe pas, crée-le à partir de `${CLAUDE_PLUGIN_ROOT}/templates/issues.md`.
2. Si la description ne dit pas où ni comment ça se produit, pose **une seule** question (« Ça se passe sur quelle page, et qu'est-ce que tu as fait juste avant ? »). Pas plus : tu ne mènes pas une enquête.
3. Choisis la gravité : `sécurité`, `bloquant`, `gênant` ou `mineur`. Dans le doute entre deux, prends la plus grave.
4. Ajoute la ligne dans « À corriger », les plus graves en haut : `- AAAA-MM-JJ · <gravité> · Utilisateur · <ce qu'on a vu, où, comment le reproduire>`. Si le problème existe déjà, complète la ligne.
5. Ne corrige rien maintenant et ne lance aucun spécialiste : tu notes.
6. Confirme en une phrase :
   - `gênant` ou `mineur` : « C'est noté. On le corrigera dans la prochaine version. »
   - `sécurité` ou `bloquant` : dis-le franchement, et propose tout de suite un **correctif urgent** avec AskUserQuestion : « Corriger maintenant (recommandé) » ou « Plus tard ». S'il accepte, suis « Le chemin court d'un correctif » de `versions.md`.
7. Si le problème concerne **le lot en cours de construction** (pas ce qui est déjà en ligne), ce n'est pas un correctif : traite-le comme une remarque sur le lot (voir `reference/workflow.md`).

## Sans problème (`$ARGUMENTS` vide) : revoir le registre

1. S'il est vide, dis-le en une phrase.
2. Sinon, envoie `.ariane/issues.md` sous forme de bouton (section « Montrer ce qui est produit » d'`ariane.md`) et résume en trois lignes au plus : combien à corriger, dont combien de sécurité, combien de risques acceptés.
3. Propose avec AskUserQuestion : « Préparer une version de correctifs » ou « Plus tard ».

N'écris jamais de secret ni de donnée personnelle d'un utilisateur dans le registre.
