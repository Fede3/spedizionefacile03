<!--
  FILE: components/cart/CartSummary.vue
  SCOPO: Riepilogo totale del carrello: importo, sconto coupon, bottoni svuota/checkout.
  PROPS: cartMeta, couponApplied, couponDiscount, appliedTotal, displayTotal
  EMITS: empty-cart, checkout
-->
<script setup>
defineProps({
  cartMeta: { type: Object, default: () => ({}) },
  couponApplied: { type: Boolean, default: false },
  couponDiscount: { type: [Number, String], default: null },
  appliedTotal: { type: [Number, String], default: null },
  displayTotal: { type: [Number, String], default: null },
})

const emit = defineEmits(['empty-cart', 'checkout'])
</script>

<template>
  <!-- Totals -->
  <div class="mt-[20px] border-t border-[#C0C0C0] pt-[12px]">
    <div class="flex items-center justify-between py-[8px] border-b border-dashed border-[#C0C0C0]">
      <span class="text-[0.9375rem] font-bold text-[#252B42]">Importo spedizioni</span>
      <span class="text-[0.9375rem] font-bold text-[#252B42]" :class="{ 'line-through text-[#A0A5AB]': couponApplied }">{{ cartMeta?.total }}</span>
    </div>
    <div v-if="couponApplied" class="flex items-center justify-between py-[8px] border-b border-dashed border-[#C0C0C0]">
      <span class="text-[0.9375rem] font-bold text-emerald-600">Sconto coupon ({{ couponDiscount }}%)</span>
      <span class="text-[0.9375rem] font-bold text-emerald-600">{{ appliedTotal }}</span>
    </div>
    <div class="flex items-center justify-between py-[8px]">
      <span class="text-[1rem] font-bold text-[#252B42]">Importo totale</span>
      <span class="text-[1rem] font-bold text-[#252B42]">{{ displayTotal }}</span>
    </div>
  </div>

  <!-- Action buttons -->
  <div class="flex flex-col-reverse tablet:flex-row items-stretch tablet:items-center tablet:justify-between mt-[24px] gap-3">
    <button
      type="button"
      @click="emit('empty-cart')"
      class="inline-flex items-center justify-center gap-1.5 px-[20px] min-h-[48px] rounded-[50px] border border-[#E9EBEC] text-[#737373] text-[0.875rem] font-medium hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-[border-color,color,background-color,transform] duration-200 cursor-pointer active:scale-[0.97]">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15.46 15.12L16.88 16.54l1.62-1.62l1.41 1.41l-1.62 1.62l1.62 1.62l-1.41 1.41l-1.62-1.62l-1.62 1.62l-1.41-1.41l1.62-1.62l-1.62-1.62zM3 6v2h2l3.6 7.59l-1.35 2.44C7.09 18.36 7 18.67 7 19c0 1.1.9 2 2 2h9v-2H9.42c-.14 0-.25-.11-.25-.25l.03-.12L10.12 17h5.75c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 20.34 8H5.21l-.94-2zM9 21c-1.1 0-1.99.9-1.99 2S7.9 25 9 25s2-.9 2-2s-.9-2-2-2" /></svg>
      Svuota carrello
    </button>
    <button
      type="button"
      @click="emit('checkout')"
      class="inline-flex items-center justify-center gap-2 px-[40px] min-h-[52px] rounded-[50px] bg-[#E44203] text-white font-semibold text-[1rem] hover:bg-[#c93800] transition-[background-color,box-shadow,transform] duration-200 shadow-sm hover:shadow-[0_4px_12px_rgba(228,66,3,0.3)] active:scale-[0.97] cursor-pointer">
      Procedi con l'ordine
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4 11v2h12l-5.5 5.5l1.42 1.42L19.84 12l-7.92-7.92L10.5 5.5L16 11z" /></svg>
    </button>
  </div>
</template>
