<!--
  FILE: components/account/AccountWalletMovements.vue
  SCOPO: Storico movimenti del portafoglio — lista cronologica con icona, fonte, importo.
  PROPS: movements (Array), isLoadingMovements (Boolean), movementsError (String).
-->
<script setup>
import { formatDateTimeIt } from '~/utils/date.js';

const props = defineProps({
	movements: { type: Array, default: () => [] },
	isLoadingMovements: { type: Boolean, default: true },
	movementsError: { type: String, default: '' },
});

const emit = defineEmits(['retry-movements']);

const formatDate = (dateStr) => formatDateTimeIt(dateStr);

const hasMovements = computed(() => props.movements?.length > 0);
const hasBlockingError = computed(() => Boolean(props.movementsError) && !hasMovements.value);
const countLabel = computed(() => {
	if (props.isLoadingMovements && !hasMovements.value) return 'Caricamento';
	if (hasBlockingError.value) return 'Da aggiornare';
	if (!hasMovements.value) return 'Ancora nessuno';
	return `${props.movements.length} ${props.movements.length === 1 ? 'movimento' : 'movimenti'}`;
});

const getMovementColor = (mov) => {
	return mov.type === 'credit' ? 'text-[var(--color-brand-primary)]' : 'text-[#B42318]';
};

const getMovementSign = (mov) => {
	return mov.type === 'credit' ? '+' : '-';
};

const getSourceLabel = (source) => {
	const labels = {
		stripe: 'Carta',
		commission: 'Commissione',
		withdrawal: 'Prelievo',
		wallet: 'Portafoglio',
		refund: 'Rimborso',
	};
	return labels[source] || source || 'Operazione';
};

const getSourceColor = (source) => {
	const colors = {
		stripe: 'bg-[#EDF7F8] text-[var(--color-brand-primary)]',
		commission: 'bg-[#FFF4E8] text-[#B45309]',
		withdrawal: 'bg-[#F5F7F8] text-[#4B5563]',
		wallet: 'bg-[#EDF7F8] text-[var(--color-brand-primary)]',
		refund: 'bg-[#FEF2F2] text-[#B42318]',
	};
	return colors[source] || 'bg-[#F5F7F8] text-[var(--color-brand-text-secondary)]';
};

const getMovementTitle = (mov) => {
	if (mov.description) return mov.description;
	if (mov.type === 'credit') return 'Entrata sul portafoglio';
	return 'Uscita dal portafoglio';
};

/* SVG icons per source: returns path d for the movement icon */
const getMovementSvg = (mov) => {
	if (mov.source === 'commission')
		return 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zM6 20v-2a4 4 0 0 1 4-4h.5M16 16h2m0 0h2m-2 0v-2m0 2v2';
	if (mov.source === 'withdrawal') return 'M3 6h18M3 12h18M3 18h18M17 6l3 3-3 3';
	if (mov.source === 'wallet') return 'M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1';
	if (mov.source === 'refund') return 'M3 10h4l3 8 4-16 3 8h4';
	if (mov.source === 'stripe') {
		return mov.type === 'credit' ? 'M1 4h22v16H1zM1 10h22M12 14h4' : 'M1 4h22v16H1zM1 10h22M10 14h4';
	}
	return 'M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4';
};
</script>

<template>
	<div class="mt-[20px] rounded-[20px] border border-[var(--color-brand-border)] bg-white p-[16px] shadow-sm desktop:mt-[24px] desktop:p-[24px]">
		<div class="mb-[14px] flex flex-col gap-[10px] sm:flex-row sm:items-start sm:justify-between desktop:mb-[18px]">
			<div class="flex items-start gap-[12px]">
				<div class="flex h-[36px] w-[36px] items-center justify-center rounded-[50px] bg-[#EDF7F8]">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="text-[var(--color-brand-primary)]">
						<path d="M12 8v4l3 3" />
						<circle cx="12" cy="12" r="10" />
					</svg>
				</div>

				<div>
					<h2 class="text-[1rem] font-bold text-[var(--color-brand-text)]">Movimenti</h2>
					<p class="mt-[4px] text-[0.8125rem] leading-[1.5] text-[#667281]">
						Ricariche, pagamenti, rimborsi e commissioni in ordine cronologico.
					</p>
				</div>
			</div>

			<span class="inline-flex w-fit items-center rounded-full bg-[#F8F9FB] px-[10px] py-[5px] text-[0.75rem] font-semibold text-[#4B5563]">
				{{ countLabel }}
			</span>
		</div>

		<div
			v-if="movementsError && hasMovements"
			class="mb-[14px] flex flex-col gap-[10px] rounded-[14px] border border-[#F3D1A7] bg-[#FFF7E8] px-[12px] py-[11px] text-[0.8125rem] text-[#B45309] tablet:flex-row tablet:items-center tablet:justify-between">
			<p class="leading-[1.5]">Non sono riuscito ad aggiornare tutto lo storico in tempo reale. Ti mostro l ultimo elenco disponibile.</p>
			<button
				type="button"
				@click="emit('retry-movements')"
				class="btn-secondary btn-compact inline-flex items-center justify-center whitespace-nowrap">
				Riprova storico
			</button>
		</div>

		<div v-if="isLoadingMovements && !hasMovements" class="space-y-[10px] py-[4px]">
			<div v-for="index in 4" :key="index" class="animate-pulse rounded-[14px] border border-[#EEF1F3] p-[12px]">
				<div class="flex items-start gap-[12px]">
					<div class="h-[38px] w-[38px] rounded-full bg-[#F5F7F8]"></div>
					<div class="min-w-0 flex-1 space-y-[8px]">
						<div class="h-[14px] w-[220px] max-w-full rounded-full bg-[var(--color-brand-border)]"></div>
						<div class="h-[12px] w-[160px] rounded-full bg-[#F0F0F0]"></div>
					</div>
					<div class="h-[14px] w-[74px] rounded-full bg-[var(--color-brand-border)]"></div>
				</div>
			</div>
		</div>

		<div v-else-if="hasBlockingError" class="py-[32px] text-center">
			<div class="mx-auto mb-[14px] flex h-[56px] w-[56px] items-center justify-center rounded-full bg-[#FEF2F2]">
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="text-[#B42318]">
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="8" x2="12" y2="12" />
					<line x1="12" y1="16" x2="12.01" y2="16" />
				</svg>
			</div>
			<p class="text-[0.9375rem] font-medium text-[var(--color-brand-text)]">Storico non disponibile</p>
			<p class="mx-auto mt-[6px] max-w-[420px] text-[0.8125rem] leading-[1.55] text-[#667281]">
				{{ movementsError }}
			</p>
			<button type="button" @click="emit('retry-movements')" class="btn-secondary btn-compact mt-[16px] inline-flex items-center gap-[6px]">
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round">
					<path d="M21 2v6h-6" />
					<path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
					<path d="M3 22v-6h6" />
					<path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
				</svg>
				Riprova storico
			</button>
		</div>

		<div v-else-if="!hasMovements" class="py-[32px] text-center">
			<div class="mx-auto mb-[14px] flex h-[56px] w-[56px] items-center justify-center rounded-full bg-[#F8F9FB]">
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="text-[#C8CCD0]">
					<path d="M4 4h16v16H4z" />
					<path d="M4 10h16" />
					<path d="M10 4v16" />
				</svg>
			</div>
			<p class="text-[0.9375rem] font-medium text-[var(--color-brand-text)]">Nessun movimento</p>
			<p class="mx-auto mt-[6px] max-w-[360px] text-[0.8125rem] leading-[1.55] text-[#667281]">
				I movimenti appariranno qui dopo la prima ricarica o il primo pagamento con il portafoglio.
			</p>
			<NuxtLink to="/preventivo" class="btn-cta btn-compact mt-[16px] inline-flex items-center gap-[6px]">
				<svg
					width="17"
					height="17"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round">
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
				Crea la tua prima spedizione
			</NuxtLink>
		</div>

		<ul v-else class="space-y-[8px]">
			<li
				v-for="(mov, index) in movements"
				:key="mov.id || `${mov.created_at || 'mov'}-${index}`"
				class="flex flex-col gap-[10px] rounded-[14px] border border-[#EEF1F3] p-[12px] transition-colors hover:bg-[#F8F9FB] sm:flex-row sm:items-center sm:gap-[12px]">
				<div
					:class="[
						'flex h-[38px] w-[38px] items-center justify-center rounded-[50px] shrink-0',
						mov.type === 'credit' ? 'bg-[#EDF7F8]' : 'bg-[#FEF2F2]',
					]">
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						:class="mov.type === 'credit' ? 'text-[var(--color-brand-primary)]' : 'text-[#B42318]'">
						<path :d="getMovementSvg(mov)" />
					</svg>
				</div>

				<div class="min-w-0 flex-1">
					<p class="truncate text-[0.875rem] font-medium text-[var(--color-brand-text)]">{{ getMovementTitle(mov) }}</p>
					<div class="mt-[4px] flex flex-wrap items-center gap-[8px]">
						<span class="text-[0.75rem] text-[var(--color-brand-text-secondary)]">{{ formatDate(mov.created_at) }}</span>
						<span :class="['rounded-full px-[8px] py-[2px] text-[0.6875rem] font-medium', getSourceColor(mov.source)]">
							{{ getSourceLabel(mov.source) }}
						</span>
					</div>
				</div>

				<span :class="['self-start whitespace-nowrap text-[0.9375rem] font-bold tabular-nums sm:self-auto', getMovementColor(mov)]">
					{{ getMovementSign(mov) }}&euro;{{ formatEuro(mov.amount) }}
				</span>
			</li>
		</ul>
	</div>
</template>
