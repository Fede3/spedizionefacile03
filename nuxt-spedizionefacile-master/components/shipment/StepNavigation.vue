<!--
  FILE: components/shipment/StepNavigation.vue
  SCOPO: Barra di navigazione desktop + mobile actionbar — estratta da [step].vue.
-->
<script setup>
defineProps({
	showAddressFields: { type: Boolean, default: false },
	canOpenAddressFields: { type: Boolean, default: false },
	isSubmitting: { type: Boolean, default: false },
	editCartId: { type: [Number, null], default: null },
	summaryTotalPrice: { type: String, default: "0" },
	submitError: { type: String, default: "" },
	softenErrorMessage: { type: Function, required: true },
});

defineEmits([
	"go-back-to-services",
	"open-address-fields",
]);
</script>

<template>
	<!-- Desktop navigation -->
	<div class="mt-[28px] hidden tablet:flex flex-col tablet:flex-row flex-wrap gap-[12px] items-stretch tablet:items-center justify-between">
		<template v-if="showAddressFields">
			<button
				type="button"
				@click="$emit('go-back-to-services')"
				class="step-secondary-action btn-secondary sf-nav-button">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
				Indietro
			</button>
			<button
				type="submit"
				:disabled="isSubmitting"
				class="btn-cta sf-nav-button">
				{{ isSubmitting ? 'Salvataggio in corso...' : (editCartId ? 'Continua al riepilogo modifica' : 'Continua al riepilogo') }}
				<svg v-if="!isSubmitting" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
			</button>
		</template>
		<template v-else>
			<NuxtLink :to="editCartId ? '/carrello' : { path: '/', hash: '#preventivo' }" class="step-secondary-action btn-secondary sf-nav-button">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
				{{ editCartId ? 'Torna al carrello' : 'Indietro' }}
			</NuxtLink>
			<button
				type="button"
				@click="$emit('open-address-fields')"
				:disabled="!canOpenAddressFields"
				class="btn-cta sf-nav-button"
				:class="canOpenAddressFields ? 'cursor-pointer' : 'opacity-55 cursor-not-allowed'">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
				Continua agli indirizzi
			</button>
		</template>
	</div>

	<!-- Submit error -->
	<div v-if="submitError" class="ux-alert ux-alert--soft mt-[16px]">
		<svg xmlns="http://www.w3.org/2000/svg" class="ux-alert__icon" viewBox="0 0 24 24"><path fill="currentColor" d="M13 13h-2V7h2m0 10h-2v-2h2M12 2a10 10 0 0 1 10 10a10 10 0 0 1-10 10A10 10 0 0 1 2 12A10 10 0 0 1 12 2"/></svg>
		<span>{{ softenErrorMessage(submitError) }}</span>
	</div>

	<!-- Mobile actionbar -->
	<div class="shipment-mobile-actionbar tablet:hidden">
		<div class="shipment-mobile-actionbar__shell">
			<div class="shipment-mobile-actionbar__meta">
				<span class="shipment-mobile-actionbar__label">Totale stimato</span>
				<span class="shipment-mobile-actionbar__value">{{ summaryTotalPrice }}€</span>
			</div>
			<div class="shipment-mobile-actionbar__actions">
				<template v-if="showAddressFields">
					<button
						type="button"
						@click="$emit('go-back-to-services')"
						class="shipment-mobile-actionbar__secondary btn-secondary sf-nav-button sf-nav-button--compact">
						Indietro
					</button>
					<button
						type="submit"
						:disabled="isSubmitting"
						class="shipment-mobile-actionbar__primary btn-cta sf-nav-button sf-nav-button--compact">
						{{ isSubmitting ? 'Salvataggio...' : 'Vai al riepilogo' }}
					</button>
				</template>
				<template v-else>
					<NuxtLink
						:to="editCartId ? '/carrello' : { path: '/', hash: '#preventivo' }"
						class="shipment-mobile-actionbar__secondary btn-secondary sf-nav-button sf-nav-button--compact">
						{{ editCartId ? 'Carrello' : 'Indietro' }}
					</NuxtLink>
					<button
						type="button"
						@click="$emit('open-address-fields')"
						:disabled="!canOpenAddressFields"
						class="shipment-mobile-actionbar__primary btn-cta sf-nav-button sf-nav-button--compact">
						Vai agli indirizzi
					</button>
				</template>
			</div>
		</div>
	</div>
</template>
