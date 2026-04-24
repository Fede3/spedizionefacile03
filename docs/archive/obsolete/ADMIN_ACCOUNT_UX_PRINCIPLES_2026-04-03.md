# Admin / Account UX Principles

## Obiettivo

Questa guida fissa il criterio da usare per le superfici `account` e `amministrazione` di SpedizioneFacile.
Serve a evitare regressioni di tipo:

- troppa densita' informativa
- ruoli comunicati male
- dashboard con troppi blocchi equivalenti
- colori decorativi senza funzione
- testo superfluo che costringe a leggere invece di capire

## Regole Base

1. Prima filtro, poi progetto, poi implementazione.
2. Se un pattern e' ambiguo per ruolo o permessi, va scartato.
3. Se una card non porta a un'azione o a uno stato chiaro, va rimossa o ridotta.
4. Ogni schermata deve essere leggibile in pochi secondi, senza spiegazioni lunghe.
5. L'account personale e il workspace admin non devono sembrare la stessa cosa.

## Gerarchia

- Un solo punto focale per schermata.
- Pochi blocchi forti invece di molte card tutte uguali.
- Le informazioni operative devono venire prima di quelle descrittive.
- Le code urgenti devono stare sopra ai contenuti secondari.
- Il testo descrittivo va usato solo se evita un errore o chiarisce un dubbio reale.

## Ruoli

- Nessun tab o controllo deve sembrare un "cambio ruolo".
- `Partner Pro` e' un'area funzione, non uno switch di identita'.
- `Amministrazione` e' un workspace separato dall'area personale.
- Se un utente e' admin, dall'account deve vedere un solo ingresso chiaro verso la console admin.

## Colore

- Il colore deve essere semantico, non decorativo.
- Usare pochi toni stabili:
  - neutro per contenuto standard
  - teal/brand per azione primaria e stato operativo normale
  - amber per attenzione
  - red per rischio o errore
  - green solo per esito positivo o dato economico confermato
- Evitare griglie con molti colori saturi affiancati.
- Le card della stessa famiglia devono avere trattamento coerente.

## Copy

- Titoli corti.
- Etichette chiare.
- Testo minimo, non testo zero.
- Una breve descrizione e' utile se orienta subito senza appesantire.
- Niente micro-spiegazioni se l'UI puo' gia' far capire lo stato.
- Se una riga non aiuta a decidere o agire, va tagliata.

## Dashboard Admin

La root admin deve mostrare soprattutto:

1. KPI essenziali.
2. Code operative ad alta priorita'.
3. Un punto focale visivo, di norma andamento ordini o workload.
4. Accessi rapidi ai moduli core:
   - ordini
   - tracking spedizioni
   - prelievi
   - messaggi
   - utenti

Non deve diventare:

- una sitemap completa del backoffice
- una pagina di marketing interna
- un collage di componenti tutti allo stesso peso

## Account Personale

La root account deve mostrare:

- aree personali reali
- un ingresso chiaro a `Partner Pro`
- un solo ingresso a `Console admin` per utenti admin

Non deve mostrare:

- piu' modi diversi di arrivare allo stesso posto
- gerarchie admin replicate integralmente nell'account base
- tabs che facciano pensare a cambio identita'

## Verifica Prima del Merge

Ogni tranche su account/admin deve passare almeno questi check:

1. Comprensione in pochi secondi: si capisce cosa fare senza leggere tutto?
2. Gerarchia: c'e' un punto focale evidente?
3. Permessi: la UI comunica ruoli e accessi corretti?
4. Colore: i toni aiutano a leggere stati e priorita'?
5. Rumore: si puo' togliere ancora testo o elementi?
6. Coerenza: la schermata sembra appartenere allo stesso prodotto?
