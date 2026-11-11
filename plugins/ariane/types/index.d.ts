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
      // Les crans qu'il reste à une fenêtre pour remonter à sa place (0 : posée).
      modalStep: Shaped<number>
      // La démo de test du panneau, dans le dépôt d'Ariane : affichée ou non,
      // le jeu d'essai montré et le niveau de densité forcé (null : automatique).
      demo: Shaped<{ on: boolean; fixture: number; level: number | null }>
    }
  }
}
