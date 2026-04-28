<!--
  Componente: ShipmentCancelModal
  Modale di conferma annullamento ordine con controllo idoneita' rimborso.
  Refactor 2026-04-26: usa <SfModal> (focus trap + ESC + body scroll lock managed),
  riducendo ~50 LOC custom (Teleport + trapFocus + watch open).
-->
<script setup>
const props = defineProps({
	show: { type: Boolean, required: true },
	loadingEligibility: { type: Boolean, default: false },
	refundEligibility: { type: Object, default: null },
	cancelling: { type: Boolean, default: false },
	cancelError: { type: String, default: null },
	cancelReason: { type: String, default: '' },
	orderSubtotal: { type: String, default: '' },
	paymentMethodLabel: { type: Function, required: true },
});

const emit = defineEmits(['update:show', 'update:cancelReason', 'confirm']);

// Bridge v-model: SfModal usa modelValue/update:modelValue.
const open = computed({
	get: () => props.show,
	set: (v) => emit('update:show', v),
});
</script>

<template>
	<SfModal v-model="open" size="sm" :persistent="cancelling">
		<!-- Header con icona warning -->
		<div class="flex items-center gap-[12px] mb-[16px]">
			<div class="w-[44px] h-[44px] rounded-full bg-red-100 flex items-center justify-center shrink-0" aria-hidden="true">
				<UIcon name="mdi:alert-outline" class="text-red-500 text-[24px]" />
			</div>
			<div>
				<h2 class="font-montserrat text-[1.125rem] font-[800] text-[var(--color-brand-text)]">Bloccare questo pacco?</h2>
				<p class="text-[0.8125rem] text-[var(--color-brand-text-secondary)]">Il pacco verra' bloccato e non potra' più essere consegnato.</p>
			</div>
		</div>

		<!-- Loading -->
		<div v-if="loadingEligibility" class="py-[20px] text-center">
			<div class="inline-block w-[24px] h-[24px] border-[3px] border-[var(--color-brand-primary)] border-t-transparent rounded-full animate-spin"/>
			<p class="mt-[10px] text-[0.8125rem] text-[var(--color-brand-text-secondary)]">Controllo in corso...</p>
		</div>

		<!-- Eligibility loaded -->
		<template v-else-if="refundEligibility">
			<!-- Not eligible -->
			<div v-if="!refundEligibility.eligible" class="bg-red-50 border border-red-200 rounded-[50px] px-[16px] py-[12px] mb-[16px]" role="alert">
				<p class="text-[0.875rem] text-red-700">{{ refundEligibility.reason }}</p>
			</div>

			<!-- Eligible -->
			<template v-else>
				<div class="bg-[#F8F9FB] rounded-[16px] p-[16px] mb-[16px]">
					<p class="text-[0.8125rem] text-[var(--color-brand-text-secondary)] mb-[10px]">{{ refundEligibility.reason }}</p>
					<div v-if="refundEligibility.refund_amount_cents > 0" class="space-y-[8px]">
						<div class="flex items-center justify-between text-[0.875rem]">
							<span class="text-[var(--color-brand-text-secondary)]">Totale ordine:</span>
							<span class="font-semibold text-[var(--color-brand-text)]">{{ orderSubtotal }}</span>
						</div>
						<div class="flex items-center justify-between text-[0.875rem]">
							<span class="text-[var(--color-brand-text-secondary)]">Commissione annullamento:</span>
							<span class="font-semibold text-red-600">- {{ refundEligibility.commission_eur }} EUR</span>
						</div>
						<div class="border-t border-[var(--color-brand-border)] pt-[8px] flex items-center justify-between text-[0.9375rem]">
							<span class="font-semibold text-[var(--color-brand-text)]">Rimborso:</span>
							<span class="font-bold text-[#0a8a7a]">{{ refundEligibility.refund_amount_eur }} EUR</span>
						</div>
						<div class="flex items-center justify-between text-[0.8125rem]">
							<span class="text-[var(--color-brand-text-secondary)]">Metodo rimborso:</span>
							<span class="font-medium text-[var(--color-brand-text)]">{{ paymentMethodLabel(refundEligibility.payment_method) }}</span>
						</div>
					</div>
				</div>

				<!-- Motivo -->
				<div class="mb-[16px]">
					<label class="block text-[0.75rem] text-[var(--color-brand-text-secondary)] uppercase font-medium mb-[4px]">Motivo (opzionale)</label>
					<textarea
:value="cancelReason" placeholder="Perché vuoi annullare questa spedizione?"
						maxlength="500" rows="2" class="w-full bg-[#F8F9FB] border border-[var(--color-brand-border)] rounded-[16px] p-[10px] text-[0.875rem] resize-none"
						@input="emit('update:cancelReason', $event.target.value)"/>
				</div>

				<!-- Errore -->
				<div v-if="cancelError" class="bg-red-50 border border-red-200 rounded-[50px] px-[14px] py-[10px] text-red-600 text-[0.8125rem] mb-[12px]" role="alert">{{ cancelError }}</div>

				<!-- Azioni -->
				<div class="flex gap-[10px]">
					<button
type="button" :disabled="cancelling" class="flex-1 inline-flex items-center justify-center gap-[6px] px-[16px] py-[12px] bg-red-600 text-white rounded-[50px] text-[0.875rem] font-semibold hover:bg-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
						@click="emit('confirm')">
						<UIcon name="mdi:close-circle-outline" class="text-[18px]" />
						{{ cancelling ? 'Blocco in corso...' : 'Conferma blocco pacco' }}
					</button>
					<button
type="button" :disabled="cancelling" class="px-[20px] py-[12px] bg-[var(--color-brand-border)] text-[var(--color-brand-text)] rounded-[50px] text-[0.875rem] font-semibold hover:bg-[#D0D0D0] transition disabled:opacity-60 cursor-pointer"
						@click="emit('update:show', false)">
						Indietro
					</button>
				</div>
			</template>
		</template>

		<!-- Error loading eligibility -->
		<template v-else>
			<div v-if="cancelError" class="bg-red-50 border border-red-200 rounded-[50px] px-[14px] py-[10px] text-red-600 text-[0.8125rem] mb-[12px]" role="alert">{{ cancelError }}</div>
			<button
type="button" class="w-full px-[16px] py-[12px] bg-[var(--color-brand-border)] text-[var(--color-brand-text)] rounded-[50px] text-[0.875rem] font-semibold hover:bg-[#D0D0D0] transition cursor-pointer"
				@click="emit('update:show', false)">
				Chiudi
			</button>
		</template>
	</SfModal>
</template>
