# Mail - Leggere Qui

Questa cartella contiene le classi **Mailable** di Laravel. Ogni classe rappresenta un tipo di email che il sistema puo inviare. Le email vengono inviate tramite `Mail::to(...)->send(new NomeMail(...))`.

## File principali

1. **ShipmentLabelMail.php** - Email con l'etichetta BRT in allegato PDF. Inviata quando viene generata l'etichetta (automaticamente o da admin).
2. **ShipmentStatusUpdateMail.php** - Notifica cambio di stato della spedizione (es. "in transito", "consegnato", "in giacenza").
3. **OrderConfirmationMail.php** - Conferma ordine dopo il pagamento. Contiene riepilogo ordine e importo.
4. **VerificationEmail.php** - Email con codice a 6 cifre per verificare l'account dopo la registrazione.
5. **ResetPasswordEmail.php** - Link per reimpostare la password dimenticata.
6. **ShipmentDocumentsMail.php** - Invio documenti di spedizione (etichetta + bordero) via email.
7. **BrtErrorAlert.php** - Alert interno quando la generazione etichetta BRT fallisce.
8. **ReferralUsedMail.php** - Notifica al Partner Pro quando qualcuno usa il suo codice referral.

## Come si usa

Le email vengono inviate da controller e listener:
- `BrtController.php` e `GenerateBrtLabel.php` -> `ShipmentLabelMail`
- `StripeController.php` -> `OrderConfirmationMail` (tramite evento)
- `SendShipmentStatusEmail.php` (listener) -> `ShipmentStatusUpdateMail`

## Quale file modificare per...

| Esigenza | File |
|----------|------|
| Cambiare il template dell'etichetta BRT | `ShipmentLabelMail.php` + vista in `resources/views/emails/` |
| Cambiare il testo della conferma ordine | `OrderConfirmationMail.php` |
| Cambiare l'email di verifica | `VerificationEmail.php` |
| Aggiungere un nuovo tipo di email | Creare un nuovo Mailable con `php artisan make:mail NomeEmail` |
