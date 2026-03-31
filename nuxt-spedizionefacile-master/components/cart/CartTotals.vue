<!--
  FILE: components/cart/CartTotals.vue
  SCOPO: Blocco riepilogo totali + pulsanti checkout/svuota.
  PROPS: cartMeta, couponApplied, couponDiscount, appliedTotal, displayTotal
  EMITS: checkout, empty-cart
-->
<script setup>
defineProps({
  cartMeta: { type: Object, default: () => ({}) },
  couponApplied: { type: Boolean, default: false },
  couponDiscount: { type: [Number, String], default: null },
  appliedTotal: { type: [Number, String], default: null },
  displayTotal: { type: [Number, String], default: null },
})

const emit = defineEmits(['checkout', 'empty-cart'])
</script>

<template>
  <div class="mt-[24px] border-t border-[#E8EEF0] pt-[20px] grid gap-[16px] desktop:grid-cols-[minmax(0,1fr)_320px]">
    <div class="rounded-[12px] border border-[#E3E8EA] bg-[#F8FAFB] p-[18px]">
      <div class="flex items-center justify-between py-[8px] border-b border-[#E1E7EA]">
        <span class="text-[0.9375rem] font-medium text-[#4B5563]">Importo spedizioni</span>
        <span class="text-[0.9375rem] font-semibold text-[#252B42]" :class="{ 'line-through text-[#9AA3AA]': couponApplied }">{{ cartMeta?.total }}</span>
      </div>
      <div v-if="couponApplied" class="flex items-center justify-between py-[10px] border-b border-[#E1E7EA]">
        <span class="text-[0.9375rem] font-semibold text-emerald-700">Sconto coupon ({{ couponDiscount }}%)</span>
        <span class="text-[0.9375rem] font-semibold text-emerald-700">{{ appliedTotal }}</span>
      </div>
      <div class="flex items-end justify-between gap-[12px] pt-[14px]">
        <div>
          <p class="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#095866]">Totale finale</p>
          <p class="text-[0.8125rem] text-[#6B7280] mt-[4px]">Importo aggiornato prima del checkout.</p>
        </div>
        <span class="text-[1.375rem] font-bold text-[#252B42]">{{ displayTotal }}</span>
      </div>
    </div>

    <div class="flex flex-col gap-[10px]">
      <button
        type="button"
        @click="emit('checkout')"
        class="inline-flex items-center justify-center gap-[8px] px-[28px] min-h-[56px] rounded-[12px] bg-[#E44203] text-white font-semibold text-[1rem] hover:bg-[#c93800] transition-[background-color,box-shadow,transform] duration-200 shadow-[0_10px_20px_rgba(228,66,3,0.18)] hover:shadow-[0_14px_28px_rgba(228,66,3,0.24)] active:scale-[0.97] cursor-pointer">
        Procedi al checkout
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </button>
      <p class="text-[0.8125rem] text-[#6B7280] leading-[1.5]">
        Nel checkout potrai scegliere il metodo di pagamento e confermare l'importo finale con più dettaglio.
      </p>
      <button
        type="button"
        @click="emit('empty-cart')"
        class="inline-flex items-center justify-center gap-[6px] px-[20px] min-h-[48px] rounded-[12px] border border-[#E3E8EA] bg-white text-[#5B6470] text-[0.875rem] font-medium hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-[border-color,color,background-color,transform] duration-200 cursor-pointer active:scale-[0.97]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        Svuota carrello
      </button>
    </div>
  </div>
</template>
