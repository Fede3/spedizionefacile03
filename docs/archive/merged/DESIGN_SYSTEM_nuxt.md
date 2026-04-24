# SpediamoFacile - Design System Shared

Questo file fissa la grammatica visiva shared da riusare in tutto il sito.

Fonte di verita tecnica:
- `assets/css/main.css`

Regola generale:
- niente blu fuori palette
- usare solo teal `#095866`, arancione `#E44203` e neutri
- evitare varianti locali se esiste gia una classe shared
- prima si riusa la grammatica shared, poi si adatta il layout al contesto

## Standard rapido

- selection cards e surfaces:
  - normale = bianco + bordo leggero + shadow soft
  - selected = teal chiarissimo + bordo teal + shadow selected
- segmented controls:
  - compatti, `fit-content` di default, item attivo teal con testo/icona bianchi
- breadcrumbs:
  - sempre prima del titolo, allineati all'hero, mai dispersi dentro il primo box contenuto
- CTA:
  - teal per azioni operative
  - arancione solo per conversione/pubblico/checkout finale

---

## 1. Superfici e box

### Superficie standard
Usare per card, pannelli, blocchi filtro, riepiloghi, moduli e sezioni interne.

Classi/tokens:
- `.sf-surface`
- `.sf-card`
- `.sf-surface-card`
- `.sf-step-surface`
- `--sf-surface-bg`
- `--sf-surface-shadow`
- `--sf-surface-border`

Contratto:
- fondo bianco
- bordo molto leggero
- ombra soffice ma visibile
- raggio `16px`
- contrasto sufficiente rispetto allo sfondo pagina

### Superficie selected
Usare per card selezionate, blocchi attivi, metodi scelti e stati selected persistenti.

Classi/tokens:
- `.sf-surface--selected`
- `.sf-step-surface--selected`
- `.sf-card--selected`
- `.sf-choice-tile--selected`
- `.sf-selection-card--selected`
- `--sf-surface-bg-selected`
- `--sf-selection-card-bg-selected`
- `--sf-surface-border-selected`
- `--sf-surface-shadow-selected`

Contratto:
- fondo teal molto chiaro, mai teal pieno
- bordo teal forte
- ombra leggermente piu presente della superficie normale
- il selected si distingue dal semplice hover
- il bordo selected usa sempre il token shared `--sf-surface-border-selected`
- i contenitori selected e le card-opzione selected hanno token dedicati ma stessa famiglia visiva

### Hover di superfici
Usare solo una variazione sottile:
- bordo appena piu presente
- lift di `-1px` o `-2px`
- ombra un po' piu alta

Mai usare hover che sembra selected.

---

## 2. Card selection state

Per tutte le card selezionabili la grammatica deve essere unica.

Classi di riferimento:
- `.sf-card--selectable`
- `.sf-card--selected`
- `.sf-choice-tile`
- `.sf-choice-tile--selected`
- `.sf-selection-card`
- `.sf-selection-card--selected`

Regola:
- stato normale: bianco
- hover: bordo piu visibile + lieve sollevamento
- selected: fondo chiaro teal + bordo teal + shadow selected
- per le card-opzione usare il token `--sf-selection-card-bg-selected`, non hardcoded locali

Non mescolare:
- card bianche selected in una sezione
- card verde pieno selected in un'altra
- card grigie inerti in un'altra ancora

Se il pattern e una card-opzione, deve parlare la stessa lingua di:
- metodi di pagamento
- servizi del funnel
- card selezionabili account/admin

Alias semantici consigliati:
- `.sf-step-choice`
- `.sf-step-choice--selected`

Uso consigliato:
- `pagamento`: scelta metodo
- `servizi`: scelta card servizio
- `indirizzi`: blocchi riassuntivi selezionabili o varianti future

---

## 3. Switch e segmented control

### Standard da usare
Il segmented control compatto e la grammatica di riferimento.

Classi shared:
- `.sf-segmented-control`
- `.sf-segmented-control--stretch`
- `.sf-segmented-control--step`
- `.sf-segmented-control__item`
- `.sf-toggle`

Contratto per segmented control:
- wrapper compatto, `fit-content` di default
- track neutro chiaro
- item attivo teal pieno con testo/icona bianchi
- item inattivi trasparenti sul track
- pill shape coerente
- non deve occupare tutta la larghezza se non strettamente necessario
- focus visibile ma sottile, senza cambiare il linguaggio del selected

Quando usare `.sf-segmented-control`:
- switch `A domicilio / Punto BRT`
- switch `Privato / Azienda`
- switch documento fiscale
- switch per varianti di un blocco

Quando usare `.sf-segmented-control--step`:
- colli
- step del funnel
- indirizzi
- documento fiscale
- varianti compatte che devono restare leggibili e non full-width

Quando usare `.sf-toggle`:
- vero toggle on/off binario
- abilitazione immediata di feature o preferenze

Da evitare:
- uno switch selected bianco
- uno switch selected teal
- uno selected enorme full-width
- uno compatto corto
- tutti insieme nello stesso flusso

Se il comportamento e lo stesso, deve essere lo stesso componente visivo.

---

## 4. Bottoni: teal vs arancione

### Primario teal
Classe:
- `.btn-primary`

Ruolo:
- azione principale operativa
- conferme dentro flussi autenticati
- save/applica/continua/aggiorna/conferma nei contesti prodotto, account, admin

### Secondario
Classe:
- `.btn-secondary`

Ruolo:
- azione alternativa
- annulla
- torna indietro
- filtri secondari
- CTA di supporto

### CTA arancione
Classe:
- `.btn-cta`

Ruolo:
- azione commerciale/pubblica
- spinta conversione
- checkout finale o call-to-action marketing

### Terziario
Classe:
- `.btn-tertiary`

Ruolo:
- utility, micro-azioni o azioni meno forti

### Regola ferrea
- teal = operativita prodotto/account/admin
- arancione = conversione/pubblico/paywall/checkout finale
- non usare entrambi come primari nello stesso contesto senza una gerarchia chiarissima

---

## 5. Input e focus state

Classi/tokens:
- `.form-input`
- `.form-input.is-error`
- `--sf-field-border`
- `--sf-field-focus-ring`
- `--sf-field-error-ring`

Contratto:
- fondo bianco
- bordo neutro
- altezza minima `48px`
- raggio `12px`
- focus teal ring coerente
- errore rosso chiaro e separato dal focus normale

Regole:
- il focus degli input deve essere uguale in tutto il sito
- il selected/focus non deve cambiare da pagina a pagina
- placeholder sempre su tono muted
- mai usare un focus blu browser default

Nota pratica:
- i campi di `pagamento`, `servizi` e `indirizzi` devono usare lo stesso focus ring teal
- non vanno creati focus custom diversi per singolo step

---

## 6. Breadcrumb positioning

Classi shared:
- `.sf-breadcrumb-band`
- `.sf-breadcrumb-band--left`
- `.sf-breadcrumb-band--center`
- `.sf-breadcrumb-band--inside`

Regola:
- il breadcrumb sta sempre prima del titolo principale
- non va messo disperso dentro il primo box contenuto
- deve stare nello stesso allineamento dell'hero/header della pagina
- pagine centered hero: breadcrumb centered
- pagine account/admin o layout shell: breadcrumb allineato al contenuto principale
- funnel preventivo: breadcrumb o step-header nella stessa fascia dell'intro, non dentro il contenuto del primo step

Ordine corretto:
1. breadcrumb
2. titolo
3. descrizione
4. contenuto

---

## 7. Hero/header pagina

Regola shared:
- spazio verticale sopra il titolo
- breadcrumb + titolo + descrizione come blocco unico
- niente titolo appiccicato alla navbar
- la hero deve avere la stessa logica tra pubblico, account, admin e funnel, adattata al contesto

Centered hero:
- `servizi`
- `guide`
- `contatti`
- `traccia`

Left-aligned hero:
- account
- admin
- pagine shell con sidebar

Nel funnel:
- l'intestazione di pagina deve comunque esistere
- `Preventivo` non deve sembrare una pagina senza titolo
- breadcrumb/stepper e titolo devono stare in una fascia coerente prima del contenuto

---

## 8. Matrice pratica funnel

Per evitare incoerenze tra step diversi:

- `pagamento`
  - card metodi: `.sf-step-choice` / `.sf-step-choice--selected`
  - contenitori: `.sf-step-surface`
  - switch documento fiscale: `.sf-segmented-control--step`

- `servizi`
  - card servizi: `.sf-step-choice` / `.sf-step-choice--selected`
  - card di configurazione: `.sf-step-surface`
  - switch varianti: `.sf-segmented-control--step`

- `colli`
  - scelta tipo collo: `.sf-segmented-control--step`
  - box collo: `.sf-step-surface`
  - eventuali varianti selezionabili future: `.sf-step-choice` / `.sf-step-choice--selected`

- `indirizzi`
  - box partenza/destinazione: `.sf-step-surface`
  - varianti `A domicilio / Punto BRT`: `.sf-segmented-control--step`
  - input: `.form-input`

---

## 9. Palette e testo

Token principali:
- `--color-brand-primary: #095866`
- `--color-brand-accent: #E44203`
- `--color-brand-text`
- `--color-brand-text-secondary`
- `--color-brand-text-muted`

Regola:
- niente hex hardcoded se esiste il token
- niente blu come alternativa al teal
- testo forte per heading
- testo secondary per body
- muted solo per label, hint, metadata

---

## 10. Componenti di riferimento

Se devi costruire o rifare un componente, parti da queste classi shared:
- superfici: `.sf-surface`, `.sf-card`, `.sf-surface-card`
- card selezionabili: `.sf-card--selectable`, `.sf-card--selected`, `.sf-selection-card`
- segmented: `.sf-segmented-control`
- segmented funnel: `.sf-segmented-control--step`
- toggle binari: `.sf-toggle`
- bottoni: `.btn-primary`, `.btn-secondary`, `.btn-cta`, `.btn-tertiary`
- input: `.form-input`
- breadcrumb: `.sf-breadcrumb-band`

---

## 11. Cose da non fare

- non inventare una quarta famiglia di bottoni
- non fare selected state diversi tra funnel, account e admin
- non usare track full-width per tutti gli switch se il contenuto puo stare compatto
- non mettere breadcrumb in posizioni casuali
- non usare box senza corpo o contrasto che si perdono sul background
- non usare animazioni di click che possono essere spammate e sembrare glitch

---

## 12. Regola operativa per i worker

Prima di creare una nuova variante:
1. controlla `main.css`
2. riusa una classe shared esistente
3. se serve una nuova utility, deve essere:
   - generica
   - non invasiva
   - coerente con i token gia presenti
4. aggiorna questo file se stai fissando una nuova grammatica shared
