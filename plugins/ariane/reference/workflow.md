# Le parcours avec Ariane

Ce document est la référence commune à toutes les commandes et à tous les agents. **Ariane dirige tout le parcours, de A à Z** : c'est elle qui lance chaque spécialiste, relit son travail et en rend compte à l'utilisateur. Il décrit les phases, qui les mène, ce qu'elles produisent et quand on passe à la suite.

## Deux façons de faire travailler un agent

- **Incarné (dialogue)** : la conversation principale *devient* l'agent. Elle lit sa fiche (`agents/<nom>.md`), adopte sa personnalité et dialogue directement avec l'utilisateur. Utilisé quand il faut poser des questions : Ariane, Socrate, Maxime, Iris.
- **Délégué (autonome)** : la conversation principale lance le sous-agent `ariane:<nom>` avec l'outil Agent, en lui donnant tout le contexte nécessaire (chemins des documents, story en cours, fichiers de savoir-faire à lire). Le sous-agent travaille seul et rend un compte rendu. Utilisé pour : Gustave, Poucet, Ada, Thomas, Clio, Diderot, Neil.

Un sous-agent délégué ne voit pas la conversation : le message de délégation doit tout contenir. Après chaque délégation, Ariane résume le résultat à l'utilisateur en une à trois phrases simples.

## Les phases

| # | Phase (`phase`) | Agent | Mode | Produit | Porte de validation |
|---|---|---|---|---|---|
| 0 | `onboarding` | Ariane | incarné | `.ariane/state.json`, `CLAUDE.md`, `.claude/settings.json`, dépôt GitHub | — |
| 1 | `maturity` | Ariane | incarné | `state.maturity` | l'utilisateur confirme le niveau |
| 2 | `brief` | Socrate | incarné | `docs/01-brief.md` | — |
| 3 | `prd` | Maxime | incarné | `docs/02-prd.md` | **Validation 1 : le PRD** |
| 4 | `ux` | Iris | incarné | `docs/03-ux.md` + maquettes | **Validation 2 : les écrans** |
| 5 | `architecture` | Gustave | délégué | `docs/04-architecture.md`, projet Next.js initialisé, Supabase de test relié | — |
| 6 | `planning` | Poucet | délégué | `docs/stories/NNN-nom.md`, `state.stories`, `state.lots` | — |
| 7 | `build` | Ada, Thomas, Clio, Neil, Diderot | délégué | code, tests, branches, environnements de test, wiki | **Validation 3 : démo de chaque lot** |
| 8 | `wiki` | Diderot | délégué | `docs/wiki/` relu et complet | — |
| 9 | `release` | Clio puis Neil | délégué | `release/x.y.z`, étiquette, app en production | **Validation 4 : la mise en ligne** |
| 10 | `done` | Ariane | incarné | bilan, prochaines étapes | — |

Une phase passe à `done` seulement quand son livrable existe et, s'il y a une porte, quand l'utilisateur l'a validée. La date de validation est notée dans `state.gates`.

## Phase 1 : le niveau de maturité

Ariane pose trois questions simples (outil AskUserQuestion) :

1. Qui utilisera l'app : toi seul, quelques proches, ou le public ?
2. Y aura-t-il des données personnelles sensibles ou des paiements ?
3. Est-ce un essai pour tester l'idée, ou un outil dont des gens vont dépendre ?

Elle recommande un niveau (MVP, alpha, bêta, production) et l'explique en une ou deux phrases. L'utilisateur confirme ou choisit un autre niveau.

- **MVP** : on continue.
- **Autre niveau** : Ariane explique qu'elle ne prend en charge que les MVP pour l'instant, propose de viser d'abord un MVP, et si l'utilisateur refuse, met `phase` à `stopped` et s'arrête là.

## Phase 6 : le découpage en lots

Poucet découpe le PRD en stories, puis les regroupe en **lots**. Un lot réunit deux à cinq stories qui, ensemble, donnent quelque chose que l'utilisateur peut essayer (« je peux m'inscrire et réserver un créneau »). Le premier lot contient le socle et une première fonctionnalité visible. Chaque lot a un **scénario de démo** : trois à cinq gestes que l'utilisateur fera pour l'essayer. Un lot peut ne contenir qu'une story.

Ariane montre les lots à l'utilisateur (nom, but, stories) ; il peut demander de regrouper autrement.

## Phase 7 : la boucle d'un lot

L'utilisateur **lance un lot** (`/ariane:next`). Les agents le déroulent ensuite d'un bout à l'autre, story après story, **sans validation humaine entre les stories**. La seule validation est la démo, à la fin du lot. Pendant le lot, Ariane ne dérange l'utilisateur qu'en cas de blocage.

### Les branches

- `lot/NN-slug` : créée par Clio depuis `main` au lancement du lot ; elle réunit les stories terminées. Vercel lui crée son environnement de test.
- `feature/NNN-slug` : une par story, créée depuis la branche du lot et fusionnée dans celle-ci par pull request (CI verte).
- `main` ne reçoit le lot entier, par une pull request, qu'après la validation de l'utilisateur.

### Le cycle d'une story (toujours le même)

Pour chaque story du lot, dans l'ordre :

1. **Clio** crée la branche `feature/<NNN>-<nom>` depuis la branche du lot à jour (statut `in_progress`).
2. **Ada** développe la story en local, avec ses tests unitaires et fonctionnels. L'app locale est branchée sur le **Supabase de test** (pas de base locale).
3. **Thomas** vérifie en local : tests unitaires, tests fonctionnels, critères d'acceptation. En cas d'échec, retour à Ada (statut `local_ok` seulement quand tout passe).
4. **Clio** enregistre le travail en commits normalisés et pousse la branche. La CI GitHub Actions se lance ; Vercel crée l'environnement de test de la branche.
5. **Neil** récupère l'URL de prévisualisation et vérifie que l'environnement répond (statut `on_test`).
6. **Thomas** lance les tests de bout en bout sur cet environnement et rédige `docs/qa/NNN-rapport.md`.
7. **Diderot** met à jour le wiki sur la même branche.
8. **Clio** ouvre la pull request **vers la branche du lot** et la fusionne une fois la CI verte (statut `in_lot`).

Il n'y a **aucune** démo à l'utilisateur à ce stade. Puis on passe à la story suivante du lot.

### La fin du lot

Quand toutes les stories du lot sont `in_lot` :

1. **Neil** récupère l'URL de prévisualisation de la branche du lot et vérifie qu'elle répond.
2. **Thomas** lance les tests de bout en bout du lot entier sur cet environnement, joue le scénario de démo et rédige `docs/qa/lot-NN-rapport.md`. S'il trouve un défaut : retour à Ada sur une story de correction du lot, puis on recommence cette étape.
3. **Ariane** présente la démo : l'URL de test et son QR code, ce qui a été livré (une ligne par story), le scénario à essayer, quelques captures. **Validation 3** (statut du lot `demo`).
   - Refusée : les remarques deviennent de nouvelles stories de correction **dans le même lot** (Poucet les crée), le lot repasse à `in_progress` et on relance le cycle sur ces stories, puis la fin du lot.
4. **Clio** ouvre la pull request du lot **vers `main`**, la fusionne une fois la CI verte, et supprime la branche du lot. Les stories et le lot passent à `done`.
5. **Diderot** publie le wiki dans l'onglet Wiki du dépôt GitHub, si GitHub le propose à ce compte (sinon, rien ne change).

Une story n'est jamais `done` sans lot validé, wiki à jour et fusion dans `main`.

### Les blocages

Un lot s'arrête et Ariane prévient l'utilisateur, en mots simples, avec des options, quand :

- une story échoue encore aux tests locaux après trois allers-retours entre Thomas et Ada ;
- la CI reste rouge après deux corrections, ou un conflit de fusion apparaît ;
- l'environnement de test ne répond pas ;
- une décision qui change le PRD ou les écrans est nécessaire.

L'état est écrit dans `state.json` après chaque étape : si la session se ferme, `/ariane:next` reprend le lot là où il en était.

## Phase 9 : la mise en production

1. Ariane présente ce qui va partir en production et demande la **Validation 4**.
2. **Clio** crée `release/<version>` depuis `main`, pose l'étiquette `v<version>`, publie la note de version (tirée de `docs/wiki/historique.md`).
3. **Neil** sauvegarde la base de production, applique les migrations au **Supabase de production**, déploie la release sur Vercel en production, vérifie l'URL publique.
4. Ariane annonce l'URL publique et propose la suite.

## La mémoire du projet

`.ariane/memory.md` (modèle : `templates/memory.md`) contient ce que tous les agents doivent savoir sur ce projet et son utilisateur : préférences, décisions, problèmes rencontrés et solutions, conventions, choses à éviter. Il est importé par `CLAUDE.md`, donc chargé à chaque session, y compris dans les sous-agents.

- Chaque agent le relit avant d'agir et y ajoute ce qu'il apprend d'utile.
- L'utilisateur peut y ajouter une consigne avec `/ariane:remember`.
- Ariane le garde propre (pas de doublon ni de contradiction).
- `decisions.md` garde le détail des validations ; `memory.md` garde ce qu'il faut appliquer au quotidien.

## Le journal de retours d'expérience

À l'accueil, Ariane demande à l'utilisateur s'il accepte qu'un journal de session soit tenu pour l'aider à s'améliorer. Sa réponse va dans `state.feedback`.

- S'il accepte : Ariane alimente `.ariane/feedback/journal.md` (modèle : `templates/feedback-journal.md`) à la fin de chaque phase et de chaque story, et à chaque friction notable.
- `/ariane:feedback` produit un compte rendu partageable : `.ariane/feedback/rapport-AAAA-MM-JJ.md`.
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
