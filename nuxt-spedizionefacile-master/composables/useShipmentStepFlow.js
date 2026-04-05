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
	userStore,
}) => {
	const activeAccordionStep = ref(Boolean(shouldAutoShowAddressFields) ? 'addresses' : 'services');
	const showAddressFields = computed({
		get: () => activeAccordionStep.value === 'addresses',
		set: (value) => {
			activeAccordionStep.value = value ? 'addresses' : 'services';
		},
	});
	const addressReadinessItems = computed(() => {
		const hasContentDescription = Boolean(
			String(userStore.contentDescription || session.value?.data?.content_description || '').trim(),
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
	const syncAddressStepInUrl = async (enabled) => {
		const nextQuery = { ...route.query };
		if (enabled) {
			nextQuery.step = 'ritiro';
		} else {
			delete nextQuery.step;
		}

		const currentStepQuery = Array.isArray(route.query.step) ? route.query.step[0] : route.query.step;
		const nextStepQuery = Array.isArray(nextQuery.step) ? nextQuery.step[0] : nextQuery.step;
		if ((currentStepQuery || '') === (nextStepQuery || '')) return;

		await router.replace({
			path: route.path,
			query: nextQuery,
			hash: route.hash,
		});
	};

	const setActiveAccordionStep = async (stepKey) => {
		const normalizedStep = stepKey === 'addresses' ? 'addresses' : 'services';
		const nextShowAddressFields = normalizedStep === 'addresses';

		activeAccordionStep.value = normalizedStep;
		await syncAddressStepInUrl(nextShowAddressFields);
		return true;
	};

	const onPudoSelected = (pudo) => {
		userStore.selectedPudo = pudo;
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

		userStore.shipmentDetails = {
			...(userStore.shipmentDetails || {}),
			destination_city: pudo.city || destinationAddress.value.city || '',
			destination_postal_code: pudo.zip_code || destinationAddress.value.postal_code || '',
		};
	};

	const onPudoDeselected = () => {
		userStore.selectedPudo = null;
		destinationAddress.value.address = '';
		destinationAddress.value.address_number = '';
		destinationAddress.value.city = session.value?.data?.shipment_details?.destination_city || '';
		destinationAddress.value.postal_code = session.value?.data?.shipment_details?.destination_postal_code || '';
		destinationAddress.value.province = '';
	};

	watch(deliveryMode, (newMode) => {
		if (newMode === 'home') {
			userStore.selectedPudo = null;
			return;
		}

		['dest_address', 'dest_address_number', 'dest_city', 'dest_province', 'dest_postal_code'].forEach((fieldKey) =>
			sv.clearError(fieldKey),
		);
	});

	const openAddressFields = async () => {
		if (!userStore.contentDescription || !String(userStore.contentDescription).trim()) {
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

	return {
		activeAccordionStep,
		addressReadinessItems,
		goBackToServices,
		onPudoDeselected,
		onPudoSelected,
		openAddressFields,
		showAddressFields,
	};
};
