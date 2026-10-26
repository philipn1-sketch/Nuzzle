// Stands in for src/state/AppState.tsx in the design build: components only read the snackbar from it,
// and the design build has no app state, so there is never a snackbar.
export const useApp = () => ({ snack: null, hideSnack: () => {} });
