# Studio Profondo UX/UI Totale — SpedizioneFacile

Data: 2026-04-01

## Scopo

Definire una grammatica UX/UI unica per tutto il sito, usando:

- preview attuale: `https://spy-milan-insight-gate.trycloudflare.com`
- prototipo direzionale: `https://sort-zaffre-77538165.figma.site/`
- screenshot locali di controllo:
  - `proto-new-desktop.png`
  - `preventivo-desktop-current.png`
  - `preventivo-mobile-current.png`
  - `auth-page-current.png`
  - `auth-mobile-current.png`
  - `step2-current-fast.png`
  - `services-current.png`
- piani e memoria:
  - `.claude/projects/.../memory/MEMORY.md`
  - `.claude/plans/peppy-nibbling-canyon.md`
  - `.claude/plans/lovely-nibbling-harp.md`
  - `.claude/plans/humble-tumbling-pumpkin.md`
- riferimenti esterni:
  - Baymard, button hierarchy and no-apply-in-checkout
  - GOV.UK Design System, component consistency, button hierarchy, colour usage
  - NN/gestalt principles, visual hierarchy and proximity

## Direzione Visiva Corretta

Il sito non deve sembrare una somma di pagine diverse. Deve sembrare un unico prodotto con 3 qualità insieme:

1. brand riconoscibile
2. flusso prevedibile
3. interfaccia moderna ma sobria

Il prototipo aggiornato suggerisce bene:

- una shell alta e pulita
- un uso disciplinato dell'arancione
- superfici chiare con accenti teal
- card e sezioni con ritmo forte ma non urlato
- atmosfere coerenti tra pubblico, funnel, autenticazione e account

Il codice attuale ha già primitive buone in [main.css](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/assets/css/main.css), ma non sono ancora propagate in modo rigoroso.

## Regole Non Negoziabili

### 1. Una sola shell brand per tutto il prodotto

Pubblico, auth, account, account pro e admin devono sembrare declinazioni dello stesso sistema.

Questo implica:

- stessa fascia top/navbar
- stessi bordi, superfici e livelli di ombra
- stessa metrica verticale
- stessi colori di supporto
- stesso rapporto tra hero, contenuto e footer

Account e admin non devono diventare pagine bianche anonime o pannelli scollegati.

### 2. Colori con gerarchia semantica stabile

- `arancione`: solo primary action, step attivo, focus commerciale, punti conversione
- `teal`: supporto secondario, identità, stato selezionato secondario, link funzionali
- `neutri`: testo, superfici, bordi, campi

Conseguenze:

- mai più 2 o 3 CTA arancioni equivalenti sulla stessa superficie
- il teal non deve competere con l'arancione
- i badge e gli stati non devono inventarsi colori nuovi
- una stessa funzione non può cambiare colore tra pagina e pagina

### 3. Una sola primary action per superficie

Principio coerente con Baymard e GOV.UK:

- una schermata/box/step deve avere un solo invito principale
- le altre azioni devono retrocedere a secondarie o neutre

Quindi:

- nel funnel la primary è quasi sempre `Continua`
- nelle card configurabili la primary locale è `Configura` o `Salva e attiva`
- in account la pagina non deve far sembrare `Nuova spedizione` più importante dell'identità della dashboard

### 4. Stessa funzione = stesso componente

Devono esistere davvero solo poche famiglie:

- `section-block`
- `section-header`
- `choice-tile`
- `service-card`
- `action-pill`
- `modal-shell`
- `icon-shell`
- `input/select/textarea`
- `status-pill`

Se due elementi fanno la stessa cosa ma hanno layout diverso, è un bug di sistema.

### 5. Prossimità e ritmo verticale stabili

Il sito deve usare una metrica verticale prevedibile:

- spazio tra shell e primo blocco
- spazio tra blocchi principali
- spazio tra titolo sezione e corpo
- spazio tra campo e messaggio di supporto

Sezioni come `Servizi` e `Indirizzi` non devono apparire “buttate in mezzo al nulla”.

### 6. Semantica corretta dei controlli

- switch: solo stati binari immediati
- accordion: per opzioni che richiedono campi
- modal: solo per task separati, non per configurazioni inline del funnel
- pill/button: azione esplicita
- tile: scelta singola o multi-selezione chiara

## Incoerenze Sistemiche Più Importanti

### 1. Shell non unificata tra pubblico, auth, account e admin

File coinvolti:

- [layouts/default.vue](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/layouts/default.vue)
- [components/Header.vue](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/Header.vue)
- [components/Navbar.vue](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/Navbar.vue)
- [components/Footer.vue](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/Footer.vue)

Problema:

- pubblico ha una shell più caratterizzata
- auth usa una shell ridotta ma ancora coerente
- account/admin passano a una grammatica più piatta, più bianca e più “dashboard generica”

Effetto:

- l'utente percepisce una rottura di prodotto entrando nell'account

### 2. Navbar troppo “pill-first” e troppo tonda rispetto al resto del sistema

File:

- [assets/css/navbar.css](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/assets/css/navbar.css)

Problema:

- quasi tutto è `999px`
- la navbar sembra un sistema separato dal resto delle card e dei blocchi

Direzione corretta:

- nav shell morbida, sì
- ma i componenti interni devono dialogare con il radius globale del sito, non vivere in un mondo a parte

### 3. Auth segmented controls ancora troppo “capsula”, non abbastanza coerenti con il resto

File:

- [assets/css/autenticazione.css](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/assets/css/autenticazione.css)
- [assets/css/auth-overlay.css](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/assets/css/auth-overlay.css)

Problema:

- il segment `Accedi / Registrati` e `Privato / Azienda` è visivamente più vicino a una pill mobile che a un blocco controllato
- shell e segmento interno devono combaciare meglio

Direzione corretta:

- segmented rettangolare morbido
- stesso radius della famiglia `control`
- stessa altezza e stesso padding in pagina e overlay

### 4. Preventivo: composizione buona, ma asse verticale non rigorosa

File:

- [components/Preventivo.vue](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/Preventivo.vue)
- [assets/css/preventivo.css](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/assets/css/preventivo.css)

Problema:

- la freccia centrale tra partenza e destinazione è ancora trattata come elemento del blocco, non dell'asse degli input
- questo rompe la lettura di allineamento

Direzione corretta:

- la freccia deve allinearsi al centro ottico dei campi input
- non al top dell'intera card

### 5. Step 2 è ancora il punto di maggiore incoerenza del funnel

File:

- [components/shipment/StepPickupDate.vue](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/shipment/StepPickupDate.vue)
- [components/shipment/StepServicesGrid.vue](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue)
- [components/shipment/ServiceFeaturedCard.vue](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/shipment/ServiceFeaturedCard.vue)
- [components/shipment/StepAddressSection.vue](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue)
- [assets/css/shipment-step.css](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/assets/css/shipment-step.css)

Problemi:

- calendario, servizi e indirizzi non sembrano ancora tre blocchi fratelli dello stesso flusso
- featured card e regular card non usano una grammatica abbastanza vicina
- stati, badge, CTA, icone e pricing non hanno ancora una disciplina abbastanza forte

### 6. Le icone non sono ancora un sistema unico

Problema trasversale:

- alcune icone sono inline svg
- altre sono immagini png mascherate
- altre usano shell diverse

Effetto:

- il sito perde carattere e precisione
- le card servizi sembrano assemblate, non progettate

Direzione corretta:

- una sola `icon-shell`
- una sola scala dimensionale
- un solo trattamento selected/unselected
- nessun filtro improvvisato che degrada leggibilità o allineamento

### 7. Account dashboard usa primitive giuste ma ancora con gerarchia troppo neutra

File:

- [components/account/AccountPageHeader.vue](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/account/AccountPageHeader.vue)
- [pages/account/index.vue](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/index.vue)
- [utils/accountNavigation.js](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/utils/accountNavigation.js)

Problema:

- la dashboard è più ordinata di prima, ma ancora troppo “schede bianche amministrative”
- manca una continuità forte con il tono pubblico del brand

Direzione corretta:

- stessa shell
- stesso contrasto
- stessa logica headline/eyebrow/azioni
- cards più essenziali, ma meno da backoffice generico

### 8. Guide e Servizi pubblici non hanno ancora una grammatica editoriale separata ma coerente

Problema:

- in più punti l'arancione è troppo forte per pagine informative
- layout e CTA sembrano ancora orientati a performance marketing anche quando la pagina dovrebbe educare

Direzione corretta:

- pagine editoriali con tono più calmo
- una CTA primaria chiara, non aggressiva
- peso maggiore a titolo, intro, ritmo contenuti

### 9. Motion non ancora sistemico

Problema:

- in `main.css` esistono variabili motion buone
- ma non c'è ancora una propagazione costante tra card hover, reveal, scroll sections, nav, CTA e modali

Direzione corretta:

- 3 livelli fissi:
  - hover breve
  - enter medio
  - reveal scroll leggero

### 10. Troppe classi locali quando esistono già primitive globali

Problema:

- il progetto ha già `sf-section-block`, `sf-card`, `sf-choice-tile`, `sf-action-pill`, `sf-input`
- ma molte aree continuano a usare varianti locali parallele

Effetto:

- incoerenza visiva
- maggiore debito tecnico
- più difficile standardizzare

## Primitive da Standardizzare Davvero

### Section primitives

- `sf-section-block`
- `sf-section-block__header`
- `sf-section-block__body`
- `sf-section-kicker`
- `sf-section-title`
- `sf-section-description`

Uso:

- pubblico
- funnel
- riepilogo/checkout
- account/admin

### Choice primitives

- `sf-choice-tile`
- `sf-choice-tile--selected`

Uso:

- step pills
- date tiles
- selezioni semplici

### Card primitives

- `sf-card`
- `sf-card--selectable`
- `sf-card--selected`
- `sf-card--expanded`

Uso:

- servizi
- cards account
- cards admin
- cards informative cliccabili

### Action primitives

- `sf-action-pill--accent`
- `sf-action-pill--soft`
- `sf-action-pill--neutral`

Mappatura:

- accent: continua, paga, avvia task primario
- soft: modifica/configura/azioni secondarie utili
- neutral: annulla/indietro/apri/chiudi

### Form primitives

- `sf-input`
- `sf-input--sm`
- `sf-input--error`

Uso:

- preventivo
- auth
- indirizzi
- admin forms

### Modal primitives

- `sf-modal-surface`
- `sf-modal-close`
- header/body/actions uniformi

## Matrice Pagina per Pagina

### Homepage

Stato:

- buona base brand
- hero ancora non del tutto allineato al ritmo del prototipo

Da fissare:

- shell hero
- spaziatura verso primo blocco
- motion e reveal coerenti

### Preventivo

Stato:

- impianto buono
- forte vicinanza alla direzione giusta

Da fissare:

- freccia centrale
- maggiore rigore di allineamento
- stessa grammatica form dei blocchi funnel successivi

### Step 2

Stato:

- area più fragile del sistema

Da fissare:

- calendario
- featured card
- card regolari
- relazione servizi/indirizzi
- pricing e CTA locali
- icone
- semantica controlli

### Riepilogo

Stato:

- discreto

Da fissare:

- più integrazione con le primitive del funnel
- barra totale e azioni finali più coerenti

### Checkout

Stato:

- medio

Da fissare:

- stessa grammatica di riepilogo e auth
- meno frammentazione tra summary, billing e pagamento

### Autenticazione

Stato:

- molto migliorata

Da fissare:

- segmented shell
- overlay/page parity
- relazione con shell brand principale

### Account

Stato:

- strutturalmente migliorato

Da fissare:

- mantenere il brand del sito
- evitare la sensazione di dashboard sbiancata e anonima

### Account Pro

Stato:

- buone basi

Da fissare:

- stessa grammatica account
- meno elementi speciali fuori sistema

### Admin

Stato:

- più ordinato di prima

Da fissare:

- stesso brand shell
- meno feeling da pannello separato
- più coerenza con account e pubblico

### Guide / Servizi / Blog

Stato:

- ancora troppo oscillanti tra promo e editoriale

Da fissare:

- tono editoriale stabile
- arancione ridotto
- composizione più calma e leggibile

## Regole Specifiche per il Funnel

### Calendario

- rettangolare morbido, non tondo
- stesso radius dei control large
- non selezionato: pienamente leggibile
- selezionato: bordo/riempimento/testo coerenti con il sistema `selected`
- frecce integrate al frame, non galleggianti o mal centrate

### Card servizi

- stessa struttura per tutte
- featured solo leggermente più forte, non diverso come specie
- prezzo sempre in alto a destra
- titolo sempre in alto a sinistra
- descrizione una sola riga breve
- badge sempre stesso pattern
- CTA coerente con il tipo di servizio

### Servizi configurabili

- nessuno switch per aprire
- `Configura` apre
- `Salva e attiva` salva
- `Modifica` riapre
- `Rimuovi` disattiva
- una sola card aperta alla volta

### Servizi binari

- CTA diretta `Attiva` / `Rimuovi`
- stato chiaro vicino alla CTA

## Ordine di Implementazione Raccomandato

### Tranche 1: shell e auth

File:

- [components/Header.vue](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/Header.vue)
- [components/Navbar.vue](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/Navbar.vue)
- [assets/css/navbar.css](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/assets/css/navbar.css)
- [assets/css/autenticazione.css](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/assets/css/autenticazione.css)
- [assets/css/auth-overlay.css](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/assets/css/auth-overlay.css)

Obiettivo:

- shell unica
- segmented auth coerenti
- login/overlay con stessa famiglia di controllo

### Tranche 2: preventivo

File:

- [components/Preventivo.vue](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/Preventivo.vue)
- [assets/css/preventivo.css](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/assets/css/preventivo.css)

Obiettivo:

- allineamento perfetto
- asse input rigoroso
- forma più matura

### Tranche 3: step 2

File:

- [components/shipment/StepPickupDate.vue](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/shipment/StepPickupDate.vue)
- [components/shipment/StepServicesGrid.vue](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue)
- [components/shipment/ServiceFeaturedCard.vue](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/shipment/ServiceFeaturedCard.vue)
- [components/shipment/StepAddressSection.vue](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue)
- [assets/css/shipment-step.css](/mnt/c/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/assets/css/shipment-step.css)

Obiettivo:

- ricostruire il cuore del funnel con grammatica unica

### Tranche 4: riepilogo + checkout

Obiettivo:

- proseguire il funnel senza cambio di linguaggio visivo

### Tranche 5: account + pro + admin

Obiettivo:

- portare tutto dentro la stessa shell brand e lo stesso sistema di card/azioni

## Checklist Finale di Coerenza

Prima di considerare il lavoro chiuso:

- ogni pagina usa la stessa shell
- ogni sezione usa la stessa metrica verticale
- ogni azione primaria è chiaramente una sola
- ogni secondaria è più debole della primary
- ogni card usa la stessa famiglia di superficie
- ogni selezione usa la stessa grammatica
- auth, account e admin non rompono il brand
- guide/servizi/blog hanno tono editoriale coerente
- motion coerente e leggera
- contrasti e stati sono leggibili su mobile e desktop

## Sintesi

La base tecnica per un design system c'è già. Il problema non è la mancanza totale di componenti, ma il fatto che il sistema non è ancora stato imposto come legge unica in tutto il sito.

Il lavoro corretto non è inventare altri componenti. È:

1. scegliere poche primitive giuste
2. farle diventare obbligatorie
3. sostituire il locale con il condiviso
4. riallineare ogni pagina al brand shell unico

Questa è la direzione che porta SpedizioneFacile a sembrare un prodotto solido, moderno e riconoscibile, invece di una somma di tranche migliorate in tempi diversi.
