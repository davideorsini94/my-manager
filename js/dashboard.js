// Dashboard — quick overview of what matters today.
const Dashboard = {
  render(root) {
    root.innerHTML = '';

    const hour = new Date().getHours();
    const self = Store.self();
    const firstName = self?.name?.split(/\s+/)[0] || '';
    const baseGreeting = hour < 6 ? 'Notte fonda' : hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';
    const greeting = firstName ? `${baseGreeting}, ${firstName}` : baseGreeting;

    root.appendChild(el('div', { class: 'page-header' }, [
      el('div', {}, [
        el('h1', {}, [`${greeting} 👋`]),
        el('div', { class: 'subtitle' }, [new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })]),
      ]),
      el('div', { class: 'row-flex' }, [
        el('button', { class: 'btn', onclick: () => Tasks.openEditor() }, ['+ Task']),
        el('button', { class: 'btn', onclick: () => Notes.openEditor() }, ['+ Nota']),
      ]),
    ]));

    // Stats
    const allTasks = Store.all('tasks');
    const openTasks = allTasks.filter(t => !t.done);
    const overdue = openTasks.filter(t => t.dueDate && dueClass(t.dueDate) === 'overdue');
    const today = openTasks.filter(t => t.dueDate && dueClass(t.dueDate) === 'today');
    const mine = self ? openTasks.filter(t => t.personId === self.id) : [];
    const doneThisWeek = allTasks.filter(t => {
      if (!t.done || !t.doneAt) return false;
      return daysBetween(todayISO(), t.doneAt.slice(0, 10)) <= 7;
    });
    const peopleDue1on1 = Store.all('people').filter(p => {
      if (p.isSelf) return false;
      const next = People.nextOneOnOne(p);
      return next && daysBetween(next, todayISO()) <= 0;
    });

    root.appendChild(el('div', { class: 'grid ' + (self ? 'grid-5' : 'grid-4') + ' section' }, [
      el('div', { class: 'card stat' }, [
        el('div', { class: 'stat-label' }, ['In ritardo']),
        el('div', { class: 'stat-value ' + (overdue.length > 0 ? 'stat-danger' : '') }, [String(overdue.length)]),
      ]),
      el('div', { class: 'card stat' }, [
        el('div', { class: 'stat-label' }, ['Da fare oggi']),
        el('div', { class: 'stat-value stat-accent' }, [String(today.length)]),
      ]),
      self ? el('div', { class: 'card stat', style: 'cursor:pointer;', onclick: () => { Tasks.filters.who = 'me'; App.go('tasks'); } }, [
        el('div', { class: 'stat-label' }, ['Mie aperte']),
        el('div', { class: 'stat-value stat-accent' }, [String(mine.length)]),
      ]) : null,
      el('div', { class: 'card stat' }, [
        el('div', { class: 'stat-label' }, ['Aperti totali']),
        el('div', { class: 'stat-value' }, [String(openTasks.length)]),
      ]),
      el('div', { class: 'card stat' }, [
        el('div', { class: 'stat-label' }, ['Chiusi 7 gg']),
        el('div', { class: 'stat-value stat-ok' }, [String(doneThisWeek.length)]),
      ]),
    ]));

    // 2-column main area
    const cols = el('div', { class: 'grid grid-2 section' });

    // Today / urgent
    const focus = [...overdue, ...today].slice(0, 8);
    cols.appendChild(el('div', { class: 'card' }, [
      el('div', { class: 'section-head' }, [
        el('div', { class: 'section-title' }, ['🎯 Focus di oggi']),
        el('a', { class: 'tiny muted', href: '#', onclick: (e) => { e.preventDefault(); App.go('tasks'); } }, ['vedi tutti →']),
      ]),
      focus.length === 0
        ? el('div', { class: 'empty', style: 'padding:18px 0;' }, ['Tutto sotto controllo. 🌿'])
        : el('div', {}, focus.map(t => this.taskMini(t))),
    ]));

    // Upcoming this week
    const upcoming = openTasks
      .filter(t => t.dueDate)
      .filter(t => {
        const d = daysBetween(t.dueDate, todayISO());
        return d > 0 && d <= 7;
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 8);
    cols.appendChild(el('div', { class: 'card' }, [
      el('div', { class: 'section-head' }, [
        el('div', { class: 'section-title' }, ['📅 Prossimi 7 giorni']),
      ]),
      upcoming.length === 0
        ? el('div', { class: 'empty', style: 'padding:18px 0;' }, ['Niente in arrivo.'])
        : el('div', {}, upcoming.map(t => this.taskMini(t))),
    ]));

    root.appendChild(cols);

    // My active items (not just those with due dates)
    if (self) {
      const myOpen = openTasks.filter(t => t.personId === self.id).slice(0, 8);
      const myActions = (self.actions || []).filter(a => !a.done);
      if (myOpen.length > 0 || myActions.length > 0) {
        root.appendChild(el('div', { class: 'card section' }, [
          el('div', { class: 'section-head' }, [
            el('div', { class: 'section-title' }, ['👤 Le tue cose']),
            el('a', { class: 'tiny muted', href: '#', onclick: (e) => { e.preventDefault(); Tasks.filters.who = 'me'; App.go('tasks'); } }, ['tutte →']),
          ]),
          myOpen.length > 0 ? el('div', {}, myOpen.map(t => this.taskMini(t))) : null,
          myActions.length > 0 ? el('div', { style: 'margin-top:10px;' }, [
            el('div', { class: 'tiny muted', style: 'margin:6px 0 4px;' }, ['Promemoria personali']),
            ...myActions.slice(0, 5).map(a => el('div', { class: 'list-item' }, [
              el('button', { class: 'check', onclick: () => {
                const actions = (self.actions || []).map(x => x.id === a.id ? { ...x, done: true } : x);
                Store.update('people', self.id, { actions });
                this.refresh();
              } }, ['✓']),
              el('span', { class: 'spacer', style: 'text-align:left;' }, [a.text]),
            ])),
          ]) : null,
        ]));
      }
    }

    // 1:1 due
    if (peopleDue1on1.length > 0) {
      root.appendChild(el('div', { class: 'card section' }, [
        el('div', { class: 'section-head' }, [
          el('div', { class: 'section-title' }, ['👥 1:1 da pianificare/fare']),
          el('a', { class: 'tiny muted', href: '#', onclick: (e) => { e.preventDefault(); App.go('people'); } }, ['team →']),
        ]),
        el('div', {}, peopleDue1on1.map(p => {
          const next = People.nextOneOnOne(p);
          return el('div', { class: 'list-item', onclick: () => People.openDetail(p.id) }, [
            el('div', { class: 'avatar', style: 'width:32px;height:32px;font-size:13px;' }, [initials(p.name)]),
            el('div', {}, [
              el('div', {}, [p.name]),
              el('div', { class: 'tiny muted' }, [p.role || '—']),
            ]),
            el('span', { class: 'spacer' }),
            el('span', { class: 'badge overdue' }, ['1:1 ' + fmtRelativeDate(next)]),
          ]);
        })),
      ]));
    }

    // Recent notes
    const recentNotes = [...Store.all('notes')]
      .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt))
      .slice(0, 4);

    if (recentNotes.length > 0) {
      root.appendChild(el('div', { class: 'section' }, [
        el('div', { class: 'section-head' }, [
          el('div', { class: 'section-title' }, ['📝 Note recenti']),
          el('a', { class: 'tiny muted', href: '#', onclick: (e) => { e.preventDefault(); App.go('notes'); } }, ['tutte →']),
        ]),
        el('div', { class: 'grid grid-4' }, recentNotes.map(n => Notes.renderCard(n))),
      ]));
    }

    // Empty state for first run
    if (allTasks.length === 0 && Store.all('people').length === 0 && Store.all('notes').length === 0) {
      root.appendChild(el('div', { class: 'card', style: 'margin-top:18px;' }, [
        el('div', { class: 'card-title' }, ['Per iniziare']),
        el('ul', { style: 'margin:8px 0; padding-left:18px; line-height:1.9;' }, [
          el('li', {}, ['Aggiungi i tuoi task con N o "+ Nuovo task" — usa P0/P1 per la priorità.']),
          el('li', {}, ['Inserisci i membri del team per tracciare 1:1 e action items.']),
          el('li', {}, ['Tieni le note di meeting e brain dump rapidi sotto Notes.']),
          el('li', {}, ['Logga le scelte tecniche importanti sotto Decisions.']),
          el('li', {}, ['Tutto è in localStorage: usa Export per fare backup.']),
        ]),
      ]));
    }
  },

  refresh() { this.render($('#view')); },

  taskMini(t) {
    return el('div', { class: 'list-item', onclick: () => Tasks.openEditor(t) }, [
      el('button', {
        class: 'check ' + (t.done ? 'checked' : ''),
        onclick: (e) => {
          e.stopPropagation();
          Store.update('tasks', t.id, { done: !t.done, doneAt: !t.done ? new Date().toISOString() : null });
          this.refresh();
        }
      }, ['✓']),
      el('span', { class: 'badge ' + (t.priority || 'p3') }, [(t.priority || 'p3').toUpperCase()]),
      el('div', { style: 'flex:1;text-align:left;' }, [t.title]),
      t.dueDate ? el('span', { class: 'badge ' + dueClass(t.dueDate) }, [fmtRelativeDate(t.dueDate)]) : null,
    ]);
  },
};
