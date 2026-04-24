<!-- Backend restituisce balance/pending in EUR (float, gia' diviso per 100 lato controller) — qui formatEuro(eur), non formatPrice(cents). -->
<script setup>
import { formatEuro } from '~/utils/price.js';

const props = defineProps({
	balance: { type: [Number, String, null], default: 0 },
	pending: { type: [Number, String, null], default: 0 },
	withdrawThreshold: { type: Number, default: 5 },
	isLoading: { type: Boolean, default: false },
	error: { type: String, default: '' },
});

const emit = defineEmits(['ricarica', 'preleva', 'retry']);

const balanceNumber = computed(() => Number(props.balance || 0));
const pendingNumber = computed(() => Number(props.pending || 0));
const canWithdraw = computed(() => balanceNumber.value >= props.withdrawThreshold);

const balanceLabel = computed(() => {
	if (props.isLoading && !balanceNumber.value) return 'Caricamento';
	if (props.error && !balanceNumber.value) return 'Saldo non disponibile';
	return `\u20AC${formatEuro(balanceNumber.value)}`;
});

const pendingLabel = computed(() => `\u20AC${formatEuro(pendingNumber.value)}`);

const withdrawHint = computed(() => {
	if (canWithdraw.value) return 'Preleva il saldo sul tuo conto';
	const missing = (props.withdrawThreshold - balanceNumber.value).toFixed(2).replace('.', ',');
	return `Mancano \u20AC${missing} per il prelievo (minimo \u20AC${props.withdrawThreshold}).`;
});
</script>

<template>
	<article
		class="relative overflow-hidden rounded-[24px] px-[22px] py-[24px] sf-dark-card-shadow tablet:px-[28px] tablet:py-[28px]"
		style="background: linear-gradient(135deg, #0b3942 0%, #095866 55%, #0e6c7d 100%);"
		aria-label="Saldo wallet">
		<!-- Pattern decorativo -->
		<div
			class="absolute right-[-60px] top-[-60px] h-[220px] w-[220px] rounded-full opacity-[0.10]"
			style="background: radial-gradient(circle, #ffffff 0%, transparent 70%);"
			aria-hidden="true"></div>
		<div
			class="absolute bottom-[-50px] left-[-30px] h-[160px] w-[160px] rounded-full opacity-[0.08]"
			style="background: radial-gradient(circle, #E44203 0%, transparent 70%);"
			aria-hidden="true"></div>

		<div class="relative z-10 flex flex-col gap-[20px]">
			<!-- Header: chip wallet -->
			<div class="flex items-start justify-between gap-[12px]">
				<div class="flex items-center gap-[10px]">
					<span
						class="inline-flex h-[40px] w-[40px] items-center justify-center rounded-full bg-white/[0.12] backdrop-blur-sm"
						aria-hidden="true">
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="text-white">
							<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
							<path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
							<path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
						</svg>
					</span>
					<div>
						<p class="text-[11px] font-[700] uppercase tracking-[0.14em] text-white/65">
							Wallet personale
						</p>
						<p class="text-[13px] font-[600] text-white/80">Saldo disponibile</p>
					</div>
				</div>

				<button
					v-if="error && !isLoading"
					type="button"
					class="rounded-full bg-white/[0.10] px-[12px] py-[6px] text-[11px] font-[700] text-white hover:bg-white/[0.18] transition-colors"
					@click="emit('retry')">
					Riprova
				</button>
			</div>

			<!-- Saldo grande -->
			<div>
				<p
					class="text-[2.5rem] font-[800] leading-none tracking-[-1.2px] text-white tablet:text-[3rem]">
					{{ balanceLabel }}
				</p>
				<p v-if="pendingNumber > 0" class="mt-[10px] text-[13px] text-white/75">
					In attesa: <span class="font-[700] text-white">{{ pendingLabel }}</span>
				</p>
				<p v-if="error" class="mt-[10px] text-[13px] text-[#fecaca]">{{ error }}</p>
			</div>

			<!-- CTA -->
			<div class="flex flex-col gap-[10px] tablet:flex-row tablet:items-center">
				<button
					type="button"
					class="btn-cta btn-lg w-full justify-center tablet:w-auto"
					:disabled="isLoading"
					@click="emit('ricarica')">
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.4"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true">
						<path d="M12 5v14" />
						<path d="M5 12h14" />
					</svg>
					Ricarica
				</button>

				<button
					type="button"
					class="btn-secondary btn-lg w-full justify-center bg-white/[0.10] text-white border-white/30 hover:bg-white/[0.18] hover:text-white tablet:w-auto"
					:disabled="!canWithdraw || isLoading"
					:aria-disabled="!canWithdraw || isLoading"
					:title="withdrawHint"
					@click="canWithdraw && emit('preleva')">
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.4"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true">
						<path d="M5 12h14" />
						<path d="M12 5l-7 7 7 7" />
					</svg>
					Preleva
				</button>
			</div>

			<p class="text-[12px] leading-[1.45] text-white/60">{{ withdrawHint }}</p>
		</div>
	</article>
</template>

<style scoped>
.btn-cta:disabled,
.btn-secondary:disabled {
	cursor: not-allowed;
	opacity: 0.55;
}
</style>
