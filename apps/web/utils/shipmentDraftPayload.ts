/**
 * Pure helpers for the shipment draft payload.
 *
 * Shared by step persistence, order creation and payment bootstrap. No route,
 * rendering or UI side effects belong in this file.
 */

type RefLike<T> = { value: T };

export type StepAddressDraft = {
	type?: string;
	full_name?: string;
	additional_information?: string;
	address?: string;
	address_number?: string;
	intercom_code?: string;
	country?: string;
	city?: string;
	postal_code?: string;
	province?: string;
	telephone_number?: string;
	email?: string;
};

type PickupRequest = {
	enabled?: boolean;
	date?: string;
	time_slot?: string;
	notes?: string;
};

type ShipmentServiceData = {
	pickup_request?: PickupRequest;
	requires_manual_quote?: boolean;
	telefono_notifica?: string;
	contrassegno?: Record<string, unknown>;
	assicurazione?: Record<string, unknown>;
	sponda_idraulica?: Record<string, unknown>;
};

export type ShipmentDraftStore = {
	pickupDate?: string;
	serviceData?: ShipmentServiceData;
	servicesArray?: string[];
	deliveryMode?: string;
	selectedPudo?: unknown;
	contentDescription?: string;
	pendingShipment?: { client_submission_id?: string };
};

export type ServicesState = {
	date?: string;
	time?: string;
};

type BuildPickupArgs = {
	shipmentFlowStore?: ShipmentDraftStore | null;
	services?: RefLike<ServicesState> | null;
};

type BuildSecondStepArgs = BuildPickupArgs & {
	smsEmailNotification?: RefLike<boolean>;
	originAddress?: RefLike<StepAddressDraft>;
	destinationAddress?: RefLike<StepAddressDraft>;
	includeAddresses?: boolean;
	payload?: unknown;
};

export const DEFAULT_PICKUP_TIME_SLOT = '09:00-18:00';

export const normalizePostalCodeForStep = (addressData: StepAddressDraft = {}) => {
	const country = String(addressData.country || 'Italia').trim().toLowerCase();
	const rawPostalCode = String(addressData.postal_code || '');
	if (country === 'italia') return rawPostalCode.replace(/\D/g, '') || '00000';
	return rawPostalCode.toUpperCase().replace(/[^A-Z0-9-\s]/g, '').trim() || 'N/D';
};

export const toStepAddressPayload = (addressData: StepAddressDraft = {}) => ({
	type: addressData.type || 'Partenza',
	name: (addressData.full_name || 'N/D').trim(),
	additional_information: addressData.additional_information || '',
	address: (addressData.address || 'N/D').trim(),
	number_type: 'Numero Civico',
	address_number: (addressData.address_number || 'SNC').trim(),
	intercom_code: addressData.intercom_code || '',
	country: addressData.country || 'Italia',
	city: (addressData.city || 'N/D').trim(),
	postal_code: normalizePostalCodeForStep(addressData),
	province: (addressData.province || 'N/D').trim(),
	telephone_number: String(addressData.telephone_number || '0000000000').trim(),
	email: addressData.email || '',
});

export const normalizePickupRequestDate = (value: unknown = '') => {
	const rawValue = String(value || '').trim();
	if (!rawValue) return '';
	if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) return rawValue;

	const localMatch = rawValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
	if (localMatch) {
		const day = localMatch[1] || '';
		const month = localMatch[2] || '';
		const year = localMatch[3] || '';
		return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
	}

	const parsed = new Date(rawValue);
	return Number.isNaN(parsed.getTime()) ? rawValue : parsed.toISOString().slice(0, 10);
};

export const buildPickupRequestPayload = ({ shipmentFlowStore, services }: BuildPickupArgs = {}) => {
	const rawPickupDate = String(
		services?.value?.date ||
			shipmentFlowStore?.pickupDate ||
			shipmentFlowStore?.serviceData?.pickup_request?.date ||
			'',
	).trim();
	const normalizedPickupDate = normalizePickupRequestDate(rawPickupDate);
	const pickupTimeSlot =
		String(
			services?.value?.time ||
				shipmentFlowStore?.serviceData?.pickup_request?.time_slot ||
				DEFAULT_PICKUP_TIME_SLOT,
		).trim() || DEFAULT_PICKUP_TIME_SLOT;

	return {
		enabled: Boolean(normalizedPickupDate),
		date: normalizedPickupDate,
		time_slot: pickupTimeSlot,
		notes: String(shipmentFlowStore?.serviceData?.pickup_request?.notes || '').trim(),
	};
};

export const buildSecondStepPayload = ({
	shipmentFlowStore,
	services,
	smsEmailNotification,
	originAddress,
	destinationAddress,
	includeAddresses = false,
	payload = null,
}: BuildSecondStepArgs = {}) => {
	if (payload) return payload;

	const selectedServiceKeys = new Set(
		String(shipmentFlowStore?.servicesArray || [])
			.split(',')
			.map((item) => String(item || '').trim().toLowerCase())
			.filter(Boolean),
	);
	const rawServiceData = shipmentFlowStore?.serviceData || {};
	const pickupRequest = buildPickupRequestPayload({ shipmentFlowStore, services });
	const smsEnabled = Boolean(smsEmailNotification?.value);
	const deliveryMode = shipmentFlowStore?.deliveryMode;
	const normalizedServiceData = {
		pickup_request: pickupRequest,
		sms_email_notification: smsEnabled,
		delivery_mode: deliveryMode,
		...(deliveryMode === 'pudo' && shipmentFlowStore?.selectedPudo ? { pudo: shipmentFlowStore.selectedPudo } : {}),
		...(rawServiceData.requires_manual_quote ? { requires_manual_quote: true } : {}),
		...(rawServiceData.telefono_notifica ? { telefono_notifica: String(rawServiceData.telefono_notifica).trim() } : {}),
		...(selectedServiceKeys.has('contrassegno') && rawServiceData.contrassegno
			? { contrassegno: { ...rawServiceData.contrassegno } }
			: {}),
		...(selectedServiceKeys.has('assicurazione') && rawServiceData.assicurazione
			? { assicurazione: { ...rawServiceData.assicurazione } }
			: {}),
		...(selectedServiceKeys.has('sponda idraulica') || selectedServiceKeys.has('sponda_idraulica')
			? { sponda_idraulica: { ...(rawServiceData.sponda_idraulica || {}) } }
			: {}),
	};

	return {
		services: {
			service_type: shipmentFlowStore?.servicesArray?.join(', ') || '',
			date: services?.value?.date || '',
			time: pickupRequest.time_slot,
			serviceData: normalizedServiceData,
			sms_email_notification: smsEnabled,
		},
		content_description: shipmentFlowStore?.contentDescription || '',
		pickup_date: services?.value?.date || '',
		sms_email_notification: smsEnabled,
		origin_address: includeAddresses && originAddress ? toStepAddressPayload(originAddress.value) : null,
		destination_address: includeAddresses && destinationAddress ? toStepAddressPayload(destinationAddress.value) : null,
		delivery_mode: deliveryMode,
		selected_pudo: deliveryMode === 'pudo' ? shipmentFlowStore?.selectedPudo : null,
		client_submission_id: shipmentFlowStore?.pendingShipment?.client_submission_id || undefined,
	};
};

export const normalizeShipmentPayloadForComparison = (payload: unknown = {}) => {
	if (!payload || typeof payload !== 'object') return '';
	const clone = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
	delete clone.client_submission_id;
	return JSON.stringify(clone);
};
