// Tasks view: list, filter, add/edit/complete/delete.
const Tasks = {
  filters: { status: 'open', priority: 'all', search: '', who: 'all', product: 'all' },

  render(root) {
    const tasks = this.filtered();
    root.innerHTML = '';
    root.appendChild(el('div', { class: 'page-header' }, [
      el('div', {}, [
        el('h1', {}, ['Tasks']),
        el('div', { class: 'subtitle' }, [`${Store.all('tasks').filter(t => !t.done).length} aperti · ${Store.all('tasks').length} totali`]),
      ]),
      el('button', { class: 'btn btn-primary', onclick: () => this.openEditor() }, ['+ Nuovo task ', el('kbd', {}, ['N'])]),
    ]));

    // Toolbar
    const toolbar = el('div', { class: 'toolbar' });
    const search = el('input', { type: 'text', placeholder: 'Cerca tasks…', value: this.filters.search });
    search.addEventListener('input', () => { this.filters.search = search.value; this.refresh(); });
    toolbar.appendChild(search);

    [
      ['Aperti', 'open'], ['Tutti', 'all'], ['Completati', 'done'], ['In ritardo', 'overdue'], ['Oggi', 'today'],
    ].forEach(([label, val]) => {
      toolbar.appendChild(el('button', {
        class: 'chip ' + (this.filters.status === val ? 'active' : ''),
        onclick: () => { this.filters.status = val; this.refresh(); }
      }, [label]));
    });

    if (Store.self()) {
      toolbar.appendChild(el('span', { style: 'width:1px; height:18px; background:var(--border); margin:0 4px;' }));
      [['Tutti', 'all'], ['Mie', 'me'], ['Team', 'team'], ['Non assegnati', 'none']].forEach(([label, val]) => {
        toolbar.appendChild(el('button', {
          class: 'chip ' + (this.filters.who === val ? 'active' : ''),
          onclick: () => { this.filters.who = val; this.refresh(); }
        }, [label]));
      });
    }

    const products = Store.all('products');
    if (products.length > 0) {
      toolbar.appendChild(el('span', { style: 'width:1px; height:18px; background:var(--border); margin:0 4px;' }));
      const sel = el('select', { style: 'max-width:180px;' }, [
        el('option', { value: 'all', selected: this.filters.product === 'all' }, ['Tutti i prodotti']),
        el('option', { value: 'none', selected: this.filters.product === 'none' }, ['Senza prodotto']),
        ...products.map(pr => el('option', { value: pr.id, selected: this.filters.product === pr.id }, [pr.name])),
      ]);
      sel.addEventListener('change', () => { this.filters.product = sel.value; this.refresh(); });
      toolbar.appendChild(sel);
    }

    toolbar.appendChild(el('span', { class: 'spacer' }));
    ['all', 'p0', 'p1', 'p2', 'p3'].forEach(p => {
      toolbar.appendChild(el('button', {
        class: 'chip ' + (this.filters.priority === p ? 'active' : ''),
        onclick: () => { this.filters.priority = p; this.refresh(); }
      }, [p === 'all' ? 'Tutte priorità' : p.toUpperCase()]));
    });

    root.appendChild(toolbar);

    if (tasks.length === 0) {
      root.appendChild(el('div', { class: 'card empty' }, [
        el('div', {}, ['Nessun task trovato.']),
        el('div', { class: 'empty-hint' }, ['Premi N o clicca "+ Nuovo task" per iniziare.']),
      ]));
      return;
    }

    const list = el('div', {});
    tasks.forEach(t => list.appendChild(this.renderRow(t)));
    root.appendChild(list);
  },

  refresh() {
    this.render($('#view'));
  },

  renderRow(t) {
    const check = el('button', {
      class: 'check ' + (t.done ? 'checked' : ''),
      onclick: (e) => {
        e.stopPropagation();
        Store.update('tasks', t.id, { done: !t.done, doneAt: !t.done ? new Date().toISOString() : null });
        this.refresh();
      }
    }, ['✓']);

    const assignee = t.personId ? Store.get('people', t.personId) : null;
    const isMe = assignee?.isSelf;

    const product = t.productId ? Store.get('products', t.productId) : null;

    const title = el('div', {}, [
      el('div', { class: 'task-title' }, [t.title]),
      el('div', { class: 'task-meta', style: 'margin-top:4px;' }, [
        assignee ? el('span', { class: 'badge ' + (isMe ? 'badge-me' : 'tag') }, [
          isMe ? '👤 Tu' : initials(assignee.name) + ' · ' + assignee.name.split(' ')[0]
        ]) : null,
        product ? el('span', { class: 'badge product-chip' }, ['◆ ' + product.name]) : null,
        ...(t.tags || []).map(tag => el('span', { class: 'badge tag' }, ['#' + tag])),
      ]),
    ]);

    const meta = el('div', { class: 'task-meta' }, [
      t.dueDate ? el('span', { class: 'badge ' + dueClass(t.dueDate) }, [fmtRelativeDate(t.dueDate)]) : null,
    ]);

    const prio = el('span', { class: 'badge ' + (t.priority || 'p3') }, [(t.priority || 'p3').toUpperCase()]);

    const actions = el('div', { class: 'task-meta' }, [
      el('button', { class: 'btn btn-sm btn-icon', title: 'Modifica', onclick: (e) => { e.stopPropagation(); this.openEditor(t); } }, ['✎']),
      el('button', { class: 'btn btn-sm btn-icon btn-danger', title: 'Elimina', onclick: (e) => {
        e.stopPropagation();
        confirmDanger(`Eliminare il task "${t.title}"?`, () => { Store.remove('tasks', t.id); toast('Task eliminato'); this.refresh(); });
      } }, ['×']),
    ]);

    return el('div', { class: 'task-row ' + (t.done ? 'done' : ''), onclick: () => this.openEditor(t) }, [
      check, title, meta, prio, actions,
    ]);
  },

  filtered() {
    let arr = [...Store.all('tasks')];
    const f = this.filters;

    if (f.status === 'open') arr = arr.filter(t => !t.done);
    else if (f.status === 'done') arr = arr.filter(t => t.done);
    else if (f.status === 'overdue') arr = arr.filter(t => !t.done && t.dueDate && dueClass(t.dueDate) === 'overdue');
    else if (f.status === 'today') arr = arr.filter(t => !t.done && t.dueDate && dueClass(t.dueDate) === 'today');

    if (f.priority !== 'all') arr = arr.filter(t => (t.priority || 'p3') === f.priority);

    const selfId = Store.selfId();
    if (f.who === 'me' && selfId) arr = arr.filter(t => t.personId === selfId);
    else if (f.who === 'team' && selfId) arr = arr.filter(t => t.personId && t.personId !== selfId);
    else if (f.who === 'none') arr = arr.filter(t => !t.personId);

    if (f.product === 'none') arr = arr.filter(t => !t.productId);
    else if (f.product !== 'all') arr = arr.filter(t => t.productId === f.product);

    if (f.search) {
      const q = f.search.toLowerCase();
      arr = arr.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.notes || '').toLowerCase().includes(q) ||
        (t.tags || []).some(tg => tg.toLowerCase().includes(q))
      );
    }

    arr.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const ap = a.dueDate || '9999-12-31';
      const bp = b.dueDate || '9999-12-31';
      if (ap !== bp) return ap < bp ? -1 : 1;
      const pr = { p0: 0, p1: 1, p2: 2, p3: 3 };
      return (pr[a.priority] ?? 3) - (pr[b.priority] ?? 3);
    });

    return arr;
  },

  openEditor(task) {
    const isNew = !task || (!task.id && task.productId);
    const seedProduct = (task && !task.id) ? task.productId : null;
    const t = (task && task.id) ? task : { title: '', priority: 'p2', dueDate: '', tags: [], notes: '', personId: Store.selfId(), productId: seedProduct || null };

    const titleI = el('input', { type: 'text', value: t.title, placeholder: 'Cosa va fatto?' });
    const prioI = el('select', {}, ['p0', 'p1', 'p2', 'p3'].map(p =>
      el('option', { value: p, selected: t.priority === p }, [p.toUpperCase() + (p === 'p0' ? ' — urgente' : p === 'p1' ? ' — alta' : p === 'p2' ? ' — media' : ' — bassa')])
    ));
    const dueI = el('input', { type: 'date', value: t.dueDate || '' });
    const sortedPeople = [...Store.all('people')].sort((a, b) => {
      if (a.isSelf) return -1;
      if (b.isSelf) return 1;
      return a.name.localeCompare(b.name);
    });
    const personI = el('select', {}, [
      el('option', { value: '' }, ['—']),
      ...sortedPeople.map(p => el('option', { value: p.id, selected: t.personId === p.id }, [
        (p.isSelf ? '👤 ' : '') + p.name + (p.isSelf ? ' (tu)' : '')
      ])),
    ]);
    const tagsI = el('input', { type: 'text', value: (t.tags || []).join(', '), placeholder: 'es. backend, urgente, refactor' });
    const productI = el('select', {}, [
      el('option', { value: '' }, ['—']),
      ...Store.all('products').map(pr => el('option', { value: pr.id, selected: t.productId === pr.id }, [pr.name])),
    ]);
    const notesI = el('textarea', { placeholder: 'Note, contesto, link…' }, [t.notes || '']);

    const save = () => {
      const payload = {
        title: titleI.value.trim(),
        priority: prioI.value,
        dueDate: dueI.value || null,
        personId: personI.value || null,
        productId: productI.value || null,
        tags: tagsI.value.split(',').map(s => s.trim()).filter(Boolean),
        notes: notesI.value,
      };
      if (!payload.title) { toast('Titolo obbligatorio'); return; }
      if (isNew) {
        Store.add('tasks', { ...payload, done: false });
        toast('Task creato');
      } else {
        Store.update('tasks', t.id, payload);
        toast('Task aggiornato');
      }
      closeModal();
      this.refresh();
    };

    const form = el('div', {}, [
      el('h2', {}, [isNew ? 'Nuovo task' : 'Modifica task']),
      el('div', { class: 'form-row' }, [el('label', {}, ['Titolo']), titleI]),
      el('div', { class: 'form-row form-row-grid' }, [
        el('div', {}, [el('label', {}, ['Priorità']), prioI]),
        el('div', {}, [el('label', {}, ['Scadenza']), dueI]),
      ]),
      el('div', { class: 'form-row form-row-grid' }, [
        el('div', {}, [el('label', {}, ['Assegnato a']), personI]),
        el('div', {}, [el('label', {}, ['Prodotto']), productI]),
      ]),
      el('div', { class: 'form-row' }, [el('label', {}, ['Tag (separati da virgola)']), tagsI]),
      el('div', { class: 'form-row' }, [el('label', {}, ['Note']), notesI]),
      el('div', { class: 'modal-actions' }, [
        !isNew ? el('button', { class: 'btn btn-danger', onclick: () => {
          confirmDanger(`Eliminare il task "${t.title}"?`, () => {
            Store.remove('tasks', t.id); toast('Eliminato'); closeModal(); this.refresh();
          });
        } }, ['Elimina']) : null,
        el('span', { class: 'spacer' }),
        el('button', { class: 'btn', onclick: closeModal }, ['Annulla']),
        el('button', { class: 'btn btn-primary', onclick: save }, [isNew ? 'Crea' : 'Salva']),
      ]),
    ]);

    titleI.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
    });

    openModal(form);
  },
};
