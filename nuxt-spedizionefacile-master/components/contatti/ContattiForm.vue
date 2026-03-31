<!--
  FILE: components/contatti/ContattiForm.vue
  SCOPO: Form di contatto con campi e submit.
-->
<script setup>
defineProps({
  contactForm: { type: Object, required: true },
  isSubmitting: { type: Boolean, default: false },
  submitError: { type: [String, null], default: null },
})

const emit = defineEmits(['submit'])
</script>

<template>
  <div class="contact-form-card">
    <div class="contact-form-card__header">
      <h2 class="contact-form-card__title">Scrivici in modo diretto</h2>
      <p class="contact-form-card__text">Compila solo i dati utili: ti rispondiamo meglio e piu rapidamente.</p>
    </div>

    <form class="contact-form" @submit.prevent="emit('submit')">
      <div class="contact-form__grid contact-form__grid--two">
        <label class="contact-field">
          <span class="contact-field__label">Nome *</span>
          <input v-model="contactForm.name" type="text" placeholder="Nome" class="contact-field__input" required />
        </label>
        <label class="contact-field">
          <span class="contact-field__label">Cognome *</span>
          <input v-model="contactForm.surname" type="text" placeholder="Cognome" class="contact-field__input" required />
        </label>
      </div>

      <div class="contact-form__grid contact-form__grid--two contact-form__grid--stack-mobile">
        <label class="contact-field">
          <span class="contact-field__label">E-mail *</span>
          <input v-model="contactForm.email" type="email" placeholder="nome@azienda.it" class="contact-field__input" required />
        </label>
        <label class="contact-field">
          <span class="contact-field__label">Numero di telefono</span>
          <input v-model="contactForm.telephone_number" type="tel" placeholder="Telefono" class="contact-field__input" />
        </label>
      </div>

      <label class="contact-field">
        <span class="contact-field__label">Indirizzo *</span>
        <input v-model="contactForm.address" type="text" placeholder="Indirizzo o sede operativa" class="contact-field__input" required />
      </label>

      <label class="contact-field">
        <span class="contact-field__label">Come possiamo aiutarti? *</span>
        <div class="contact-field__textarea-wrap">
          <textarea v-model="contactForm.message" maxlength="2000" placeholder="Descrivi il problema o la richiesta in modo sintetico" class="contact-field__textarea" required></textarea>
          <span class="contact-field__counter">{{ contactForm.message.length }}/2000</span>
        </div>
      </label>

      <p v-if="submitError" class="contact-form__error">{{ submitError }}</p>

      <div class="contact-form__footer">
        <p class="contact-form__note">Ti rispondiamo il prima possibile. Per dubbi sul prezzo, spesso conviene partire dal preventivo e poi contattarci con il risultato gia visibile.</p>
        <button type="submit" class="contact-form__cta" :disabled="isSubmitting" :class="{ 'is-loading': isSubmitting }">
          {{ isSubmitting ? 'Invio in corso...' : 'Invia richiesta' }}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      </div>
    </form>
  </div>
</template>
