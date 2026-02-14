# Come configurare BRT (corriere Bartolini)

Questa guida spiega come configurare le credenziali e i servizi BRT per la generazione automatica delle etichette.

---

## Prerequisiti

Per usare le API BRT devi avere:

- Un **contratto attivo** con BRT
- Le **credenziali API** (client ID e password) fornite da BRT
- Il **codice filiale di partenza** (departure depot) assegnato da BRT
- (Opzionale) Un **token PUDO** per i punti di ritiro/consegna

---

## Configurazione nel file .env

Apri `laravel-spedizionefacile-main/.env` e aggiungi:

```env
# Credenziali BRT
BRT_CLIENT_ID=123456789          # ID cliente fornito da BRT
BRT_PASSWORD=la_tua_password     # Password API fornita da BRT

# URL delle API (valori predefiniti, non cambiare se non necessario)
BRT_API_URL=https://api.brt.it/rest/v1/shipments
BRT_PUDO_API_URL=https://api.brt.it

# Filiale BRT di partenza
BRT_DEPARTURE_DEPOT=53           # Codice filiale (es. 53 = Milano, chiedere a BRT)

# Token per i punti PUDO (opzionale)
BRT_PUDO_TOKEN=il_tuo_token_pudo

# Verifica SSL (true in produzione, false solo in sviluppo se serve)
BRT_VERIFY_SSL=true
```

---

## Dove vengono lette le credenziali

Le variabili `.env` vengono lette da `laravel-spedizionefacile-main/config/services.php`:

```php
'brt' => [
    'client_id' => env('BRT_CLIENT_ID'),
    'password' => env('BRT_PASSWORD'),
    'api_url' => env('BRT_API_URL', 'https://api.brt.it/rest/v1/shipments'),
    'pudo_api_url' => env('BRT_PUDO_API_URL', 'https://api.brt.it'),
    'pudo_token' => env('BRT_PUDO_TOKEN'),
    'departure_depot' => env('BRT_DEPARTURE_DEPOT', 0),
    'verify_ssl' => env('BRT_VERIFY_SSL', true),
],
```

E poi usate in `laravel-spedizionefacile-main/app/Services/BrtService.php`.

---

## Codice filiale di partenza (departure depot)

Il `BRT_DEPARTURE_DEPOT` e' il codice della filiale BRT da cui partono le spedizioni.
Questo codice e' **fondamentale** perche' BRT lo usa per il routing.

Esempi di codici filiale (indicativi):
- Milano: 53
- Roma: 62
- Torino: 1
- Napoli: 72

Il codice esatto va **richiesto direttamente a BRT** perche' dipende dal contratto.

Se il valore e' `0` (default), la generazione dell'etichetta potrebbe fallire con un errore di routing.

---

## Come funziona la generazione automatica

Quando un ordine viene pagato:

1. L'evento `OrderPaid` viene lanciato
2. Il listener `GenerateBrtLabel` viene eseguito
3. Il listener chiama `BrtService::createShipment()`
4. BrtService prepara il payload con indirizzi, pesi, servizi
5. BrtService invia la richiesta alle API BRT
6. Se successo: salva etichetta (PDF base64), tracking URL, parcel ID nell'ordine
7. Invia l'etichetta via email all'utente
8. Se errore: salva il messaggio di errore nel campo `brt_error` dell'ordine

Il listener ritenta fino a 3 volte con attese progressive (1s, 2s).

---

## Test della configurazione

Puoi testare la configurazione BRT senza creare un ordine reale.

Usa l'endpoint admin (richiede login come Admin):

```
POST /api/admin/brt/test-create
```

Con body:

```json
{
  "consignee_name": "Mario Rossi",
  "consignee_address": "Via Roma 1",
  "consignee_zip": "20121",
  "consignee_city": "Milano",
  "consignee_province": "MI",
  "consignee_country": "IT",
  "consignee_phone": "3331234567",
  "consignee_email": "mario@test.com",
  "parcels": 1,
  "weight_kg": 5
}
```

La risposta ti dira' se la connessione e le credenziali funzionano.

---

## Modalita' sviluppo (senza BRT)

Se `BRT_CLIENT_ID` non e' configurato (vuoto nel `.env`), il listener `GenerateBrtLabel` salta automaticamente la generazione:

```php
if (!config('services.brt.client_id')) {
    Log::info('BRT not configured, skipping label generation');
    return;
}
```

Questo permette di sviluppare senza un contratto BRT attivo.

---

## Rigenerazione etichetta

Se la generazione automatica fallisce, un admin puo' rigenerare l'etichetta manualmente:

```
POST /api/admin/orders/{order}/regenerate-label
```

---

## Punti PUDO

I punti PUDO (Pick Up Drop Off) sono negozi convenzionati dove ritirare/consegnare pacchi.

Endpoint disponibili:

| Metodo | URL | Descrizione |
|---|---|---|
| GET | `/api/brt/pudo/search?address=...&zipCode=...&city=...` | Cerca per indirizzo |
| GET | `/api/brt/pudo/nearby?latitude=...&longitude=...` | Cerca per coordinate GPS |
| GET | `/api/brt/pudo/{pudoId}` | Dettagli punto specifico |

Per usarli serve il `BRT_PUDO_TOKEN` nel `.env`.

---

## Troubleshooting

| Problema | Soluzione |
|---|---|
| `BRT not configured` nei log | Configura `BRT_CLIENT_ID` nel `.env` |
| Errore di autenticazione | Verifica `BRT_CLIENT_ID` e `BRT_PASSWORD` |
| Errore di routing (-63) | Verifica che citta'/CAP/provincia corrispondano. Vedi [Errori BRT](../riferimento/ERRORI-BRT.md) |
| `departureDepot` errore | Configura `BRT_DEPARTURE_DEPOT` con il codice filiale corretto |
| Timeout connessione | Verifica che il server possa raggiungere `api.brt.it` (porta 443) |
| SSL error | In sviluppo puoi provare `BRT_VERIFY_SSL=false` |
