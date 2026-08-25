import { ADMIN_PASS } from '../constants.js';
import { uid } from '../utils.js';

let newMembers = [];

export function renderLock() {
  return `
    <div class="lock-screen">
      <div class="eyebrow">Acesso restrito</div>
      <h2 class="serif" style="font-size:26px;">Área dos noivos</h2>
      <input type="text" id="pass-input" placeholder="senha">
      <button class="btn-primary" id="pass-submit">Entrar</button>
      <button class="btn-secondary" id="pass-cancel">Voltar</button>
    </div>
  `;
}

export function renderAdmin(state) {
  const fams = state.families;
  const allMembers = fams.flatMap(f => f.members.map(m => ({ ...m, famName: f.name, famId: f.id })));
  const confirmed = allMembers.filter(m => m.attending === true);
  const declined = allMembers.filter(m => m.attending === false);
  const pending = allMembers.filter(m => m.attending === undefined || m.attending === null);

  const tabData = { pending, confirmed, declined, manage: null };

  let listHtml = '';
  if (state.adminTab !== 'manage') {
    const items = tabData[state.adminTab];
    if (items.length === 0) {
      listHtml = `<div class="empty-state">Ninguém por aqui ainda.</div>`;
    } else {
      const byFam = {};
      items.forEach(m => { (byFam[m.famName] = byFam[m.famName] || []).push(m); });
      listHtml = Object.entries(byFam).map(([famName, members]) => `
        <div class="list-item">
          <div class="fam-name">${famName}</div>
          <div style="margin-top:6px;">
            ${members.map(m => `<span class="chip ${state.adminTab === 'confirmed' ? 'yes' : state.adminTab === 'declined' ? 'no' : 'wait'}">${m.name}</span>`).join('')}
          </div>
        </div>
      `).join('');
    }
  } else {
    listHtml = renderManage(state);
  }

  return `
    <div class="admin-header">
      <div>
        <div class="eyebrow">Painel</div>
        <h2 class="serif" style="font-size:28px;margin:2px 0;">Confirmações</h2>
      </div>
      <button class="link-btn" id="admin-exit">sair</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card confirmed">
        <div class="stat-num">${confirmed.length}</div>
        <div class="stat-label">Confirmados</div>
      </div>
      <div class="stat-card declined">
        <div class="stat-num">${declined.length}</div>
        <div class="stat-label">Não vão</div>
      </div>
      <div class="stat-card pending">
        <div class="stat-num">${pending.length}</div>
        <div class="stat-label">Pendentes</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${allMembers.length}</div>
        <div class="stat-label">Total esperado</div>
      </div>
    </div>

    <div class="tabs">
      <button class="tab-btn ${state.adminTab === 'pending' ? 'active' : ''}" data-tab="pending">Pendentes</button>
      <button class="tab-btn ${state.adminTab === 'confirmed' ? 'active' : ''}" data-tab="confirmed">Confirmados</button>
      <button class="tab-btn ${state.adminTab === 'declined' ? 'active' : ''}" data-tab="declined">Não vão</button>
      <button class="tab-btn ${state.adminTab === 'manage' ? 'active' : ''}" data-tab="manage">Gerenciar lista</button>
    </div>

    <div style="margin-top:14px;">${listHtml}</div>
  `;
}

function renderManage(state) {
  const famsHtml = state.families.map(f => `
    <div class="list-item">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="fam-name">${f.name}</div>
        <button class="remove-x" data-remove-fam="${f.id}">✕</button>
      </div>
      <div style="margin-top:6px;">
        ${f.members.map(m => `<span class="chip wait">${m.name}${m.type === 'child' ? ' (criança)' : ''}</span>`).join('')}
      </div>
    </div>
  `).join('');

  return `
    <div class="muted" style="margin-bottom:6px;">Famílias cadastradas</div>
    ${famsHtml || '<div class="empty-state">Nenhuma família cadastrada ainda.</div>'}

    <div class="admin-form">
      <div class="eyebrow" style="margin-top:22px;">Adicionar família</div>
      <input type="text" id="new-fam-name" placeholder="Nome da família (ex: Família Oliveira)">
      <div id="new-members-list"></div>
      <button class="small-btn" id="add-member-row">+ adicionar integrante</button>
      <button class="btn-primary" id="save-new-fam">Salvar família</button>
    </div>
  `;
}

// Redesenha só as linhas de integrantes do formulário de nova família
// (não o app inteiro), para não perder o que já foi digitado nas outras linhas.
function renderMemberRows() {
  const wrap = document.getElementById('new-members-list');
  if (!wrap) return;
  wrap.innerHTML = newMembers.map((m, i) => `
    <div class="member-input-row">
      <input type="text" data-idx="${i}" class="member-name-input" placeholder="Nome do integrante" value="${m.name}">
      <select data-idx="${i}" class="member-type-input">
        <option value="adult" ${m.type === 'adult' ? 'selected' : ''}>Adulto</option>
        <option value="child" ${m.type === 'child' ? 'selected' : ''}>Criança</option>
      </select>
      <button class="remove-x" data-remove-member="${i}">✕</button>
    </div>
  `).join('');
  wrap.querySelectorAll('.member-name-input').forEach(inp => {
    inp.addEventListener('input', e => { newMembers[e.target.dataset.idx].name = e.target.value; });
  });
  wrap.querySelectorAll('.member-type-input').forEach(sel => {
    sel.addEventListener('change', e => { newMembers[e.target.dataset.idx].type = e.target.value; });
  });
  wrap.querySelectorAll('[data-remove-member]').forEach(btn => {
    btn.addEventListener('click', e => {
      newMembers.splice(parseInt(e.target.dataset.removeMember), 1);
      renderMemberRows();
    });
  });
}

export function bindAdminEvents(state, store, repository) {
  // Tela de senha
  const passSubmit = document.getElementById('pass-submit');
  if (passSubmit) {
    passSubmit.addEventListener('click', () => {
      const val = document.getElementById('pass-input').value;
      if (val === ADMIN_PASS) store.setState({ view: 'admin' });
      else alert('Senha incorreta.');
    });
  }
  const passCancel = document.getElementById('pass-cancel');
  if (passCancel) passCancel.addEventListener('click', () => store.setState({ view: 'guest' }));

  // Dashboard
  const adminExit = document.getElementById('admin-exit');
  if (adminExit) adminExit.addEventListener('click', () => store.setState({ view: 'guest' }));

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === 'manage') newMembers = [];
      store.setState({ adminTab: btn.dataset.tab });
    });
  });

  const addMemberRow = document.getElementById('add-member-row');
  if (addMemberRow) {
    addMemberRow.addEventListener('click', () => {
      newMembers.push({ name: '', type: 'adult' });
      renderMemberRows();
    });
  }

  const saveNewFam = document.getElementById('save-new-fam');
  if (saveNewFam) {
    saveNewFam.addEventListener('click', async () => {
      const famName = document.getElementById('new-fam-name').value.trim();
      const validMembers = newMembers.filter(m => m.name.trim() !== '');
      if (!famName || validMembers.length === 0) {
        alert('Preencha o nome da família e pelo menos um integrante.');
        return;
      }
      const newFamily = {
        id: uid(),
        name: famName,
        members: validMembers.map(m => ({ id: uid(), name: m.name.trim(), type: m.type, attending: null }))
      };
      const families = [...state.families, newFamily];
      await repository.save(families);
      newMembers = [];
      store.setState({ families });
    });
  }

  document.querySelectorAll('[data-remove-fam]').forEach(btn => {
    btn.addEventListener('click', async e => {
      if (!confirm('Remover essa família da lista?')) return;
      const id = e.target.dataset.removeFam;
      const families = state.families.filter(f => f.id !== id);
      await repository.save(families);
      store.setState({ families });
    });
  });

  if (state.adminTab === 'manage' && state.view === 'admin') renderMemberRows();
}