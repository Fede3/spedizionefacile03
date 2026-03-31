export const SHIPMENT_FLOW_ROUTES = {
	quote: '/preventivo',
	services: '/la-tua-spedizione/2',
	addresses: '/la-tua-spedizione/2?step=ritiro',
	summary: '/riepilogo',
	checkout: '/checkout',
};

const hasMeaningfulText = (value) => String(value || '').trim().length > 0;
const hasPositiveQueryId = (value) => {
	const raw = Array.isArray(value) ? value[0] : value;
	if (raw === undefined || raw === null || raw === '') return false;
	const parsed = Number(raw);
	return Number.isFinite(parsed) ? parsed > 0 : hasMeaningfulText(raw);
};

const normalizeServiceTypeList = (serviceType) => String(serviceType || '')
	.split(',')
	.map((value) => value.trim())
	.filter(Boolean);

const hasQuoteDetails = (shipmentDetails = {}) => (
	hasMeaningfulText(shipmentDetails?.origin_city)
	&& hasMeaningfulText(shipmentDetails?.destination_city)
);

const hasPackages = (packages) => Array.isArray(packages) && packages.length > 0;

const hasAddressDraft = (address = {}) => (
	hasMeaningfulText(address?.name || address?.full_name)
	&& hasMeaningfulText(address?.address)
	&& hasMeaningfulText(address?.city)
	&& hasMeaningfulText(address?.postal_code)
);

export const deriveShipmentFlowState = (data = {}) => {
	const quoteReady = hasQuoteDetails(data?.shipment_details) && hasPackages(data?.packages);
	const pickupDate = data?.pickup_date || data?.services?.date || '';
	const contentDescription = data?.content_description || '';
	const servicesReady = quoteReady && hasMeaningfulText(contentDescription) && hasMeaningfulText(pickupDate);
	const addressesReady = servicesReady
		&& hasAddressDraft(data?.origin_address)
		&& hasAddressDraft(data?.destination_address);
	const summaryReady = addressesReady;

	let lastValidRoute = SHIPMENT_FLOW_ROUTES.quote;
	if (summaryReady) {
		lastValidRoute = SHIPMENT_FLOW_ROUTES.summary;
	} else if (servicesReady) {
		lastValidRoute = SHIPMENT_FLOW_ROUTES.addresses;
	} else if (quoteReady) {
		lastValidRoute = SHIPMENT_FLOW_ROUTES.services;
	}

	return {
		quote_ready: quoteReady,
		services_ready: servicesReady,
		addresses_ready: addressesReady,
		summary_ready: summaryReady,
		last_valid_route: lastValidRoute,
	};
};

export const resolveShipmentFlowState = (data = {}) => {
	const raw = data?.flow_state;
	const fallback = deriveShipmentFlowState(data);
	if (!raw || typeof raw !== 'object') return fallback;

	return {
		quote_ready: Boolean(raw.quote_ready ?? fallback.quote_ready),
		services_ready: Boolean(raw.services_ready ?? fallback.services_ready),
		addresses_ready: Boolean(raw.addresses_ready ?? fallback.addresses_ready),
		summary_ready: Boolean(raw.summary_ready ?? fallback.summary_ready),
		last_valid_route: hasMeaningfulText(raw.last_valid_route)
			? String(raw.last_valid_route)
			: fallback.last_valid_route,
	};
};

const getFlowStateRank = (flowState = {}) => {
	if (flowState?.summary_ready) return 4;
	if (flowState?.addresses_ready) return 3;
	if (flowState?.services_ready) return 2;
	if (flowState?.quote_ready) return 1;
	return 0;
};

export const pickMostAdvancedShipmentFlowState = (...states) => states
	.filter((state) => state && typeof state === 'object')
	.reduce((best, candidate) => {
		if (!best) return candidate;
		return getFlowStateRank(candidate) > getFlowStateRank(best) ? candidate : best;
	}, null) || deriveShipmentFlowState({});

export const getShipmentFlowStage = (routeLike) => {
	const path = String(routeLike?.path || routeLike?.fullPath || '');
	const query = routeLike?.query || {};
	const stepQuery = Array.isArray(query.step) ? query.step[0] : query.step;

	if (path === SHIPMENT_FLOW_ROUTES.quote || path === '/' || path === '/#preventivo') return 'quote';
	if (path.startsWith('/la-tua-spedizione')) {
		return stepQuery === 'ritiro' ? 'addresses' : 'services';
	}
	if (path.startsWith('/riepilogo')) return 'summary';
	if (path.startsWith('/checkout')) return 'checkout';
	return null;
};

export const isShipmentFlowResumeException = (routeLike) => {
	const path = String(routeLike?.path || routeLike?.fullPath || '');
	const query = routeLike?.query || {};

	if (path.startsWith('/la-tua-spedizione') && hasPositiveQueryId(query.edit)) return true;
	if (path.startsWith('/riepilogo') && hasPositiveQueryId(query.edit)) return true;
	if (path.startsWith('/checkout') && hasPositiveQueryId(query.order_id)) return true;
	return false;
};

export const canAccessShipmentFlowRoute = (routeLike, flowState) => {
	if (isShipmentFlowResumeException(routeLike)) return true;

	const stage = getShipmentFlowStage(routeLike);
	if (!stage || stage === 'quote') return true;
	if (stage === 'services') return Boolean(flowState?.quote_ready);
	if (stage === 'addresses') return Boolean(flowState?.services_ready);
	if (stage === 'summary') return Boolean(flowState?.addresses_ready);
	if (stage === 'checkout') return Boolean(flowState?.summary_ready);
	return true;
};

export const getShipmentFlowStepNumber = (flowState) => {
	if (flowState?.summary_ready) return 4;
	if (flowState?.services_ready) return 3;
	if (flowState?.quote_ready) return 2;
	return 1;
};

export const extractShipmentServicesArray = (data = {}) => normalizeServiceTypeList(data?.services?.service_type || '');

export const toStepAddressState = (address = null) => {
	if (!address || typeof address !== 'object') return null;

	return {
		full_name: address.name || '',
		additional_information: address.additional_information || '',
		address: address.address || '',
		address_number: address.address_number || '',
		intercom_code: address.intercom_code || '',
		country: address.country || 'Italia',
		city: address.city || '',
		postal_code: address.postal_code || '',
		province: address.province || '',
		telephone_number: address.telephone_number || '',
		email: address.email || '',
		type: address.type || '',
	};
};

export const buildPendingShipmentFromSession = (data = {}) => {
	const flowState = resolveShipmentFlowState(data);
	if (!flowState.summary_ready) return null;
	if (!hasPackages(data?.packages)) return null;
	if (!data?.origin_address || !data?.destination_address) return null;

	return {
		origin_address: data.origin_address,
		destination_address: data.destination_address,
		services: {
			...(data.services || {}),
			serviceData: {
				...(data.service_data || data?.services?.serviceData || {}),
				sms_email_notification: Boolean(
					data?.sms_email_notification
					?? data?.services?.sms_email_notification
					?? data?.service_data?.sms_email_notification
				),
			},
			sms_email_notification: Boolean(
				data?.sms_email_notification
				?? data?.services?.sms_email_notification
				?? data?.service_data?.sms_email_notification
			),
		},
		packages: Array.isArray(data.packages) ? [...data.packages] : [],
		content_description: data.content_description || '',
		delivery_mode: data.delivery_mode || 'home',
		pudo: data.selected_pudo || null,
		sms_email_notification: Boolean(
			data?.sms_email_notification
			?? data?.services?.sms_email_notification
			?? data?.service_data?.sms_email_notification
		),
	};
};

export const deriveShipmentFlowStateFromUserStore = (userStore = {}) => {
	const shipmentDetails = userStore?.shipmentDetails || {};
	const packages = Array.isArray(userStore?.packages) ? userStore.packages : [];
	const pendingShipment = userStore?.pendingShipment || {};
	const pendingPackages = Array.isArray(pendingShipment?.packages) ? pendingShipment.packages : [];
	const deliveryMode = userStore?.deliveryMode || pendingShipment?.delivery_mode || 'home';
	const selectedPudo = userStore?.selectedPudo || pendingShipment?.pudo || null;

	const quoteReady = hasQuoteDetails(shipmentDetails) && hasPackages(packages);
	const pickupDate = userStore?.pickupDate || shipmentDetails?.date || pendingShipment?.pickup_date || '';
	const contentDescription = userStore?.contentDescription || pendingShipment?.content_description || '';
	const servicesReady = quoteReady && hasMeaningfulText(contentDescription) && hasMeaningfulText(pickupDate);

	const originAddress = userStore?.originAddressData || pendingShipment?.origin_address || null;
	const destinationAddress = userStore?.destinationAddressData || pendingShipment?.destination_address || null;
	const hasDestinationReady = deliveryMode === 'pudo'
		? Boolean(selectedPudo) || hasAddressDraft(destinationAddress)
		: hasAddressDraft(destinationAddress);
	const addressesReady = servicesReady
		&& hasAddressDraft(originAddress)
		&& hasDestinationReady;
	const pendingServicesReady = hasMeaningfulText(pendingShipment?.content_description || '')
		&& hasMeaningfulText(pendingShipment?.pickup_date || pendingShipment?.services?.date || '');
	const pendingDestinationReady = deliveryMode === 'pudo'
		? Boolean(selectedPudo) || hasAddressDraft(pendingShipment?.destination_address || null)
		: hasAddressDraft(pendingShipment?.destination_address || null);
	const pendingSummaryReady = hasPackages(pendingPackages)
		&& pendingServicesReady
		&& hasAddressDraft(pendingShipment?.origin_address || null)
		&& pendingDestinationReady;
	const summaryReady = addressesReady || pendingSummaryReady;

	let lastValidRoute = SHIPMENT_FLOW_ROUTES.quote;
	if (summaryReady) {
		lastValidRoute = SHIPMENT_FLOW_ROUTES.summary;
	} else if (servicesReady) {
		lastValidRoute = SHIPMENT_FLOW_ROUTES.addresses;
	} else if (quoteReady) {
		lastValidRoute = SHIPMENT_FLOW_ROUTES.services;
	}

	return {
		quote_ready: quoteReady,
		services_ready: servicesReady,
		addresses_ready: addressesReady,
		summary_ready: summaryReady,
		last_valid_route: lastValidRoute,
	};
};

export const trimUserStoreToFlowState = (userStore, flowState) => {
	if (!userStore || !flowState) return;

	if (!flowState.summary_ready) {
		userStore.pendingShipment = null;
	}

	if (!flowState.addresses_ready) {
		userStore.originAddressData = null;
		userStore.destinationAddressData = null;
		userStore.selectedPudo = null;
	}

	if (!flowState.services_ready) {
		userStore.servicesArray = [];
		userStore.contentDescription = '';
		userStore.pickupDate = '';
		userStore.smsEmailNotification = false;
		userStore.serviceData = {};
	}

	if (!flowState.quote_ready) {
		userStore.packages = [];
		userStore.totalPrice = 0;
		userStore.isQuoteStarted = false;
	}

	userStore.stepNumber = getShipmentFlowStepNumber(flowState);
};
