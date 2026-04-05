# UX Admin Principi — 2026-04-03

## Obiettivo

Riallineare account e amministrazione di SpedizioneFacile a un criterio stabile:

- meno rumore
- più gerarchia
- colori semantici sobri
- separazione netta tra area personale e workspace operativo admin

## Benchmark filtrato

Riferimenti usati come filtro, non come materiale da copiare:

- Sendcloud Orders overview
- Figma Resource Library: information architecture
- Baymard: evitare metafore e layer visivi che occupano spazio e tolgono chiarezza

## Principi operativi

1. Un workspace, una responsabilita'

- L'area account personale non deve sembrare un cambio di ruolo.
- `Partner Pro` e `Amministrazione` sono aree funzione, non interruttori identitari.

2. La root admin deve aprire sul lavoro, non sul racconto

- Primo livello: code operative e stato del flusso ordini.
- Secondo livello: KPI e ingressi rapidi.
- Terzo livello: dettaglio e viste specialistiche.

3. Una sola descrizione corta quando chiarisce una funzione ambigua

- Se il titolo basta, non aggiungere testo.
- Se una card puo' essere equivocata, usare una sola microdescrizione orientativa.

4. Colore semantico, non decorativo

- Ordini: blu
- Tracking/spedizioni: teal
- Pagamenti/prelievi: verde o ambra
- Messaggi/referral: viola
- Profilo/impostazioni: neutro/slate

I colori devono aiutare la scansione, non creare competizione.

5. Gerarchia leggibile a colpo d'occhio

- Titoli brevi
- Numeri grandi
- Icona chiara
- Un solo punto focale per sezione

6. Frizione minima

- Le code urgenti devono essere cliccabili subito.
- Gli ingressi rapidi devono portare alle viste davvero usate.
- La root non deve contenere tutto: deve orientare.

## Regole di esclusione

Non introdurre:

- tab che simulano switch di ruolo
- blocchi tutti uguali senza semantica
- testi di supporto lunghi e ripetitivi
- pattern importati da Figma se peggiorano chiarezza, fiducia o prevedibilita'

## Traduzione attesa nel repo

- `pages/account/index.vue`: area personale con sezioni pulite e una sola card admin
- `pages/account/account-pro.vue`: pagina funzione dedicata
- `pages/account/amministrazione/index.vue`: console corta, con code, grafico e ingressi rapidi semantici
- `utils/accountNavigation.js`: toni visivi coerenti per dominio
