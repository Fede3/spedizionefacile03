<script setup>
const props = defineProps({
	addService: { type: Function, required: true },
	days: { type: Array, default: () => [] },
	open: { type: Boolean, default: false },
	packages: { type: Array, default: () => [] },
	selectedService: { type: Object, default: null },
	serviceData: { type: Object, required: true },
});

const emit = defineEmits(["close", "update:open"]);

const {
	contrassegnoIncassoOptions,
	contrassegnoRimborsoOptions,
	selectedServiceIndex,
	selectedServiceIcon,
	insurancePackages,
	getPackageVisual,
	getInsuranceSummary,
	serviceErrors,
	clearServiceErrors,
	handleContrassegnoImportoInput,
	handleInsuranceInput,
	requiresContrassegnoDettaglio,
	isConfirmDisabled,
	validateContrassegno,
	validateAssicurazione,
} = useServiceModalLogic(props);

const modalUi = computed(() => ({
	overlay: "bg-[#09131c]/28 backdrop-blur-[4px]",
	content: [
		"!divide-y-0 !ring-0 !px-0 !pt-0 !pb-0 bg-transparent shadow-none w-[min(calc(100vw-1rem),500px)]",
	].join(" "),
	body: "!p-0 bg-transparent",
}));

const updateOpen = (value) => emit("update:open", value);
const closeModal = () => emit("close");

const confirmAdd = () => {
	if (selectedServiceIndex.value === 1 && !validateContrassegno()) return;
	if (selectedServiceIndex.value === 2 && !validateAssicurazione()) return;
	props.addService();
};

watch(
	() => [props.open, selectedServiceIndex.value],
	() => clearServiceErrors(),
);
</script>

<template>
	<UModal
		:dismissible="true"
		:open="open"
		aria-describedby="service-modal-description"
		:close="false"
		:ui="modalUi"
		@update:open="updateOpen">
		<template #body>
			<div class="service-modal-shell sf-modal-surface sf-modal-content">
				<div class="sf-modal-header">
					<div class="sf-modal-header__main">
							<div v-if="selectedServiceIcon" class="service-modal-icon-shell sf-modal-icon" aria-hidden="true">
								<img :src="selectedServiceIcon" :alt="selectedService?.name || ''" class="service-modal-icon-shell__icon" />
							</div>
							<div class="service-modal-heading__copy">
								<h3 class="sf-modal-title">
									{{ selectedService?.name }}
								</h3>
								<p
									v-if="selectedService?.description"
									id="service-modal-description"
									class="sf-modal-description">
									{{ selectedService.description }}
								</p>
							</div>
					</div>

					<button
						type="button"
						class="sf-modal-close"
						aria-label="Chiudi popup servizio"
						@click="closeModal">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="service-modal-close__icon">
							<path d="M18 6 6 18" /><path d="m6 6 12 12" />
						</svg>
					</button>
				</div>

				<div class="service-modal-divider sf-modal-divider" />

				<div class="service-modal-body sf-modal-body">
					<!-- Contrassegno -->
					<ShipmentServiceModalContrassegno
						v-if="selectedService?.index === 1"
						:service-data="serviceData"
						:service-errors="serviceErrors"
						:contrassegno-incasso-options="contrassegnoIncassoOptions"
						:contrassegno-rimborso-options="contrassegnoRimborsoOptions"
						:requires-contrassegno-dettaglio="requiresContrassegnoDettaglio"
						@importo-input="handleContrassegnoImportoInput" />

					<!-- Assicurazione -->
					<ShipmentServiceModalInsurance
						v-if="selectedService?.index === 2"
						:service-data="serviceData"
						:service-errors="serviceErrors"
						:insurance-packages="insurancePackages"
						:get-package-visual="getPackageVisual"
						:get-insurance-summary="getInsuranceSummary"
						@insurance-input="handleInsuranceInput" />

					<div v-if="selectedService?.index === 4" class="service-form-stack">
						<div class="service-field">
							<label for="pallet" class="service-field__label">Pallet</label>
							<input id="pallet" type="text" class="service-field__input" />
						</div>
					</div>

					<div v-if="selectedService?.index === 5" class="service-days-grid">
						<div v-for="(day, dayIndex) in days" :key="dayIndex" class="service-day-card">
							<label :for="`day_${dayIndex}`" class="service-day-card__title">{{ day }}</label>
							<select :id="`day_${dayIndex}`" class="service-field__input service-field__input--select">
								<option value="">No</option>
								<option value="">Si</option>
							</select>
						</div>
					</div>

					<div v-if="selectedService?.index === 6" class="service-form-stack">
						<div class="service-field">
							<label for="telephone_number_popup" class="service-field__label">Telefono</label>
							<input id="telephone_number_popup" type="tel" class="service-field__input" />
						</div>
					</div>
				</div>

				<div class="service-modal-footer sf-modal-actions">
					<button
						type="button"
						class="service-modal-action btn-secondary"
						@click="closeModal">
						Annulla
					</button>

					<button
						type="button"
						class="service-modal-action btn-primary"
						:disabled="isConfirmDisabled"
						@click="confirmAdd">
						Salva
					</button>
				</div>
			</div>
		</template>
	</UModal>
</template>
