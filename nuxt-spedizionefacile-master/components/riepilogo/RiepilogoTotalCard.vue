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
	<div class="sf-surface-card border-[#b5d3d8] bg-[linear-gradient(135deg,#ffffff_0%,#f2fafb_60%,#eaf5f7_100%)] p-[20px] tablet:p-[28px_32px] mb-[16px]">
		<div class="flex items-center justify-between gap-[12px]">
			<span class="text-[var(--color-brand-text)] text-[1.0625rem] tablet:text-[1.125rem] font-semibold">Totale spedizione</span>
			<span class="text-[var(--color-brand-primary)] text-[2rem] tablet:text-[2.5rem] font-extrabold tracking-tight leading-none">{{ totalPrice }}&euro;</span>
		</div>
		<div v-if="promoSettings?.active && promoSettings?.label_text" class="flex justify-end mt-[10px]">
			<span
				:style="{ backgroundColor: promoSettings.label_color || 'var(--color-brand-accent)' }"
				class="inline-flex items-center gap-[5px] px-[12px] py-[4px] rounded-[999px] text-white text-[0.75rem] font-bold tracking-wide">
				<img v-if="promoSettings.label_image" :src="promoSettings.label_image" alt="" loading="lazy" decoding="async" width="30" height="14" class="h-[14px] w-auto" />
				{{ promoSettings.label_text }}
			</span>
		</div>
	</div>
</template>
