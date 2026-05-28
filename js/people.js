// People / Team management — members, 1:1 cadence, notes & action items.
const People = {
  filter: { teamId: 'all' },

  render(root) {
    root.innerHTML = '';
    root.appendChild(el('div', { class: 'page-header' }, [
      el('div', {}, [
        el('h1', {}, ['Persone']),
        el('div', { class: 'subtitle' }, [`${Store.all('people').length} persone`]),
      ]),
      el('button', { class: 'btn btn-primary', onclick: () => this.openEditor() }, ['+ Nuova persona']),
    ]));

    const teams = Store.all('teams');
    if (teams.length > 0) {
      const toolbar = el('div', { class: 'toolbar' });
      toolbar.appendChild(el('button', {
        class: 'chip ' + (this.filter.teamId === 'all' ? 'active' : ''),
        onclick: () => { this.filter.teamId = 'all'; this.refresh(); },
      }, ['Tutti']));
      teams.forEach(t => {
        const color = t.color || '#6366f1';
        const active = this.filter.teamId === t.id;
        toolbar.appendChild(el('button', {
          class: 'chip ' + (active ? 'active' : ''),
          style: active ? `color:${color}; border-color:${hexToRgba(color, 0.5)}; background:${hexToRgba(color, 0.12)};` : '',
          onclick: () => { this.filter.teamId = t.id; this.refresh(); },
        }, [t.name]));
      });
      toolbar.appendChild(el('button', {
        class: 'chip ' + (this.filter.teamId === 'none' ? 'active' : ''),
        onclick: () => { this.filter.teamId = 'none'; this.refresh(); },
      }, ['Senza team']));
      root.appendChild(toolbar);
    }

    let people = Store.all('people');
    if (this.filter.teamId !== 'all') {
      if (this.filter.teamId === 'none') people = people.filter(p => !(p.teamIds || []).length);
      else people = people.filter(p => (p.teamIds || []).includes(this.filter.teamId));
    }

    if (people.length === 0) {
      root.appendChild(el('div', { class: 'card empty' }, [
        el('div', {}, ['Nessun membro del team.']),
        el('div', { class: 'empty-hint' }, ['Aggiungi i tuoi colleghi per tracciare 1:1, action items e contesto.']),
      ]));
      return;
    }

    const sorted = [...people].sort((a, b) => {
      if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1;
      const an = this.nextOneOnOne(a);
      const bn = this.nextOneOnOne(b);
      if (an && bn) return an < bn ? -1 : 1;
      if (an) return -1;
      if (bn) return 1;
      return a.name.localeCompare(b.name);
    });

    const grid = el('div', { class: 'grid grid-3' });
    sorted.forEach(p => grid.appendChild(this.renderCard(p)));
    root.appendChild(grid);
  },

  refresh() { this.render($('#view')); },

  renderCard(p) {
    const openTasks = Store.all('tasks').filter(t => t.personId === p.id && !t.done).length;

    const teamChips = (p.teamIds || []).map(id => Store.get('teams', id)).filter(Boolean);

    if (p.isSelf) {
      return el('div', { class: 'person-card person-self', onclick: () => this.openDetail(p.id) }, [
        el('div', { class: 'person-head' }, [
          el('div', { class: 'avatar avatar-self' }, [initials(p.name)]),
          el('div', {}, [
            el('div', { class: 'person-name' }, [p.name, ' ', el('span', { class: 'badge badge-me' }, ['Tu'])]),
            el('div', { class: 'person-role' }, [p.role || '—']),
          ]),
        ]),
        teamChips.length > 0 ? el('div', { class: 'task-meta', style: 'margin-top:8px;' }, teamChips.map(t => teamChip(t))) : null,
        el('div', { class: 'tiny muted', style: 'margin-top:8px;' }, [
          openTasks > 0 ? `${openTasks} tue attività aperte` : 'Nessuna attività aperta',
        ]),
      ]);
    }

    const next = this.nextOneOnOne(p);
    let nextLabel = next ? `1:1 ${fmtRelativeDate(next)}` : '1:1 non pianificato';
    let nextCls = '';
    if (next) {
      const dc = dueClass(next);
      if (dc === 'overdue') nextCls = 'overdue';
      else if (dc === 'today' || dc === 'soon') nextCls = 'due';
    }

    return el('div', { class: 'person-card', onclick: () => this.openDetail(p.id) }, [
      el('div', { class: 'person-head' }, [
        el('div', { class: 'avatar' }, [initials(p.name)]),
        el('div', {}, [
          el('div', { class: 'person-name' }, [p.name]),
          el('div', { class: 'person-role' }, [p.role || '—']),
        ]),
      ]),
      teamChips.length > 0 ? el('div', { class: 'task-meta', style: 'margin-top:8px;' }, teamChips.map(t => teamChip(t))) : null,
      el('div', { class: 'next-1on1 ' + nextCls }, [nextLabel]),
      openTasks > 0 ? el('div', { class: 'tiny muted', style: 'margin-top:6px;' }, [`${openTasks} task aperti`]) : null,
    ]);
  },

  nextOneOnOne(p) {
    if (p.nextOneOnOne) return p.nextOneOnOne;
    if (p.lastOneOnOne && p.cadenceDays) {
      const d = new Date(p.lastOneOnOne + 'T00:00:00');
      d.setDate(d.getDate() + Number(p.cadenceDays));
      return d.toISOString().slice(0, 10);
    }
    return null;
  },

  openEditor(person) {
    if (person?.isSelf) { App.openProfileSetup(false); return; }
    const isNew = !person;
    const p = person || { name: '', role: '', cadenceDays: 14, lastOneOnOne: '', nextOneOnOne: '', notes: '' };

    const nameI = el('input', { type: 'text', value: p.name, placeholder: 'Nome cognome' });
    const roleI = el('input', { type: 'text', value: p.role || '', placeholder: 'es. Senior Backend Engineer' });
    const cadenceI = el('input', { type: 'number', value: p.cadenceDays || 14, min: 1, max: 365 });
    const lastI = el('input', { type: 'date', value: p.lastOneOnOne || '' });
    const nextI = el('input', { type: 'date', value: p.nextOneOnOne || '' });
    const notesI = el('textarea', { placeholder: 'Contesto, obiettivi, growth areas…' }, [p.notes || '']);

    let teamIds = [...(p.teamIds || [])];
    const teamsRow = el('div', { class: 'tag-pick' });
    const allTeams = Store.all('teams');
    allTeams.forEach(t => {
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
    if (allTeams.length === 0) teamsRow.appendChild(el('span', { class: 'tiny muted' }, ['Nessun team creato. Vai su Teams per crearne uno.']));

    const save = () => {
      const payload = {
        name: nameI.value.trim(),
        role: roleI.value.trim(),
        cadenceDays: Number(cadenceI.value) || null,
        lastOneOnOne: lastI.value || null,
        nextOneOnOne: nextI.value || null,
        notes: notesI.value,
        teamIds,
      };
      if (!payload.name) { toast('Nome obbligatorio'); return; }
      if (isNew) {
        Store.add('people', { ...payload, actions: [] });
        toast('Membro aggiunto');
      } else {
        Store.update('people', p.id, payload);
        toast('Aggiornato');
      }
      closeModal();
      this.refresh();
    };

    const form = el('div', {}, [
      el('h2', {}, [isNew ? 'Nuovo membro' : 'Modifica membro']),
      el('div', { class: 'form-row' }, [el('label', {}, ['Nome']), nameI]),
      el('div', { class: 'form-row' }, [el('label', {}, ['Ruolo']), roleI]),
      el('div', { class: 'form-row form-row-grid' }, [
        el('div', {}, [el('label', {}, ['Cadenza 1:1 (giorni)']), cadenceI]),
        el('div', {}, [el('label', {}, ['Ultimo 1:1']), lastI]),
      ]),
      el('div', { class: 'form-row' }, [el('label', {}, ['Prossimo 1:1 (opzionale, override)']), nextI]),
      el('div', { class: 'form-row' }, [el('label', {}, ['Team']), teamsRow]),
      el('div', { class: 'form-row' }, [el('label', {}, ['Note']), notesI]),
      el('div', { class: 'modal-actions' }, [
        !isNew ? el('button', { class: 'btn btn-danger', onclick: () => {
          confirmDanger(`Eliminare ${p.name}? I task verranno scollegati ma non eliminati.`, () => { Store.removePersonWithCascade(p.id); toast('Eliminato'); closeModal(); this.refresh(); });
        } }, ['Elimina']) : null,
        el('span', { class: 'spacer' }),
        el('button', { class: 'btn', onclick: closeModal }, ['Annulla']),
        el('button', { class: 'btn btn-primary', onclick: save }, [isNew ? 'Crea' : 'Salva']),
      ]),
    ]);

    openModal(form);
  },

  openDetail(id) {
    const p = Store.get('people', id);
    if (!p) return;

    const tasks = Store.all('tasks').filter(t => t.personId === id);
    const isSelf = !!p.isSelf;

    const actionInput = el('input', { type: 'text', placeholder: isSelf ? 'Promemoria personale, obiettivo, idea…' : 'Nuova action item da 1:1…' });
    const addAction = () => {
      const text = actionInput.value.trim();
      if (!text) return;
      const actions = [...(p.actions || []), { id: uid(), text, done: false, createdAt: new Date().toISOString() }];
      Store.update('people', id, { actions });
      actionInput.value = '';
      this.openDetail(id);
    };
    actionInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addAction(); });

    const actionsList = el('div', { class: 'actions-list' });
    (p.actions || []).forEach(a => {
      const row = el('div', { class: 'action-row ' + (a.done ? 'done' : '') }, [
        el('button', { class: 'check ' + (a.done ? 'checked' : ''), onclick: () => {
          const actions = (p.actions || []).map(x => x.id === a.id ? { ...x, done: !x.done } : x);
          Store.update('people', id, { actions });
          this.openDetail(id);
        } }, ['✓']),
        el('span', { class: 'spacer', style: 'text-align:left' }, [a.text]),
        el('button', { class: 'btn btn-sm btn-icon btn-danger', onclick: () => {
          const actions = (p.actions || []).filter(x => x.id !== a.id);
          Store.update('people', id, { actions });
          this.openDetail(id);
        } }, ['×']),
      ]);
      actionsList.appendChild(row);
    });

    const content = el('div', {}, [
      el('div', { class: 'row-flex', style: 'margin-bottom:14px;' }, [
        el('div', { class: 'avatar ' + (isSelf ? 'avatar-self' : '') }, [initials(p.name)]),
        el('div', {}, [
          el('h2', { style: 'margin:0;' }, [
            p.name, isSelf ? ' ' : null, isSelf ? el('span', { class: 'badge badge-me' }, ['Tu']) : null,
          ]),
          el('div', { class: 'muted tiny' }, [p.role || '—']),
        ]),
        el('span', { class: 'spacer' }),
        el('button', { class: 'btn btn-sm', onclick: () => {
          closeModal();
          if (isSelf) App.openProfileSetup(false);
          else this.openEditor(p);
        } }, ['Modifica']),
      ]),

      (p.teamIds || []).length > 0 ? el('div', { class: 'task-meta', style: 'margin-bottom:14px;' },
        (p.teamIds || []).map(id => teamChip(Store.get('teams', id))).filter(Boolean)
      ) : null,

      !isSelf ? el('div', { class: 'grid grid-2', style: 'margin-bottom:14px;' }, [
        el('div', {}, [
          el('div', { class: 'tiny muted' }, ['Ultimo 1:1']),
          el('div', {}, [p.lastOneOnOne ? fmtDate(p.lastOneOnOne) : '—']),
        ]),
        el('div', {}, [
          el('div', { class: 'tiny muted' }, ['Prossimo 1:1']),
          el('div', {}, [this.nextOneOnOne(p) ? fmtDate(this.nextOneOnOne(p)) + ' (' + fmtRelativeDate(this.nextOneOnOne(p)) + ')' : '—']),
        ]),
      ]) : null,

      !isSelf ? el('div', { class: 'row-flex', style: 'gap:6px; margin-bottom:14px;' }, [
        el('button', { class: 'btn btn-sm', onclick: () => {
          const today = todayISO();
          Store.update('people', id, { lastOneOnOne: today, nextOneOnOne: null });
          toast('1:1 registrato oggi');
          this.openDetail(id);
        } }, ['📌 Segna 1:1 fatto oggi']),
      ]) : null,

      p.notes ? el('div', { class: 'card', style: 'margin-bottom:14px;' }, [
        el('div', { class: 'card-title' }, [isSelf ? 'Appunti personali' : 'Note']),
        el('div', { html: richText(p.notes) }),
      ]) : null,

      el('div', { class: 'card', style: 'margin-bottom:14px;' }, [
        el('div', { class: 'card-title' }, [isSelf ? 'Promemoria & obiettivi' : 'Action items']),
        actionInput,
        actionsList,
        (p.actions || []).length === 0 ? el('div', { class: 'tiny muted', style: 'margin-top:8px;' }, [
          isSelf ? 'Niente in lista.' : 'Nessuna action item.'
        ]) : null,
      ]),

      el('div', { class: 'card' }, [
        el('div', { class: 'card-title' }, [
          isSelf ? `Tue attività (${tasks.filter(t => !t.done).length} aperte)` : `Task assegnati (${tasks.filter(t => !t.done).length} aperti)`,
        ]),
        tasks.length === 0 ? el('div', { class: 'tiny muted' }, ['Nessun task.']) :
          el('div', {}, tasks.slice(0, 12).map(t => el('div', { class: 'list-item', style: 'cursor:pointer;', onclick: () => { closeModal(); App.go('tasks'); Tasks.openEditor(t); } }, [
            el('span', { class: 'check ' + (t.done ? 'checked' : '') }, [t.done ? '✓' : '']),
            el('span', { class: 'spacer', style: 'text-align:left;' + (t.done ? 'text-decoration:line-through;color:var(--text-faint);' : '') }, [t.title]),
            t.dueDate ? el('span', { class: 'badge ' + dueClass(t.dueDate) }, [fmtRelativeDate(t.dueDate)]) : null,
          ]))),
      ]),

      el('div', { class: 'modal-actions' }, [
        el('button', { class: 'btn', onclick: closeModal }, ['Chiudi']),
      ]),
    ]);

    openModal(content);
  },
};
