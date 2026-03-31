<!--
  FILE: components/account/AccountCarteForm.vue
  SCOPO: Form Stripe per aggiungere una nuova carta.
  I campi Stripe Elements sono montati nei div con id specifici.
-->
<script setup>
defineProps({
  cardHolderName: { type: String, default: '' },
  errorMessage: { type: [String, null], default: null },
})

const emit = defineEmits(['update:cardHolderName', 'save', 'cancel'])
</script>

<template>
  <div class="bg-white rounded-[18px] p-[18px] tablet:p-[22px] desktop:p-[28px] shadow-sm border border-[#E9EBEC] max-w-[760px] mx-auto">
    <div class="mb-[16px]">
      <label class="block text-[0.75rem] font-semibold text-[#404040] mb-[5px]">Numero carta</label>
      <div class="account-carte-stripe-field" id="card-number"></div>
    </div>

    <div class="mb-[16px]">
      <label class="block text-[0.75rem] font-semibold text-[#404040] mb-[5px]">Titolare carta</label>
      <input
        type="text"
        :value="cardHolderName"
        @input="emit('update:cardHolderName', $event.target.value)"
        class="w-full px-[14px] py-[11px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] text-[#252B42] placeholder:text-[#a0a0a0] focus:border-[#095866] focus:outline-none transition-colors"
        placeholder="Mario Rossi"
        required />
    </div>

    <div class="grid grid-cols-1 tablet:grid-cols-[minmax(0,1fr)_132px] gap-[12px] mb-[18px]">
      <div class="min-w-0">
        <label class="block text-[0.75rem] font-semibold text-[#404040] mb-[5px]">Scadenza</label>
        <div class="account-carte-stripe-field" id="card-expiry"></div>
      </div>
      <div class="min-w-0 tablet:w-[132px]">
        <label class="block text-[0.75rem] font-semibold text-[#404040] mb-[5px]">CVC</label>
        <div class="account-carte-stripe-field" id="card-cvc"></div>
      </div>
    </div>

    <p v-if="errorMessage" class="text-red-500 text-[0.75rem] mb-[14px] p-[10px] bg-red-50 rounded-[8px] border border-red-200">
      {{ errorMessage }}
    </p>

    <div class="flex flex-col sm:flex-row gap-[10px]">
      <button @click.prevent="emit('cancel')"
        class="btn-secondary sf-nav-button flex-1 inline-flex items-center justify-center gap-[6px] py-[12px] font-semibold text-[0.875rem] cursor-pointer">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        Annulla
      </button>
      <button @click="emit('save')"
        class="btn-cta sf-nav-button flex-1 inline-flex items-center justify-center gap-[6px] py-[12px] font-semibold text-[0.875rem] cursor-pointer">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        Salva carta
      </button>
    </div>

    <div class="mt-[14px] flex items-center justify-center gap-[6px] text-[0.6875rem] text-[#a0a0a0]">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <span>Connessione sicura SSL</span>
    </div>
  </div>
</template>
