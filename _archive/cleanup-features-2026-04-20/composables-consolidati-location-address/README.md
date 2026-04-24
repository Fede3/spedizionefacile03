# Composables consolidati Location + AddressBook — 20 aprile 2026

## Cosa contiene questa cartella
I 6 file originali che gestivano ricerca geografica + form/rubrica indirizzi,
prima che fossero consolidati in 2 file puliti dentro
`nuxt-spedizionefacile-master/composables/`.

## Motivazione del consolidamento
- 6 file, 1369 LOC totali, API pubbliche piccole ma sparse
- `useAddressForm` orchestra `useAddressFormCore` + `useAddressAutocomplete`
  + `useAddressSavedConfigs` + `useAddressPudo` (forte coupling tra file)
- Difficile seguire il flusso: per leggere il form indirizzi serve aprire 5 tab
- Alcune funzioni (PUDO, Autocomplete) sono logicamente "ricerca geografica",
  altre (FormCore, SavedConfigs) sono "gestione rubrica" → dominio naturale per split

## Nuovo layout
1. `composables/useLocation.js` — **ricerca geografica unificata**
   Aggrega: `useLocationSearch`, `useAddressAutocomplete`, `useAddressPudo`
2. `composables/useAddressBook.js` — **gestione form + rubrica indirizzi**
   Aggrega: `useAddressFormCore`, `useAddressSavedConfigs`, `useAddressForm` (orchestratore)

## Retro-compatibilità
I nomi delle funzioni exported sono **identici** agli originali:
- `useLocationSearch()` → da `useLocation.js`
- `useAddressAutocomplete()` → da `useLocation.js`
- `useAddressPudo()` → da `useLocation.js`
- `useAddressFormCore()` → da `useAddressBook.js`
- `useAddressSavedConfigs()` → da `useAddressBook.js`
- `useAddressForm()` → da `useAddressBook.js`

Nuxt auto-import risolve i nomi cercando nei file in `composables/*.js`, quindi
i consumatori (pages, altri composables) non hanno bisogno di modifiche.

## Consumatori noti (aggiornati o auto-imported)
- `composables/usePreventivo.ts` — usa `useLocationSearch` (auto-import, invariato)
- `composables/useShipmentLocationAutocomplete.js` — usa `useLocationSearch` (auto-import, invariato)
- `composables/useAddressBook.js` — importa `useAddressAutocomplete`, `useAddressPudo` da `~/composables/useLocation` (import esplicito aggiornato)

## Se devi fare rollback
1. Rimuovi `composables/useLocation.js` e `composables/useAddressBook.js`
2. Copia questi 6 file di nuovo in `composables/`

Nessuna modifica è stata fatta a logica funzionale, solo riorganizzazione fisica.
