// Small helpers used across the app.

function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v === false || v == null) continue;
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function escapeHTML(s) {
  if (s == null) return '';
  return String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function daysBetween(aISO, bISO) {
  const a = new Date(aISO + 'T00:00:00');
  const b = new Date(bISO + 'T00:00:00');
  return Math.round((a - b) / 86400000);
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtRelativeDate(iso) {
  if (!iso) return '';
  const today = todayISO();
  const d = iso.length === 10 ? iso : iso.slice(0, 10);
  const diff = daysBetween(d, today);
  if (diff === 0) return 'oggi';
  if (diff === 1) return 'domani';
  if (diff === -1) return 'ieri';
  if (diff > 0 && diff < 7) return `tra ${diff}g`;
  if (diff < 0 && diff > -30) return `${-diff}g fa`;
  return fmtDate(iso);
}

function dueClass(iso) {
  if (!iso) return '';
  const diff = daysBetween(iso, todayISO());
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 3) return 'soon';
  return '';
}

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('hidden'), 2200);
}

function openModal(contentNode) {
  const modal = $('#modal');
  const card = $('#modalCard');
  card.innerHTML = '';
  card.appendChild(contentNode);
  modal.classList.remove('hidden');
  const firstInput = card.querySelector('input,textarea,select');
  if (firstInput) setTimeout(() => firstInput.focus(), 30);
}
function closeModal() { $('#modal').classList.add('hidden'); }

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

function confirmDanger(message, onYes) {
  const content = el('div', {}, [
    el('h2', {}, ['Conferma']),
    el('p', { class: 'muted' }, [message]),
    el('div', { class: 'modal-actions' }, [
      el('button', { class: 'btn', onclick: closeModal }, ['Annulla']),
      el('button', { class: 'btn btn-danger', onclick: () => { onYes(); closeModal(); } }, ['Elimina']),
    ]),
  ]);
  openModal(content);
}

// Convert plain text with simple markdown-lite into HTML (newlines + links + lists + bold)
const TEAM_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
  '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#a855f7',
];

function hexToRgba(hex, a = 0.18) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function teamChip(team) {
  if (!team) return null;
  const color = team.color || '#6366f1';
  return el('span', {
    class: 'badge team-chip',
    style: `color:${color}; border-color:${hexToRgba(color, 0.4)}; background:${hexToRgba(color, 0.12)};`,
  }, [team.name]);
}

function richText(text) {
  if (!text) return '';
  let html = escapeHTML(text);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\bhttps?:\/\/\S+/g, (m) => `<a href="${m}" target="_blank" rel="noopener">${m}</a>`);
  html = html.replace(/^- (.+)$/gm, '• $1');
  return html.replaceAll('\n', '<br>');
}
