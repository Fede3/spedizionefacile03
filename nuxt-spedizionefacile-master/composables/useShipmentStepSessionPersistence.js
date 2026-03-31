export const normalizePostalCodeForStep = (addressData = {}) => {
	const country = String(addressData?.country || "Italia").trim().toLowerCase();
	const rawPostalCode = String(addressData?.postal_code || "");

	if (country === "italia") {
		return rawPostalCode.replace(/[^0-9]/g, "") || "00000";
	}

	return rawPostalCode.toUpperCase().replace(/[^A-Z0-9-\s]/g, "").trim() || "N/D";
};

export const toStepAddressPayload = (addressData = {}) => ({
	type: addressData.type || "Partenza",
	name: (addressData.full_name || "N/D").trim(),
	additional_information: addressData.additional_information || "",
	address: (addressData.address || "N/D").trim(),
	number_type: "Numero Civico",
	address_number: (addressData.address_number || "SNC").trim(),
	intercom_code: addressData.intercom_code || "",
	country: addressData.country || "Italia",
	city: (addressData.city || "N/D").trim(),
	postal_code: normalizePostalCodeForStep(addressData),
	province: (addressData.province || "N/D").trim(),
	telephone_number: String(addressData.telephone_number || "0000000000").trim(),
	email: addressData.email || "",
});

export const buildSecondStepPayload = ({
	userStore,
	services,
	smsEmailNotification,
	originAddress,
	destinationAddress,
	includeAddresses = false,
	payload = null,
} = {}) => {
	if (payload) return payload;

	return {
		services: {
			service_type: userStore.servicesArray.join(", "),
			date: services.value.date || "",
			time: services.value.time || "",
			serviceData: {
				...(userStore.serviceData || {}),
				sms_email_notification: Boolean(smsEmailNotification.value),
			},
			sms_email_notification: Boolean(smsEmailNotification.value),
		},
		content_description: userStore.contentDescription || "",
		pickup_date: services.value.date || "",
		sms_email_notification: Boolean(smsEmailNotification.value),
		origin_address: includeAddresses ? toStepAddressPayload(originAddress.value) : null,
		destination_address: includeAddresses ? toStepAddressPayload(destinationAddress.value) : null,
		delivery_mode: userStore.deliveryMode,
		selected_pudo: userStore.deliveryMode === "pudo" ? userStore.selectedPudo : null,
	};
};

export const useShipmentStepSessionPersistence = ({
	sanctumClient,
	refresh,
	session,
	submitError,
	userStore,
	services,
	smsEmailNotification,
	originAddress,
	destinationAddress,
}) => {
	const persistShipmentFlowState = async ({ includeAddresses = false, payload = null } = {}) => {
		try {
			await sanctumClient("/api/session/second-step", {
				method: "POST",
				body: buildSecondStepPayload({
					userStore,
					services,
					smsEmailNotification,
					originAddress,
					destinationAddress,
					includeAddresses,
					payload,
				}),
			});
			await refresh().catch(() => session.value);
			return true;
		} catch (error) {
			submitError.value = error?.data?.message || "Errore nel salvataggio del flusso spedizione. Riprova.";
			return false;
		}
	};

	return {
		persistShipmentFlowState,
	};
};
