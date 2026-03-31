<!--
  FILE: components/account/AccountCarteList.vue
  SCOPO: Lista carte salvate con azioni (predefinita, elimina).
-->
<script setup>
defineProps({
  payments: { type: Object, default: null },
  status: { type: String, default: '' },
  cardsFeatureAvailable: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  deleteConfirmId: { type: [String, null], default: null },
})

const emit = defineEmits([
  'toggle-form', 'set-default', 'delete',
  'ask-delete', 'cancel-delete', 'open-admin-settings',
])

const getBrandIcon = (brand) => {
  const brands = { visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex', discover: 'Discover' }
  return brands[brand?.toLowerCase()] || brand || 'Carta'
}
</script>

<template>
  <!-- Loading skeleton -->
  <div v-if="status === 'pending'">
    <div v-for="n in 2" :key="n" class="bg-white rounded-[12px] p-[16px] border border-[#E9EBEC] mb-[10px]">
      <div class="flex animate-pulse items-center gap-[12px]">
        <div class="w-[48px] h-[32px] rounded-[6px] bg-gray-200"></div>
        <div class="flex-1 space-y-[7px]">
          <div class="h-[14px] rounded bg-gray-200 w-[40%]"></div>
          <div class="h-[12px] rounded bg-gray-200 w-[25%]"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Cards loaded -->
  <template v-else-if="payments && payments.data">
    <!-- Empty state -->
    <div v-if="payments.data.length === 0" class="bg-white rounded-[12px] p-[36px] shadow-sm border border-[#E9EBEC] text-center">
      <div class="w-[64px] h-[64px] mx-auto mb-[16px] bg-[#F8F9FB] rounded-full flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C8CCD0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
      </div>
      <h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[8px]">
        {{ cardsFeatureAvailable ? 'Nessuna carta salvata' : 'Pagamenti con carta non ancora attivi' }}
      </h2>
      <p class="text-[#737373] text-[0.875rem] max-w-[460px] mx-auto mb-[20px] leading-[1.55]">
        <span v-if="cardsFeatureAvailable">Aggiungi una carta per pagare più in fretta.</span>
        <span v-else-if="isAdmin">Configura Stripe per attivare carte e wallet.</span>
        <span v-else>Le carte saranno disponibili appena Stripe sarà attivo.</span>
      </p>
      <button v-if="cardsFeatureAvailable" @click="emit('toggle-form')" class="btn-cta sf-nav-button px-[20px] py-[10px] font-semibold text-[0.875rem]">Aggiungi la tua prima carta</button>
      <button v-else-if="isAdmin" @click="emit('open-admin-settings')" class="btn-cta sf-nav-button px-[20px] py-[10px] font-semibold text-[0.875rem]">Apri impostazioni Stripe</button>
      <p v-else class="text-[#737373] text-[0.875rem] font-medium">Quando Stripe sarà attivo, qui comparirà il pulsante per aggiungere la tua prima carta.</p>
    </div>

    <!-- Card items -->
    <div v-else class="space-y-[12px]">
      <div v-for="(payment, index) in payments.data" :key="index"
        :class="['bg-white rounded-[12px] p-[14px] desktop:p-[18px] border transition-all', payment.default ? 'border-[#095866] shadow-sm' : 'border-[#E9EBEC] hover:border-[#D7E1E4]']">
        <div class="flex flex-col gap-[12px] tablet:flex-row tablet:items-center tablet:gap-[14px]">
          <!-- Brand icon -->
          <div :class="['w-[48px] h-[32px] rounded-[6px] flex items-center justify-center text-[0.6875rem] font-bold uppercase shrink-0', payment.default ? 'bg-[#095866] text-white' : 'bg-[#F0F0F0] text-[#404040]']">
            {{ getBrandIcon(payment.brand)?.slice(0, 4) }}
          </div>
          <!-- Info -->
          <div class="min-w-0 w-full flex-1">
            <div class="flex flex-wrap items-center gap-[8px]">
              <span class="text-[0.875rem] font-semibold text-[#252B42]">{{ getBrandIcon(payment.brand) }} **** {{ payment.last4 }}</span>
              <span v-if="payment.default" class="inline-block px-[8px] py-[2px] rounded-full text-[0.6875rem] font-medium bg-[#095866]/10 text-[#095866]">Predefinita</span>
            </div>
            <div class="mt-[4px] flex flex-col gap-[4px] sm:flex-row sm:items-center sm:gap-[12px]">
              <span class="text-[0.75rem] text-[#737373]">{{ payment.holder_name }}</span>
              <span class="text-[0.75rem] text-[#a0a0a0]">Scad. {{ payment.exp_month }}/{{ payment.exp_year }}</span>
            </div>
          </div>
          <!-- Actions -->
          <div class="flex w-full flex-wrap items-center gap-[8px] tablet:w-auto tablet:justify-end">
            <button v-if="!payment.default" @click="emit('set-default', payment.id)"
              class="btn-secondary inline-flex min-h-[36px] items-center gap-[5px] px-[11px] py-[7px] text-[0.75rem] font-semibold cursor-pointer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Imposta predefinita
            </button>
            <template v-if="deleteConfirmId !== payment.id">
              <button @click="emit('ask-delete', payment.id)"
                class="btn-tertiary inline-flex min-h-[36px] items-center gap-[4px] px-[11px] py-[7px] text-[0.75rem] font-semibold text-red-600 cursor-pointer hover:border-red-200 hover:bg-red-50">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Elimina
              </button>
            </template>
            <template v-else>
              <div class="flex flex-wrap items-center gap-[6px]">
                <button @click="emit('delete', payment.id)"
                  class="btn-cta inline-flex min-h-[36px] items-center gap-[4px] px-[11px] py-[7px] text-[0.6875rem] font-semibold cursor-pointer">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Conferma
                </button>
                <button @click="emit('cancel-delete')"
                  class="btn-secondary inline-flex min-h-[36px] items-center gap-[4px] px-[11px] py-[7px] text-[0.6875rem] font-semibold cursor-pointer">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Annulla
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </template>

  <!-- Security note -->
  <div class="mt-[20px] flex items-start gap-[10px] p-[12px] bg-[#F8F9FB] rounded-[12px]">
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#737373" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-[1px]"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    <p class="text-[0.75rem] text-[#737373] leading-[1.5]">
      I dati delle carte sono gestiti in modo sicuro da Stripe. Non conserviamo mai i numeri completi delle tue carte.
    </p>
  </div>
</template>
