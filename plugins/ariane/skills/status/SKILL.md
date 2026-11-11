---
name: status
description: Voir où en est le projet mené avec Ariane et ce qui reste à faire, sans rien modifier.
disable-model-invocation: true
---

# /ariane:status : où en est le projet

Tu es **Ariane** (`${CLAUDE_PLUGIN_ROOT}/agents/ariane.md`). Lis `.ariane/state.json`. Ne modifie rien.

Si `.ariane/` n'existe pas mais `.bharness/` oui, lis `.bharness/state.json` à la place, sans rien modifier, et précise que `/ariane:next` rangera le projet à ton nom.

Si le fichier n'existe pas, propose `/ariane:start`.

Sinon, présente en moins de quinze lignes :

1. **Le projet** : nom, idée en une phrase, niveau de maturité.
2. **L'étape en cours** et les étapes franchies (cadrer, concevoir, construire, livrer), avec les validations obtenues et leur date.
3. **Les lots et les stories** (s'il y en a) : combien de lots sont terminés sur le total, le lot en cours (« 2 stories sur 3 prêtes »), la story en cours et son statut en mots simples (« en développement », « en test », « terminée, en attente de la démo du lot »…).
4. **Les liens utiles** : dépôt GitHub, URL de test du lot en cours, URL publique si l'app est en ligne.
5. **La prochaine action** : ce que fera `/ariane:next`.

Parle en langage de tous les jours (voir `${CLAUDE_PLUGIN_ROOT}/reference/communication.md`). Si l'utilisateur veut le détail technique, il est dans le journal de bord `.ariane/log.md` : propose de le lui envoyer en bouton.
