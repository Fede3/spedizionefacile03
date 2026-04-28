<script setup>
/**
 * AdminBankTransferConfirmModal — modal conferma ricezione bonifico admin.
 *
 * Estratto da pages/account/amministrazione/bonifici.vue (era Teleport inline).
 * Refactor 2026-04-26: usa <SfModal> (focus trap + ESC + body scroll lock managed),
 * elimina ~25 LOC di Teleport markup custom.
 */
const props = defineProps({
	order: { type: Object, default: null },
	confirming: { type: Boolean, default: false },
	formatAmount: { type: Function, required: true },
});

const emit = defineEmits(['close', 'confirm']);

const reference = ref('');

watch(() => props.order, (val) => {
	if (val) reference.value = '';
});

// Bridge v-model: SfModal usa modelValue. Aperto se props.order != null.
const open = computed({
	get: () => !!props.order,
	set: (v) => { if (!v) emit('close'); },
});

const handleConfirm = () => emit('confirm', reference.value);
const handleClose = () => emit('close');
</script>

<template>
	<SfModal v-model="open" size="sm" :persistent="confirming">
		<div v-if="order" class="flex items-center gap-[12px] mb-[16px]">
			<div class="w-[44px] h-[44px] rounded-full bg-[#EEF6F8] flex items-center justify-center shrink-0">
				<UIcon name="mdi:bank-outline" class="text-[var(--color-brand-primary)] text-[24px]" />
			</div>
			<div>
				<h3 class="font-montserrat text-[1.125rem] font-[800] text-[var(--color-brand-text)]">Conferma ricezione bonifico</h3>
				<p class="text-[0.8125rem] text-[var(--color-brand-text-secondary)]">
					Ordine #{{ order.id }} — {{ formatAmount(order.payable_total_cents ?? order.subtotal_cents ?? (order.subtotal?.amount ? Number(order.subtotal.amount) * 100 : null)) }}
				</p>
			</div>
		</div>

		<div v-if="order" class="space-y-[12px]">
			<div class="bg-[#F8F9FB] rounded-[12px] px-[14px] py-[10px] text-[0.8125rem] text-[var(--color-brand-text-secondary)]">
				<p>Causale attesa: <strong class="font-mono text-[var(--color-brand-text)]">ORD-{{ order.id }}</strong></p>
				<p v-if="order.user">Cliente: {{ order.user.name }} {{ order.user.surname }}</p>
			</div>

			<div>
				<label class="block text-[0.75rem] text-[var(--color-brand-text-secondary)] uppercase font-medium mb-[4px]">
					Riferimento contabile (opzionale)
				</label>
				<input
					v-model="reference"
					type="text"
					maxlength="128"
					placeholder="Es. CRO bonifico o numero estratto conto"
					class="w-full bg-[#F8F9FB] border border-[var(--color-brand-border)] rounded-[12px] px-[12px] py-[10px] text-[0.875rem] focus:border-[var(--color-brand-primary)] focus:outline-none" >
			</div>

			<p class="text-[0.75rem] text-[var(--color-brand-text-muted)]">
				Confermando, l'ordine passa a "Completato" e parte la generazione automatica dell'etichetta BRT. Il cliente riceverà una email di conferma.
			</p>
		</div>

		<template #footer>
			<SfButton variant="secondary" size="sm" :disabled="confirming" @click="handleClose">Annulla</SfButton>
			<SfButton variant="primary" size="sm" :loading="confirming" loading-text="Conferma in corso..." @click="handleConfirm">Conferma ricezione</SfButton>
		</template>
	</SfModal>
</template>
