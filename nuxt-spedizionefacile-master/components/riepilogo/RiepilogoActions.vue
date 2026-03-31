<!--
  Azioni principali e secondarie del riepilogo: indietro, checkout, carrello, salva, nuova spedizione.
-->
<script setup>
defineProps({
	isEditFromCart: { type: Boolean, default: false },
	isSubmitting: { type: Boolean, default: false },
	isAuthenticated: { type: Boolean, default: false },
	submitError: { type: String, default: null },
});
const emit = defineEmits([
	'go-back', 'proceed-checkout', 'go-to-cart',
	'go-to-saved', 'add-another',
]);
</script>

<template>
	<!-- Error -->
	<div v-if="submitError" class="ux-alert ux-alert--soft mb-[16px]">
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ux-alert__icon"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
		<span>{{ submitError }}</span>
	</div>

	<!-- Indietro + Procedi al pagamento -->
	<div class="flex flex-col tablet:flex-row items-stretch tablet:items-center justify-between gap-[12px] mb-[24px]">
		<button @click="emit('go-back')" class="btn-secondary sf-nav-button inline-flex items-center justify-center gap-[8px]">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
			{{ isEditFromCart ? 'Torna al carrello' : 'Indietro' }}
		</button>
		<button
			v-if="!isEditFromCart"
			@click="emit('proceed-checkout')"
			:disabled="isSubmitting"
			class="btn-cta sf-nav-button inline-flex items-center justify-center gap-[8px] disabled:opacity-60 disabled:cursor-not-allowed">
			<span v-if="isSubmitting">Caricamento...</span>
			<span v-else>Procedi al pagamento</span>
			<svg v-if="!isSubmitting" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
		</button>
	</div>

	<!-- Azioni secondarie -->
	<div class="flex gap-[10px] overflow-x-auto snap-x snap-mandatory pb-[6px] -mx-[2px] px-[2px] tablet:grid tablet:grid-cols-3 tablet:overflow-visible tablet:gap-[14px] desktop:gap-[18px] tablet:pb-0">
		<!-- In edit mode dal carrello: solo "Salva modifiche" -->
		<button
			v-if="isEditFromCart"
			@click="emit('go-to-cart')"
			:disabled="isSubmitting"
			class="sf-action-card w-full disabled:opacity-60 tablet:col-span-3">
			<div class="sf-action-card__icon-shell">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-[#095866]"><path fill="currentColor" d="M15 9H5V5h10m-3 14a3 3 0 0 1-3-3a3 3 0 0 1 3-3a3 3 0 0 1 3 3a3 3 0 0 1-3 3m5-16H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7z"/></svg>
			</div>
			<div class="text-left flex-1">
				<p class="sf-action-card__title text-[#095866]">Salva modifiche</p>
			</div>
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" class="sf-action-card__arrow"><path fill="currentColor" d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6l-6 6z"/></svg>
		</button>

		<template v-if="!isEditFromCart">
			<button
				@click="emit('go-to-cart')"
				:disabled="isSubmitting"
				class="sf-action-card w-[min(84vw,292px)] tablet:w-full shrink-0 snap-start tablet:min-h-[94px] disabled:opacity-60">
				<div class="sf-action-card__icon-shell">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-[#095866]"><path fill="currentColor" d="M17 18a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2c0-1.11.89-2 2-2M1 2h3.27l.94 2H20a1 1 0 0 1 1 1c0 .17-.05.34-.12.5l-3.58 6.47c-.34.61-1 1.03-1.75 1.03H8.1l-.9 1.63l-.03.12a.25.25 0 0 0 .25.25H19v2H7a2 2 0 0 1-2-2c0-.35.09-.68.24-.96l1.36-2.45L3 4H1zm6 16a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2c0-1.11.89-2 2-2"/></svg>
				</div>
				<div class="text-left flex-1">
					<p class="sf-action-card__title">Aggiungi al carrello</p>
				</div>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" class="sf-action-card__arrow"><path fill="currentColor" d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6l-6 6z"/></svg>
			</button>

			<button
				@click="emit('go-to-saved')"
				:disabled="isSubmitting"
				:class="['sf-action-card w-[min(84vw,292px)] tablet:w-full shrink-0 snap-start tablet:min-h-[94px] disabled:opacity-60', !isAuthenticated ? 'sf-action-card--locked' : '']">
				<div class="sf-action-card__icon-shell">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-[#095866]"><path fill="currentColor" d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18c-.21 0-.41-.06-.57-.18l-7.9-4.44A.99.99 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18c.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88zM12 4.15L6.04 7.5L12 10.85l5.96-3.35zM5 15.91l6 3.37v-6.73L5 9.18zm14 0V9.18l-6 3.37v6.73z"/></svg>
				</div>
				<div class="text-left flex-1">
					<p class="sf-action-card__title">Salva configurazione</p>
				</div>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" class="sf-action-card__arrow"><path fill="currentColor" d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6l-6 6z"/></svg>
			</button>

			<button
				@click="emit('add-another')"
				:disabled="isSubmitting"
				class="sf-action-card w-[min(84vw,292px)] tablet:w-full shrink-0 snap-start tablet:min-h-[94px] disabled:opacity-60">
				<div class="sf-action-card__icon-shell sf-action-card__icon-shell--accent">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-orange-600"><path fill="currentColor" d="M17 13h-4v4h-2v-4H7v-2h4V7h2v4h4m-5-9A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2"/></svg>
				</div>
				<div class="text-left flex-1">
					<p class="sf-action-card__title">Nuova spedizione</p>
				</div>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" class="sf-action-card__arrow"><path fill="currentColor" d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6l-6 6z"/></svg>
			</button>
		</template>
	</div>
</template>
