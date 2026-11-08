# Bharness

**Une équipe de onze agents qui accompagne un débutant motivé de l'idée à une application web en ligne, testée et documentée.**

Bharness est un plugin pour [Claude Code](https://code.claude.com). Il s'adresse aux personnes qui ont un projet d'application web, l'envie de le mener, mais pas de formation de développeur. Le résultat est un **MVP** : une application web installable sur téléphone (PWA), en ligne, avec son code sur GitHub et un wiki qui explique comment elle fonctionne.

> Statut : version 0.11.0, en cours de construction et de premiers tests.

## Comment ça marche

Le parcours compte quatre étapes et quatre validations : rien n'avance sans ton accord.

1. **Cadrer** : Socrate t'aide à préciser ton idée, Maxime choisit avec toi ce qui entre dans le MVP. → *Validation 1 : le PRD*
2. **Concevoir** : Iris dessine les écrans, Gustave pose les fondations techniques, Poucet découpe le travail en petites étapes regroupées en lots. → *Validation 2 : les écrans*
3. **Construire**, un lot à la fois : tu lances un lot, puis Ada code en local, Thomas teste en local puis en ligne, Clio range tout dans GitHub et Diderot met le wiki à jour, fonctionnalité après fonctionnalité, sans te déranger. → *Validation 3 : la démo de chaque lot, à la fin du lot*
4. **Livrer** : Diderot relit le wiki, Clio crée la version, Neil met l'app en ligne. → *Validation 4 : la mise en ligne*

Ariane, la guide, t'accompagne du début à la fin.

## L'équipe

| Agent | Métier | Personnalité |
|---|---|---|
| **Ariane** | Guide | Complice enjouée, directe quand il le faut, comme le fil qui guide hors du labyrinthe |
| **Socrate** | Analyste | Curieux, fait naître l'idée par les questions |
| **Maxime** | Product Manager | Pragmatique, maximise la valeur, sait dire « pas pour le MVP » |
| **Iris** | Designer UX | Empathique et visuelle, pense à l'utilisateur final |
| **Gustave** | Architecte | Méthodique, comme Eiffel : des fondations solides |
| **Poucet** | Planificateur | Sème des stories comme des petits cailloux |
| **Ada** | Développeuse | Concentrée et rigoureuse, comme Ada Lovelace |
| **Thomas** | Testeur | Ne croit que ce qu'il voit fonctionner |
| **Clio** | Versioning et CI | Gère seule le dépôt GitHub, comme la muse de l'Histoire |
| **Diderot** | Documentaliste | Tient le wiki à jour, comme l'encyclopédiste |
| **Neil** | DevOps | Calme au décollage, met l'app en ligne |

## Ce qu'il te faut

- Un accès à **Claude Code**, dans l'application de bureau Claude (onglet Code) ou dans un terminal.
- **Node.js** (version 20 ou plus), **Git** et **GitHub CLI** : `/bharness:doctor` vérifie tout et t'explique comment installer ce qui manque.
- Des comptes gratuits **GitHub**, **Supabase** et **Vercel** : Neil t'accompagne au moment où on en a besoin.

## Installation

Dans Claude Code, dans le dossier où tu veux créer ton projet :

```text
/plugin install bharness --marketplace MartinDeMarcy/bharness
```

Ou en deux temps :

```text
/plugin marketplace add MartinDeMarcy/bharness
/plugin install bharness@bharness
```

Dans l'application de bureau : bouton **+** à côté de la zone de saisie → **Plugins** → **Add plugin**, après avoir ajouté la marketplace `MartinDeMarcy/bharness`.

Puis lance :

```text
/bharness:start
```

## Mettre à jour Bharness

Bharness s'améliore régulièrement, et Claude Code ne prévient pas quand une nouvelle version sort. C'est donc Ariane qui s'en charge : quand tu lances `/bharness:next`, elle vérifie (au plus une fois par jour) s'il y a du nouveau. Si c'est le cas, elle te le dit et te propose de mettre à jour tout de suite ou plus tard. Si tu acceptes, elle installe la nouvelle version, puis tu fermes ta session et tu en rouvres une : c'est au démarrage que la nouvelle version est chargée. Ton projet n'est pas touché, tu retrouves tout comme tu l'avais laissé.

Pour forcer la mise à jour tout de suite, sans attendre cette vérification, tape :

```text
/bharness:update
```

Ariane installe la dernière version, puis tu fermes ta session et tu en rouvres une.

Si la commande ne marche pas, à la main : dans l'application de bureau, bouton **+** à côté de la zone de saisie, puis **Plugins** ; ou, dans un terminal :

```bash
claude plugin marketplace update bharness
claude plugin update bharness@bharness
```

## Les commandes

| Commande | Quand l'utiliser |
|---|---|
| `/bharness:start` | La première fois : crée le projet et présente l'équipe |
| `/bharness:next` | À chaque session : passe à l'étape suivante |
| `/bharness:status` | Savoir où on en est |
| `/bharness:back` | Revenir sur une étape déjà validée |
| `/bharness:docs` | Mettre à jour ou vérifier le wiki |
| `/bharness:doctor` | Vérifier les outils et les comptes |
| `/bharness:remember` | Ajouter une consigne ou une préférence à la mémoire du projet |
| `/bharness:feedback` | Produire le compte rendu de retours d'expérience |
| `/bharness:update` | Mettre Bharness à jour tout de suite |
| `/bharness:help` | Revoir les commandes et l'équipe |

Au quotidien, `/bharness:next` suffit.

## Ce que Bharness crée dans ton projet

```
mon-app/
├── CLAUDE.md                 # contexte du projet, lu à chaque session
├── .bharness/
│   ├── state.json            # où en est le projet
│   ├── decisions.md          # les décisions que tu as validées
│   ├── log.md                # le journal de bord : le détail technique, pour qui le veut
│   ├── memory.md             # la mémoire du projet : préférences, problèmes résolus, à éviter
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

Bharness installe des garde-fous actifs uniquement dans les projets Bharness :

- l'historique Git ne se réécrit jamais (pas de force push, de rebase, de reset --hard) ;
- aucun envoi direct sur `main` : tout passe par une pull request à CI verte ;
- aucun fichier `.env` ni clé secrète dans le code versionné.

## Vie privée

La recherche de mise à jour lit seulement un petit fichier public sur GitHub (le numéro de la dernière version). Rien de ton projet ni de toi n'est envoyé, et si tu es hors ligne, elle se tait.

Le journal de retours d'expérience n'est tenu qu'avec ton accord, reste sur ton ordinateur, n'est pas versionné, et rien n'est envoyé automatiquement. `/bharness:feedback` produit un compte rendu que tu choisis, ou non, de partager.

## Développer Bharness

```bash
git clone https://github.com/MartinDeMarcy/bharness
claude --plugin-dir ./bharness/plugins/bharness
claude plugin validate ./bharness
```

Structure du dépôt :

```
.claude-plugin/marketplace.json   # la marketplace (un seul plugin)
plugins/bharness/
├── .claude-plugin/plugin.json
├── agents/        # les onze agents
├── skills/        # les commandes et les savoir-faire (stack, Git, tests, déploiement)
├── reference/     # le parcours et le format du fichier d'état
├── scripts/       # petits outils Node.js (mises à jour, maquettes, QR codes, wiki)
├── templates/     # modèles de documents et de projet
└── hooks/         # garde-fous Git et anti-secrets (Node.js, compatibles Windows)
```

## Remerciements

Bharness s'inspire de l'approche multi-agents de BMad Method. Bharness est un projet indépendant, sans lien avec BMad Code, LLC.

Les QR codes sont générés avec [qrcode-generator](https://www.npmjs.com/package/qrcode-generator) de Kazuhiko Arase (licence MIT), inclus tel quel dans `plugins/bharness/scripts/vendor/` avec sa notice. « QR Code » est une marque déposée de DENSO WAVE INCORPORATED.

## Licence

[MIT](LICENSE) © 2026 PRAS Martin
