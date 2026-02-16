# Events - Leggere Qui

Questa cartella contiene gli eventi del sistema. Un evento e un "annuncio" che dice al resto dell'applicazione che qualcosa di importante e successo. I listener (in `../Listeners/`) reagiscono automaticamente agli eventi.

## I 3 file principali

1. **OrderPaid.php** - L'evento piu importante. Lanciato quando un ordine viene pagato con successo. Contiene l'ordine e la transazione. Attiva: cambio stato a "processing" e generazione etichetta BRT.
2. **OrderCreated.php** - Lanciato quando viene creato un nuovo ordine. Contiene l'ordine. Attiva: svuotamento carrello.
3. **OrderPaymentFailed.php** - Lanciato quando un pagamento fallisce. Usato per registrare il fallimento.

## Ordine di lettura consigliato

1. `OrderPaid.php` - L'evento che fa partire il flusso di spedizione
2. `OrderCreated.php` - L'evento che fa partire il flusso post-ordine
3. Poi leggere i listener in `../Listeners/` per capire cosa succede dopo

## Quale file modificare per...

| Esigenza | File |
|----------|------|
| Aggiungere dati all'evento OrderPaid | `OrderPaid.php` (aggiungere proprieta nel costruttore) |
| Creare un nuovo tipo di evento | Creare un nuovo file in questa cartella, poi registrarlo in `../Providers/EventServiceProvider.php` |
| Capire chi lancia OrderPaid | Cercare `event(new OrderPaid(...))` in `StripeController.php` e `StripeWebhookController.php` |

## Dove vengono lanciati gli eventi

- `OrderPaid`: `StripeController.php` (riga 82 e 294) e `StripeWebhookController.php` (riga 117)
- `OrderCreated`: Non usato direttamente (il carrello viene svuotato inline in StripeController)
