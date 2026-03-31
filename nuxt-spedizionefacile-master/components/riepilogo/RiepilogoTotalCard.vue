<!--
  Card totale con badge promo per il riepilogo spedizione.
-->
<script setup>
defineProps({
	totalPrice: { type: String, required: true },
	promoSettings: { type: Object, default: null },
});
</script>

<template>
	<div class="sf-surface-card border-[#f1d8cb] bg-[linear-gradient(135deg,#ffffff_0%,#fff8f3_72%,#fff1e8_100%)] p-[16px] tablet:p-[24px_32px] mb-[24px]">
		<div class="flex items-center justify-between gap-[12px]">
			<span class="text-[#252B42] text-[1rem] tablet:text-[1.125rem] font-semibold">Totale</span>
			<span class="text-[#E44203] text-[1.5rem] tablet:text-[1.75rem] font-bold">{{ totalPrice }}&euro;</span>
		</div>
		<div v-if="promoSettings?.active && promoSettings?.label_text" class="flex justify-end mt-[8px]">
			<span
				:style="{ backgroundColor: promoSettings.label_color || '#E44203' }"
				class="inline-flex items-center gap-[5px] px-[10px] py-[4px] rounded-[6px] text-white text-[0.75rem] font-bold tracking-wide">
				<img v-if="promoSettings.label_image" :src="promoSettings.label_image" alt="" loading="lazy" decoding="async" width="30" height="14" class="h-[14px] w-auto" />
				{{ promoSettings.label_text }}
			</span>
		</div>
	</div>
</template>
