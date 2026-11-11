export type PanelContract = never

declare module 'claude-code' {
  interface PluginState {
    ariane: {
      // Le texte brut de .ariane/state.json, ou null s'il n'y a pas de projet.
      raw: Shaped<string | null>
    }
  }
}
