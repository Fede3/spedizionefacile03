import { buildSecondStepPayload } from '~/composables/useShipmentStepSessionPersistence';

export const useShipmentStepSubmit = ({
	destinationAddress,
	editablePackages,
	editCartId,
	focusFirstFormError,
	focusPickupDateSection,
	formRef,
	navigateToRiepilogo = true,
	normalizeLocationText,
	originAddress,
	persistSecondStep,
	routeConsistencyState,
	smsEmailNotification,
	services,
	submitError,
	uiFeedback,
	userStore,
	validateForm,
}) => {
	const isSubmitting = ref(false);

	const normalizePostalCode = (addressData) => {
		const country = String(addressData?.country || 'Italia')
			.trim()
			.toLowerCase();
		const rawPostalCode = String(addressData?.postal_code || '');
		if (country === 'italia') {
			return rawPostalCode.replace(/[^0-9]/g, '') || '00000';
		}

		return (
			rawPostalCode
				.toUpperCase()
				.replace(/[^A-Z0-9-\s]/g, '')
				.trim() || 'N/D'
		);
	};

	const toAddressPayload = (addressData) => ({
		type: addressData.type || 'Partenza',
		name: (addressData.full_name || 'N/D').trim(),
		additional_information: addressData.additional_information || '',
		address: (addressData.address || 'N/D').trim(),
		number_type: 'Numero Civico',
		address_number: (addressData.address_number || 'SNC').trim(),
		intercom_code: addressData.intercom_code || '',
		country: addressData.country || 'Italia',
		city: (addressData.city || 'N/D').trim(),
		postal_code: normalizePostalCode(addressData),
		province: (addressData.province || 'N/D').trim(),
		telephone_number: String(addressData.telephone_number || '0000000000').trim(),
		email: addressData.email || '',
	});

	const continueToCart = async () => {
		if (isSubmitting.value) return;
		isSubmitting.value = true;
		submitError.value = null;

		try {
			if (!(await validateForm())) {
				nextTick(() => {
					if (services.value.date) {
						focusFirstFormError();
						return;
					}
					focusPickupDateSection();
				});
				return;
			}

			if (!formRef.value || !formRef.value.checkValidity()) {
				formRef.value?.reportValidity();
				return;
			}

			const packages = editablePackages.value;
			if (!packages.length) {
				submitError.value = 'Nessun collo disponibile. Torna al preventivo rapido.';
				return;
			}

			if (userStore.deliveryMode === 'pudo' && !userStore.selectedPudo) {
				submitError.value = 'Seleziona un Punto BRT per la consegna prima di procedere.';
				return;
			}

			if (userStore.deliveryMode === 'pudo' && userStore.selectedPudo) {
				const recipientNameNorm = normalizeLocationText(destinationAddress.value.full_name || '');
				const pudoNameNorm = normalizeLocationText(userStore.selectedPudo?.name || '');
				if (recipientNameNorm && pudoNameNorm && recipientNameNorm === pudoNameNorm) {
					submitError.value = 'Nel campo Nome e Cognome inserisci il destinatario (persona), non il nome del Punto BRT.';
					nextTick(() => {
						document.getElementById('dest_name')?.focus();
					});
					return;
				}
			}

			if (routeConsistencyState.value.blocking) {
				submitError.value = routeConsistencyState.value.message;
				nextTick(() => {
					const focusId = userStore.deliveryMode === 'pudo' ? 'dest_name' : 'dest_address';
					document.getElementById(focusId)?.focus();
				});
				return;
			}

			const payload = {
				...buildSecondStepPayload({
					userStore,
					services,
					smsEmailNotification,
					originAddress: { value: toAddressPayload(originAddress.value) },
					destinationAddress: { value: toAddressPayload(destinationAddress.value) },
					includeAddresses: true,
				}),
				packages,
			};

			if (typeof persistSecondStep === 'function') {
				const persisted = await persistSecondStep(payload);
				if (persisted === false) {
					return;
				}
			}

			userStore.pendingShipment = payload;
			userStore.originAddressData = { ...originAddress.value };
			userStore.destinationAddressData = { ...destinationAddress.value };
			userStore.pickupDate = services.value.date || '';
			userStore.smsEmailNotification = smsEmailNotification.value;

			if (editCartId) {
				userStore.editingCartItemId = editCartId;
			}

			uiFeedback.success('Dati salvati', 'Apertura del riepilogo...', { timeout: 1800 });

			if (navigateToRiepilogo) {
				await navigateTo('/riepilogo', { replace: true });
			}
		} finally {
			isSubmitting.value = false;
		}
	};

	return {
		continueToCart,
		isSubmitting,
	};
};
