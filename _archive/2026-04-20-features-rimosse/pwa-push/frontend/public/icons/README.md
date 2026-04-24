# Icone PWA — SpediamoFacile

Le icone referenziate da `/public/manifest.json` vanno salvate in questa cartella.

## File richiesti

- `icon-72.png`  (72x72)
- `icon-96.png`  (96x96)
- `icon-128.png` (128x128)
- `icon-144.png` (144x144)
- `icon-152.png` (152x152)
- `icon-192.png` (192x192) — purpose: any
- `icon-192-maskable.png` (192x192) — purpose: maskable (con safe area 80%)
- `icon-384.png` (384x384)
- `icon-512.png` (512x512) — purpose: any
- `icon-512-maskable.png` (512x512) — purpose: maskable

## Come generarle

1. Partire da un SVG/PNG sorgente quadrato 1024x1024 con il logo SpediamoFacile su sfondo `#095866`.
2. Per i file `*-maskable.png` lasciare un padding interno del 20% (Android Adaptive Icons).
3. Tool consigliati:
   - https://realfavicongenerator.net/  (genera tutte le size + verifica)
   - oppure `npx pwa-asset-generator logo.svg ./public/icons --background "#095866"`

In assenza di queste icone l'installazione PWA usa il favicon (48x48) con
qualita' grafica ridotta su Android. Funziona ma e' fortemente consigliato
generarle prima del go-live.
