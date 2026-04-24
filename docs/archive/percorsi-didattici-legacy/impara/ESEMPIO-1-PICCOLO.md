# Esempio 1 - Piccola modifica

## Cosa imparerai

- Come trovare un file nel progetto
- Come modificare il colore di un pulsante
- Cosa significa ogni parte del codice che tocchi
- Come verificare che la modifica funziona


---


## L'obiettivo

Cambieremo il colore del pulsante **"Calcola il tuo preventivo"** che si trova in fondo alla homepage.

Questo pulsante e' arancione. Lo faremo diventare di un altro colore.


---


## Passo 1 - Trova il file giusto

La homepage e' il file:

```
nuxt-spedizionefacile-master/pages/index.vue
```

### Come trovare un file

Ci sono due modi:

**Modo 1 - Naviga nelle cartelle:**
- Apri la cartella `nuxt-spedizionefacile-master`
- Apri la sottocartella `pages`
- Apri il file `index.vue`

**Modo 2 - Usa la ricerca (piu' veloce):**
- Nel tuo editor di testo, premi `Ctrl + P` (Windows) o `Cmd + P` (Mac)
- Scrivi `index.vue`
- Scegli il file nella cartella `pages`


---


## Passo 2 - Trova il pulsante nel codice

Apri il file `index.vue`. Vedrai questo codice nella parte `<template>`:

```html
<!-- File: nuxt-spedizionefacile-master/pages/index.vue, riga 78-83 -->

<NuxtLink
    to="/preventivo"
    class="inline-block bg-[#E44203] text-white px-[32px] py-[16px] rounded-[35px] font-semibold text-[1rem] desktop:text-[1.125rem] btn-hover">
    Calcola il tuo preventivo
</NuxtLink>
```

### Come trovare questa riga

- Premi `Ctrl + F` (Windows) o `Cmd + F` (Mac)
- Scrivi `Calcola il tuo preventivo`
- Il cursore si sposta sulla riga giusta


---


## Passo 3 - Capisci cosa significa ogni pezzo

Spezziamo il codice pezzo per pezzo.

| Pezzo di codice | Cosa significa |
|-----------------|----------------|
| `<NuxtLink>` | Un link cliccabile (come `<a>` in HTML) |
| `to="/preventivo"` | Dove porta il link: la pagina del preventivo |
| `bg-[#E44203]` | Il colore di sfondo. `#E44203` e' l'arancione |
| `text-white` | Il testo e' bianco |
| `px-[32px]` | Spazio a sinistra e destra del testo (32 pixel) |
| `py-[16px]` | Spazio sopra e sotto il testo (16 pixel) |
| `rounded-[35px]` | Gli angoli sono arrotondati |
| `font-semibold` | Il testo e' in grassetto medio |
| `btn-hover` | Effetto quando passi sopra col mouse |

### Cosa sono i colori esadecimali

I colori nel web si scrivono con il simbolo `#` seguito da 6 caratteri.

Ecco alcuni esempi:

| Codice | Colore |
|--------|--------|
| `#E44203` | Arancione (il colore attuale) |
| `#095866` | Verde scuro (il colore principale del sito) |
| `#FF0000` | Rosso |
| `#0000FF` | Blu |
| `#22C55E` | Verde chiaro |
| `#000000` | Nero |
| `#FFFFFF` | Bianco |


---


## Passo 4 - Fai la modifica

### PRIMA (codice originale)

```html
class="inline-block bg-[#E44203] text-white px-[32px] py-[16px] rounded-[35px] font-semibold text-[1rem] desktop:text-[1.125rem] btn-hover"
```

### DOPO (codice modificato)

Per cambiare il colore in verde scuro (il colore principale del sito), sostituisci `#E44203` con `#095866`:

```html
class="inline-block bg-[#095866] text-white px-[32px] py-[16px] rounded-[35px] font-semibold text-[1rem] desktop:text-[1.125rem] btn-hover"
```

### Cosa hai cambiato

Solo una cosa: `bg-[#E44203]` e' diventato `bg-[#095866]`.

- `bg-` significa "background" (sfondo)
- `#E44203` era arancione
- `#095866` e' verde scuro

Tutto il resto resta uguale.


---


## Passo 5 - Verifica la modifica

### Come vedere il risultato

1. **Apri il terminale** nel tuo editor
2. **Vai nella cartella del frontend:**
   ```
   cd nuxt-spedizionefacile-master
   ```
3. **Avvia il sito in locale** (se non e' gia' avviato):
   ```
   npm run dev
   ```
4. **Apri il browser** e vai su: `http://localhost:3001`
5. **Scorri in basso** nella homepage
6. Vedrai il pulsante con il nuovo colore

### Se qualcosa non funziona

- Controlla di aver salvato il file
- Controlla che non ci siano errori nel terminale
- Controlla di non aver cancellato o aggiunto caratteri per errore
- Prova a confrontare il tuo codice con l'originale


---


## Passo 6 - Annulla la modifica (facoltativo)

Se vuoi tornare al colore originale, rimetti `#E44203` al posto di `#095866`.

Oppure premi `Ctrl + Z` (Windows) o `Cmd + Z` (Mac) per annullare.


---


## Cosa hai imparato

- I file delle pagine sono nella cartella `pages/`
- Il file della homepage si chiama `index.vue`
- I colori si scrivono con il formato `#XXXXXX`
- Le classi CSS come `bg-[#E44203]` definiscono lo stile visivo
- Per trovare un testo nel codice, usa `Ctrl + F`
- Per vedere le modifiche, il sito deve essere avviato con `npm run dev`


---


## Prossimo passo

Vai a **[Esempio 2 - Modifica media](./ESEMPIO-2-MEDIO.md)** per imparare a toccare sia il frontend che il backend.
