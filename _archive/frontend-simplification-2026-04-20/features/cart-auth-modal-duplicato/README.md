# CartAuthModal — Archiviato 2026-04-20

## Motivo
Duplicato funzionale di `components/auth/AuthOverlayModal.vue`.
Due modal diversi per lo stesso scopo (login/registrazione utente) creavano
incoerenza UX: l'utente vedeva un popup diverso se apriva login dal navbar
o se apriva login dal carrello.

## Sostituto
Unificato su `AuthOverlayModal` (globale, gia' montato in `layouts/default.vue`),
aperto tramite `useAuthModal().openAuthModal({ tab, redirect })`.

Flow nuovo per il carrello:
1. Utente guest clicca "Procedi al checkout" o "Salva carrello"
2. `useCarrello.openCheckoutWithAuthGate(tab)` chiama `openAuthModal`
3. AuthOverlayModal si apre con `redirect: '/checkout'`
4. Dopo login/register l'utente viene rediretto al checkout

## Come riattivare
Spostare `CartAuthModal.vue` in `components/cart/` e ripristinare in
`composables/useCarrello.js` gli state `showAuthCheckoutModal`, `authCheckoutTab`,
`authLoginForm`, `authRegisterForm` e le action `loginForCheckout` /
`registerForCheckout` (vedi git log `composables/useCarrello.js` a
2026-04-20 per il codice completo rimosso).
