# Sécurité

## Versions suivies

Seule la dernière version publiée d'Ariane reçoit des correctifs de sécurité. Pour la mettre à jour : `/ariane:update`.

## Signaler une faille

Merci de ne pas décrire une faille dans une issue publique.

1. Ouvre un signalement privé : onglet **Security** du dépôt, puis **Report a vulnerability** ([lien direct](https://github.com/MartinDeMarcy/ariane/security/advisories/new)).
2. Si ce bouton n'est pas disponible, ouvre une issue qui demande simplement un contact privé, sans aucun détail technique.

Indique la version d'Ariane, ton système, ce que tu as observé et, si possible, comment le reproduire. Ariane est maintenue par une seule personne, sur son temps libre : tu recevras une réponse dès que possible, et le correctif sera annoncé dans le `CHANGELOG.md` une fois publié.

## Ce qu'Ariane exécute sur ta machine

Ariane est un plugin Claude Code. En plus de ses agents et de ses commandes (du texte), elle fait tourner du code local, en Node.js, sans dépendance à installer :

- **Les garde-fous** (`plugins/ariane/hooks/guard-git.mjs`, `guard-secrets.mjs`) : appelés avant chaque commande shell et chaque écriture de fichier, ils bloquent la réécriture de l'historique Git, l'envoi direct sur `main` et l'écriture de secrets dans le code versionné. Ils n'agissent que dans un projet mené avec Ariane.
- **Le compteur de tokens** (`hooks/token-meter.mjs`) : appelé à la fin d'un tour et à la fin du travail d'un spécialiste, il écrit dans le dossier du projet et n'envoie rien.
- **Le panneau d'avancement** (`hooks/panel.tsx`) : il lit l'état du projet et l'affiche à côté de la conversation.
- **Les scripts** (`plugins/ariane/scripts/`) : lancés à la demande d'Ariane. Trois vont sur le réseau : la recherche de mise à jour (`check-update.mjs`), qui lit un fichier public de ce dépôt ; la mise à jour (`update-plugin.mjs`), qui appelle `claude plugin update` ; la publication du wiki (`publish-wiki.mjs`), qui pousse `docs/wiki` vers le wiki GitHub de ton propre dépôt, avec ton Git.

Le seul code tiers inclus est `qrcode-generator` (licence MIT), dans `plugins/ariane/scripts/vendor/`, avec sa notice.

## Ce qui entre dans le périmètre

- Un garde-fou qu'on peut contourner, ou qui laisse passer ce qu'il doit bloquer.
- Un script ou un hook qui exécute, lit ou envoie autre chose que ce qui est décrit ici et dans la section « Vie privée » du README.
- Une consigne d'agent ou de commande qui pousse Claude à une action dangereuse pour ta machine, tes comptes ou tes données.

Les failles de Claude Code lui-même, de Next.js, de Supabase ou de Vercel sont à signaler à leurs éditeurs. Une faille dans une application construite avec Ariane concerne d'abord son auteur ; si elle vient d'un modèle ou d'un savoir-faire fourni par Ariane, elle nous intéresse aussi.
