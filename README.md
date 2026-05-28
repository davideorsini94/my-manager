# MyManager

App personale per Tech Lead R&D. Single-page, zero dipendenze npm.

## Avvio (consigliato — persistenza su file)

```bash
cd /Users/davideorsini/workspace/MyManager
npm start
```

Apri http://localhost:4321

I dati vengono salvati in `data/state.json` sul tuo disco. Ad ogni modifica viene creato uno snapshot in `data/backups/` (gli ultimi 30 vengono mantenuti). Puoi sfogliare e ripristinare i backup dal pulsante **Backup** nella sidebar.

Porta personalizzata: `PORT=8080 npm start`

## Avvio senza server (fallback)

Aprendo direttamente `index.html` nel browser funziona comunque, ma i dati restano solo nel `localStorage` del browser. L'indicatore di stato in fondo alla sidebar mostra la modalità attiva:

- 🟢 **Sincronizzato** — server attivo, dati su disco
- 🔵 **Salvando…** — scrittura in corso
- 🔴 **Errore** — il server ha rifiutato la sync (i dati restano in localStorage come backup)
- ⚪ **Solo localStorage** — server non disponibile

## Persistenza & backup

Hai diverse reti di sicurezza:

1. **`data/state.json`** — fonte di verità
2. **`data/backups/state-*.json`** — snapshot automatici ad ogni save (ultimi 30)
3. **localStorage** — copia parallela su ogni salvataggio (sopravvive anche se rompi il file)
4. **Export JSON** — backup manuale scaricabile (pulsante in sidebar)

Per backup off-machine: copia/sincronizza la cartella `data/` (Dropbox, iCloud, git privato, ecc.).

## Cosa fa

- **Dashboard** — colpo d'occhio su task in ritardo, focus di oggi, 1:1 da fare, note recenti.
- **Tasks** — todo con priorità P0–P3, scadenze, tag, assegnazione a membri del team.
- **Team** — membri con cadenza 1:1 calcolata, note, action items, task assegnati.
- **Notes** — appunti rapidi / meeting con tag e ricerca.
- **Decisions** — log ADR-style delle decisioni tecniche.

## Scorciatoie

| Tasto         | Azione                       |
|---------------|------------------------------|
| `g d`         | Dashboard                    |
| `g t`         | Tasks                        |
| `g p`         | Team                         |
| `g n`         | Notes                        |
| `g x`         | Decisions                    |
| `n`           | Nuovo elemento (in base alla vista) |
| `/` o `⌘K`    | Ricerca globale              |
| `Esc`         | Chiudi modale                |
| `⌘/Ctrl+Enter`| Salva nei modali             |

## Stack

HTML + CSS + JS vanilla nel browser. Server Node con solo i moduli built-in (`http`, `fs`, `path`). Nessun `npm install`.
