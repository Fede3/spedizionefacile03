# Perche' la normalizzazione degli indirizzi per BRT

Spiega perche' gli indirizzi vengono normalizzati prima di essere inviati alle API BRT.

---

## Il problema

Le API BRT richiedono indirizzi in un formato molto specifico per il **routing** (instradamento dei pacchi).
Se i dati non corrispondono esattamente al database di routing BRT, la spedizione viene rifiutata con un errore -63.

Esempio di errore:

```
Errore indirizzo BRT: la citta' 'S. Giovanni Lupatoto' non corrisponde al CAP '37057' (provincia: VR)
```

Il problema e' che BRT si aspetta `SAN GIOVANNI LUPATOTO` (senza abbreviazione, tutto maiuscolo).

---

## Cosa fa la normalizzazione

Il metodo `normalizeAddressForBrt()` in `BrtService.php` esegue 4 passaggi:

### 1. Normalizzazione CAP

```
"1234"    →  "01234"     (aggiunge zeri iniziali)
"20121a"  →  "20121"     (rimuove caratteri non numerici)
```

BRT richiede il CAP come stringa di esattamente 5 cifre.

### 2. Normalizzazione provincia

```
"Milano"  →  "MI"        (nome completo → sigla)
"mi"      →  "MI"        (minuscolo → maiuscolo)
"VR"      →  "VR"        (gia' sigla, solo maiuscolo)
```

Il sistema ha una mappa completa di tutte le 107 province italiane.

### 3. Normalizzazione citta'

```
"milano"              →  "MILANO"              (maiuscolo)
"S. Giovanni"         →  "SAN GIOVANNI"        (abbreviazione espansa)
"S.S. Sacramento"     →  "SANTISSIMO SACRAMENTO" (abbreviazione espansa)
"Sta. Maria"          →  "SANTA MARIA"          (abbreviazione espansa)
"F.lli Bandiera"      →  "FRATELLI BANDIERA"    (abbreviazione espansa)
```

Abbreviazioni gestite:
- `S.` → `SAN`
- `STA.` → `SANTA`
- `STO.` → `SANTO`
- `SS.` / `S.S.` → `SANTISSIMO`
- `F.LLI` → `FRATELLI`
- `V.LE` → `VIALE`
- `P.ZZA` → `PIAZZA`
- `C.SO` → `CORSO`
- `MTE.` → `MONTE`

### 4. Ricerca nel database locations

Se il CAP e' presente nella tabella `locations`, il sistema cerca la citta' corrispondente:

```
CAP "37057" nel database → "San Giovanni Lupatoto" → "SAN GIOVANNI LUPATOTO"
```

Strategia di ricerca:
1. Corrispondenza esatta (citta' + CAP)
2. Se un solo risultato per quel CAP, usa quello
3. Corrispondenza parziale (una contiene l'altra)
4. Corrispondenza per provincia

---

## Perche' non basta l'input dell'utente

Gli utenti scrivono gli indirizzi in molti modi diversi:

| L'utente scrive | BRT si aspetta |
|---|---|
| `s. giovanni lupatoto` | `SAN GIOVANNI LUPATOTO` |
| `Reggio Emilia` | `REGGIO NELL'EMILIA` |
| `1234` (CAP) | `01234` |
| `Milano` (provincia) | `MI` |
| `Sta. Margherita` | `SANTA MARGHERITA` |

Senza normalizzazione, la maggior parte degli indirizzi fallirebbe.

---

## Perche' la tabella locations

Alcuni nomi di citta' sono ambigui o hanno varianti:

- "Reggio Emilia" vs "Reggio nell'Emilia"
- Un CAP puo' corrispondere a piu' frazioni/localita'
- Il nome "ufficiale" usato da BRT potrebbe essere diverso da quello comune

La tabella `locations` contiene i dati del database postale italiano.
Cercando per CAP, il sistema trova il nome citta' corretto per BRT.

---

## Gestione degli errori

Se la normalizzazione non riesce a risolvere l'indirizzo:

1. Il sistema usa comunque i dati normalizzati (maiuscolo, abbreviazioni espanse)
2. Se BRT rifiuta l'indirizzo, l'errore viene salvato nel campo `brt_error` dell'ordine
3. L'admin puo' correggere l'indirizzo e rigenerare l'etichetta
4. Nei log appare un warning con i dettagli per il debug

---

## Esempio completo

Input dall'utente:

```
Citta': s. giovanni lupatoto
CAP: 37057
Provincia: Verona
```

Dopo la normalizzazione:

```
Citta': SAN GIOVANNI LUPATOTO     (abbreviazione espansa + maiuscolo)
CAP: 37057                         (gia' corretto)
Provincia: VR                      (nome → sigla)
```

Payload inviato a BRT:

```json
{
  "consigneeCity": "SAN GIOVANNI LUPATOTO",
  "consigneeZIPCode": "37057",
  "consigneeProvinceAbbreviation": "VR"
}
```
