# UX/UI Consistency Matrix

Scope: review pagina per pagina su `HEAD/main`, basata su codice, layout, componentizzazione e pattern ricorrenti. Non sostituisce una ricertificazione browser completa.

## 1. Stato sistemico del design system

### Punti migliorati
- molte pagine hanno perso il monolite locale e usano componenti piu' riusabili
- il progetto ha introdotto piu' CSS dedicati per area, invece di concentrare tutto in poche pagine
- esistono gia' pattern condivisi per account, riepilogo, shipment, auth, checkout

### Incoerenze sistemiche ancora visibili
- uso del colore di accento arancione non ancora abbastanza disciplinato
- secondario teal ancora usato in modo non sempre lieve
- stesso ruolo UI non sempre = stesso aspetto
- troppe superfici ancora dipendono da CSS locali molto grandi
- copy in alcune pagine ancora troppo verbosa
- route e pagine duplicate aumentano il rischio di UX divergente

## 2. Stato per pattern trasversali

| Pattern | Stato | Lettura |
|---|---|---|
| Bottoni primary/secondary | Medio | esistono pattern, ma non ancora propagati con rigore totale |
| Card azione | Medio | presenti, ma non tutte con stessa gerarchia visiva |
| Popup / modali | Medio | base comune migliorata, ma non ancora completamente uniforme |
| Selezioni / tab / toggle | Debole | area piu' fragile del funnel e di alcune schermate account |
| Empty states | Medio-buono | migliorati nel tempo |
| Toolbar admin | Medio | molto meglio di prima, ma non ovunque allo stesso livello |
| Spaziature e prossimita' | Medio | buone in alcune aree, instabili in altre |
| Contrasto e accessibilita' | Medio | migliorato, ma non ancora abbastanza rigoroso |
| Focus conversione | Medio | migliore nel funnel rispetto a prima, ma non ancora perfetto |

## 3. Matrice pagina per pagina

Legenda:
- `Buono`: struttura convincente, restano rifiniture
- `Medio`: pagina usabile ma non ancora coerente o pulita al livello target
- `Debole`: pagina o gruppo con problemi strutturali, gerarchie o coerenza non ancora chiuse

### Pagine pubbliche
| Pagina | Stato | Criticita' principali | Priorita' |
|---|---|---|---|
| `/` | Medio | hero e CTA migliorati, ma gerarchie e focus ancora da rifinire | Alta |
| `/preventivo` | Medio | logica piu' forte, ma controlli ed error states ancora da armonizzare | Alta |
| `/servizi` | Medio | contenuti e CTA migliorabili, densita' ancora da rifinire | Media |
| `/servizi/[slug]` | Medio | coerenza con landing servizi da ricertificare | Media |
| `/servizi/pagamento-alla-consegna` | Medio | pagina utile ma da riportare al sistema standard | Media |
| `/guide` | Medio | struttura ragionevole, ma non ancora certificata pagina per pagina | Media |
| `/guide/[slug]` | Medio | da verificare ritmo e densita' del contenuto | Media |
| `/blog` | Medio | va allineato al resto delle pagine editoriali | Media |
| `/blog/[slug]` | Medio | stessa criticita' delle guide | Media |
| `/contatti` | Medio-buono | tra le piu' pulite, resta rifinitura di sistema | Media-bassa |
| `/faq` | Medio-buono | buona base, da allineare meglio ai pattern globali | Media-bassa |
| `/chi-siamo` | Medio | ancora piu' verbosa del necessario | Media |
| `/traccia-spedizione` | Medio | funzionale ma da ricertificare come esperienza completa | Media |
| `/cookie-policy` | Buono | pagina legale, criticita' minima | Bassa |
| `/privacy-policy` | Buono | pagina legale, criticita' minima | Bassa |
| `/termini-condizioni` | Buono | pagina legale, criticita' minima | Bassa |
| `/reclami` | Medio | va armonizzata con le altre pagine utility | Media-bassa |

### Autenticazione
| Pagina | Stato | Criticita' principali | Priorita' |
|---|---|---|---|
| `/autenticazione` | Medio | dialoghi e gerarchie migliorabili | Alta |
| `/login` | Debole | duplicazione di funzione con `/autenticazione` | Alta |
| `/registrazione` | Medio | utile, ma da allineare meglio al pattern auth unico | Media |
| `/recupera-password` | Medio | da unificare col sistema auth | Media |
| `/aggiorna-password` | Medio | da unificare col sistema auth | Media |
| `/verifica-email` | Medio | da unificare col sistema auth | Media |

### Funnel e commercio
| Pagina | Stato | Criticita' principali | Priorita' |
|---|---|---|---|
| `/la-tua-spedizione/[step]` | Debole | lo step 2 resta il punto piu' fragile: selezioni, gerarchie, pattern card/toggle | Critica |
| `/riepilogo` | Medio | molto piu' piccolo e leggibile, ma gerarchia CTA/totale ancora da chiudere | Alta |
| `/carrello` | Medio | base buona, ma da ricertificare sul sistema finale di action cards | Alta |
| `/checkout` | Medio | struttura migliore, ma da chiudere visivamente e runtime | Alta |

### Account cliente
| Pagina | Stato | Criticita' principali | Priorita' |
|---|---|---|---|
| `/account` | Medio | migliorata, ma il focus dashboard puo' essere ancora piu' chiaro | Alta |
| `/account/profilo` | Medio-buono | relativamente pulita, restano rifiniture | Media |
| `/account/carte` | Medio | buona base, ma da riallineare a un sistema bottoni unico | Media |
| `/account/portafoglio` | Debole | troppo densa concettualmente, da scomporre meglio | Alta |
| `/account/prelievi` | Medio | migliorata, ma ancora da asciugare | Alta |
| `/account/assistenza` | Medio | da ricertificare nel sistema account | Media |
| `/account/bonus` | Medio | pagina sottile ma da armonizzare | Media-bassa |
| `/account/indirizzi` | Debole | duplicazione con `/account/indirizzi/index` | Alta |
| `/account/indirizzi/index` | Debole | duplicazione con route sorella | Alta |
| `/account/spedizioni` | Medio | struttura migliorabile ma non critica | Media |
| `/account/spedizioni/[id]` | Medio | da allineare ai pattern condivisi detail/edit | Media |
| `/account/spedizioni/[spedizione]` | Debole | route duplicata/ambigua rispetto a `[id]` | Alta |
| `/account/spedizioni-configurate` | Medio | utile ma ancora rumorosa | Media |
| `/account/account-pro` | Medio | molto migliorata, ma da chiudere sul piano gerarchie/CTA | Alta |

### Admin
| Pagina | Stato | Criticita' principali | Priorita' |
|---|---|---|---|
| `/account/amministrazione` | Medio | dashboard piu' chiara, ma ancora da semplificare | Alta |
| `/account/amministrazione/ordini` | Medio | view densa ma su buona base | Alta |
| `/account/amministrazione/utenti` | Debole | area ancora pesante e multi-pattern | Alta |
| `/account/amministrazione/prezzi` | Debole | la pagina e' piccola, ma il sottosistema resta complesso | Critica |
| `/account/amministrazione/coupon` | Medio | non critica, ma da uniformare | Media |
| `/account/amministrazione/immagine-homepage` | Medio | ancora area specialistica con rischio incoerenza | Media |
| `/account/amministrazione/impostazioni` | Medio | da uniformare con il resto admin | Media |
| `/account/amministrazione/messaggi` | Medio | da rifinire | Media |
| `/account/amministrazione/portafogli` | Medio | da riallineare al sistema wallet/account | Media |
| `/account/amministrazione/prelievi` | Medio | stesso tema di allineamento | Media |
| `/account/amministrazione/referral` | Medio | va armonizzata all'account-pro | Media |
| `/account/amministrazione/spedizioni` | Medio | utile ma da ricertificare sul sistema admin finale | Media |
| `/account/amministrazione/blog/index` | Medio | editoriale da uniformare | Media |
| `/account/amministrazione/blog/nuovo` | Medio | editoriale da uniformare | Media |
| `/account/amministrazione/blog/[id]` | Medio | editoriale da uniformare | Media |
| `/account/amministrazione/guide/index` | Medio | editoriale da uniformare | Media |
| `/account/amministrazione/guide/nuovo` | Medio | editoriale da uniformare | Media |
| `/account/amministrazione/guide/[id]` | Medio | editoriale da uniformare | Media |
| `/account/amministrazione/servizi/index` | Medio | editoriale da uniformare | Media |
| `/account/amministrazione/servizi/nuovo` | Medio | editoriale da uniformare | Media |
| `/account/amministrazione/servizi/[id]` | Medio | editoriale da uniformare | Media |

## 4. Incoerenze sistemiche da standardizzare globalmente

1. **Autenticazione**
   - troppe route e superfici per login/register/reset
   - serve un sistema auth davvero unico

2. **Account routing**
   - route duplicate o ambigue (`indirizzi`, `spedizioni/[id]`, `spedizioni/[spedizione]`)

3. **Funnel step 2**
   - e' ancora il baricentro delle incoerenze UI: selezioni, toggle, accordion, servizi configurabili, CTA

4. **Color discipline**
   - arancione e teal non ancora sempre usati in modo gerarchico e disciplinato

5. **Copy density**
   - migliorata ma ancora eccessiva in alcune pagine account/admin e nel funnel

## 5. Verdetto UX/UI

La UX/UI non e' piu' allo stato iniziale caotico, ma non e' ancora arrivata alla promessa di un sistema coerente in ogni pagina.

Priorita' assolute lato UX/UI:
1. `step 2`
2. `riepilogo + checkout`
3. `portafoglio + utenti + prezzi`
4. sistema auth unificato
5. razionalizzazione route duplicate account
