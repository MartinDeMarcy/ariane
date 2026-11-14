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

**Chaque ligne tient en deux phrases courtes (300 caractères au plus), la fiche entière en 900 caractères.** Les listes de fichiers, de tests ou de vérifications vont dans le journal de bord et dans le rapport, pas dans la fiche : la fiche entre dans la conversation d'Ariane et s'y relit à chaque échange jusqu'à la fin du lot. Rien d'autre : pas de récit, pas de sortie de commande, pas de contenu de fichier, pas de liste de tout ce qui a été lu. En cas de « à corriger » ou « bloqué », la ligne « À savoir » dit précisément quoi, et pour qui. **C'est aussi là que le spécialiste dit s'il a dû s'écarter d'une décision du projet** (un autre service, un autre outil, un périmètre différent) : jamais en silence.

## Où va le détail : le journal de bord, écrit par le spécialiste

Avant de rendre sa fiche, le spécialiste **ajoute lui-même** son entrée à la fin de `.ariane/log.md`, au format du journal (`## AAAA-MM-JJ HH:MM · <Agent> · <Fait | Problème | Solution | Remarque | Choix>`), avec la story ou le lot dans la première ligne : commandes lancées, fichiers touchés, résultats des vérifications, erreurs et corrections. Deux à dix lignes courtes : le journal est relu par les suivants, une entrée de plus de 1 000 caractères est trop longue. Ariane ne réécrit pas ce détail : elle n'ajoute au journal que ses propres actions et remarques.

Les rapports qui ont leur propre fichier (rapport de test, architecture, stories) y restent : la fiche en donne seulement le chemin.

## Lire peu

- Ne relis pas un document en entier quand une partie suffit : cherche la story, la fonctionnalité ou le mot utile (Grep), puis lis ce passage.
- Pour savoir ce qu'a fait le spécialiste précédent, cherche la story (`story NNN`) ou le lot dans `.ariane/log.md` et lis ses dernières entrées, pas tout le journal.
- N'explore pas le code au hasard : pars des fichiers nommés dans la story et dans `docs/04-architecture.md`.
- Lance les vérifications avec `scripts/check.mjs` du plugin (lint, types, tests, build, tests de bout en bout) : il n'affiche que le bilan et la première erreur, et garde la sortie complète dans `.ariane/tmp/check-<étape>.log`. Cherche dans ce fichier plutôt que de relancer. Ne lance jamais ces outils en direct : leur sortie reste dans ta conversation et se relit à chaque échange.
- **Groupe tes appels d'outils.** Chaque échange avec le modèle relit toute ta conversation : dix appels l'un après l'autre coûtent dix relectures, dix appels dans un même message n'en coûtent qu'une. Avant chaque appel, demande-toi : « qu'est-ce que je peux encore demander sans attendre ce résultat ? », et envoie tout dans le **même message**, en appels parallèles.
  - *Au départ* : lis ensemble la story, le passage utile de l'architecture (Grep), la note du carnet concernée et les fichiers de code que tu vas modifier.
  - *Écrire* : crée ou modifie dans le même message tous les fichiers qui ne dépendent pas les uns des autres (le code et son test, plusieurs pages).
  - *Commandes* : enchaîne les commandes de lecture en une seule (`git status && git branch --show-current && git log --oneline -5`), chacune à la sortie courte.
  - *Vérifier* : une seule vérification après un groupe de modifications, pas une après chaque modification.
  - *Ne groupe pas* ce qui dépend du résultat précédent (lire avant de modifier, modifier avant de tester, un commit avant son push), ni les tests de bout en bout entre eux (ils partagent le même serveur).
- Ne lis jamais en entier un gros document (`docs/04-architecture.md`, `docs/02-prd.md`, `.ariane/log.md`, une note du carnet) : Grep, puis le passage utile.

## Une seule fois

Ne refais pas ce qu'un autre a déjà fait et noté (réinstaller, relancer toute la suite de tests sans raison, relire la mémoire deux fois). Si une information manque, dis-le dans « À savoir » plutôt que de la reconstituer à grands frais.
