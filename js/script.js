const STORAGE_KEY = 'wedding_families_v1';
const ADMIN_PASS = 'jaoedani';
 
const COUPLE_NAMES = 'Danielli & João Pedro';
const WEDDING_DATE = '28 de novembro de 2026 · 16h30 · Capela São José';
 
let state = {
  view: 'guest', // guest | search | family | success | admin-lock | admin
  families: [],
  selectedFamily: null,
  responses: {}, // memberId -> true/false
  adminTab: 'pending',
  loading: true
};

const SEED_DATA = [{}]

const API_URL = 'https://script.google.com/macros/s/AKfycbwl1Qx6eoP0mzal5-Fet6ynw-SQ809hNplbJek3FZUjKdTvtPQ-FeIFlREXzFeEpKkhEw/exec';
 
async function loadFamilies(){
  try{
    const res = await fetch(API_URL, { method: 'GET' });
    const data = await res.json();
    if(data && data.length){
      state.families = data;
    } else {
      // primeira vez: carrega a lista inicial de convidados
      state.families = SEED_DATA.map(f => ({
        id: uid(),
        name: f.name,
        members: f.members.map(m => ({ id: uid(), name: m.name, type: m.type, attending: null }))
      }));
      await saveFamilies();
    }
  }catch(e){
    state.families = [];
    alert('Não foi possível carregar a lista de convidados. Verifique sua conexão.');
  }
  state.loading = false;
}
 
async function saveFamilies(){
  try{
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ families: state.families })
    });
  }catch(e){
    alert('Não foi possível salvar. Verifique sua conexão e tente novamente.');
  }
}
 
function uid(){ return Math.random().toString(36).slice(2,10); }
 
function familyStatus(fam){
  const total = fam.members.length;
  const answered = fam.members.filter(m => m.attending === true || m.attending === false).length;
  const yes = fam.members.filter(m => m.attending === true).length;
  const no = fam.members.filter(m => m.attending === false).length;
  if(answered === 0) return 'pending';
  if(answered < total) return 'partial';
  if(yes === total) return 'confirmed';
  if(no === total) return 'declined';
  return 'mixed';
}
 
function render(){
  const app = document.getElementById('app');
  if(state.loading){ app.innerHTML = '<div class="loading">carregando…</div>'; return; }
  if(state.view === 'admin-lock'){ app.innerHTML = renderLock(); }
  else if(state.view === 'admin'){ app.innerHTML = renderAdmin(); }
  else { app.innerHTML = renderGuestFlow(); }
  bindEvents();
}
 
function branchDivider(){
  return `<div class="branch">
    <svg viewBox="0 0 120 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 8 H45" stroke="currentColor" stroke-width="1"/>
      <circle cx="60" cy="8" r="3" fill="currentColor"/>
      <path d="M75 8 H120" stroke="currentColor" stroke-width="1"/>
    </svg>
  </div>`;
}
 
function renderGuestFlow(){
  let inner = '';
  if(state.view === 'guest' || state.view === 'search'){
    inner = `
      <div id="search-input-wrap">
        <label class="field-label">Encontre o nome da sua família</label>
        <input type="text" id="search-box" placeholder="Ex: Família Silva, ou seu nome" autocomplete="off" value="${state.query||''}">
        <div class="results" id="results-box"></div>
      </div>
    `;
  } else if(state.view === 'family'){
    inner = renderFamilyCard();
  } else if(state.view === 'success'){
    inner = renderSuccess();
  }
 
  return `
    <header class="hero">
      <div class="eyebrow">Vamos nos casar!</div>
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
 
function renderFamilyCard(){
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
          <button class="toggle-btn yes ${val===true?'active':''}" data-val="yes">Vai</button>
          <button class="toggle-btn no ${val===false?'active':''}" data-val="no">Não vai</button>
        </div>
      </div>
    `;
  }).join('');
 
  return `
    <div class="top-nav">
      <button id="back-search" class="link-btn">← voltar</button>
    </div>
    <label class="field-label">${fam.name}</label>
    <div class="muted" style="margin-bottom:10px;">Marque quem vai comparecer ao casamento</div>
    ${rows}
    <button class="btn-primary" id="submit-rsvp" disabled>Confirmar resposta</button>
  `;
}
 
function renderSuccess(){
  const fam = state.selectedFamily;
  const yesCount = fam.members.filter(m => state.responses[m.id] === true).length;
  const msg = yesCount > 0
    ? `Recebemos a confirmação de ${yesCount} pessoa${yesCount>1?'s':''} da ${fam.name}. Mal podemos esperar para celebrar com vocês!`
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
 
function renderLock(){
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
 
function renderAdmin(){
  const fams = state.families;
  const allMembers = fams.flatMap(f => f.members.map(m => ({...m, famName:f.name, famId:f.id})));
  const confirmed = allMembers.filter(m => m.attending === true);
  const declined = allMembers.filter(m => m.attending === false);
  const pending = allMembers.filter(m => m.attending === undefined || m.attending === null);
 
  const tabData = {
    pending: pending,
    confirmed: confirmed,
    declined: declined,
    manage: null
  };
 
  let listHtml = '';
  if(state.adminTab !== 'manage'){
    const items = tabData[state.adminTab];
    if(items.length === 0){
      listHtml = `<div class="empty-state">Ninguém por aqui ainda.</div>`;
    } else {
      // group by family for readability
      const byFam = {};
      items.forEach(m => { (byFam[m.famName] = byFam[m.famName]||[]).push(m); });
      listHtml = Object.entries(byFam).map(([famName, members]) => `
        <div class="list-item">
          <div class="fam-name">${famName}</div>
          <div style="margin-top:6px;">
            ${members.map(m => `<span class="chip ${state.adminTab==='confirmed'?'yes':state.adminTab==='declined'?'no':'wait'}">${m.name}</span>`).join('')}
          </div>
        </div>
      `).join('');
    }
  } else {
    listHtml = renderManage();
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
      <button class="tab-btn ${state.adminTab==='pending'?'active':''}" data-tab="pending">Pendentes</button>
      <button class="tab-btn ${state.adminTab==='confirmed'?'active':''}" data-tab="confirmed">Confirmados</button>
      <button class="tab-btn ${state.adminTab==='declined'?'active':''}" data-tab="declined">Não vão</button>
      <button class="tab-btn ${state.adminTab==='manage'?'active':''}" data-tab="manage">Gerenciar lista</button>
    </div>
 
    <div style="margin-top:14px;">${listHtml}</div>
  `;
}
 
function renderManage(){
  const fams = state.families;
  const famsHtml = fams.map(f => `
    <div class="list-item">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="fam-name">${f.name}</div>
        <button class="remove-x" data-remove-fam="${f.id}">✕</button>
      </div>
      <div style="margin-top:6px;">
        ${f.members.map(m => `<span class="chip wait">${m.name}${m.type==='child'?' (criança)':''}</span>`).join('')}
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
 
let newMembers = [];
 
function renderMemberRows(){
  const wrap = document.getElementById('new-members-list');
  if(!wrap) return;
  wrap.innerHTML = newMembers.map((m,i) => `
    <div class="member-input-row">
      <input type="text" data-idx="${i}" class="member-name-input" placeholder="Nome do integrante" value="${m.name}">
      <select data-idx="${i}" class="member-type-input">
        <option value="adult" ${m.type==='adult'?'selected':''}>Adulto</option>
        <option value="child" ${m.type==='child'?'selected':''}>Criança</option>
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
      newMembers.splice(parseInt(e.target.dataset.removeMember),1);
      renderMemberRows();
    });
  });
}
 
function bindEvents(){
  // Guest search
  const searchBox = document.getElementById('search-box');
  if(searchBox){
    searchBox.addEventListener('input', e => {
      state.query = e.target.value;
      renderResults(e.target.value);
    });
    renderResults(state.query||'');
    searchBox.focus();
  }
 
  const backSearch = document.getElementById('back-search');
  if(backSearch) backSearch.addEventListener('click', () => { state.view='guest'; render(); });
 
  const editAgain = document.getElementById('edit-again');
  if(editAgain) editAgain.addEventListener('click', () => { state.view='family'; render(); });
 
  // Toggle buttons
  document.querySelectorAll('.toggle-group').forEach(group => {
    group.addEventListener('click', e => {
      const btn = e.target.closest('.toggle-btn');
      if(!btn) return;
      const memberId = group.dataset.member;
      state.responses[memberId] = btn.dataset.val === 'yes';
      render();
    });
  });
 
  const submitBtn = document.getElementById('submit-rsvp');
  if(submitBtn){
    const fam = state.selectedFamily;
    const allAnswered = fam.members.every(m => state.responses[m.id] !== undefined);
    submitBtn.disabled = !allAnswered;
    submitBtn.addEventListener('click', submitRsvp);
  }

  const goAdmin = document.getElementById('go-admin');
  if(goAdmin) goAdmin.addEventListener('click', () => { state.view='admin-lock'; render(); });
 
  const passSubmit = document.getElementById('pass-submit');
  if(passSubmit) passSubmit.addEventListener('click', () => {
    const val = document.getElementById('pass-input').value;
    if(val === ADMIN_PASS){ state.view='admin'; render(); }
    else alert('Senha incorreta.');
  });
  const passCancel = document.getElementById('pass-cancel');
  if(passCancel) passCancel.addEventListener('click', () => { state.view='guest'; render(); });
 
  const adminExit = document.getElementById('admin-exit');
  if(adminExit) adminExit.addEventListener('click', () => { state.view='guest'; render(); });
 
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.adminTab = btn.dataset.tab;
      if(state.adminTab === 'manage') newMembers = [];
      render();
      if(state.adminTab === 'manage') renderMemberRows();
    });
  });
 
  const addMemberRow = document.getElementById('add-member-row');
  if(addMemberRow) addMemberRow.addEventListener('click', () => {
    newMembers.push({name:'', type:'adult'});
    renderMemberRows();
  });
 
  const saveNewFam = document.getElementById('save-new-fam');
  if(saveNewFam) saveNewFam.addEventListener('click', async () => {
    const nameInput = document.getElementById('new-fam-name');
    const famName = nameInput.value.trim();
    const validMembers = newMembers.filter(m => m.name.trim() !== '');
    if(!famName || validMembers.length === 0){
      alert('Preencha o nome da família e pelo menos um integrante.');
      return;
    }
    state.families.push({
      id: uid(),
      name: famName,
      members: validMembers.map(m => ({ id: uid(), name: m.name.trim(), type: m.type, attending: null }))
    });
    await saveFamilies();
    newMembers = [];
    render();
  });
 
  document.querySelectorAll('[data-remove-fam]').forEach(btn => {
    btn.addEventListener('click', async e => {
      if(!confirm('Remover essa família da lista?')) return;
      const id = e.target.dataset.removeFam;
      state.families = state.families.filter(f => f.id !== id);
      await saveFamilies();
      render();
    });
  });
 
  if(state.adminTab === 'manage' && state.view === 'admin') renderMemberRows();
}
 
function renderResults(query){
  const box = document.getElementById('results-box');
  if(!box) return;
  if(!query || query.trim().length < 2){ box.innerHTML=''; return; }
  const q = query.trim().toLowerCase();
  const matches = state.families.filter(f =>
    f.name.toLowerCase().includes(q) ||
    f.members.some(m => m.name.toLowerCase().includes(q))
  );
  if(matches.length === 0){
    box.innerHTML = `<div class="muted" style="margin-top:10px;">Não encontramos essa família. Confira a grafia ou fale com os noivos.</div>`;
    return;
  }
  box.innerHTML = matches.map(f => `
    <div class="result-item" data-fam="${f.id}">${f.name} <span class="muted">— ${f.members.map(m=>m.name).join(', ')}</span></div>
  `).join('');
  box.querySelectorAll('.result-item').forEach(el => {
    el.addEventListener('click', () => {
      const fam = state.families.find(f => f.id === el.dataset.fam);
      state.selectedFamily = fam;
      state.responses = {};
      fam.members.forEach(m => { if(m.attending === true || m.attending === false) state.responses[m.id] = m.attending; });
      state.view = 'family';
      render();
    });
  });
}
 
async function submitRsvp(){
  const fam = state.selectedFamily;
  fam.members.forEach(m => { m.attending = state.responses[m.id]; });
  fam.respondedAt = new Date().toISOString();
  const idx = state.families.findIndex(f => f.id === fam.id);
  state.families[idx] = fam;
  await saveFamilies();
  state.view = 'success';
  render();
}
 
(async function init(){
  await loadFamilies();
  render();
})();
 
