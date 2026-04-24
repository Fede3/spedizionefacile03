# Audit Pulizia Repo - 16 Aprile 2026

## Misura Reale
- Codice applicativo: `128.921` righe
- Test: `22.769` righe
- Documentazione e testi: `645.855` righe
- Altro testo e artefatti non classificati: `1.499.112` righe

## Conclusione Chiave
Il numero percepito nell'editor non rappresenta il solo codice prodotto.
Il gonfiore attuale arriva soprattutto da:
- log locali
- output Playwright
- report temporanei
- documenti storici ridondanti
- dump e handoff testuali molto grandi

Un target di `5k` righe totali per tutta la repo non e realistico senza distruggere backend, frontend e test.
Il target corretto e:
- tagliare il rumore locale
- archiviare o unire la documentazione ridondante
- consolidare alias legacy
- spezzare pochi monoliti ad alta priorita

## Fase 1 Gia Eseguita
- rimossi i log locali root piu evidenti
- rimossi i bucket locali `.playwright-cli` e `.playwright-mcp`
- rimossi diversi log e runtime trace sotto `output/`
- aggiornato `.gitignore` per bloccare il ritorno di:
  - `*.log`
  - `*.err.log`
  - `*.out.log`
  - `tmp-auth-cookies.txt`
  - log runtime root piu comuni
- rimosso il file temporaneo tracciato `tmp-diagnostica/report.txt`
- archiviati i dump locali duplicati:
  - `codex-context.txt`
  - `codex-handoff-full.txt`

## Spazzatura A Basso Rischio
- `output/`
- `.playwright-cli/`
- `.playwright-mcp/`
- `tmp-diagnostica/` come directory di report generati
- log root e log dev server
- trace cloudflared
- cookie dump temporanei

## Monoliti Frontend Prioritari
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
- `nuxt-spedizionefacile-master/assets/css/account-shell.css`
- `nuxt-spedizionefacile-master/assets/css/autenticazione.css`
- `nuxt-spedizionefacile-master/assets/css/preventivo.css`
- `nuxt-spedizionefacile-master/components/admin/AdminConsoleAnalytics.vue`
- `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
- `nuxt-spedizionefacile-master/components/account/AccountRouteShell.vue`

## Monoliti Backend Prioritari
- `laravel-spedizionefacile-main/app/Http/Controllers/StripeCheckoutController.php`
- `laravel-spedizionefacile-main/app/Http/Controllers/StripeWebhookController.php`
- `laravel-spedizionefacile-main/app/Services/StripePaymentService.php`
- `laravel-spedizionefacile-main/app/Services/CheckoutSubmissionContextService.php`
- `laravel-spedizionefacile-main/app/Services/CartService.php`
- `laravel-spedizionefacile-main/app/Services/PriceEngineService.php`
- `laravel-spedizionefacile-main/app/Http/Controllers/OrderDetailController.php`

## Legacy Consolidabile Senza Strappi
- `pages/preventivo.vue`
- `pages/riepilogo.vue`
- `pages/checkout.vue`
- `pages/login.vue`
- `pages/registrazione.vue`
- `pages/autenticazione.vue`
- link edit carrello ancora puntati al vecchio `/riepilogo`

## Documenti Core Da Tenere
- `AGENTS.md`
- `README.md`
- `CODEX_HANDOFF_COMPLETO.md`
- `CODEX_RESTART_PACKET_2026-04-11.md`
- `CODEX_ACCOUNT_ADMIN_MEMORY_2026-04-11.md`
- `DEPLOY.md`
- `nuxt-spedizionefacile-master/docs/DESIGN_SYSTEM.md`

## Documenti Da Unire O Archiviare
- `README_TUTTOINSIEME.txt`
- `CLAUDE.md`
- `CLAUDE_CODE_CONTINUITY_PACKET.md`
- `codex-context.txt`
- `codex-handoff-full.txt`
- `ADMIN-UX-GUIDELINES-2026-04-03.md`
- `CONVERSATIONS_INDEX.md`
- `_SQUADRA_DIARIO.md`

## Prossimo Taglio Sicuro
- finire la pulizia artefatti e runtime files
- consolidare i trampolini legacy di funnel e auth senza rompere redirect o middleware
- poi aprire una corsia di refactor dei monoliti piu gravi, uno alla volta

## Riduzione Peso Locale
- peso iniziale cartella repo: circa `3,72 GB`
- peso dopo la pulizia locale: circa `0,69 GB`
- materiale spostato fuori repo in `C:\Users\Feder\Desktop\spedizionefacile_ARCHIVIO_LOCALE_2026-04-16`:
  - `_recovery`
  - `.claude/worktrees`
  - `output/` root
  - `nuxt-spedizionefacile-master/output`
  - `nuxt-spedizionefacile-master/.output`
  - `nuxt-spedizionefacile-master/playwright-report`
  - `nuxt-spedizionefacile-master/.nuxt`
- obiettivo: tenere la repo live leggera e lasciare fuori il materiale rigenerabile o storico locale

## Chiusure Tecniche Gia Verificate
- `tests/e2e/checkout.spec.ts` riallineato al contratto reale del funnel one-page:
  - `/checkout` e un alias legacy che rientra nel ventaglio
  - senza stato valido torna allo step `colli`
- `npx playwright test tests/e2e/checkout.spec.ts -g "T5.1|T5.2" --workers=1 --reporter=dot` verde
- `npm run build` verde

## Batch Sottrattivo 2 - Frontend Orfani E Root Ripulita
- eliminati file frontend senza consumer reali:
  - `nuxt-spedizionefacile-master/composables/useAdminPrezziActions.js`
  - `nuxt-spedizionefacile-master/composables/useAdminPrezziApi.js`
  - `nuxt-spedizionefacile-master/composables/useAdminPrezziComputed.js`
  - `nuxt-spedizionefacile-master/components/account/AccountShellHero.vue`
  - `nuxt-spedizionefacile-master/components/shipment/ShipmentStepSummaryCard.vue`
  - `nuxt-spedizionefacile-master/assets/css/summary-card.css`
- aggiornato `nuxt-spedizionefacile-master/nuxt.config.ts` per rimuovere il CSS morto dal bundle
- spostati fuori dalla root e archiviati in `docs/archive/root-history/`:
  - `CLAUDE_CODE_CONTINUITY_PACKET.md`
  - `ADMIN-UX-GUIDELINES-2026-04-03.md`
- sanity check dopo il taglio:
  - `npm run build` verde
  - `php artisan test tests/Feature/Payments/WalletPaymentTest.php` verde

## Stato Rumore Repo Dopo Il Batch
- untracked scesi a `44`
- shortstat corrente:
  - `376 files changed`
  - `19446 insertions`
  - `19601 deletions`
- il saldo del diff e tornato leggermente a favore delle cancellazioni

## Batch Sottrattivo 3 - Root Snellita E Funnel Meno Duplicato
- spostati in `scripts/local-tools/` i launcher secondari non necessari nella root:
  - `AVVIA_CODEX.bat`
  - `INSTALLA_CODEX_WSL.bat`
  - `claude-recover.cmd`
  - `APRI_LOG.bat`
  - `CONDIVIDI_ONLINE.bat`
  - `AVVIA_TUTTO.bat`
  - `pannello.sh`
- aggiunto `scripts/local-tools/README.md` per spiegare i tool secondari e lasciare in root solo i launcher operativi principali
- spostato fuori dalla root l'asset estraneo:
  - `MASTER-IN-CUCINA-CUOCO-PROFESSIONISTA.jpg` -> `docs/archive/root-history/`
- la root attiva resta concentrata sui file davvero operativi:
  - `AVVIA_LOCALE.bat`
  - `CHIUDI_TUTTO.bat`
  - `PANNELLO.bat`
  - `PANNELLO.ps1`
- ridotta la duplicazione nel funnel one-page:
  - `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
  - il payload conferma/pagamento ora riusa `buildSecondStepPayload(...)` invece di serializzare di nuovo tutto a mano

## Verifica Dopo Il Batch 3
- `npm run build` verde su `nuxt-spedizionefacile-master`
- peso repo live misurato dopo il batch: circa `700,1 MB`
- root repo ripulita a `21` file visibili
- rimosso il file locale spurio `nul` dalla root
- shortstat corrente:
  - `383 files changed`
  - `19396 insertions`
  - `20092 deletions`
- il diff globale resta a favore delle cancellazioni

## Batch 4 - Cleanup Codice Vero E Artefatti Rigenerabili
- ripristinato integralmente il contesto operativo in repo:
  - `_SQUADRA_DIARIO.md` resta completo
  - `laravel-spedizionefacile-main/app/Http/Controllers/LEGGERE-QUI.md` resta una guida estesa e non un pointer ridotto
- rimossi wrapper backend senza route attive:
  - `laravel-spedizionefacile-main/app/Http/Controllers/CartController.php`
  - `laravel-spedizionefacile-main/app/Http/Controllers/CustomLoginController.php`
  - `laravel-spedizionefacile-main/app/Http/Controllers/ReferralController.php`
- riallineata la mappa controller backend ai file vivi:
  - `CartTotalController.php`
  - `CartItemController.php`
  - `LoginController.php`
  - `RegisterController.php`
  - `ReferralCodeController.php`
  - `ReferralRewardController.php`
- resi data-driven i test duplicati di protezione route:
  - `nuxt-spedizionefacile-master/tests/e2e/account.spec.ts`
  - `nuxt-spedizionefacile-master/tests/e2e/admin.spec.ts`
- rimossi artefatti rigenerabili locali:
  - `nuxt-spedizionefacile-master/.output`
  - `nuxt-spedizionefacile-master/.nuxt`
  - `nuxt-spedizionefacile-master/test-results`
  - `laravel-spedizionefacile-main/storage/logs/laravel.log`
  - `laravel-spedizionefacile-main/.phpunit.result.cache`

## Verifica Dopo Il Batch 4
- `php artisan route:list --path=api` verde
- `npx playwright test tests/e2e/account.spec.ts tests/e2e/admin.spec.ts --grep "Protezione Route" --workers=1 --reporter=dot` verde
  - `81 passed`
- peso repo live dopo il batch:
  - repo: circa `634,7 MB`
  - frontend Nuxt: circa `411,8 MB`
  - backend Laravel: circa `195,1 MB`
- shortstat corrente:
  - `387 files changed`
  - `19428 insertions`
  - `20336 deletions`
- nota operativa:
  - i `100 MB` aggiuntivi non sono realistici senza toccare anche runtime o dipendenze pesanti (`node_modules`, `vendor`, `database`)

