# Vendor Documentation

Questa cartella raccoglie documentazione **esterna** copiata da fornitori o
integrazioni di terze parti. Serve come riferimento offline mentre si lavora
su integrazioni tecniche — non e' materiale prodotto internamente e non va
modificato.

## Indice

### BRT PUDO REST API (`brt-pudo/`)
Snapshot HTML della documentazione ufficiale BRT per l'API PUDO (Pick-Up /
Drop-Off Points). Usata dal backend Laravel per listare i punti ritiro/consegna
quando l'utente sceglie un servizio PUDO.

- `overview.html` — introduzione ed endpoint base
- `paths.html` — elenco completo dei path API
- `definitions.html` — schemi JSON di request/response
- `security.html` — autenticazione e header richiesti

Codice che consuma questa API:
- `laravel-spedizionefacile-main/app/Services/Brt/*` (client REST)
- `laravel-spedizionefacile-main/app/Http/Controllers/Pudo/*` (endpoint esposti al frontend)

## Policy

- **Non modificare** i file in queste cartelle: sono snapshot del fornitore.
- Quando il fornitore aggiorna la propria doc, sostituire i file interi
  (niente patch puntuali).
- Se la doc cambia in modo rilevante, aggiornare il codice che la consuma
  e registrare la modifica in `docs/CHANGELOG.md`.
