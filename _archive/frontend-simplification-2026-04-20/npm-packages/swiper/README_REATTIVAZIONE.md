# Archivio pacchetto `swiper`

**Data archiviazione**: 2026-04-20
**Agente**: O1-A2 (Ondata 1 — refactor SpediamoFacile)
**Versione archiviata**: `^12.0.3` (resolved: `12.1.3`)

## Contesto

Il pacchetto `swiper` era dichiarato come dipendenza in `nuxt-spedizionefacile-master/package.json`
ma **non era mai importato né utilizzato** da nessun componente `.vue`, file `.ts` o `.css` del
progetto. Si trattava quindi di una **dead dependency** (dipendenza morta): scaricata e inclusa
nel bundle di vendor-splitting (~150 KB gzip-free) senza mai essere caricata a runtime.

Verifica eseguita con grep su tutto il frontend:

```bash
grep -rn "swiper\|Swiper\|useSwiper" nuxt-spedizionefacile-master/ \
  --include="*.vue" --include="*.ts" --include="*.css"
```

Risultato: solo `package.json`, `package-lock.json` e `nuxt.config.ts` (manualChunks vendor-swiper).

Nessun componente sostituito con CSS `scroll-snap-type` perché non esisteva alcun carousel
Swiper nel codice sorgente. Lo step di sostituzione richiesto dal task è stato quindi un no-op.

## File archiviati

- `original-files/package.json` — stato originale con `"swiper": "^12.0.3"` (riga 48)
- `original-files/nuxt.config.ts` — stato originale con `if (id.includes('swiper')) return 'vendor-swiper';` in `manualChunks`

## Come riattivare

### 1. Ri-installare la dipendenza

Dalla root del frontend (`nuxt-spedizionefacile-master/`):

```bash
npm install swiper@^12.0.3
```

Oppure, per mantenere la stessa versione risolta (12.1.3):

```bash
npm install swiper@12.1.3
```

### 2. Ripristinare il manualChunks in `nuxt.config.ts`

Re-inserire la riga nella funzione `manualChunks` del blocco `vite.build.rollupOptions.output`
(circa riga 355 del file originale archiviato):

```ts
manualChunks(id) {
  if (id.includes('@stripe/stripe-js')) return 'vendor-stripe';
  if (id.includes('swiper')) return 'vendor-swiper'; // <-- re-aggiungere
  if (id.includes('pinia')) return 'vendor-pinia';
  if (id.includes('leaflet')) return 'vendor-leaflet';
  if (id.includes('@tiptap')) return 'vendor-tiptap';
},
```

### 3. Usare Swiper in un componente (esempio)

```vue
<script setup lang="ts">
import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/css'
</script>

<template>
  <Swiper :slides-per-view="3" :space-between="16">
    <SwiperSlide v-for="slide in slides" :key="slide.id">
      <!-- contenuto slide -->
    </SwiperSlide>
  </Swiper>
</template>
```

## Alternativa CSS-nativa (raccomandata)

In molti casi uno slider orizzontale si ottiene con `scroll-snap` senza alcuna libreria:

```html
<div class="flex overflow-x-auto snap-x snap-mandatory gap-4 scrollbar-none">
  <div class="snap-start flex-shrink-0 w-full md:w-1/3" v-for="slide in slides" :key="slide.id">
    <!-- contenuto slide -->
  </div>
</div>
```

Zero runtime JS, zero bundle cost, nativo del browser (supporto 98%+).
