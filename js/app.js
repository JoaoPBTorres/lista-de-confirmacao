import { createStore } from './store.js';
import { FamilyRepository } from './api.js';
import { renderGuestFlow, bindGuestEvents } from './views/guestView.js';
import { renderLock, renderAdmin, bindAdminEvents } from './views/adminView.js';

const store = createStore({
  view: 'guest',        // guest | search | family | success | admin-lock | admin
  families: [],
  selectedFamily: null,
  responses: {},
  adminTab: 'pending',
  loading: true,
  query: ''
});

const appEl = document.getElementById('app');

function render(state) {
  if (state.loading) {
    appEl.innerHTML = '<div class="loading">carregando…</div>';
    return;
  }
  if (state.view === 'admin-lock') {
    appEl.innerHTML = renderLock();
  } else if (state.view === 'admin') {
    appEl.innerHTML = renderAdmin(state);
  } else {
    appEl.innerHTML = renderGuestFlow(state);
  }
  bindEvents(state);
}

function bindEvents(state) {
  if (state.view === 'admin' || state.view === 'admin-lock') {
    bindAdminEvents(state, store, FamilyRepository);
  } else {
    bindGuestEvents(state, store, FamilyRepository);
  }
}

render(store.getState());
store.subscribe(render);

(async function init() {
  const families = await FamilyRepository.load();
  store.setState({ families, loading: false });
})();