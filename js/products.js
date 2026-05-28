// Products view: products with optional team(s) and people assignment.
// Tasks, notes, decisions can be linked to a product via productId.
const Products = {
  render(root) {
    root.innerHTML = '';
    root.appendChild(el('div', { class: 'page-header' }, [
      el('div', {}, [
        el('h1', {}, ['Prodotti']),
        el('div', { class: 'subtitle' }, [`${Store.all('products').length} prodotti`]),
      ]),
      el('button', { class: 'btn btn-primary', onclick: () => this.openEditor() }, ['+ Nuovo prodotto']),
    ]));

    const products = Store.all('products');
    if (products.length === 0) {
      root.appendChild(el('div', { class: 'card empty' }, [
        el('div', {}, ['Nessun prodotto.']),
        el('div', { class: 'empty-hint' }, ['Crea i prodotti per collegare team, persone, task, note e decisioni.']),
      ]));
      return;
    }

    const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name));
    const grid = el('div', { class: 'grid grid-2' });
    sorted.forEach(p => grid.appendChild(this.renderCard(p)));
    root.appendChild(grid);
  },

  refresh() { this.render($('#view')); },

  renderCard(p) {
    const teams = (p.teamIds || []).map(id => Store.get('teams', id)).filter(Boolean);
    const people = (p.personIds || []).map(id => Store.get('people', id)).filter(Boolean);
    const openTasks = Store.all('tasks').filter(t => t.productId === p.id && !t.done).length;
    const notesCount = Store.all('notes').filter(n => n.productId === p.id).length;
    const decisionsCount = Store.all('decisions').filter(d => d.productId === p.id).length;

    return el('div', { class: 'product-card', onclick: () => this.openDetail(p.id) }, [
      el('div', { class: 'row-flex' }, [
        el('div', { class: 'product-name' }, [p.name]),
        el('span', { class: 'spacer' }),
        openTasks > 0 ? el('span', { class: 'badge' }, [`${openTasks} task`]) : null,
      ]),
      p.description ? el('div', { class: 'tiny muted', style: 'margin-top:6px;' }, [p.description]) : null,
      teams.length > 0 ? el('div', { class: 'task-meta', style: 'margin-top:10px;' },
        teams.map(t => teamChip(t)).filter(Boolean)
      ) : null,
      people.length > 0 ? el('div', { class: 'team-avatars', style: 'margin-top:8px;' },
        people.slice(0, 8).map(pp => el('div', { class: 'avatar avatar-sm ' + (pp.isSelf ? 'avatar-self' : ''), title: pp.name }, [initials(pp.name)]))
      ) : null,
      (notesCount + decisionsCount > 0) ? el('div', { class: 'tiny faint', style: 'margin-top:8px;' }, [
        `${notesCount} note · ${decisionsCount} decisioni`,
      ]) : null,
    ]);
  },

  openEditor(product) {
    const isNew = !product;
    const p = product || { name: '', description: '', teamIds: [], personIds: [] };

    const nameI = el('input', { type: 'text', value: p.name, placeholder: 'Nome del prodotto' });
    const descI = el('textarea', { placeholder: 'Cosa fa, per chi, vincoli principali…' }, [p.description || '']);

    let teamIds = [...(p.teamIds || [])];
    const teamsRow = el('div', { class: 'tag-pick' });
    Store.all('teams').forEach(t => {
      const on = teamIds.includes(t.id);
      const color = t.color || '#6366f1';
      const chip = el('button', {
        class: 'chip ' + (on ? 'active' : ''),
        style: on ? `color:${color}; border-color:${hexToRgba(color, 0.5)}; background:${hexToRgba(color, 0.12)};` : '',
        onclick: (e) => {
          e.preventDefault();
          const cur = teamIds.includes(t.id);
          teamIds = cur ? teamIds.filter(x => x !== t.id) : [...teamIds, t.id];
          chip.classList.toggle('active', !cur);
          chip.setAttribute('style', !cur ? `color:${color}; border-color:${hexToRgba(color, 0.5)}; background:${hexToRgba(color, 0.12)};` : '');
        },
      }, [t.name]);
      teamsRow.appendChild(chip);
    });
    if (Store.all('teams').length === 0) teamsRow.appendChild(el('span', { class: 'tiny muted' }, ['Nessun team creato ancora.']));

    let personIds = [...(p.personIds || [])];
    const peopleRow = el('div', { class: 'tag-pick' });
    const sortedPeople = [...Store.all('people')].sort((a, b) => {
      if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    sortedPeople.forEach(pp => {
      const on = personIds.includes(pp.id);
      const chip = el('button', {
        class: 'chip ' + (on ? 'active' : ''),
        onclick: (e) => {
          e.preventDefault();
          const cur = personIds.includes(pp.id);
          personIds = cur ? personIds.filter(x => x !== pp.id) : [...personIds, pp.id];
          chip.classList.toggle('active', !cur);
        },
      }, [(pp.isSelf ? '👤 ' : '') + pp.name]);
      peopleRow.appendChild(chip);
    });
    if (sortedPeople.length === 0) peopleRow.appendChild(el('span', { class: 'tiny muted' }, ['Nessuna persona ancora.']));

    const save = () => {
      const payload = {
        name: nameI.value.trim(),
        description: descI.value.trim(),
        teamIds,
        personIds,
      };
      if (!payload.name) { toast('Nome obbligatorio'); return; }
      if (isNew) Store.add('products', payload);
      else Store.update('products', p.id, payload);
      toast('Salvato');
      closeModal();
      this.refresh();
    };

    const form = el('div', {}, [
      el('h2', {}, [isNew ? 'Nuovo prodotto' : 'Modifica prodotto']),
      el('div', { class: 'form-row' }, [el('label', {}, ['Nome']), nameI]),
      el('div', { class: 'form-row' }, [el('label', {}, ['Descrizione']), descI]),
      el('div', { class: 'form-row' }, [el('label', {}, ['Team assegnati']), teamsRow]),
      el('div', { class: 'form-row' }, [el('label', {}, ['Persone assegnate direttamente']), peopleRow]),
      el('div', { class: 'modal-actions' }, [
        !isNew ? el('button', { class: 'btn btn-danger', onclick: () => {
          confirmDanger(`Eliminare il prodotto "${p.name}"? I task/note/decisioni collegati verranno scollegati ma non eliminati.`, () => {
            Store.removeProduct(p.id); toast('Eliminato'); closeModal(); this.refresh();
          });
        } }, ['Elimina']) : null,
        el('span', { class: 'spacer' }),
        el('button', { class: 'btn', onclick: closeModal }, ['Annulla']),
        el('button', { class: 'btn btn-primary', onclick: save }, [isNew ? 'Crea' : 'Salva']),
      ]),
    ]);
    openModal(form);
  },

  openDetail(id) {
    const p = Store.get('products', id);
    if (!p) return;
    const teams = (p.teamIds || []).map(x => Store.get('teams', x)).filter(Boolean);
    const direct = (p.personIds || []).map(x => Store.get('people', x)).filter(Boolean);
    // People via teams + direct
    const viaTeams = Store.all('people').filter(pp => (pp.teamIds || []).some(tid => (p.teamIds || []).includes(tid)));
    const everyone = [...new Map([...direct, ...viaTeams].map(x => [x.id, x])).values()];

    const tasks = Store.all('tasks').filter(t => t.productId === id);
    const notes = Store.all('notes').filter(n => n.productId === id);
    const decisions = Store.all('decisions').filter(d => d.productId === id);

    const content = el('div', {}, [
      el('div', { class: 'row-flex', style: 'margin-bottom:14px;' }, [
        el('div', {}, [
          el('h2', { style: 'margin:0;' }, [p.name]),
          p.description ? el('div', { class: 'muted tiny' }, [p.description]) : null,
        ]),
        el('span', { class: 'spacer' }),
        el('button', { class: 'btn btn-sm', onclick: () => { closeModal(); this.openEditor(p); } }, ['Modifica']),
      ]),

      teams.length > 0 ? el('div', { class: 'card', style: 'margin-bottom:12px;' }, [
        el('div', { class: 'card-title' }, ['Team']),
        el('div', { class: 'task-meta' }, teams.map(t => teamChip(t)).filter(Boolean)),
      ]) : null,

      everyone.length > 0 ? el('div', { class: 'card', style: 'margin-bottom:12px;' }, [
        el('div', { class: 'card-title' }, [`Persone coinvolte (${everyone.length})`]),
        el('div', { class: 'team-avatars' }, everyone.map(pp => el('div', {
          class: 'avatar avatar-sm ' + (pp.isSelf ? 'avatar-self' : ''),
          title: pp.name + (pp.role ? ' · ' + pp.role : ''),
          onclick: (e) => { e.stopPropagation(); closeModal(); App.go('people'); People.openDetail(pp.id); },
          style: 'cursor:pointer;',
        }, [initials(pp.name)]))),
      ]) : null,

      el('div', { class: 'card', style: 'margin-bottom:12px;' }, [
        el('div', { class: 'row-flex', style: 'margin-bottom:8px;' }, [
          el('div', { class: 'card-title', style: 'margin:0;' }, [`Task (${tasks.filter(t => !t.done).length} aperti)`]),
          el('span', { class: 'spacer' }),
          el('button', { class: 'btn btn-sm', onclick: () => { closeModal(); Tasks.filters.product = id; App.go('tasks'); Tasks.openEditor({ productId: id }); } }, ['+ Task']),
        ]),
        tasks.length === 0 ? el('div', { class: 'tiny muted' }, ['Nessun task collegato.']) :
          el('div', {}, tasks.slice(0, 12).map(t => el('div', { class: 'list-item', style: 'cursor:pointer;', onclick: () => { closeModal(); App.go('tasks'); Tasks.openEditor(t); } }, [
            el('span', { class: 'check ' + (t.done ? 'checked' : '') }, [t.done ? '✓' : '']),
            el('span', { class: 'spacer', style: 'text-align:left;' + (t.done ? 'text-decoration:line-through;color:var(--text-faint);' : '') }, [t.title]),
            t.dueDate ? el('span', { class: 'badge ' + dueClass(t.dueDate) }, [fmtRelativeDate(t.dueDate)]) : null,
          ]))),
      ]),

      notes.length > 0 ? el('div', { class: 'card', style: 'margin-bottom:12px;' }, [
        el('div', { class: 'card-title' }, [`Note (${notes.length})`]),
        el('div', {}, notes.slice(0, 8).map(n => el('div', { class: 'list-item', style: 'cursor:pointer;', onclick: () => { closeModal(); App.go('notes'); Notes.openEditor(n); } }, [
          el('span', { class: 'spacer', style: 'text-align:left;' }, [n.title || '(senza titolo)']),
          el('span', { class: 'tiny faint' }, [fmtRelativeDate(n.updatedAt || n.createdAt)]),
        ]))),
      ]) : null,

      decisions.length > 0 ? el('div', { class: 'card' }, [
        el('div', { class: 'card-title' }, [`Decisions (${decisions.length})`]),
        el('div', {}, decisions.slice(0, 8).map(d => el('div', { class: 'list-item', style: 'cursor:pointer;', onclick: () => { closeModal(); App.go('decisions'); Decisions.openEditor(d); } }, [
          el('span', { class: 'spacer', style: 'text-align:left;' }, [d.title]),
          el('span', { class: 'badge' }, [DECISION_STATUS_LABELS[d.status] || DECISION_STATUS_LABELS.proposed]),
        ]))),
      ]) : null,

      el('div', { class: 'modal-actions' }, [el('button', { class: 'btn', onclick: closeModal }, ['Chiudi'])]),
    ]);

    openModal(content);
  },
};
