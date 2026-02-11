TUTTOINSIEME - INSTALLAZIONE MANUALE
=====================================

Il pannello per Tuttoinsieme segue la stessa logica di BianchiPro.

MODIFICHE DA FARE:

1. Copia PANNELLO.ps1 da BianchiproRestyling
2. Modifica queste righe:

   $Project = "TUTTOINSIEME"
   $FrontPort = 3001
   $BackPort = 8000
   $ProxyPort = 8787
   $LocalUrl = "http://127.0.0.1:$ProxyPort/"

3. Nella funzione Start-Local, avvia 3 servizi invece di 1:
   - Laravel (porta 8000): php artisan serve --port 8000
   - Nuxt (porta 3001): npm run dev (in nuxt-spedizionefacile-master)
   - Caddy (porta 8787): caddy run --config Caddyfile

4. Usa lo stesso sistema di WaitPort per ciascuno

OPPURE: Aspetta il file PANNELLO_TUTTOINSIEME.ps1 completo
