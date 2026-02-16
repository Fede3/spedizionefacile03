# Perche' le sessioni per il preventivo

Spiega perche' la configurazione della spedizione usa le sessioni PHP invece del database.

---

## Il problema

Quando un utente configura una spedizione, deve passare attraverso piu' passi:

1. Scegliere citta' di partenza e destinazione
2. Configurare i pacchi (peso, dimensioni)
3. Scegliere il servizio
4. Inserire gli indirizzi completi
5. Pagare

I dati di ogni passo devono essere mantenuti tra un passo e l'altro.

---

## La soluzione: sessioni

I dati del preventivo vengono salvati nella **sessione PHP** sul server.

Il controller si trova in `laravel-spedizionefacile-main/app/Http/Controllers/SessionController.php`:

```php
// Salva i dati nella sessione
session()->put('shipment_details', $shipmentDetails);
session()->put('packages', $packages);
session()->put('total_price', round($totalPrice, 2));
session()->put('step', 2);
```

Il frontend li recupera con:

```php
// Legge i dati dalla sessione
session()->get('shipment_details', []);
session()->get('packages', []);
session()->get('total_price', 0);
session()->get('step', 1);
```

---

## Perche' non il database

### 1. Non richiede autenticazione

Con le sessioni, anche un **utente non registrato** puo' fare un preventivo.
Se usassimo il database, servirebbe un account per salvare i dati.

Questo e' cruciale per l'esperienza utente: l'utente vuole vedere subito il prezzo, senza doversi registrare.

### 2. Dati temporanei

I dati del preventivo sono temporanei. Non ha senso salvarli permanentemente nel database:

- Molti utenti fanno un preventivo e non procedono
- I dati del preventivo diventano obsoleti rapidamente
- Occuperebbero spazio inutile nel database

### 3. Nessuna pulizia necessaria

Le sessioni scadono automaticamente (default: 120 minuti).
Con il database, bisognerebbe implementare un job per pulire i preventivi abbandonati.

### 4. Semplicita'

Le sessioni sono native in Laravel. Non servono:
- Migrazioni aggiuntive
- Modelli aggiuntivi
- Logica di pulizia

---

## Perche' non il localStorage del browser

Il localStorage avrebbe il vantaggio di non richiedere richieste al server, ma:

- **Non e' condiviso tra dispositivi** - Se l'utente inizia da mobile e continua da desktop, perde i dati
- **Non e' sicuro** - I dati possono essere manipolati dall'utente
- **Calcolo prezzi non verificabile** - Il prezzo calcolato nel browser potrebbe essere falsificato

Con le sessioni, il prezzo viene calcolato e validato sul server.

---

## Come funziona in pratica

```
Browser                        Server (Laravel)
  │                                │
  │ POST /api/session/first-step   │
  │ { packages, shipment_details } │
  │ ─────────────────────────────► │
  │                                │ Valida i dati
  │                                │ Calcola i prezzi
  │                                │ Salva in session()
  │ ◄───────────────────────────── │
  │ { data: { packages, price } }  │
  │                                │
  │ GET /api/session               │
  │ ─────────────────────────────► │
  │                                │ Legge da session()
  │ ◄───────────────────────────── │
  │ { data: { packages, price } }  │
```

Il composable `useSession.js` nel frontend gestisce il recupero dei dati:

```javascript
export const useSession = () => {
    const { data: session, status, refresh } = useSanctumFetch("/api/session");
    return { session, refresh, status };
};
```

---

## Quando i dati passano nel database

I dati della sessione vengono trasferiti nel database solo quando l'utente **procede al pagamento**:

1. L'utente clicca "Procedi al pagamento"
2. Il sistema crea i record nel database: Package, PackageAddress, Service
3. Crea un ordine (Order) collegato ai pacchi
4. La sessione viene svuotata (il carrello viene svuotato dal listener CartEmpty)

Da quel momento in poi, tutti i dati sono nel database e non piu' nella sessione.
