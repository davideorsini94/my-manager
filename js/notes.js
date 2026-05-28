// Notes — quick notes, meeting notes, brain dumps.
const Notes = {
  filters: { search: '', tag: 'all' },

  render(root) {
    root.innerHTML = '';
    root.appendChild(el('div', { class: 'page-header' }, [
      el('div', {}, [
        el('h1', {}, ['Notes']),
        el('div', { class: 'subtitle' }, [`${Store.all('notes').length} note`]),
      ]),
      el('button', { class: 'btn btn-primary', onclick: () => this.openEditor() }, ['+ Nuova nota']),
    ]));

    const allTags = [...new Set(Store.all('notes').flatMap(n => n.tags || []))].sort();

    const toolbar = el('div', { class: 'toolbar' });
    const search = el('input', { type: 'text', placeholder: 'Cerca…', value: this.filters.search });
    search.addEventListener('input', () => { this.filters.search = search.value; this.refresh(); });
    toolbar.appendChild(search);
    toolbar.appendChild(el('button', {
      class: 'chip ' + (this.filters.tag === 'all' ? 'active' : ''),
      onclick: () => { this.filters.tag = 'all'; this.refresh(); }
    }, ['Tutti i tag']));
    allTags.forEach(tag => toolbar.appendChild(el('button', {
      class: 'chip ' + (this.filters.tag === tag ? 'active' : ''),
      onclick: () => { this.filters.tag = tag; this.refresh(); }
    }, ['#' + tag])));
    root.appendChild(toolbar);

    const notes = this.filtered();
    if (notes.length === 0) {
      root.appendChild(el('div', { class: 'card empty' }, [
        el('div', {}, ['Nessuna nota.']),
        el('div', { class: 'empty-hint' }, ['Usa le note per meeting, idee, brain dump rapidi.']),
      ]));
      return;
    }

    const grid = el('div', { class: 'grid grid-3' });
    notes.forEach(n => grid.appendChild(this.renderCard(n)));
    root.appendChild(grid);
  },

  refresh() { this.render($('#view')); },

  renderCard(n) {
    return el('div', { class: 'note-card', onclick: () => this.openEditor(n) }, [
      el('div', { class: 'note-title' }, [n.title || '(senza titolo)']),
      el('div', { class: 'note-preview' }, [(n.body || '').replace(/\n/g, ' ').slice(0, 160) || '—']),
      el('div', { class: 'note-meta' }, [
        el('span', {}, [fmtRelativeDate(n.updatedAt || n.createdAt)]),
        n.productId ? el('span', { class: 'badge product-chip' }, ['◆ ' + (Store.get('products', n.productId)?.name || '?')]) : null,
        ...(n.tags || []).slice(0, 3).map(tag => el('span', { class: 'badge tag' }, ['#' + tag])),
      ]),
    ]);
  },

  filtered() {
    let arr = [...Store.all('notes')];
    if (this.filters.tag !== 'all') arr = arr.filter(n => (n.tags || []).includes(this.filters.tag));
    if (this.filters.search) {
      const q = this.filters.search.toLowerCase();
      arr = arr.filter(n =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.body || '').toLowerCase().includes(q) ||
        (n.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    arr.sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
    return arr;
  },

  openEditor(note) {
    const isNew = !note;
    const n = note || { title: '', body: '', tags: [] };

    const titleI = el('input', { type: 'text', value: n.title, placeholder: 'Titolo della nota' });
    const tagsI = el('input', { type: 'text', value: (n.tags || []).join(', '), placeholder: 'tag separati da virgola' });
    const productI = el('select', {}, [
      el('option', { value: '' }, ['—']),
      ...Store.all('products').map(pr => el('option', { value: pr.id, selected: n.productId === pr.id }, [pr.name])),
    ]);
    const bodyI = el('textarea', { placeholder: 'Scrivi qui… (supporta **grassetto**, link, - liste)', style: 'min-height:240px;' }, [n.body || '']);

    const save = () => {
      const payload = {
        title: titleI.value.trim(),
        body: bodyI.value,
        tags: tagsI.value.split(',').map(s => s.trim()).filter(Boolean),
        productId: productI.value || null,
      };
      if (!payload.title && !payload.body) { toast('Nota vuota'); return; }
      if (isNew) {
        Store.add('notes', payload);
        toast('Nota creata');
      } else {
        Store.update('notes', n.id, payload);
        toast('Salvata');
      }
      closeModal();
      this.refresh();
    };

    const form = el('div', {}, [
      el('h2', {}, [isNew ? 'Nuova nota' : 'Modifica nota']),
      el('div', { class: 'form-row' }, [titleI]),
      el('div', { class: 'form-row form-row-grid' }, [
        el('div', {}, [el('label', {}, ['Tag']), tagsI]),
        el('div', {}, [el('label', {}, ['Prodotto']), productI]),
      ]),
      el('div', { class: 'form-row' }, [bodyI]),
      el('div', { class: 'modal-actions' }, [
        !isNew ? el('button', { class: 'btn btn-danger', onclick: () => {
          confirmDanger('Eliminare questa nota?', () => { Store.remove('notes', n.id); toast('Eliminata'); closeModal(); this.refresh(); });
        } }, ['Elimina']) : null,
        el('span', { class: 'spacer' }),
        el('button', { class: 'btn', onclick: closeModal }, ['Annulla']),
        el('button', { class: 'btn btn-primary', onclick: save }, [isNew ? 'Crea' : 'Salva']),
      ]),
    ]);

    bodyI.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
    });

    openModal(form);
  },
};
