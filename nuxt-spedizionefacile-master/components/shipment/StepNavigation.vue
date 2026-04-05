<script setup>
const props = defineProps({
	showAddressFields: { type: Boolean, default: false },
	addressReadinessItems: { type: Array, default: () => [] },
	showReadinessNote: { type: Boolean, default: true },
	showDesktopAdvanceButton: { type: Boolean, default: true },
	isSubmitting: { type: Boolean, default: false },
	editCartId: { type: [Number, null], default: null },
	summaryTotalPrice: { type: String, default: '0' },
	submitError: { type: String, default: '' },
	softenErrorMessage: { type: Function, required: true },
});

defineEmits(['go-back-to-services', 'open-address-fields']);

const backTarget = computed(() => (props.editCartId ? '/carrello' : { path: '/', hash: '#preventivo' }));

const backLabel = computed(() => (props.editCartId ? 'Torna al carrello' : 'Indietro'));

const submitLabel = computed(() => (props.isSubmitting ? 'Salvataggio...' : 'Continua al riepilogo'));

const pendingReadinessItems = computed(() => props.addressReadinessItems.filter((item) => !item.done));

const readinessSummary = computed(() => {
	if (props.showAddressFields) return '';
	if (!props.addressReadinessItems.length) return '';
	if (!pendingReadinessItems.value.length) return '';

	const labels = pendingReadinessItems.value.map((item) => item.label.toLowerCase());
	if (labels.length === 1) {
		return `Completa ${labels[0]}.`;
	}

	if (labels.length === 2) {
		return `Completa ${labels[0]} e ${labels[1]}.`;
	}

	return 'Completa i campi richiesti per continuare.';
});

const readinessSummaryTone = computed(() => (pendingReadinessItems.value.length ? 'text-[#516171]' : 'text-[#0f7a56]'));

const openAddressLabel = computed(() => 'Compila indirizzi');
</script>

<template>
	<!-- Desktop navigation -->
	<div
		class="mt-[28px] hidden tablet:flex flex-col tablet:flex-row flex-wrap gap-[12px] items-stretch tablet:items-center"
		:class="showAddressFields ? 'justify-end' : showDesktopAdvanceButton ? 'justify-between' : 'justify-start'">
		<template v-if="showAddressFields">
			<button type="submit" :disabled="isSubmitting" class="btn-cta sf-nav-button">
				{{ submitLabel }}
				<svg
					v-if="!isSubmitting"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round">
					<path d="M5 12h14M12 5l7 7-7 7" />
				</svg>
			</button>
		</template>
		<template v-else>
			<NuxtLink :to="backTarget" class="step-secondary-action btn-secondary sf-nav-button">
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round">
					<path d="M19 12H5M12 19l-7-7 7-7" />
				</svg>
				{{ backLabel }}
			</NuxtLink>
			<button v-if="showDesktopAdvanceButton" type="button" @click="$emit('open-address-fields')" class="btn-cta sf-nav-button">
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round">
					<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
				</svg>
				{{ openAddressLabel }}
			</button>
		</template>
	</div>

	<div
		v-if="!showAddressFields && showReadinessNote && readinessSummary"
		class="shipment-step-readiness-note mt-[14px]"
		:class="readinessSummaryTone">
		<span>{{ readinessSummary }}</span>
	</div>

	<!-- Submit error -->
	<div v-if="submitError" class="ux-alert ux-alert--soft mt-[16px]">
		<svg xmlns="http://www.w3.org/2000/svg" class="ux-alert__icon" viewBox="0 0 24 24">
			<path fill="currentColor" d="M13 13h-2V7h2m0 10h-2v-2h2M12 2a10 10 0 0 1 10 10a10 10 0 0 1-10 10A10 10 0 0 1 2 12A10 10 0 0 1 12 2" />
		</svg>
		<span>{{ softenErrorMessage(submitError) }}</span>
	</div>

	<!-- Mobile actionbar -->
	<div class="shipment-mobile-actionbar tablet:hidden">
		<div class="shipment-mobile-actionbar__shell">
			<div class="shipment-mobile-actionbar__meta">
				<span class="shipment-mobile-actionbar__label">Totale stimato</span>
				<span class="shipment-mobile-actionbar__value">{{ summaryTotalPrice }}€</span>
			</div>
			<div class="shipment-mobile-actionbar__actions" :class="{ 'shipment-mobile-actionbar__actions--single': showAddressFields }">
				<template v-if="showAddressFields">
					<button
						type="submit"
						:disabled="isSubmitting"
						class="shipment-mobile-actionbar__primary btn-cta sf-nav-button sf-nav-button--compact">
						{{ submitLabel }}
					</button>
				</template>
				<template v-else>
					<NuxtLink :to="backTarget" class="shipment-mobile-actionbar__secondary btn-secondary sf-nav-button sf-nav-button--compact">
						{{ backLabel }}
					</NuxtLink>
					<button
						type="button"
						@click="$emit('open-address-fields')"
						class="shipment-mobile-actionbar__primary btn-cta sf-nav-button sf-nav-button--compact">
						{{ openAddressLabel }}
					</button>
				</template>
			</div>
		</div>
	</div>
</template>
