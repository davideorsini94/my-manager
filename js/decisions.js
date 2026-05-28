// Decisions log — lightweight ADR-style technical decisions.
const Decisions = {
  render(root) {
    root.innerHTML = '';
    root.appendChild(el('div', { class: 'page-header' }, [
      el('div', {}, [
        el('h1', {}, ['Decisions']),
        el('div', { class: 'subtitle' }, ['Log delle decisioni tecniche / architetturali.']),
      ]),
      el('button', { class: 'btn btn-primary', onclick: () => this.openEditor() }, ['+ Nuova decisione']),
    ]));

    const decisions = [...Store.all('decisions')].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (decisions.length === 0) {
      root.appendChild(el('div', { class: 'card empty' }, [
        el('div', {}, ['Nessuna decisione registrata.']),
        el('div', { class: 'empty-hint' }, ['Logga qui le scelte tecniche importanti per averne traccia.']),
      ]));
      return;
    }

    decisions.forEach(d => root.appendChild(this.renderCard(d)));
  },

  refresh() { this.render($('#view')); },

  renderCard(d) {
    const statusColor = d.status === 'accepted' ? 'done' : d.status === 'proposed' ? 'soon' : d.status === 'superseded' ? 'p3' : '';
    return el('div', { class: 'decision-card', onclick: () => this.openEditor(d) }, [
      el('div', { class: 'row-flex' }, [
        el('div', {}, [
          el('div', { class: 'decision-title' }, [d.title]),
          el('div', { class: 'decision-meta' }, [
            `${fmtDate(d.date)} · ${d.author || '—'}`,
            d.productId ? ' · ' : '',
          ]),
        ]),
        el('span', { class: 'spacer' }),
        d.productId ? el('span', { class: 'badge product-chip' }, ['◆ ' + (Store.get('products', d.productId)?.name || '?')]) : null,
        el('span', { class: 'badge ' + statusColor }, [d.status || 'proposed']),
      ]),
      d.context ? el('div', { class: 'decision-section' }, [el('strong', {}, ['Contesto']), el('div', { html: richText(d.context) })]) : null,
      d.decision ? el('div', { class: 'decision-section' }, [el('strong', {}, ['Decisione']), el('div', { html: richText(d.decision) })]) : null,
      d.consequences ? el('div', { class: 'decision-section' }, [el('strong', {}, ['Conseguenze']), el('div', { html: richText(d.consequences) })]) : null,
    ]);
  },

  openEditor(decision) {
    const isNew = !decision;
    const d = decision || { title: '', date: todayISO(), author: '', status: 'proposed', context: '', decision: '', consequences: '' };

    const titleI = el('input', { type: 'text', value: d.title, placeholder: 'Es. Migrazione da REST a gRPC per servizio X' });
    const dateI = el('input', { type: 'date', value: d.date || todayISO() });
    const authorI = el('input', { type: 'text', value: d.author || '', placeholder: 'Es. R&D team' });
    const statusI = el('select', {}, ['proposed', 'accepted', 'rejected', 'superseded'].map(s =>
      el('option', { value: s, selected: d.status === s }, [s])
    ));
    const productI = el('select', {}, [
      el('option', { value: '' }, ['—']),
      ...Store.all('products').map(pr => el('option', { value: pr.id, selected: d.productId === pr.id }, [pr.name])),
    ]);
    const ctxI = el('textarea', { placeholder: 'Qual è il problema? Quali vincoli?' }, [d.context || '']);
    const decI = el('textarea', { placeholder: 'Cosa abbiamo deciso? Alternative considerate?' }, [d.decision || '']);
    const consI = el('textarea', { placeholder: 'Quali conseguenze attese? Cosa rimane aperto?' }, [d.consequences || '']);

    const save = () => {
      const payload = {
        title: titleI.value.trim(),
        date: dateI.value,
        author: authorI.value.trim(),
        status: statusI.value,
        context: ctxI.value,
        decision: decI.value,
        consequences: consI.value,
        productId: productI.value || null,
      };
      if (!payload.title) { toast('Titolo obbligatorio'); return; }
      if (isNew) Store.add('decisions', payload);
      else Store.update('decisions', d.id, payload);
      toast('Salvato');
      closeModal();
      this.refresh();
    };

    const form = el('div', {}, [
      el('h2', {}, [isNew ? 'Nuova decisione' : 'Modifica decisione']),
      el('div', { class: 'form-row' }, [el('label', {}, ['Titolo']), titleI]),
      el('div', { class: 'form-row form-row-grid' }, [
        el('div', {}, [el('label', {}, ['Data']), dateI]),
        el('div', {}, [el('label', {}, ['Autore / team']), authorI]),
      ]),
      el('div', { class: 'form-row form-row-grid' }, [
        el('div', {}, [el('label', {}, ['Status']), statusI]),
        el('div', {}, [el('label', {}, ['Prodotto']), productI]),
      ]),
      el('div', { class: 'form-row' }, [el('label', {}, ['Contesto']), ctxI]),
      el('div', { class: 'form-row' }, [el('label', {}, ['Decisione']), decI]),
      el('div', { class: 'form-row' }, [el('label', {}, ['Conseguenze']), consI]),
      el('div', { class: 'modal-actions' }, [
        !isNew ? el('button', { class: 'btn btn-danger', onclick: () => {
          confirmDanger('Eliminare questa decisione?', () => { Store.remove('decisions', d.id); toast('Eliminata'); closeModal(); this.refresh(); });
        } }, ['Elimina']) : null,
        el('span', { class: 'spacer' }),
        el('button', { class: 'btn', onclick: closeModal }, ['Annulla']),
        el('button', { class: 'btn btn-primary', onclick: save }, [isNew ? 'Crea' : 'Salva']),
      ]),
    ]);

    openModal(form);
  },
};
