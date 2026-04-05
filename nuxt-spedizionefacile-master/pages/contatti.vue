<!--
  PAGINA: Contatti (contatti.vue)
  Form di contatto per richiedere assistenza o informazioni.
  CSS estratto in assets/css/contatti.css. Componenti: ContattiForm, ContattiSidebar.
-->
<script setup>
import '~/assets/css/contatti.css'

useSeoMeta({
  title: 'Contatti | SpediamoFacile - Assistenza e Supporto',
  ogTitle: 'Contatti | SpediamoFacile',
  description: 'Hai bisogno di aiuto? Contatta il team di SpediamoFacile per assistenza sulle tue spedizioni, preventivi personalizzati o informazioni sui nostri servizi.',
  ogDescription: 'Contatta SpediamoFacile per assistenza e supporto sulle tue spedizioni.',
});

useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org', '@type': 'ContactPage',
      name: 'Contatti SpediamoFacile', url: 'https://spediamofacile.it/contatti',
      mainEntity: {
        '@type': 'Organization', name: 'SpediamoFacile', url: 'https://spediamofacile.it',
        contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', availableLanguage: 'Italian' },
      },
    }),
  }],
});

const sanctum = useSanctumClient();

const contactForm = ref({
  name: '', surname: '', email: '', telephone_number: '', address: '', message: '',
});

const contactHighlights = [
  { title: 'Assistenza pratica', text: 'Ti aiutiamo su preventivi, spedizioni, ritiri, problemi di consegna e servizi accessori.', icon: 'mdi:headset' },
  { title: 'Risposte piu chiare', text: 'Scrivici gia con il contesto utile: tratta, tipo collo, ordine o dubbio operativo.', icon: 'mdi:message-text-fast-outline' },
  { title: 'Flusso piu rapido', text: 'Se vuoi partire subito, puoi passare dal preventivo e poi tornare a scriverci solo se serve.', icon: 'mdi:flash-outline' },
];

const quickActions = [
  { title: 'Calcola un preventivo', text: 'Vuoi un prezzo immediato prima di scriverci?', href: '/preventivo', cta: 'Vai al preventivo', icon: 'mdi:calculator-variant-outline' },
  { title: 'Scrivici via email', text: 'Per richieste non urgenti o materiali da allegare.', href: 'mailto:info@spediamofacile.it', cta: 'info@spediamofacile.it', icon: 'mdi:email-fast-outline' },
];

const isSubmitting = ref(false);
const submitSuccess = ref(false);
const submitError = ref(null);

const resetForm = () => {
  contactForm.value = { name: '', surname: '', email: '', telephone_number: '', address: '', message: '' };
};

const handleSubmit = async () => {
  submitError.value = null;
  isSubmitting.value = true;
  try {
    await sanctum('/sanctum/csrf-cookie');
    await sanctum('/api/contact', { method: 'POST', body: contactForm.value });
    submitSuccess.value = true;
    resetForm();
  } catch (error) {
    const data = error?.response?._data || error?.data;
    if (data?.errors) {
      const firstError = Object.values(data.errors)[0];
      submitError.value = Array.isArray(firstError) ? firstError[0] : firstError;
    } else {
      submitError.value = data?.message || "Errore durante l'invio. Riprova.";
    }
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <section class="contact-page-shell">
    <div class="my-container">
      <!-- Intro -->
      <div class="contact-intro-panel">
        <div class="contact-intro-panel__copy">
          <p class="contact-intro-panel__eyebrow">Contatti</p>
          <h1 class="contact-intro-panel__title">Raccontaci cosa ti serve e ti rispondiamo con il percorso piu utile.</h1>
          <p class="contact-intro-panel__text">
            Assistenza, chiarimenti su servizi, dubbi su ritiro e consegna o supporto commerciale:
            manteniamo il contatto semplice, chiaro e leggibile anche da mobile.
          </p>
        </div>
        <div class="contact-intro-panel__pills">
          <span class="contact-intro-panel__pill">Assistenza rapida</span>
          <span class="contact-intro-panel__pill">Preventivi e spedizioni</span>
          <span class="contact-intro-panel__pill">Supporto dedicato</span>
        </div>
      </div>

      <!-- Success -->
      <div v-if="submitSuccess" class="contact-success-card">
        <div class="contact-success-card__icon-shell">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="contact-success-card__icon"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div class="contact-success-card__body">
          <h2 class="contact-success-card__title">Messaggio inviato correttamente</h2>
          <p class="contact-success-card__text">Grazie. Abbiamo ricevuto la richiesta e ti risponderemo il prima possibile con un riscontro chiaro e operativo.</p>
        </div>
        <button type="button" class="contact-success-card__cta" @click="submitSuccess = false">Invia un altro messaggio</button>
      </div>

      <!-- Form + sidebar -->
      <div v-else class="contact-layout-shell">
        <ContattiForm
          :contact-form="contactForm"
          :is-submitting="isSubmitting"
          :submit-error="submitError"
          @submit="handleSubmit"
        />
        <ContattiSidebar
          :contact-highlights="contactHighlights"
          :quick-actions="quickActions"
        />
      </div>
    </div>
  </section>
</template>
