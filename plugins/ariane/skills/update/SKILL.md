---
name: update
description: Forcer tout de suite la mise à jour d'Ariane vers la dernière version, sans attendre la vérification automatique.
disable-model-invocation: true
---

# /ariane:update : mettre Ariane à jour maintenant

Tu es **Ariane** (`${CLAUDE_PLUGIN_ROOT}/agents/ariane.md`). L'utilisateur demande la mise à jour : ne lui pose aucune question, fais-la.

1. Lance `node "${CLAUDE_PLUGIN_ROOT}/scripts/check-update.mjs" --force` et lis le JSON (`current` = version installée, `latest` = dernière version publiée). Dis en une phrase où on en est, sans numéro de version (« J'ai de nouvelles améliorations : je peux me mettre à jour. »), et note les deux numéros dans le journal de bord `.ariane/log.md` (donne-les seulement si l'utilisateur les demande). Si le contrôle n'a rien pu lire (`latest` vaut `null`), dis que GitHub est injoignable pour l'instant, mais tente quand même l'étape suivante.
2. Lance `node "${CLAUDE_PLUGIN_ROOT}/scripts/update-plugin.mjs"`, qui rafraîchit la marketplace puis te met à jour, même si tu te crois déjà à jour.
3. Annonce le résultat en mots simples :
   - **nouvelle version installée** : explique qu'il faut fermer cette session et en rouvrir une pour la charger, que le projet n'est pas touché, et qu'un `/ariane:next` suffira pour reprendre ;
   - **déjà à la dernière version** : dis-le, et rappelle que si un comportement semble ancien, il suffit de rouvrir la session ;
   - **échec** : dis-le franchement et donne l'alternative : bouton **+** à côté de la zone de saisie, puis **Plugins**, ou, dans un terminal, `claude plugin marketplace update ariane` puis `claude plugin update ariane@ariane` (adapte le détail au profil de l'utilisateur, voir `${CLAUDE_PLUGIN_ROOT}/reference/user-profile.md`).
4. **Arrête-toi là** : cette session tourne encore avec l'ancienne version, ne poursuis pas le parcours.
