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
});

const emit = defineEmits(['checkout', 'empty-cart']);
</script>

<template>
	<div class="mt-[24px] grid gap-[16px] desktop:grid-cols-[minmax(0,1fr)_320px]">
		<section class="sf-section-block">
			<div class="sf-section-block__header">
				<div class="sf-page-intro">
					<span class="sf-section-kicker">Riepilogo</span>
					<h3 class="text-[1.125rem] font-bold text-[#252B42]">Totale aggiornato del carrello</h3>
					<p class="text-[0.875rem] text-[#607184]">Importo calcolato di nuovo prima del checkout per evitare sorprese.</p>
				</div>
			</div>
			<div class="sf-section-block__body">
				<div class="flex items-center justify-between gap-[12px] border-b border-[#E1E7EA] py-[4px]">
					<span class="text-[0.9375rem] font-medium text-[#4B5563]">Importo spedizioni</span>
					<span class="text-[0.9375rem] font-semibold text-[#252B42]" :class="{ 'line-through text-[#9AA3AA]': couponApplied }">
						{{ cartMeta?.total }}
					</span>
				</div>
				<div v-if="couponApplied" class="flex items-center justify-between gap-[12px] border-b border-[#E1E7EA] py-[4px]">
					<span class="text-[0.9375rem] font-semibold text-emerald-700">Sconto coupon ({{ couponDiscount }}%)</span>
					<span class="text-[0.9375rem] font-semibold text-emerald-700">{{ appliedTotal }}</span>
				</div>
				<div class="flex items-end justify-between gap-[12px]">
					<div class="sf-page-intro">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#095866]">Totale finale</p>
						<p class="text-[0.8125rem] text-[#6B7280]">Importo finale pronto per la conferma.</p>
					</div>
					<span class="text-[1.375rem] font-bold text-[#252B42]">{{ displayTotal }}</span>
				</div>
			</div>
		</section>

		<section class="sf-section-block">
			<div class="sf-page-intro">
				<span class="sf-section-kicker">Prossimo passo</span>
				<h3 class="text-[1.0625rem] font-bold text-[#252B42]">Completa il pagamento</h3>
				<p class="text-[0.8125rem] leading-[1.5] text-[#6B7280]">
					Nel checkout scegli il metodo di pagamento e confermi l'importo con più dettaglio.
				</p>
			</div>
			<button
				type="button"
				@click="emit('checkout')"
				class="btn-cta btn-compact inline-flex min-h-[52px] items-center justify-center gap-[8px] text-[0.9375rem]">
				Procedi al checkout
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round">
					<line x1="5" y1="12" x2="19" y2="12" />
					<polyline points="12 5 19 12 12 19" />
				</svg>
			</button>
			<button
				type="button"
				@click="emit('empty-cart')"
				class="btn-secondary btn-compact inline-flex min-h-[48px] items-center justify-center gap-[6px] text-[0.875rem] hover:border-red-300 hover:text-red-500 hover:bg-red-50">
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round">
					<polyline points="3 6 5 6 21 6" />
					<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
				</svg>
				Svuota carrello
			</button>
		</section>
	</div>
</template>
