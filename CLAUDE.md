# REGOLE OBBLIGATORIE PER CLAUDE

## ⚠️ TESTING OBBLIGATORIO - PRIORITÀ ASSOLUTA

**PRIMA DI DIRE "FATTO" O "PRONTO", ESEGUIRE SEMPRE QUESTI TEST:**

### 1. VERIFICA COMPONENTI ICON (ERRORE COMUNE)
```bash
# Cerca tutti i componenti <Icon> che causano errori
grep -rn "<Icon" nuxt-spedizionefacile-master/pages/
grep -rn "<Icon" nuxt-spedizionefacile-master/components/

# SE TROVI <Icon> → SOSTITUISCI CON SVG INLINE
# Il progetto NON ha @iconify installato!
```

### 2. VERIFICA IMPORT MANCANTI
```bash
# Cerca import di librerie non installate
grep -rn "import.*from.*@iconify" nuxt-spedizionefacile-master/
grep -rn "import.*Icon" nuxt-spedizionefacile-master/

# SE TROVI IMPORT DI ICON → RIMUOVI
```

### 3. VERIFICA SINTASSI VUE
```bash
# Controlla che non ci siano tag non chiusi o errori sintattici
cd nuxt-spedizionefacile-master
npm run lint 2>&1 | head -50
```

### 4. VERIFICA BUILD (se possibile)
```bash
# Testa che il progetto compili senza errori
cd nuxt-spedizionefacile-master
npm run build 2>&1 | grep -i "error" | head -20
```

### 5. VERIFICA CONSOLE ERRORS
```bash
# Cerca console.error, console.warn nel codice
grep -rn "console.error\|console.warn" nuxt-spedizionefacile-master/pages/la-tua-spedizione/
```

---

## 📋 CHECKLIST PRE-COMPLETAMENTO

Prima di dire all'utente che il lavoro è completato:

- [ ] ✅ Nessun componente `<Icon>` nel codice
- [ ] ✅ Nessun import di librerie non installate
- [ ] ✅ Sintassi Vue corretta (lint passa)
- [ ] ✅ Build funziona (se testabile)
- [ ] ✅ Nessun console.error prevedibile
- [ ] ✅ File modificati verificati con grep

---

## 🚫 ERRORI DA EVITARE SEMPRE

### 1. Componente `<Icon>`
**SITUAZIONE**:
- Il componente `<Icon>` È disponibile (da @nuxt/ui)
- SOLO icon set `mdi:*` è installato (@iconify-json/mdi)
- Altri set come `eos-icons:*` NON sono disponibili

**SOLUZIONE**: Usare SEMPRE SVG inline per performance e indipendenza

❌ **SBAGLIATO** (causa errore):
```vue
<Icon name="eos-icons:bubble-loading" />
```

⚠️ **FUNZIONA MA SCONSIGLIATO**:
```vue
<Icon name="mdi:arrow-left" />
```

✅ **CORRETTO** (preferito):
```vue
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
  <path d="M19 12H5M12 19l-7-7 7-7"/>
</svg>
```

**PERCHÉ SVG INLINE È MEGLIO:**
- ✅ Nessuna dipendenza da icon set esterni
- ✅ Più veloce (no runtime lookup)
- ✅ Più esplicito e manutenibile
- ✅ Funziona sempre, zero errori

### 2. Import mancanti
**PROBLEMA**: Import di librerie non presenti in package.json
**SOLUZIONE**: Verificare package.json PRIMA di usare import

### 3. Variabili undefined
**PROBLEMA**: Usare variabili non dichiarate in script setup
**SOLUZIONE**: Verificare che tutte le variabili siano dichiarate con ref/reactive

---

## 🔧 COMANDI UTILI

### Verifica rapida file modificato
```bash
# Dopo aver modificato un file Vue
FILE="pages/la-tua-spedizione/[step].vue"

# 1. Cerca Icon
grep -n "<Icon" $FILE

# 2. Cerca import problematici
grep -n "import.*Icon\|import.*@iconify" $FILE

# 3. Conta modifiche
git diff --stat $FILE

# 4. Verifica sintassi
npm run lint $FILE 2>&1 | head -20
```

### Installare dipendenze mancanti (se necessario)
```bash
cd nuxt-spedizionefacile-master

# Verifica cosa è installato
npm list | grep -i icon

# Se serve installare qualcosa (CHIEDERE PRIMA ALL'UTENTE)
# npm install @iconify-json/mdi
```

---

## 📝 PROCESSO STANDARD

1. **MODIFICA** il codice
2. **VERIFICA** con grep/lint (OBBLIGATORIO)
3. **TESTA** build se possibile
4. **DOCUMENTA** le modifiche
5. **SOLO DOPO** dire all'utente "FATTO"

---

## ⚡ REGOLA D'ORO

**NON DIRE MAI "È PRONTO" SENZA AVER ESEGUITO I TEST**

Se trovi errori durante i test:
1. Correggili IMMEDIATAMENTE
2. Ri-testa
3. Solo dopo comunica all'utente

---

## 🎯 OBIETTIVO

**ZERO ERRORI NEL TERMINALE**
**ZERO ERRORI IN CONSOLE BROWSER**
**ZERO IMPORT MANCANTI**

Questo documento è la BIBBIA del testing. Seguirlo SEMPRE.
