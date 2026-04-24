export const useShipmentStepFlow = ({
	contentError,
	dateError,
	deliveryMode,
	destinationAddress,
	focusContentDescriptionField,
	focusPickupDateSection,
	normalizeLocationText,
	persistServicesStep,
	session,
	services,
	shouldAutoShowAddressFields,
	sv,
	shipmentFlowStore,
}) => {
	const initialRoute = useRoute();
	const initialStepQuery = Array.isArray(initialRoute.query?.step) ? initialRoute.query.step[0] : initialRoute.query?.step;
	// Hydration da deep-link/refresh: mappo il query param allo stage accordion,
	// così un refresh su ?step=pagamento non ritorna allo stage services.
	let initialAccordionStep;
	if (initialStepQuery === 'colli') {
		initialAccordionStep = 'packages';
	} else if (initialStepQuery === 'ritiro') {
		initialAccordionStep = 'addresses';
	} else if (initialStepQuery === 'pagamento' || initialStepQuery === 'conferma') {
		initialAccordionStep = 'payment';
	} else {
		initialAccordionStep = Boolean(shouldAutoShowAddressFields) ? 'addresses' : 'services';
	}
	const activeAccordionStep = ref(initialAccordionStep);
	const showAddressFields = computed({
		get: () => activeAccordionStep.value === 'addresses',
		set: (value) => {
			activeAccordionStep.value = value ? 'addresses' : 'services';
		},
	});
	const addressReadinessItems = computed(() => {
		const hasContentDescription = Boolean(
			String(shipmentFlowStore.contentDescription || session.value?.data?.content_description || '').trim(),
		);
		const hasPickupDate = Boolean(services.value?.date || session.value?.data?.pickup_date || session.value?.data?.services?.date);

		return [
			{
				key: 'pickup-date',
				label: 'Giorno di ritiro',
				done: hasPickupDate,
			},
			{
				key: 'content-description',
				label: 'Contenuto del pacco',
				done: hasContentDescription,
			},
		];
	});
	const router = useRouter();
	const route = useRoute();
	// Mapping stage accordion -> query string `?step=...`.
	// `services` non usa query (URL pulito) perche' e' lo stage di default della pagina.
	const STAGE_TO_QUERY_STEP = {
		packages: 'colli',
		services: undefined,
		addresses: 'ritiro',
		payment: 'pagamento',
	};

	const syncAccordionStepInUrl = async (stage) => {
		const nextStepQuery = STAGE_TO_QUERY_STEP[stage];
		const nextQuery = { ...route.query };
		if (nextStepQuery) {
			nextQuery.step = nextStepQuery;
		} else {
			delete nextQuery.step;
		}

		const currentStepQuery = Array.isArray(route.query.step) ? route.query.step[0] : route.query.step;
		if ((currentStepQuery || '') === (nextStepQuery || '')) return;

		await router.replace({
			path: route.path,
			query: nextQuery,
			hash: route.hash,
		});
	};

	// Backwards-compat: vecchia signature boolean (true=addresses, false=services).
	const syncAddressStepInUrl = async (enabled) => {
		await syncAccordionStepInUrl(enabled ? 'addresses' : 'services');
	};

	const setActiveAccordionStep = async (stepKey) => {
		// Normalizzo su uno dei 4 stage validi; fallback a 'services' per retrocompatibilita'.
		const normalizedStep = Object.prototype.hasOwnProperty.call(STAGE_TO_QUERY_STEP, stepKey)
			? stepKey
			: 'services';

		activeAccordionStep.value = normalizedStep;
		await syncAccordionStepInUrl(normalizedStep);
		return true;
	};

	const onPudoSelected = (pudo) => {
		shipmentFlowStore.selectedPudo = pudo;
		destinationAddress.value.address = pudo.address || '';
		destinationAddress.value.address_number = 'SNC';
		destinationAddress.value.city = pudo.city || '';
		destinationAddress.value.postal_code = pudo.zip_code || '';
		destinationAddress.value.province = pudo.province || 'ND';

		const selectedPudoName = normalizeLocationText(pudo?.name || '');
		const currentDestName = normalizeLocationText(destinationAddress.value.full_name || '');
		if (selectedPudoName && currentDestName && selectedPudoName === currentDestName) {
			destinationAddress.value.full_name = '';
		}

		shipmentFlowStore.shipmentDetails = {
			...(shipmentFlowStore.shipmentDetails || {}),
			destination_city: pudo.city || destinationAddress.value.city || '',
			destination_postal_code: pudo.zip_code || destinationAddress.value.postal_code || '',
		};
	};

	const onPudoDeselected = () => {
		shipmentFlowStore.selectedPudo = null;
		destinationAddress.value.address = '';
		destinationAddress.value.address_number = '';
		destinationAddress.value.city = session.value?.data?.shipment_details?.destination_city || '';
		destinationAddress.value.postal_code = session.value?.data?.shipment_details?.destination_postal_code || '';
		destinationAddress.value.province = '';
	};

	watch(deliveryMode, (newMode) => {
		if (newMode === 'home') {
			// Torno a "consegna a domicilio": ripulisco lo stato PUDO
			// dagli indirizzi di destinazione e azzero il punto
			// selezionato. Inline della logica di onPudoDeselected per
			// evitare dipendenze dall'ordine di dichiarazione.
			shipmentFlowStore.selectedPudo = null;
			destinationAddress.value.address = '';
			destinationAddress.value.address_number = '';
			destinationAddress.value.city = session.value?.data?.shipment_details?.destination_city || '';
			destinationAddress.value.postal_code = session.value?.data?.shipment_details?.destination_postal_code || '';
			destinationAddress.value.province = '';
			return;
		}

		['dest_address', 'dest_address_number', 'dest_city', 'dest_province', 'dest_postal_code'].forEach((fieldKey) =>
			sv.clearError(fieldKey),
		);
	});

	const openAddressFields = async () => {
		if (!shipmentFlowStore.contentDescription || !String(shipmentFlowStore.contentDescription).trim()) {
			contentError.value = 'Il contenuto del pacco è obbligatorio';
			nextTick(() => {
				focusContentDescriptionField();
			});
			return;
		}

		if (!services.value.date) {
			dateError.value = 'Seleziona un giorno di ritiro prima di procedere.';
			focusPickupDateSection();
			return;
		}

		contentError.value = null;
		dateError.value = null;

		if (typeof persistServicesStep === 'function') {
			const persisted = await persistServicesStep();
			if (persisted === false) return;
		}

		await setActiveAccordionStep('addresses');
		return true;
	};

	const goBackToServices = async () => {
		await setActiveAccordionStep('services');
		return true;
	};

	const goBackToAddresses = async () => {
		await setActiveAccordionStep('addresses');
		return true;
	};

	const openPackagesStage = async () => {
		await setActiveAccordionStep('packages');
		return true;
	};

	const openPaymentStage = async () => {
		await setActiveAccordionStep('payment');
		return true;
	};

	return {
		activeAccordionStep,
		addressReadinessItems,
		goBackToAddresses,
		goBackToServices,
		onPudoDeselected,
		onPudoSelected,
		openAddressFields,
		openPackagesStage,
		openPaymentStage,
		showAddressFields,
	};
};
