# Come aggiungere una nuova pagina al frontend

Questa guida spiega come aggiungere una pagina al sito usando Nuxt 3.

---

## Come funziona il routing in Nuxt

Nuxt genera automaticamente le rotte in base ai file nella cartella `pages/`.
Non serve configurare un router manualmente.

| File | URL generata |
|---|---|
| `pages/index.vue` | `/` |
| `pages/chi-siamo.vue` | `/chi-siamo` |
| `pages/servizi/index.vue` | `/servizi` |
| `pages/servizi/[slug].vue` | `/servizi/qualsiasi-valore` |
| `pages/account/profilo.vue` | `/account/profilo` |

---

## Creare una pagina statica semplice

### Esempio: pagina "Lavora con noi"

Crea il file `nuxt-spedizionefacile-master/pages/lavora-con-noi.vue`:

```vue
<template>
  <div class="container mx-auto px-4 py-8">
    <Breadcrumb :items="[{ label: 'Home', to: '/' }, { label: 'Lavora con noi' }]" />

    <h1 class="text-3xl font-bold mb-6">Lavora con noi</h1>

    <p class="mb-4">
      SpediamoFacile e' sempre alla ricerca di persone motivate.
    </p>

    <h2 class="text-xl font-semibold mb-3">Posizioni aperte</h2>

    <ul class="list-disc pl-6">
      <li>Sviluppatore frontend (Vue.js/Nuxt)</li>
      <li>Sviluppatore backend (Laravel/PHP)</li>
    </ul>
  </div>
</template>

<script setup>
useHead({
  title: 'Lavora con noi - SpediamoFacile',
  meta: [
    { name: 'description', content: 'Posizioni aperte in SpediamoFacile' },
  ],
});
</script>
```

La pagina sara' disponibile su `/lavora-con-noi`.

---

## Creare una pagina con dati dal backend

### Esempio: pagina "Ultime notizie"

```vue
<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">Ultime notizie</h1>

    <div v-if="status === 'pending'">
      <USkeleton class="h-20 w-full mb-4" v-for="i in 3" :key="i" />
    </div>

    <div v-else-if="error">
      <UAlert color="red" title="Errore nel caricamento" />
    </div>

    <div v-else>
      <div v-for="news in data" :key="news.id" class="mb-6 p-4 border rounded">
        <h2 class="font-semibold">{{ news.title }}</h2>
        <p>{{ news.content }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
const { data, status, error } = await useSanctumFetch('/api/news');
</script>
```

La funzione `useSanctumFetch` gestisce automaticamente:
- Il cookie CSRF
- I cookie di autenticazione
- L'URL base del backend (da `nuxt.config.ts`)

---

## Creare una pagina protetta (richiede login)

Aggiungi il middleware `sanctum:auth` per richiedere l'autenticazione:

```vue
<script setup>
definePageMeta({
  middleware: ['sanctum:auth'],
});
</script>
```

Se l'utente non e' loggato, verra' reindirizzato a `/autenticazione`.

---

## Creare una pagina solo per admin

```vue
<script setup>
definePageMeta({
  middleware: ['sanctum:auth', 'admin'],
});
</script>
```

Il middleware `admin` si trova in `nuxt-spedizionefacile-master/middleware/admin.js` e verifica che l'utente abbia il ruolo "Admin".

---

## Aggiungere la pagina al menu di navigazione

Il menu si trova in `nuxt-spedizionefacile-master/components/Navbar.vue`.

Aggiungi un link:

```vue
<NuxtLink to="/lavora-con-noi">Lavora con noi</NuxtLink>
```

---

## Pagine dinamiche (con parametri)

Per creare una pagina che accetta un parametro nell'URL, usa le parentesi quadre nel nome del file.

Esempio: `pages/notizie/[id].vue` per URL tipo `/notizie/42`

```vue
<template>
  <div>
    <h1>{{ news.title }}</h1>
    <p>{{ news.content }}</p>
  </div>
</template>

<script setup>
const route = useRoute();
const newsId = route.params.id;

const { data: news } = await useSanctumFetch('/api/news/' + newsId);
</script>
```

---

## Pagine esistenti nel progetto

| Pagina | File | Descrizione |
|---|---|---|
| Homepage | `pages/index.vue` | Pagina principale con preventivo rapido |
| Preventivo | `pages/preventivo.vue` | Configurazione preventivo |
| Spedizione step | `pages/la-tua-spedizione/[step].vue` | Configurazione multi-step |
| Carrello | `pages/carrello.vue` | Carrello della spesa |
| Checkout | `pages/checkout.vue` | Pagamento |
| Riepilogo | `pages/riepilogo.vue` | Riepilogo post-pagamento |
| Login | `pages/autenticazione.vue` | Login/Registrazione |
| Registrazione | `pages/registrazione.vue` | Registrazione |
| Account | `pages/account/index.vue` | Dashboard account |
| Profilo | `pages/account/profilo.vue` | Modifica profilo |
| Spedizioni | `pages/account/spedizioni/index.vue` | Lista spedizioni |
| Portafoglio | `pages/account/portafoglio.vue` | Portafoglio virtuale |
| Carte | `pages/account/carte.vue` | Carte di credito |
| Indirizzi | `pages/account/indirizzi/index.vue` | Rubrica indirizzi |
| Admin | `pages/account/amministrazione/index.vue` | Pannello admin |
| Contatti | `pages/contatti.vue` | Modulo contatti |
| FAQ | `pages/faq.vue` | Domande frequenti |
| Chi siamo | `pages/chi-siamo.vue` | Informazioni azienda |
| Servizi | `pages/servizi/index.vue` | Lista servizi |
| Tracking | `pages/traccia-spedizione.vue` | Tracking pubblico |
| Cookie Policy | `pages/cookie-policy.vue` | Informativa cookie |
| Privacy Policy | `pages/privacy-policy.vue` | Informativa privacy |
| Termini | `pages/termini-condizioni.vue` | Termini e condizioni |

---

## SEO e metadati

Ogni pagina dovrebbe avere i metadati SEO:

```javascript
useHead({
  title: 'Titolo pagina - SpediamoFacile',
  meta: [
    { name: 'description', content: 'Descrizione della pagina per Google' },
  ],
});
```

Il titolo predefinito del sito e' configurato in `nuxt.config.ts` dentro `app.head.title`.
