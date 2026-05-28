// Teams view: groups of people (multi-membership).
const Teams = {
  render(root) {
    root.innerHTML = '';
    root.appendChild(el('div', { class: 'page-header' }, [
      el('div', {}, [
        el('h1', {}, ['Teams']),
        el('div', { class: 'subtitle' }, [`${Store.all('teams').length} team`]),
      ]),
      el('button', { class: 'btn btn-primary', onclick: () => this.openEditor() }, ['+ Nuovo team']),
    ]));

    const teams = Store.all('teams');
    if (teams.length === 0) {
      root.appendChild(el('div', { class: 'card empty' }, [
        el('div', {}, ['Nessun team.']),
        el('div', { class: 'empty-hint' }, ['Crea team per raggruppare le persone (es. Backend, ML, Hardware…). Una persona può appartenere a più team.']),
      ]));
      return;
    }

    const sorted = [...teams].sort((a, b) => a.name.localeCompare(b.name));
    const grid = el('div', { class: 'grid grid-3' });
    sorted.forEach(t => grid.appendChild(this.renderCard(t)));
    root.appendChild(grid);
  },

  refresh() { this.render($('#view')); },

  renderCard(t) {
    const members = Store.all('people').filter(p => (p.teamIds || []).includes(t.id));
    const products = Store.all('products').filter(p => (p.teamIds || []).includes(t.id));
    const color = t.color || '#6366f1';
    return el('div', {
      class: 'team-card',
      style: `border-left: 3px solid ${color};`,
      onclick: () => this.openDetail(t.id),
    }, [
      el('div', { class: 'row-flex' }, [
        el('div', { class: 'team-name', style: `color:${color};` }, [t.name]),
        el('span', { class: 'spacer' }),
        el('span', { class: 'tiny muted' }, [`${members.length} membri`]),
      ]),
      t.description ? el('div', { class: 'tiny muted', style: 'margin-top:6px;' }, [t.description]) : null,
      members.length > 0 ? el('div', { class: 'team-avatars', style: 'margin-top:10px;' },
        members.slice(0, 6).map(p => el('div', { class: 'avatar avatar-sm ' + (p.isSelf ? 'avatar-self' : ''), title: p.name }, [initials(p.name)]))
      ) : null,
      products.length > 0 ? el('div', { class: 'tiny muted', style: 'margin-top:10px;' }, [
        `Prodotti: ${products.map(p => p.name).join(', ')}`,
      ]) : null,
    ]);
  },

  openEditor(team) {
    const isNew = !team;
    const t = team || { name: '', description: '', color: TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)] };

    const nameI = el('input', { type: 'text', value: t.name, placeholder: 'Es. Backend, ML, Firmware' });
    const descI = el('textarea', { placeholder: 'Mission, scope, link utili…' }, [t.description || '']);

    const colorRow = el('div', { class: 'color-picker' });
    let pickedColor = t.color || TEAM_COLORS[0];
    TEAM_COLORS.forEach(c => {
      const sw = el('button', {
        class: 'color-sw' + (c === pickedColor ? ' active' : ''),
        style: `background:${c};`,
        onclick: (e) => { e.preventDefault(); pickedColor = c; $$('.color-sw', colorRow).forEach(x => x.classList.remove('active')); sw.classList.add('active'); },
      });
      colorRow.appendChild(sw);
    });

    const save = () => {
      const payload = { name: nameI.value.trim(), description: descI.value.trim(), color: pickedColor };
      if (!payload.name) { toast('Nome obbligatorio'); return; }
      if (isNew) Store.add('teams', payload);
      else Store.update('teams', t.id, payload);
      toast('Salvato');
      closeModal();
      this.refresh();
    };

    const form = el('div', {}, [
      el('h2', {}, [isNew ? 'Nuovo team' : 'Modifica team']),
      el('div', { class: 'form-row' }, [el('label', {}, ['Nome']), nameI]),
      el('div', { class: 'form-row' }, [el('label', {}, ['Descrizione']), descI]),
      el('div', { class: 'form-row' }, [el('label', {}, ['Colore']), colorRow]),
      el('div', { class: 'modal-actions' }, [
        !isNew ? el('button', { class: 'btn btn-danger', onclick: () => {
          confirmDanger(`Eliminare il team "${t.name}"? I membri non verranno cancellati ma rimossi dal team.`, () => {
            Store.removeTeam(t.id); toast('Eliminato'); closeModal(); this.refresh();
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
    const t = Store.get('teams', id);
    if (!t) return;
    const members = Store.all('people').filter(p => (p.teamIds || []).includes(id));
    const products = Store.all('products').filter(p => (p.teamIds || []).includes(id));
    const color = t.color || '#6366f1';

    const allPeople = [...Store.all('people')].sort((a, b) => {
      if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    const memberPicker = el('div', { class: 'tag-pick' });
    allPeople.forEach(p => {
      const on = (p.teamIds || []).includes(id);
      const chip = el('button', {
        class: 'chip ' + (on ? 'active' : ''),
        onclick: () => {
          const current = p.teamIds || [];
          const next = on ? current.filter(x => x !== id) : [...current, id];
          Store.update('people', p.id, { teamIds: next });
          this.openDetail(id);
        },
      }, [(p.isSelf ? '👤 ' : '') + p.name]);
      memberPicker.appendChild(chip);
    });

    const content = el('div', {}, [
      el('div', { class: 'row-flex', style: 'margin-bottom:14px;' }, [
        el('div', { class: 'team-color-block', style: `background:${color};` }),
        el('div', {}, [
          el('h2', { style: 'margin:0;', html: escapeHTML(t.name) }),
          t.description ? el('div', { class: 'muted tiny' }, [t.description]) : null,
        ]),
        el('span', { class: 'spacer' }),
        el('button', { class: 'btn btn-sm', onclick: () => { closeModal(); this.openEditor(t); } }, ['Modifica']),
      ]),
      el('div', { class: 'card', style: 'margin-bottom:14px;' }, [
        el('div', { class: 'card-title' }, [`Membri (${members.length})`]),
        memberPicker,
      ]),
      products.length > 0 ? el('div', { class: 'card' }, [
        el('div', { class: 'card-title' }, [`Prodotti (${products.length})`]),
        el('div', {}, products.map(p => el('div', { class: 'list-item', style: 'cursor:pointer;', onclick: () => { closeModal(); App.go('products'); Products.openDetail(p.id); } }, [
          el('div', { style: 'flex:1;text-align:left;' }, [p.name]),
          p.description ? el('span', { class: 'tiny muted' }, [p.description.slice(0, 60)]) : null,
        ]))),
      ]) : null,
      el('div', { class: 'modal-actions' }, [el('button', { class: 'btn', onclick: closeModal }, ['Chiudi'])]),
    ]);
    openModal(content);
  },
};
