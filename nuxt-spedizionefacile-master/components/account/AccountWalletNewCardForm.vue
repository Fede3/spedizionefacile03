<!--
  FILE: components/account/AccountWalletNewCardForm.vue
  SCOPO: Form inline per aggiunta nuova carta Stripe nel wallet top-up.
  PROPS: isPreparingNewCardForm, cardHolderName, cardError, hasSavedCard.
  EVENTS: update:cardHolderName, close.
-->
<script setup>
defineProps({
  isPreparingNewCardForm: { type: Boolean, default: false },
  cardHolderName: { type: String, default: "" },
  cardError: { type: String, default: null },
  hasSavedCard: { type: Boolean, default: false },
});
defineEmits(["update:cardHolderName", "close"]);
</script>

<template>
  <div class="mb-[14px] p-[14px] bg-[#F8F9FB] rounded-[16px] border border-[#E9EBEC]">
    <div class="flex items-start justify-between gap-[10px] mb-[12px]">
      <div>
        <p class="text-[0.875rem] font-semibold text-[#252B42]">Nuova carta per la ricarica</p>
        <p class="text-[0.8125rem] text-[#737373] leading-[1.5] mt-[4px]">
          La useremo per questa ricarica e la salveremo come carta predefinita per checkout e wallet.
        </p>
      </div>
      <button type="button" @click="$emit('close')" class="text-[0.8125rem] text-[#095866] font-medium hover:underline cursor-pointer whitespace-nowrap">
        {{ hasSavedCard ? 'Usa carta salvata' : 'Chiudi' }}
      </button>
    </div>

    <!-- Spinner while preparing -->
    <div v-if="isPreparingNewCardForm" class="flex items-center gap-[10px] rounded-[12px] bg-white px-[14px] py-[12px] border border-[#E9EBEC] text-[0.8125rem] text-[#737373]">
      <div class="w-[20px] h-[20px] border-2 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></div>
      Preparazione modulo carta in corso...
    </div>

    <!-- Card fields -->
    <div v-else class="space-y-[14px]">
      <div>
        <label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[6px]">Titolare carta</label>
        <input
          :value="cardHolderName"
          @input="$emit('update:cardHolderName', $event.target.value)"
          type="text"
          placeholder="Mario Rossi"
          class="w-full px-[14px] py-[12px] bg-white border border-[#E9EBEC] rounded-[12px] text-[0.9375rem] text-[#252B42] placeholder:text-[#a0a0a0] focus:border-[#095866] focus:outline-none transition-colors" />
      </div>

      <div>
        <label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[6px]">Numero carta</label>
        <div id="wallet-card-number" class="stripe-field"></div>
      </div>

      <div class="grid grid-cols-1 tablet:grid-cols-[minmax(0,1fr)_132px] gap-[12px]">
        <div>
          <label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[6px]">Scadenza</label>
          <div id="wallet-card-expiry" class="stripe-field"></div>
        </div>
        <div class="min-w-0 tablet:w-[132px]">
          <label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[6px]">CVC</label>
          <div id="wallet-card-cvc" class="stripe-field"></div>
        </div>
      </div>

      <p v-if="cardError" class="text-red-500 text-[0.8125rem] p-[10px] bg-red-50 rounded-[12px] border border-red-200">
        {{ cardError }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.stripe-field {
  background-color: #ffffff;
  padding: 12px 16px;
  border: 1px solid #e9ebec;
  border-radius: 12px;
  width: 100%;
  transition: border-color 0.2s;
}
.stripe-field:focus-within {
  border-color: #095866;
}
</style>
