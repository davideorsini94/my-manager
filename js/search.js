// Global search palette (Cmd/Ctrl+K).
const Search = {
  open() {
    const input = el('input', { type: 'text', placeholder: 'Cerca tasks, persone, note, decisioni…' });
    const results = el('div', { style: 'margin-top:14px; max-height:50vh; overflow-y:auto;' });
    let focusIdx = 0;
    let items = [];

    const update = () => {
      const q = input.value.trim().toLowerCase();
      results.innerHTML = '';
      items = [];
      if (!q) {
        results.appendChild(el('div', { class: 'tiny muted', style: 'padding:12px;' }, ['Inizia a digitare…']));
        return;
      }

      const match = (s) => (s || '').toLowerCase().includes(q);

      Store.all('tasks').filter(t => match(t.title) || match(t.notes) || (t.tags || []).some(match))
        .slice(0, 6).forEach(t => items.push({ kind: 'Task', label: t.title, meta: t.dueDate ? 'scade ' + fmtRelativeDate(t.dueDate) : '—', onpick: () => { closeModal(); App.go('tasks'); Tasks.openEditor(t); } }));

      Store.all('people').filter(p => match(p.name) || match(p.role) || match(p.notes))
        .slice(0, 6).forEach(p => items.push({ kind: 'Team', label: p.name, meta: p.role || '', onpick: () => { closeModal(); App.go('people'); People.openDetail(p.id); } }));

      Store.all('notes').filter(n => match(n.title) || match(n.body) || (n.tags || []).some(match))
        .slice(0, 6).forEach(n => items.push({ kind: 'Note', label: n.title || '(senza titolo)', meta: fmtRelativeDate(n.updatedAt || n.createdAt), onpick: () => { closeModal(); App.go('notes'); Notes.openEditor(n); } }));

      Store.all('decisions').filter(d => match(d.title) || match(d.context) || match(d.decision))
        .slice(0, 6).forEach(d => items.push({ kind: 'Decision', label: d.title, meta: d.status || '', onpick: () => { closeModal(); App.go('decisions'); Decisions.openEditor(d); } }));

      Store.all('teams').filter(t => match(t.name) || match(t.description))
        .slice(0, 6).forEach(t => items.push({ kind: 'Team', label: t.name, meta: t.description || '', onpick: () => { closeModal(); App.go('teams'); Teams.openDetail(t.id); } }));

      Store.all('products').filter(p => match(p.name) || match(p.description))
        .slice(0, 6).forEach(p => items.push({ kind: 'Prodotto', label: p.name, meta: p.description || '', onpick: () => { closeModal(); App.go('products'); Products.openDetail(p.id); } }));

      if (items.length === 0) {
        results.appendChild(el('div', { class: 'tiny muted', style: 'padding:12px;' }, ['Nessun risultato.']));
        return;
      }

      focusIdx = 0;
      items.forEach((it, i) => {
        const row = el('div', { class: 'search-result' + (i === focusIdx ? ' focus' : ''), onclick: it.onpick }, [
          el('div', { class: 'sr-title' }, [it.label]),
          el('div', { class: 'sr-meta' }, [it.kind + ' · ' + it.meta]),
        ]);
        results.appendChild(row);
      });
    };

    const setFocus = (next) => {
      const rows = $$('.search-result', results);
      if (rows.length === 0) return;
      focusIdx = (next + rows.length) % rows.length;
      rows.forEach((r, i) => r.classList.toggle('focus', i === focusIdx));
      rows[focusIdx].scrollIntoView({ block: 'nearest' });
    };

    input.addEventListener('input', update);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setFocus(focusIdx + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setFocus(focusIdx - 1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[focusIdx]) items[focusIdx].onpick();
      }
    });

    openModal(el('div', {}, [
      el('h2', {}, ['Ricerca']),
      input,
      results,
    ]));
    update();
  },
};
