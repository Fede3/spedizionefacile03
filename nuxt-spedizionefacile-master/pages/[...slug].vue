<!--
  FILE: pages/[...slug].vue
  SCOPO: Pagina 404 — catch-all per URL non trovati.

  API: nessuna.
  COMPONENTI: nessuno (pagina standalone).
  ROUTE: qualsiasi URL non matchato (catch-all).

  VINCOLI: SVG inline, nessun <Icon>. Stile coerente col sito (colori brand, rounded, shadow).
  COLLEGAMENTI: pages/index.vue (link homepage).
-->
<script setup>
definePageMeta({ layout: 'default' });

useSeoMeta({
  title: 'Pagina non trovata | SpediamoFacile',
  description: 'La pagina che stai cercando non esiste o è stata spostata.',
});
</script>

<template>
  <section class="min-h-[500px] py-[40px] desktop:py-[60px]">
    <div class="my-container">
      <div class="bg-white rounded-[12px] border border-[#E9EBEC] shadow-sm p-[32px_20px] desktop:p-[48px] max-w-[560px] mx-auto text-center">
        <!-- SVG illustrazione pacco smarrito -->
        <svg
          class="mx-auto mb-[24px] w-[100px] h-[100px]"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <!-- Pacco -->
          <rect x="20" y="30" width="60" height="50" rx="4" stroke="#095866" stroke-width="3" fill="#F0F9FB"/>
          <line x1="20" y1="50" x2="80" y2="50" stroke="#095866" stroke-width="3"/>
          <line x1="50" y1="50" x2="50" y2="80" stroke="#095866" stroke-width="2.5"/>
          <!-- Nastro superiore -->
          <path d="M40 30 L50 18 L60 30" stroke="#E44203" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Punto interrogativo -->
          <circle cx="75" cy="25" r="14" fill="#E44203" opacity="0.12"/>
          <text x="75" y="31" text-anchor="middle" font-size="18" font-weight="bold" fill="#E44203">?</text>
        </svg>

        <!-- Codice errore -->
        <h1 class="text-[4rem] font-extrabold text-[#095866] mb-[4px] leading-none">404</h1>

        <!-- Messaggio principale -->
        <h2 class="text-[1.5rem] font-bold text-[#252B42] mb-[8px]">
          Pagina non trovata
        </h2>

        <!-- Testo descrittivo -->
        <p class="text-[#737373] text-[0.9375rem] leading-relaxed mb-[28px]">
          Ci dispiace, la pagina che stai cercando non esiste o potrebbe essere
          stata spostata. Torna alla homepage per continuare la navigazione.
        </p>

        <!-- Link homepage -->
        <NuxtLink
          to="/"
          class="btn-cta inline-flex items-center gap-[8px] text-[0.9375rem]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Torna alla homepage
        </NuxtLink>

        <!-- Link secondario -->
        <p class="text-[#A0A5AB] text-[0.8125rem] mt-[16px]">
          Oppure vai al <NuxtLink to="/preventivo" class="text-[#095866] hover:underline font-medium">preventivo</NuxtLink>
          o alla pagina <NuxtLink to="/contatti" class="text-[#095866] hover:underline font-medium">contatti</NuxtLink>.
        </p>
      </div>
    </div>
  </section>
</template>
