# Composables Orfani — Archiviati 2026-04-20

## Motivo
Composables con 0 riferimenti nel codice. Identificati da audit automatico
(grep dei nomi esportati in tutti i file `.vue/.js/.ts` del progetto).

## Lista

| File | Export | Note |
|---|---|---|
| useApiError.ts | useApiError | mai usato |
| useSanitize.js | useSanitize | mai usato |
| useRiepilogo.ts | useRiepilogo | self-reference only |
| useCheckoutCoupon.js | useCheckoutCoupon | logic duplicata in useCheckout.js |
| useCheckoutPayment.js | useCheckoutPayment | logic duplicata in usePaymentFlow.js |
| useAddressFormState.js | useAddressFormState | dichiarato ma non importato |
| useAddressValidation.js | useAddressValidation | dichiarato ma non importato |
| useAdminHeroEditor.js | useAdminHeroEditor | feature rimossa (homepage image editor) |
| useAdminPrezziActions.js | — | sub-split mai wired |
| useAdminPrezziApi.js | — | sub-split mai wired |
| useAdminPrezziComputed.js | — | sub-split mai wired |
| useAdminPrezziDefaults.js | DEFAULT_WEIGHT_BANDS etc. | duplicato in useAdminPrezziState.js |
| useAdminPrezziNormalize.js | normalize* | duplicato in useAdminPrezziState.js |
| usePickupDate.js | usePickupDate | mai usato |
| useSavedShipments.js | (default) | feature spedizioni configurate rimossa |
| useShipmentFieldCheck.js | useShipmentFieldCheck | mai usato |
| useShipmentLocationSuggestions.js | — | duplicato di useLocationSearch |
| useShipmentRules.js | useShipmentRules | mai usato |
| useShipmentStepSavedConfigs.js | — | feature spedizioni configurate rimossa |
| useShipmentStepVisibility.js | — | mai usato |
| useShipmentSummaryCalculations.js | — | logic inlined in useRiepilogo.ts (anch'esso orfano) |

## Come riattivare
`mv _archive/frontend-simplification-2026-04-20/composables-orfani/{file}.js nuxt-spedizionefacile-master/composables/`.
Controlla che non esistano duplicati gia' in `useAdminPrezziState.js` / `useCheckout.js` / `usePaymentFlow.js`.
