# Dipendenze Tiptap rimosse da `nuxt-spedizionefacile-master/package.json`

Data rimozione: 2026-04-20
Agente: O1-A1 (Ondata 1)
File sorgente: `nuxt-spedizionefacile-master/package.json` (sezione `dependencies`)

## Blocco rimosso

```json
"@tiptap/extension-color": "^3.20.4",
"@tiptap/extension-image": "^3.20.4",
"@tiptap/extension-link": "^3.20.4",
"@tiptap/extension-text-style": "^3.20.4",
"@tiptap/extension-underline": "^3.20.4",
"@tiptap/starter-kit": "^3.20.4",
"@tiptap/vue-3": "^3.20.4",
```

## Modifiche correlate in `nuxt.config.ts`

Rimossa riga `if (id.includes('@tiptap')) return 'vendor-tiptap';`
dal blocco `manualChunks()` di `vite.build.rollupOptions.output`.
Non servono più chunk dedicati perche' il pacchetto non e' piu' in bundle.

## Motivo

`components/admin/RichTextEditor.vue` era l'unico consumer (tutta la logica Tiptap viveva lì).
Nessuna pagina importava il componente: le admin page guide/servizi usano già `<textarea>` nativo.
L'architettura Tiptap aggiungeva ~300kB gzippati al bundle senza uso reale a runtime.
