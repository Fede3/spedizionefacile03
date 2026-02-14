# Come configurare l'invio email

Questa guida spiega come configurare il sistema email per SpedizioneFacile.

---

## Le email del sistema

SpedizioneFacile invia email in questi casi:

- **Verifica email** - Quando un utente si registra
- **Recupero password** - Quando un utente dimentica la password
- **Etichetta BRT** - Dopo il pagamento, con l'etichetta di spedizione allegata

I template si trovano in:
- `laravel-spedizionefacile-main/app/Mail/VerificationEmail.php`
- `laravel-spedizionefacile-main/app/Mail/ResetPasswordEmail.php`
- `laravel-spedizionefacile-main/app/Mail/ShipmentLabelMail.php`

---

## Opzione 1: Modalita' log (sviluppo locale)

La modalita' piu' semplice. Le email vengono scritte nei log invece di essere inviate.

Nel file `laravel-spedizionefacile-main/.env`:

```env
MAIL_MAILER=log
```

Le email saranno visibili in:
```
laravel-spedizionefacile-main/storage/logs/laravel.log
```

Usa questo comando per seguire le email in tempo reale:

```bash
tail -f laravel-spedizionefacile-main/storage/logs/laravel.log
```

---

## Opzione 2: Resend (consigliato per produzione)

Resend e' il servizio consigliato. Piano gratuito: 3.000 email/mese.

### Configurazione

1. Registrati su [resend.com](https://resend.com)
2. Crea un'API Key nella dashboard
3. Configura il dominio del mittente (verifica DNS)

Nel `.env`:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.resend.com
MAIL_PORT=465
MAIL_USERNAME=resend
MAIL_PASSWORD=re_INCOLLA_QUI_LA_TUA_API_KEY
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS="noreply@tuodominio.com"
MAIL_FROM_NAME="SpedizioneFacile"
```

In alternativa, puoi usare il mailer `resend` gia' configurato in `config/mail.php`:

```env
MAIL_MAILER=resend
MAIL_PASSWORD=re_INCOLLA_QUI_LA_TUA_API_KEY
MAIL_FROM_ADDRESS="noreply@tuodominio.com"
MAIL_FROM_NAME="SpedizioneFacile"
```

---

## Opzione 3: Gmail (per test)

Puoi usare Gmail per i test, ma non e' consigliato per la produzione.

1. Attiva l'accesso alle app meno sicure in Google Account, oppure crea una "Password per le app"
2. Configura il `.env`:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=tuoemail@gmail.com
MAIL_PASSWORD=la_password_per_le_app
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="tuoemail@gmail.com"
MAIL_FROM_NAME="SpedizioneFacile"
```

---

## Opzione 4: Server SMTP locale (sviluppo)

Il progetto include uno script Python per un server SMTP locale:

```bash
python scripts/local_smtp.py
```

Questo avvia un server SMTP sulla porta 2525 che stampa le email nella console.

Nel `.env`:

```env
MAIL_MAILER=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=2525
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
```

---

## Configurazione in config/mail.php

Il file `laravel-spedizionefacile-main/config/mail.php` definisce i mailer disponibili:

- `smtp` - SMTP generico (configurabile via .env)
- `resend` - SMTP Resend (preconfigurato con host e porta)
- `log` - Scrive nei log (per sviluppo)
- `ses` - Amazon SES
- `postmark` - Postmark
- `failover` - Prova SMTP, poi fallback su log

---

## Variabili .env per le email

| Variabile | Descrizione | Esempio |
|---|---|---|
| `MAIL_MAILER` | Tipo di mailer | `smtp`, `log`, `resend` |
| `MAIL_HOST` | Server SMTP | `smtp.resend.com` |
| `MAIL_PORT` | Porta SMTP | `465` (SSL) o `587` (TLS) |
| `MAIL_USERNAME` | Username SMTP | `resend` |
| `MAIL_PASSWORD` | Password o API key | `re_xxxx` |
| `MAIL_ENCRYPTION` | Tipo di crittografia | `ssl`, `tls`, `null` |
| `MAIL_FROM_ADDRESS` | Indirizzo mittente | `noreply@spedizionefacile.it` |
| `MAIL_FROM_NAME` | Nome mittente | `SpedizioneFacile` |

---

## Verificare che funzioni

1. Registra un nuovo utente sul sito
2. Controlla se l'email di verifica arriva (o appare nei log)
3. Se usi Resend, controlla la dashboard per gli invii

### Debug in caso di problemi

```bash
# Controlla i log per errori email
tail -f laravel-spedizionefacile-main/storage/logs/laravel.log | grep -i mail
```

Errori comuni:

| Errore | Soluzione |
|---|---|
| `Connection refused` | Il server SMTP non e' raggiungibile |
| `Authentication failed` | Username o password errati |
| `From address not verified` | Verifica il dominio su Resend |
| `Nessuna email ricevuta` | Controlla la cartella spam |
