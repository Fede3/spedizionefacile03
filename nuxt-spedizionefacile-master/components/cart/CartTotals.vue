<!--
  FILE: components/cart/CartTotals.vue
  SCOPO: Sidebar riepilogo — design prototipo (card bianca rounded-16, ring, promo inline, totale accent).
  Integra anche sezione coupon collassabile.
  PROPS: cartMeta, couponApplied, couponDiscount, appliedTotal, displayTotal, displayEntries,
         couponCode, couponMessage, showCouponField, showCouponPanel
  EMITS: checkout, empty-cart, toggle-coupon, apply-coupon, remove-coupon, update:coupon-code
-->
<script setup>
defineProps({
  cartMeta: { type: Object, default: () => ({}) },
  couponApplied: { type: Boolean, default: false },
  couponDiscount: { type: [Number, String], default: null },
  appliedTotal: { type: [Number, String], default: null },
  displayTotal: { type: [Number, String], default: null },
  displayEntries: { type: Array, default: () => [] },
  couponCode: { type: String, default: '' },
  couponMessage: { type: Object, default: null },
  showCouponField: { type: Boolean, default: false },
  showCouponPanel: { type: Boolean, default: false },
});

const emit = defineEmits(['toggle-coupon', 'apply-coupon', 'remove-coupon', 'update:coupon-code']);
</script>

<template>
  <div class="bg-[#F5F6F9] rounded-[16px] ring-[1.5px] ring-[#DFE2E7] px-[20px] py-[20px]" style="box-shadow: 0 1px 4px rgba(0,0,0,0.03)">

    <!-- Title -->
    <h3 class="text-[var(--color-brand-text)] text-[16px] mb-[14px]" style="font-weight: 700">Riepilogo</h3>

    <!-- Line items -->
    <div class="space-y-[8px]">
      <!-- Subtotale -->
      <div class="flex justify-between text-[14px]">
        <span class="text-[var(--color-brand-text-muted)]">Spedizioni ({{ cartMeta?.count || displayEntries?.length || 0 }})</span>
        <span class="text-[var(--color-brand-text)]" :class="{ 'line-through text-[var(--color-brand-text-muted)]': couponApplied }" style="font-weight: 600">{{ cartMeta?.total }}</span>
      </div>

      <!-- Sconto coupon -->
      <div v-if="couponApplied" class="flex justify-between text-[14px]">
        <span class="text-[#0a8a7a]" style="font-weight: 600">Sconto ({{ couponDiscount }}%)</span>
        <span class="text-[#0a8a7a]" style="font-weight: 600">{{ appliedTotal }}</span>
      </div>

      <!-- Divider -->
      <div class="h-[1px] bg-[#DFE2E7]"></div>

      <!-- Totale -->
      <div class="flex justify-between items-baseline">
        <span class="text-[var(--color-brand-text)] text-[15px]" style="font-weight: 700">Totale</span>
        <span class="text-[var(--color-brand-accent)] text-[22px] tracking-tight" style="font-weight: 800">{{ displayTotal }}</span>
      </div>
      <span class="text-[var(--color-brand-text-secondary)] text-[13px] block" style="font-weight: 400">IVA inclusa</span>
    </div>

    <!-- Promo code toggle -->
    <button
      type="button"
      @click="emit('toggle-coupon')"
      :aria-expanded="showCouponPanel"
      class="w-full flex items-center justify-between mt-[14px] pt-[12px] border-t border-[#DFE2E7] cursor-pointer"
    >
      <span class="text-[var(--color-brand-text)] text-[13px]" style="font-weight: 600">Codice sconto</span>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#777" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        class="transition-transform duration-300" :class="showCouponPanel ? 'rotate-180' : ''"><polyline points="6 9 12 15 18 9"/></svg>
    </button>

    <!-- Promo code form (collapsible) -->
    <div v-if="showCouponPanel" class="mt-[10px] overflow-hidden">
      <div class="flex gap-[6px]">
        <!-- Applied state -->
        <div v-if="couponApplied" class="flex-1 flex items-center gap-[6px] bg-[#f0fdf4] rounded-[12px] px-[12px] h-[48px] ring-[1.5px] ring-[#d1fae5]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span class="text-[#0a8a7a] text-[12px]" style="font-weight: 600">{{ couponCode.toUpperCase() }} (-{{ couponDiscount }}%)</span>
          <button
            type="button"
            @click="emit('remove-coupon')"
            class="text-red-500 text-[11px] hover:underline cursor-pointer ml-auto"
            style="font-weight: 600"
          >Rimuovi</button>
        </div>

        <!-- Input state -->
        <template v-else>
          <input
            type="text"
            :value="couponCode"
            @input="emit('update:coupon-code', $event.target.value)"
            placeholder="Codice..."
            class="flex-1 h-[48px] rounded-[12px] bg-white ring-[1.5px] ring-[#DFE2E7] focus:ring-[3px] focus:ring-[var(--color-brand-primary)]/60 px-[12px] text-[13px] text-[var(--color-brand-text)] uppercase placeholder:text-[var(--color-brand-text-muted)] placeholder:normal-case outline-none transition-all"
            style="font-weight: 600"
          />
          <button
            type="button"
            @click="emit('apply-coupon')"
            class="h-[48px] px-[14px] rounded-full text-white text-[12px] cursor-pointer outline-none transition-all hover:opacity-90"
            style="font-weight: 700; background: linear-gradient(135deg, #095866, #0a7489)"
          >OK</button>
        </template>
      </div>
      <!-- Coupon feedback message -->
      <p v-if="couponMessage" class="text-[12px] mt-[6px]" :class="couponMessage.type === 'success' ? 'text-[#0a8a7a]' : 'text-red-500'">
        {{ couponMessage.text }}
      </p>
    </div>
  </div>
</template>
