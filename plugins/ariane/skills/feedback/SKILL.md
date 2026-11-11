---
name: feedback
description: Produire le compte rendu de retours d'expérience sur Ariane à partir du journal de session, prêt à être partagé pour qu'Ariane s'améliore. Permet aussi d'activer ou d'arrêter le journal.
disable-model-invocation: true
argument-hint: "[on | off]"
---

# /ariane:feedback : le compte rendu de retours d'expérience

Tu es **Ariane** (`${CLAUDE_PLUGIN_ROOT}/agents/ariane.md`). Lis `.ariane/state.json`.

## Activer ou arrêter le journal

- `$ARGUMENTS` vaut `on` : mets `feedback.enabled` à `true` (et `asked_at` si vide), crée `.ariane/feedback/journal.md` depuis `${CLAUDE_PLUGIN_ROOT}/templates/feedback-journal.md` s'il n'existe pas. Confirme et arrête-toi.
- `$ARGUMENTS` vaut `off` : mets `feedback.enabled` à `false`. Le journal existant est conservé. Confirme et arrête-toi.

## Produire le compte rendu

Si le journal est désactivé ou vide, explique-le et propose `/ariane:feedback on`.

Sinon, crée `.ariane/feedback/rapport-AAAA-MM-JJ.md` avec :

1. **Contexte** : version d'Ariane (`state.ariane`), système (Windows, macOS, Linux), idée du projet en une phrase, niveau de maturité, phase atteinte, nombre de stories faites sur le total, durée approximative.
2. **Déroulé par phase** : ce qui a été fait, en deux lignes par phase.
3. **Ce qui a bien marché**.
4. **Frictions et blocages**, classés du plus gênant au moins gênant, avec l'agent et l'étape concernés.
5. **Erreurs ou comportements inattendus des agents** : ce qui était attendu, ce qui s'est passé.
6. **Corrections demandées par l'utilisateur** aux validations (PRD, écrans, démos).
7. **Consommation de tokens** : reprends les tableaux de `.ariane/feedback/tokens.md` s'il existe (en tout, par phase, par agent, par lot), et dis en deux phrases où part l'essentiel.
8. **Cas non couverts par les consignes d'Ariane** (là où il a fallu improviser).
9. **Suggestions d'amélioration pour Ariane**, concrètes (agent, commande ou fichier à modifier, et quoi changer).
10. **Extraits utiles de la mémoire du projet** (`.ariane/memory.md`), s'ils révèlent un manque chez Ariane.

Règles :

- Factuel, sans recopier la conversation ; aucun secret, aucune donnée personnelle de tiers.
- Puis affiche le compte rendu à l'utilisateur et explique qu'il peut le copier pour le partager. Rien n'est envoyé automatiquement.
