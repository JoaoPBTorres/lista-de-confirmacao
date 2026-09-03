import { ADMIN_PASS } from '../constants.js';
import { uid } from '../utils.js';

let newMembers = [];
let editingFamilyId = null;
let editFamilyName = '';
let editMembers = [];

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

    <div id="admin-list-container" style="margin-top:14px;">${renderListSection(state)}</div>
  `;
}

function renderListSection(state) {
  if (state.adminTab === 'manage') {
    return renderManage(state);
  }
  const fams = state.families;
  const allMembers = fams.flatMap(f => f.members.map(m => ({ ...m, famName: f.name, famId: f.id })));
  const tabData = {
    pending: allMembers.filter(m => m.attending === undefined || m.attending === null),
    confirmed: allMembers.filter(m => m.attending === true),
    declined: allMembers.filter(m => m.attending === false)
  };
  const items = tabData[state.adminTab];
  if (items.length === 0) {
    return `<div class="empty-state">Ninguém por aqui ainda.</div>`;
  }
  const byFam = {};
  items.forEach(m => { (byFam[m.famName] = byFam[m.famName] || []).push(m); });
  return Object.entries(byFam).map(([famName, members]) => `
    <div class="list-item">
      <div class="fam-name">${famName}</div>
      <div style="margin-top:6px;">
        ${members.map(m => `<span class="chip ${state.adminTab === 'confirmed' ? 'yes' : state.adminTab === 'declined' ? 'no' : 'wait'}">${m.name}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

function renderManage(state) {
  const famsHtml = state.families.map(f => {
    if (f.id === editingFamilyId) {
      return renderFamilyEditForm(f);
    }
    return `
      <div class="list-item">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div class="fam-name">${f.name}</div>
          <div>
            <button class="small-btn" data-edit-fam="${f.id}">Editar</button>
            <button class="remove-x" data-remove-fam="${f.id}">✕</button>
          </div>
        </div>
        <div style="margin-top:6px;">
          ${f.members.map(m => `<span class="chip wait">${m.name}${m.type === 'child' ? ' (criança)' : ''}</span>`).join('')}
        </div>
      </div>
    `;
  }).join('');

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

function renderFamilyEditForm(fam) {
  return `
    <div class="list-item">
      <div class="eyebrow">Editando família</div>
      <input type="text" id="edit-fam-name" value="${editFamilyName}" placeholder="Nome da família">
      <div id="edit-members-list"></div>
      <button class="small-btn" data-add-edit-member="1">+ adicionar integrante</button>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button class="btn-primary" style="margin-top:0;" data-save-edit-fam="${fam.id}">Salvar alterações</button>
        <button class="btn-secondary" style="margin-top:0;" data-cancel-edit="1">Cancelar</button>
      </div>
    </div>
  `;
}

function refreshList(state, store, repository) {
  const container = document.getElementById('admin-list-container');
  if (!container) return;
  container.innerHTML = renderListSection(state);
  if (state.adminTab === 'manage') {
    renderMemberRows();
    if (editingFamilyId) renderEditMemberRows();
    bindManageEvents(state, store, repository);
  }
}

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

function renderEditMemberRows() {
  const wrap = document.getElementById('edit-members-list');
  if (!wrap) return;
  wrap.innerHTML = editMembers.map((m, i) => `
    <div class="member-input-row">
      <input type="text" data-idx="${i}" class="edit-member-name-input" placeholder="Nome do integrante" value="${m.name}">
      <select data-idx="${i}" class="edit-member-type-input">
        <option value="adult" ${m.type === 'adult' ? 'selected' : ''}>Adulto</option>
        <option value="child" ${m.type === 'child' ? 'selected' : ''}>Criança</option>
      </select>
      <button class="remove-x" data-remove-edit-member="${i}">✕</button>
    </div>
  `).join('');
  wrap.querySelectorAll('.edit-member-name-input').forEach(inp => {
    inp.addEventListener('input', e => { editMembers[e.target.dataset.idx].name = e.target.value; });
  });
  wrap.querySelectorAll('.edit-member-type-input').forEach(sel => {
    sel.addEventListener('change', e => { editMembers[e.target.dataset.idx].type = e.target.value; });
  });
  wrap.querySelectorAll('[data-remove-edit-member]').forEach(btn => {
    btn.addEventListener('click', e => {
      editMembers.splice(parseInt(e.target.dataset.removeEditMember), 1);
      renderEditMemberRows();
    });
  });
}

export function bindAdminEvents(state, store, repository) {
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

  const adminExit = document.getElementById('admin-exit');
  if (adminExit) adminExit.addEventListener('click', () => store.setState({ view: 'guest' }));

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === 'manage') newMembers = [];
      editingFamilyId = null;
      store.setState({ adminTab: btn.dataset.tab });
    });
  });

  if (state.adminTab === 'manage') {
    renderMemberRows();
    if (editingFamilyId) renderEditMemberRows();
    bindManageEvents(state, store, repository);
  }
}

function bindManageEvents(state, store, repository) {
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
      const families = await repository.mergeAndSave(fresh => [...fresh, newFamily]);
      newMembers = [];
      store.setState({ families });
    });
  }

  document.querySelectorAll('[data-remove-fam]').forEach(btn => {
    btn.addEventListener('click', async e => {
      if (!confirm('Remover essa família da lista?')) return;
      const id = e.target.dataset.removeFam;
      const families = await repository.mergeAndSave(fresh => fresh.filter(f => f.id !== id));
      store.setState({ families });
    });
  });

  document.querySelectorAll('[data-edit-fam]').forEach(btn => {
    btn.addEventListener('click', () => {
      const fam = state.families.find(f => f.id === btn.dataset.editFam);
      if (!fam) return;
      editingFamilyId = fam.id;
      editFamilyName = fam.name;
      editMembers = fam.members.map(m => ({ ...m }));
      refreshList(state, store, repository);
    });
  });

  const editNameInput = document.getElementById('edit-fam-name');
  if (editNameInput) {
    editNameInput.addEventListener('input', e => { editFamilyName = e.target.value; });
  }

  const addEditMember = document.querySelector('[data-add-edit-member]');
  if (addEditMember) {
    addEditMember.addEventListener('click', () => {
      editMembers.push({ id: uid(), name: '', type: 'adult', attending: null });
      renderEditMemberRows();
    });
  }

  const cancelEdit = document.querySelector('[data-cancel-edit]');
  if (cancelEdit) {
    cancelEdit.addEventListener('click', () => {
      editingFamilyId = null;
      refreshList(state, store, repository);
    });
  }

  const saveEditFam = document.querySelector('[data-save-edit-fam]');
  if (saveEditFam) {
    saveEditFam.addEventListener('click', async () => {
      const famName = editFamilyName.trim();
      const validMembers = editMembers.filter(m => m.name.trim() !== '');
      if (!famName || validMembers.length === 0) {
        alert('Preencha o nome da família e pelo menos um integrante.');
        return;
      }
      const famId = saveEditFam.dataset.saveEditFam;
      const families = await repository.mergeAndSave(fresh => fresh.map(f => {
        if (f.id !== famId) return f;
        return {
          ...f,
          name: famName,
          members: validMembers.map(m => ({
            id: m.id || uid(),
            name: m.name.trim(),
            type: m.type,
            attending: m.attending !== undefined ? m.attending : null
          }))
        };
      }));
      editingFamilyId = null;
      store.setState({ families });
    });
  }
}