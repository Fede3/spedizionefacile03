# Listeners - Leggere Qui

Questa cartella contiene gli "ascoltatori" di eventi. Quando un evento viene lanciato nel sistema (es. un ordine viene pagato), i listener registrati reagiscono automaticamente eseguendo azioni specifiche.

## I 3 file principali

1. **GenerateBrtLabel.php** - Genera automaticamente l'etichetta BRT quando un ordine viene pagato (evento `OrderPaid`). Chiama `BrtService`, salva l'etichetta nell'ordine, e invia l'email all'utente. Include retry fino a 3 tentativi.
2. **MarkOrderProcessing.php** - Cambia lo stato dell'ordine da `pending` a `processing` quando viene pagato (evento `OrderPaid`).
3. **CartEmpty.php** - Svuota il carrello dell'utente quando viene creato un ordine (evento `OrderCreated`).

## Ordine di lettura consigliato

1. Leggere prima `../Events/OrderPaid.php` per capire cosa contiene l'evento
2. `MarkOrderProcessing.php` - Il listener piu semplice
3. `GenerateBrtLabel.php` - Il listener piu complesso e critico
4. Controllare `../Providers/EventServiceProvider.php` per vedere la mappatura eventi -> listener

## Quale file modificare per...

| Esigenza | File |
|----------|------|
| Cambiare cosa succede dopo il pagamento | `GenerateBrtLabel.php` e/o `MarkOrderProcessing.php` |
| Aggiungere un'azione post-pagamento | Creare un nuovo listener e registrarlo in `EventServiceProvider.php` sotto `OrderPaid` |
| Disabilitare la generazione automatica BRT | Commentare `GenerateBrtLabel::class` in `EventServiceProvider.php` |
| Cambiare il numero di retry per BRT | `GenerateBrtLabel.php` costante `MAX_RETRIES` (riga 34) |
| Cambiare lo stato post-pagamento | `MarkOrderProcessing.php` (riga 37) |

## Mappatura eventi corrente

Definita in `../Providers/EventServiceProvider.php`:

- `OrderPaid` -> `MarkOrderProcessing`, `GenerateBrtLabel`
- `UserRegistered` -> `SendVerificationEmail` (in Jobs)
