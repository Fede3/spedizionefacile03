# Services - Leggere Qui

Questa cartella contiene i **servizi** del backend.
I servizi incapsulano la logica di business complessa, separandola dai controller.

---

## 1. Cosa contiene questa cartella

Al momento un solo file, che e' il piu' critico dell'intero backend:

- **BrtService.php** -- Tutta la comunicazione con le API del corriere BRT.

Questo servizio gestisce:
- Creazione spedizioni (payload, autenticazione, invio)
- Generazione etichette PDF
- Conferma e cancellazione spedizioni
- Ricerca punti PUDO (Pick Up Drop Off)
- Normalizzazione indirizzi per il formato richiesto da BRT
- Traduzione errori BRT in messaggi comprensibili
- Conversione province e nazioni in codici standard

---

## 2. Ordine consigliato per capire

1. **`createShipment()`** -- Il flusso principale: prende un ordine e crea la spedizione su BRT
2. **`normalizeAddressForBrt()`** -- Come vengono adattati gli indirizzi al formato BRT
3. **`addServicesToPayload()`** -- Come vengono aggiunti i servizi (contrassegno, ecc.) al payload
4. **`getPudoByAddress()`** -- Come funziona la ricerca dei punti di ritiro
5. **`translateBrtError()`** -- Come vengono tradotti gli errori BRT in italiano
6. **`getTrackingUrl()`** -- Come viene costruito il link di tracking

---

## 3. File principali e responsabilita'

| Sezione di BrtService.php | Responsabilita' |
|---------------------------|-----------------|
| `createShipment()` | Crea la spedizione BRT partendo dai dati dell'ordine. Costruisce il payload e chiama le API REST BRT. |
| `normalizeAddressForBrt()` | Adatta citta', province e nazioni al formato richiesto da BRT (maiuscole, sigle corrette). |
| `normalizeCityName()` | Pulisce il nome della citta' (rimuove accenti, parentesi, abbreviazioni). |
| `addServicesToPayload()` | Aggiunge i servizi opzionali al payload (contrassegno, orario di ritiro, ecc.). |
| `getPudoByAddress()` | Cerca punti PUDO vicini a un indirizzo dato. |
| `translateBrtError()` | Converte i codici errore BRT in messaggi leggibili in italiano. |
| `provinceToAbbreviation()` | Converte il nome completo della provincia nella sigla a 2 lettere. |
| `countryToIso2()` | Converte il nome del paese nel codice ISO a 2 lettere. |
| `getTrackingUrl()` | Costruisce l'URL di tracking BRT dal numero di spedizione. |
| `deleteShipment()` | Cancella una spedizione BRT (usato nei rimborsi). |

---

## 4. Compiti comuni e dove intervenire

| Esigenza | Dove intervenire |
|----------|-----------------|
| Cambiare i dati inviati a BRT | `createShipment()` (il payload) |
| Aggiungere un servizio BRT | `addServicesToPayload()` |
| Cambiare la normalizzazione citta' | `normalizeCityName()` |
| Aggiungere una provincia | `provinceToAbbreviation()` |
| Aggiungere un paese | `countryToIso2()` |
| Cambiare il formato tracking URL | `getTrackingUrl()` |
| Modificare la gestione errori BRT | `translateBrtError()` |
| Cambiare le credenziali BRT | Le credenziali sono lette da `Setting::get()` (tabella `settings` nel DB) |

---

## 5. Collegamenti ai tutorial e alle guide

- [Guida: Configurare BRT](../../../../docs/guide/CONFIGURARE-BRT.md) -- configurazione credenziali e servizi
- [Riferimento: Errori BRT](../../../../docs/riferimento/ERRORI-BRT.md) -- lista completa codici errore
- [Spiegazione: Normalizzazione BRT](../../../../docs/spiegazioni/PERCHE-BRT-NORMALIZZAZIONE.md) -- perche' servono queste trasformazioni
- [Glossario dominio](../../../../docs/architettura/GLOSSARIO-DOMINIO.md) -- definizioni di PUDO, Etichetta, Tracking, Contrassegno
