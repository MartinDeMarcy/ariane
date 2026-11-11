# La fiche de passage : se parler peu, se parler bien

Chaque échange entre Ariane et un spécialiste coûte : ce qu'Ariane écrit pour le lancer, ce qu'il relit en démarrant, et ce qu'il rend, qui reste ensuite dans la conversation d'Ariane jusqu'à la fin de la session. Cette référence fixe la forme de ces échanges. Elle s'applique à tous les spécialistes lancés en sous-agent.

## Ce qu'Ariane envoie : un brief de dix lignes au plus

- La tâche en une phrase, avec l'identifiant de la story ou du lot et l'étape.
- Des **chemins**, jamais des contenus : le dossier du projet, la story, les documents utiles, le savoir-faire du plugin, cette référence.
- La branche de travail, quand il y en a une.
- Le profil de l'utilisateur en quelques mots (`newcomer`, `developer`…).
- Ce qu'elle attend en retour : la fiche de passage ci-dessous.

Elle ne recopie ni la conversation, ni un document, ni le compte rendu d'un autre spécialiste : celui qui en a besoin le lit dans le journal de bord.

## Ce que le spécialiste rend : cinq lignes

```
Statut : ok | à corriger | bloqué
Fait : <une phrase, en mots simples, sur ce qui a changé pour l'utilisateur final>
Fichiers : <les fichiers créés ou le lien utile (pull request, URL de test, rapport)>
À savoir : <ce que le suivant doit savoir, ou « rien »>
Difficultés : <ce qui a coincé, ou « aucune »>
```

Rien d'autre : pas de récit, pas de sortie de commande, pas de contenu de fichier, pas de liste de tout ce qui a été lu. En cas de « à corriger » ou « bloqué », la ligne « À savoir » dit précisément quoi, et pour qui.

## Où va le détail : le journal de bord, écrit par le spécialiste

Avant de rendre sa fiche, le spécialiste **ajoute lui-même** son entrée à la fin de `.ariane/log.md`, au format du journal (`## AAAA-MM-JJ HH:MM · <Agent> · <Fait | Problème | Solution | Remarque | Choix>`), avec la story ou le lot dans la première ligne : commandes lancées, fichiers touchés, résultats des vérifications, erreurs et corrections. Deux à dix lignes. Ariane ne réécrit pas ce détail : elle n'ajoute au journal que ses propres actions et remarques.

Les rapports qui ont leur propre fichier (rapport de test, architecture, stories) y restent : la fiche en donne seulement le chemin.

## Lire peu

- Ne relis pas un document en entier quand une partie suffit : cherche la story, la fonctionnalité ou le mot utile (Grep), puis lis ce passage.
- Pour savoir ce qu'a fait le spécialiste précédent, cherche la story (`story NNN`) ou le lot dans `.ariane/log.md` et lis ses dernières entrées, pas tout le journal.
- N'explore pas le code au hasard : pars des fichiers nommés dans la story et dans `docs/04-architecture.md`.
- Lance les vérifications en mode discret quand l'outil le permet, et ne garde que le résultat et la première erreur.

## Une seule fois

Ne refais pas ce qu'un autre a déjà fait et noté (réinstaller, relancer toute la suite de tests sans raison, relire la mémoire deux fois). Si une information manque, dis-le dans « À savoir » plutôt que de la reconstituer à grands frais.
