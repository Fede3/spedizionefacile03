# Archivio: composables funnel originali (pre-consolidamento)

**Data archiviazione**: 2026-04-20
**Agent**: O6-B (Ondata 6 del refactor SpedizioneFacile)

## Contesto

I 4 composables `useFunnel*.js` vivevano come file separati in
`nuxt-spedizionefacile-master/composables/`. Erano:

| File | Scopo |
|------|-------|
| `useFunnelAnalytics.js` | Tracking Plausible (eventi preventivo / auth / payment) |
| `useFunnelNavigation.js` | Scroll/focus helpers + accordion transition hooks |
| `useFunnelState.js` | Errors, template refs, UI flags, icon filters, error helpers |
| `useFunnelValidation.js` | Validazione step-by-step (packages + services) |

I 4 file erano coesi nello scope (tutti e soli per il funnel `/la-tua-spedizione/[step]`)
e non venivano mai usati separatamente in isolamento — i consumer principali
(`pages/la-tua-spedizione/[step].vue`, `composables/useShipmentStepPageOrchestration.js`,
`composables/useAuthOverlay.js`) importavano in coppia/terna.

## Cosa è stato fatto

Fusi in un unico file `composables/useFunnel.js` con sezioni etichettate
(`// ====== ANALYTICS ======` / `// ====== NAVIGATION ======` /
`// ====== STATE ======` / `// ====== VALIDATION ======`).

I **named export** sono stati preservati identici per retrocompatibilità:

```js
// Prima (4 file separati):
import { useFunnelAnalytics } from '~/composables/useFunnelAnalytics';
import { useFunnelNavigation } from '~/composables/useFunnelNavigation';
import { useFunnelState } from '~/composables/useFunnelState';
import { useFunnelValidation } from '~/composables/useFunnelValidation';

// Dopo (1 solo file, stessi import grazie all'auto-import Nuxt dei named export):
import { useFunnelAnalytics, useFunnelNavigation, useFunnelState, useFunnelValidation } from '~/composables/useFunnel';
// Oppure — grazie all'auto-import di Nuxt — semplicemente usare direttamente:
const funnelState = useFunnelState();
```

Anche le costanti esportate `PACKAGE_VALIDATION_LABELS` e `PACKAGE_VALIDATION_KEYS`
sono preservate dal modulo unificato.

## Perché archiviare (e non solo eliminare)

Policy repo `frontend-simplification-2026-04-20/`: mai `rm` diretto su codice
funzionante. Sempre archiviazione con README per poter:
1. Ricostruire la storia del refactor se qualcuno dovesse indagare.
2. Ripristinare al volo in caso di regressioni inattese in produzione.

## Reattivazione (in caso di rollback)

Se serve ripristinare i 4 file separati:

```bash
cp "_archive/frontend-simplification-2026-04-20/composables-consolidati/funnel-originali/useFunnel*.js" \
   "nuxt-spedizionefacile-master/composables/"
rm "nuxt-spedizionefacile-master/composables/useFunnel.js"
```

Nessuna modifica ai consumer sarà necessaria perché i named export sono identici.
