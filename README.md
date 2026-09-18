# ⚡ MyManager

**Tool personale per Tech Lead R&D.** Single-page web app per gestire task, persone, team, prodotti, note e decisioni. Veloce, locale, zero installazioni esterne — pensato per chi vuole un cruscotto sotto controllo senza dipendere da servizi cloud.

```
┌─────────────────────────────────────────────────────┐
│  ⚡ MyManager                                       │
├──────────┬──────────────────────────────────────────┤
│ ◉ Dash   │  Buongiorno, Davide 👋                  │
│ ✓ Tasks  │  giovedì 28 maggio 2026                  │
│ ◎ People │                                          │
│ ⌘ Teams  │  [In ritardo: 2] [Oggi: 5] [Mie: 11] … │
│ ▣ Prods  │                                          │
│ ≡ Notes  │  🎯 Focus di oggi    📅 Prossimi 7gg   │
│ ◆ Decs   │  ☐ Review PR #312    ☐ 1:1 con Marco   │
│          │  ☐ Riunione roadmap  ☐ Demo prodotto   │
│ 🔍 ⌘K    │                                          │
│ 🟢 Sync  │                                          │
└──────────┴──────────────────────────────────────────┘
```

---

## Cosa fa

| Sezione | A cosa serve |
|---|---|
| **Dashboard** | Colpo d'occhio: task in ritardo, focus di oggi, prossimi 7 giorni, 1:1 da fare, le tue cose, note recenti |
| **Tasks** | Todo con priorità P0–P3, scadenze, tag, assegnazione a persone, link a prodotto. Filtri rapidi (aperti / oggi / in ritardo / mie / team) |
| **Persone** | Membri del team con ruolo, cadenza 1:1 automatica, action items, task assegnati, note. Tu compari con un badge "Tu" e sei il destinatario di default dei nuovi task |
| **Teams** | Gruppi di persone (multi-appartenenza), con colore distintivo. Una persona può stare in più team contemporaneamente |
| **Prodotti** | Prodotti con nome, descrizione, team e/o persone assegnate. Task / note / decisioni possono essere collegati a un prodotto e aggregati nella sua vista |
| **Notes** | Appunti rapidi / meeting con tag, filtro per tag e ricerca. Il corpo resta testo semplice. Collegabili a un prodotto |
| **Decisions** | Log decisioni tecniche ADR-style: contesto / decisione / conseguenze (resi con markdown-lite: **bold**, link, liste) / status (proposed, accepted, rejected, superseded). Collegabili a un prodotto |

---

## Installazione

### Prerequisiti
- **Node.js 18+** (verifica con `node --version`)

### Clone & avvio

```bash
git clone https://github.com/davideorsini94/my-manager.git
cd my-manager
npm start
```

Apri 👉 **http://localhost:4321**

Nessun `npm install` necessario: il server usa solo i moduli built-in di Node (`http`, `fs`, `path`).

### Porta personalizzata
```bash
PORT=8080 npm start
```

### Senza Node (fallback)
Puoi anche aprire `index.html` direttamente con doppio click: l'app funziona, ma i dati restano solo nel `localStorage` del browser. L'indicatore in sidebar mostra la modalità attiva.

---

## Come si usa

### Primo avvio
Al primo accesso ti viene chiesto **nome e ruolo** — questo crea il tuo profilo, ti aggiunge automaticamente come persona nel sistema (con badge "Tu") e ti rende il destinatario predefinito dei nuovi task.

### Flow consigliato

1. **Crea i tuoi team** (`g m`): Backend, ML, Hardware, ecc. Ognuno con un colore.
2. **Aggiungi le persone** (`g p`): assegna ognuna a uno o più team.
3. **Crea i prodotti** (`g r`): assegna team e/o persone direttamente.
4. **Vivi nella Dashboard** (`g d`): da lì crei task con `N`, aggiorni stato, navighi con shortcut.

### Scorciatoie da tastiera

| Tasto | Azione |
|---|---|
| `g d` | Dashboard |
| `g t` | Tasks |
| `g p` | Persone |
| `g m` | Teams |
| `g r` | Prodotti |
| `g n` | Notes |
| `g x` | Decisions |
| `n` | Nuovo elemento (in base alla vista) |
| `/` o `⌘K` / `Ctrl+K` | Ricerca globale |
| `Esc` | Chiudi finestra modale |
| `⌘+Enter` / `Ctrl+Enter` | Salva il task (dal campo titolo) o la nota (dal corpo) |

### Ricerca globale
Premi `⌘K` (o `/`) ovunque per cercare in: task, persone, team, prodotti, note, decisioni. Frecce + Enter per aprire.

---

## Persistenza dati

Hai **4 reti di sicurezza** sovrapposte:

1. **`data/state.json`** — fonte di verità su disco (server attivo)
2. **`data/backups/state-<timestamp>.json`** — snapshot automatico ad ogni save, ultimi 30 conservati. Sfogliabili e ripristinabili dal pulsante **Backup** in sidebar
3. **localStorage** — copia parallela scritta ad ogni save (sopravvive anche se il file viene corrotto)
4. **Export JSON** — backup manuale scaricabile (pulsante **Export** in sidebar), ricaricabile con **Import**

Le scritture sono **atomiche** (tmp + rename) e **debounced** (300ms) per evitare disk thrash. Su `beforeunload` viene fatto flush tramite `sendBeacon`.

### Backup off-machine
Per non perdere mai i dati anche in caso di disco rotto: metti la cartella `data/` dentro Dropbox / iCloud / un repo git privato. Tutto qui.

### Indicatore di stato
In fondo alla sidebar:
- 🟢 **Sincronizzato** — server attivo, dati su disco
- 🔵 **Salvando…** — scrittura in corso
- 🔴 **Errore** — sync fallita (i dati restano in localStorage come backup)
- ⚪ **Solo localStorage** — server non disponibile

---

## Struttura del progetto

```
my-manager/
├── index.html              # Entry point, layout sidebar + main
├── styles.css              # Tema scuro/chiaro, componenti
├── server.js               # Server Node zero-dep (http + fs)
├── package.json
├── .gitignore              # Esclude data/ e node_modules/
├── js/
│   ├── app.js              # Routing, shortcut, init, profilo
│   ├── storage.js          # API + localStorage + debounce + backup
│   ├── utils.js            # Helpers DOM, date, colori
│   ├── dashboard.js
│   ├── tasks.js
│   ├── people.js
│   ├── teams.js
│   ├── products.js
│   ├── notes.js
│   ├── decisions.js
│   └── search.js
└── data/                   # (creato a runtime, NON committato)
    ├── state.json
    └── backups/
        └── state-*.json
```

### Stack
HTML + CSS + JavaScript vanilla nel browser. Server Node con solo moduli built-in. **Zero dipendenze npm**, nessun build step, nessun framework.

---

## API del server

Per chi vuole integrare o fare backup automatici:

| Endpoint | Metodo | Cosa fa |
|---|---|---|
| `/api/state` | `GET` | Restituisce lo stato corrente |
| `/api/state` | `PUT` | Salva lo stato (body = JSON intero) |
| `/api/backups` | `GET` | Lista backup disponibili |
| `/api/backups/<file>` | `GET` | Contenuto di uno snapshot |
| `/api/health` | `GET` | Health check + path dei file |

---

## Troubleshooting

**"Port already in use"**
Cambia porta: `PORT=8080 npm start`

**Indicatore in sidebar è ⚪ "Solo localStorage"**
Il server non è raggiungibile. Verifica che `npm start` sia in esecuzione e che l'URL sia http://localhost:4321 (o la porta che hai scelto).

**Voglio resettare tutto**
```bash
rm -rf data/
# E svuota il localStorage del browser su localhost:4321
```

**Backup periodico automatico** (es. via cron)
```bash
# Salva ogni mattina alle 9 una copia in ~/Documents/mymanager-backups/
0 9 * * * curl -s http://localhost:4321/api/state > ~/Documents/mymanager-backups/$(date +\%Y\%m\%d).json
```

---

## Roadmap idee (non promesse)
- Filtri salvati / viste custom
- Reminder con notifiche browser
- Esportazione note in Markdown
- Modalità "weekly review" guidata
- Multi-utente con auth (per ora è single-user)

---

## Licenza
Uso personale. Fork pure se ti torna utile.
