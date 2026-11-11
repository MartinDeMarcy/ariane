export type PanelContract = never

declare module 'claude-code' {
  interface PluginState {
    ariane: {
      // Le texte brut de .ariane/state.json, ou null s'il n'y a pas de projet.
      raw: Shaped<string | null>
      // Le texte de .ariane/ideas.md, la boîte à idées, ou null si elle n'existe pas.
      ideas: Shaped<string | null>
      // La liste des idées en attente est dépliée dans le panneau.
      ideasOpen: Shaped<boolean>
      // La fenêtre des accès rapides est ouverte par-dessus le panneau.
      linksOpen: Shaped<boolean>
      // L'heure qu'il est, en minutes depuis 1970 : le panneau suit le temps qui passe.
      minute: Shaped<number>
      // La commande qu'un bouton du panneau est en train de lancer ('' : aucune),
      // et le cran du rond qui tourne sur ce bouton.
      launching: Shaped<{ command: string; frame: number }>
      // La démo de test du panneau, dans le dépôt d'Ariane : affichée ou non,
      // le jeu d'essai montré et le niveau de densité forcé (null : automatique).
      demo: Shaped<{ on: boolean; fixture: number; level: number | null }>
    }
  }
}
