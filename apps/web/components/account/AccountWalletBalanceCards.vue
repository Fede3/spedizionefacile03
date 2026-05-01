<script setup>
const props = defineProps({
	balance: { type: Object, default: null },
	isPro: { type: Boolean, default: false },
	isLoadingBalance: { type: Boolean, default: true },
	balanceError: { type: String, default: '' },
	defaultPaymentMethodLabel: { type: String, default: 'Da aggiungere' },
	movementCountLabel: { type: String, default: 'Ancora nessuno' },
	stripeConfigured: { type: Boolean, default: false },
});

const emit = defineEmits(['retry-balance']);

const hasBalanceData = computed(() => props.balance?.balance != null || props.balance?.commission_balance != null);
const hasBlockingError = computed(() => Boolean(props.balanceError) && !hasBalanceData.value);
const hasStaleData = computed(() => Boolean(props.balanceError) && hasBalanceData.value);

const statusLabel = computed(() => {
	if (props.isLoadingBalance && !hasBalanceData.value) return 'Caricamento';
	if (hasBlockingError.value) return 'Da verificare';
	if (hasStaleData.value) return 'Ultimo dato disponibile';
	return 'Aggiornato';
});

const quickLinks = computed(() => {
	return [
		{
			label: 'Carte e pagamenti',
			description: 'Gestisci metodo predefinito e ricariche.',
			to: '/account/carte',
			icon: 'card',
		},
		{
			label: 'Le tue spedizioni',
			description: 'Controlla ordini pagati e tracking.',
			to: '/account/spedizioni',
			icon: 'shipping',
		},
	];
});
</script>

<template>
	<div class="rounded-card border border-brand-border bg-brand-card px-4 py-3.5 shadow-sf-sm">
		<SfAlert
			v-if="balanceError"
			:tone="hasBlockingError ? 'danger' : 'warning'"
			class="mb-4"
		>
			<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<p class="leading-relaxed">
					{{
						hasBlockingError
							? balanceError
							: "Non sono riuscito ad aggiornare il saldo in tempo reale. Ti mostro l'ultimo valore disponibile."
					}}
				</p>
				<SfButton variant="secondary" size="sm" @click="emit('retry-balance')">
					Riprova saldo
				</SfButton>
			</div>
		</SfAlert>

		<div class="mb-3 flex items-center justify-between">
			<h2 class="font-display text-base font-extrabold text-brand-text">Accesso rapido</h2>
			<SfBadge tone="neutral" size="sm">{{ statusLabel }}</SfBadge>
		</div>

		<div class="mt-3.5 grid gap-2.5 sm:grid-cols-2">
			<NuxtLink
				v-for="link in quickLinks"
				:key="link.to"
				:to="link.to"
				class="flex items-start gap-2.5 rounded-card border border-brand-border bg-brand-bg-alt/40 px-3.5 py-3 transition-colors hover:border-brand-primary/40 hover:bg-brand-card"
			>
				<div class="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
					<svg
						v-if="link.icon === 'card'"
						aria-hidden="true"
						width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
						stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
					>
						<rect x="1" y="4" width="22" height="16" rx="2" />
						<line x1="1" y1="10" x2="23" y2="10" />
					</svg>
					<svg
						v-else-if="link.icon === 'shipping'"
						aria-hidden="true"
						width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
						stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
					>
						<path d="M1 3h15v13H1z" />
						<path d="M16 8h4l3 3v5h-7V8z" />
						<circle cx="5.5" cy="18.5" r="2.5" />
						<circle cx="18.5" cy="18.5" r="2.5" />
					</svg>
					<svg
						v-else
						aria-hidden="true"
						width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
						stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
					>
						<path d="M5 12h14" />
						<path d="M12 5l7 7-7 7" />
					</svg>
				</div>
				<div class="min-w-0">
					<p class="text-sm font-bold text-brand-text">{{ link.label }}</p>
					<p class="mt-1 text-xs leading-relaxed text-brand-text-secondary">
						{{ link.description }}
					</p>
				</div>
			</NuxtLink>
		</div>
	</div>
</template>
