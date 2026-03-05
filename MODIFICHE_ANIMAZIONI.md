# Modifiche Animazioni Preventivo.vue

## Data: 2026-03-02

---

## MODIFICHE FINALI CHE FUNZIONANO ✅

### 1. Durate Aumentate per Massima Fluidità
**File**: `components/Preventivo.vue` (CSS)

**Durate finali**:
- Fast: 350ms (errori, tooltip, feedback)
- Medium: 700ms (bottoni, card)
- Slow: 1000ms (layout, selettori, sezioni)

**Risultato**: Animazioni più lente e fluide, nessuna sensazione di fretta.

---

### 2. Selettore Sale Verso l'Alto
**File**: `components/Preventivo.vue` (CSS)

**Modifiche**:
```css
.selector-leave-to {
  opacity: 0;
  transform: translateY(-30px) scale(0.96);
}
```

**Risultato**: Il selettore sale verso l'alto quando scompare (non scende).

---

### 3. Position Absolute Durante Scomparsa
**File**: `components/Preventivo.vue` (CSS)

**Modifiche**:
```css
.selector-leave-active {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

.selector-shell:has(.selector-leave-active) {
  min-height: 260px;
  transition: min-height var(--pm-duration-slow) var(--pm-ease);
}
```

**Risultato**: Lo spazio non collassa durante l'animazione, evita scatti.

---

### 4. Tutte le Transizioni a 1000ms
**File**: `components/Preventivo.vue` (template + CSS)

**Elementi aggiornati**:
- Container principale: 1000ms
- Form: 1000ms
- Banner promo: 1000ms
- Bottone "Continua": 1000ms
- Selector shell: 1000ms
- Pack section: 1000ms
- Add button slot: 1000ms

**Risultato**: Tutto si muove in modo coordinato alla stessa velocità.

---

### 5. Delay Aumentato a 300ms
**File**: `components/Preventivo.vue` (JavaScript)

**Modifica**:
```javascript
await new Promise((resolve) => setTimeout(resolve, 300));
```

**Sequenza finale**:
1. Click su tipo collo → card conferma (700ms)
2. Selettore sale e scompare (1000ms)
3. Pausa di 300ms
4. Box dimensioni appare dal basso (1000ms)
5. Bottone "Aggiungi collo" appare (850ms dopo inizio box)

**Risultato**: Sequenza completamente fluida, nessuna sovrapposizione.

---

## RIEPILOGO COMPLETO

### Tutti gli elementi con transizioni coordinate:
1. **Container bianco**: height, min-height, max-height, padding (1000ms)
2. **Form**: height, min-height (1000ms)
3. **Selector shell**: min-height, margin-top, transform (1000ms)
4. **Selector**: opacity, transform (1000ms) - sale verso l'alto
5. **Pack section**: opacity, transform, margin, max-height (1000ms)
6. **Pack list items**: opacity, transform, margin, height (700ms leave, 1000ms move)
7. **Add button slot**: transform, margin-top (1000ms)
8. **Banner promo**: margin-top, transform (1000ms)
9. **Bottone "Continua"**: margin-top, height, background, box-shadow (1000ms)

### Easing uniforme:
`cubic-bezier(0.25, 0.46, 0.45, 0.94)` - curva morbida tipo iOS

---

### 1. Sistema di Timing a 3 Livelli
**File**: `components/Preventivo.vue` (CSS + JavaScript)

**Durate**:
- Fast: 280ms (errori, tooltip, feedback)
- Medium: 550ms (bottoni, card, transizioni piccole)
- Slow: 750ms (layout, selettori, sezioni grandi)

**Overlap**:
- Tight: 50ms
- Medium: 100ms
- Loose: 150ms

**Easing**: `cubic-bezier(0.25, 0.46, 0.45, 0.94)` - curva morbida tipo iOS

**Oggetto TIMING in JavaScript**:
```javascript
const TIMING = {
  fast: 0,
  medium: 0,
  slow: 0,
  overlapTight: 0,
  overlapMedium: 0,
  overlapLoose: 0,
  // ... getters per overlap
  init() { /* legge valori CSS */ }
}
```

**Risultato**: Animazioni più fluide e coordinate tra CSS e JavaScript.

---

### 2. Spacing Corretto
**File**: `components/Preventivo.vue` (template)

**Modifiche**:
- Bottone "Aggiungi collo": `mt-[20px] tablet:mt-[28px]`
- Bottone "Continua": `mt-[32px] tablet:mt-[40px]`

**Risultato**: Spacing proporzionato, non più appiccicato.

---

### 3. Animazioni Fluide Eliminazione Box
**File**: `components/Preventivo.vue` (CSS)

**Modifiche**:
```css
.pack-list-leave-active {
  transition:
    opacity var(--pm-duration-medium) var(--pm-ease),
    transform var(--pm-duration-medium) var(--pm-ease),
    margin var(--pm-duration-medium) var(--pm-ease),
    height var(--pm-duration-medium) var(--pm-ease);
}

.pack-list-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
  margin-top: 0;
  margin-bottom: 0;
  height: 0;
  overflow: hidden;
}
```

**Transizioni aggiunte a**:
- `.pack-section-leave-active`: max-height, margin
- `.selector-shell`: min-height, margin-top, transform
- `.add-button-slot`: durata aumentata a slow (750ms)
- Banner promo: margin-top, transform

**Risultato**: Quando elimini un box, tutti gli elementi salgono in modo coordinato e fluido.

---

### 4. Selettore con Position Absolute
**File**: `components/Preventivo.vue` (CSS)

**Modifiche**:
```css
.selector-leave-active {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 5;
}

.selector-shell:has(.selector-leave-active) {
  min-height: 240px;
}
```

**Risultato**: Il selettore non viene spinto verso il basso quando appare il box dimensioni.

---

## PROBLEMI RISOLTI ✅

### 1. Sovrapposizione Box Selettore e Box Dimensioni - RISOLTO
**Problema**: I due box si sovrapponevano visivamente
**Soluzione**: Sequenza completamente separata con delay di 200ms

**Implementazione**:
```javascript
const onSelectorAfterLeave = async () => {
  // ... gestione casi speciali ...

  // Aspetta 200ms DOPO che il selettore è scomparso
  await new Promise((resolve) => setTimeout(resolve, 200));

  // ADESSO mostra il box dimensioni
  showPackSection.value = true;
}
```

**Sequenza finale**:
1. Click su tipo collo → card conferma (550ms)
2. Selettore fade out (750ms) - scompare completamente
3. Pausa di 200ms - schermo pulito
4. Box dimensioni fade in (750ms) - appare dal basso
5. Bottone "Aggiungi collo" appare (600ms dopo inizio box)

**Risultato**: Animazioni completamente sequenziali, nessuna sovrapposizione, movimento fluido.

---

### 2. Container Principale Fluido - RISOLTO
**Problema**: Il box bianco del preventivo non si espandeva/contraeva in modo fluido
**Soluzione**: Transizioni coordinate su container e form

**Implementazione**:
```html
<!-- Container principale -->
<div class="bg-white ... transition-[height,min-height,max-height,padding] duration-[750ms]"
     style="transition-timing-function: var(--pm-ease)">

<!-- Form interno -->
<form class="transition-[height,min-height] duration-[750ms]"
      style="transition-timing-function: var(--pm-ease)">
```

**Elementi con transizioni coordinate**:
- Container principale: height, min-height, max-height, padding (750ms)
- Form: height, min-height (750ms)
- Selector shell: margin-top, transform (750ms)
- Add button slot: transform, margin-top (750ms)
- Banner promo: margin-top, transform (750ms)
- Bottone "Continua": margin-top, height (750ms)

**Risultato**: Tutto il preventivo si espande/contrae in modo fluido e coordinato quando aggiungi/rimuovi box.

---

## PROBLEMI ANCORA PRESENTI ❌

Nessuno - tutte le animazioni sono ora fluide e coordinate.

---

### 1. Sovrapposizione Box Selettore e Box Dimensioni
**Problema**: Quando clicco su un tipo di collo:
- Il box dimensioni appare SOPRA il selettore nel DOM
- I due box si sovrappongono visivamente
- Non c'è una sequenza chiara: prima muovi, poi scompari, poi appari

**Causa**: Il box dimensioni è PRIMA del selettore nel DOM (riga 1491 vs riga 1725)

**Soluzione necessaria**:
1. Il selettore deve prima muoversi (preparazione)
2. POI inizia a scomparire
3. SOLO quando il selettore è quasi scomparso, appare il box dimensioni
4. Tutto sequenziale, senza sovrapposizioni

---

## MODIFICHE CHE NON HANNO FUNZIONATO ❌

### 1. Overlap tra Selettore e Box Dimensioni
**Tentativo**: Far apparire il box dimensioni mentre il selettore sta scomparendo
**Problema**: Sovrapposizione visiva confusa, non fluido
**Motivo**: Il box dimensioni è SOPRA nel DOM, quindi spinge il selettore

### 2. Durate Troppo Lente (1200ms)
**Tentativo**: Animazioni molto lente per maggiore fluidità
**Problema**: Zone morte, sensazione di lentezza
**Motivo**: Troppo lento = sembra rotto

### 3. Delay Fissi tra Animazioni
**Tentativo**: Delay di 100ms, 150ms, 400ms tra le animazioni
**Problema**: O troppo veloce (sovrapposizione) o troppo lento (zona morta)
**Motivo**: Non coordinato con le durate CSS

---

## PROSSIMI STEP 🔧

1. **Sequenza Animazione Corretta**:
   - Click su tipo collo
   - Selettore si prepara (piccolo movimento)
   - Selettore inizia fade out (750ms)
   - A 500ms: box dimensioni inizia fade in
   - Selettore finisce di scomparire
   - Box dimensioni finisce di apparire
   - Bottone "Aggiungi collo" appare

2. **Coordinamento Perfetto**:
   - Usare `TIMING.slow` per tutte le durate
   - Overlap di 250ms tra selettore out e box in
   - Nessuna sovrapposizione visiva

---

## NOTE TECNICHE

- **File principale**: `nuxt-spedizionefacile-master/components/Preventivo.vue`
- **Righe CSS**: 1971-2300
- **Righe JavaScript**: 489-793
- **Variabili CSS**: `:root` in `.preventivo-motion-root`
- **Oggetto TIMING**: Inizializzato in `onMounted()`
