import { API_URL, SEED_DATA } from './constants.js';
import { uid } from './utils.js';

export const FamilyRepository = {
  async load() {
    try {
      const data = await this._fetchRaw();
      if (data && data.length) {
        return data;
      }
      const seeded = SEED_DATA.map(f => ({
        id: uid(),
        name: f.name,
        members: f.members.map(m => ({ id: uid(), name: m.name, type: m.type, attending: null }))
      }));
      await this.save(seeded);
      return seeded;
    } catch (e) {
      alert('Não foi possível carregar a lista de convidados. Verifique sua conexão.');
      return [];
    }
  },

  async _fetchRaw() {
    const res = await fetch(API_URL, { method: 'GET' });
    return res.json();
  },

  async save(families) {
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ families })
      });
    } catch (e) {
      alert('Não foi possível salvar. Verifique sua conexão e tente novamente.');
    }
  },

  async mergeAndSave(applyChange) {
    let fresh;
    try {
      fresh = await this._fetchRaw();
      if (!fresh || !fresh.length) fresh = [];
    } catch (e) {
      alert('Não foi possível confirmar a lista mais recente antes de salvar. Tente novamente.');
      throw e;
    }
    const updated = applyChange(fresh);
    await this.save(updated);
    return updated;
  }
};