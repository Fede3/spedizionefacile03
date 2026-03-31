<!--
  PriceResult.vue
  Mostra il prezzo calcolato con CTA per procedere.
  Include il banner promo, il bottone Continua / "Spedisci da X", e il loading spinner.
-->
<script setup>
import { formatEuro } from '~/utils/price.js'

const props = defineProps({
  isRateCalculated: { type: Boolean, default: false },
  isCalculating: { type: Boolean, default: false },
  isSessionPending: { type: Boolean, default: false },
  totalPrice: { type: Number, default: 0 },
  sessionTotalPrice: { type: [String, Number, null], default: null },
  promoSettings: { type: Object, default: null },
})

const emit = defineEmits(['continue'])

const displayPrice = computed(() => props.sessionTotalPrice || formatEuro(props.totalPrice))
</script>

<template>
  <!-- Promo banner -->
  <div v-if="promoSettings?.active && promoSettings?.label_text" class="flex justify-center mt-[20px] desktop:mt-[16px]">
    <span
      :style="{ backgroundColor: promoSettings.label_color || '#E44203' }"
      class="inline-flex items-center gap-[6px] px-[14px] py-[6px] rounded-[8px] text-white text-[0.875rem] font-bold tracking-wide shadow-sm">
      <img v-if="promoSettings.label_image" :src="promoSettings.label_image" alt="" loading="lazy" decoding="async" width="40" height="18" class="h-[18px] w-auto" />
      {{ promoSettings.label_text }}
    </span>
  </div>

  <!-- Bottone CTA -->
  <div
    class="continue-button-wrapper bg-[#E44203] w-full text-white font-semibold text-center rounded-[50px] tracking-[-0.48px] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[#c93800] hover:shadow-[0_6px_20px_rgba(228,66,3,0.35)] active:scale-[0.98] overflow-hidden"
    :class="[
      { 'text-[1.25rem] tablet:text-[1.875rem] h-[64px] tablet:h-[80px]': !isRateCalculated, 'min-h-[90px] tablet:h-[113px] py-[8px] tablet:py-0': isRateCalculated },
      promoSettings?.active && promoSettings?.label_text ? 'mt-[12px]' : 'mt-[24px] desktop-xl:mt-[40px] desktop:mt-[20px]'
    ]">
    <button
      v-if="!isSessionPending && !isCalculating"
      type="button"
      @click="emit('continue')"
      :disabled="isCalculating"
      class="w-full h-full rounded-[50px] cursor-pointer flex items-center justify-center gap-[10px] text-[1.25rem] tablet:text-[1.875rem] disabled:opacity-70 disabled:cursor-not-allowed">
      <span v-if="!isRateCalculated">Continua</span>
      <span v-else>
        <span class="text-[1.5rem] tablet:text-[2.25rem] border-b-[1px] border-white pb-[4px]">Spedisci da {{ displayPrice }}&euro;</span>
        <span class="block text-center mt-[5px] text-[0.875rem] tablet:text-[1rem]">IVA inclusa</span>
      </span>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
    </button>

    <p v-if="isSessionPending || isCalculating" class="h-full flex justify-center items-center">
      <svg class="animate-spin h-[60px] w-[60px] text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </p>
  </div>
</template>
