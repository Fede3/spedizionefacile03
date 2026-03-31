/**
 * useShipmentStepServiceCards — Service card UI logic for step 1.
 *
 * Handles: contrassegno/assicurazione inline validation, service state labels,
 * toggle/activate/expand interactions, currency input normalization.
 */
export function useShipmentStepServiceCards({
	editablePackages,
	ensureServiceSelected,
	expandedServiceName,
	featuredService,
	chooseService,
	resetServicesState,
	serviceData,
	servicesList,
	smsEmailNotification,
	submitError,
	toggleServiceDetails,
	toggleServiceSelection,
	userStore,
}) {
	// --- ERRORS ---
	const serviceCardErrors = reactive({
		contrassegnoImporto: "",
		contrassegnoIncasso: "",
		contrassegnoRimborso: "",
		contrassegnoDettaglio: "",
		assicurazione: {},
	});

	const clearServiceCardErrors = () => {
		serviceCardErrors.contrassegnoImporto = "";
		serviceCardErrors.contrassegnoIncasso = "";
		serviceCardErrors.contrassegnoRimborso = "";
		serviceCardErrors.contrassegnoDettaglio = "";
		serviceCardErrors.assicurazione = {};
	};

	// --- CURRENCY HELPERS ---
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

	// --- INSURANCE PACKAGES ---
	const insurancePackages = computed(() => {
		if (Array.isArray(editablePackages.value) && editablePackages.value.length > 0) {
			return editablePackages.value;
		}
		return [{ package_type: "pacco", weight: "", first_size: "", second_size: "", third_size: "" }];
	});

	// --- CONTRASSEGNO/ASSICURAZIONE OPTIONS ---
	const contrassegnoIncassoOptions = [
		{ value: "contanti", label: "Contanti" },
		{ value: "assegno", label: "Assegno" },
	];
	const contrassegnoRimborsoOptions = [
		{ value: "bonifico", label: "Bonifico" },
		{ value: "assegno", label: "Assegno" },
		{ value: "assegno_circolare", label: "Assegno circolare" },
	];

	const requiresContrassegnoDettaglio = computed(() => (
		serviceData.value.contrassegno.modalita_rimborso === "bonifico"
	));

	// --- VALIDATION ---
	const validateContrassegnoInline = () => {
		clearServiceCardErrors();
		let isValid = true;

		if (!isServiceSelected("Contrassegno")) return true;

		if (parseCurrencyValue(serviceData.value.contrassegno.importo) <= 0) {
			serviceCardErrors.contrassegnoImporto = "Inserisci un importo valido.";
			isValid = false;
		}
		if (!serviceData.value.contrassegno.modalita_incasso) {
			serviceCardErrors.contrassegnoIncasso = "Seleziona l'incasso.";
			isValid = false;
		}
		if (!serviceData.value.contrassegno.modalita_rimborso) {
			serviceCardErrors.contrassegnoRimborso = "Seleziona il rimborso.";
			isValid = false;
		}
		if (requiresContrassegnoDettaglio.value && !String(serviceData.value.contrassegno.dettaglio_rimborso || "").trim()) {
			serviceCardErrors.contrassegnoDettaglio = "Inserisci l'IBAN.";
			isValid = false;
		}

		return isValid;
	};

	const validateAssicurazioneInline = () => {
		let isValid = true;
		if (!isServiceSelected("Assicurazione")) return true;

		const nextErrors = {};
		insurancePackages.value.forEach((_, index) => {
			if (parseCurrencyValue(serviceData.value.assicurazione[index]) <= 0) {
				nextErrors[index] = "Inserisci un valore.";
				isValid = false;
			}
		});

		serviceCardErrors.assicurazione = nextErrors;
		return isValid;
	};

	const validateInlineServiceDetails = () => {
		const contrassegnoValid = validateContrassegnoInline();
		if (!contrassegnoValid) {
			expandedServiceName.value = "Contrassegno";
			submitError.value = "Completa i dettagli del contrassegno.";
			return false;
		}

		const assicurazioneValid = validateAssicurazioneInline();
		if (!assicurazioneValid) {
			expandedServiceName.value = "Assicurazione";
			submitError.value = "Completa i dettagli dell'assicurazione.";
			return false;
		}

		submitError.value = null;
		return true;
	};

	// --- READINESS CHECKS ---
	const isContrassegnoReady = () => (
		parseCurrencyValue(serviceData.value.contrassegno.importo) > 0
		&& Boolean(serviceData.value.contrassegno.modalita_incasso)
		&& Boolean(serviceData.value.contrassegno.modalita_rimborso)
		&& (!requiresContrassegnoDettaglio.value || Boolean(String(serviceData.value.contrassegno.dettaglio_rimborso || "").trim()))
	);

	const isAssicurazioneReady = () => (
		insurancePackages.value.every((_, index) => parseCurrencyValue(serviceData.value.assicurazione[index]) > 0)
	);

	const isConfigurableServiceReady = (serviceName) => {
		if (serviceName === "Contrassegno") return isContrassegnoReady();
		if (serviceName === "Assicurazione") return isAssicurazioneReady();
		return true;
	};

	// --- SERVICE STATE HELPERS ---
	const isServiceExpanded = (serviceName) => expandedServiceName.value === serviceName;
	const getServiceIndex = (service) => servicesList.value.findIndex((item) => item.name === service.name);
	const isServiceSelected = (serviceName) => userStore.servicesArray.includes(serviceName);
	const featuredServiceIndex = computed(() => servicesList.value.findIndex((item) => item.featured));
	const canConfigureService = (service) => Boolean(service?.hasDetails);

	const shouldShowServiceToggle = (service) => !canConfigureService(service);
	const shouldShowConfigureButton = (service) => canConfigureService(service);

	const canActivateConfiguredService = (service) => (
		canConfigureService(service) && isConfigurableServiceReady(service.name) && !service.isSelected
	);

	const getServiceStateLabel = (service) => {
		if (service.isSelected) return "Attivo";
		if (canConfigureService(service) && !isConfigurableServiceReady(service.name)) {
			return isServiceExpanded(service.name) ? "Compila dati" : "Da configurare";
		}
		if (canConfigureService(service)) return "Pronto";
		return "Disponibile";
	};

	const getServiceConfigureLabel = (service) => {
		if (isServiceExpanded(service.name)) return "Chiudi";
		if (!isConfigurableServiceReady(service.name)) return "Configura";
		if (service.isSelected) return "Modifica";
		if (canConfigureService(service)) return "Attiva";
		return "Configura";
	};

	// --- INTERACTIONS ---
	const activateConfiguredService = (service) => {
		if (!canConfigureService(service) || service.isSelected) return;

		clearServiceCardErrors();
		submitError.value = null;

		let isValid = true;
		if (service.name === "Contrassegno") {
			isValid = validateContrassegnoInline();
			if (!isValid) submitError.value = "Completa i dettagli del contrassegno.";
		}
		if (service.name === "Assicurazione") {
			isValid = validateAssicurazioneInline();
			if (!isValid) submitError.value = "Completa i dettagli dell'assicurazione.";
		}

		if (!isValid) {
			expandedServiceName.value = service.name;
			return;
		}

		const serviceIndex = getServiceIndex(service);
		if (serviceIndex === -1) return;

		ensureServiceSelected(service, serviceIndex);
		expandedServiceName.value = "";
	};

	const handleServicePrimaryAction = (service) => {
		if (!canConfigureService(service)) {
			toggleRegularService(service);
			return;
		}

		if (isServiceExpanded(service.name)) {
			expandedServiceName.value = "";
			return;
		}

		if (!isConfigurableServiceReady(service.name)) {
			toggleServiceAccordion(service);
			return;
		}

		if (!service.isSelected) {
			activateConfiguredService(service);
			return;
		}

		toggleServiceAccordion(service);
	};

	const toggleRegularService = (service) => {
		const serviceIndex = getServiceIndex(service);
		if (serviceIndex === -1) return;
		clearServiceCardErrors();
		submitError.value = null;
		toggleServiceSelection(service, serviceIndex);
	};

	const toggleServiceAccordion = (service) => {
		const serviceIndex = getServiceIndex(service);
		if (serviceIndex === -1) return;
		clearServiceCardErrors();
		submitError.value = null;
		toggleServiceDetails(service, serviceIndex);
	};

	const toggleFeaturedService = () => {
		if (!featuredService.value || featuredServiceIndex.value === -1) return;
		clearServiceCardErrors();
		submitError.value = null;
		chooseService(featuredService.value, featuredServiceIndex.value);
	};

	return {
		// errors
		serviceCardErrors,
		clearServiceCardErrors,
		// currency
		normalizeCurrencyInput,
		parseCurrencyValue,
		// options
		contrassegnoIncassoOptions,
		contrassegnoRimborsoOptions,
		requiresContrassegnoDettaglio,
		insurancePackages,
		// validation
		validateContrassegnoInline,
		validateAssicurazioneInline,
		validateInlineServiceDetails,
		// readiness
		isConfigurableServiceReady,
		// state helpers
		isServiceExpanded,
		isServiceSelected,
		featuredServiceIndex,
		canConfigureService,
		shouldShowServiceToggle,
		shouldShowConfigureButton,
		canActivateConfiguredService,
		getServiceStateLabel,
		getServiceConfigureLabel,
		// interactions
		activateConfiguredService,
		handleServicePrimaryAction,
		toggleRegularService,
		toggleServiceAccordion,
		toggleFeaturedService,
	};
}
