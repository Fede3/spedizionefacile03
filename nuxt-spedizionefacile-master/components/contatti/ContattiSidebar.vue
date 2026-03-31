<!--
  FILE: components/contatti/ContattiSidebar.vue
  SCOPO: Sidebar con highlights e quick actions per la pagina contatti.
-->
<script setup>
defineProps({
  contactHighlights: { type: Array, required: true },
  quickActions: { type: Array, required: true },
})

/* SVG map per le icone degli highlights */
const highlightSvgMap = {
  'mdi:headset': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
  'mdi:message-text-fast-outline': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/></svg>',
  'mdi:flash-outline': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
}

const actionSvgMap = {
  'mdi:calculator-variant-outline': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8.01" y2="10"/><line x1="12" y1="10" x2="12.01" y2="10"/><line x1="16" y1="10" x2="16.01" y2="10"/><line x1="8" y1="14" x2="8.01" y2="14"/><line x1="12" y1="14" x2="12.01" y2="14"/><line x1="16" y1="14" x2="16.01" y2="14"/><line x1="8" y1="18" x2="8.01" y2="18"/><line x1="12" y1="18" x2="12.01" y2="18"/><line x1="16" y1="18" x2="16.01" y2="18"/></svg>',
  'mdi:email-fast-outline': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
}
</script>

<template>
  <aside class="contact-side-stack">
    <article v-for="item in contactHighlights" :key="item.title" class="contact-side-card">
      <div class="contact-side-card__icon-shell">
        <span class="contact-side-card__icon" v-html="highlightSvgMap[item.icon] || ''"></span>
      </div>
      <div class="contact-side-card__body">
        <h2 class="contact-side-card__title">{{ item.title }}</h2>
        <p class="contact-side-card__text">{{ item.text }}</p>
      </div>
    </article>

    <article class="contact-actions-card">
      <h2 class="contact-actions-card__title">Scorciatoie utili</h2>
      <div class="contact-actions-card__list">
        <a v-for="action in quickActions" :key="action.title" :href="action.href" class="contact-actions-card__item">
          <div class="contact-actions-card__icon-shell">
            <span class="contact-actions-card__icon" v-html="actionSvgMap[action.icon] || ''"></span>
          </div>
          <div class="contact-actions-card__copy">
            <h3 class="contact-actions-card__item-title">{{ action.title }}</h3>
            <p class="contact-actions-card__item-text">{{ action.text }}</p>
            <span class="contact-actions-card__item-link">{{ action.cta }}</span>
          </div>
        </a>
      </div>
    </article>
  </aside>
</template>
