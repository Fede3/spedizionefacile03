# Panoramica del progetto

## Cos'e' SpediamoFacile

SpediamoFacile e' una piattaforma web per confrontare e prenotare spedizioni nazionali e internazionali.
Gli utenti possono configurare i pacchi, scegliere il servizio di spedizione e pagare online.

Il sistema genera automaticamente le etichette di spedizione BRT e invia il tracking all'utente via email.

---

## Architettura generale

Il progetto e' composto da due applicazioni separate che comunicano tra loro:

```
┌──────────────────┐         API (HTTP)        ┌──────────────────┐
│                  │  ◄─────────────────────►  │                  │
│   Frontend Nuxt  │                            │  Backend Laravel │
│   (porta 3001)   │                            │   (porta 8000)   │
│                  │                            │                  │
└──────────────────┘                            └──────────────────┘
        │                                               │
   Interfaccia utente                              Database SQLite
   (HTML, CSS, JS)                                 API esterne:
                                                   - Stripe (pagamenti)
                                                   - BRT (spedizioni)
                                                   - Google (login)
                                                   - Resend (email)
```

Un reverse proxy (Caddy) unifica le due applicazioni sulla porta 8787, gestendo automaticamente il routing.

---

## Tecnologie utilizzate

### Backend (Laravel)

| Tecnologia | Ruolo |
|---|---|
| **Laravel 11** | Framework PHP per il backend |
| **SQLite** | Database (un singolo file, senza server separato) |
| **Laravel Sanctum** | Autenticazione utenti (sessioni + cookie) |
| **Stripe SDK** | Pagamenti con carta di credito |
| **BRT API** | Creazione spedizioni e etichette corriere |
| **Resend** | Invio email transazionali (verifica, etichette) |

### Frontend (Nuxt)

| Tecnologia | Ruolo |
|---|---|
| **Nuxt 3** | Framework Vue.js con SSR (rendering lato server) |
| **Vue 3** | Libreria JavaScript per l'interfaccia utente |
| **Nuxt UI** | Componenti grafici pronti (pulsanti, modali, form) |
| **Pinia** | Gestione dello stato globale (store) |
| **nuxt-auth-sanctum** | Autenticazione con il backend Laravel |
| **Stripe.js** | Componenti di pagamento sicuri nel browser |

### Infrastruttura

| Tecnologia | Ruolo |
|---|---|
| **Caddy** | Reverse proxy (unifica frontend e backend) |
| **Cloudflare Tunnel** | Espone il sito locale su internet (opzionale) |

---

## Cartelle principali

```
spedizionefacile/
├── laravel-spedizionefacile-main/    # Backend Laravel (API, database, logica)
├── nuxt-spedizionefacile-master/     # Frontend Nuxt (pagine, componenti, stili)
├── Caddyfile                          # Configurazione reverse proxy
├── scripts/                           # Script di avvio e utilita'
└── docs/                              # Questa documentazione
```

---

## Flusso principale di una spedizione

1. L'utente compila il **preventivo** (citta', pacchi, dimensioni)
2. Il sistema calcola il **prezzo** (basato su peso e volume)
3. L'utente sceglie il **servizio** (standard, express, ecc.)
4. L'utente inserisce gli **indirizzi** (partenza e destinazione)
5. I pacchi vanno nel **carrello**
6. L'utente procede al **pagamento** (carta, portafoglio, bonifico)
7. Il sistema genera l'**etichetta BRT** automaticamente
8. L'utente riceve l'etichetta via **email** con il link di tracking

---

## Ruoli utente

Il sistema supporta tre ruoli:

- **User** - Utente normale, puo' spedire pacchi e gestire il proprio account
- **Admin** - Amministratore, ha accesso al pannello di gestione completo
- **Partner Pro** - Utente professionale con codice referral e commissioni

---

## Prossimo passo

Vai a [Primo avvio](02-PRIMO-AVVIO.md) per imparare come configurare il progetto da zero.
