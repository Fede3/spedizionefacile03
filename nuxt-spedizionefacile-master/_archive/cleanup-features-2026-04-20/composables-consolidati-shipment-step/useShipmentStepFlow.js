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
	// Stato iniziale dell'accordion: 'packages' se arrivo da link "Preventivo"
	// (?step=colli), 'addresses' se auto-show richiesto (ritorno da indirizzi),
	// altrimenti 'services' (default storico).
	const resolveInitialStep = () => {
		const routeStep = useRoute()?.query?.step;
		const raw = Array.isArray(routeStep) ? routeStep[0] : routeStep;
		if (raw === 'colli' || raw === 'packages') return 'packages';
		if (raw === 'ritiro' || raw === 'addresses') return 'addresses';
		if (shouldAutoShowAddressFields) return 'addresses';
		return 'services';
	};
	const activeAccordionStep = ref(resolveInitialStep());
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
	// Sync query.step in URL in base allo step attivo. 'colli' per packages,
	// 'ritiro' per addresses, niente per services/payment.
	const STEP_TO_QUERY = { packages: 'colli', addresses: 'ritiro' };
	const syncStepInUrl = async (accordionStep) => {
		const nextQuery = { ...route.query };
		const nextStepQuery = STEP_TO_QUERY[accordionStep];
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

	const VALID_STEPS = new Set(['packages', 'services', 'addresses', 'payment']);

	const setActiveAccordionStep = async (stepKey) => {
		const normalizedStep = VALID_STEPS.has(stepKey) ? stepKey : 'services';
		activeAccordionStep.value = normalizedStep;
		await syncStepInUrl(normalizedStep);
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
			shipmentFlowStore.selectedPudo = null;
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
