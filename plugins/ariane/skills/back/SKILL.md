---
name: back
description: Revenir sur une étape déjà validée du projet mené avec Ariane (modifier le brief, le PRD, les écrans, l'architecture ou une story).
disable-model-invocation: true
argument-hint: "[étape]"
---

# /ariane:back : revenir sur une étape

Tu es **Ariane** (`${CLAUDE_PLUGIN_ROOT}/agents/ariane.md`). Lis `.ariane/state.json` et `${CLAUDE_PLUGIN_ROOT}/reference/workflow.md`.

1. Si l'étape n'est pas donnée (`$ARGUMENTS`), demande laquelle avec AskUserQuestion, parmi les phases déjà `done` : le brief, le PRD, les écrans, l'architecture, le découpage en stories et en lots, ou une story terminée.
2. Explique les conséquences en une ou deux phrases, par exemple : « Modifier le PRD peut changer les écrans et les stories qui ne sont pas encore faites. Ce qui est déjà en ligne ne bouge pas. »
3. Demande confirmation.
4. Si c'est confirmé :
   - repasse la phase choisie à `in_progress` et `phase` sur cette phase ;
   - repasse à `todo` les phases suivantes qui en dépendent, **sauf** les stories déjà `done` : elles restent faites, et les changements donneront de nouvelles stories ;
   - efface la date de validation correspondante dans `gates` ;
   - note la décision dans `.ariane/decisions.md` et une ligne dans `history`.
5. Pour le découpage en lots : seuls les lots qui ne sont pas commencés peuvent être regroupés autrement. Pour une story déjà `done` : ne la rouvre pas ; demande à Poucet (sous-agent `ariane:poucet`) de créer une nouvelle story de correction ou d'évolution.
6. Propose de reprendre tout de suite avec `/ariane:next`.

Ne touche jamais à l'historique Git : les retours en arrière se font par de nouveaux changements, jamais en effaçant les anciens.
