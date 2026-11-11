# Le parcours avec Ariane

Ce document est la référence commune à toutes les commandes et à tous les agents. **Ariane dirige tout le parcours, de A à Z** : c'est elle qui lance chaque spécialiste, relit son travail et en rend compte à l'utilisateur. Il décrit les phases, qui les mène, ce qu'elles produisent et quand on passe à la suite.

## Deux façons de faire travailler un agent

- **Incarné (dialogue)** : la conversation principale *devient* l'agent. Elle lit sa fiche (`agents/<nom>.md`), adopte sa personnalité et dialogue directement avec l'utilisateur. Utilisé quand il faut poser des questions : Ariane, Socrate, Maxime, Iris.
- **Délégué (autonome)** : la conversation principale lance le sous-agent `ariane:<nom>` avec l'outil Agent, en lui donnant tout le contexte nécessaire (chemins des documents, story en cours, fichiers de savoir-faire à lire). Le sous-agent travaille seul et rend un compte rendu. Utilisé pour : Cassandre, Léonard, Occam, Gustave, Poucet, Ada, Thomas, Clio, Diderot, Neil.

Un sous-agent délégué ne voit pas la conversation : le message de délégation doit tout contenir. Après chaque délégation, Ariane résume le résultat à l'utilisateur en une à trois phrases simples.

## Les phases

| # | Phase (`phase`) | Agent | Mode | Produit | Porte de validation |
|---|---|---|---|---|---|
| 0 | `onboarding` | Ariane | incarné | `.ariane/state.json`, `CLAUDE.md`, `.claude/settings.json`, dépôt GitHub | — |
| 1 | `maturity` | Ariane | incarné | `state.maturity` | l'utilisateur confirme le niveau |
| 2 | `brief` | Socrate, puis Cassandre | incarné (Socrate), délégué (Cassandre) | `docs/01-brief.md`, `state.challenge.brief` | — |
| 3 | `prd` | Maxime, puis Cassandre | incarné (Maxime), délégué (Cassandre) | `docs/02-prd.md`, `state.challenge.prd` | **Validation 1 : le PRD** |
| 4 | `ux` | Iris | incarné | `docs/03-ux.md` + maquettes | **Validation 2 : les écrans** |
| 5 | `architecture` | Gustave | délégué | `docs/04-architecture.md`, projet Next.js initialisé, Supabase de test relié | — |
| 6 | `planning` | Poucet | délégué | `docs/stories/NNN-nom.md`, `state.stories`, `state.lots` | — |
| 7 | `build` | Ada, Thomas, Clio, Neil, Diderot | délégué | code, tests, branches, environnements de test, wiki | **Validation 3 : démo de chaque lot** |
| 8 | `wiki` | Diderot | délégué | `docs/wiki/` relu et complet | — |
| 9 | `release` | Clio puis Neil | délégué | `release/x.y.z`, étiquette, app en production | **Validation 4 : la mise en ligne** |
| 10 | `done` | Ariane | incarné | bilan, puis préparation de la version suivante (`reference/versions.md`) | — |

Une phase passe à `done` seulement quand son livrable existe et, s'il y a une porte, quand l'utilisateur l'a validée. La date de validation est notée dans `state.gates`.

## Phase 1 : le niveau de maturité

Ariane pose trois questions simples (outil AskUserQuestion) :

1. Qui utilisera l'app : toi seul, quelques proches, ou le public ?
2. Y aura-t-il des données personnelles sensibles ou des paiements ?
3. Est-ce un essai pour tester l'idée, ou un outil dont des gens vont dépendre ?

Elle recommande un niveau (MVP, alpha, bêta, production) et l'explique en une ou deux phrases. L'utilisateur confirme ou choisit un autre niveau.

- **MVP** : on continue.
- **Autre niveau** : Ariane explique qu'elle ne prend en charge que les MVP pour l'instant, propose de viser d'abord un MVP, et si l'utilisateur refuse, met `phase` à `stopped` et s'arrête là.

## Phase 2 : le brief, et la contradiction

1. **Socrate** mène la conversation et résume l'idée en cinq lignes ; l'utilisateur confirme.
2. **Ariane lance Cassandre** (délégué, en lecture seule) avec ce résumé. Cassandre rend cinq objections au maximum, classées par gravité.
3. **Socrate répond** à chaque objection ; Ariane transmet à Cassandre, qui a **une seule réplique** (levée, maintenue, aggravée). Un seul tour.
4. **Ariane juge** : elle ne remonte à l'utilisateur que ce qui passe ses quatre filtres (grave, propre à cette idée, tranchable maintenant, pas déjà réglé), au plus trois questions, une à la fois, souvent une seule, parfois aucune. Voir « Faire contredire l'idée par Cassandre, et trancher » dans `ariane.md`.
5. **Socrate écrit le brief** en tenant compte des décisions de l'utilisateur, avec la section « Points de vigilance ».
6. `state.challenge.brief` est renseigné (`status`, `rounds`, `raised`, `at`) ; le détail du débat va dans le journal de bord, les décisions dans `decisions.md`. L'utilisateur peut refuser la contradiction (`skipped`).

## Phase 3 : le PRD, et la relecture de Cassandre

1. **Maxime** classe les fonctionnalités avec l'utilisateur et écrit `docs/02-prd.md` **en brouillon**.
2. **Ariane lance Cassandre** (délégué, en lecture seule) avec les chemins du brief et du PRD. Elle rend cinq objections au maximum : périmètre, critères vérifiables, parcours, cas limites, cohérence avec le brief, droits et données, dépendances.
3. **Maxime répond** à chaque objection ; Ariane transmet à Cassandre, qui a **une seule réplique**. Un seul tour.
4. **Ariane juge**, avec les mêmes filtres que pour l'idée : au plus trois questions, une à la fois, souvent une seule, parfois aucune. Les simples précisions de rédaction, Maxime les corrige sans déranger l'utilisateur.
5. **Maxime met à jour le PRD** (section « Points de vigilance »), l'envoie à l'utilisateur et demande la **Validation 1**. Ariane peut dire en une phrase que Cassandre a relu le PRD et ce que ça a changé, si ça a changé quelque chose.
6. `state.challenge.prd` est renseigné (`status`, `rounds`, `raised`, `at`) ; le détail du débat va dans le journal de bord. Un refus de la contradiction (`skipped`) vaut pour tout le projet.

## Phase 6 : le découpage en lots

Poucet découpe le PRD en stories, puis les regroupe en **lots**. Un lot réunit deux à cinq stories qui, ensemble, donnent quelque chose que l'utilisateur peut essayer (« je peux m'inscrire et réserver un créneau »). Le premier lot contient le socle et une première fonctionnalité visible. Chaque lot a un **scénario de démo** : trois à cinq gestes que l'utilisateur fera pour l'essayer. Un lot peut ne contenir qu'une story.

Ariane montre les lots à l'utilisateur (nom, but, stories) ; il peut demander de regrouper autrement.

## Phase 7 : la boucle d'un lot

L'utilisateur **lance un lot** (`/ariane:next`). Les agents le déroulent ensuite d'un bout à l'autre, story après story, **sans validation humaine entre les stories**. La seule validation est la démo, à la fin du lot. Pendant le lot, Ariane ne dérange l'utilisateur qu'en cas de blocage.

### Les branches

- `lot/NN-slug` : créée par Clio depuis `main` au lancement du lot ; elle réunit les stories terminées. Vercel lui crée son environnement de test.
- `feature/NNN-slug` : une par story, créée par Clio depuis la branche du lot (la première au lancement du lot, les suivantes à la fin de la story précédente) et fusionnée dans celle-ci par pull request (CI verte).
- `main` ne reçoit le lot entier, par une pull request, qu'après la validation de l'utilisateur.

### Le cycle d'une story : trois lancements

Pour chaque story du lot, dans l'ordre :

1. **Ada** développe la story en local sur sa branche, avec ses tests unitaires, fonctionnels et son test de bout en bout, mis au point en local (statut `in_progress`). L'app locale est branchée sur le **Supabase de test** (pas de base locale).
2. **Thomas** vérifie en local : tests unitaires, tests fonctionnels, critères d'acceptation. En cas d'échec, retour à Ada (statut `local_ok` seulement quand tout passe).
3. **Clio**, en **un seul passage** : enregistre le travail en commits normalisés, pousse la branche, ouvre la pull request **vers la branche du lot**, la fusionne une fois la CI verte (statut `in_lot`), puis crée la branche de la story suivante.

Les tests sur l'environnement de test en ligne et la mise à jour du wiki ne se font plus story par story : ils se font **une seule fois, à la fin du lot**. Il n'y a **aucune** démo à l'utilisateur à ce stade. Puis on passe à la story suivante du lot.

Chaque lancement suit `reference/handoff.md` : un brief court fait de chemins, une fiche de passage de cinq lignes en retour, le détail écrit par le spécialiste dans le journal de bord.

### La fin du lot

Quand toutes les stories du lot sont `in_lot` :

1. **Neil** récupère l'URL de prévisualisation de la branche du lot et vérifie qu'elle répond.
2. **Thomas** lance **les tests du lot seulement, en local** sur l'app construite pour la production, écrit le test du scénario de démo (qui fait les captures), joue **la démo seulement** sur l'environnement en ligne, et rédige `docs/qa/lot-NN-rapport.md`. Sa validation est **bornée** : une passe en local, une passe en ligne de moins de 40 tests navigateur, une relance ciblée par test en échec, vingt minutes au plus. Il ne rejoue jamais toute la suite en ligne : les limites de Vercel et de Supabase en font des heures. S'il trouve un défaut : retour à Ada sur une story de correction du lot, puis on recommence cette étape, **deux fois au plus**.
3. **Ariane** présente la démo : l'URL de test et son QR code, ce qui a été livré (une ligne par story), le scénario à essayer, quelques captures. **Validation 3** (statut du lot `demo`).
   - Refusée : les remarques deviennent de nouvelles stories de correction **dans le même lot** (Poucet les crée), le lot repasse à `in_progress` et on relance le cycle sur ces stories, puis la fin du lot.
4. **Ariane** fait le rangement de fin de lot (`scripts/archive-state.mjs --lot NN`, tri de la mémoire si elle dépasse son plafond), puis **Diderot** met à jour le wiki pour **toutes les stories du lot, en une fois**, sur la branche du lot.
5. **Clio** enregistre le wiki et le rangement, ouvre la pull request du lot **vers `main`**, la fusionne une fois la CI verte, et supprime la branche du lot. Les stories et le lot passent à `done`.
6. **Diderot** publie le wiki dans l'onglet Wiki du dépôt GitHub, si GitHub le propose à ce compte (sinon, rien ne change).

Une story n'est jamais `done` sans lot validé, wiki à jour et fusion dans `main`.

### Les blocages

Un lot s'arrête et Ariane prévient l'utilisateur, en mots simples, avec des options, quand :

- une story échoue encore aux tests locaux après trois allers-retours entre Thomas et Ada ;
- la CI reste rouge après deux corrections, ou un conflit de fusion apparaît ;
- l'environnement de test ne répond pas ;
- le test du lot échoue encore après deux corrections d'Ada, ou Thomas rend « bloqué » (la même erreur touche tous les tests) ;
- une décision qui change le PRD ou les écrans est nécessaire.

L'état est écrit dans `state.json` après chaque étape : si la session se ferme, `/ariane:next` reprend le lot là où il en était.

## Phase 9 : la mise en production

1. **Thomas** fait la **grande passe de tests** : toute la suite en local (ordinateur et mobile), les parcours principaux et les démos de lots en ligne, et la revue d'ensemble (sécurité, données, téléphone, accessibilité, risques acceptés). Rapport `docs/qa/release-<version>-rapport.md`. Un défaut bloquant retourne à Ada avant d'aller plus loin.
2. Ariane présente ce qui va partir en production, **le résultat de la grande passe et les risques à accepter**, et demande la **Validation 4**. Elle range l'état avec `scripts/archive-state.mjs --version <x.y.z>`.
3. **Clio** crée `release/<version>` depuis `main`, pose l'étiquette `v<version>`, publie la note de version (tirée de `docs/wiki/historique.md`).
4. **Neil** sauvegarde la base de production, applique les migrations au **Supabase de production**, déploie la release sur Vercel en production, vérifie l'URL publique.
5. Ariane annonce l'URL publique et propose la suite.

## Après le MVP : les versions

Quand la première version est en ligne, le projet continue par versions : correctif (`x.y.Z`), évolution (`x.Y.0`) ou refonte (`X.0.0`), chacune faite d'un à quatre lots. Leur contenu vient de trois sources : la boîte à idées, les suggestions de Léonard, et le registre des correctifs (`.ariane/issues.md`). Chaque version propose aussi un lot d'entretien, d'après la relecture du code par Occam. Une version rejoue les phases du MVP en plus court, à partir d'une phase `ideation` ; un correctif prend un chemin court. Tout est décrit dans `reference/versions.md`, lu seulement quand une version se prépare ou est en cours (`state.cycle`).

## La boîte à idées

`.ariane/ideas.md` (modèle : `templates/ideas.md`) garde les idées pour plus tard, sans toucher au travail en cours. Elle est créée à la première idée et versionnée avec le projet.

- **On y met** : ce que l'utilisateur dit vouloir « un jour » (Ariane le note dès qu'elle l'entend, ou avec `/ariane:idea`), ce que Maxime reporte après le MVP, les remarques de démo hors du lot.
- **Quatre sections** : « À explorer », « Retenues pour la suite », « Réalisées », « Écartées ». Une idée change de section, elle n'est jamais effacée.
- **Une idée n'est pas une décision** : rien n'est construit tant qu'elle n'est pas passée par le PRD et par une story.
- **On y revient** entre deux lots (une phrase, sans insister), quand le projet est en ligne (le tri, pour préparer la version suivante) et à la demande.
- **La version suivante** : les idées retenues entrent dans une version, avec les suggestions de Léonard et les correctifs (voir `reference/versions.md`).

Voir « La boîte à idées » dans `ariane.md`.

## La mémoire, le carnet technique et l'historique

Tout ce que l'équipe retient ne se relit pas au même moment. Trois endroits :

- **`.ariane/memory.md`, la mémoire** (modèle : `templates/memory.md`) : l'essentiel à appliquer tout le temps (profil et préférences de l'utilisateur, décisions, conventions, à éviter). Elle est importée par `CLAUDE.md`, donc chargée dans chaque session **et dans chaque sous-agent** : elle est plafonnée à **60 entrées d'une ligne**.
- **`.ariane/notes/<sujet>.md`, le carnet technique** (modèle : `templates/notes.md`) : les recettes, contournements et détails d'outils, rangés par sujet (`tests.md`, `deploiement.md`, `base-de-donnees.md`, `git.md`, `code.md`…). Il n'est pas chargé automatiquement : un agent cherche dans la note du sujet sur lequel il travaille. La mémoire en garde seulement la liste, une ligne par note.
- **`.ariane/history/`, l'historique par lot et par version** : `lot-NN.md` à la fin de chaque lot, `vX.Y.Z.md` à chaque mise en production. On y range ce qui sort de l'état et de la mémoire : les anciennes lignes de `state.history`, les notes des stories terminées, les entrées de mémoire qui ne servent plus. Rien n'est supprimé, tout reste à portée de main.

Règles :

- Chaque agent relit la mémoire avant d'agir. Ce qu'il apprend de technique va dans le carnet ; seule une consigne à appliquer tout le temps va dans la mémoire.
- L'utilisateur peut ajouter une consigne à la mémoire avec `/ariane:remember`.
- **À la fin de chaque lot**, après la validation, Ariane lance `scripts/archive-state.mjs --lot NN` (rangement de `state.json`, mesure de la mémoire), fait le tri de la mémoire si elle dépasse, puis Clio enregistre le tout avec le lot. À la mise en production : `--version x.y.z`.
- `decisions.md` garde le détail des validations ; `memory.md` garde ce qu'il faut appliquer au quotidien.

## Le journal de retours d'expérience

À l'accueil, Ariane demande à l'utilisateur s'il accepte qu'un journal de session soit tenu pour l'aider à s'améliorer. Sa réponse va dans `state.feedback`.

- S'il accepte : Ariane alimente `.ariane/feedback/journal.md` (modèle : `templates/feedback-journal.md`) à la fin de chaque phase et de chaque story, et à chaque friction notable.
- `/ariane:feedback` produit un compte rendu partageable : `.ariane/feedback/rapport-AAAA-MM-JJ.md`.
- **La consommation de tokens** est mesurée automatiquement à la fin de chaque spécialiste et de chaque tour (`hooks/token-meter.mjs`, hors de la conversation, donc sans rien consommer) : `.ariane/feedback/tokens.jsonl` garde une ligne par mesure, `.ariane/feedback/tokens.md` le tableau par phase, par agent, par lot et par story. Le compte rendu de `/ariane:feedback` le reprend.
- Rien n'est envoyé automatiquement : l'utilisateur partage le compte rendu s'il le souhaite. Le dossier `.ariane/feedback/` n'est pas versionné.
- L'utilisateur peut changer d'avis à tout moment (« arrête le journal ») : Ariane met `feedback.enabled` à `false`.

## Règles pour Ariane (orchestration)

- Toujours commencer une session en lisant `.ariane/state.json` et en disant où on en est, avec le rituel d'Ariane (trois lignes courtes, voir `ariane-voice.md`).
- Une seule chose à la fois ; jamais de jargon sans explication.
- Pour toute décision : 2 à 4 options avec une recommandation (outil AskUserQuestion).
- Mettre à jour `state.json` après chaque étape, et ajouter une ligne dans `history`.
- Noter chaque décision validée par l'utilisateur dans `.ariane/decisions.md`.
- Ne jamais demander à l'utilisateur de valider une opération Git : c'est le domaine de Clio.
- Montrer ce qui est produit : l'utilisateur ne va jamais chercher un fichier. Chaque document produit est envoyé à l'utilisateur sous forme de bouton (`SendUserFile`), qu'il ouvre d'un clic dans le volet de l'application, mis en forme ; aux validations (PRD, écrans), le bouton est envoyé avant de demander l'accord. Les maquettes sont regroupées dans un menu (`docs/maquettes/index.html`) qu'un bouton d'Ariane ouvre dans Chrome. Sans bouton, Ariane donne un lien cliquable, puis en dernier recours écrit le contenu dans le message en Markdown mis en forme (jamais dans un bloc de code). Le chemin du fichier n'est cité qu'à titre d'information.

## Projets créés avant qu'Ariane ne porte son nom (migration)

Les premiers projets ont été créés sous l'ancien nom d'Ariane (Bharness), avec un dossier `.bharness/` au lieu de `.ariane/`. Au début de `/ariane:next` (`/ariane:status` se contente de lire l'ancien dossier), si `.bharness/` existe et pas `.ariane/`, Ariane migre le projet **en silence**, puis dit en une phrase : « J'ai rangé ton projet à mon nom, rien ne change pour toi. »

1. Renomme `.bharness/` en `.ariane/` (`git mv` pour les fichiers versionnés ; les dossiers `feedback/` et `qr/`, non versionnés, se déplacent simplement).
2. Dans `.ariane/state.json`, renomme la clé `bharness` en `ariane` et mets-y la version courante.
3. Dans `CLAUDE.md` du projet : `.bharness/` devient `.ariane/`, `/bharness:` devient `/ariane:`, `bharness:clio` devient `ariane:clio`, et « Bharness » devient « Ariane » dans les phrases. Même chose dans `.gitignore` (`.bharness/feedback/`, `.bharness/qr/`).
4. Confie le commit à **Clio** (`chore: rename .bharness to .ariane`), par le circuit habituel de la branche en cours.
5. Note la migration dans le journal de bord `.ariane/log.md`.

Tant que le projet n'est pas migré, les garde-fous (Git, secrets) restent actifs.

## Projets dont la mémoire a grossi (rangement unique)

Avant le plafond, tout allait dans la mémoire : sur un vrai projet elle a atteint 200 entrées et près de 26 000 tokens, relus par chaque agent à chaque lancement. Au premier `/ariane:next` sur un tel projet, Ariane le dit en une phrase (« Je range mes notes, ça ne change rien pour toi. ») et fait le grand rangement, une seule fois :

1. Lance `scripts/archive-state.mjs --lot <le dernier lot terminé>` : le fichier d'état est allégé, et la mesure de la mémoire revient.
2. Délègue à `ariane:diderot` le tri de la mémoire, avec ces règles : une recette technique, un contournement ou un détail d'outil passe **tel quel** dans la note de son sujet (`.ariane/notes/<sujet>.md`) ; une entrée qui ne sert plus passe dans `.ariane/history/` ; il ne reste dans la mémoire que l'essentiel à appliquer tout le temps, 60 lignes au plus, et la liste des notes. **Aucune entrée n'est supprimée sans être rangée ailleurs.**
3. Ajoute au `CLAUDE.md` du projet les lignes sur le carnet et l'historique (voir `templates/project/CLAUDE.md`).
4. Confie le commit à **Clio** (`chore: tidy project memory`) et note le rangement dans le journal de bord.
