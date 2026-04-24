# Archivio: useAutenticazione.js (dead code)

**Data**: 2026-04-20
**Operazione**: Rimozione composable orfano `useAutenticazione.js`

## Contesto

Il composable `useAutenticazione.js` era stato scritto per la vecchia pagina
standalone `/autenticazione` (login/registrazione in pagina piena, senza modale).

Il 2026-04-20 tutte le pagine auth legacy sono state convertite in **semplici
redirect** verso il modale overlay (`AuthOverlayModal.vue`) tramite
`buildLegacyAuthOverlayRedirect()` dentro `utils/auth.ts`:

| Pagina | Contenuto attuale |
|--------|-------------------|
| `pages/login.vue` | redirect a overlay login |
| `pages/registrazione.vue` | redirect a overlay register |
| `pages/autenticazione.vue` | redirect a overlay |
| `pages/recupera-password.vue` | redirect a overlay + forgot |
| `pages/aggiorna-password.vue` | form dedicato con logica locale |
| `pages/verifica-email.vue` | pagina di atterraggio statica |

A valle di questo refactor **nessun consumatore** chiama piu' `useAutenticazione()`.
Il composable era rimasto nella repo come dead code.

## Verifica consumatori

```bash
grep -rn "useAutenticazione" nuxt-spedizionefacile-master/ --include="*.vue" --include="*.js" --include="*.ts"
# Risultato: zero chiamate. Solo la dichiarazione interna e un commento stantio in utils/auth.ts.
```

Il commento in `utils/auth.ts` linea 101 e' stato aggiornato per riflettere lo stato attuale.

## File archiviati (1)

| File | LOC | Motivo archiviazione |
|------|-----|----------------------|
| `useAutenticazione.js` | 420 | Dead code, nessun consumatore. La logica equivalente vive in `useAuth.js` (sezione 4 — `useAuthOverlay`). |

## Ripristino (se necessario)

```bash
# Da questa directory:
mv useAutenticazione.js C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/composables/
```

Per tornare ad avere una pagina standalone attiva, bisognera' anche ripristinare
il contenuto originale di almeno una delle pagine sopra (ora sono tutte redirect).

## Relazione con consolidamento auth v1

Questo archivio e' il **v2** del cleanup auth. La prima ondata (v1, stesso giorno)
aveva consolidato 4 file `useAuth*` in un unico `useAuth.js` (vedi
`../composables-consolidati-auth/README.md`). Il v1 aveva aggiornato gli import
di `useAutenticazione.js` senza accorgersi che il composable fosse gia' orfano.
Il v2 completa la pulizia archiviando il file morto.
