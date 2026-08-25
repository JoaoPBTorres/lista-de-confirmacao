import { API_URL, SEED_DATA } from './constants.js';
import { uid } from './utils.js';

export const FamilyRepository = {
  async load() {
    try {
      const res = await fetch(API_URL, { method: 'GET' });
      const data = await res.json();
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

  // Persiste a lista completa de famílias.
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
  }
};