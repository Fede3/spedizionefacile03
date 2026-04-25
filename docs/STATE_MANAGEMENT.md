# State Management — Quando usare cosa

Guida pratica per scegliere dove vive lo stato in SpediamoFacile.

## Le 4 opzioni disponibili

```
                                  ┌─────────────────────┐
                                  │ Lo stato serve a... │
                                  └──────────┬──────────┘
                                             │
            ┌───────────┬────────────────────┼────────────────────┬─────────────┐
            │           │                    │                    │             │
            ▼           ▼                    ▼                    ▼             ▼
       Solo questo    Più componenti    Più pagine /        Persiste tra      Server-only
       componente     dello stesso      flusso intero       navigazione/      (no SSR
       (form locale,  parent (modal +   (auth, cart,        refresh           hydration)
       toggle UI)     trigger)          checkout)           (cart_user pivot,
            │           │               │                   sessionStorage)        │
            ▼           ▼               ▼                   ▼                      ▼
        ref() /     props/emit       Pinia store         Cookie/local-          server/
        reactive()  + provide        (stores/*.js)       Storage o BE             utils
```

## Albero decisionale rapido

| Caso | Tool |
|---|---|
| Apertura/chiusura di un singolo modale di pagina | `ref(false)` locale |
| Form con validazione locale | `reactive({...})` locale |
| Componente padre + figlio che condividono valore | `props` + `emit` |
| Più componenti distanti dello stesso parent | `provide`/`inject` |
| Stato condiviso fra pagine diverse (cart, auth, modal globale, funnel) | **Pinia store** (`stores/`) |
| Snapshot SSR per evitare flash di logged-out | `useCookie()` con `secure: !import.meta.dev` |
| Preferenze utente non sensibili (cookie consent, theme) | `localStorage` con wrapper |
| Dati che devono essere indipendenti dal browser (cart utente) | API backend + cache locale via store |

## Pinia: quando aggiungere un nuovo store

Un nuovo store si crea quando:

1. Lo stato è condiviso fra **almeno 2 pagine diverse** (non solo 2 componenti dello stesso parent)
2. Lo stato è interrogato da **plugin/middleware/composable diversi**
3. Lo stato persiste tra navigazioni (anche solo entro la sessione)
4. Vuoi vederlo in **Vue DevTools** per debug

### Pattern standard di uno store

```javascript
// stores/myStore.js
import { defineStore } from 'pinia'

export const useMyStore = defineStore('my', () => {
  // 1. State (ref / reactive)
  const items = ref([])
  const isLoading = ref(false)

  // 2. Getters (computed)
  const itemCount = computed(() => items.value.length)

  // 3. Actions (functions)
  async function load() {
    isLoading.value = true
    try {
      items.value = await $fetch('/api/items')
    } finally {
      isLoading.value = false
    }
  }

  // 4. Return tutto quello che serve esposto
  return { items, isLoading, itemCount, load }
})
```

### Thin wrapper composable retro-compat

Quando migri un composable esistente a Pinia, mantieni il vecchio composable
come thin wrapper così i caller esistenti non si rompono:

```javascript
// composables/useMy.js
import { storeToRefs } from 'pinia'
import { useMyStore } from '~/stores/myStore'

export const useMy = () => {
  const store = useMyStore()
  const { items, isLoading } = storeToRefs(store)
  return { items, isLoading, load: store.load }
}
```

Quando tutti i caller sono migrati a `useMyStore()` direttamente, elimina il wrapper.

## Store esistenti

| Store | File | Dominio |
|---|---|---|
| `shipmentFlowStore` | `stores/shipmentFlowStore.js` | State funnel preventivo (packages, addresses, services) |
| `authModalStore` | `stores/authModalStore.js` | Overlay login/register (open, tab, redirect, entryMode) |
| `confirmDialogStore` | `stores/confirmDialogStore.js` | Dialog conferma globale promise-based |

## Anti-pattern da evitare

❌ **God-composable**: un solo file `useX.js` con 800+ LOC che mescola state + logic + UI helpers. Da splittare in store + sub-composables.

❌ **`useState('foo')` in più file**: chiave duplicata = race condition latente (chi setta per primo vince).

❌ **`useState` per stato che vive in 1 sola pagina**: usa `ref()` locale, niente useState globale.

❌ **Store Pinia per stato locale di un componente**: overhead inutile.

❌ **Mutare props dal figlio**: usa `emit('update:value')`.
