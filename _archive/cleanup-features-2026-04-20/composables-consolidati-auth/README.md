# Archivio: composables auth consolidati

**Data**: 2026-04-20
**Operazione**: Consolidamento 5 `useAuth*` composables → 2 file nella repo Nuxt
(`nuxt-spedizionefacile-master/composables/`).

## File archiviati (4)

| File | LOC | Motivo archiviazione |
|------|-----|----------------------|
| `useAuthOverlay.js` | 398 | Unificato in `composables/useAuth.js` (sezione 4 — Overlay Logic) |
| `useAuthProviders.js` | 45 | Unificato in `composables/useAuth.js` (sezione 3 — Providers Config) |
| `useAuthUiSnapshotPersistence.js` | 57 | Unificato in `composables/useAuth.js` (sezione 1 — Snapshot Persistence) |
| `useAuthUiState.js` | 169 | Unificato in `composables/useAuth.js` (sezione 2 — UI State) |

**Totale archiviato**: 669 LOC.

## File mantenuto separato

| File | LOC | Motivo |
|------|-----|--------|
| `composables/useAuthModal.js` | 44 | Trigger semplice per open/close del modal, usato da navbar, carrello, pagine account. Tenerlo isolato è più pulito. |

## Risultato finale

- **Prima**: 5 file (713 LOC totali)
- **Dopo**: 2 file (`useAuth.js` ~713 LOC + `useAuthModal.js` 44 LOC)

## Nomi export preservati

Il nuovo `useAuth.js` esporta gli stessi nomi dei 4 file originali, in modo che:
- **Auto-import Nuxt** continua a funzionare senza modifiche per tutti i consumatori
  (Nuxt auto-importa per nome di export, non per path di file).
- **Import espliciti** (pochi, usano `~/composables/useAuthUiSnapshotPersistence`) sono
  stati aggiornati manualmente a `~/composables/useAuth`.

Export disponibili da `composables/useAuth.js`:
- `useAuthUiSnapshotPersistence()`
- `useAuthUiState()`
- `useAuthProviders()`
- `useAuthOverlay()`

## Consumatori aggiornati (import espliciti)

- `composables/useAccountDashboard.js` (riga 2)
- `composables/useAutenticazione.js` (riga 14)
- `composables/useCarrello.js` (riga 1)
- `pages/account/profilo.vue` (riga 2)

Tutti gli altri consumatori usano auto-import e non richiedono modifiche.

## Ripristino (se necessario)

```bash
# Da questa directory:
mv *.js C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/composables/
# Poi rimuovere composables/useAuth.js e ripristinare gli import originali.
```
</content>
</invoke>
