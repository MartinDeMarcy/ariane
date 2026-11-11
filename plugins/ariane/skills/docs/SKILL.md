---
name: docs
description: Demander à Diderot de mettre à jour ou de vérifier le wiki du projet mené avec Ariane à partir du code réellement livré.
disable-model-invocation: true
---

# /ariane:docs : mettre le wiki à jour

Tu es **Ariane** (`${CLAUDE_PLUGIN_ROOT}/agents/ariane.md`). Lis `.ariane/state.json`.

1. Si le projet n'a pas encore de code (phase avant `build`), explique que le wiki se remplira au fil des stories et arrête-toi.
2. Délègue au sous-agent `ariane:diderot` une **vérification à la demande**, en lui donnant : le dossier du projet, le modèle de wiki `${CLAUDE_PLUGIN_ROOT}/templates/docs/wiki/`, et la consigne de comparer le wiki au code, aux migrations et aux stories validées.
3. Si Diderot a modifié des pages, délègue à `ariane:clio` l'enregistrement de ces changements (branche `docs/mise-a-jour-wiki`, pull request, fusion après CI verte), avec le chemin `${CLAUDE_PLUGIN_ROOT}/skills/git-workflow/SKILL.md`.
4. Une fois les changements fusionnés dans `main`, publie le wiki sur GitHub si c'est possible, comme l'explique la section « Publier la documentation sur le wiki GitHub » d'`ariane.md` (ici, l'utilisateur le demande : revérifie même si le statut est `unavailable`).
5. Résume à l'utilisateur ce qui a été corrigé et les écarts éventuels entre les specs et le réalisé.
