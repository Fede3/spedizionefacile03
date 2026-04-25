# Migrations log — Refactor in corso

Log delle migrazioni architetturali per junior che entra a metà refactor.
Aggiorna questo file ogni volta che sposti codice da un pattern a un altro.

## 2026-04-25 — Pinia migration progressiva (in corso)

### Composables → store Pinia (strangler pattern)

Stiamo migrando i god-composables (file >500 LOC che mescolano state + logic)
verso store Pinia separati (`stores/*.js`) ispezionabili in Vue DevTools.

Il composable vecchio diventa **thin wrapper retro-compat** sopra lo store
così i caller esistenti non si rompono. Quando tutti i caller migrano a
`useXStore()` direttamente, il wrapper si elimina.

| Composable | → Store | Stato | Caller migrati |
|---|---|---|---|
| `useAuthModal` | `stores/authModalStore.js` | ✅ wrapper attivo | 0/8 (wrapper retro-compat) |
| `useConfirmDialog` | `stores/confirmDialogStore.js` | ✅ wrapper attivo | 0/2 (wrapper retro-compat) |
| `useAuth` (700 LOC) | `stores/authStore.js` | ❌ TODO | — |
| `useCart` (820 LOC) | `stores/cartStore.js` | ❌ TODO | — |
| `useFunnel` (714 LOC) | `stores/funnelStore.js` | ❌ TODO | — |
| `usePayment` (718 LOC) | `stores/paymentStore.js` | ❌ TODO | — |
| `usePudo` (912 LOC) | `stores/pudoStore.js` | ❌ TODO | — |
| `useAdminPrezzi` (1426 LOC) | `stores/admin/prezziStore.js` | ❌ TODO | — |
| `useAddressBook` (621 LOC) | `stores/addressBookStore.js` | ❌ TODO | — |
| `useLocation` (743 LOC) | `stores/locationStore.js` | ❌ TODO | — |

### Convenzione caller

Quando crei una nuova page/component:

```javascript
// ✅ BENE: usa lo store direttamente
import { useCartStore } from '~/stores/cartStore'
const cart = useCartStore()

// ⚠️ DEPRECATO ma funzionante: wrapper retro-compat
const { cart, init } = useCart()
```

## 2026-04-25 — Eliminazioni dead code

| Rimosso | LOC | Motivo |
|---|---|---|
| `composables/useEcommerceAnalytics.js` | 47 | No-op shim post-rimozione GA4, zero valore |
| `composables/useCookieConsent.js` | 153 | Mai chiamato (solo riferimento in commento) |
| `_archive/` (392 file git-tracked) | ~85.000 | Snapshot legacy, conservato in git history |
| `docs/archive/` (90 file storici) | — | Doc storiche, conservate in git history |

## 2026-04-25 — Backend hardening

### Policies registrate (vs 2 iniziali)

| Model | Policy | Scope |
|---|---|---|
| `Order` | `OrderPolicy` | view/update/cancel/manageShipment owner+admin |
| `UserAddress` | `UserAddressPolicy` | owner-only (admin via altro flusso) |
| `BillingAddress` | `BillingAddressPolicy` | owner+admin (P.IVA, codice fiscale, SDI) |
| `WalletMovement` | `WalletMovementPolicy` | owner+admin, immutabile (audit fiscale) |
| `WithdrawalRequest` | `WithdrawalRequestPolicy` | Pro create, Admin approve |
| `Coupon` | `CouponPolicy` | admin-only |
| `Service` | `ServicePolicy` | view pubblico, CRUD admin |
| `ProRequest` | `ProRequestPolicy` | owner view, Admin approve |
| `InvoiceArchive` | `InvoiceArchivePolicy` | owner view via order, immutabile |
| `User` | `UserPolicy` | self + admin (no auto-modifica role/delete) |

Pattern uniforme: tutti i controller dovrebbero usare `$this->authorize('action', $model)`
invece di check manuali sparsi.

## 2026-04-25 — Mail sync → queue async

| File | Mail | Prima | Dopo |
|---|---|---|---|
| `ShipmentDocumentDispatcher.php:51` | `ShipmentDocumentsMail` (cliente) | `->send()` | `->queue()` |
| `ShipmentDocumentDispatcher.php:69` | `ShipmentDocumentsMail` (admin) | `->send()` | `->queue()` |
| `PasswordResetRequestController.php:119` | `ResetPasswordEmail` | `->send()` | `->queue()` |

## 2026-04-25 — Cache layer aggiunto

`Setting::get($key)` ora wrappato con `Cache::remember(setting:$key, 3600, ...)`.
`Setting::set($key, $value)` invalida il cache key.
Riduce N query DB per request (Stripe, BRT, mail config) a 1 query/h.

## TODO post-migrazione

Quando tutti i caller di `useAuthModal` sono migrati a `useAuthModalStore()`:
1. Eliminare `composables/useAuthModal.js` (thin wrapper)
2. Aggiornare questo file con riga "✅ wrapper rimosso 2026-XX-XX"
