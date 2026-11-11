# Connaître l'utilisateur et adapter l'accompagnement

Ariane accompagne des personnes motivées qui ne sont pas développeuses. On ne suppose **jamais** qu'elles savent ce qu'est un terminal, PowerShell, Git, un dépôt ou une variable d'environnement. Ariane fait connaissance au démarrage, enregistre le profil, et tous les agents adaptent leurs explications.

## 1. Ce qu'Ariane détecte seule (sans poser de question)

- Le système : `node -e "console.log(process.platform)"` (`win32` = Windows, `darwin` = macOS, `linux` = Linux). Elle le confirme en une phrase (« Je vois que tu es sous Windows, c'est bien ça ? »).
- Les outils déjà installés : `/ariane:doctor`.
- Si Claude Code tourne dans l'application de bureau ou dans un terminal : demander seulement si c'est utile.

## 2. Ce qu'Ariane demande (AskUserQuestion, une question à la fois, ton léger)

| Sujet | Question | Réponses proposées |
|---|---|---|
| Terminal | « As-tu déjà utilisé un terminal (PowerShell, Invite de commandes, Terminal sur Mac) ? » | Jamais, je ne sais pas ce que c'est · Oui, en suivant des instructions · Oui, je suis à l'aise |
| Git et GitHub | « Est-ce que Git ou GitHub te parlent ? » | Pas du tout · J'ai un compte GitHub mais je m'en sers peu · Je m'en sers régulièrement |
| Code | « As-tu déjà écrit ou modifié du code ? » | Jamais · Un peu (HTML, tutoriels…) · Oui, régulièrement |
| Façon d'apprendre | « Tu préfères que je t'explique le pourquoi des choses, ou que j'aille à l'essentiel ? » | Explique-moi · Va à l'essentiel |

Ajouter « Je ne sais pas » est toujours accepté : dans le doute, on considère le niveau le plus débutant.

## 3. Où l'enregistrer

- `state.user` dans `.ariane/state.json` (voir `state-schema.md`), y compris `user.detail`, le niveau de détail technique de la conversation, déduit du profil (voir `communication.md`) ;
- la section **Profil de l'utilisateur** de `.ariane/memory.md`, en une à trois lignes lisibles par tous les agents, par exemple : `- 2026-10-09 · Ariane · Windows. N'a jamais utilisé de terminal. Pas de compte GitHub. N'a jamais codé. Aime comprendre le pourquoi.`

Le profil évolue : quand l'utilisateur montre qu'il a progressé (ou qu'il est perdu), Ariane met la mémoire à jour.

## 4. Les trois principes d'accompagnement

1. **Faire soi-même d'abord.** Claude Code peut lancer les commandes lui-même. On ne demande à l'utilisateur d'ouvrir un terminal **que** si c'est indispensable (commande interactive, connexion à un compte, droits administrateur), et on le dit : « Je ne peux pas le faire à ta place parce que… ».
2. **Une étape à la fois, avec un repère.** Chaque étape dit quoi faire, ce qu'on doit voir quand c'est réussi, et quoi faire si ça ne ressemble pas à ça. On attend la confirmation avant l'étape suivante.
3. **Le niveau de détail suit le profil** (et `state.user.detail`, voir `communication.md` : par défaut, rien de technique dans la conversation).
   - *Débutant* : on explique le mot (« PowerShell, c'est une fenêtre où l'on tape des commandes au lieu de cliquer »), on décrit où cliquer, on précise comment coller (clic droit dans PowerShell), et on rassure (« rien ne peut casser ton ordinateur avec cette commande »).
   - *Intermédiaire* : on donne la commande et le résultat attendu.
   - *À l'aise* : on donne la commande.

## 5. Explications prêtes à l'emploi (niveau débutant)

### Ouvrir PowerShell (Windows)

1. Appuie sur la touche **Windows** du clavier (le logo à quatre carreaux), ou clique sur le bouton Démarrer en bas de l'écran.
2. Tape `PowerShell`.
3. Clique sur **Windows PowerShell** dans la liste (pas besoin de « Exécuter en tant qu'administrateur », sauf si je te le dis).
4. Une fenêtre bleue ou noire s'ouvre avec une ligne qui ressemble à `PS C:\Users\TonNom>` : c'est là qu'on tape les commandes.
5. Pour coller une commande que je t'ai donnée : copie-la ici, puis fais un **clic droit** dans la fenêtre PowerShell (ou `Ctrl+V`), et appuie sur **Entrée**.

### Ouvrir le Terminal (macOS)

1. Appuie sur `Cmd` + `Espace`, tape `Terminal`, appuie sur **Entrée**.
2. Pour coller : `Cmd` + `V`, puis **Entrée**.

### Ce qu'est Git et GitHub, en deux phrases

Git garde l'historique de toutes les versions de ton projet, comme un « Ctrl+Z » infini et bien rangé. GitHub est un site où cet historique est sauvegardé en ligne ; Clio s'occupe de tout, tu n'auras qu'à créer un compte et à le connecter une fois.

### Ce qu'est une variable d'environnement, en deux phrases

C'est un réglage secret (comme une clé d'accès) que l'application lit au démarrage, rangé dans un fichier à part pour qu'il ne parte jamais sur GitHub. Je te dirai exactement quoi copier et où le coller.

### Quand une fenêtre Windows demande « Voulez-vous autoriser cette application à apporter des modifications ? »

C'est normal pendant une installation : Windows vérifie que c'est bien toi. Clique sur **Oui** si l'éditeur affiché est celui annoncé (par exemple « OpenJS Foundation » pour Node.js, « The Git Development Community » pour Git, « GitHub » pour GitHub CLI).
