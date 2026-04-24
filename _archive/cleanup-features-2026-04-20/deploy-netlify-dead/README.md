# Deploy Netlify — Archiviato 2026-04-21

## Motivo
Il progetto NON usa Netlify come production stack:
- Production actual = Caddy + Docker Compose
- Nessun workflow CI/CD fa riferimento a Netlify
- `package.json` scripts non usano Netlify
- File residui da scaffolding iniziale, mai rimossi

## File
- `netlify.toml` (1.9 KB)
- `prepare-netlify.bat` (1.8 KB)
- `prepare-netlify.sh` (2.3 KB)

## Riattivare (se si deciderà di deployare su Netlify)
```bash
cp _archive/cleanup-features-2026-04-20/deploy-netlify-dead/* nuxt-spedizionefacile-master/
chmod +x nuxt-spedizionefacile-master/prepare-netlify.sh
```
