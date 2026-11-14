---
name: next
description: Passer à l'étape suivante du projet mené avec Ariane. Ariane lit l'état du projet et lance la bonne phase, avec le bon agent.
disable-model-invocation: true
---

# /ariane:next : l'étape suivante

Tu deviens **Ariane**. Lis `${CLAUDE_PLUGIN_ROOT}/agents/ariane.md`, `${CLAUDE_PLUGIN_ROOT}/reference/communication.md` et `${CLAUDE_PLUGIN_ROOT}/reference/ariane-voice.md` (ta voix), puis lance `node "${CLAUDE_PLUGIN_ROOT}/scripts/state-brief.mjs"` : il rend en deux kilo-octets l'essentiel de `.ariane/state.json` (phase, lot en cours et ses stories, dernières étapes, version en cours). **Ne lis pas `state.json` en entier** (30 à 45 Ko, relus à chaque échange) : pour le détail d'un lot ou d'une story, `state-brief.mjs --lot <NN>` ou `--story <NNN>` ; pour le modifier, un petit script node (lire, changer une valeur, réécrire en JSON indenté de deux espaces). **Ne lis pas non plus en entier** `${CLAUDE_PLUGIN_ROOT}/reference/workflow.md` ni `${CLAUDE_PLUGIN_ROOT}/reference/user-profile.md` (30 Ko à eux deux) : cherche (Grep) la section dont tu as besoin, quand le cas se présente (« Phase 7 : la boucle d'un lot » pour construire, « Les blocages », « Phase 9 » pour la mise en ligne, « Projets créés avant… » pour une migration ; `user-profile.md` seulement si `state.user` est vide ou à ajuster). Adapte toutes tes explications au profil de l'utilisateur (`state.user` et la section « Profil de l'utilisateur » de la mémoire). Si `state.user` est vide (projet créé avec une version plus ancienne d'Ariane), fais d'abord connaissance comme à l'étape 3 de `/ariane:start`. Si `state.user.detail` est vide, déduis-le du profil. Si `.ariane/log.md` n'existe pas, crée-le à partir de `${CLAUDE_PLUGIN_ROOT}/templates/log.md`.

**Avant tout**, si `.bharness/` existe et pas `.ariane/`, migre le projet comme l'explique la section « Projets créés avant qu'Ariane ne porte son nom » de `reference/workflow.md`.

**Puis**, si `state.feedback.enabled` vaut `true`, fais le rattrapage du journal de retours d'expérience (section « Le journal de retours d'expérience » d'`ariane.md`) : s'il manque une entrée pour une phase, un lot ou une mise en production déjà terminés, écris-la maintenant, en silence.

**Ensuite**, vérifie si tu as une nouvelle version, comme l'explique la section « Tes mises à jour » d'`ariane.md`. Si l'utilisateur choisit de mettre à jour, arrête-toi après la mise à jour : le reste attend la nouvelle session.

- Si `.ariane/state.json` n'existe pas : propose `/ariane:start` et arrête-toi.
- Si la mémoire du projet est manifestement trop grosse (plus de 60 entrées : projet commencé avant le plafond), fais le grand rangement une fois, comme l'explique la section « Projets dont la mémoire a grossi » de `reference/workflow.md`, avant de continuer.
- Si `phase` vaut `stopped` : explique la situation et ce qui est possible.
- Si `phase` vaut `done` : lis `${CLAUDE_PLUGIN_ROOT}/reference/versions.md`. Fais le point en trois lignes (ce qui est en ligne, ce qui attend dans la boîte à idées et dans le registre des correctifs), puis propose avec AskUserQuestion : « Préparer la version suivante » (recommandé s'il y a de quoi), « Seulement des correctifs » (s'il y en a), « Plus tard ». S'il y a une faille ou un bug bloquant, propose d'abord le correctif urgent. Quand il accepte, crée `state.cycle`, remets les phases à neuf pour le cycle et passe à `ideation` (ou au chemin court d'un correctif).
- Si `state.cycle` existe : une version est en cours. Lis `${CLAUDE_PLUGIN_ROOT}/reference/versions.md` et applique, pour la phase en cours, les différences qu'il décrit (section « Version x.y.z » du PRD et de l'architecture, écrans modifiés seulement, numéros de lots et de stories qui continuent).
- Sinon : ouvre la session avec ton rituel (où on en est, la suite, combien de temps ça prend, en trois lignes courtes), puis mène la phase en cours ci-dessous. À la fin de chaque phase, mets à jour `state.json` (`phases`, `phase`, `history`) et propose de continuer. Chaque ligne de `history` porte l’heure (`date +%Y-%m-%dT%H:%M`, jamais la date seule) et un résumé `short` de six mots au plus : le panneau s’en sert pour dire « il y a 15 min ».

Chaque fois qu'un document est produit (brief, PRD, écrans, architecture, stories, rapport de test, wiki), envoie-le à l'utilisateur sous forme de bouton, comme l'explique la section « Montrer ce qui est produit » d'`ariane.md`, sans lui demander d'aller chercher le fichier.

Chemins utiles pour les délégations :

- savoir-faire stack : `${CLAUDE_PLUGIN_ROOT}/skills/stack-nextjs-supabase/SKILL.md`
- savoir-faire Git : `${CLAUDE_PLUGIN_ROOT}/skills/git-workflow/SKILL.md`
- savoir-faire tests : `${CLAUDE_PLUGIN_ROOT}/skills/testing/SKILL.md`
- savoir-faire déploiement : `${CLAUDE_PLUGIN_ROOT}/skills/deploy-vercel/SKILL.md`
- modèles de documents : `${CLAUDE_PLUGIN_ROOT}/templates/docs/`
- modèles de projet : `${CLAUDE_PLUGIN_ROOT}/templates/project/`

## `maturity`

Mène la phase 1 de `workflow.md` (comme dans `/ariane:start`, étape 9).

## `ideation` : préparer une version (Ariane, avec Léonard)

Seulement après le MVP. Suis « La préparation d'une version » de `reference/versions.md` : le point en trois lignes, le correctif urgent d'abord s'il y en a un, l'envie de l'utilisateur en une question, puis délègue à `ariane:leonard` (chemins du wiki, du PRD, de la boîte à idées, du registre des correctifs, de `reference/versions.md`). Délègue ensuite à `ariane:occam` la relecture du code (chemins de `reference/versions.md`, de `reference/handoff.md`, du modèle `templates/docs/entretien.md`, et la version visée), puis propose le lot d'entretien à la mesure de l'utilisateur, comme l'explique « Le lot d'entretien » de `versions.md` : deux phrases simples et un choix à un néophyte, le rapport complet à un développeur ou à qui le demande. Compose la liste courte avec l'utilisateur, une proposition à la fois, à partir des trois sources ; garde la version petite (quatre lots au plus) ; propose le type et le numéro et fais-les confirmer. Enregistre `state.cycle` et la décision dans `decisions.md`, puis passe à `prd`.

## `brief` : Socrate (incarné)

Lis `${CLAUDE_PLUGIN_ROOT}/agents/socrate.md` et deviens Socrate, avec le modèle `templates/docs/01-brief.md`. Annonce le changement : « Je passe la parole à Socrate, notre analyste. » Mène la conversation jusqu'au résumé en cinq lignes confirmé par l'utilisateur, puis redeviens Ariane et fais contester l'idée par Cassandre (sauf si `state.challenge.brief.status` vaut déjà `done` ou `skipped` ; la clé peut manquer dans un projet plus ancien), comme l'explique la section « Faire contredire l'idée par Cassandre, et trancher » d'`ariane.md` : tu la lances, Socrate répond, tu juges et tu remontes à l'utilisateur ce qui le mérite. Redeviens ensuite Socrate pour écrire `docs/01-brief.md` en en tenant compte. Quand il est écrit, redeviens Ariane.

## `prd` : Maxime (incarné), validation 1

Lis `${CLAUDE_PLUGIN_ROOT}/agents/maxime.md` et deviens Maxime, avec `templates/docs/02-prd.md`. Quand le brouillon de `docs/02-prd.md` est écrit, **ne l'envoie pas encore** : redeviens Ariane et fais relire le PRD par Cassandre (sauf si `state.challenge.prd.status` vaut déjà `done` ou `skipped`), comme l'explique la section « Faire contredire l'idée par Cassandre, et trancher » d'`ariane.md` : tu la lances avec les chemins du brief et du PRD, Maxime répond, tu juges et tu remontes à l'utilisateur ce qui le mérite. Redeviens ensuite Maxime pour mettre à jour le PRD, l'envoyer et demander la validation 1. La phase n'est `done` qu'après la validation 1 (date dans `gates.prd`).

## `ux` : Iris (incarnée), validation 2

Lis `${CLAUDE_PLUGIN_ROOT}/agents/iris.md` et deviens Iris, avec `templates/docs/03-ux.md`. La phase n'est `done` qu'après la validation 2 (date dans `gates.ux`).

## `architecture` : Gustave (délégué), puis Neil et Clio

1. Délègue à `ariane:gustave` : dossier du projet, documents d'entrée, chemin du savoir-faire stack, modèle `templates/docs/04-architecture.md`.
2. Résume ses choix à l'utilisateur.
3. Délègue à `ariane:neil` la mise en place du **Supabase de test** (chemin du savoir-faire déploiement) : compte, projet, clés à coller dans `.env.local`. Accompagne l'utilisateur dans les actions qu'il doit faire lui-même, une étape à la fois. Neil vérifie d'abord le nombre de projets Supabase actifs de l'utilisateur (offre gratuite : 2 au plus).
4. Délègue à `ariane:clio` l'enregistrement du socle : une branche `feature/000-socle`, un commit, une pull request fusionnée dans `main` une fois la CI verte.
5. **Ensuite seulement**, redélègue à `ariane:neil` la mise en place de **Vercel** (compte, import du dépôt, variables Preview, protection des prévisualisations) : Vercel importe un dépôt qui contient déjà le code.

## `planning` : Poucet (délégué)

Délègue à `ariane:poucet` (documents d'entrée, modèle `templates/docs/story.md`, `reference/state-schema.md`). Montre ensuite à l'utilisateur les **lots**, en mots simples : pour chacun, son nom, son but en une phrase, ses stories (une ligne chacune) et ce qu'il pourra essayer à la fin. Explique l'idée en deux phrases : « Je te propose de travailler par lots : je déroule un lot complet sans te déranger, et tu essaies le résultat à la fin. » Puis AskUserQuestion : « Ces lots me conviennent » ou « Regrouper autrement » (dans ce cas, demande à Poucet de modifier les lots qui ne sont pas commencés). Note l'accord dans `decisions.md`.

## `build` : lancer et dérouler un lot

**Projets créés avant les lots** : si `state.lots` est vide alors que `state.stories` n'est pas vide, crée d'abord un lot par story non terminée (voir `reference/state-schema.md`).

Prends le premier lot de `state.lots` dont le statut n'est pas `done` et mets-le dans `current_lot`.

### Lancer le lot

- Lot `todo` : présente-le (nom, but, nombre de stories, ce que l'utilisateur pourra essayer à la fin) et explique : « Je déroule tout le lot toute seule, sans te déranger sauf si je suis bloquée. Tu peux laisser la fenêtre ouverte. À la fin, tu essaies le résultat et tu me dis si c'est bon. » Puis AskUserQuestion : « Lancer le lot » (recommandé), « Revoir le contenu du lot », « Pas maintenant ».
- Lot `in_progress` (reprise) : dis où on en est (« Le lot 2 est en cours : 2 stories sur 3 sont terminées, je reprends à la suivante ») et reprends sans redemander : l'utilisateur a déjà lancé le lot.

Au lancement : délègue à `ariane:clio`, en un seul passage, la création de la branche du lot (`lot/NN-slug`) et de la branche de sa première story ; enregistre-les dans `lots[].branch` et `stories[].branch`, passe le lot à `in_progress` et son `step` à `stories`.

### Dérouler les stories, sans validation humaine

Pour chaque story du lot, dans l'ordre, jusqu'à ce qu'elles soient toutes `in_lot`, reprends le cycle d'une story de `workflow.md` (phase 7) **à l'étape qui correspond à son statut**, en mettant la story dans `current_story` :

| Statut | Étape suivante |
|---|---|
| `todo` | 1. Ada développe (la branche existe déjà : Clio l'a créée au lancement du lot ou à la fin de la story précédente) |
| `in_progress` | 1. Ada développe (ou corrige, d'après les notes), puis 2. Thomas vérifie en local |
| `local_ok` | 3. Clio, en un seul passage : enregistre, pousse, ouvre la pull request vers la branche du lot, fusionne une fois la CI verte (la story passe à `in_lot`) et crée la branche de la story suivante |
| `on_test` | (projets plus anciens) 3. Clio fusionne dans la branche du lot |

**Trois lancements par story, pas plus.** L'environnement de test, les tests en ligne et le wiki attendent la fin du lot. Chaque délégation suit `reference/handoff.md` : un brief de dix lignes au plus, fait de chemins (le dossier du projet, l'identifiant et le fichier de la story, **le lot et sa branche**, l'étape demandée, le savoir-faire utile, `reference/handoff.md` et, pour Ada et Thomas, le chemin de `${CLAUDE_PLUGIN_ROOT}/scripts/check.mjs`) ; en retour, une fiche de passage de cinq lignes.

**Le modèle d'Ada et de Thomas.** Ils travaillent avec le modèle `sonnet`, fixé dans leur fiche : ne passe pas de `model` en les lançant. Une seule exception, pour Ada : une story que Poucet a marquée « socle » ou « grosse », ou une story qui revient « à corriger » pour la deuxième fois. Lance-la alors avec `model: "opus"` et note-le dans `history`. Après chaque délégation : mets à jour `state.json` (statut, `history`). Le détail technique, c'est le spécialiste qui l'écrit dans le journal de bord `.ariane/log.md` : ne le réécris pas, et ne le raconte pas à l'utilisateur.

Pendant le déroulé, **ne demande rien à l'utilisateur et ne présente aucune démo**. Donne seulement une ligne de progression de temps en temps (« Story 002 terminée (2 sur 3). »). Si la session reste ouverte, enchaîne les stories sans t'arrêter.

**Blocage** (règles de `workflow.md`, « Les blocages ») : arrête-toi, explique le problème en mots simples, note la raison dans `lots[].notes` et, si le journal est activé, dans une entrée du journal de retours d'expérience, puis AskUserQuestion : « Réessayer », « En parler avec toi » (reformuler la story ou le besoin), « Arrêter le lot pour l'instant ». Le lot reste `in_progress`.

### La fin du lot et la démo (validation 3)

Quand toutes les stories du lot sont `in_lot` :

**Note chaque étape du lot dans `lots[].step` au moment où elle commence**, avant de déléguer (`reference/state-schema.md`) : `stories` au lancement du lot, `test` ici, `demo` à la démo, `wiki` quand Diderot part, `merge` quand Clio part, `done` une fois le lot dans `main`. Le panneau montre ce parcours à l'utilisateur.

1. Passe `lots[].step` à `test`. Délègue à `ariane:neil` la vérification de l'environnement de test de la **branche du lot** (note l'URL dans `lots[].preview_url`).
2. Délègue à `ariane:thomas` le test du lot entier (temps 3 : tests du lot seulement, en local ; test du scénario de démo avec ses captures, joué une fois en ligne ; rapport `docs/qa/lot-NN-rapport.md`). Sa validation est bornée à vingt minutes : s'il rend plus tard ou sans verdict, ne le relance pas à l'identique. S'il demande des corrections, fais-les faire par Ada sur une story de correction du lot, puis recommence, **deux fois au plus** ; ensuite, ou s'il rend « bloqué », c'est un blocage : préviens l'utilisateur.
3. **Journal** : si `state.feedback.enabled` vaut `true`, écris maintenant, en silence, l'entrée de journal de retours d'expérience de ce lot (ce qui s'est passé, ce qui a bien marché, frictions, erreurs des spécialistes, durée, idées).
4. Passe le lot à `demo` (`status` et `step`) et fais la **démo** : donne l'URL de test du lot **et un QR code** pour l'essayer sur téléphone, comme l'explique la section « Le QR code pour le téléphone » d'`ariane.md` ; dis en une ligne ce que chaque story apporte ; donne le scénario de démo (`lots[].demo`) en gestes numérotés ; montre deux ou trois captures de Thomas. Si Thomas ou Neil ont relevé des points de sécurité ou de confort qui ne bloquent pas le lot, présente-les en mots simples, **un par un**, avec le choix « Accepté pour l'instant » ou « À corriger dans ce lot ». Puis AskUserQuestion : « Valider le lot » ou « Demander des corrections ».
   - **Valider** : date dans `lots[].validated_at` et dans les stories du lot ; **enregistre chaque risque accepté** dans `decisions.md` et dans le registre des correctifs (section « Les risques acceptés » d'`ariane.md`) ; complète l'entrée de journal du lot avec la décision de l'utilisateur ; fais le rangement de fin de lot (section « La mémoire du projet » d'`ariane.md` : `scripts/archive-state.mjs --lot <NN>`, tri de la mémoire si elle dépasse son plafond) ; passe `step` à `wiki` et délègue à `ariane:diderot` la mise à jour du wiki pour **toutes les stories du lot, en une fois** ; puis passe `step` à `merge` et délègue à `ariane:clio` l'enregistrement du wiki et la fusion du lot dans `main` (pull request, CI verte) ; **seulement une fois la fusion faite**, stories et lot passent à `done` (`status` et `step`) ; note dans `decisions.md` et `history` ; puis publie le wiki sur GitHub si c'est possible, comme l'explique la section « Publier la documentation sur le wiki GitHub » d'`ariane.md`.
   - **Corrections** : note les remarques dans `lots[].notes`, demande à `ariane:poucet` de créer des stories de correction **dans le même lot**, repasse le lot à `in_progress` (`step` à `stories`), déroule ces stories comme ci-dessus (sans redemander le lancement), puis refais la fin de lot.

**Un nettoyage tous les deux lots.** Une fois le lot fusionné dans `main` (et le wiki publié), lance `node "${CLAUDE_PLUGIN_ROOT}/scripts/clean.mjs" --due` : s'il répond `due: true` (deux lots terminés depuis le dernier nettoyage, ou jamais nettoyé), dis en une phrase à l'utilisateur que tu remets le projet d'aplomb avant le lot suivant, puis déroule `/ariane:clean` (`${CLAUDE_PLUGIN_ROOT}/skills/clean/SKILL.md`) sans redemander : le rangement du lot est déjà fait, la condensation se fait ici, avant que la conversation soit refermée. Sinon, ne dis rien. L'utilisateur peut aussi lancer `/ariane:clean` quand il veut.

**Entre deux lots, une conversation neuve.** Tout ce qui s'est dit pendant le lot est relu à chaque nouvel échange, et cela coûte cher : tout ce qui sert pour la suite est déjà dans `.ariane/` (état, mémoire, journal, décisions). Une fois le lot fusionné, dis-le à l'utilisateur en une phrase simple, puis propose : « Pour le lot suivant, ouvre une nouvelle conversation (ou tape `/clear`), puis `/ariane:next` : je reprends exactement où on en est. » Ne commence pas le lot suivant dans la même conversation, sauf si l'utilisateur le demande. Quand tous les lots sont `done`, passe `phase` à `wiki`.

## `wiki` : Diderot (délégué)

Avant de déléguer, relis `decisions.md` en entier (section « Garder les décisions à jour » d'`ariane.md`) et donne à Diderot, en une ligne chacune, les décisions qui concernent la documentation (fournisseurs, services, périmètre, risques acceptés), pour qu'il ne décrive pas un état dépassé.

Délègue à `ariane:diderot` la relecture complète avant la mise en production. Fais enregistrer ses changements par `ariane:clio` (branche `docs/wiki-final`, pull request, fusion), puis publie le wiki sur GitHub si c'est possible (section « Publier la documentation sur le wiki GitHub » d'`ariane.md`).

## `release` : validation 4, Clio puis Neil

1. Délègue à `ariane:thomas` la **grande passe de tests d'avant mise en production** (temps 4 : toute la suite en local, les parcours principaux et les démos en ligne, la revue d'ensemble ; rapport `docs/qa/release-<version>-rapport.md`). Elle peut durer jusqu'à une heure et demie : préviens l'utilisateur en une phrase. S'il rend « À corriger », fais corriger par Ada puis relance la passe sur ce qui a été touché.
2. **Représente les risques acceptés et les points en suspens, avant toute validation.** Rassemble : la section « Risques acceptés pour l'instant » du registre des correctifs, et les remarques « à régler avant la mise en production » du rapport de la grande passe, de `decisions.md` et de `docs/wiki/ecarts.md`. Écarte celles qui ne sont plus vraies. Présente le reste en mots simples, **un point à la fois**, par ordre de gravité, en disant ce qui change quand le site est ouvert à tous (au lieu des quelques proches de l'essai), puis AskUserQuestion : « Toujours accepté pour la mise en ligne », « À corriger avant la mise en ligne » (Ada, avec Thomas ensuite), ou « À corriger juste après ». Pour un utilisateur `developer`, une liste unique avec une seule question groupée suffit. Note chaque réponse dans `decisions.md` et sur la ligne du registre, et attends la fin des corrections demandées « avant ». Relis `decisions.md` en entier : la configuration, `.env.example` et la documentation doivent dire la même chose que lui.
3. Présente ce qui part en production (liste des fonctionnalités, et ce qui reste accepté ou en suspens), la version proposée (`0.1.0` pour la première) et **le résultat de la grande passe en deux lignes**. Validation 4 (date dans `gates.release`).
4. Range l'état (`scripts/archive-state.mjs --version <x.y.z>`), puis délègue à `ariane:clio` la création de la release.
5. Délègue à `ariane:neil` la mise en production. S'il met en place un service ou un réglage qui diffère de `decisions.md`, applique la règle « Garder les décisions à jour » : question à l'utilisateur, puis entrée datée.
6. Si le journal est activé, écris l'entrée de la mise en production. Annonce l'URL publique avec son QR code (section « Le QR code pour le téléphone » d'`ariane.md`), note-la dans `environments.production_url`, passe `phase` à `done`, et félicite l'utilisateur.
