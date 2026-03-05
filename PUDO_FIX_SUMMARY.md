# FIX PUDO - Errore 401 Unauthorized

## PROBLEMA IDENTIFICATO
Le API PUDO BRT restituivano errore 401 (Unauthorized) durante il checkout perché il componente frontend usava un client HTTP autenticato per chiamare endpoint pubblici.

## CAUSA ROOT
- **Backend**: Le rotte PUDO erano già pubbliche in `routes/api.php` (righe 208-212)
- **Frontend**: Il componente `PudoSelector.vue` usava `useSanctumClient()` che richiede autenticazione
- **Conflitto**: Chiamate autenticate a endpoint pubblici causavano errore 401

## SOLUZIONE APPLICATA

### File Modificato
`nuxt-spedizionefacile-master/components/PudoSelector.vue`

### Modifiche Effettuate

1. **Rimosso client autenticato** (riga 40-41):
   ```javascript
   // PRIMA
   const sanctumClient = useSanctumClient();

   // DOPO
   const config = useRuntimeConfig();
   ```

2. **Aggiornata chiamata ricerca PUDO** (riga 85):
   ```javascript
   // PRIMA
   const result = await sanctumClient(`/api/brt/pudo/search?${params.toString()}`);

   // DOPO
   const result = await $fetch(`${config.public.apiBase}/brt/pudo/search?${params.toString()}`);
   ```

3. **Aggiornata chiamata dettagli PUDO** (riga 190):
   ```javascript
   // PRIMA
   const result = await sanctumClient(`/api/brt/pudo/${pudo.pudo_id}`);

   // DOPO
   const result = await $fetch(`${config.public.apiBase}/brt/pudo/${pudo.pudo_id}`);
   ```

## ROTTE PUBBLICHE CONFERMATE

Le seguenti rotte sono pubbliche e accessibili senza autenticazione:

```php
// routes/api.php (righe 208-212)
Route::middleware(['throttle:30,1'])->get('brt/pudo/search', [BrtController::class, 'pudoSearch']);
Route::middleware(['throttle:30,1'])->get('brt/pudo/nearby', [BrtController::class, 'pudoNearby']);
Route::middleware(['throttle:30,1'])->get('brt/pudo/{pudoId}', [BrtController::class, 'pudoDetails']);
```

**Rate Limiting**: 30 richieste/minuto per IP

## CONFIGURAZIONE BRT

File `.env` verificato:
```env
BRT_CLIENT_ID=1020108
BRT_PASSWORD=brt5348st
BRT_API_URL=https://api.brt.it/rest/v1/shipments
BRT_PUDO_API_URL=https://api.brt.it
BRT_PUDO_TOKEN=                    # VUOTO - API PUDO è "open" (non richiede token)
BRT_DEPARTURE_DEPOT=0
BRT_VERIFY_SSL=false
```

**Nota**: `BRT_PUDO_TOKEN` è vuoto perché l'API PUDO di BRT usa endpoint `/open/` che non richiedono autenticazione.

## COME TESTARE

### 1. Test Frontend (Checkout)
1. Vai su `http://localhost:3001/la-tua-spedizione/2`
2. Compila i dati di destinazione (città e CAP)
3. Clicca su "Cerca punti di ritiro"
4. **Risultato atteso**: Lista di punti PUDO senza errore 401

### 2. Test API Diretta
```bash
# Test ricerca PUDO (pubblico, senza autenticazione)
curl "http://localhost:8000/api/brt/pudo/search?city=Roma&zip_code=00100&country=ITA&max_results=5"

# Risposta attesa:
{
  "success": true,
  "pudo": [
    {
      "pudo_id": "...",
      "name": "Tabaccheria XYZ",
      "address": "Via Roma 10",
      "city": "Roma",
      "zip_code": "00100",
      ...
    }
  ]
}
```

### 3. Test Dettagli PUDO
```bash
curl "http://localhost:8000/api/brt/pudo/{pudoId}"
```

## ALTRI FILE ANALIZZATI

### Non Modificati
- `pages/account/amministrazione/test-brt.vue`: Usa `sanctum()` ma è corretto perché è una pagina admin protetta
- `routes/api.php`: Già configurato correttamente con rotte pubbliche
- `app/Services/BrtService.php`: Gestisce correttamente token opzionale (righe 543-547)

## VANTAGGI DELLA SOLUZIONE

1. **Nessuna autenticazione richiesta**: Gli utenti possono cercare PUDO anche senza login
2. **Compatibile con checkout ospite**: Funziona per utenti non registrati
3. **Rate limiting**: Protezione contro abusi (30 req/min)
4. **Zero breaking changes**: Nessuna modifica al backend necessaria

## PROSSIMI PASSI (OPZIONALI)

Se in futuro BRT richiede un token PUDO:

1. Ottenere token da BRT
2. Aggiungere in `.env`: `BRT_PUDO_TOKEN=xxx`
3. Il codice è già pronto in `BrtService.php` (righe 545-547)

## STATO FINALE

✅ **RISOLTO**: Le API PUDO ora funzionano senza errore 401
✅ **TESTATO**: Verificate entrambe le chiamate API (search + details)
✅ **DOCUMENTATO**: Soluzione completa con istruzioni di test

---

**Data Fix**: 2026-03-03
**File Modificati**: 1 (PudoSelector.vue)
**Righe Modificate**: 3 (righe 40-41, 85, 190)
