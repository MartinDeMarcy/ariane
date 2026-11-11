# Ariane

**Ariane tient le fil, de ton idée à ton application en ligne. Elle dirige une équipe de treize spécialistes et gère tout, de A à Z.**

Ariane s'adresse à toute personne qui a un projet d'application web, **qu'elle n'ait jamais codé ou qu'elle soit développeuse confirmée** : Ariane s'adapte à elle. Tu ne parles qu'à elle : c'est elle qui envoie le bon spécialiste au bon moment, relit son travail et te raconte simplement où on en est. Le résultat est un **MVP** : une application web installable sur téléphone (PWA), en ligne, avec son code sur GitHub et un wiki qui explique comment elle fonctionne.

Ariane travaille dans [Claude Code](https://code.claude.com).

> Statut : version 0.20.10, en cours de construction et de premiers tests.

## Ariane, la cheffe d'orchestre

Comme dans le mythe, Ariane te donne le fil pour ne jamais te perdre dans le labyrinthe de la création d'une application. Mais elle ne fait pas que te guider : elle **dirige tout**.

- **Elle choisit qui travaille**, et dans quel ordre. Personne ne démarre sans qu'elle l'ait décidé.
- **Elle briefe** chaque spécialiste avec tout le contexte dont il a besoin.
- **Elle relit** ce qu'il rend, vérifie que ça tient avec le reste, relance si besoin.
- **Elle traduit** : tu ne lis jamais le compte rendu brut d'un spécialiste, seulement l'essentiel, en mots de tous les jours.
- **Elle tranche** : Cassandre, la contradictrice de l'équipe, conteste ton idée puis relit le cahier des charges avant qu'on construise, et débat avec Socrate et Maxime ; Ariane juge ce qui mérite de te remonter, sans jamais te décourager.
- **Elle assume** : si quelque chose coince, c'est son équipe, donc elle qui corrige.
- **Elle tient le fil** : où on en est, la suite, combien de temps ça prend, au début de chaque session.

## Ariane s'adapte à toi

Un **néophyte plein d'idées** et un **développeur confirmé** n'ont pas besoin de la même Ariane. Elle fait connaissance au début (quelques questions légères sur le terminal, Git, le code), puis règle sa façon d'accompagner. Le parcours, les validations et les garde-fous restent les mêmes pour tout le monde.

| | Néophyte | Développeur confirmé |
|---|---|---|
| **Elle parle** | En mots de tous les jours, un mot technique est expliqué | En termes techniques, sans définition |
| **Elle fait** | Tout elle-même, ou pas à pas avec un repère | La commande, sans pas-à-pas |
| **Elle rend compte** | Du résultat et de la suite ; le détail est dans le journal | Du résultat, avec pull request, environnement de test et rapport de test |
| **Elle questionne** | Une chose à la fois | Quelques questions regroupées |
| **Son ton** | Complice, elle fête les jalons | Sobre et direct |

Tu règles le curseur quand tu veux : « parle-moi technique », « va plus vite », « c'est trop technique ». Ariane ne t'étiquette jamais, elle s'ajuste. Les spécialistes de son équipe suivent le même réglage. La stack est imposée dans cette version : ses conventions (nommage, lint, tests) sont respectées dans la stack, mais une autre stack n'est pas encore prise en charge.

## Le panneau d'avancement

Dans l'application de bureau, Ariane ouvre un panneau à côté de la conversation. Il se met à jour tout seul, sans que personne ne l'envoie :

- **Où en est Ariane** : ce qu'elle fait en ce moment, et l'état du projet (en cours, à valider, démo prête, en ligne).
- **Le projet, étape par étape** : Cadrer, Concevoir, Construire, Livrer, avec ce qui est fait et la validation de chaque étape.
- **Le lot en cours** : chaque fonctionnalité sur une barre en cinq temps, de « pas commencée » à « prête pour la démo ».
- **La boîte à idées** : une zone pour écrire une idée, notée aussitôt sans interrompre Ariane, avec le nombre d'idées en attente.
- **Les derniers pas et la suite**, avec deux boutons : continuer (`/ariane:next`) et faire le point (`/ariane:status`).

`/ariane:next` range aussi la conversation : si elle est déjà bien remplie, elle est compactée avant de continuer, pour que tu n'aies pas à ouvrir une nouvelle session entre deux lots. Tout ce qui compte est enregistré dans le projet.

Le panneau s'ouvre au début d'une session dans un projet mené avec Ariane, et se rouvre à chaque commande d'Ariane (`/ariane:start`, `/ariane:next`, `/ariane:update`…) si tu l'avais fermé. Il ne défile jamais : il choisit seul, selon sa hauteur et sa largeur, la présentation la plus complète qui tient, des cartes détaillées jusqu'à un résumé d'une ligne. Dans un terminal, il s'affiche en version texte.

## Après la première version : les versions suivantes

Une application en ligne n'est pas finie. Quand ton MVP est sorti, `/ariane:next` te propose de préparer la suite, par **versions** :

| Version | Numéro | Ce qu'elle contient |
|---|---|---|
| Une petite réparation | `0.1.0` → `0.1.1` | Seulement des corrections : bugs, sécurité |
| Des nouveautés | `0.1.1` → `0.2.0` | Des fonctionnalités nouvelles ou améliorées, sans rien casser |
| Un grand changement | `0.4.0` → `1.0.0` | Un changement qui casse quelque chose pour tes utilisateurs ou tes données |

Le contenu d'une version vient de trois sources : ta **boîte à idées**, les **suggestions de Léonard** (il regarde l'application telle qu'elle est et propose cinq évolutions au plus), et le **registre des correctifs**. Pour signaler un problème, dis-le à Ariane ou tape `/ariane:bug` : elle le note sans interrompre le travail, et une faille ou un bug bloquant passe devant tout le reste.

Ariane propose le type de version d'après ce qu'elle contient, et tu confirmes. Une version reste petite : un objectif, quatre lots au plus, un sujet par lot.

**Un lot d'entretien à chaque version.** Occam relit tout le code, comme un ensemble qui a grandi lot après lot, et propose de le simplifier, de l'accélérer et de le mettre à jour, sans rien changer à ce que tu vois. Si tu ne codes pas, Ariane te le résume en deux phrases et te demande simplement si tu veux l'entretien ; si tu es développeur, ou si tu le demandes, tu reçois le rapport complet et tu choisis proposition par proposition. Elle rejoue les étapes du MVP en plus court (cahier des charges, écrans s'ils changent, lots, démos, grande passe de tests, mise en ligne) ; une petite réparation prend un chemin court. Les notes de version sont tenues dans le `CHANGELOG.md` de ton projet.

## La boîte à idées

Les idées arrivent rarement au bon moment. Dis simplement à Ariane « note cette idée », tape `/ariane:idea`, ou écris-la dans la zone « Boîte à idées » du panneau d'avancement, qui la note sans interrompre le travail en cours : elle la range dans la boîte à idées du projet et reprend exactement où elle en était, sans rien changer à ce qui est en cours. Ce que Maxime reporte après le MVP y va aussi.

Une idée notée n'est pas une décision : rien n'est construit tant que tu ne l'as pas choisie. Ariane t'en reparle entre deux lots, et quand ton application est en ligne elle te propose de faire le tri : pour la prochaine version, plus tard, ou à écarter. Les idées retenues repassent par le cahier des charges, puis deviennent de nouveaux lots.

## Comment ça marche

Le parcours compte quatre étapes et quatre validations : rien n'avance sans ton accord.

1. **Cadrer** : Ariane te passe Socrate, qui t'aide à préciser ton idée, pendant que Cassandre cherche en coulisses ce qui pourrait mal tourner (Ariane te remonte seulement ce qui compte), puis Maxime, qui choisit avec toi ce qui entre dans le MVP et dont Cassandre relit le cahier des charges avant ta validation. → *Validation 1 : le PRD*
2. **Concevoir** : Iris dessine les écrans, Gustave pose les fondations techniques, Poucet découpe le travail en petites étapes regroupées en lots. → *Validation 2 : les écrans*
3. **Construire**, un lot à la fois : tu lances un lot, puis Ariane déroule, fonctionnalité après fonctionnalité, sans te déranger : Ada code en local, Thomas teste en local, Clio range tout dans GitHub. À la fin du lot, Thomas teste l'ensemble en ligne et Diderot met le wiki à jour. → *Validation 3 : la démo de chaque lot, à la fin du lot*
4. **Livrer** : Diderot relit le wiki, Thomas fait la grande passe de tests sur toute l'application, Clio crée la version, Neil met l'app en ligne. → *Validation 4 : la mise en ligne*

## L'équipe d'Ariane

| Qui | Métier | Personnalité |
|---|---|---|
| **Ariane** | Guide et cheffe d'équipe | Complice enjouée, directe quand il le faut, elle tient le fil de A à Z |
| **Socrate** | Analyste | Curieux, fait naître l'idée par les questions |
| **Cassandre** | Contradictrice | Lucide et franche, voit ce qui ira mal avant tout le monde, comme la prophétesse qu'on ne croyait pas |
| **Maxime** | Product Manager | Pragmatique, maximise la valeur, sait dire « pas pour le MVP » |
| **Iris** | Designer UX | Empathique et visuelle, pense à l'utilisateur final |
| **Gustave** | Architecte | Méthodique, comme Eiffel : des fondations solides |
| **Poucet** | Planificateur | Sème des stories comme des petits cailloux |
| **Ada** | Développeuse | Concentrée et rigoureuse, comme Ada Lovelace |
| **Thomas** | Testeur | Ne croit que ce qu'il voit fonctionner |
| **Clio** | Versioning et CI | Gère seule le dépôt GitHub, comme la muse de l'Histoire |
| **Diderot** | Documentaliste | Tient le wiki à jour, comme l'encyclopédiste |
| **Neil** | DevOps | Calme au décollage, met l'app en ligne |
| **Léonard** | Inventeur | Curieux et sobre, voit ce qui pourrait exister, comme Léonard de Vinci |
| **Occam** | Relecteur du code | Exigeant et prudent, cherche le plus simple, comme le rasoir d'Ockham |

## Ce qu'il te faut

- Un accès à **Claude Code**, dans l'application de bureau Claude (onglet Code) ou dans un terminal.
- **Node.js** (version 20 ou plus), **Git** et **GitHub CLI** : `/ariane:doctor` vérifie tout et t'explique comment installer ce qui manque.
- Des comptes gratuits **GitHub**, **Supabase** et **Vercel** : Neil t'accompagne au moment où on en a besoin.

## Faire venir Ariane

Dans Claude Code, dans le dossier où tu veux créer ton projet :

```text
/plugin install ariane --marketplace MartinDeMarcy/ariane
```

Ou en deux temps :

```text
/plugin marketplace add MartinDeMarcy/ariane
/plugin install ariane@ariane
```

Dans l'application de bureau : bouton **+** à côté de la zone de saisie → **Plugins** → **Add plugin**, après avoir ajouté la marketplace `MartinDeMarcy/ariane`.

Puis dis bonjour à Ariane :

```text
/ariane:start
```

### Tu as connu Ariane sous un autre nom ?

Elle s'appelait **Bharness** jusqu'à la version 0.11.0 (commandes `/bharness:…`). Elle ne se met pas à jour toute seule d'un nom à l'autre : retire l'ancienne installation, puis installe Ariane comme ci-dessus.

```bash
claude plugin uninstall bharness@bharness
claude plugin marketplace remove bharness
```

Tes projets existants sont repris tels quels : au prochain `/ariane:next`, Ariane range le dossier `.bharness/` à son nom (`.ariane/`) et prévient en une phrase.

## Ariane s'améliore

Ariane apprend régulièrement de nouvelles choses, et Claude Code ne prévient pas quand elle a évolué. C'est donc elle qui te le dit : quand tu lances `/ariane:next`, elle vérifie (au plus une fois par jour) si elle a une nouvelle version. Si oui, elle te le dit et te propose de se mettre à jour tout de suite ou plus tard. Si tu acceptes, elle s'installe à jour, puis tu fermes ta session et tu en rouvres une : c'est au démarrage que la nouvelle version est chargée. Ton projet n'est pas touché, tu retrouves tout comme tu l'avais laissé.

Pour la mettre à jour tout de suite, sans attendre cette vérification, tape :

```text
/ariane:update
```

Si la commande ne marche pas, à la main : dans l'application de bureau, bouton **+** à côté de la zone de saisie, puis **Plugins** ; ou, dans un terminal :

```bash
claude plugin marketplace update ariane
claude plugin update ariane@ariane
```

## Les commandes

| Commande | Quand l'utiliser |
|---|---|
| `/ariane:start` | La première fois : Ariane fait ta connaissance, crée le projet et te présente son équipe |
| `/ariane:next` | À chaque session : Ariane passe à l'étape suivante et lance le bon spécialiste |
| `/ariane:status` | Savoir où on en est |
| `/ariane:back` | Revenir sur une étape déjà validée |
| `/ariane:docs` | Demander à Diderot de mettre à jour ou vérifier le wiki |
| `/ariane:doctor` | Vérifier les outils et les comptes |
| `/ariane:bug` | Signaler un bug ou un problème de sécurité, ou revoir les correctifs en attente |
| `/ariane:idea` | Noter une idée pour plus tard, ou revoir la boîte à idées |
| `/ariane:remember` | Ajouter une consigne ou une préférence à la mémoire du projet |
| `/ariane:feedback` | Produire le compte rendu de retours d'expérience |
| `/ariane:update` | Mettre Ariane à jour tout de suite |
| `/ariane:help` | Revoir les commandes et l'équipe |

Au quotidien, `/ariane:next` suffit.

## Ce qu'Ariane crée dans ton projet

```
mon-app/
├── CLAUDE.md                 # contexte du projet, lu à chaque session
├── .ariane/
│   ├── state.json            # le fil : où en est le projet
│   ├── decisions.md          # les décisions que tu as validées
│   ├── log.md                # le journal de bord : le détail technique, pour qui le veut
│   ├── issues.md             # le registre des correctifs : bugs, sécurité, risques acceptés
│   ├── ideas.md              # la boîte à idées : ce qu'on fera peut-être plus tard
│   ├── memory.md             # la mémoire du projet : l'essentiel, relu à chaque session (60 lignes au plus)
│   ├── notes/                # le carnet technique, par sujet, lu seulement à la demande
│   ├── history/              # l'historique par lot et par version : ce qui a été rangé
│   └── feedback/             # journal de retours d'expérience (si tu l'acceptes, jamais versionné)
├── docs/
│   ├── 01-brief.md … 04-architecture.md
│   ├── stories/              # une fiche par fonctionnalité
│   ├── qa/                   # rapports de test et captures
│   └── wiki/                 # comment l'app fonctionne vraiment
├── .github/workflows/ci.yml  # vérifications automatiques
├── src/ …                    # le code de l'application
└── tests/
```

## Stack

Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, Supabase (un projet de test, un de production), PWA, Vitest, Playwright, GitHub Actions, Vercel. Le développement et la plupart des tests se font en local ; chaque fonctionnalité est vérifiée sur un environnement de test en ligne avant d'être intégrée.

## La documentation sur GitHub

Diderot garde la documentation dans le dossier `docs/wiki` de ton projet. Quand GitHub le permet, il la publie aussi dans l'onglet **Wiki** de ton dépôt, après chaque lot validé : les pages sont reliées entre elles, avec un menu et les images. La publication est à sens unique : ce qui est dans `docs/wiki` fait foi, et les changements faits directement sur le wiki sont écrasés.

Sur GitHub, le wiki d'un dépôt **privé** demande une offre payante. Avec l'offre gratuite, rien ne change : la documentation reste dans `docs/wiki`, Diderot continue comme avant et personne ne te dérange. Pour un dépôt public, GitHub n'ouvre le wiki qu'après la création de sa première page : Ariane te guide, une seule fois, si tu le souhaites.

## Garde-fous

Ariane veille, uniquement dans les projets qu'elle mène :

- l'historique Git ne se réécrit jamais (pas de force push, de rebase, de reset --hard) ;
- aucun envoi direct sur `main` : tout passe par une pull request à CI verte ;
- aucun fichier `.env` ni clé secrète dans le code versionné.

## Vie privée

La recherche de mise à jour lit seulement un petit fichier public sur GitHub (le numéro de la dernière version). Rien de ton projet ni de toi n'est envoyé, et si tu es hors ligne, elle se tait.

Avec le même accord, un compteur note ce que chaque étape consomme en tokens (par phase, par agent, par lot) dans le même dossier : il tourne hors de la conversation, ne consomme rien lui-même et n'envoie rien.

Le journal de retours d'expérience n'est tenu qu'avec ton accord, reste sur ton ordinateur, n'est pas versionné, et rien n'est envoyé automatiquement. `/ariane:feedback` produit un compte rendu que tu choisis, ou non, de partager.

## Contribuer au code d'Ariane

```bash
git clone https://github.com/MartinDeMarcy/ariane
claude --plugin-dir ./ariane/plugins/ariane
claude plugin validate ./ariane
```

Structure du dépôt :

```
.claude-plugin/marketplace.json   # la marketplace (un seul plugin : Ariane)
plugins/ariane/
├── .claude-plugin/plugin.json
├── agents/        # Ariane et ses treize spécialistes
├── skills/        # les commandes et les savoir-faire (stack, Git, tests, déploiement)
├── reference/     # le parcours, la voix d'Ariane, la fiche de passage et le format du fichier d'état
├── scripts/       # petits outils Node.js (mises à jour, maquettes, QR codes, wiki, rangement de l'état)
├── templates/     # modèles de documents et de projet
├── hooks/         # garde-fous Git et anti-secrets, compteur de tokens (Node.js), et le panneau d'avancement (panel.tsx)
└── types/         # le contrat d'état du panneau
```

## Remerciements

Ariane s'inspire de l'approche multi-agents de BMad Method. Elle est un projet indépendant, sans lien avec BMad Code, LLC.

Les QR codes sont générés avec [qrcode-generator](https://www.npmjs.com/package/qrcode-generator) de Kazuhiko Arase (licence MIT), inclus tel quel dans `plugins/ariane/scripts/vendor/` avec sa notice. « QR Code » est une marque déposée de DENSO WAVE INCORPORATED.

## Licence

[MIT](LICENSE) © 2026 PRAS Martin
