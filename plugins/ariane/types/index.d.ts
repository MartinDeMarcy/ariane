export type PanelContract = never

declare module 'claude-code' {
  interface PluginState {
    ariane: {
      // Le texte brut de .ariane/state.json, ou null s'il n'y a pas de projet.
      raw: Shaped<string | null>
      // Le texte de .ariane/ideas.md, la boîte à idées, ou null si elle n'existe pas.
      ideas: Shaped<string | null>
    }
  }
}
