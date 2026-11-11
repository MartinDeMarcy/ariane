# Changelog

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions : [SemVer](https://semver.org/lang/fr/).

## [0.17.0] – 2026-11-11

### Ajouté

- **La boîte à idées**, `.ariane/ideas.md` (modèle `templates/ideas.md`) : les idées pour plus tard, notées sans toucher au travail en cours. Quatre sections : à explorer, retenues pour la suite, réalisées, écartées.
- Ariane note une idée dès qu'elle l'entend (« note cette idée », « pour plus tard », « ce serait bien si… »), confirme en une phrase et reprend où elle en était. La commande `/ariane:idea` fait la même chose ; sans argument, elle montre la boîte et propose le tri.
- **Une zone « Boîte à idées » dans le panneau d'avancement** : on y écrit une idée, Entrée la note directement dans `.ariane/ideas.md` (section « À explorer », origine « depuis le panneau »), sans passer par la conversation ni interrompre le lot en cours. Le panneau affiche le nombre d'idées en attente.
- Ce que Maxime reporte après le MVP et les remarques de démo hors du lot y sont rangés aussi, avec leur origine.
- Ariane y revient entre deux lots (une phrase), quand le projet est en ligne (le tri : prochaine version, plus tard, écarter) et à la demande. Les idées retenues repassent par le PRD avec le parcours de `/ariane:back`, puis deviennent de nouveaux lots.
- Règle pour toute l'équipe : une idée notée n'est pas une décision ; rien n'est construit tant qu'elle n'est pas dans le PRD et dans une story.

## [0.16.0] – 2026-11-11

### Ajouté

- **Le panneau d'avancement** (`hooks/panel.tsx`) : un panneau en direct à côté de la conversation, qui lit `.ariane/state.json` et se met à jour tout seul. Il montre ce qu'Ariane fait en ce moment, les quatre étapes du projet avec leurs validations, le lot en cours (une barre en cinq temps par fonctionnalité), les derniers pas de l'équipe et la suite, avec deux boutons (`/ariane:next`, `/ariane:status`).
- Le panneau s'ouvre au début d'une session dans un projet mené avec Ariane, et se rouvre à chaque commande d'Ariane (tapée, ou lancée par le modèle) s'il avait été fermé.
- **Jamais de défilement** : sept niveaux de densité, du plus complet (cartes détaillées) au plus compact (une ligne) ; le panneau prend le premier qui tient dans sa hauteur, et adapte le nombre de cartes par ligne à sa largeur.
- Contrat d'état du panneau, `types/index.d.ts`, déclaré dans `plugin.json` ; `hooks/hooks.json` nomme le module à côté des garde-fous.

## [0.15.0] – 2026-11-11

### Ajouté

- **Ariane s'adapte à sa cible**, du néophyte plein d'idées au développeur confirmé. Trois profils (`newcomer`, `intermediate`, `developer`), déduits des questions de l'accueil et enregistrés dans `state.user.profile`, ajustables à tout moment (« parle-moi technique », « va plus vite », « c'est trop technique »). Le parcours, les validations et les garde-fous ne changent pas : ce qui change, c'est la façon d'accompagner (vocabulaire, installations, comptes rendus, questions, ton, rythme).
- Un tableau « Ce qui change selon le profil » dans `reference/user-profile.md`, une section « S'adapter à ta cible » dans `agents/ariane.md`, et une section dans le README.
- À un développeur, Ariane propose dès l'accueil de lui parler technique (`user.detail` = `detailed`), donne les liens utiles (pull request, environnement de test, rapport de test) et respecte ses conventions dans la stack imposée ; une autre stack n'est pas encore prise en charge.
- Ariane transmet le profil aux spécialistes qu'elle briefe, pour qu'ils s'adaptent aussi.

### Modifié

- La voix d'Ariane : une seule Ariane avec un curseur ; sobre et directe avec un développeur, complice avec un néophyte. Jamais d'étiquette dite à voix haute, jamais de condescendance dans aucun sens.
- Le niveau de détail de départ se déduit maintenant du profil (`developer` → `normal`, avec proposition de `detailed`).
- Les descriptions du plugin et de la marketplace ne parlent plus seulement de débutants.

## [0.14.0] – 2026-11-11

### Ajouté

- **Cassandre relit aussi le PRD de Maxime.** Une fois le brouillon de `docs/02-prd.md` écrit et **avant** la validation 1, Ariane lance Cassandre avec le brief et le PRD. Elle cherche ce qui rendrait le PRD inutilisable : périmètre trop gros pour un MVP, critères d'acceptation impossibles à vérifier, trous dans les parcours, cas limites et erreurs oubliés (réseau coupé, droits, premier lancement), contradictions avec le brief, données et dépendances.
- Même débat que pour l'idée, mais avec Maxime : il répond objection par objection, Cassandre a une seule réplique, puis Ariane juge et remonte au plus trois questions, souvent une seule. Les simples précisions de rédaction sont corrigées par Maxime sans déranger l'utilisateur.
- Section « Points de vigilance » dans le modèle de PRD.

### Modifié

- `state.challenge` est séparé par moment : `challenge.brief` et `challenge.prd`, chacun avec `status`, `rounds`, `raised`, `at`. Les projets en 0.13.0 (clés à plat) sont lus comme `challenge.brief`. Un refus de la contradiction vaut pour tout le projet.

## [0.13.0] – 2026-11-11

### Ajouté

- **Cassandre, la contradictrice** (`agents/cassandre.md`), onzième spécialiste de l'équipe d'Ariane. Pendant l'idéation, elle conteste l'idée et imagine ce qui pourrait mal tourner : le problème est-il réel, qui sont vraiment les utilisateurs, ce qui existe déjà, la faisabilité d'un MVP, les données et les règles, l'adoption, les coûts, la mesure de la réussite. Elle travaille en lecture seule, avec une recherche web pour vérifier plutôt que deviner, et ne parle jamais à l'utilisateur.
- **Un débat avec Socrate, jugé par Ariane.** Une fois le résumé de l'idée confirmé, Ariane lance Cassandre (cinq objections au maximum, classées par gravité) ; Socrate répond objection par objection ; Cassandre a une seule réplique. Ariane tranche : elle ne remonte à l'utilisateur que ce qui est grave, propre à cette idée, tranchable maintenant et pas déjà réglé, au plus trois questions, une à la fois, souvent une seule. Le détail du débat va dans le journal de bord ; les décisions de l'utilisateur dans `decisions.md`.
- Section « Points de vigilance » dans le modèle de brief ; état `state.challenge` (`status`, `rounds`, `raised`, `at`) pour ne pas relancer la contradiction à la reprise d'une session. L'utilisateur peut la refuser.

### Modifié

- L'équipe d'Ariane compte maintenant onze spécialistes ; le README, `/ariane:help`, la voix d'Ariane et le parcours (`reference/workflow.md`, phase 2) en tiennent compte.

## [0.12.0] – 2026-11-11

### Modifié

- **Bharness devient Ariane.** Le plugin, la marketplace et toutes les commandes portent le nom du personnage : `/ariane:start`, `/ariane:next`, `/ariane:status`, `/ariane:back`, `/ariane:docs`, `/ariane:doctor`, `/ariane:remember`, `/ariane:feedback`, `/ariane:update`, `/ariane:help`. Les sous-agents deviennent `ariane:<nom>`. Le dossier du plugin est `plugins/ariane/`, le dossier d'état des projets est `.ariane/` (au lieu de `.bharness/`), et les variables de test `BHARNESS_*` deviennent `ARIANE_*`.
- **Une direction artistique centrée sur Ariane et son équipe.** Ariane est présentée comme la cheffe d'orchestre qui dirige ses dix spécialistes de A à Z : elle choisit qui travaille, les briefe, relit leur travail, assume leurs erreurs et le raconte à l'utilisateur. Partout dans les textes, on parle d'elle et de son équipe (« je m'améliore », « j'ai appris de nouvelles choses »), jamais d'un outil ou d'un plugin.
- `agents/ariane.md`, `reference/ariane-voice.md`, `reference/workflow.md`, `/ariane:help`, le modèle de `CLAUDE.md` et le README sont réécrits dans ce sens ; chaque spécialiste se présente comme membre de l'équipe d'Ariane.
- Les mises à jour s'annoncent à la première personne (« J'ai appris de nouvelles choses : je peux me mettre à jour »).

### Ajouté

- **Migration automatique** des projets créés avant 0.12.0 : au premier `/ariane:next`, Ariane range `.bharness/` en `.ariane/` (clé d'état, `CLAUDE.md`, `.gitignore`) et confie le commit à Clio. Les garde-fous restent actifs sur les projets non migrés, et la publication du wiki reprend l'ancien fichier `.bharness-wiki.json`.

### À savoir

- Les installations existantes (`bharness@bharness`) ne se mettent pas à jour d'un nom à l'autre : il faut retirer l'ancienne marketplace puis installer `ariane@ariane` (voir le README).
- L'adresse du dépôt GitHub devient `MartinDeMarcy/ariane` : le dépôt doit être renommé pour que l'installation et la vérification de mise à jour fonctionnent.

## [0.11.0] – 2026-11-08

### Ajouté

- Publication du wiki sur GitHub : Diderot publie `docs/wiki` dans l'onglet Wiki du dépôt (`scripts/publish-wiki.mjs`, Node.js, sans dépendance), après chaque lot validé, après la relecture finale du wiki et avec `/bharness:docs`. Le dossier `docs/wiki` reste la source de vérité ; la publication est à sens unique.
- Mise en forme pour GitHub : page d'accueil `Home`, une page par fonctionnalité et une liste des fonctionnalités, liens entre pages réécrits, images copiées, liens vers les fichiers du projet transformés en liens vers le dépôt, barre latérale et pied de page générés.
- Garde-fous : seulement depuis la branche principale et sur du contenu enregistré ; jamais de force push ; jamais de suppression d'une page que le script n'a pas écrite (liste `.bharness-wiki.json` dans le wiki) ; une fusion qui garde nos pages si le wiki a été modifié à la main.
- État `state.wiki` (`status`, `url`, `published_at`).

### Corrigé

- `/bharness:update` et la mise à jour proposée par Ariane retrouvent de nouveau le programme `claude` de l'application de bureau Windows : son dossier a changé avec une mise à jour de l'application (`%LOCALAPPDATA%\Claude-Data\…`), et le script ne regardait que l'ancien. Il examine maintenant tous les emplacements connus et garde la version la plus récente.

### Modifié

- **Rien ne change quand le wiki n'est pas disponible** : sur un dépôt privé en offre gratuite (ou d'offre inconnue), le script répond `unavailable` et Ariane n'en parle pas à l'utilisateur ; Diderot continue comme avant. Bharness ne rend jamais un dépôt public ni ne demande d'offre payante pour cela.
- Pour un dépôt public (ou privé en offre payante), GitHub n'ouvre le wiki qu'après la création de sa première page : Ariane le propose une seule fois et guide l'utilisateur pas à pas, ou n'insiste plus s'il refuse.

## [0.10.0] – 2026-10-11

### Ajouté

- La voix d'Ariane, `reference/ariane-voice.md` : une complice enjouée, avec la franchise d'une grande sœur quand il le faut. Elle contient le portrait, des rituels (un début de session en trois lignes : où on en est, la suite, combien de temps ; la phrase de fin « Je garde le fil, tu peux fermer »), des formules à elle, des exemples par situation, et ce qu'elle ne fait pas (enthousiasme en rafale, condescendance, emoji, blague sur un échec).
- Un dosage de l'énergie : haute aux jalons (on fête vraiment), moyenne au travail courant, basse et directe en cas de problème (« je m'en occupe »), sobre si l'utilisateur est pressé, fatigué ou perdu. La voix s'ajuste à l'utilisateur et abandonne l'humour s'il ne prend pas.

### Modifié

- Le portrait d'Ariane dans `agents/ariane.md` et dans le README ; `/bharness:start` et `/bharness:next` lui font lire sa voix. La voix ne rend jamais un message plus long ni plus technique (règles de `communication.md`).
- Socrate, Maxime et Iris gardent leur propre caractère ; Ariane les présente avec un mot d'humour.

## [0.9.0] – 2026-10-11

### Ajouté

- Le journal de bord du projet, `.bharness/log.md` (modèle `templates/log.md`) : Ariane y note, en silence, tout le détail technique (commandes, fichiers, branches, URLs de test, erreurs et solutions) ainsi que toutes ses remarques (bizarreries, risques, limites, choix faits à la place de l'utilisateur). Il est versionné avec le projet, sans secret ni donnée personnelle.
- Référence `reference/communication.md` : comment parler simplement, le test des trois questions avant d'envoyer un message, des exemples avant/après, et la répartition entre le journal de bord, la mémoire, les décisions, l'état et le journal de retours d'expérience.
- Niveau de détail de la conversation, `state.user.detail` (`simple` par défaut, `normal`, `detailed`), déduit du profil et modifié seulement à la demande de l'utilisateur. « C'est trop technique » ramène immédiatement à `simple`.

### Modifié

- Par défaut, Ariane (et Socrate, Maxime et Iris) ne disent plus rien de technique dans la conversation : ni nom de fichier, ni commande, ni mot de développeur, ni nom d'outil, ni trace d'erreur, ni numéro de version. Le détail est donné sur demande, depuis le journal de bord, parfois envoyé en bouton.
- Ariane réécrit toujours les comptes rendus des agents délégués au lieu de les transmettre.
- `/bharness:start`, `/bharness:next`, `/bharness:doctor`, `/bharness:update` et `/bharness:status` suivent la même règle. Les projets existants reçoivent leur journal de bord et leur niveau de détail au prochain `/bharness:next`.

## [0.8.0] – 2026-10-10

### Ajouté

- Les lots : Poucet regroupe les stories en lots de deux à cinq stories qui, ensemble, donnent quelque chose que l'utilisateur peut essayer, chacun avec son but et son scénario de démo. Ariane les présente et l'utilisateur peut demander de regrouper autrement.
- Lancer un lot : avec `/bharness:next`, Ariane lance un lot complet. Chaque story suit toujours le même cycle (Clio, Ada, Thomas en local, Clio, Neil, Thomas en ligne, Diderot, Clio), sans validation humaine entre les stories.
- Une branche par lot, `lot/NN-slug`, qui reçoit les stories par pull request à CI verte. `main` ne reçoit le lot entier qu'après la validation de l'utilisateur.
- Fin de lot : Thomas teste le lot entier et joue le scénario de démo (`docs/qa/lot-NN-rapport.md`), puis Ariane fait la démo avec l'URL de test et le QR code. Refusée, la démo donne des stories de correction dans le même lot.
- Blocages : le lot s'arrête et Ariane prévient l'utilisateur (trois allers-retours Thomas/Ada sans succès, CI rouge après deux corrections, conflit, environnement de test muet, décision à prendre). L'état est enregistré, `/bharness:next` reprend là où le lot s'est arrêté.
- Les projets créés avant les lots sont migrés : un lot par story non terminée.

### Modifié

- La validation 3 porte sur la démo de chaque lot, plus sur celle de chaque story. Statuts des stories : `todo`, `in_progress`, `local_ok`, `on_test`, `in_lot`, `done` (le statut `demo` passe au niveau du lot).
- La CI s'exécute aussi sur les pull requests vers les branches `lot/**`. `/bharness:status`, `/bharness:back` et `/bharness:help` parlent de lots.

## [0.7.0] – 2026-10-10

### Ajouté

- Commande `/bharness:update` : Ariane met Bharness à jour tout de suite, sans question, même si la vérification automatique n'a rien signalé. Elle dit quelle version est installée et laquelle est la dernière, lance la mise à jour, puis demande de rouvrir la session.

### Modifié

- `/bharness:help` et le README listent la nouvelle commande.

## [0.6.0] – 2026-10-10

### Ajouté

- QR code pour essayer l'app sur téléphone : à chaque démo et à la mise en production, Ariane fabrique une page avec le QR code de l'URL (`scripts/qr-code.mjs`) et l'envoie sous forme de bouton. Il suffit de viser le code avec l'appareil photo. La page explique aussi comment installer l'app sur l'écran d'accueil (iPhone et Android).
- Génération sans rien installer et sans connexion : la bibliothèque `qrcode-generator` (MIT) est incluse dans `scripts/vendor/`, avec sa notice.
- Les pages QR sont rangées dans `.bharness/qr/`, ignoré par Git.

### Modifié

- Ariane explique que l'envoi automatique vers WhatsApp n'est pas pris en charge pour l'instant, et propose le QR code.

## [0.5.0] – 2026-10-09

### Ajouté

- Menu des maquettes : Iris crée `docs/maquettes/index.html` (modèle `templates/docs/maquette-index.html`), une carte par écran regroupées par parcours, et un lien « ← Menu » sur chaque écran.
- Ariane propose un bouton « Ouvrir les maquettes dans Chrome » qui ouvre ce menu (ou « Les voir dans l'application »). `scripts/open-file.mjs` accepte `--chrome` (Windows, macOS, Linux) et retombe sur le navigateur par défaut si Chrome est absent.

### Modifié

- Un seul bouton pour toutes les maquettes, au lieu d'un par écran.

## [0.4.0] – 2026-10-09

### Ajouté

- Vérification automatique des mises à jour : au début de `/bharness:next`, Ariane regarde (au plus une fois par jour) s'il existe une nouvelle version et propose de l'installer maintenant ou plus tard (`scripts/check-update.mjs`). Seule la lecture d'un fichier public sur GitHub est faite ; hors ligne, elle se tait.
- Mise à jour faite par Ariane (`scripts/update-plugin.mjs`) : le script retrouve le programme `claude`, y compris dans l'application de bureau Windows où il n'est pas dans le PATH, puis rafraîchit la marketplace et met à jour le plugin.
- Ariane lance aussi le contrôle à la demande de l'utilisateur.

### Modifié

- README et `/bharness:help` : l'explication de la mise à jour décrit le comportement automatique. Les commandes `/plugin …` tapées dans la conversation, qui ne signalaient pas la mise à jour, ne sont plus présentées comme la méthode normale.

## [0.3.1] – 2026-10-09

### Modifié

- Les documents produits ne sont plus collés dans la conversation : Ariane les envoie sous forme de bouton (`SendUserFile`) qui les ouvre d'un clic dans le volet de l'application, mis en forme comme un vrai document. Aux validations, le bouton est envoyé avant de demander l'accord. Les maquettes HTML suivent la même règle.
- Solutions de repli, dans l'ordre : lien cliquable, puis contenu écrit en Markdown mis en forme (jamais dans un bloc de code). `scripts/open-file.mjs` ne sert plus que pour ouvrir une maquette dans le navigateur quand rien d'autre ne marche.

## [0.3.0] – 2026-10-09

### Ajouté

- Ariane montre ce qui est produit directement dans la conversation : le PRD et les écrans en entier avant chaque validation, les autres documents sur proposition. L'utilisateur n'a plus à chercher les fichiers.
- Les documents Markdown s'affichent comme des documents mis en forme (titres, listes, tableaux), jamais dans un bloc de code.
- Les maquettes HTML sont ouvertes dans le navigateur par Ariane (`scripts/open-file.mjs`, Node.js, Windows, macOS et Linux), après une description de chaque écran.

### Modifié

- Socrate, Maxime et Iris suivent la même règle d'affichage.

## [0.2.2] – 2026-10-09

### Modifié

- Les explications sur la mise à jour (README et `/bharness:help`) sont reformulées dans le ton d'Ariane : plus naturel, à la première personne, sans formules figées.

## [0.2.1] – 2026-10-09

### Ajouté

- Section « Mettre à jour Bharness » dans le README et dans `/bharness:help` : rafraîchir la marketplace, mettre à jour le plugin, puis redémarrer la session. Une mise à jour non appliquée faisait croire à tort que les correctifs n'avaient aucun effet.

## [0.2.0] – 2026-10-09

### Ajouté

- Ariane fait connaissance avec l'utilisateur au démarrage (système détecté, familiarité avec le terminal, Git, GitHub et le code, façon d'apprendre) et enregistre son profil dans `state.user` et dans la mémoire du projet.
- Référence `reference/user-profile.md` : principes d'accompagnement et explications prêtes à l'emploi (ouvrir PowerShell ou le Terminal, coller une commande, Git et GitHub, variables d'environnement, fenêtres d'autorisation Windows).

### Modifié

- Ariane et Neil installent eux-mêmes les outils manquants quand c'est possible, et ne demandent plus d'ouvrir un terminal sans l'expliquer.
- `/bharness:doctor` et `/bharness:next` adaptent leurs explications au profil de l'utilisateur.

## [0.1.0] – 2026-10-09

### Ajouté

- Plugin Claude Code `bharness` et sa marketplace.
- Onze agents : Ariane, Socrate, Maxime, Iris, Gustave, Poucet, Ada, Thomas, Clio, Diderot, Neil.
- Commandes : `start`, `next`, `status`, `back`, `docs`, `doctor`, `remember`, `feedback`, `help`.
- Savoir-faire : stack Next.js + Supabase, Git et CI, tests, déploiement Vercel.
- Mémoire du projet (`.bharness/memory.md`) et journal de retours d'expérience avec accord de l'utilisateur.
- Garde-fous Git et anti-secrets (Node.js, compatibles Windows).
- Modèles de documents (brief, PRD, écrans, architecture, story, rapport de test, déploiement, wiki) et de projet (CLAUDE.md, permissions, CI, modèle de pull request).
