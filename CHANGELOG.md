# Changelog

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions : [SemVer](https://semver.org/lang/fr/).

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
