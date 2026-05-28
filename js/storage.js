// Persistent storage layer.
// Primary: HTTP API (server.js) — persists to data/state.json on disk + rotating backups.
// Fallback: localStorage (when opened as file:// or server unreachable).
// Saves are debounced (300ms) to avoid disk thrash on rapid edits.

const STORE_KEY = 'mymanager_v1';
const SAVE_DEBOUNCE_MS = 300;

const DEFAULT_STATE = {
  meta: { createdAt: new Date().toISOString(), theme: 'dark' },
  tasks: [],
  people: [],
  teams: [],
  products: [],
  notes: [],
  decisions: [],
};

const Store = {
  state: null,
  mode: 'unknown',          // 'server' | 'local' | 'unknown'
  status: 'idle',           // 'idle' | 'saving' | 'saved' | 'error'
  lastSavedAt: null,
  lastError: null,
  _saveTimer: null,
  _pendingSave: false,
  _listeners: [],

  on(fn) { this._listeners.push(fn); },
  _emit() { this._listeners.forEach(fn => { try { fn(this); } catch {} }); },

  // Try to load from server, fall back to localStorage.
  async load() {
    try {
      const r = await fetch('/api/state', { method: 'GET' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const text = await r.text();
      const parsed = text && text !== '{}' ? JSON.parse(text) : null;
      this.state = parsed ? this._merge(parsed) : structuredClone(DEFAULT_STATE);
      this.mode = 'server';
      this.status = 'saved';
      this.lastSavedAt = new Date().toISOString();
      // If server was empty but we have local data, push it up to seed.
      if (!parsed) {
        try {
          const raw = localStorage.getItem(STORE_KEY);
          if (raw) {
            this.state = this._merge(JSON.parse(raw));
            await this._pushNow();
          } else {
            await this._pushNow();
          }
        } catch {}
      }
    } catch (e) {
      // Fallback to localStorage (file:// or server down).
      this.mode = 'local';
      try {
        const raw = localStorage.getItem(STORE_KEY);
        this.state = raw ? this._merge(JSON.parse(raw)) : structuredClone(DEFAULT_STATE);
      } catch {
        this.state = structuredClone(DEFAULT_STATE);
      }
      this.status = 'idle';
    }
    this._emit();
    return this.state;
  },

  _merge(parsed) {
    return { ...structuredClone(DEFAULT_STATE), ...parsed };
  },

  // Schedule a debounced save. Always writes to localStorage immediately as belt-and-braces.
  save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(this.state)); } catch {}
    if (this.mode !== 'server') { this.status = 'saved'; this.lastSavedAt = new Date().toISOString(); this._emit(); return; }
    this._pendingSave = true;
    this.status = 'saving';
    this._emit();
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._pushNow(), SAVE_DEBOUNCE_MS);
  },

  async _pushNow() {
    if (this.mode !== 'server') return;
    this._pendingSave = false;
    try {
      const r = await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.state),
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      this.status = 'saved';
      this.lastSavedAt = data.savedAt || new Date().toISOString();
      this.lastError = null;
    } catch (e) {
      this.status = 'error';
      this.lastError = e.message;
      // Keep localStorage copy; user can retry.
    }
    this._emit();
  },

  // Flush any pending debounced save right away (used before export / window unload).
  async flush() {
    if (this._pendingSave) {
      clearTimeout(this._saveTimer);
      await this._pushNow();
    }
  },

  // Generic CRUD
  add(collection, item) {
    const entry = { id: uid(), createdAt: new Date().toISOString(), ...item };
    this.state[collection].unshift(entry);
    this.save();
    return entry;
  },
  update(collection, id, patch) {
    const idx = this.state[collection].findIndex(x => x.id === id);
    if (idx === -1) return null;
    this.state[collection][idx] = { ...this.state[collection][idx], ...patch, updatedAt: new Date().toISOString() };
    this.save();
    return this.state[collection][idx];
  },
  remove(collection, id) {
    this.state[collection] = this.state[collection].filter(x => x.id !== id);
    this.save();
  },
  get(collection, id) {
    return this.state[collection].find(x => x.id === id);
  },
  all(collection) {
    return this.state[collection];
  },

  // Self / "me" — special person flagged with isSelf:true.
  self() {
    return this.state.people.find(p => p.isSelf) || null;
  },
  selfId() {
    return this.self()?.id || null;
  },
  setSelf({ name, role }) {
    const existing = this.self();
    if (existing) {
      return this.update('people', existing.id, { name, role });
    }
    return this.add('people', { name, role, isSelf: true, actions: [], goals: [] });
  },

  exportJSON() { return JSON.stringify(this.state, null, 2); },
  async importJSON(json) {
    const parsed = JSON.parse(json);
    if (!parsed.tasks || !parsed.people || !parsed.notes) throw new Error('File non valido');
    this.state = this._merge(parsed);
    this.save();
    await this.flush();
  },

  // Cascade cleanup: when a team/product/person is deleted, scrub references elsewhere.
  removeTeam(id) {
    this.state.teams = this.state.teams.filter(t => t.id !== id);
    this.state.people.forEach(p => {
      if (Array.isArray(p.teamIds)) p.teamIds = p.teamIds.filter(x => x !== id);
    });
    this.state.products.forEach(pr => {
      if (Array.isArray(pr.teamIds)) pr.teamIds = pr.teamIds.filter(x => x !== id);
    });
    this.save();
  },
  removeProduct(id) {
    this.state.products = this.state.products.filter(p => p.id !== id);
    ['tasks', 'notes', 'decisions'].forEach(col => {
      this.state[col].forEach(item => { if (item.productId === id) item.productId = null; });
    });
    this.save();
  },
  removePersonWithCascade(id) {
    this.state.people = this.state.people.filter(p => p.id !== id);
    this.state.tasks.forEach(t => { if (t.personId === id) t.personId = null; });
    this.state.products.forEach(pr => {
      if (Array.isArray(pr.personIds)) pr.personIds = pr.personIds.filter(x => x !== id);
    });
    this.save();
  },

  async listBackups() {
    if (this.mode !== 'server') return [];
    try {
      const r = await fetch('/api/backups');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      return data.backups || [];
    } catch { return []; }
  },

  async restoreBackup(name) {
    if (this.mode !== 'server') throw new Error('Backup disponibili solo con il server');
    const r = await fetch('/api/backups/' + encodeURIComponent(name));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const json = await r.text();
    await this.importJSON(json);
  },
};

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// Ensure pending writes flush on unload.
window.addEventListener('beforeunload', () => {
  if (Store._pendingSave && Store.mode === 'server') {
    try {
      navigator.sendBeacon('/api/state', new Blob([JSON.stringify(Store.state)], { type: 'application/json' }));
    } catch {}
  }
});
