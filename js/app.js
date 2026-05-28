// Main app: routing, theme, shortcuts, import/export, init.
const App = {
  view: 'dashboard',

  async init() {
    await Store.load();
    Store.on(() => this.renderSyncStatus());

    // theme
    const theme = Store.state.meta?.theme || 'dark';
    document.body.dataset.theme = theme;
    $('#themeIcon').textContent = theme === 'light' ? '☀' : '◐';

    // initial view from hash
    const fromHash = (location.hash || '#dashboard').slice(1);
    if (['dashboard', 'tasks', 'people', 'teams', 'products', 'notes', 'decisions'].includes(fromHash)) this.view = fromHash;

    // nav bindings
    $$('.nav-item').forEach(btn => btn.addEventListener('click', () => this.go(btn.dataset.view)));

    // footer bindings
    $('#searchBtn').addEventListener('click', () => Search.open());
    $('#themeBtn').addEventListener('click', () => this.toggleTheme());
    $('#exportBtn').addEventListener('click', () => this.exportBackup());
    $('#importBtn').addEventListener('click', () => $('#importInput').click());
    $('#importInput').addEventListener('change', (e) => this.importBackup(e));
    const backupsBtn = $('#backupsBtn');
    if (backupsBtn) backupsBtn.addEventListener('click', () => this.openBackups());
    const profileBtn = $('#profileBtn');
    if (profileBtn) profileBtn.addEventListener('click', () => this.openProfileSetup(false));

    // global shortcuts
    document.addEventListener('keydown', (e) => this.handleShortcut(e));

    window.addEventListener('hashchange', () => {
      const v = (location.hash || '#dashboard').slice(1);
      if (v !== this.view) this.go(v);
    });

    this.renderSyncStatus();
    this.go(this.view);

    // First-run: prompt for the user's own profile.
    if (!Store.self()) {
      setTimeout(() => this.openProfileSetup(true), 200);
    }
  },

  openProfileSetup(isFirstRun) {
    const self = Store.self() || { name: '', role: '' };
    const nameI = el('input', { type: 'text', value: self.name || '', placeholder: 'Nome cognome' });
    const roleI = el('input', { type: 'text', value: self.role || 'Tech Lead R&D', placeholder: 'Es. Tech Lead R&D' });

    const save = () => {
      const name = nameI.value.trim();
      if (!name) { toast('Inserisci il tuo nome'); return; }
      Store.setSelf({ name, role: roleI.value.trim() });
      toast(isFirstRun ? 'Tutto pronto 👋' : 'Profilo aggiornato');
      closeModal();
      this.go(this.view);
    };

    const content = el('div', {}, [
      el('h2', {}, [isFirstRun ? 'Benvenuto in MyManager' : 'Il tuo profilo']),
      isFirstRun ? el('div', { class: 'muted', style: 'margin-bottom:14px; font-size:13px;' }, [
        'Dimmi chi sei: comparirai nel team e sarai il destinatario predefinito dei nuovi task.',
      ]) : null,
      el('div', { class: 'form-row' }, [el('label', {}, ['Nome']), nameI]),
      el('div', { class: 'form-row' }, [el('label', {}, ['Ruolo']), roleI]),
      el('div', { class: 'modal-actions' }, [
        !isFirstRun ? el('button', { class: 'btn', onclick: closeModal }, ['Annulla']) : null,
        el('button', { class: 'btn btn-primary', onclick: save }, [isFirstRun ? 'Iniziamo' : 'Salva']),
      ]),
    ]);
    nameI.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
    openModal(content);
  },

  renderSyncStatus() {
    const node = $('#syncStatus');
    if (!node) return;
    const map = {
      saving: { icon: '⟳', text: 'Salvando…', cls: 'syncing' },
      saved: { icon: '●', text: Store.mode === 'server' ? 'Sincronizzato' : 'Locale', cls: 'ok' },
      error: { icon: '⚠', text: 'Errore: ' + (Store.lastError || 'sync fallita'), cls: 'err' },
      idle: { icon: '○', text: Store.mode === 'local' ? 'Solo localStorage' : 'In attesa', cls: '' },
    };
    const s = map[Store.status] || map.idle;
    node.className = 'sync-status ' + s.cls;
    node.innerHTML = '';
    node.appendChild(el('span', { class: 'sync-dot' }, [s.icon]));
    node.appendChild(el('span', {}, [s.text]));
    if (Store.mode === 'local') {
      node.title = 'Server non raggiungibile — i dati restano nel localStorage del browser. Avvia "node server.js" per la persistenza su file.';
    } else if (Store.status === 'saved' && Store.lastSavedAt) {
      node.title = 'Ultimo salvataggio: ' + new Date(Store.lastSavedAt).toLocaleTimeString('it-IT');
    } else {
      node.title = '';
    }
  },

  go(view) {
    if (!['dashboard', 'tasks', 'people', 'teams', 'products', 'notes', 'decisions'].includes(view)) return;
    this.view = view;
    location.hash = '#' + view;
    $$('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
    const root = $('#view');
    const map = { dashboard: Dashboard, tasks: Tasks, people: People, teams: Teams, products: Products, notes: Notes, decisions: Decisions };
    map[view].render(root);
    window.scrollTo({ top: 0 });
  },

  toggleTheme() {
    const cur = document.body.dataset.theme === 'light' ? 'light' : 'dark';
    const next = cur === 'light' ? 'dark' : 'light';
    document.body.dataset.theme = next;
    $('#themeIcon').textContent = next === 'light' ? '☀' : '◐';
    Store.state.meta = { ...Store.state.meta, theme: next };
    Store.save();
  },

  async exportBackup() {
    await Store.flush();
    const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.href = url;
    a.download = `mymanager-backup-${stamp}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 200);
    toast('Backup esportato');
  },

  importBackup(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await Store.importJSON(reader.result);
        toast('Import riuscito');
        this.go(this.view);
      } catch (err) {
        toast('Import fallito: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  },

  async openBackups() {
    if (Store.mode !== 'server') { toast('Backup su disco richiedono il server (node server.js)'); return; }
    const list = await Store.listBackups();
    const content = el('div', {}, [
      el('h2', {}, ['Backup su disco']),
      el('div', { class: 'tiny muted', style: 'margin-bottom:12px;' }, [
        `${list.length} snapshot · vengono creati automaticamente ad ogni salvataggio (gli ultimi 30 vengono conservati).`,
      ]),
      list.length === 0
        ? el('div', { class: 'empty' }, ['Nessun backup ancora.'])
        : el('div', { style: 'max-height:55vh;overflow-y:auto;' }, list.map(b => {
            const pretty = b.name.replace('state-', '').replace('.json', '').replace(/-/g, (m, i) => i === 10 ? ' ' : i > 10 ? ':' : '-');
            return el('div', { class: 'list-item' }, [
              el('div', { style: 'flex:1;' }, [
                el('div', {}, [pretty]),
                el('div', { class: 'tiny muted' }, [b.name + ' · ' + (b.size / 1024).toFixed(1) + ' KB']),
              ]),
              el('button', { class: 'btn btn-sm', onclick: () => {
                confirmDanger(`Ripristinare lo snapshot del ${pretty}? Lo stato attuale verrà sovrascritto (ma a sua volta verrà salvato come nuovo backup).`, async () => {
                  try {
                    await Store.restoreBackup(b.name);
                    toast('Ripristinato');
                    closeModal();
                    this.go(this.view);
                  } catch (e) { toast('Errore: ' + e.message); }
                });
              } }, ['Ripristina']),
            ]);
          })),
      el('div', { class: 'modal-actions' }, [el('button', { class: 'btn', onclick: closeModal }, ['Chiudi'])]),
    ]);
    openModal(content);
  },

  // 'g d' chord, '/' to search, n for new, etc.
  _chord: null,
  _chordTimer: null,
  handleShortcut(e) {
    const inField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable;
    const modalOpen = !$('#modal').classList.contains('hidden');

    // Cmd/Ctrl+K search — works anywhere
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      Search.open();
      return;
    }
    if (inField || modalOpen) return;

    if (e.key === '/') { e.preventDefault(); Search.open(); return; }

    // 'g' chord for navigation
    if (this._chord === 'g') {
      clearTimeout(this._chordTimer);
      this._chord = null;
      const map = { d: 'dashboard', t: 'tasks', p: 'people', m: 'teams', r: 'products', n: 'notes', x: 'decisions' };
      if (map[e.key]) { this.go(map[e.key]); return; }
    }
    if (e.key === 'g') {
      this._chord = 'g';
      clearTimeout(this._chordTimer);
      this._chordTimer = setTimeout(() => { this._chord = null; }, 700);
      return;
    }

    // 'n' opens new item depending on view
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      const map = { dashboard: () => Tasks.openEditor(), tasks: () => Tasks.openEditor(), people: () => People.openEditor(), teams: () => Teams.openEditor(), products: () => Products.openEditor(), notes: () => Notes.openEditor(), decisions: () => Decisions.openEditor() };
      map[this.view]?.();
    }
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
