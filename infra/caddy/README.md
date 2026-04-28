# infra/caddy — Reverse proxy locale (dev)

Il `Caddyfile` di root espone frontend + backend su `http://127.0.0.1:8787`.
La prod gira su **Render** (`infra/render/`), non usa Caddy.

## File

- `Caddyfile` (root repo) — config attiva, caricata da `caddy run`.
- `Caddyfile.example` — template minimale di riferimento.
