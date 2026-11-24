# La Mia Cantina — PWA

Web app installabile su iPhone ("Aggiungi alla schermata Home"), con dati su Supabase
e ricerca automatica delle informazioni sul vino tramite Claude.

## Struttura

| Percorso | Cosa contiene |
|---|---|
| `src/App.jsx` | Schermate (cantina, bevute, dettaglio), sincronizzazione con Supabase e copia offline |
| `src/WineForm.jsx` | Inserimento/modifica con il pulsante "Cerca informazioni sul web" |
| `src/Stats.jsx`, `src/Settings.jsx` | Statistiche; account, backup e import |
| `src/icons.jsx` | Icone SVG: bottiglie per tipo, calice, grappolo, icone d'interfaccia |
| `src/data.js` | Campi, stato della finestra di bevuta, ordinamento per urgenza |
| `src/seed.js` | I 49 vini di partenza (usati solo se su Supabase la cantina non c'è) |
| `supabase/functions/cerca-vino/` | Edge Function che interroga Claude con ricerca web |
| `supabase/sicurezza.sql` | Protegge la tabella: solo utenti con login |

I dati restano nella stessa riga `bottiglie` (id = 1) usata dalla versione precedente:
i vini esistenti compaiono subito e i nuovi campi (apice, uvaggio, fonti…) si aggiungono senza conflitti.

## 1. Provarla sul PC

Serve Node.js (versione LTS). Poi, in questa cartella:

```
npm install
npm run dev
```

## 2. Supabase: utente, ricerca e sicurezza

1. **Utente**: Supabase → Authentication → Users → *Add user* (email + password a tua scelta).
   In Authentication → Sign In / Providers disattiva *Allow new users to sign up*, così nessun altro può registrarsi.
2. **Edge Function**: Supabase → Edge Functions → *Deploy a new function* → *Via editor*,
   nome `cerca-vino`, incolla il contenuto di `supabase/functions/cerca-vino/index.ts` e pubblica.
   Nelle impostazioni della funzione disattiva *Verify JWT* (il controllo del login è già nel codice).
3. **Secret**: Edge Functions → Secrets → aggiungi `ANTHROPIC_API_KEY` con la tua chiave
   (da console.anthropic.com). Facoltativo: `ALLOWED_EMAILS` con la tua email.
4. Nell'app: Impostazioni → Accedi. Prova la ricerca su un vino.
5. **Sicurezza** (quando il login funziona): Supabase → SQL Editor → esegui `supabase/sicurezza.sql`.
   Da quel momento senza login i dati non si vedono; la vecchia versione web smette di funzionare.

Ogni ricerca usa Claude Opus 5.5 con ricerca web: costa indicativamente qualche centesimo.

**Al momento la ricerca è spenta** (`RICERCA_WEB_ATTIVA = false` in `src/supabase.js`): i passi 2 e 3
servono solo quando vorrai attivarla. La funzione `cerca-vino` è già pubblicata su Supabase,
ma senza chiave API e senza login non fa nulla.

## 3. Pubblicarla e installarla su iPhone

```
npm run build
```

Pubblica la cartella `dist` su un hosting statico. Il modo più semplice senza account Git:
app.netlify.com/drop → trascina la cartella `dist`. Va bene anche Vercel o GitHub Pages.

Su iPhone: apri l'indirizzo in **Safari** → Condividi → **Aggiungi alla schermata Home**.
