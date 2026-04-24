# Services - Punto di Ingresso

Questa guida estesa non e' piu' autorevole: oggi `app/Services/` contiene molti
boundary di business, non solo il vecchio service BRT.

Per partire dai servizi vivi senza leggerti la repo al contrario, usa:

- [../../README.md](../../README.md)
- [../../../docs/BACKEND_STRUCTURE.md](../../../docs/BACKEND_STRUCTURE.md)
- [../../../docs/FEATURE_BOUNDARIES.md](../../../docs/FEATURE_BOUNDARIES.md)

Reading order backend consigliato:

1. `CheckoutSubmissionContextService`
2. `OrderCreationService`
3. `StripePaymentService`
4. `WalletOrderPaymentService`
5. `OrderBrtFulfillmentService`
6. `ShipmentExecutionService`
7. `Brt/*`

Se trovi informazioni in conflitto tra questo path e `docs/`, vale sempre `docs/`.
