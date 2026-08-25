export function createStore(initialState) {
  let state = { ...initialState };
  const listeners = new Set();

  return {
    getState() {
      return state;
    },
    // Faz um merge raso do patch no estado atual e notifica os inscritos.
    setState(patch) {
      state = { ...state, ...patch };
      listeners.forEach(listener => listener(state));
    },
    // Retorna uma função para cancelar a inscrição, caso um dia seja preciso.
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}