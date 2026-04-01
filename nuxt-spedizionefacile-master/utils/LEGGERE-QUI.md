# Utils - Leggere Qui

Questa cartella contiene utility condivise (funzioni pure senza stato). Nuxt le auto-importa: basta chiamarle per nome, senza `import`.

## File principali

| File | Cosa fa |
|------|---------|
| **price.js** | `formatPrice(cents)` — converte centesimi in stringa italiana ("8,90 €"). Il backend salva SEMPRE in centesimi, il frontend divide per 100. |
| **location.js** | Normalizzazione localita (accenti, case), formattazione "Citta (XX) - CAP", matching fuzzy per autocompletamento. |
| **authUiState.ts** | Tipi TypeScript per lo snapshot auth usato nei cookie SSR (nome, cognome, ruolo). Usato da plugin e composables. |
| **provinceList.js** | Lista province italiane con sigle, usata nei form indirizzi. |
| **shipmentFlowState.js** | Logica di validazione del flusso spedizione: calcola lo step massimo raggiungibile e blocca salti avanti non autorizzati. |
| **shipmentServicePricing.js** | Calcolo prezzi servizi aggiuntivi (assicurazione, contrassegno, ecc.). |
| **accountNavigation.js** | Definizione voci menu sidebar account utente. |

## Convenzione prezzi (IMPORTANTE)

- Backend (Laravel): prezzi in **centesimi** (integer, es. `890` = 8,90 EUR)
- Frontend (Nuxt): `formatPrice(890)` restituisce `"8,90 €"`
- Mai salvare euro float nel DB, sempre centesimi interi
