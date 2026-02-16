# Riferimento: API Endpoints

Lista completa di tutti gli endpoint API disponibili.

Le rotte sono definite in:
- `laravel-spedizionefacile-main/routes/web.php` (rotte principali, prefisso `/api/`)
- `laravel-spedizionefacile-main/routes/api.php` (rotte aggiuntive, prefisso `/api/`)

---

## Rotte pubbliche (nessuna autenticazione)

### Autenticazione

| Metodo | URL | Controller | Descrizione | Throttle |
|---|---|---|---|---|
| POST | `/api/custom-register` | `CustomRegisterController@register` | Registrazione nuovo utente | 5/min |
| POST | `/api/custom-login` | `CustomLoginController@login` | Login con email e password | 10/min |
| POST | `/api/resend-verification-email` | `CustomLoginController@resendVerificationEmail` | Reinvia email di verifica | 5/min |
| POST | `/api/verify-code` | `CustomLoginController@verifyCode` | Verifica codice email | 10/min |
| GET | `/api/verify-email/{id}` | `VerificationController@verify` | Conferma email (link cliccato) | - |
| GET | `/api/auth/google/redirect` | `GoogleController@redirectToGoogle` | Redirect a Google OAuth | - |

### Password

| Metodo | URL | Controller | Descrizione | Throttle |
|---|---|---|---|---|
| POST | `/api/forgot-password` | `PasswordResetRequestController@sendEmail` | Invia email reset password | 5/min |
| POST | `/api/update-password` | `ChangePasswordController@passwordResetProcess` | Reimposta la password | 5/min |

### Localita' (autocompletamento)

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/locations/search` | `LocationController@search` | Cerca localita' per nome |
| GET | `/api/locations/by-cap` | `LocationController@byCap` | Cerca localita' per CAP |

### Sessione (preventivo)

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/session` | `SessionController@show` | Legge dati sessione corrente |
| POST | `/api/session/first-step` | `SessionController@firstStep` | Salva primo step preventivo |

### Carrello ospite

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/guest-cart` | `GuestCartController@index` | Lista carrello ospite |
| POST | `/api/guest-cart` | `GuestCartController@store` | Aggiungi al carrello ospite |
| PUT | `/api/guest-cart/{id}` | `GuestCartController@update` | Aggiorna elemento carrello |
| DELETE | `/api/guest-cart/{id}` | `GuestCartController@destroy` | Rimuovi dal carrello |
| DELETE | `/api/empty-guest-cart` | `GuestCartController@emptyCart` | Svuota carrello ospite |

### Tracking pubblico

| Metodo | URL | Controller | Descrizione | Throttle |
|---|---|---|---|---|
| GET | `/api/tracking/search` | `BrtController@publicTracking` | Cerca per codice tracking | 15/min |

### Contatti

| Metodo | URL | Controller | Descrizione | Throttle |
|---|---|---|---|---|
| POST | `/api/contact` | `ContactController@store` | Invia messaggio contatto | 5/min |

### Altro

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/get-admin-image` | `UserController@getAdminImage` | Recupera immagine admin |
| POST | `/stripe/webhook` | `StripeWebhookController@handle` | Webhook Stripe |

---

## Rotte autenticate (auth:sanctum)

Richiedono login. Header: cookie di sessione.

### Utente

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/user` | (closure) | Dati utente corrente |
| POST | `/api/logout` | (closure) | Logout |
| GET | `/api/users` | `UserController@index` | Lista utenti |
| GET | `/api/users/{id}` | `UserController@show` | Dettaglio utente |
| PUT | `/api/users/{id}` | `UserController@update` | Aggiorna profilo |
| DELETE | `/api/users/{id}` | `UserController@destroy` | Elimina account |

### Indirizzi (rubrica)

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/user-addresses` | `UserAddressController@index` | Lista indirizzi |
| POST | `/api/user-addresses` | `UserAddressController@store` | Crea indirizzo |
| PUT | `/api/user-addresses/{id}` | `UserAddressController@update` | Aggiorna indirizzo |
| DELETE | `/api/user-addresses/{id}` | `UserAddressController@destroy` | Elimina indirizzo |

### Carrello (utente loggato)

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/cart` | `CartController@index` | Lista carrello |
| POST | `/api/cart` | `CartController@store` | Aggiungi al carrello |
| PUT | `/api/cart/{id}` | `CartController@update` | Aggiorna elemento |
| DELETE | `/api/cart/{id}` | `CartController@destroy` | Rimuovi dal carrello |
| DELETE | `/api/empty-cart` | `CartController@emptyCart` | Svuota carrello |
| PATCH | `/api/cart/{id}/quantity` | `CartController@updateQuantity` | Aggiorna quantita' |

### Pacchi

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/packages` | `PackageController@index` | Lista pacchi |
| POST | `/api/packages` | `PackageController@store` | Crea pacco |
| PUT | `/api/packages/{id}` | `PackageController@update` | Aggiorna pacco |
| DELETE | `/api/packages/{id}` | `PackageController@destroy` | Elimina pacco |

### Indirizzi pacco

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/addresses` | `AddressController@index` | Lista indirizzi pacco |
| POST | `/api/addresses` | `AddressController@store` | Crea indirizzo |
| PUT | `/api/addresses/{id}` | `AddressController@update` | Aggiorna indirizzo |
| DELETE | `/api/addresses/{id}` | `AddressController@destroy` | Elimina indirizzo |

### Ordini

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/orders` | `OrderController@index` | Lista ordini utente |
| POST | `/api/orders` | `OrderController@store` | Crea ordine |
| GET | `/api/orders/{id}` | `OrderController@show` | Dettaglio ordine |
| POST | `/api/orders/{order}/cancel` | `OrderController@cancel` | Annulla ordine |
| POST | `/api/orders/{order}/add-package` | `OrderController@addPackage` | Aggiungi pacco a ordine |
| POST | `/api/create-direct-order` | `OrderController@createDirectOrder` | Ordine diretto (no carrello) |

### Pagamenti Stripe

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| POST | `/api/stripe/create-order` | `StripeController@createOrder` | Crea ordine dal carrello (*) |
| POST | `/api/stripe/create-payment` | `StripeController@createPayment` | Crea pagamento (*) |
| POST | `/api/stripe/create-payment-intent` | `StripeController@createPaymentIntent` | Crea PaymentIntent (*) |
| POST | `/api/stripe/order-paid` | `StripeController@orderPaid` | Conferma pagamento (*) |
| POST | `/api/stripe/mark-order-completed` | `StripeController@markOrderCompleted` | Segna completato (wallet/bonifico) |
| POST | `/api/stripe/existing-order-payment` | `StripeController@createPayment` | Paga ordine esistente |
| POST | `/api/stripe/existing-order-payment-intent` | `StripeController@createPaymentIntent` | PaymentIntent ordine esistente |
| POST | `/api/stripe/existing-order-paid` | `StripeController@orderPaid` | Conferma pagamento ordine esistente |

(*) Richiede anche il middleware `CheckCart` (carrello non vuoto).

### Carte di credito

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| POST | `/api/stripe/create-setup-intent` | `StripeController@createSetupIntent` | Setup nuova carta |
| GET | `/api/stripe/payment-methods` | `StripeController@listPaymentMethods` | Lista carte |
| POST | `/api/stripe/set-default-payment-method` | `StripeController@setDefaultPaymentMethod` | Imposta predefinita |
| POST | `/api/stripe/change-default-payment-method` | `StripeController@changeDefaultPaymentMethod` | Cambia predefinita |
| GET | `/api/stripe/default-payment-method` | `StripeController@getDefaultPaymentMethod` | Leggi predefinita |
| DELETE | `/api/stripe/delete-card` | `StripeController@deleteCard` | Elimina carta |

### Impostazioni Stripe

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/settings/stripe` | `SettingsController@getStripeConfig` | Legge config Stripe |
| POST | `/api/settings/stripe` | `SettingsController@saveStripeConfig` | Salva config Stripe |

### Spedizioni configurate (template)

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/saved-shipments` | `SavedShipmentController@index` | Lista template |
| POST | `/api/saved-shipments` | `SavedShipmentController@store` | Crea template |
| PUT | `/api/saved-shipments/{id}` | `SavedShipmentController@update` | Aggiorna template |
| DELETE | `/api/saved-shipments/{id}` | `SavedShipmentController@destroy` | Elimina template |
| POST | `/api/saved-shipments/add-to-cart` | `SavedShipmentController@addToCart` | Aggiungi al carrello |

### BRT (spedizioni)

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| POST | `/api/brt/create-shipment` | `BrtController@createShipment` | Crea spedizione BRT |
| POST | `/api/brt/confirm-shipment` | `BrtController@confirmShipment` | Conferma spedizione |
| POST | `/api/brt/delete-shipment` | `BrtController@deleteShipment` | Cancella spedizione |
| GET | `/api/brt/label/{order}` | `BrtController@downloadLabel` | Scarica etichetta PDF |
| GET | `/api/brt/tracking/{order}` | `BrtController@tracking` | Stato tracking |
| GET | `/api/brt/pudo/search` | `BrtController@pudoSearch` | Cerca punti PUDO |
| GET | `/api/brt/pudo/nearby` | `BrtController@pudoNearby` | PUDO vicini (GPS) |
| GET | `/api/brt/pudo/{pudoId}` | `BrtController@pudoDetails` | Dettagli punto PUDO |

### Stripe Connect

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/stripe/connect` | `StripeConnectController@connect` | Collega account Stripe |
| GET | `/api/stripe/callback` | `StripeConnectController@callback` | Callback OAuth Stripe |
| GET | `/api/stripe/create-account` | `StripeConnectController@createAccount` | Crea account Stripe |

### Coupon

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| POST | `/api/calculate-coupon` | `CouponController@calculateCoupon` | Calcola sconto coupon |

### Portafoglio

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/wallet/balance` | `WalletController@balance` | Saldo portafoglio |
| GET | `/api/wallet/movements` | `WalletController@movements` | Lista movimenti |
| POST | `/api/wallet/top-up` | `WalletController@topUp` | Ricarica portafoglio |
| POST | `/api/wallet/pay` | `WalletController@payWithWallet` | Paga con portafoglio |

### Referral

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/referral/my-code` | `ReferralController@myCode` | Il tuo codice referral |
| POST | `/api/referral/validate` | `ReferralController@validate` | Valida un codice |
| POST | `/api/referral/apply` | `ReferralController@apply` | Applica codice a ordine |
| POST | `/api/referral/store` | `ReferralController@storeReferral` | Salva utilizzo referral |
| GET | `/api/referral/my-discount` | `ReferralController@myDiscount` | Il tuo sconto |
| GET | `/api/referral/earnings` | `ReferralController@earnings` | Guadagni da referral |

### Prelievi (Partner Pro)

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/withdrawals` | `WithdrawalController@index` | Lista prelievi |
| POST | `/api/withdrawals` | `WithdrawalController@store` | Richiedi prelievo |

### Richiesta Partner Pro

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| POST | `/api/pro-request` | `ProRequestController@store` | Invia richiesta Pro |
| GET | `/api/pro-request/status` | `ProRequestController@status` | Stato richiesta |

---

## Rotte Admin (auth:sanctum + CheckAdmin)

Richiedono login come Admin.

### Dashboard

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/admin/dashboard` | `AdminController@dashboard` | Statistiche generali |

### Ordini

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/admin/orders` | `AdminController@orders` | Lista tutti gli ordini |
| PATCH | `/api/admin/orders/{order}/status` | `AdminController@updateOrderStatus` | Cambia stato ordine |

### Spedizioni BRT

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/admin/shipments` | `AdminController@shipments` | Lista spedizioni |
| POST | `/api/admin/orders/{order}/regenerate-label` | `AdminController@regenerateLabel` | Rigenera etichetta |
| POST | `/api/admin/brt/test-create` | `BrtController@testCreate` | Test creazione BRT |

### Portafoglio (panoramica)

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/admin/wallet/overview` | `AdminController@walletOverview` | Panoramica portafogli |
| GET | `/api/admin/wallet/users/{user}/movements` | `AdminController@userMovements` | Movimenti utente |

### Prelievi (gestione)

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/admin/withdrawals` | `AdminController@withdrawals` | Lista richieste |
| POST | `/api/admin/withdrawals/{id}/approve` | `AdminController@approveWithdrawal` | Approva |
| POST | `/api/admin/withdrawals/{id}/reject` | `AdminController@rejectWithdrawal` | Rifiuta |

### Referral

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/admin/referrals` | `AdminController@referralStats` | Statistiche referral |

### Richieste Pro

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/admin/pro-requests` | `ProRequestController@index` | Lista richieste |
| PATCH | `/api/admin/pro-requests/{id}/approve` | `ProRequestController@approve` | Approva |
| PATCH | `/api/admin/pro-requests/{id}/reject` | `ProRequestController@reject` | Rifiuta |

### Utenti

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/admin/users` | `AdminController@users` | Lista utenti |
| PATCH | `/api/admin/users/{user}/approve` | `AdminController@approveUser` | Approva utente |
| PATCH | `/api/admin/users/{user}/role` | `AdminController@updateUserRole` | Cambia ruolo |
| DELETE | `/api/admin/users/{user}` | `AdminController@deleteUser` | Elimina utente |

### Messaggi di contatto

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/admin/contact-messages` | `AdminController@contactMessages` | Lista messaggi |
| PATCH | `/api/admin/contact-messages/{id}/read` | `AdminController@markContactMessageRead` | Segna letto |

### Impostazioni

| Metodo | URL | Controller | Descrizione |
|---|---|---|---|
| GET | `/api/admin/settings` | `AdminController@settings` | Legge impostazioni |
| POST | `/api/admin/settings` | `AdminController@updateSettings` | Aggiorna impostazioni |
