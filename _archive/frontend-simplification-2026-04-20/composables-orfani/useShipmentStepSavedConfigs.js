export const useShipmentStepSavedConfigs = ({
	clearAddressSelectorsAndPrompts,
	defaultDropdownRef,
	destDefaultDropdownRef,
	destFromSaved,
	destSaveSuccess,
	destSavedSnapshot,
	destSelectorRef,
	destinationAddress,
	deliveryMode,
	isAuthenticated,
	originAddress,
	originFromSaved,
	originSaveSuccess,
	originSavedSnapshot,
	originSelectorRef,
	sanctumClient,
	showDestConfigGuestPrompt,
	showOriginConfigGuestPrompt,
	toggleAddressSelector,
}) => {
	const showDefaultDropdown = ref(false);
	const showDefaultDropdownTarget = ref('origin');
	const savedConfigs = ref([]);
	const loadingConfigs = ref(false);
	const savedConfigsLoaded = ref(false);

	const closeTopDropdowns = () => {
		showDefaultDropdown.value = false;
		showDefaultDropdownTarget.value = 'origin';
		clearAddressSelectorsAndPrompts();
	};

	const handleTopDropdownClickOutside = (event) => {
		const target = event?.target;
		const insideDefaultOrigin = defaultDropdownRef.value?.contains?.(target);
		const insideDefaultDest = destDefaultDropdownRef.value?.contains?.(target);
		const insideOrigin = originSelectorRef.value?.contains?.(target);
		const insideDest = destSelectorRef.value?.contains?.(target);
		if (!insideDefaultOrigin && !insideDefaultDest && !insideOrigin && !insideDest) {
			closeTopDropdowns();
		}
	};

	const handleTopDropdownEsc = (event) => {
		if (event.key === 'Escape') {
			closeTopDropdowns();
		}
	};

	const loadSavedConfigs = async (targetSection = 'origin') => {
		if (!isAuthenticated.value) {
			clearAddressSelectorsAndPrompts();
			if (targetSection === 'origin') {
				showOriginConfigGuestPrompt.value = !showOriginConfigGuestPrompt.value;
				showDestConfigGuestPrompt.value = false;
			} else {
				showDestConfigGuestPrompt.value = !showDestConfigGuestPrompt.value;
				showOriginConfigGuestPrompt.value = false;
			}
			return;
		}

		clearAddressSelectorsAndPrompts();
		if (showDefaultDropdown.value && showDefaultDropdownTarget.value === targetSection) {
			showDefaultDropdown.value = false;
			return;
		}
		showDefaultDropdownTarget.value = targetSection;

		if (savedConfigsLoaded.value) {
			showDefaultDropdown.value = true;
			return;
		}

		loadingConfigs.value = true;
		try {
			const result = await sanctumClient('/api/saved-shipments');
			savedConfigs.value = result?.data || [];
			savedConfigsLoaded.value = true;
			showDefaultDropdown.value = true;
		} catch (error) {
		} finally {
			loadingConfigs.value = false;
		}
	};

	const applyConfigToOrigin = (configAddress) => {
		if (!configAddress) return;
		originAddress.value.full_name = configAddress.name || '';
		originAddress.value.address = configAddress.address || '';
		originAddress.value.address_number = configAddress.address_number || '';
		originAddress.value.city = configAddress.city || '';
		originAddress.value.postal_code = configAddress.postal_code || '';
		originAddress.value.province = configAddress.province || '';
		originAddress.value.telephone_number = configAddress.telephone_number || '';
		originAddress.value.email = configAddress.email || '';
		originAddress.value.additional_information = configAddress.additional_information || '';
		originAddress.value.intercom_code = configAddress.intercom_code || '';
		originFromSaved.value = true;
		originSaveSuccess.value = false;
		originSavedSnapshot.value = JSON.stringify(originAddress.value);
	};

	const applyConfigToDestination = (configAddress) => {
		if (!configAddress) return;
		const contactOnly = deliveryMode.value === 'pudo';
		destinationAddress.value.full_name = configAddress.name || destinationAddress.value.full_name || '';
		destinationAddress.value.telephone_number = configAddress.telephone_number || destinationAddress.value.telephone_number || '';
		destinationAddress.value.email = configAddress.email || destinationAddress.value.email || '';
		destinationAddress.value.additional_information = configAddress.additional_information || destinationAddress.value.additional_information || '';

		if (!contactOnly) {
			destinationAddress.value.address = configAddress.address || '';
			destinationAddress.value.address_number = configAddress.address_number || '';
			destinationAddress.value.city = configAddress.city || '';
			destinationAddress.value.postal_code = configAddress.postal_code || '';
			destinationAddress.value.province = configAddress.province || '';
			destinationAddress.value.intercom_code = configAddress.intercom_code || '';
		}

		destFromSaved.value = true;
		destSaveSuccess.value = false;
		destSavedSnapshot.value = JSON.stringify(destinationAddress.value);
	};

	const applyConfig = (item, targetSection = 'origin') => {
		if (item.origin_address && (targetSection === 'origin' || targetSection === 'both')) {
			applyConfigToOrigin(item.origin_address);
		}
		if (item.destination_address && (targetSection === 'dest' || targetSection === 'both')) {
			applyConfigToDestination(item.destination_address);
		}
		showDefaultDropdown.value = false;
		showOriginConfigGuestPrompt.value = false;
		showDestConfigGuestPrompt.value = false;
	};

	const toggleAddressSelectorWithDefaultClose = (target) => {
		showDefaultDropdown.value = false;
		toggleAddressSelector(target);
	};

	onMounted(() => {
		document.addEventListener('click', handleTopDropdownClickOutside, true);
		document.addEventListener('keydown', handleTopDropdownEsc);
	});

	onBeforeUnmount(() => {
		document.removeEventListener('click', handleTopDropdownClickOutside, true);
		document.removeEventListener('keydown', handleTopDropdownEsc);
	});

	return {
		loadingConfigs,
		loadSavedConfigs,
		savedConfigs,
		showDefaultDropdown,
		showDefaultDropdownTarget,
		toggleAddressSelectorWithDefaultClose,
		applyConfig,
	};
};
