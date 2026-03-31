<!--
  FILE: components/account/AccountWalletTopUp.vue
  SCOPO: Sezione ricarica portafoglio — importi preimpostati, Stripe card form inline, pulsante ricarica.
  PROPS: defaultPaymentMethod (Object|null), stripeConfigured (Boolean).
  EVENTS: topUpSuccess — emesso dopo una ricarica riuscita (il parent aggiorna saldo/movimenti).
  LOGIC: composables/useWalletTopUp.js
-->
<script setup>
const props = defineProps({
  defaultPaymentMethod: { type: Object, default: null },
  stripeConfigured: { type: Boolean, default: false },
});
const emit = defineEmits(["topUpSuccess", "paymentMethodUpdated"]);

const {
  topUpAmount, isLoading, message, messageType, presetAmounts,
  showNewCardForm, isPreparingNewCardForm, cardHolderName, cardError,
  canSubmitTopUp, topUpButtonLabel,
  selectPreset, handleTopUp, openNewCardForm, closeNewCardForm,
} = useWalletTopUp(props, emit);
</script>

<template>
  <div class="rounded-[18px] border border-[#E9EBEC] bg-white p-[18px] shadow-sm desktop:sticky desktop:top-[108px] desktop:p-[22px]">
    <!-- Header -->
    <div class="flex items-start sm:items-center gap-[10px] mb-[14px] desktop:mb-[16px]">
      <div class="w-[36px] h-[36px] rounded-[50px] bg-[#edf7f8] flex items-center justify-center">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#095866]"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
      </div>
      <div>
        <h2 class="text-[1rem] font-bold text-[#252B42]">Ricarica portafoglio</h2>
        <p class="text-[0.75rem] text-[#737373]">Scegli l'importo.</p>
      </div>
    </div>

    <!-- Preset amounts -->
    <div class="grid grid-cols-2 sm:grid-cols-3 tablet:grid-cols-4 desktop:grid-cols-5 gap-[8px] mb-[14px]">
      <button
        v-for="amount in presetAmounts" :key="amount" @click="selectPreset(amount)"
        :class="[
          'py-[12px] rounded-[12px] text-[0.875rem] font-semibold transition-all cursor-pointer border-2',
          topUpAmount == amount
            ? 'bg-[#095866] text-white border-[#095866] shadow-[0_2px_8px_rgba(9,88,102,0.3)]'
            : 'bg-white text-[#252B42] border-[#E9EBEC] hover:border-[#095866] hover:bg-[#f0fafb]',
        ]">
        &euro;{{ amount }}
      </button>
    </div>

    <!-- Custom amount -->
    <div class="relative mb-[14px]">
      <span class="absolute left-[16px] top-1/2 -translate-y-1/2 text-[#737373] text-[1rem] font-medium">&euro;</span>
      <input v-model="topUpAmount" type="number" min="1" step="0.01" placeholder="Inserisci importo personalizzato"
        class="w-full pl-[38px] pr-[16px] py-[12px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[12px] text-[0.9375rem] focus:border-[#095866] focus:bg-white focus:outline-none focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] transition-all" />
    </div>

    <!-- Saved card display -->
    <div v-if="defaultPaymentMethod?.card && !showNewCardForm"
      class="flex flex-col sm:flex-row sm:items-center gap-[10px] mb-[14px] p-[14px] bg-[#F8F9FB] rounded-[14px] border border-[#E9EBEC]">
      <div class="w-[48px] h-[32px] bg-[#eef3f6] rounded-[6px] flex items-center justify-center text-[#095866] text-[0.6875rem] font-bold uppercase tracking-wider">
        {{ defaultPaymentMethod.card.brand?.slice(0, 4) }}
      </div>
      <div class="flex-1 min-w-0">
        <span class="text-[0.9375rem] font-medium text-[#252B42]">&bull;&bull;&bull;&bull; {{ defaultPaymentMethod.card.last4 }}</span>
        <span class="text-[0.75rem] text-[#737373] ml-[8px]">Scad. {{ defaultPaymentMethod.card.exp_month }}/{{ defaultPaymentMethod.card.exp_year }}</span>
      </div>
      <div class="flex flex-row sm:flex-col items-start sm:items-end gap-[8px] sm:gap-[6px] flex-wrap">
        <NuxtLink to="/account/carte" class="text-[0.8125rem] text-[#095866] font-medium hover:underline">Cambia</NuxtLink>
        <button type="button" @click="openNewCardForm" class="text-[0.8125rem] text-[#095866] font-medium hover:underline cursor-pointer">Usa una nuova carta</button>
      </div>
    </div>

    <!-- New card form (sub-component) -->
    <AccountWalletNewCardForm
      v-else-if="showNewCardForm"
      :is-preparing-new-card-form="isPreparingNewCardForm"
      v-model:card-holder-name="cardHolderName"
      :card-error="cardError"
      :has-saved-card="Boolean(defaultPaymentMethod?.card)"
      @close="closeNewCardForm" />

    <!-- No card warning -->
    <div v-else class="mb-[14px] p-[12px] bg-amber-50/80 rounded-[12px] border border-amber-200 text-[0.8125rem]">
      <div class="flex items-center gap-[10px]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-600 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span class="text-amber-800">
          <template v-if="stripeConfigured">
            Nessuna carta salvata.
            <NuxtLink to="/account/carte" class="underline font-semibold text-amber-900">Apri carte e pagamenti</NuxtLink>
          </template>
          <template v-else>
            Le ricariche con carta non sono ancora attive su questo sito. Quando Stripe sarà configurato, qui potrai usare la tua carta salvata per ricaricare il wallet.
          </template>
        </span>
      </div>
      <div v-if="stripeConfigured" class="mt-[12px] flex flex-wrap items-center gap-[8px]">
        <button type="button" @click="openNewCardForm"
          class="inline-flex items-center gap-[6px] px-[13px] py-[8px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[50px] text-[0.75rem] font-semibold transition-colors cursor-pointer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Aggiungi una carta qui
        </button>
        <NuxtLink to="/account/carte" class="text-[0.8125rem] text-amber-900 font-semibold underline">Gestisci carte e pagamenti</NuxtLink>
      </div>
    </div>

    <!-- Summary + action button -->
    <div class="grid grid-cols-1 desktop:grid-cols-[minmax(0,1fr)_240px] gap-[14px] items-start">
      <div class="rounded-[14px] border border-[#E9EBEC] bg-[#FAFCFD] px-[14px] py-[12px]">
        <p class="text-[0.75rem] font-semibold uppercase tracking-[0.04em] text-[#6B7280]">Ricarica pronta</p>
        <p class="mt-[4px] text-[0.9375rem] font-semibold text-[#252B42]">
          {{ topUpAmount ? `Importo selezionato: \u20AC${formatEuro(topUpAmount || 0)}` : 'Scegli un importo o inseriscilo manualmente' }}
        </p>
        <p class="mt-[4px] text-[0.75rem] text-[#737373] leading-[1.45]">
          {{ defaultPaymentMethod?.card || showNewCardForm ? 'Il pagamento userà la carta mostrata sopra.' : 'Per procedere serve una carta salvata o una nuova carta.' }}
        </p>
      </div>
      <button @click="handleTopUp" :disabled="!canSubmitTopUp"
        :class="[
          'w-full min-h-[54px] py-[13px] rounded-[14px] text-white font-semibold text-[0.9375rem] transition-all flex items-center justify-center gap-[8px]',
          !canSubmitTopUp
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-[#095866] hover:bg-[#074a56] cursor-pointer shadow-[0_2px_8px_rgba(9,88,102,0.25)] hover:shadow-[0_4px_16px_rgba(9,88,102,0.3)]',
        ]">
        <svg v-if="!isLoading" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1"/><path d="M14 11h4m-2-2v4"/></svg>
        <span>{{ topUpButtonLabel }}</span>
      </button>
    </div>

    <!-- Feedback message -->
    <div v-if="message" :class="['mt-[14px] p-[12px] rounded-[16px] text-[0.8125rem] font-medium flex items-center gap-[8px]', messageType === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600']">
      <svg v-if="messageType === 'success'" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {{ message }}
    </div>
  </div>
</template>
