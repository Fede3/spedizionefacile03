# Account Restart Brief

Data: 2026-04-07
Workspace operativo da usare: `C:\Users\Feder\Desktop\spedizionefacile`
Target design primario: `C:\Users\Feder\Desktop\Prototipo\src\app\components\account`

## Regole operative

- Lavorare nel `main`, non nel worktree `lavoro`, per la tranche account attuale.
- Usare il worktree `lavoro` solo come provenienza storica se serve capire un file o un commit.
- Prima chiudere bug funzionali, poi fidelity visiva, poi screenshot/build.
- Non committare.
- Niente blu; solo teal `#095866`, arancione `#E44203`, neutri.

## Ordine fisso di ripartenza

### 1. `/account`

File Nuxt:
- `nuxt-spedizionefacile-master/pages/account/index.vue`
- `nuxt-spedizionefacile-master/utils/accountNavigation.js`

Target:
- shell e grammatica da `AccountPageShell.tsx`

Gap atteso:
- issue aperta finale di Claude sulle icon bubble / DashCard
- chiarezza dell'ingresso admin
- coerenza card/icone/section descriptions

Verifica finale richiesta:
- screenshot dashboard account
- check visivo icone bubble, card admin, hero/profile block

### 2. `/account/spedizioni`

File Nuxt:
- `nuxt-spedizionefacile-master/pages/account/spedizioni/index.vue`
- eventuali componenti `SpedizioniOrderCard` / `SpedizioniDetailModal`

Target:
- `SpedizioniAccount.tsx`

Gap atteso:
- fidelity di filtri, stats pills, card ordine, hierarchy dei dettagli
- rapporto tra dati reali Nuxt e struttura prototipo

Verifica finale richiesta:
- screenshot lista
- almeno un ordine aperto e uno chiuso

### 3. `/account/portafoglio`

File Nuxt:
- `nuxt-spedizionefacile-master/pages/account/portafoglio.vue`
- componenti wallet correlati

Target:
- `PagamentiAccount.tsx`

Gap atteso:
- wallet hero scura
- tabs transazioni/metodi/fatture o equivalenti
- allineamento tra dati reali wallet e grammatica del prototipo

Verifica finale richiesta:
- screenshot hero wallet
- screenshot stato movimenti / carta predefinita

### 4. `/account/profilo`

File Nuxt:
- `nuxt-spedizionefacile-master/pages/account/profilo.vue`
- `nuxt-spedizionefacile-master/components/account/AccountProfiloView.vue`
- `nuxt-spedizionefacile-master/components/account/AccountProfiloEditForm.vue`

Target:
- `ProfiloAccount.tsx`

Gap atteso:
- ricertificare il fix funzionale dell'evento `edit`
- verificare gerarchia dati personali / sicurezza / indirizzi
- verificare switch vista/modifica senza dati stantii

Nota importante:
- il fix del bottone `Modifica` che non apriva il form e' gia' stato applicato in `pages/account/profilo.vue`

Verifica finale richiesta:
- click su `Modifica`
- annulla / salva
- screenshot vista e screenshot form

### 5. `/account/notifiche`

File Nuxt:
- `nuxt-spedizionefacile-master/pages/account/notifiche.vue`

Target:
- `NotifichePage.tsx`

Gap atteso:
- matrice EMAIL/WEBHOOK
- coerenza toggle teal/grey
- rapporto tra preferenze reali API e layout prototipo

Verifica finale richiesta:
- screenshot matrix
- toggle di almeno una preferenza

### 6. `/account/carte`

File Nuxt:
- `nuxt-spedizionefacile-master/pages/account/carte.vue`

Target:
- area metodi di pagamento di `PagamentiAccount.tsx`

Gap atteso:
- stato vuoto Stripe
- card salvate / predefinita
- coerenza visuale con la pagina portafoglio

Verifica finale richiesta:
- screenshot stato vuoto oppure lista carte
- confronto con grammatica wallet/pagamenti

## Chiusura della tranche

La tranche account si considera chiusa solo se:
- l'issue `accountNavigation.js` / DashCard e' risolta o riclassificata
- ogni pagina sopra ha screenshot o verifica visiva equivalente
- `npm run build` nel frontend passa
- il lavoro residuo e' espresso come backlog piccolo e non come stato confuso
