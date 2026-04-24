# Riattivazione Tiptap editor

Archiviato il **2026-04-20** dall'agente **O1-A1** (Ondata 1 — refactor SpediamoFacile).

Motivo: Tiptap era importato solo da `components/admin/RichTextEditor.vue`, ma nessuna pagina admin ne faceva uso effettivo (le pagine guide/servizi usano `<textarea>` nativo). Rimosso per alleggerire il bundle (~300kB gz).

## Come riattivare

1. **Ripristina le 7 dipendenze in `nuxt-spedizionefacile-master/package.json`** (blocco sotto `@tailwindcss/vite`, prima di `@vue-leaflet/vue-leaflet`):

```json
"@tiptap/extension-color": "^3.20.4",
"@tiptap/extension-image": "^3.20.4",
"@tiptap/extension-link": "^3.20.4",
"@tiptap/extension-text-style": "^3.20.4",
"@tiptap/extension-underline": "^3.20.4",
"@tiptap/starter-kit": "^3.20.4",
"@tiptap/vue-3": "^3.20.4",
```

2. **Ripristina il chunk in `nuxt.config.ts`** dentro `manualChunks()`:

```ts
if (id.includes('@tiptap')) return 'vendor-tiptap';
```

3. **Esegui `npm install`** nella cartella `nuxt-spedizionefacile-master/`.

4. **Sposta il file originale** da `original-files/components/admin/RichTextEditor.vue` a `nuxt-spedizionefacile-master/components/admin/RichTextEditor.vue` (sovrascrivendo la versione `<textarea>` minima introdotta in sostituzione).

5. **Rimuovi la dipendenza inline da DOMPurify** dal componente se non già presente tra i pacchetti (è già in `dependencies` come `isomorphic-dompurify`, quindi va bene lasciarla — serve comunque per sanitize in altri punti del progetto).

## Deps archiviate (7 pacchetti npm)

| Package | Version |
| --- | --- |
| `@tiptap/extension-color` | `^3.20.4` |
| `@tiptap/extension-image` | `^3.20.4` |
| `@tiptap/extension-link` | `^3.20.4` |
| `@tiptap/extension-text-style` | `^3.20.4` |
| `@tiptap/extension-underline` | `^3.20.4` |
| `@tiptap/starter-kit` | `^3.20.4` |
| `@tiptap/vue-3` | `^3.20.4` |

## File originali

- `original-files/components/admin/RichTextEditor.vue` — componente WYSIWYG completo con toolbar (grassetto, corsivo, sottolineato, H2/H3, liste, link, immagine con upload, color picker).

## Cosa e' stato sostituito

`nuxt-spedizionefacile-master/components/admin/RichTextEditor.vue` mantiene la stessa API (`v-model:modelValue`, `placeholder`) ma usa:
- `<textarea>` nativo per editing
- `DOMPurify` (già in deps) per rendering sicuro se il contenuto pregresso conteneva HTML
- toggle "Anteprima HTML" / "Modifica" solo quando il valore contiene tag HTML

Nessun altro file del progetto è stato modificato.
