import { COUPLE_NAMES, WEDDING_DATE } from '../constants.js';
import { branchDivider } from './shared.js';

export function renderGuestFlow(state) {
  let inner = '';
  if (state.view === 'guest' || state.view === 'search') {
    inner = `
      <div id="search-input-wrap">
        <label class="field-label">Encontre o nome da sua família</label>
        <input type="text" id="search-box" placeholder="Ex: Família Silva, ou seu nome" autocomplete="off" value="${state.query || ''}">
        <div class="results" id="results-box"></div>
      </div>
    `;
  } else if (state.view === 'family') {
    inner = renderFamilyCard(state);
  } else if (state.view === 'success') {
    inner = renderSuccess(state);
  }

  return `
    <header class="hero">
      <div class="eyebrow">Vamos nos casar</div>
      <h1 class="title">${COUPLE_NAMES}</h1>
      ${branchDivider()}
      <div class="subtitle">Será uma alegria ter você com a gente</div>
      <span class="date-pill">${WEDDING_DATE}</span>
    </header>
    <div class="card">
      ${inner}
    </div>
    <footer class="admin-link">
      <button id="go-admin">Área dos noivos</button>
      <p class="subtitle">Esta com dificuldades? entre em contato com a gente</p>
      <a href="https://wa.me/5514920008815?text=Ol%C3%A1%2C%20estou%20tendo%20dificuldades%20para%20preencher%20a%20lista%2C%20pode%20me%20ajudar%3F" target="_blank">
        Falar com a noiva
      </a>
      <br>
      <a href="https://wa.me/5514998394267?text=Ol%C3%A1%2C%20estou%20tendo%20dificuldades%20para%20preencher%20a%20lista%2C%20pode%20me%20ajudar%3F" target="_blank">
        Falar com o noivo
      </a>
    </footer>
  `;
}

function renderFamilyCard(state) {
  const fam = state.selectedFamily;
  const rows = fam.members.map(m => {
    const val = state.responses[m.id];
    return `
      <div class="member-row">
        <div>
          <div class="member-name">${m.name}</div>
          <span class="member-tag">${m.type === 'child' ? 'criança' : 'convidado'}</span>
        </div>
        <div class="toggle-group" data-member="${m.id}">
          <button class="toggle-btn yes ${val === true ? 'active' : ''}" data-val="yes">Vai</button>
          <button class="toggle-btn no ${val === false ? 'active' : ''}" data-val="no">Não vai</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="top-nav">
      <button id="back-search" class="link-btn">← voltar</button>
    </div>
    <label class="field-label">${fam.name}</label>
    <div class="muted" style="margin-bottom:10px;">
      Marque quem vai comparecer ao casamento — pode confirmar só a sua
      presença agora e os outros integrantes respondem quando puderem.
    </div>
    ${rows}
    <button class="btn-primary" id="submit-rsvp" disabled>Confirmar presença</button>
  `;
}

function renderSuccess(state) {
  const fam = state.selectedFamily;
  const yesCount = fam.members.filter(m => state.responses[m.id] === true).length;
  const msg = yesCount > 0
    ? `Recebemos a confirmação de ${yesCount} pessoa${yesCount > 1 ? 's' : ''} da ${fam.name}. Mal podemos esperar para celebrar com vocês!`
    : `Recebemos sua resposta. Vamos sentir sua falta, obrigado por avisar!`;
  return `
    <div class="success-box">
      <div class="success-icon">✓</div>
      <h2 class="serif" style="font-size:24px;margin:0 0 8px;">Resposta enviada</h2>
      <div class="muted" style="font-size:15px;color:#5C6B54;">${msg}</div>
      <button class="btn-secondary" id="edit-again">Alterar resposta</button>
    </div>
  `;
}

function renderResults(state, store) {
  const box = document.getElementById('results-box');
  if (!box) return;
  const query = state.query || '';
  if (query.trim().length < 2) {
    box.innerHTML = '';
    return;
  }
  const q = query.trim().toLowerCase();
  const matches = state.families.filter(f =>
    f.name.toLowerCase().includes(q) ||
    f.members.some(m => m.name.toLowerCase().includes(q))
  );
  if (matches.length === 0) {
    box.innerHTML = `<div class="muted" style="margin-top:10px;">Não encontramos essa família. Confira a grafia ou fale com os noivos.</div>`;
    return;
  }
  box.innerHTML = matches.map(f => `
    <div class="result-item" data-fam="${f.id}">${f.name} <span class="muted">— ${f.members.map(m => m.name).join(', ')}</span></div>
  `).join('');
  box.querySelectorAll('.result-item').forEach(el => {
    el.addEventListener('click', () => {
      const fam = state.families.find(f => f.id === el.dataset.fam);
      const responses = {};
      fam.members.forEach(m => { if (m.attending === true || m.attending === false) responses[m.id] = m.attending; });
      store.setState({ selectedFamily: fam, responses, view: 'family' });
    });
  });
}

async function submitRsvp(state, store, repository) {
  const famId = state.selectedFamily.id;
  const responses = state.responses;
  let notFound = false;

  const families = await repository.mergeAndSave(fresh => {
    const fam = fresh.find(f => f.id === famId);
    if (!fam) { notFound = true; return fresh; }
    fam.members.forEach(m => {
      if (responses[m.id] !== undefined) m.attending = responses[m.id];
    });
    fam.respondedAt = new Date().toISOString();
    return fresh;
  });

  if (notFound) {
    alert('Não encontramos mais sua família na lista. Por favor, fale com os noivos.');
    store.setState({ families, view: 'guest' });
    return;
  }

  const updatedFam = families.find(f => f.id === famId);
  store.setState({ families, selectedFamily: updatedFam, view: 'success' });
}

export function bindGuestEvents(state, store, repository) {
  const searchBox = document.getElementById('search-box');
  if (searchBox) {
    searchBox.addEventListener('input', e => {
      const current = store.getState();
      current.query = e.target.value;
      renderResults(current, store);
    });
    renderResults(state, store);
    searchBox.focus();
  }

  const backSearch = document.getElementById('back-search');
  if (backSearch) backSearch.addEventListener('click', () => store.setState({ view: 'guest' }));

  const editAgain = document.getElementById('edit-again');
  if (editAgain) editAgain.addEventListener('click', () => store.setState({ view: 'family' }));

  document.querySelectorAll('.toggle-group').forEach(group => {
    group.addEventListener('click', e => {
      const btn = e.target.closest('.toggle-btn');
      if (!btn) return;
      const memberId = group.dataset.member;
      store.setState({ responses: { ...state.responses, [memberId]: btn.dataset.val === 'yes' } });
    });
  });

  const submitBtn = document.getElementById('submit-rsvp');
  if (submitBtn) {
    const fam = state.selectedFamily;
    const anyAnswered = fam.members.some(m => state.responses[m.id] !== undefined);
    submitBtn.disabled = !anyAnswered;
    submitBtn.addEventListener('click', async () => {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando…';
      await submitRsvp(state, store, repository);
    });
  }

  const goAdmin = document.getElementById('go-admin');
  if (goAdmin) goAdmin.addEventListener('click', () => store.setState({ view: 'admin-lock' }));
}