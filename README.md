# MyManager

> **Il codice non è su questo branch.** `main` è solo il branch di default di GitHub e
> contiene esclusivamente questo README. Tutto il codice sta su **`develop`**, che è il
> branch di lavoro effettivo: `git checkout develop`. Ogni comando e percorso citato qui
> sotto vale su `develop`.

Tool personale per Tech Lead R&D: una single-page web app per gestire task, persone,
team, prodotti, note e decisioni tecniche. Gira in locale, i dati restano su disco,
non c'è nessun servizio esterno di mezzo.

## Cosa fa

- **Dashboard** — saluto e data del giorno, contatori (in ritardo, da fare oggi, mie
  aperte, aperti totali, chiusi negli ultimi 7 giorni), focus di oggi, prossimi 7 giorni,
  le tue cose, 1:1 da fare, note recenti.
- **Tasks** — titolo, priorità P0–P3, scadenza, tag, assegnatario, prodotto collegato e
  note. Filtri per stato (aperti / tutti / completati / in ritardo / oggi), per persona
  (tutti / mie / team / non assegnati), per prodotto e per priorità, più ricerca testuale.
- **Persone** — ruolo, appartenenza a più team, cadenza 1:1 in giorni (default 14) con
  calcolo automatico del prossimo 1:1 a partire dall'ultimo, override manuale della data,
  pulsante "Segna 1:1 fatto oggi", action items e note per persona.
- **Teams** — gruppi di persone con colore scelto da una palette fissa; una persona può
  stare in più team. Dal dettaglio team si aggiungono/tolgono i membri e si vedono i
  prodotti collegati.
- **Prodotti** — nome, descrizione, team assegnati e persone assegnate direttamente. La
  vista di dettaglio aggrega le persone coinvolte (dirette + via team), i task, le note e
  le decisioni collegate.
- **Notes** — appunti e note di meeting con tag, filtro per tag e ricerca su titolo, corpo
  e tag. Collegabili a un prodotto.
- **Decisions** — log ADR-style: titolo, data, autore, status (proposed, accepted,
  rejected, superseded), contesto / decisione / conseguenze. I tre campi lunghi vengono
  resi con un markdown-lite (`**grassetto**`, link, liste con `-`).
- **Ricerca globale** (`⌘K` o `/`) su task, persone, note, decisioni, team e prodotti.
- **Profilo** — al primo avvio l'app chiede nome e ruolo: ti aggiunge come persona con
  badge "Tu" e ti imposta come assegnatario di default dei nuovi task.
- **Tema** chiaro/scuro, salvato nello stato dell'app.
- **Backup** — snapshot su disco sfogliabili e ripristinabili, export e import JSON.

## Stack

HTML, CSS e JavaScript vanilla nel browser (nessun framework, nessun build step) più un
server Node che usa solo moduli built-in (`http`, `fs`, `path`). **Zero dipendenze npm**:
`package.json` non ha né `dependencies` né `devDependencies`, richiede solo Node `>=18`.

```
browser (index.html + js/*.js)
   │  GET  /api/state        all'avvio
   │  PUT  /api/state        ad ogni modifica (debounce 300 ms)
   ▼
server.js  ──►  data/state.json            scrittura atomica: tmp + rename
           └─►  data/backups/state-*.json  uno snapshot per salvataggio, ultimi 30
```

In parallelo ogni salvataggio scrive anche nel `localStorage` del browser (chiave
`mymanager_v1`). Se il server non risponde — o se `index.html` viene aperto direttamente
come file — l'app continua a funzionare in sola modalità localStorage; l'indicatore in
fondo alla sidebar mostra sempre la modalità attiva. Le scritture ancora in sospeso
vengono inviate con `sendBeacon` alla chiusura della pagina.

## Avvio rapido

Serve Node.js 18 o superiore.

```bash
git clone https://github.com/davideorsini94/my-manager.git
cd my-manager
git checkout develop
npm start
```

L'app è su **http://localhost:4321**. Non serve `npm install`: non ci sono dipendenze.

```bash
npm run dev        # identico a npm start (node server.js)
PORT=8080 npm start
```

Senza server si può aprire `index.html` direttamente nel browser: l'app funziona, ma i
dati restano solo nel `localStorage` e i backup su disco non sono disponibili.

## Configurazione

Nessun file `.env`, nessuna chiave, nessun servizio esterno da configurare. L'unica
variabile d'ambiente letta dal codice è:

| Variabile | Obbligatoria | Default | Cosa fa |
|---|---|---|---|
| `PORT` | no | `4321` | Porta su cui `server.js` resta in ascolto |

I percorsi dei dati non sono configurabili: sono sempre `data/state.json` e
`data/backups/` relativi alla root del progetto, create all'avvio del server se mancanti.
La cartella `data/` è in `.gitignore` e non va committata: contiene contenuti personali e
di lavoro.

## API HTTP

Il server espone poche rotte, usate dall'app stessa ma utilizzabili anche a mano (per
esempio per un backup schedulato):

| Endpoint | Metodo | Cosa fa |
|---|---|---|
| `/api/state` | `GET` | Restituisce lo stato corrente (`{}` se non esiste ancora) |
| `/api/state` | `PUT` | Salva lo stato (body = JSON intero, max 5 MB) e crea uno snapshot |
| `/api/backups` | `GET` | Elenco degli snapshot con nome e dimensione |
| `/api/backups/<file>` | `GET` | Contenuto di uno snapshot |
| `/api/health` | `GET` | Health check con i path di stato e backup |

Tutto il resto viene servito come file statico dalla root del progetto.

## Scorciatoie da tastiera

| Tasto | Azione |
|---|---|
| `g d` | Dashboard |
| `g t` | Tasks |
| `g p` | Persone |
| `g m` | Teams |
| `g r` | Prodotti |
| `g n` | Notes |
| `g x` | Decisions |
| `n` | Nuovo elemento nella vista corrente |
| `/` oppure `⌘K` / `Ctrl+K` | Ricerca globale |
| `Esc` | Chiude la finestra modale |
| `⌘+Enter` / `Ctrl+Enter` | Salva il task (dal campo titolo) o la nota (dal corpo) |

## Struttura del progetto

Layout del branch `develop`:

```
my-manager/
├── index.html              # Entry point: sidebar, area principale, modale, toast
├── styles.css              # Tema scuro/chiaro e componenti
├── server.js               # Server Node zero-dipendenze: statici + API + backup
├── package.json            # Solo script start/dev, engines node >=18
├── .gitignore              # Esclude data/, node_modules/, .env, file di editor
├── js/
│   ├── app.js              # Routing per hash, shortcut, tema, export/import, profilo
│   ├── storage.js          # Stato, CRUD, sync API + localStorage, debounce, backup
│   ├── utils.js            # Helper DOM, date, colori team, modale, markdown-lite
│   ├── dashboard.js
│   ├── tasks.js
│   ├── people.js
│   ├── teams.js
│   ├── products.js
│   ├── notes.js
│   ├── decisions.js
│   └── search.js
└── data/                   # Creata a runtime dal server, non committata
    ├── state.json
    └── backups/
        └── state-*.json
```

## Note

- Il branch di sviluppo è `develop`; `main` resta vuoto e serve solo come default branch.
- Single-user: nessuna autenticazione, nessun controllo di accesso. Il server va tenuto in
  ascolto su localhost.
- Non ci sono test né pipeline CI, e non c'è nessuno step di build: i file vengono serviti
  così come sono.
- Per non perdere i dati basta tenere la cartella `data/` in una posizione sincronizzata
  (Dropbox, iCloud, un repo privato) oppure schedulare una copia dello stato:

```bash
# esempio: copia giornaliera alle 9 via cron
0 9 * * * curl -s http://localhost:4321/api/state > ~/mymanager-backups/$(date +\%Y\%m\%d).json
```
