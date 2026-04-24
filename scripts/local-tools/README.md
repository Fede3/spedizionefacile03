# Tool locali secondari

Questa cartella contiene launcher e utility locali che non fanno parte del
runtime dell'app. La root resta volutamente minima: le utility sono raccolte
per area, non mescolate al codice vivo del progetto.

## Struttura

- `win/`
  Launcher Windows canonici del progetto e log locali del pannello.
- `codex/`
  Utility locali per Codex/WSL, separate dagli script operativi del progetto.
- `claude/`
  Utility locali di continuità sessione Claude, fuori dalla root repo.
- `pannello.sh`
  Launcher Bash locale legacy, da tenere separato dal runtime dell'app.

## Uso rapido

Da PowerShell in root repo:

```powershell
.\scripts\local-tools\win\PANNELLO.bat
```

Oppure con double-click dal File Explorer sui launcher Windows dentro `win/`.

## Stato condiviso

Lo stato runtime condiviso del progetto vive in `../../output/runtime-state/`.
Gli script canonici leggono e scrivono gli stessi:

- `URL_ONLINE.txt`
- `_STATE.json`
- `_PORTS.json`

I log locali del pannello restano invece sotto `win/_LOG/`.

## Alternative cross-platform

Per Linux/macOS usa gli script `.sh` in `scripts/`, per esempio:

- `scripts/avvia-locale.sh`
- `scripts/avvia-tutto.sh`
