<!--
  Saldo prelevabile, pulsante prelievo e guida "come funziona".
  Props: availableBalance, isLoading, hasPending, message, messageType.
  Events: request-withdrawal.
-->
<script setup>
import { formatEuro } from '~/utils/price.js';

defineProps({
	availableBalance: { type: Number, default: 0 },
	isLoading: { type: Boolean, default: false },
	hasPending: { type: Boolean, default: false },
	message: { type: String, default: null },
	messageType: { type: String, default: 'success' },
});

const emit = defineEmits(['request-withdrawal']);

const steps = [
	'Saldo confermato.',
	"Richiedi l'intero saldo disponibile.",
	"L'admin verifica e aggiorna lo stato.",
	"Se approvato, l'importo viene accreditato.",
];
</script>

<template>
	<div class="mb-[16px] grid gap-[16px] desktop:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)] desktop:items-stretch">
		<!-- Saldo -->
		<div class="sf-account-panel rounded-[20px] p-[18px] desktop:p-[24px]">
			<div class="flex flex-col gap-[16px] desktop:flex-row desktop:items-center desktop:justify-between">
				<div>
					<div class="flex items-center gap-[8px] mb-[10px]">
						<div class="w-[36px] h-[36px] rounded-[50px] bg-[#edf7f8] flex items-center justify-center">
							<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="var(--color-brand-primary)">
								<path
									d="M3,6H21V18H3V6M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M7,8A2,2 0 0,1 5,10V14A2,2 0 0,1 7,16H17A2,2 0 0,1 19,14V10A2,2 0 0,1 17,8H7Z" />
							</svg>
						</div>
						<p class="text-[0.75rem] uppercase tracking-[1.2px] font-medium text-[var(--color-brand-primary)]">Saldo</p>
					</div>
					<p class="text-[2rem] desktop:text-[2.5rem] font-bold tracking-tight leading-none text-[var(--color-brand-text)]">
						&euro;{{ formatEuro(availableBalance) }}
					</p>
					<p class="text-[0.75rem] text-[var(--color-brand-text-secondary)] mt-[6px]">Commissioni accumulate</p>
				</div>
				<div class="flex flex-col items-start desktop:items-end gap-[8px]">
					<button
						@click="emit('request-withdrawal')"
						:disabled="isLoading || hasPending || availableBalance < 1"
						class="btn-cta btn-compact w-full desktop:w-auto inline-flex items-center justify-center gap-[8px]">
						<svg
							v-if="!isLoading && !hasPending"
							xmlns="http://www.w3.org/2000/svg"
							width="17"
							height="17"
							viewBox="0 0 24 24"
							fill="currentColor">
							<path
								d="M3,6H21V18H3V6M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M7,8A2,2 0 0,1 5,10V14A2,2 0 0,1 7,16H17A2,2 0 0,1 19,14V10A2,2 0 0,1 17,8H7Z" />
						</svg>
						<svg
							v-if="hasPending && !isLoading"
							xmlns="http://www.w3.org/2000/svg"
							width="17"
							height="17"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2">
							<circle cx="12" cy="12" r="10" />
							<polyline points="12 6 12 12 16 14" />
						</svg>
						<span v-if="isLoading">Invio in corso...</span>
						<span v-else-if="hasPending">Richiesta in attesa</span>
						<span v-else>Richiedi prelievo</span>
					</button>
					<p v-if="hasPending" class="text-[0.6875rem] opacity-60">In attesa di approvazione dall'admin.</p>
				</div>
			</div>

			<div v-if="message" :class="['ux-alert mt-[16px]', messageType === 'success' ? 'ux-alert--success' : 'ux-alert--error']">
				<svg
					v-if="messageType === 'success'"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					class="ux-alert__icon"
					fill="none"
					stroke="currentColor"
					stroke-width="1.9"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true">
					<path d="M20 6L9 17l-5-5" />
				</svg>
				<svg
					v-else
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					class="ux-alert__icon"
					fill="none"
					stroke="currentColor"
					stroke-width="1.9"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true">
					<path d="M12 9v4" />
					<path d="M12 17h.01" />
					<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
				</svg>
				<div class="flex min-w-0 flex-1 flex-col gap-[4px]">
					<p class="ux-alert__title">{{ message }}</p>
				</div>
			</div>
		</div>

		<!-- Come funziona -->
		<div class="sf-account-panel rounded-[20px] p-[16px] desktop:p-[20px]">
			<h3 class="font-montserrat text-[0.875rem] font-[800] text-[var(--color-brand-text)] mb-[12px] flex items-center gap-[8px]">
				<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="16" x2="12" y2="12" />
					<line x1="12" y1="8" x2="12.01" y2="8" />
				</svg>
				Come funziona
			</h3>
			<div class="space-y-[10px]">
				<div v-for="(step, idx) in steps" :key="idx" class="flex items-start gap-[8px]">
					<div
						class="w-[30px] h-[30px] rounded-full bg-[var(--color-brand-primary)]/10 flex items-center justify-center shrink-0 text-[0.75rem] font-bold text-[var(--color-brand-primary)]">
						{{ idx + 1 }}
					</div>
					<p class="text-[0.8125rem] text-[var(--color-brand-text)] leading-[1.5]">{{ step }}</p>
				</div>
			</div>
		</div>
	</div>
</template>
