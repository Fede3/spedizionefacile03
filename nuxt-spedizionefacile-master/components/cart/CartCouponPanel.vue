<!--
  FILE: components/cart/CartCouponPanel.vue
  SCOPO: Pannello coupon espandibile con campo input e applicazione.
  PROPS: couponCode, couponApplied, couponDiscount, couponMessage, showCouponField, showCouponPanel
  EMITS: toggle, apply, remove, update:couponCode
-->
<script setup>
defineProps({
  couponCode: { type: String, default: '' },
  couponApplied: { type: Boolean, default: false },
  couponDiscount: { type: [Number, String], default: null },
  couponMessage: { type: Object, default: null },
  showCouponField: { type: Boolean, default: false },
  showCouponPanel: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle', 'apply', 'remove', 'update:couponCode'])
</script>

<template>
  <div class="rounded-[18px] border border-[#E5EAEC] bg-[#F8FAFB] px-[16px] py-[14px] mb-[20px]">
    <button
      type="button"
      @click="emit('toggle')"
      class="w-full flex items-center justify-between gap-[12px] text-left cursor-pointer">
      <div>
        <p class="text-[0.9375rem] font-semibold text-[#252B42]">Hai un codice sconto?</p>
        <p class="text-[0.8125rem] text-[#6B7280] mt-[2px]">Applicalo solo se vuoi aggiornare il totale prima del checkout.</p>
      </div>
      <div class="inline-flex items-center gap-[8px] text-[#095866] font-semibold text-[0.8125rem]">
        <span>{{ showCouponPanel ? 'Nascondi' : 'Apri' }}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="transition-transform" :class="showCouponPanel ? 'rotate-180' : ''"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    </button>

    <div v-if="showCouponPanel" class="mt-[14px] pt-[14px] border-t border-[#E1E7EA]">
      <div class="flex flex-col tablet:flex-row items-stretch tablet:items-center gap-[12px] tablet:gap-[16px]">
        <div class="w-full tablet:flex-1 tablet:max-w-[340px]">
          <input
            v-if="!couponApplied"
            type="text"
            :value="couponCode"
            @input="emit('update:couponCode', $event.target.value)"
            placeholder="PROVA123"
            class="w-full bg-white border border-[#D7E1E4] rounded-[14px] h-[48px] tablet:h-[46px] px-[18px] text-[1rem] tablet:text-[0.875rem] text-[#404040] placeholder:text-[#8A939C] transition-[border-color,box-shadow] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
          <div v-else class="flex items-center gap-[10px] bg-emerald-50 border border-emerald-200 rounded-[14px] min-h-[46px] px-[18px]">
            <span class="text-emerald-700 font-semibold text-[0.875rem]">{{ couponCode.toUpperCase() }} (-{{ couponDiscount }}%)</span>
            <button @click="emit('remove')" class="text-red-500 text-[0.75rem] hover:underline cursor-pointer ml-auto">Rimuovi</button>
          </div>
        </div>
        <button
          v-if="!couponApplied"
          type="button"
          @click="emit('apply')"
          class="inline-flex items-center justify-center gap-[6px] bg-[#095866] text-white font-semibold text-[0.9375rem] px-[24px] min-h-[48px] w-full tablet:w-auto rounded-[14px] hover:bg-[#074a56] transition-[background-color,transform] duration-200 cursor-pointer active:scale-[0.97]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          Applica coupon
        </button>
      </div>
      <div class="min-h-[24px] mt-[10px]">
        <p v-if="couponMessage" class="text-[0.8125rem]" :class="couponMessage.type === 'success' ? 'text-emerald-600' : 'text-red-500'">
          {{ couponMessage.text }}
        </p>
      </div>
    </div>
  </div>
</template>
