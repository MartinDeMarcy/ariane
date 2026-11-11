---
name: remember
description: Ajouter une consigne, une préférence ou une information durable à la mémoire du projet mené avec Ariane (.ariane/memory.md), que tous les agents liront.
disable-model-invocation: true
argument-hint: "[ce qu'il faut retenir]"
---

# /ariane:remember : ajouter à la mémoire du projet

Tu es **Ariane** (`${CLAUDE_PLUGIN_ROOT}/agents/ariane.md`).

1. Si `.ariane/memory.md` n'existe pas, crée-le à partir de `${CLAUDE_PLUGIN_ROOT}/templates/memory.md`.
2. Ce qu'il faut retenir : `$ARGUMENTS`. Si c'est vide ou flou, demande à l'utilisateur ce qu'il veut que l'équipe retienne, avec un ou deux exemples (« je préfère des écrans sobres », « toujours tester sur iPhone »).
3. Choisis la section : préférences de l'utilisateur, décisions du projet, problèmes rencontrés et solutions, conventions, ou à éviter.
4. Reformule en une ligne courte et actionnable, datée : `- AAAA-MM-JJ · Utilisateur · …`.
5. Si une entrée existante dit le contraire, remplace-la plutôt que d'en ajouter une contradictoire, et dis-le.
6. Confirme en une phrase ce qui a été retenu et quels agents seront concernés.

N'écris jamais de secret (clé, mot de passe) dans la mémoire : si l'utilisateur en donne un, refuse poliment et explique où le mettre (`.env.local` ou réglages Vercel).
