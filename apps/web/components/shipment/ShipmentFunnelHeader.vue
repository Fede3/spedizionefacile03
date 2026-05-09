<!--
  ShipmentFunnelHeader.vue — Header compatto dedicato al flusso preventivo
  (la-tua-spedizione/2). Sostituisce il PublicPageHeader marketing che era
  troppo verboso su mobile (titolo "Preventivo" duplicato 3 volte ed
  eccessivo scroll prima del contenuto).

  Pattern Baymard checkout: progress bar + step name immediatamente.
  Niente eyebrow, niente lead description (l'utente è già nel funnel).
-->
<script setup>
const props = defineProps({
	currentStep: { type: [Number, String], default: 2 },
	stepLabel: { type: String, default: 'Servizi' },
	totalSteps: { type: Number, default: 4 },
});

const router = useRouter();

const goBack = () => {
	if (window.history.length > 1) router.back();
	else navigateTo('/');
};

const stepNumber = computed(() => Number(props.currentStep) || 2);
</script>

<template>
	<div class="shipment-funnel-header">
		<div class="my-container shipment-funnel-header__inner">
			<button
				type="button"
				class="shipment-funnel-header__back"
				aria-label="Torna indietro"
				@click="goBack">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="m15 18-6-6 6-6" />
				</svg>
			</button>
			<div class="shipment-funnel-header__copy">
				<span class="shipment-funnel-header__step-meta">Step {{ stepNumber }} di {{ totalSteps }}</span>
				<h1 class="shipment-funnel-header__title">{{ stepLabel }}</h1>
			</div>
			<NuxtLink to="/" class="shipment-funnel-header__home" aria-label="Esci dal preventivo (home)">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M6 6l12 12" />
					<path d="M18 6 6 18" />
				</svg>
			</NuxtLink>
		</div>
	</div>
</template>

<style scoped>
.shipment-funnel-header {
	background: var(--color-brand-page-gradient, linear-gradient(180deg, #f8f9fb 0%, #f3f5f8 100%));
	border-bottom: 1px solid rgba(9, 88, 102, 0.06);
}

.shipment-funnel-header__inner {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 10px 14px;
	max-width: 1280px;
	margin: 0 auto;
}

@media (min-width: 40rem) {
	.shipment-funnel-header__inner {
		padding: 14px 24px;
		gap: 14px;
	}
}

.shipment-funnel-header__back,
.shipment-funnel-header__home {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 999px;
	border: 1px solid rgba(9, 88, 102, 0.1);
	background: #fff;
	color: var(--color-brand-primary);
	cursor: pointer;
	flex: 0 0 auto;
	text-decoration: none;
	transition: border-color var(--sf-t1) var(--sf-ease), background-color var(--sf-t1) var(--sf-ease), transform var(--sf-t1) var(--sf-ease);
}

.shipment-funnel-header__back:hover,
.shipment-funnel-header__home:hover {
	border-color: rgba(9, 88, 102, 0.25);
	background: rgba(9, 88, 102, 0.04);
}

.shipment-funnel-header__back:active,
.shipment-funnel-header__home:active {
	transform: scale(0.95);
}

.shipment-funnel-header__copy {
	flex: 1 1 auto;
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 2px;
	text-align: center;
}

.shipment-funnel-header__step-meta {
	font-size: 11px;
	font-weight: 700;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--color-brand-accent);
	line-height: 1;
}

.shipment-funnel-header__title {
	margin: 0;
	font-family: var(--font-montserrat, 'Montserrat', sans-serif);
	font-size: 17px;
	line-height: 1.15;
	font-weight: 800;
	letter-spacing: -0.3px;
	color: var(--color-brand-primary);
}

@media (min-width: 40rem) {
	.shipment-funnel-header__step-meta {
		font-size: 12px;
	}
	.shipment-funnel-header__title {
		font-size: 20px;
	}
}
</style>
