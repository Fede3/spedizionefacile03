# Riferimento: Errori BRT

Lista dei codici errore BRT restituiti dalle API, con significato e soluzioni.

Il file di gestione errori si trova in:
`laravel-spedizionefacile-main/app/Services/BrtService.php` (metodo `translateBrtError`)

---

## Come funzionano gli errori BRT

Le API BRT restituiscono un oggetto `executionMessage` in ogni risposta:

```json
{
  "executionMessage": {
    "code": -63,
    "codeDesc": "ROUTING_ERROR",
    "message": "Consignee city not found"
  }
}
```

- **code >= 0**: operazione riuscita
- **code < 0**: errore

---

## Errori di routing (indirizzo)

### Codice -63 (ROUTING_ERROR)

**Significato**: BRT non riesce a trovare la combinazione citta'/CAP/provincia nel suo database di routing.

**Cause comuni**:
- CAP errato per quella citta'
- Nome citta' scritto in modo diverso da quello nel database BRT
- Provincia non corrispondente alla citta'
- Abbreviazioni non riconosciute (es. "S. Giovanni" invece di "SAN GIOVANNI")

**Soluzioni**:
1. Verifica che citta', CAP e provincia corrispondano (usa il sito di Poste Italiane come riferimento)
2. Il sistema normalizza automaticamente: converte in maiuscolo, espande abbreviazioni, cerca nella tabella `locations`
3. Se il problema persiste, controlla la tabella `locations` nel database per il CAP corretto
4. Inserisci il nome della citta' esattamente come registrato da BRT (solitamente in maiuscolo, senza abbreviazioni)

**Messaggio tradotto**: "Errore indirizzo BRT: la citta' 'NOME' non corrisponde al CAP 'XXXXX' (provincia: YY)"

---

## Errori di autenticazione

### Codice -1 (con messaggio "auth" / "password" / "user")

**Significato**: le credenziali BRT non sono valide.

**Cause**:
- `BRT_CLIENT_ID` errato nel `.env`
- `BRT_PASSWORD` errata nel `.env`
- Account BRT disattivato o scaduto

**Soluzioni**:
1. Verifica `BRT_CLIENT_ID` e `BRT_PASSWORD` nel file `.env`
2. Contatta BRT per verificare che le credenziali siano attive
3. Usa l'endpoint di test admin per verificare la connessione

**Messaggio tradotto**: "Errore autenticazione BRT: credenziali non valide"

---

## Errori di dati mancanti

### Prima della chiamata API

Il sistema controlla i dati obbligatori prima di inviare la richiesta a BRT:

- Nome destinatario
- Indirizzo destinatario
- CAP destinatario
- Citta' destinatario
- Provincia destinatario

**Messaggio**: "Dati mancanti per BRT: nome destinatario, citta' destinatario."

**Soluzione**: verificare che tutti i campi dell'indirizzo di destinazione siano compilati.

---

## Errori di connessione

### Exception: timeout / connection refused

**Significato**: il server non riesce a raggiungere le API BRT.

**Cause**:
- Problema di rete
- Le API BRT sono temporaneamente non disponibili
- Firewall che blocca le connessioni in uscita verso `api.brt.it`
- Certificato SSL non valido (in sviluppo)

**Soluzioni**:
1. Verifica la connessione internet del server
2. Prova a raggiungere `api.brt.it` con curl: `curl -v https://api.brt.it`
3. In sviluppo, prova `BRT_VERIFY_SSL=false` nel `.env`
4. Il sistema ritenta automaticamente fino a 3 volte con pause progressive

**Messaggio**: "Errore di connessione BRT: [dettaglio]"

---

## Errori generici

### Codice negativo senza match specifico

**Messaggio**: "Errore BRT (code: X, DESCRIZIONE): messaggio originale"

In questi casi, il messaggio originale di BRT viene mostrato insieme al codice.
Consultare la documentazione BRT del proprio contratto per il significato specifico.

---

## Dove vedere gli errori

### Nel database

Il campo `brt_error` nella tabella `orders` contiene l'ultimo errore per quell'ordine:

```sql
SELECT id, status, brt_error FROM orders WHERE brt_error IS NOT NULL;
```

### Nei log

```bash
# Tutti i log BRT
grep "BRT" laravel-spedizionefacile-main/storage/logs/laravel.log

# Solo gli errori
grep "BRT.*error\|BRT.*failed\|BRT.*exception" laravel-spedizionefacile-main/storage/logs/laravel.log

# Per un ordine specifico
grep "order #42" laravel-spedizionefacile-main/storage/logs/laravel.log
```

---

## Normalizzazione automatica degli indirizzi

Per ridurre gli errori di routing, `BrtService` normalizza automaticamente gli indirizzi:

### 1. CAP

- Rimuove caratteri non numerici
- Aggiunge zeri iniziali fino a 5 cifre (es. `1234` → `01234`)

### 2. Provincia

- Se e' gia' una sigla di 2 lettere, la converte in maiuscolo
- Se e' un nome completo, lo converte nella sigla (es. `Milano` → `MI`)
- Mappa completa di tutte le 107 province italiane

### 3. Citta'

- Converte in MAIUSCOLO
- Espande abbreviazioni: `S.` → `SAN`, `STA.` → `SANTA`, `SS.` → `SANTISSIMO`, ecc.
- Rimuove spazi multipli
- Cerca corrispondenza nella tabella `locations` per il CAP dato

### 4. Ricerca nella tabella locations

Se il CAP e' presente nel database:
1. Cerca corrispondenza esatta (citta' + CAP)
2. Se un solo risultato per quel CAP, usa quello
3. Cerca corrispondenza parziale (una contiene l'altra)
4. Cerca per provincia

Vedi anche: [Perche' la normalizzazione BRT](../spiegazioni/PERCHE-BRT-NORMALIZZAZIONE.md)
