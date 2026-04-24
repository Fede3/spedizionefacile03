# ISTRUZIONI PER CODEX - SpedizioneFacile

> **PRIMA DI FARE QUALSIASI COSA: leggi questi file nell'ordine indicato**
> 1. `CODEX_HANDOFF_COMPLETO.md`
> 2. `CODEX_RESTART_PACKET_2026-04-11.md`
> 3. `CODEX_ACCOUNT_ADMIN_MEMORY_2026-04-11.md`
>
> Il primo contiene il contesto generale del progetto.
> Il secondo contiene la roadmap di ripartenza.
> Il terzo contiene il dettaglio operativo aggiornato dell'11 aprile sull'area account/admin, comprese le note UX/UI aggiunte dall'utente.

## SETUP SHELL
Se PowerShell da errori (8009001d), usa Git Bash:
```bash
# Path Git Bash: C:/Program Files/Git/bin/bash.exe
# Il .codex/config.toml e' gia configurato con shell = git bash
```

## DIRECTORY DI LAVORO
```
Repo principale:  C:\Users\Feder\Desktop\spedizionefacile\
Frontend Nuxt:    nuxt-spedizionefacile-master\
Backend Laravel:  laravel-spedizionefacile-main\
Worktree lavoro:  .claude\worktrees\lavoro\
Prototipo:        C:\Users\Feder\Desktop\Prototipo\
```

## AVVIO DEV SERVER
```bash
cd nuxt-spedizionefacile-master
npm run dev -- --port 8787

# Backend (porta separata)
cd laravel-spedizionefacile-main
php artisan serve --port=8000
```

## CREDENZIALI DEMO
- Admin: `admin@spediamofacile.it` / `Admin2026!`
- URL locale: `http://localhost:8787`

## TASK ATTUALE
**Redesign pagine account** seguendo il Prototipo React in:
`C:\Users\Feder\Desktop\Prototipo\src\app\components\account\`

Pagine da redesignare (in ordine):
1. `/account` - Dashboard (verificare prima visivamente)
2. `/account/spedizioni` - Lista spedizioni
3. `/account/portafoglio` - Wallet hero card scuro
4. `/account/profilo` - Form edit profilo
5. `/account/notifiche` - Toggle email/webhook
6. Tutte le altre sub-pagine account

Per il dettaglio dei fix gia fatti, dei test gia passati, degli screenshot e delle note utente da non perdere, leggere anche:

- `C:\Users\Feder\Desktop\spedizionefacile\CODEX_ACCOUNT_ADMIN_MEMORY_2026-04-11.md`

## REGOLE FERREE
- **Tutto in italiano** (commenti, risposte, comunicazioni)
- **MAI committare** senza permesso esplicito dell'utente
- **MAI usare blu** - solo teal (#095866) + arancione (#E44203) + neutri
- **SVG inline sempre** - mai `<Icon>` iconify
- **Verificare visivamente** con screenshot dopo ogni modifica
- Prezzi: backend in centesimi, frontend divide per 100 (`utils/price.js`)

## ACCESSO A TUTTE LE CONVERSAZIONI
Vedi `CONVERSATIONS_INDEX.md` per l'indice completo di tutte le sessioni JSONL.
Le sessioni piu importanti:
- Sessione attuale (8 apr): `.claude/projects/C--Users-Feder-Desktop-spedizionefacile--claude-worktrees-youthful-raman/9bddefaf-925f-4834-b666-1f91727ccca7.jsonl`
- Sessione 7 apr (audit+push): `.claude/projects/C--Users-Feder-Desktop-spedizionefacile/2007dca7-753d-42c6-8d64-33f7bf9d10df.jsonl`
- Sessione UX overhaul (5 apr): `.claude/projects/C--Users-Feder-Desktop-spedizionefacile--claude-worktrees-optimistic-bohr/7e4b2569-6c13-4861-99b6-05d314fb70f8.jsonl`
(I file .claude/projects/ sono nella home dell'utente: `C:\Users\Feder\.claude\projects\`)
