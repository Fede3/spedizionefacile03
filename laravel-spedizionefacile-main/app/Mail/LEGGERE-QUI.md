# Mail - Puntatore Locale

Questa guida locale non e' piu' autorevole: le mail vanno lette nel flow che le
genera, non come catalogo separato.

Per orientarti bene:

- [../../../docs/BACKEND_STRUCTURE.md](../../../docs/BACKEND_STRUCTURE.md)
- [../../../docs/FEATURE_BOUNDARIES.md](../../../docs/FEATURE_BOUNDARIES.md)

Entry point locali consigliati:

1. `ShipmentLabelMail.php`
2. `ShipmentDocumentsMail.php`
3. `OrderConfirmationMail.php`
4. `../Listeners/GenerateBrtLabel.php`

Nota pratica:

- `app/Mail/` contiene le classi Mailable
- `resources/views/emails/` contiene i template
- `docs/` resta la source of truth documentale

Se trovi informazioni in conflitto tra questo file e `docs/`, vale sempre
`docs/`.
