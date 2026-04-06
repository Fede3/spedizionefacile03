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
  <div class="rounded-[16px] ring-[1.5px] ring-[#DFE2E7] bg-[#F5F6F9] px-[20px] py-[20px] mb-[28px]" style="box-shadow: 0 1px 4px rgba(0,0,0,0.03)">
    <button type="button"
      @click="emit('toggle')"
      class="w-full flex items-center justify-between gap-[12px] text-left cursor-pointer">
      <div>
        <p class="text-[0.9375rem] font-semibold text-[var(--color-brand-text)]">Hai un codice sconto?</p>
        <p class="text-[0.8125rem] text-[var(--color-brand-text-secondary)] mt-[2px]">Applicalo solo se vuoi aggiornare il totale prima del checkout.</p>
      </div>
      <div class="inline-flex items-center gap-[8px] text-[var(--color-brand-primary)] font-semibold text-[0.8125rem]">
        <span>{{ showCouponPanel ? 'Nascondi' : 'Apri' }}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="transition-transform" :class="showCouponPanel ? 'rotate-180' : ''"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    </button>

    <div v-if="showCouponPanel" class="mt-[14px] pt-[14px] border-t border-[#DFE2E7]">
      <div class="flex flex-col tablet:flex-row items-stretch tablet:items-center gap-[12px] tablet:gap-[16px]">
        <div class="w-full tablet:flex-1 tablet:max-w-[340px]">
          <input
            v-if="!couponApplied"
            type="text"
            :value="couponCode"
            @input="emit('update:couponCode', $event.target.value)"
            placeholder="PROVA123"
            class="w-full bg-white ring-[1.5px] ring-[#DFE2E7] rounded-[12px] h-[48px] px-[18px] text-[0.9375rem] text-[var(--color-brand-text)] placeholder:text-[var(--color-brand-text-muted)] outline-none transition-all duration-200 focus:ring-[2px] focus:ring-[var(--color-brand-primary)] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.08)]" style="font-weight:500; border:none" />
          <div v-else class="flex items-center gap-[10px] bg-[#f0fdf4] ring-[1.5px] ring-[#d1fae5] rounded-[12px] min-h-[48px] px-[18px]">
            <span class="text-[#0a8a7a] font-semibold text-[0.875rem]">{{ couponCode.toUpperCase() }} (-{{ couponDiscount }}%)</span>
            <button type="button" @click="emit('remove')" class="text-[var(--color-brand-accent)] text-[0.75rem] hover:underline cursor-pointer ml-auto" style="font-weight:600">Rimuovi</button>
          </div>
        </div>
        <button type="button"
          v-if="!couponApplied"
          @click="emit('apply')"
          class="inline-flex items-center justify-center gap-[6px] text-white font-semibold text-[0.9375rem] px-[24px] min-h-[50px] w-full tablet:w-auto rounded-full hover:opacity-90 transition-all duration-200 cursor-pointer active:scale-[0.97]"
          style="background: linear-gradient(135deg, #E44203, #c73600); box-shadow: 0 4px 16px rgba(228,66,3,0.2)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          Applica coupon
        </button>
      </div>
      <div class="min-h-[24px] mt-[10px]">
        <p v-if="couponMessage" class="text-[0.8125rem]" :class="couponMessage.type === 'success' ? 'text-[#0a8a7a]' : 'text-[var(--color-brand-error)]'">
          {{ couponMessage.text }}
        </p>
      </div>
    </div>
  </div>
</template>
