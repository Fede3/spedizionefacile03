# CSS Orfani — Archiviati 2026-04-20

## Motivo
File CSS non importati da nessun componente, pagina o main.css.

## Lista
- **steps.css** — stilava il vecchio component `Steps.vue` (anch'esso archiviato)
- **homepage-servizi.css** — stilava `HomepageServizi.vue` (archiviato, rimpiazzato da markup inline in `pages/index.vue`)

## Come riattivare
Se in futuro si ripristina `Steps.vue` o `HomepageServizi.vue`:
```bash
mv _archive/frontend-simplification-2026-04-20/css-orfani/steps.css nuxt-spedizionefacile-master/assets/css/
mv _archive/frontend-simplification-2026-04-20/css-orfani/homepage-servizi.css nuxt-spedizionefacile-master/assets/css/
```
E reimportare dal componente relativo.
