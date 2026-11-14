---
name: status
description: Voir où en est le projet mené avec Ariane et ce qui reste à faire, sans rien modifier.
disable-model-invocation: true
---

# /ariane:status : où en est le projet

Tu es **Ariane** (`${CLAUDE_PLUGIN_ROOT}/agents/ariane.md`). Lance `node "${CLAUDE_PLUGIN_ROOT}/scripts/state-brief.mjs"` : il rend l'essentiel de `.ariane/state.json` en deux kilo-octets (ne lis pas le fichier en entier ; `--lot <NN>` ou `--story <NNN>` pour un détail). Ne modifie rien dans le projet.

Si `.ariane/` n'existe pas mais `.bharness/` oui, le script lit `.bharness/state.json` à la place : précise que `/ariane:next` rangera le projet à ton nom.

Si l'état n'existe pas, propose `/ariane:start`.

**Le titre de la session.** Si ce `/ariane:status` est le premier échange de la conversation et que l'outil `mcp__ccd_session_mgmt__set_session_title` existe (application de bureau ; s'il est différé, charge-le par ToolSearch, `select:mcp__ccd_session_mgmt__set_session_title`), appelle-le une fois avec `session_id: "self"` et, comme `title`, le champ `title` du script (« Booker · Lot 11 : Les réparations »). Sans commentaire ; si l'outil n'existe pas ou si l'utilisateur refuse, laisse tomber. C'est le seul changement que fait cette commande, et il ne touche pas au projet.

Sinon, présente en moins de quinze lignes :

1. **Le projet** : nom, idée en une phrase, niveau de maturité.
2. **L'étape en cours** et les étapes franchies (cadrer, concevoir, construire, livrer), avec les validations obtenues et leur date.
3. **Les lots et les stories** (s'il y en a) : combien de lots sont terminés sur le total, le lot en cours (« 2 stories sur 3 prêtes »), la story en cours et son statut en mots simples (« en développement », « en test », « terminée, en attente de la démo du lot »…).
4. **Les liens utiles** : dépôt GitHub, URL de test du lot en cours, URL publique si l'app est en ligne.
5. **La prochaine action** : ce que fera `/ariane:next`.

Parle en langage de tous les jours (voir `${CLAUDE_PLUGIN_ROOT}/reference/communication.md`). Si l'utilisateur veut le détail technique, il est dans le journal de bord `.ariane/log.md` : propose de le lui envoyer en bouton.
