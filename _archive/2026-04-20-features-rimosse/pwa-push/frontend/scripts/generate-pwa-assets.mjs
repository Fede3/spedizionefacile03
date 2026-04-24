/**
 * SCRIPT: generate-pwa-assets.mjs
 * SCOPO: genera le icone PWA (manifest) e le OG images a partire da SVG sorgenti
 *        definiti inline. Richiede `sharp` (già dipendenza transitiva di @nuxt/image).
 *
 * USO:
 *   node scripts/generate-pwa-assets.mjs
 *
 * OUTPUT:
 *   public/icons/icon-192.png          — Android launcher (purpose: any)
 *   public/icons/icon-192-maskable.png — Adaptive icons con safe area 80% (purpose: maskable)
 *   public/icons/icon-512.png          — Splash / hi-dpi
 *   public/icons/icon-512-maskable.png — Adaptive icons grandi (maskable)
 *   public/icons/apple-touch-icon.png  — iOS Safari / home screen (180x180)
 *   public/og/default.png              — Open Graph default 1200x630
 *   public/og/preventivo.png           — Open Graph pagina preventivo
 *
 * NOTE:
 * - I design sono placeholder brand-coerenti (palette teal #095866 + accento
 *   arancione #E44203). Sostituire con artwork definitivo prima del go-live.
 * - Il padding interno delle maskable è al 20% come da Android Adaptive Icons spec.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = resolve(__dirname, '..', 'public')

const BRAND_TEAL = '#095866'
const BRAND_TEAL_LIGHT = '#0a7489'
const BRAND_ORANGE = '#E44203'
const BG_LIGHT = '#F8F9FB'
const WHITE = '#FFFFFF'

/** Icona app: logo stilizzato SF su fondo teal. Versione "any" full-bleed. */
const iconSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BRAND_TEAL}"/>
      <stop offset="100%" stop-color="${BRAND_TEAL_LIGHT}"/>
    </linearGradient>
    <linearGradient id="arrow" x1="0" y1="0" x2="1" y2="0.3">
      <stop offset="0%" stop-color="${BRAND_ORANGE}"/>
      <stop offset="100%" stop-color="#f26a36"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <!-- pacco stilizzato -->
  <g transform="translate(256 256)">
    <rect x="-112" y="-80" width="224" height="160" rx="16" fill="${WHITE}" opacity="0.08"/>
    <rect x="-112" y="-80" width="224" height="160" rx="16" fill="none" stroke="${WHITE}" stroke-width="6" opacity="0.5"/>
    <line x1="-112" y1="0" x2="112" y2="0" stroke="${WHITE}" stroke-width="6" opacity="0.5"/>
    <line x1="0" y1="-80" x2="0" y2="80" stroke="${WHITE}" stroke-width="6" opacity="0.5"/>
  </g>
  <!-- monogramma SF -->
  <text x="256" y="290" text-anchor="middle" fill="${WHITE}" font-size="140" font-weight="900" font-family="Montserrat, Inter, sans-serif" letter-spacing="-6">SF</text>
  <!-- freccia arancione -->
  <path d="M 130 410 L 382 410 L 362 390 M 382 410 L 362 430"
        stroke="url(#arrow)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>
`

/** Maskable: padding interno 20% (safe area 80%) come da spec Android Adaptive Icons. */
const iconMaskableSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BRAND_TEAL}"/>
      <stop offset="100%" stop-color="${BRAND_TEAL_LIGHT}"/>
    </linearGradient>
  </defs>
  <!-- Full bleed safe zone: l'OS può croppare fino al 20% per bordo. -->
  <rect width="512" height="512" fill="url(#bg)"/>
  <!-- Contenuto dentro il safe circle 409px (80% di 512) -->
  <g transform="translate(256 256)">
    <circle r="150" fill="${WHITE}" opacity="0.08"/>
  </g>
  <text x="256" y="290" text-anchor="middle" fill="${WHITE}" font-size="180" font-weight="900" font-family="Montserrat, Inter, sans-serif" letter-spacing="-8">SF</text>
  <circle cx="256" cy="360" r="6" fill="${BRAND_ORANGE}"/>
</svg>
`

const appleTouchSvg = () => `
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BRAND_TEAL}"/>
      <stop offset="100%" stop-color="${BRAND_TEAL_LIGHT}"/>
    </linearGradient>
  </defs>
  <rect width="180" height="180" rx="38" fill="url(#bg)"/>
  <text x="90" y="110" text-anchor="middle" fill="${WHITE}" font-size="64" font-weight="900" font-family="Montserrat, Inter, sans-serif" letter-spacing="-3">SF</text>
  <circle cx="90" cy="140" r="3" fill="${BRAND_ORANGE}"/>
</svg>
`

/** OG default 1200x630 — brand panel con claim generico. */
const ogDefaultSvg = () => `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BRAND_TEAL}"/>
      <stop offset="60%" stop-color="${BRAND_TEAL_LIGHT}"/>
      <stop offset="100%" stop-color="#0f5f6d"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${BRAND_ORANGE}"/>
      <stop offset="100%" stop-color="#f26a36"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <!-- pattern decorativo diagonale -->
  <g opacity="0.08">
    <circle cx="1000" cy="120" r="180" fill="${WHITE}"/>
    <circle cx="1100" cy="500" r="100" fill="${WHITE}"/>
    <circle cx="80" cy="550" r="140" fill="${WHITE}"/>
  </g>
  <!-- Badge SF -->
  <rect x="80" y="80" width="92" height="92" rx="22" fill="${WHITE}"/>
  <text x="126" y="145" text-anchor="middle" fill="${BRAND_TEAL}" font-size="42" font-weight="900" font-family="Montserrat, Inter, sans-serif" letter-spacing="-2">SF</text>
  <!-- Brand name -->
  <text x="196" y="120" fill="${WHITE}" font-size="28" font-weight="700" font-family="Montserrat, Inter, sans-serif">SpediamoFacile</text>
  <text x="196" y="155" fill="${WHITE}" opacity="0.7" font-size="18" font-weight="500" font-family="Inter, sans-serif">Spedizioni BRT</text>
  <!-- Claim principale -->
  <text x="80" y="310" fill="${WHITE}" font-size="72" font-weight="800" font-family="Montserrat, Inter, sans-serif" letter-spacing="-2">Spedisci con BRT</text>
  <text x="80" y="400" fill="${WHITE}" font-size="72" font-weight="800" font-family="Montserrat, Inter, sans-serif" letter-spacing="-2">al miglior prezzo.</text>
  <!-- Accent bar -->
  <rect x="80" y="450" width="120" height="6" rx="3" fill="url(#accent)"/>
  <!-- Sottoclaim -->
  <text x="80" y="500" fill="${WHITE}" opacity="0.85" font-size="26" font-weight="500" font-family="Inter, sans-serif">Preventivo in 30 secondi. Ritiro a domicilio. Tracking in tempo reale.</text>
  <!-- URL footer -->
  <text x="80" y="580" fill="${WHITE}" opacity="0.6" font-size="20" font-weight="600" font-family="Inter, sans-serif">spediamofacile.it</text>
</svg>
`

const ogPreventivoSvg = () => `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BRAND_TEAL}"/>
      <stop offset="100%" stop-color="${BRAND_TEAL_LIGHT}"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${BRAND_ORANGE}"/>
      <stop offset="100%" stop-color="#f26a36"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g opacity="0.07">
    <circle cx="1050" cy="100" r="200" fill="${WHITE}"/>
    <circle cx="150" cy="520" r="160" fill="${WHITE}"/>
  </g>
  <rect x="80" y="80" width="92" height="92" rx="22" fill="${WHITE}"/>
  <text x="126" y="145" text-anchor="middle" fill="${BRAND_TEAL}" font-size="42" font-weight="900" font-family="Montserrat, Inter, sans-serif" letter-spacing="-2">SF</text>
  <text x="196" y="120" fill="${WHITE}" font-size="28" font-weight="700" font-family="Montserrat, Inter, sans-serif">SpediamoFacile</text>
  <text x="196" y="155" fill="${WHITE}" opacity="0.7" font-size="18" font-weight="500" font-family="Inter, sans-serif">Preventivo rapido</text>
  <text x="80" y="320" fill="${WHITE}" font-size="80" font-weight="800" font-family="Montserrat, Inter, sans-serif" letter-spacing="-3">Preventivo in</text>
  <text x="80" y="410" fill="${WHITE}" font-size="80" font-weight="800" font-family="Montserrat, Inter, sans-serif" letter-spacing="-3">30 secondi.</text>
  <rect x="80" y="460" width="120" height="6" rx="3" fill="url(#accent)"/>
  <text x="80" y="510" fill="${WHITE}" opacity="0.85" font-size="26" font-weight="500" font-family="Inter, sans-serif">Senza registrazione. Confronta tariffe BRT subito.</text>
  <text x="80" y="580" fill="${WHITE}" opacity="0.6" font-size="20" font-weight="600" font-family="Inter, sans-serif">spediamofacile.it/preventivo</text>
</svg>
`

const ensureDir = async (path) => {
  await mkdir(path, { recursive: true })
}

const renderPng = async (svgString, outPath, width, height) => {
  const buffer = await sharp(Buffer.from(svgString), { density: 300 })
    .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer()
  await writeFile(outPath, buffer)
  // eslint-disable-next-line no-console
  console.log(`  ✓ ${outPath.replace(PUBLIC_DIR, 'public')} (${width}x${height}, ${(buffer.length / 1024).toFixed(1)} KB)`)
}

const run = async () => {
  console.log('Generazione asset PWA + OG…')

  const iconsDir = resolve(PUBLIC_DIR, 'icons')
  const ogDir = resolve(PUBLIC_DIR, 'og')
  await ensureDir(iconsDir)
  await ensureDir(ogDir)

  console.log('\nIcone PWA:')
  await renderPng(iconSvg(512), resolve(iconsDir, 'icon-192.png'), 192, 192)
  await renderPng(iconSvg(512), resolve(iconsDir, 'icon-512.png'), 512, 512)
  await renderPng(iconMaskableSvg(512), resolve(iconsDir, 'icon-192-maskable.png'), 192, 192)
  await renderPng(iconMaskableSvg(512), resolve(iconsDir, 'icon-512-maskable.png'), 512, 512)
  await renderPng(appleTouchSvg(), resolve(iconsDir, 'apple-touch-icon.png'), 180, 180)

  console.log('\nOpen Graph:')
  await renderPng(ogDefaultSvg(), resolve(ogDir, 'default.png'), 1200, 630)
  await renderPng(ogPreventivoSvg(), resolve(ogDir, 'preventivo.png'), 1200, 630)

  console.log('\nCompletato. Tutti gli asset rigenerati.')
}

run().catch((err) => {
  console.error('Errore durante la generazione:', err)
  process.exit(1)
})
