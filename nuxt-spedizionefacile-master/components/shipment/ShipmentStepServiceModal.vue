<script setup>
const props = defineProps({
	addService: {
		type: Function,
		required: true,
	},
	days: {
		type: Array,
		default: () => [],
	},
	open: {
		type: Boolean,
		default: false,
	},
	packages: {
		type: Array,
		default: () => [],
	},
	selectedService: {
		type: Object,
		default: null,
	},
	serviceData: {
		type: Object,
		required: true,
	},
});

const emit = defineEmits(["close", "update:open"]);

const contrassegnoIncassoOptions = [
	{ value: "contanti", label: "Contanti" },
	{ value: "assegno", label: "Assegno bancario" },
];

const contrassegnoRimborsoOptions = [
	{ value: "bonifico", label: "Bonifico bancario" },
	{ value: "assegno", label: "Assegno" },
	{ value: "assegno_circolare", label: "Assegno circolare" },
];

const modalUi = computed(() => ({
	overlay: "bg-[#09131c]/28 backdrop-blur-[4px]",
	content: [
		"!divide-y-0 !ring-0 !px-0 !pt-0 !pb-0 bg-transparent shadow-none w-[min(calc(100vw-1rem),500px)]",
	].join(" "),
	body: "!p-0 bg-transparent",
}));

const updateOpen = (value) => {
	emit("update:open", value);
};

const closeModal = () => {
	emit("close");
};

const selectedServiceIndex = computed(() => Number(props.selectedService?.index ?? -1));
const selectedServiceIcon = computed(() => (
	props.selectedService?.icon
		? `/img/quote/second-step/${props.selectedService.icon}`
		: null
));

const insurancePackages = computed(() => {
	if (Array.isArray(props.packages) && props.packages.length > 0) {
		return props.packages;
	}

	return [
		{
			package_type: "pacco",
			weight: "",
			first_size: "",
			second_size: "",
			third_size: "",
		},
	];
});

const packageTypeIconMap = {
	pacco: "/img/quote/first-step/pack.png",
	pallet: "/img/quote/first-step/pallet.png",
	valigia: "/img/quote/first-step/suitcase.png",
	busta: "/img/quote/first-step/envelope.png",
};

const getPackageVisual = (pack) => {
	const normalized = String(pack?.package_type || "pacco").trim().toLowerCase();
	return packageTypeIconMap[normalized] || packageTypeIconMap.pacco;
};

const serviceErrors = reactive({
	contrassegnoImporto: "",
	contrassegnoIncasso: "",
	contrassegnoRimborso: "",
	contrassegnoDettaglio: "",
	assicurazione: {},
});

const clearServiceErrors = () => {
	serviceErrors.contrassegnoImporto = "";
	serviceErrors.contrassegnoIncasso = "";
	serviceErrors.contrassegnoRimborso = "";
	serviceErrors.contrassegnoDettaglio = "";
	serviceErrors.assicurazione = {};
};

const normalizeCurrencyInput = (value) => {
	const sanitized = String(value || "")
		.replace(/[^\d,.\s]/g, "")
		.replace(/\s+/g, "")
		.replace(/\./g, ",");

	const [integerRaw = "", ...decimalParts] = sanitized.split(",");
	const integer = integerRaw.replace(/^0+(?=\d)/, "");
	const decimals = decimalParts.join("").slice(0, 2);

	if (!integer && !decimals) return "";
	if (!decimalParts.length) return integer || "0";

	return `${integer || "0"},${decimals}`;
};

const parseCurrencyValue = (value) => {
	const normalized = normalizeCurrencyInput(value);
	if (!normalized) return 0;
	return Number(normalized.replace(",", ".")) || 0;
};

const handleContrassegnoImportoInput = (event) => {
	const target = event.target;
	props.serviceData.contrassegno.importo = normalizeCurrencyInput(target?.value || "");
	serviceErrors.contrassegnoImporto = "";
};

const handleInsuranceInput = (index, event) => {
	const target = event.target;
	props.serviceData.assicurazione[index] = normalizeCurrencyInput(target?.value || "");
	serviceErrors.assicurazione = {
		...serviceErrors.assicurazione,
		[index]: "",
	};
};

const requiresContrassegnoDettaglio = computed(() => (
	props.serviceData.contrassegno.modalita_rimborso === "bonifico"
));

const isContrassegnoReady = computed(() => (
	parseCurrencyValue(props.serviceData.contrassegno.importo) > 0
	&& !!props.serviceData.contrassegno.modalita_incasso
	&& !!props.serviceData.contrassegno.modalita_rimborso
	&& (!requiresContrassegnoDettaglio.value || !!String(props.serviceData.contrassegno.dettaglio_rimborso || "").trim())
));

const isInsuranceReady = computed(() => (
	Array.isArray(insurancePackages.value)
	&& insurancePackages.value.length > 0
	&& insurancePackages.value.every((_, index) => parseCurrencyValue(props.serviceData.assicurazione[index]) > 0)
));

const isConfirmDisabled = computed(() => {
	if (selectedServiceIndex.value === 1) return !isContrassegnoReady.value;
	if (selectedServiceIndex.value === 2) return !isInsuranceReady.value;
	return false;
});

const validateContrassegno = () => {
	clearServiceErrors();
	let isValid = true;

	if (parseCurrencyValue(props.serviceData.contrassegno.importo) <= 0) {
		serviceErrors.contrassegnoImporto = "Inserisci un importo valido maggiore di zero.";
		isValid = false;
	}

	if (!props.serviceData.contrassegno.modalita_incasso) {
		serviceErrors.contrassegnoIncasso = "Seleziona come il corriere incassa l'importo.";
		isValid = false;
	}

	if (!props.serviceData.contrassegno.modalita_rimborso) {
		serviceErrors.contrassegnoRimborso = "Seleziona come vuoi ricevere il rimborso.";
		isValid = false;
	}

	if (requiresContrassegnoDettaglio.value && !String(props.serviceData.contrassegno.dettaglio_rimborso || "").trim()) {
		serviceErrors.contrassegnoDettaglio = "Inserisci IBAN o dettaglio rimborso.";
		isValid = false;
	}

	return isValid;
};

const validateAssicurazione = () => {
	clearServiceErrors();
	let isValid = true;
	const nextErrors = {};

	insurancePackages.value.forEach((_, index) => {
		if (parseCurrencyValue(props.serviceData.assicurazione[index]) <= 0) {
			nextErrors[index] = "Inserisci un valore assicurato valido.";
			isValid = false;
		}
	});

	serviceErrors.assicurazione = nextErrors;
	return isValid;
};

const confirmAdd = () => {
	if (selectedServiceIndex.value === 1 && !validateContrassegno()) return;
	if (selectedServiceIndex.value === 2 && !validateAssicurazione()) return;
	props.addService();
};

const getInsuranceSummary = (pack) => {
	const weight = String(pack?.weight || "").trim();
	const first = String(pack?.first_size || "").trim();
	const second = String(pack?.second_size || "").trim();
	const third = String(pack?.third_size || "").trim();

	const weightLabel = weight ? `${weight} kg` : "kg";
	const sizes = [first, second, third].filter(Boolean);

	if (sizes.length === 3) {
		return `${weightLabel} · ${sizes[0]}×${sizes[1]}×${sizes[2]} cm`;
	}

	if (sizes.length === 2) {
		return `${weightLabel} · ${sizes[0]}×${sizes[1]} cm`;
	}

	return `${weightLabel} · x×x cm`;
};

watch(
	() => [props.open, selectedServiceIndex.value],
	() => {
		clearServiceErrors();
	},
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
						<Icon name="mdi:close" class="service-modal-close__icon" />
					</button>
				</div>

				<div class="service-modal-divider sf-modal-divider" />

				<div class="service-modal-body sf-modal-body">
					<div v-if="selectedService?.index === 1" class="service-form-grid">
						<div class="service-field">
							<label for="contrassegno_importo" class="service-field__label">Importo da incassare</label>
							<input
								id="contrassegno_importo"
								v-model="serviceData.contrassegno.importo"
								type="text"
								inputmode="decimal"
								autocomplete="off"
								class="service-field__input service-field__input--currency"
								placeholder="0,00"
								@input="handleContrassegnoImportoInput" />
							<span class="service-field__suffix" aria-hidden="true">€</span>
							<p v-if="serviceErrors.contrassegnoImporto" class="service-field__error">{{ serviceErrors.contrassegnoImporto }}</p>
						</div>

						<div class="service-field">
							<label for="contrassegno_dettaglio" class="service-field__label">IBAN rimborso</label>
							<input
								id="contrassegno_dettaglio"
								v-model="serviceData.contrassegno.dettaglio_rimborso"
								type="text"
								class="service-field__input"
								placeholder="IT60X054281110..." />
							<p v-if="serviceErrors.contrassegnoDettaglio" class="service-field__error">{{ serviceErrors.contrassegnoDettaglio }}</p>
						</div>

						<div class="service-field service-field--full">
							<label class="service-field__label">Incasso tramite</label>
							<div class="service-choice-wrap" role="group" aria-label="Modalità di incasso">
								<button
									v-for="option in contrassegnoIncassoOptions"
									:key="option.value"
									type="button"
									:class="[
										'service-choice',
										serviceData.contrassegno.modalita_incasso === option.value ? 'service-choice--active' : '',
									]"
									@click="serviceData.contrassegno.modalita_incasso = option.value">
									{{ option.label }}
								</button>
							</div>
							<p v-if="serviceErrors.contrassegnoIncasso" class="service-field__error">{{ serviceErrors.contrassegnoIncasso }}</p>
						</div>

						<div class="service-field service-field--full">
							<label class="service-field__label">Rimborso tramite</label>
							<div class="service-choice-wrap" role="group" aria-label="Modalità di rimborso">
								<button
									v-for="option in contrassegnoRimborsoOptions"
									:key="option.value"
									type="button"
									:class="[
										'service-choice',
										serviceData.contrassegno.modalita_rimborso === option.value ? 'service-choice--active' : '',
									]"
									@click="serviceData.contrassegno.modalita_rimborso = option.value">
									{{ option.label }}
								</button>
							</div>
							<p v-if="serviceErrors.contrassegnoRimborso" class="service-field__error">{{ serviceErrors.contrassegnoRimborso }}</p>
						</div>
					</div>

					<div v-if="selectedService?.index === 2" class="service-form-stack service-form-stack--insurance">
						<div
							v-for="(pack, indexPopup) in insurancePackages"
							:key="indexPopup"
							class="service-insurance-card">
							<div class="service-insurance-card__row">
								<div class="service-insurance-card__package">
									<div class="service-insurance-card__icon-shell">
										<img :src="getPackageVisual(pack)" :alt="`Collo ${indexPopup + 1}`" class="service-insurance-card__icon" />
									</div>
									<div class="service-insurance-card__copy">
										<p class="service-insurance-card__eyebrow">Collo {{ indexPopup + 1 }}</p>
										<p class="service-insurance-card__summary">
											{{ getInsuranceSummary(pack) }}
										</p>
									</div>
								</div>
								<div class="service-insurance-card__field">
									<label :for="`pack_value_${indexPopup}`" class="sr-only">
										Valore assicurato collo {{ indexPopup + 1 }}
									</label>
									<input
										:id="`pack_value_${indexPopup}`"
										v-model="serviceData.assicurazione[indexPopup]"
										type="text"
										inputmode="decimal"
										autocomplete="off"
										class="service-field__input service-field__input--currency"
										placeholder="Valore"
										@input="handleInsuranceInput(indexPopup, $event)" />
									<span class="service-field__suffix" aria-hidden="true">€</span>
								</div>
							</div>
							<p v-if="serviceErrors.assicurazione[indexPopup]" class="service-field__error service-field__error--inline">
								{{ serviceErrors.assicurazione[indexPopup] }}
							</p>
						</div>
					</div>

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
								<option value="">Sì</option>
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

<style scoped>
.service-modal-shell {
	background: #ffffff;
	padding: 0;
}

.service-modal-header {
	padding: 0;
}

.service-modal-heading {
	min-width: 0;
	flex: 1;
}

.service-modal-heading__main {
	display: flex;
	align-items: center;
	gap: 12px;
}

.service-modal-heading__copy {
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 1px;
}

.service-modal-icon-shell {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 38px;
	height: 38px;
	border-radius: 9px;
	background: #095866;
	flex: 0 0 auto;
}

.service-modal-icon-shell__icon {
	width: 20px;
	height: 20px;
	object-fit: contain;
	filter: brightness(0) invert(1);
}

.service-modal-title {
	margin: 0;
}

.service-modal-subtitle {
	margin: 0;
}

.service-modal-close {
	width: 38px;
	height: 38px;
}

.service-modal-close__icon {
	font-size: 15px;
}

.service-modal-divider {
	height: 1px;
}

.service-modal-body {
	display: grid;
	gap: 15px;
	background: #ffffff;
}

.service-form-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 14px;
}

.service-form-stack {
	display: grid;
	gap: 15px;
}

.service-form-stack--insurance {
	gap: 12px;
}

.service-field {
	min-width: 0;
	position: relative;
}

.service-field--full {
	grid-column: 1 / -1;
}

.service-field__label {
	display: block;
	margin-bottom: 6px;
	color: #252b42;
	font-size: 13px;
	font-weight: 600;
	line-height: 19.5px;
}

.service-field__input {
	width: 100%;
	min-height: 44px;
	padding: 0 18px;
	border: 1px solid #d9dde3;
	border-radius: 12px;
	background: #fff;
	color: #999999;
	font-size: 14px;
	font-weight: 600;
	line-height: 1.2;
	box-shadow: none;
	transition:
		border-color var(--sf-motion-base) var(--sf-ease-soft),
		box-shadow var(--sf-motion-base) var(--sf-ease-soft),
		background-color var(--sf-motion-base) var(--sf-ease-soft),
		transform var(--sf-motion-fast) var(--sf-ease-soft);
}

.service-field__input::placeholder {
	color: #999999;
	font-weight: 600;
}

.service-field__input:focus {
	outline: none;
	border-color: #0f6a78;
	box-shadow: inset 0 0 0 1px rgba(9, 88, 102, 0.28);
}

.service-field__input--currency {
	padding-right: 40px;
}

.service-field__suffix {
	position: absolute;
	right: 11.83px;
	bottom: 12px;
	color: #bbbbbb;
	font-size: 13px;
	font-weight: 600;
	pointer-events: none;
}

.service-field__error {
	margin: 0.45rem 0 0;
	color: #c2410c;
	font-size: 0.8rem;
	font-weight: 600;
	line-height: 1.45;
}

.service-field__error--inline {
	margin-top: 0.55rem;
}

.service-choice-wrap {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	justify-content: flex-start;
	min-height: 36px;
}

.service-choice {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 36px;
	padding: 7.25px 15px 8.75px;
	border: 1px solid #e0e2e6;
	border-radius: 999px;
	background: #fff;
	color: #777777;
	font-size: 13px;
	font-weight: 500;
	line-height: 19.5px;
	cursor: pointer;
	transition:
		border-color var(--sf-motion-base) var(--sf-ease-soft),
		background-color var(--sf-motion-base) var(--sf-ease-soft),
		color var(--sf-motion-base) var(--sf-ease-soft),
		transform var(--sf-motion-fast) var(--sf-ease-soft),
		box-shadow var(--sf-motion-base) var(--sf-ease-soft);
	white-space: nowrap;
}

.service-choice:hover {
	border-color: #e2e7ec;
	background: #fbfcfd;
	color: #252b42;
	transform: translateY(-1px);
}

.service-choice--active {
	border-color: #095866;
	background: #095866;
	color: #fff;
	font-weight: 700;
}

.service-choice--active:hover,
.service-choice--active:focus-visible {
	border-color: #095866;
	background: #095866;
	color: #fff;
	box-shadow: 0 0 0 3px rgba(9, 88, 102, 0.08);
	transform: translateY(-1px);
}

.service-insurance-card {
	padding: 2px 0 0;
	border-top: 1px solid #f3f5f7;
}

.service-insurance-card:first-child {
	border-top: 0;
	padding-top: 0;
}

.service-insurance-card__row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	min-height: 42px;
}

.service-insurance-card__package {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
}

.service-insurance-card__icon-shell {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border-radius: 10px;
	background: #ffffff;
	border: 1px solid #f0f1f3;
	box-shadow: none;
	flex: 0 0 auto;
}

.service-insurance-card__icon {
	width: 16px;
	height: 16px;
	object-fit: contain;
}

.service-insurance-card__copy {
	min-width: 0;
}

.service-insurance-card__eyebrow {
	margin: 0 0 0.12rem;
	color: #252b42;
	font-size: 14px;
	font-weight: 700;
	line-height: 21px;
}

.service-insurance-card__summary {
	margin: 0;
	color: #aaaaaa;
	font-size: 12px;
	font-weight: 600;
	line-height: 18px;
}

.service-insurance-card__field {
	position: relative;
	width: min(100%, 160px);
	flex: 0 0 auto;
}

.service-days-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(94px, 1fr));
	gap: 0.85rem;
}

.service-day-card {
	padding: 0.85rem;
	border: 1px solid #e7ecef;
	border-radius: 1rem;
	background: #fafcfc;
}

.service-day-card__title {
	display: block;
	margin-bottom: 0.55rem;
	text-align: center;
	color: #252b42;
	font-size: 0.92rem;
	font-weight: 700;
}

.service-modal-footer {
	width: 100%;
	background: #ffffff;
}

.service-modal-action {
	min-height: 46px;
	padding: 0 22px;
	font-size: 14px;
	line-height: 21px;
	cursor: pointer;
	transition: opacity var(--sf-motion-fast) var(--sf-ease-soft);
}

.service-modal-action:disabled {
	cursor: not-allowed;
	opacity: 0.56;
}

.service-modal-action--secondary {
	font-weight: 700;
}

.service-modal-action--primary {
	min-width: 88px;
	font-weight: 700;
}

@media (max-width: 37rem) {
	.service-modal-heading__main {
		align-items: flex-start;
	}

	.service-form-grid {
		grid-template-columns: 1fr;
	}

	.service-choice-wrap {
		grid-template-columns: 1fr;
	}

	.service-insurance-card__row {
		flex-direction: column;
		align-items: stretch;
	}

	.service-insurance-card__field {
		width: 100%;
	}
}
</style>
