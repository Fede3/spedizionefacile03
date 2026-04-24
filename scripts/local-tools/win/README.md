# Launcher Windows canonici

Questa cartella contiene i launcher Windows usati davvero per lo stack locale.

## Launcher principali

- `AVVIA_LOCALE.bat` - avvia lo stack locale
- `CHIUDI_TUTTO.bat` - ferma i processi del progetto
- `PANNELLO.bat` - apre il pannello PowerShell interattivo
- `PANNELLO.ps1` - core del pannello PowerShell
- `CONDIVIDI_ONLINE.bat` - aggiorna la condivisione online dal pannello

## Note

- I log locali del pannello restano in `_LOG/`
- Lo stato runtime condiviso vive in `../../../output/runtime-state/`
- I wrapper legacy rimasti fuori da `win/` non sono piu' la fonte canonica
