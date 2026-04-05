<!--
  FILE: components/cart/CouponForm.vue
  SCOPO: Input codice coupon con bottone applica/rimuovi.
  PROPS: couponApplied, couponCode, couponDiscount, couponMessage
  EMITS: apply(code), remove, update:couponCode
-->
<script setup>
const props = defineProps({
  couponApplied: { type: Boolean, default: false },
  couponCode: { type: String, default: '' },
  couponDiscount: { type: [Number, String], default: null },
  couponMessage: { type: Object, default: null },
})

const emit = defineEmits(['apply', 'remove', 'update:couponCode'])

const onInput = (e) => {
  emit('update:couponCode', e.target.value)
}
</script>

<template>
  <div class="flex flex-col tablet:flex-row items-stretch tablet:items-center gap-3 tablet:gap-[16px] mb-5">
    <span class="text-[1rem] font-bold text-[var(--color-brand-text)]">Inserisci Coupon</span>
    <div class="w-full tablet:flex-1 tablet:max-w-[300px]">
      <input
        v-if="!couponApplied"
        type="text"
        :value="couponCode"
        @input="onInput"
        placeholder="PROVA123"
        class="w-full bg-white border border-[var(--color-brand-border)] rounded-[12px] h-[48px] tablet:h-[44px] px-[18px] text-[1rem] tablet:text-[0.875rem] text-[#404040] placeholder:text-[#999] transition-[border-color,box-shadow] duration-200 focus:border-[var(--color-brand-primary)] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
      <div v-else class="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-[12px] h-[44px] px-[18px]">
        <span class="text-emerald-700 font-semibold text-[0.875rem]">{{ couponCode.toUpperCase() }} (-{{ couponDiscount }}%)</span>
        <button @click="emit('remove')" class="text-red-500 text-[0.75rem] hover:underline cursor-pointer ml-auto">X</button>
      </div>
    </div>
    <button
      v-if="!couponApplied"
      type="button"
      @click="emit('apply', couponCode)"
      class="inline-flex items-center justify-center gap-1.5 bg-[var(--color-brand-primary)] text-white font-semibold text-[0.9375rem] px-[28px] min-h-[48px] w-full tablet:w-auto rounded-[50px] hover:bg-[var(--color-brand-primary-hover)] transition-[background-color,transform] duration-200 cursor-pointer active:scale-[0.97]">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5.5 7A1.5 1.5 0 0 1 4 5.5A1.5 1.5 0 0 1 5.5 4A1.5 1.5 0 0 1 7 5.5A1.5 1.5 0 0 1 5.5 7m15.91 4.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.11 0-2 .89-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58c.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41c0-.55-.23-1.06-.59-1.42" /></svg>
      Applica Coupon
    </button>
  </div>
  <p v-if="couponMessage" class="text-[0.8125rem] mb-3" :class="couponMessage.type === 'success' ? 'text-emerald-600' : 'text-red-500'">
    {{ couponMessage.text }}
  </p>
</template>
