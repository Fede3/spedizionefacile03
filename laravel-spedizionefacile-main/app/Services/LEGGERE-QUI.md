# Services - Leggere Qui

Questa cartella contiene i servizi del backend. I servizi incapsulano la logica di business complessa, separandola dai controller per mantenere il codice organizzato.

## I 3 file principali

Al momento questa cartella contiene un solo servizio, che e il piu critico:

1. **BrtService.php** - Tutta la logica di comunicazione con le API del corriere BRT. Gestisce: creazione spedizioni, generazione etichette PDF, conferma/cancellazione spedizioni, ricerca punti PUDO, normalizzazione indirizzi per il formato BRT.

## Ordine di lettura consigliato

1. `BrtService.php` metodo `createShipment()` (riga 61) - Il flusso principale di creazione spedizione
2. `BrtService.php` metodo `normalizeAddressForBrt()` (riga 753) - Come vengono adattati gli indirizzi
3. `BrtService.php` metodo `getPudoByAddress()` (riga 498) - Ricerca punti di ritiro

## Quale file modificare per...

| Esigenza | File |
|----------|------|
| Cambiare i dati inviati a BRT | `BrtService.php` metodo `createShipment()` (riga 108-148, il payload) |
| Aggiungere un servizio BRT | `BrtService.php` metodo `addServicesToPayload()` (riga 661-736) |
| Cambiare la normalizzazione citta | `BrtService.php` metodo `normalizeCityName()` (riga 795) |
| Aggiungere una provincia | `BrtService.php` metodo `provinceToAbbreviation()` (riga 992) |
| Aggiungere un paese | `BrtService.php` metodo `countryToIso2()` (riga 1044) |
| Cambiare il formato tracking URL | `BrtService.php` metodo `getTrackingUrl()` (riga 635) |
| Modificare la gestione errori BRT | `BrtService.php` metodo `translateBrtError()` (riga 933) |
