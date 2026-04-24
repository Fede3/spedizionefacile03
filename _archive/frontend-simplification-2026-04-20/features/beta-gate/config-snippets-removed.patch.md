# Config Snippets Rimossi — Beta Gate

## 1. `nuxt.config.ts`

### `runtimeConfig.public` (righe ~147-151 prima della rimozione)

```ts
// Beta gate soft-launch. 'true' = solo email in betaEmails.
betaMode: process.env.NUXT_PUBLIC_BETA_MODE ?? 'false',
betaEmails: process.env.NUXT_PUBLIC_BETA_EMAILS ?? '',
```

### `sitemap.exclude` (una entry in mezzo all'array)

```ts
'/beta-invite',
```

## 2. `public/robots.txt`

Linea **MANTENUTA** (innocua anche senza la pagina):

```
Disallow: /beta-invite
```
