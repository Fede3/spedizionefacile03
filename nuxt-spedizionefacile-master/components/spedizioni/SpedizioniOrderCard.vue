<!--
  Componente: SpedizioniOrderCard
  Card singolo ordine nella lista spedizioni. Mostra header, body con tratta/indirizzi,
  alert pagamento, errori, azioni (paga, salva configurata, dettagli).
-->
<script setup>
const props = defineProps({
	order: { type: Object, required: true },
	statusColor: { type: Function, required: true },
	statusRaw: { type: Function, required: true },
	getOrderPackageLabel: { type: Function, required: true },
	getServiceLabel: { type: Function, required: true },
	getOrderDateLabel: { type: Function, required: true },
	getOrderSubtotalLabel: { type: Function, required: true },
	getRouteLabel: { type: Function, required: true },
	getSenderName: { type: Function, required: true },
	getRecipientName: { type: Function, required: true },
	isPendingPayment: { type: Function, required: true },
	getPendingReason: { type: Function, required: true },
	isAlreadySaved: { type: Function, required: true },
	savingToConfigured: { type: Object, default: () => ({}) },
	saveError: { type: Object, default: () => ({}) },
});

const emit = defineEmits(['saveToConfigured']);
</script>

<template>
	<div class="overflow-hidden rounded-[20px] border border-[var(--color-brand-border)] bg-white shadow-[0_10px_32px_rgba(15,23,42,0.05)]">
		<!-- Header -->
		<div class="border-b border-[var(--color-brand-border)] bg-[linear-gradient(180deg,#FBFCFD_0%,#F5F8FA_100%)] px-[16px] py-[14px] tablet:px-[20px]">
			<div class="flex flex-col gap-[10px] desktop:flex-row desktop:items-center desktop:justify-between">
				<div class="flex flex-wrap items-center gap-[10px]">
					<span class="rounded-full bg-[var(--color-brand-primary)] px-[10px] py-[4px] text-[0.75rem] font-mono font-bold text-white">SF-{{ String(order.id).padStart(6, '0') }}</span>
					<div class="min-w-0">
						<p class="text-[1rem] font-bold leading-[1.1] text-[var(--color-brand-text)]">{{ getOrderPackageLabel(order) }}</p>
						<p class="mt-[2px] text-[0.8125rem] text-[var(--color-brand-text-secondary)]">BRT {{ getServiceLabel(order) }} · {{ getOrderDateLabel(order) }}</p>
					</div>
				</div>
				<div class="flex flex-wrap items-center gap-[8px]">
					<span :class="statusColor(order.status)" class="inline-flex items-center rounded-full px-[12px] py-[5px] text-[0.75rem] font-semibold">{{ order.status }}</span>
					<span class="inline-flex items-center rounded-full bg-[#F2F6F8] px-[12px] py-[5px] text-[0.75rem] font-semibold text-[var(--color-brand-primary)]">{{ getOrderSubtotalLabel(order) }}</span>
				</div>
			</div>
		</div>

		<!-- Body -->
		<div class="px-[16px] py-[16px] tablet:px-[20px]">
			<div class="space-y-[12px]">
				<div class="rounded-[14px] border border-[#E8EEF2] bg-[#FBFCFD] px-[14px] py-[12px]">
					<p class="mb-[4px] text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[var(--color-brand-text-muted)]">Tratta</p>
					<p class="text-[1rem] font-bold leading-[1.2] text-[var(--color-brand-text)]">{{ getRouteLabel(order) }}</p>
				</div>
				<div class="grid grid-cols-1 gap-[10px] tablet:grid-cols-2 desktop:grid-cols-3">
					<div class="rounded-[14px] border border-[#E9EEF2] bg-white px-[12px] py-[11px]">
						<p class="mb-[4px] text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[var(--color-brand-text-muted)]">Mittente</p>
						<p class="text-[0.875rem] font-semibold leading-[1.35] text-[var(--color-brand-text)]">{{ getSenderName(order) }}</p>
					</div>
					<div class="rounded-[14px] border border-[#E9EEF2] bg-white px-[12px] py-[11px]">
						<p class="mb-[4px] text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[var(--color-brand-text-muted)]">Destinatario</p>
						<p class="text-[0.875rem] font-semibold leading-[1.35] text-[var(--color-brand-text)]">{{ getRecipientName(order) }}</p>
					</div>
					<div class="rounded-[14px] border border-[#E9EEF2] bg-white px-[12px] py-[11px]">
						<p class="mb-[4px] text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[var(--color-brand-text-muted)]">Ordine</p>
						<p class="text-[0.875rem] font-semibold leading-[1.35] text-[var(--color-brand-text)]">#{{ order.id }}</p>
						<p class="mt-[3px] text-[0.75rem] text-[var(--color-brand-text-secondary)]">{{ getOrderDateLabel(order) }}</p>
					</div>
				</div>
				<div class="flex flex-wrap items-center gap-[8px]">
					<span class="inline-flex items-center rounded-full bg-[#F4F7F9] px-[11px] py-[6px] text-[0.75rem] font-semibold text-[var(--color-brand-primary)]">{{ getOrderPackageLabel(order) }}</span>
					<span class="inline-flex items-center rounded-full bg-[#FFF5EB] px-[11px] py-[6px] text-[0.75rem] font-semibold text-[var(--color-brand-accent)]">{{ getServiceLabel(order) }}</span>
				</div>
			</div>
		</div>

		<!-- Pending alert -->
		<div v-if="isPendingPayment(order)" class="mx-[20px] my-[12px] flex items-center gap-[12px] rounded-[20px] border border-amber-200 bg-amber-50 px-[16px] py-[12px]">
			<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="#F59E0B" class="shrink-0"><path d="M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16"/></svg>
			<p class="text-[0.8125rem] text-amber-800 flex-1">{{ getPendingReason(order) }}</p>
		</div>

		<!-- Save error -->
		<div v-if="saveError[order.id]" class="mx-[20px] my-[8px] flex items-center gap-[10px] rounded-[20px] border border-red-200 bg-red-50 px-[16px] py-[10px]">
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#EF4444" class="shrink-0"><path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
			<p class="text-red-600 text-[0.8125rem] font-medium">{{ saveError[order.id] }}</p>
		</div>

		<!-- Refund info -->
		<div v-if="statusRaw(order.status) === 'refunded' && order.refund_amount" class="mx-[20px] my-[8px] flex items-center gap-[10px] rounded-[20px] border border-orange-200 bg-orange-50 px-[16px] py-[10px]">
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EA580C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
			<p class="text-orange-700 text-[0.8125rem]">Rimborso di <span class="font-semibold">{{ order.refund_amount }}</span> effettuato<span v-if="order.refunded_at"> il {{ order.refunded_at }}</span></p>
		</div>

		<!-- Footer actions -->
		<div class="border-t border-[var(--color-brand-border)] px-[16px] py-[12px] tablet:px-[20px]">
			<div class="flex flex-col gap-[10px] desktop:flex-row desktop:items-center desktop:justify-between">
				<div class="flex flex-col gap-[8px] tablet:flex-row tablet:flex-wrap tablet:items-center">
					<NuxtLink v-if="isPendingPayment(order)" :to="`/checkout?order_id=${order.id}`"
						class="btn-cta btn-compact inline-flex w-full items-center justify-center gap-[6px] text-[0.8125rem] tablet:w-auto">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20,8H4V6H20M20,18H4V12H20M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z"/></svg>
						Paga ora
					</NuxtLink>
					<button v-if="!isAlreadySaved(order)" type="button" @click="emit('saveToConfigured', order)"
						:disabled="savingToConfigured[order.id]"
						class="btn-primary btn-compact inline-flex w-full items-center justify-center gap-[6px] text-[0.8125rem] tablet:w-auto">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3M19,19H5V5H16.17L19,7.83V19M12,12A3,3 0 0,0 9,15A3,3 0 0,0 12,18A3,3 0 0,0 15,15A3,3 0 0,0 12,12M6,6H15V10H6V6Z"/></svg>
						{{ savingToConfigured[order.id] ? 'Salvataggio...' : 'Salva configurata' }}
					</button>
					<span v-else class="inline-flex w-full items-center justify-center gap-[6px] rounded-full bg-[#f0fdf4] px-[14px] py-[9px] text-[0.8125rem] font-semibold text-[#0a8a7a] tablet:w-auto">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>
						Salvata
					</span>
				</div>
				<NuxtLink :to="`/account/spedizioni/${order.id}`" title="Vedi dettagli"
					class="btn-secondary btn-compact inline-flex w-full items-center justify-center gap-[8px] text-[0.875rem] desktop:w-auto">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="var(--color-brand-primary)"><path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/></svg>
					<span>Apri dettagli</span>
				</NuxtLink>
			</div>
		</div>
	</div>
</template>
