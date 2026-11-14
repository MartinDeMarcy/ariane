# Changelog

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions : [SemVer](https://semver.org/lang/fr/).

## [0.25.0] – 2026-11-14

### Ajouté

- **La session prend le nom de ce qu'on fait.** Lancé dans une conversation vierge, `/ariane:next` ou `/ariane:status` renomme la session (« Booker · Lot 11 : Les réparations », « Booker · Démo du lot 10 », « Booker · Le cahier des charges »…). `state-brief.mjs` calcule ce `title` à partir de l'état, donc le nom est le même à chaque fois ; il tient en 60 caractères. Dans l'application de bureau seulement : sans l'outil de renommage, ou si l'utilisateur refuse, rien ne se passe.
- **Un bouton pour la session suivante.** Quand un lot est fusionné, Ariane propose « Ouvrir la session suivante » (recommandé), « Effacer cette conversation » ou « Continuer ici ». Le premier ouvre une session neuve, nommée d'après le prochain travail, qui lance `/ariane:next` toute seule ; le deuxième efface la conversation (`/clear`). Sans les outils de l'application (terminal), Ariane redonne la consigne en texte comme avant.
- `/ariane:status` passe lui aussi par `state-brief.mjs` au lieu de lire `state.json` en entier.

### Corrigé

- **`update-plugin.mjs` échouait sous Windows avec « code null »** (donc `/ariane:update` aussi) : `where claude` rend d'abord le script sans extension que npm installe pour les shells Unix (`…\npm\claude`), que Windows ne sait pas lancer. Le script ne garde plus que ce que Windows sait lancer et vise directement le `claude.exe` rangé à côté du `.cmd` de npm ; un code nul affiche maintenant sa cause (`ENOENT`…).
- **Deux consignes qui se contredisaient** : `ariane.md` disait de ne jamais proposer de nouvelle session, alors que `/ariane:next` la propose entre deux lots. La première vaut en cours de lot, la seconde entre deux lots.

## [0.24.0] – 2026-11-14

La conversation d'Ariane relit environ 30 millions de tokens par lot sur Booker : un tiers pour le socle de l'application, un quart à un tiers pour sa mise en route (plus de 60 000 tokens chargés au démarrage), le reste pour ce qui s'ajoute pendant le lot. Cette version allège la mise en route et ce qui entre dans la conversation.

### Ajouté

- **`scripts/state-brief.mjs`** : un résumé de `state.json` en deux kilo-octets (phase, lot en cours et ses stories, dernières étapes, version en cours, compteurs), au lieu des 30 à 45 Ko du fichier entier. `--lot <NN>` et `--story <NNN>` donnent le détail d'un lot ou d'une story, `--history <n>` plus d'étapes.

### Modifié

- **`/ariane:next` charge moins au démarrage** : Ariane lit `state-brief.mjs` au lieu de `state.json`, et cherche dans `workflow.md` et `user-profile.md` (30 Ko à eux deux) la seule section dont elle a besoin, au lieu de les lire en entier. Elle garde sa fiche, sa voix et le guide de communication.
- **Les spécialistes groupent leurs appels d'outils** : sur Booker (lots 09 et 10), Ada faisait 1,39 outil par échange avec le modèle (25 % d'échanges groupés), Clio 1,62, Thomas 1,43, Neil 1,18, et chaque échange relit toute la conversation (100 000 tokens ou plus). La section « Lire peu » de `handoff.md` demande maintenant d'envoyer dans un même message tout ce qui ne dépend pas du résultat précédent (lectures de départ, fichiers à écrire, commandes Git enchaînées avec `&&`, vérifications de lecture), avec les cas à ne pas grouper ; Ada, Thomas, Clio, Neil et Ariane la rappellent. À vérifier au lot suivant : le nombre d'outils par échange doit monter vers 1,7.
- **Les fiches de passage sont plafonnées** : 300 caractères par ligne, 900 pour la fiche entière (elles atteignaient 2 500 à 5 000 caractères). Le détail reste dans le journal de bord et le rapport.

## [0.23.0] – 2026-11-14

Diderot coûtait trop cher en fin de lot : sur Booker, la mise à jour du wiki du lot 10 a pris 102 échanges avec un contexte de 200 000 tokens (168 éditions une par une), parce que le wiki avait atteint 1,2 Mo et que chaque lot y ajoutait des encadrés « Version » et des sections d'historique.

### Ajouté

- **`/ariane:clean`** : remet le wiki et les fichiers du projet d'aplomb, entre deux lots. `scripts/clean.mjs` range sans dépenser de tokens (historique d'état, notes des lots terminés, journal de bord, historique du wiki, sorties d'outils de plus de deux jours dans `.ariane/tmp`) et liste ce qui reste trop gros : pages du wiki, notes du carnet, `decisions.md`, `issues.md`, mémoire. Diderot condense ces fichiers trois par trois (quatre passages au plus par commande), en rangeant ce qu'il retire dans `docs/wiki/archives/` ou `.ariane/history/` ; Clio enregistre. Les documents de référence très gros (PRD, architecture, UX) sont signalés, pas condensés. `archive-state.mjs --clean` sert de base.
- **Un nettoyage tous les deux lots, automatique.** Une fois un lot fusionné, Ariane lance `clean.mjs --due` : si deux lots sont terminés depuis le dernier nettoyage (ou si le projet n'a jamais été nettoyé), elle déroule `/ariane:clean` avant de proposer la conversation neuve. Le dernier nettoyage est noté dans `state.last_clean` (`clean.mjs --done`, seulement si plus rien n'est à condenser ; sinon le nettoyage reviendra au lot suivant).
- **Le rangement de fin de lot range aussi l'historique du wiki** : `archive-state.mjs` garde les trois derniers lots dans `docs/wiki/historique.md` et déplace les autres dans `docs/wiki/archives/historique.md`, sans rien perdre (sur Booker : 122 Ko ramenés à 16 Ko). Il mesure aussi chaque page du wiki et signale dans `wiki_over` celles qui dépassent 25 000 caractères.

### Modifié

- **Diderot garde le wiki léger** : une page décrit l'état d'aujourd'hui (plus d'encadré « Version x.y.z » ni de section « ajouté ensuite »), `ecarts.md` ne garde que les écarts ouverts, les pages transversales ne sont retouchées que là où le lot les change, et il n'ouvre jamais `archives/`.
- **Diderot groupe ses appels** : plusieurs lectures dans une commande, et toutes les éditions indépendantes dans un même message, au lieu d'une édition par échange.
- **Les grosses pages se condensent par petits groupes** : quand `wiki_over` n'est pas vide, Ariane demande à Diderot de condenser les trois plus grosses pages, pas plus, à chaque lot.

## [0.22.1] – 2026-11-14

### Corrigé

- **`check.mjs --e2e` trouve le projet « ordinateur » tout seul.** Il visait toujours un projet Playwright nommé `desktop` ; sur Booker, où il s'appelle `bureau`, Ada et Thomas devaient le contourner à chaque fois en lançant Playwright à la main. Le script lit maintenant les projets dans `playwright.config` (`desktop`, `bureau`, `chromium`…) et, faute de projet reconnu, ne filtre pas. `--device <nom>` en force un.

## [0.22.0] – 2026-11-12

Moins de tokens consommés : sur Booker, le lot 08 avait coûté 77 % de tout le projet, parce que les agents relisaient à chaque échange un contexte de plus de 200 000 tokens.

### Ajouté

- **`scripts/check.mjs`** : lance lint, types, tests unitaires, build ou tests de bout en bout et n'affiche que le bilan et la première erreur. La sortie complète est gardée dans `.ariane/tmp/check-<étape>.log`, où l'on cherche au lieu de relancer. Ada et Thomas passent toujours par lui.
- **Le rangement de fin de lot range aussi le journal de bord** : `archive-state.mjs` garde les quinze dernières entrées de `.ariane/log.md` et range les autres dans `.ariane/history/` (sur Booker : 220 Ko ramenés à 60 Ko). Il mesure aussi les notes du carnet technique : une note de plus de 15 000 caractères est condensée par Diderot.

### Modifié

- **Ada et Thomas travaillent avec `sonnet` par défaut.** Ariane lance Ada avec `opus` seulement pour une story « socle » ou « grosse », ou pour une story qui revient « à corriger » pour la deuxième fois.
- **Ada et Thomas gardent leur conversation légère** : seulement le fichier de test en cours pendant le développement, toute la suite une fois à la fin, les gros documents lus par passages, pas de relecture d'un fichier qu'on vient de modifier.
- **Une conversation neuve à chaque lot** : une fois le lot fusionné, Ariane propose d'ouvrir une nouvelle conversation (ou `/clear`) avant `/ariane:next`, au lieu de tout enchaîner dans la même.
- **Poucet borne la taille des stories** (cinq critères et une dizaine de fichiers au plus), annonce « Migration : oui / non » et marque les stories « socle » ou « grosse ».
- **Gustave met l'architecture à jour sur place** pour une version, au lieu d'ajouter une seconde section « Modèle de données » ou « Tests » : la section « Version x.y.z » ne garde que les changements, le plan de passage et l'ordre de construction.
- Les entrées du journal de bord restent courtes (moins de 1 000 caractères).

## [0.21.1] – 2026-11-12

### Ajouté

- **L'icône du plugin** (`plugins/ariane/.claude-plugin/icon.png`).

## [0.21.0] – 2026-11-11

### Ajouté

- **Le parcours du lot dans le panneau** : sous le titre du lot, cinq étapes (Stories, Test du lot, Démo, Documentation, Version stable), cochées, en cours ou à venir. La phrase du haut dit qui travaille (« Diderot met la documentation à jour », « Clio le verse dans la version stable »), et la pastille du lot passe à « Validé » puis « Dans la version stable ».
- **`lots[].step` dans l'état** : Ariane y note l'étape du lot au moment où elle commence (`stories`, `test`, `demo`, `wiki`, `merge`, `done`). Sans cette note (lots anciens), le panneau la déduit du statut.

### Modifié

- **Les maquettes d'Iris montrent l'application telle qu'elle sera** : vrais composants de la stack, vrai contenu, états vide, erreur et réussite, écrans qui réagissent et s'enchaînent, cadre de téléphone. Sur une application qui existe déjà, Iris part de son thème, de ses composants et de ses captures. Les maquettes sont publiées en artefact dans l'application quand c'est possible, sinon ouvertes dans le navigateur.
- **Ada construit d'après la maquette validée** : même disposition, mêmes libellés, mêmes états ; elle signale tout écart.
- **« Construire » reste l'étape en cours jusqu'à la fusion du lot** : la documentation et la fusion, après la validation, font partie du lot. Le lot ne passe à `done` qu'une fois versé dans `main`.

### Corrigé

- **Un lot fini avant la conception** (le lot d'entretien d'une nouvelle version) : la phrase du haut ne dit plus « Le lot 07 avance » une fois le lot validé, elle annonce l'étape en cours. La carte « Construire », encore « À venir », n'affiche plus « Tous les lots validés » en vert mais « D'autres lots à venir ».

## [0.20.10] – 2026-11-11

### Corrigé

- **Dates des derniers pas** : un pas noté sans heure s'affichait « Aujourd'hui » au-dessus de pas datés « Il y a 13 min », alors qu'il est plus récent. Le panneau le borne maintenant par le dernier pas daté qui le précède : « Moins de 13 min », « Moins de 3 h ».
- **Heure dans le journal** : la commande `/ariane:next` et le déroulé rappellent qu'une ligne de `history` porte toujours l'heure et un résumé court, pour qu'Ariane ne note plus la date seule.

## [0.20.9] – 2026-11-11

### Ajouté

- **Un rond qui tourne sur « Continuer » et « Où on en est »** entre le clic et le départ de la commande dans la conversation, pour montrer que le clic a été pris. Un second clic pendant ce temps ne relance rien.

## [0.20.8] – 2026-11-11

### Corrigé

- **Boutons « Continuer » et « Où on en est »** : ils lancent maintenant la commande d'Ariane pour de bon (`$.command.run`). Avant, le panneau envoyait `/ariane:next` comme un simple message, qui n'était pas lu comme une commande. Si le lancement échoue, le panneau le dit.
- **Étape en cours quand un lot avance** : dès qu'un lot est en route, l'étape en cours est « Construire », même si l'état dit encore « écrans » ou « architecture » (cas du lot d'entretien d'une nouvelle version, lancé avant la fin de la conception).

## [0.20.7] – 2026-11-11

### Modifié

- **Fenêtre de la boîte à idées** : elle montre toutes les idées en attente, sans limite, avec qui a eu l'idée (« Toi », « Léonard »…) et la date. Chaque idée a un bouton « Écarter » : sa ligne passe dans la section « Écartées » de `.ariane/ideas.md`, datée, sans être effacée.
- **Les fenêtres prennent la place du panneau** tant qu'elles sont ouvertes, au lieu d'être posées par-dessus : une fenêtre plus haute que le panneau défile comme lui.

## [0.20.6] – 2026-11-11

### Modifié

- **Les derniers pas tiennent en quelques mots** : le panneau affiche un résumé de chaque pas au lieu d’un texte long coupé. Ariane et Clio écrivent ce résumé dans `state.history` (`short`, six mots au plus) ; pour les lignes plus anciennes, le panneau garde le début de l’événement, jusqu’à sa première précision.

## [0.20.5] – 2026-11-11

### Modifié

- **Les derniers pas** disent quand, comme on le dirait : « il y a 15 min », « il y a 3 h » (jusqu’à six heures), « aujourd’hui à 9h05 », « hier à 18h30 », puis la date seule. Le panneau se redessine chaque minute pour rester juste.
- **L’historique est daté avec l’heure** : Ariane et Clio écrivent `date` au format `2026-11-11T14:32` dans `state.history`. Les lignes déjà écrites sans heure affichent « aujourd’hui », « hier » ou la date.

### Retiré

- **Le fondu d’ouverture des fenêtres**, qui rendait mal. Le trait qui se trace sous le titre est gardé.

## [0.20.4] – 2026-11-11

### Modifié

- **Ouverture des fenêtres** : un fondu remplace la remontée en trois crans, qui était saccadée. Le fondu se joue dans une image posée sur la fenêtre, sans redessiner le panneau. Le trait qui se trace sous le titre est gardé.

## [0.20.3] – 2026-11-11

### Modifié

- **Fenêtre de la boîte à idées** : elle contient une zone pour noter une idée, au-dessus de la liste.
- **Accès rapides** : le bouton devient un petit bouton « ↗ » en haut du panneau, à droite du statut, au lieu d'être dans la rangée du bas.
- **Ouverture des fenêtres** : la fenêtre remonte à sa place en trois crans, et un trait se trace sous son titre.

## [0.20.2] – 2026-11-11

### Modifié

- **Accès rapides** : le bloc de liens devient un bouton « Accès rapides », à côté de « Continuer » et « Où on en est ». Il ouvre une fenêtre posée par-dessus le panneau, avec pour chaque adresse une courte description et un bouton « Ouvrir » qui la lance dans le navigateur de la machine.
- **Liste des idées en attente** : elle s'ouvre dans une fenêtre posée par-dessus le panneau, avec un bouton « Fermer », au lieu de se déplier dans la boîte à idées. Le reste du panneau ne bouge plus et ne se resserre plus quand on l'ouvre. Jusqu'à douze idées affichées.

## [0.20.1] – 2026-11-11

Retours du premier essai du panneau sur le projet Booker.

### Ajouté

- **Liste des idées en attente** : dans la boîte à idées, le compteur « N en attente » est un bouton qui déplie les huit idées les plus récentes, et les replie.
- **Accès rapides** : un bloc de liens vers les adresses connues du projet (site en ligne, dépôt GitHub, tableau de bord Vercel, projets Supabase de test et de production, wiki). Seuls les liens dont l'adresse est dans `.ariane/state.json` apparaissent.
- **Démo de test du panneau**, pour le développement d'Ariane : ouvert dans le dépôt d'Ariane lui-même, sans projet en cours, le panneau affiche un projet fictif, avec « démo de test » dans son titre, un bandeau de mesures et deux boutons pour faire défiler les jeux d'essai (cadrage, construction, démo d'un lot, projet en ligne) et les niveaux de densité. Dans la démo, les boutons ne lancent rien et aucune idée n'est écrite. Ailleurs, rien ne change.

### Corrigé

- **Boîte à idées** : la zone de saisie fait deux lignes et prend la largeur du cadre, au lieu d'un champ court d'une ligne.
- **Les derniers pas** : affichés sur toute la largeur du panneau, « La suite » dessous, au lieu de deux colonnes où les libellés étaient coupés.
- **Carte « Construire »** : une étape terminée sans lot dans le fichier d'état affiche « Construction terminée » au lieu de « Pas encore », qui contredisait la pastille « Terminé ».

## [0.20.0] – 2026-11-11

Reprise de la branche `feat/ariane-journal-decisions-risques`, écrite d'après les retours du projet Booker, et adaptée au parcours actuel.

### Ajouté

- **Le journal de retours est tenu à chaque lot.** Ariane écrit une entrée, en silence, à la fin de chaque lot (avant la démo, puis à sa validation), à la mise en production et à chaque blocage, et rattrape au début de `/ariane:next` les entrées manquantes depuis `log.md`, `decisions.md` et l'historique. Retour de Booker : le journal s'arrêtait au lot 02 parce que le déroulé d'un lot n'avait aucune étape « journal ».
- **Garder les décisions à jour** : un changement qui remplace une décision consignée (fournisseur d'e-mails, outil, périmètre…) est écrit dans `decisions.md` avec la date, l'ancien choix, le nouveau, qui l'a décidé et pourquoi. Les spécialistes reçoivent les décisions qui touchent leur tâche et signalent tout écart dans leur fiche de passage ; Ariane demande confirmation à l'utilisateur et relit `decisions.md` avant la relecture du wiki et avant la validation 4. Retour de Booker : le passage de Gmail à Resend n'avait jamais été consigné.
- **Les risques acceptés sont représentés avant chaque mise en ligne.** Les remarques non bloquantes de Thomas et de Neil sont présentées à la démo du lot, une par une (« Accepté pour l'instant » ou « À corriger dans ce lot ») ; chaque risque accepté va dans `decisions.md` et dans la section « Risques acceptés pour l'instant » du registre des correctifs. À l'étape `release`, Ariane les repasse en revue : toujours accepté, à corriger avant, ou juste après. (La branche les rangeait dans une clé `state.accepted_risks` ; ils vont ici dans le registre des correctifs, qui existe depuis la 0.19.0, pour ne pas alourdir le fichier d'état.)

### Modifié

Les trois savoir-faire techniques reprennent ce que le projet Booker a appris en conditions réelles.

- **`deploy-vercel` (Neil)** : limite de 2 projets Supabase gratuits actifs (vérifiée d'abord, jamais de mise en pause à la place de l'utilisateur) ; ordre Supabase de test, socle de Clio, puis Vercel (`/ariane:next` suit le même ordre) ; migrations et configuration de production avec `--remote=<réf>` et une copie de `supabase/` hors dépôt ; section « Les e-mails » ; effets de bord de `vercel link` ; `vercel deploy --prod` à lancer par l'utilisateur ; ne jamais promouvoir une prévisualisation en production ; recherche des déploiements par SHA ; liste de vérification en lecture seule de la production, dont les en-têtes de sécurité.
- **`stack-nextjs-supabase` (Gustave, Ada)** : Next.js 16 (`proxy.ts`, `eslint .`), `@serwist/turbopack`, version de npm, `AGENTS.md`, `.gitattributes` ; checklist de la barre de navigation mobile ; en-têtes de sécurité dès la coque ; redirection ouverte, cookie de session, anti-énumération, identifiants mal encodés ; tâches planifiées protégées par secret ; envoi d'e-mails qui ne bloque jamais l'action.
- **`testing` (Thomas, Ada)** : attendre l'hydratation plutôt que `networkidle` ; tests qui ne se gênent pas ; jamais d'e-mail réel en test (faux serveur SMTP) ; contrôles de sécurité sur ce que la story ajoute ; ce que l'émulation mobile ne prouve pas ; rapport qui distingue « à confirmer » et « OK ». La méthode des tranches (sonde, pause, pilote unique) est gardée, mais réservée à la grande passe d'avant mise en production : à la fin d'un lot, la règle reste une passe en local et la démo seule en ligne.

## [0.19.0] – 2026-11-11

### Ajouté

- **Le cycle des versions, après le MVP** (`reference/versions.md`). Une fois la première version en ligne, le projet continue par versions faites d'un à quatre lots : correctif (`x.y.Z` : bugs et sécurité seulement), évolution (`x.Y.0` : des nouveautés sans rien casser) ou refonte (`X.0.0` : un changement cassant, avec un plan de passage). Ariane propose le type d'après le contenu, l'utilisateur confirme.
- Une phase `ideation` pour préparer une version : le point sur ce qui attend, l'envie de l'utilisateur, les suggestions de Léonard, puis la liste courte composée avec l'utilisateur. Les phases du MVP sont ensuite rejouées en plus court (section « Version x.y.z » dans le PRD et l'architecture, écrans modifiés seulement, numéros de lots et de stories qui continuent). Un correctif prend un chemin court : un seul lot, sans idéation ni PRD.
- **Léonard, l'inventeur** (`agents/leonard.md`), douzième spécialiste : en lecture seule, il regarde l'application telle qu'elle est et propose cinq évolutions au plus, avec ce qu'elles apportent et ce qu'elles coûtent. Il ne repropose pas ce qui a été écarté.
- **Le registre des correctifs**, `.ariane/issues.md` (modèle `templates/issues.md`) : bugs signalés, remarques non bloquantes de Thomas, failles et risques acceptés « pour l'instant », avec leur gravité. Ariane y note un problème dès qu'elle l'entend ; `/ariane:bug` fait la même chose. Une faille ou un bug bloquant devient un correctif urgent, proposé tout de suite.
- **Occam, le relecteur du code** (`agents/occam.md`), treizième spécialiste, et **le lot d'entretien** proposé à chaque évolution et à chaque refonte. Occam relit le code dans son ensemble et sa façon de fonctionner, en partant des mesures (plus gros fichiers, fichiers les plus modifiés, dépendances, durée des tests), et écrit `docs/entretien/v<version>.md` : huit propositions au plus, avec leur gain, leur risque et leur taille. Il ne modifie pas le code : Ada réalise, Thomas vérifie, dans un lot à part où le comportement ne change pas.
- **L'entretien est présenté à la mesure de l'utilisateur** : deux phrases simples et un oui ou un non à un néophyte ; le rapport complet et le choix proposition par proposition à un développeur confirmé, ou dès qu'on le demande.
- Règles pour un code qui reste propre : un lot par sujet, rien ne traîne en fin de version, notes de version dans le `CHANGELOG.md` du projet (Diderot).
- Branches : un correctif urgent pendant qu'une version est en cours part de l'étiquette en production (`release/x.y.Z`), pas de `main`, puis est reporté dans `main`.
- État : `state.cycle` (la version en cours) et `state.counters` (derniers numéros de lot et de story). À une mise en ligne, `scripts/archive-state.mjs --version` range aussi les lots et les stories livrés dans `.ariane/history/vx.y.z.md`.

## [0.18.0] – 2026-11-11

### Modifié

- **Trois lancements par story au lieu de huit.** Le cycle devient : Ada développe, Thomas vérifie en local, Clio enregistre, pousse, fusionne dans la branche du lot et crée la branche de la story suivante, en un seul passage. L'environnement de test, les tests de bout en bout en ligne et le wiki ne se font plus story par story mais **une fois par lot** : Thomas teste le lot entier, Diderot met le wiki à jour pour toutes ses stories après la validation. Le statut `on_test` n'est plus utilisé (il reste lu pour les anciens projets).
- **La fiche de passage** (`reference/handoff.md`) : Ariane envoie un brief de dix lignes au plus, fait de chemins et non de contenus ; chaque spécialiste écrit lui-même le détail dans le journal de bord et rend cinq lignes (`Statut`, `Fait`, `Fichiers`, `À savoir`, `Difficultés`). Ariane ne réécrit plus les comptes rendus dans le journal. Les spécialistes lisent seulement les passages utiles.
- **Un modèle plus léger pour trois spécialistes** : Clio (`haiku`), Diderot et Poucet (`sonnet`). Ada, Thomas, Gustave, Neil et Cassandre gardent le modèle de la session.
- **`/ariane:next` range la conversation** : si elle occupe déjà plus d'un tiers de la fenêtre de contexte, elle est compactée avant de continuer, avec la consigne de garder l'état du projet, les décisions pas encore écrites et les préférences de l'utilisateur. Plus besoin d'ouvrir une nouvelle session entre deux lots.

- **La validation d'un lot par Thomas est bornée**, d'après les journaux d'un vrai projet où elle a pris jusqu'à 2 h 25 : environ 490 tests de bout en bout rejoués en ligne à chaque fin de lot, par tranches de 20 avec des pauses, à cause du point de contrôle de sécurité de Vercel (après environ 40 tests navigateur) et des limites de débit de Supabase. Désormais : les tests du lot seulement, **en local** sur l'app construite pour la production ; en ligne, **la démo seulement**, une fois, sous 40 tests navigateur ; une relance ciblée par test en échec ; vingt minutes au plus ; arrêt immédiat (« bloqué ») si l'environnement ou Vercel bloque, sans attente ni découpage en tranches ; pas d'audit d'ensemble à chaque lot ; six captures au plus. Deux allers-retours de correction avec Ada au plus, puis c'est un blocage remonté à l'utilisateur.
- **Moins de tests de bout en bout** : cinq au plus par story, écrits par Ada et mis au point en local ; les cas limites, les erreurs et les droits vont dans Vitest. Thomas n'écrit plus qu'un test, celui du scénario de démo.
- Playwright est configuré pour aller vite : limite de temps par test et pour la suite, arrêt après cinq échecs, sortie d'une ligne par test, le mobile ne rejoue que les parcours marqués `@mobile`, démarrage automatique de l'app en local.
- Comptes de test sans e-mail (créés par l'API d'administration), une session partagée par suite, et limites de débit relevées sur le projet Supabase de test.

- **La mémoire du projet est plafonnée** à 60 entrées d'une ligne : elle est chargée dans chaque session et dans chaque spécialiste lancé (sur un vrai projet, elle avait atteint 200 entrées et près de 26 000 tokens). Elle ne garde que l'essentiel à appliquer tout le temps.

### Ajouté

- **Le carnet technique**, `.ariane/notes/<sujet>.md` (modèle `templates/notes.md`) : les recettes, contournements et détails d'outils, par sujet, lus seulement par l'agent qui travaille dessus. La mémoire en garde la liste.
- **L'historique par lot et par version**, `.ariane/history/` : à la fin de chaque lot et à chaque mise en production, `scripts/archive-state.mjs` y range les anciennes lignes de `state.history` (les 20 dernières restent) et les notes des stories terminées, et mesure la mémoire ; Ariane fait le tri si elle dépasse. Rien n'est supprimé. Sur un vrai projet, le fichier d'état passe de 70 Ko à 20 Ko.
- Un rangement unique pour les projets dont la mémoire a déjà grossi, au premier `/ariane:next`.
- **La grande passe de tests d'avant mise en production** (temps 4 de Thomas) : toute la suite en local sur ordinateur et mobile, les parcours principaux et les démos de lots en ligne (seul moment où les tranches sont permises), et la revue d'ensemble (sécurité, données, téléphone, accessibilité, risques acceptés). Rapport `docs/qa/release-<version>-rapport.md`, une heure et demie au plus, avant la validation 4.
- **Un compteur de tokens à chaque étape** (`hooks/token-meter.mjs`) : à la fin de chaque spécialiste et de chaque tour de conversation, il mesure ce qui a été consommé et l'ajoute à `.ariane/feedback/tokens.jsonl`, puis régénère `.ariane/feedback/tokens.md` (en tout, par phase, par agent, par lot, par story, par étape). Il tourne hors de la conversation, ne consomme rien, n'envoie rien, et n'écrit que si l'utilisateur a accepté le journal de retours d'expérience. `/ariane:feedback` reprend ces tableaux.

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
