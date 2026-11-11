# Le registre des correctifs

Ce qui ne marche pas bien dans l'application, ou qui la rend moins sûre : les bugs signalés, les remarques des tests, les failles et les risques acceptés « pour l'instant ». Ariane y note chaque problème sans interrompre le travail en cours ; ils entrent dans une version de correctifs, ou dans un lot de corrections de la version suivante.

Règles d'écriture :
- un problème = une ligne, datée, avec sa gravité et d'où il vient : `- 2026-12-02 · gênant · Utilisateur · Le bouton Annuler est trop petit sur téléphone` ;
- gravité : `sécurité` (une faille, des données exposées), `bloquant` (on ne peut plus utiliser une fonctionnalité), `gênant` (ça marche mal), `mineur` (un détail) ;
- ce qu'on a vu, où, et comment le reproduire si on le sait, en une phrase ; jamais de secret ni de donnée personnelle ;
- pas de doublon : si le problème existe déjà, on complète la ligne ;
- un problème `sécurité` ou `bloquant` est un **correctif urgent** : Ariane le propose tout de suite.

## À corriger

<!-- Les problèmes en attente, les plus graves en haut. -->

## Risques acceptés pour l'instant

<!-- Ce que l'utilisateur a choisi de laisser tel quel, en connaissance de cause : `- 2026-10-11 · Le jeton reste valable une heure après la déconnexion · (accepté le 2026-10-11, à revoir avant la 1.0.0)`. Ariane les représente avant chaque mise en ligne et note la réponse sur la ligne : `(revu le 2026-12-20 : toujours accepté | corrigé avant | à corriger juste après)`. -->

## Corrigés

<!-- `… · (corrigé : story 021, version 0.1.1)`. -->

## Écartés

<!-- Ce qui n'est finalement pas un problème, avec la raison en quelques mots. -->
