# Decisioni tecniche

Le scelte tecniche principali del progetto e le ragioni dietro di esse.

---

## 1. Prezzi in centesimi

**Decisione**: i prezzi nel database e in Stripe sono sempre in centesimi (es. 900 = 9.00 EUR).

**Perche'**:
- Evita errori di arrotondamento con i numeri decimali
- Stripe accetta solo centesimi
- I calcoli tra interi sono piu' precisi dei calcoli tra decimali
- La classe `MyMoney` gestisce la conversione automatica per la visualizzazione

**Dove**: modello Order (`subtotal`), modello Transaction (`total`), tutte le chiamate Stripe.

---

## 2. Eventi e Listeners per il flusso di pagamento

**Decisione**: dopo il pagamento, la logica successiva e' gestita tramite eventi (`OrderPaid`) e listener (`MarkOrderProcessing`, `GenerateBrtLabel`).

**Perche'**:
- **Disaccoppiamento**: il controller di pagamento non conosce la logica BRT
- **Estensibilita'**: per aggiungere un'azione post-pagamento, basta creare un nuovo listener
- **Ordine di esecuzione**: i listener vengono eseguiti nell'ordine di registrazione
- **Manutenibilita'**: ogni listener ha una sola responsabilita'

**Alternativa scartata**: mettere tutta la logica nel controller di pagamento.
Questo avrebbe creato un controller enorme e difficile da mantenere.

---

## 3. Generazione etichetta BRT con retry

**Decisione**: la generazione dell'etichetta BRT ritenta fino a 3 volte con pause progressive (1s, 2s).

**Perche'**:
- Le API BRT possono avere latenze temporanee
- Un timeout occasionale non deve bloccare l'ordine
- Le pause progressive evitano di sovraccaricare il server BRT
- Dopo 3 tentativi, l'errore viene salvato e l'admin puo' riprovare manualmente

**Dove**: `app/Listeners/GenerateBrtLabel.php`

---

## 4. BrtService separato dal controller

**Decisione**: tutta la logica BRT e' in un Service (`app/Services/BrtService.php`), non nel controller.

**Perche'**:
- Il controller gestisce le richieste HTTP, il service gestisce la logica di business
- Il service puo' essere chiamato sia dal controller che dal listener
- Facilita il testing: si puo' testare il service indipendentemente dal controller
- Il file BrtService e' gia' lungo (~1100 righe); averlo nel controller lo renderebbe ingestibile

---

## 5. Carrello diverso per ospiti e utenti

**Decisione**: il carrello usa endpoint diversi per utenti loggati (`/api/cart`) e ospiti (`/api/guest-cart`).

**Perche'**:
- Gli ospiti non hanno un `user_id` nel database
- Il carrello degli ospiti usa la sessione
- Il carrello degli utenti usa il database (persistente tra sessioni)
- Il composable `useCart.js` nel frontend gestisce la scelta automaticamente:

```javascript
const endpoint = computed(() =>
    isAuthenticated.value ? "/api/cart" : "/api/guest-cart"
);
```

---

## 6. Normalizzazione indirizzi BRT

**Decisione**: gli indirizzi vengono normalizzati automaticamente prima di essere inviati a BRT.

**Perche'**:
- BRT richiede un formato molto specifico (maiuscolo, senza abbreviazioni, CAP a 5 cifre)
- Gli utenti scrivono gli indirizzi in modi diversi
- Senza normalizzazione, molte spedizioni fallirebbero

Vedi [Perche' la normalizzazione BRT](PERCHE-BRT-NORMALIZZAZIONE.md) per i dettagli.

---

## 7. SQLite come database

**Decisione**: usare SQLite invece di MySQL/PostgreSQL.

**Perche'**:
- Zero configurazione: un singolo file
- Facile da trasportare e fare backup
- Sufficiente per il volume di traffico previsto
- Semplifica l'onboarding di nuovi sviluppatori
- Facile migrazione futura a MySQL se necessario (Laravel astrae il database)

**Trade-off**: SQLite ha limitazioni sulla concorrenza (un solo writer alla volta) e non supporta alcune funzionalita' avanzate. Per un sito con migliaia di ordini al giorno, MySQL sarebbe piu' appropriato.

---

## 8. Caddy come reverse proxy

**Decisione**: usare Caddy per unificare frontend e backend sulla stessa porta.

**Perche'**:
- Risolve il problema dei cookie cross-origin (Sanctum richiede same-origin)
- HTTPS automatico in produzione
- Configurazione minima (poche righe)
- Piu' leggero di Nginx per questo caso d'uso

---

## 9. Impostazioni nel database (tabella settings)

**Decisione**: alcune configurazioni (come le chiavi Stripe) possono essere salvate nel database oltre che nel `.env`.

**Perche'**:
- Permette all'admin di modificare le configurazioni senza accesso al server
- Le impostazioni nel database hanno priorita' su quelle nel `.env`
- Utile per switch tra modalita' test e produzione di Stripe

**Come**: il modello `Setting` con i metodi statici `Setting::get()` e `Setting::set()`:

```php
$stripeSecret = Setting::get('stripe_secret', config('services.stripe.secret'));
```

---

## 10. Transizioni disabilitate in Nuxt

**Decisione**: le transizioni di pagina in Nuxt sono disabilitate.

**Perche'**:
- La modalita' `out-in` (la vecchia pagina svanisce prima che la nuova appaia) causava uno **schermo bianco** durante la navigazione
- Il problema e' che la pagina vecchia viene rimossa prima che la nuova sia renderizzata
- Disabilitando le transizioni, la navigazione e' istantanea senza flash

**Dove**: commentato in `nuxt.config.ts`:

```typescript
app: {
    /* Transizioni disabilitate: causavano schermo bianco */
}
```

---

## 11. Throttle sugli endpoint sensibili

**Decisione**: gli endpoint di autenticazione e contatto hanno un limite di richieste al minuto.

**Perche'**:
- Previene attacchi brute-force sulle password (login: max 10/min)
- Previene spam nel form di contatto (contatto: max 5/min)
- Previene abusi nella registrazione (registro: max 5/min)

**Come**: il middleware `throttle` di Laravel:

```php
Route::middleware(['throttle:10,1'])->post('/custom-login', ...);
// 10 richieste al minuto, reset dopo 1 minuto
```

---

## 12. Salvataggio errore BRT nell'ordine

**Decisione**: se la generazione dell'etichetta BRT fallisce, l'errore viene salvato nel campo `brt_error` dell'ordine.

**Perche'**:
- Il frontend puo' mostrare all'utente un messaggio chiaro invece di "Etichetta in generazione..."
- L'admin puo' vedere l'errore nel pannello e decidere come procedere
- Permette di distinguere "etichetta non ancora generata" da "errore nella generazione"
- L'admin puo' tentare la rigenerazione dopo aver corretto il problema
