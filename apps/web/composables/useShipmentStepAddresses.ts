/**
 * Shipment addresses step boundary.
 *
 * It owns the form state for sender/receiver addresses, saved-address lookup
 * and the small persistence actions used by authenticated users.
 */
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';

type AddressTarget = 'origin' | 'dest';

type StepAddress = {
	type?: string;
	full_name: string;
	additional_information: string;
	address: string;
	address_number: string;
	intercom_code: string;
	country: string;
	city: string;
	postal_code: string;
	province: string;
	telephone_number: string;
	email: string;
};

type AddressBookAddress = {
	name?: string;
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

type ShipmentSessionDetails = {
	origin_city?: string;
	origin_postal_code?: string;
	origin_country?: string;
	origin_province?: string;
	destination_city?: string;
	destination_postal_code?: string;
	destination_country?: string;
	destination_province?: string;
};

type SessionData = {
	shipment_details?: ShipmentSessionDetails;
	origin_address?: AddressBookAddress | null;
	destination_address?: AddressBookAddress | null;
};

type RouteLike = {
	path: string;
	fullPath: string;
	query: Record<string, string | string[] | null | undefined>;
};

type ShipmentFlowAddressStore = {
	originAddressData?: StepAddress | null;
	destinationAddressData?: StepAddress | null;
	shipmentDetails?: ShipmentSessionDetails | null;
};

type SanctumClient = <T = unknown>(url: string, options?: { method?: string; body?: unknown }) => Promise<T>;

type UseShipmentStepAddressesArgs = {
	shipmentFlowStore?: ShipmentFlowAddressStore | null;
	session: Ref<{ data?: SessionData } | null | undefined>;
	route: RouteLike;
	isAuthenticated: Ref<boolean>;
	sanctumClient: SanctumClient;
	deliveryMode: Ref<string>;
	submitError: Ref<string | null>;
};

type CreateStepAddressArgs = {
	storedAddress?: StepAddress | null;
	sessionAddress?: AddressBookAddress | null;
	sessionDetails?: ShipmentSessionDetails;
	type: string;
	cityKey: keyof ShipmentSessionDetails;
	postalCodeKey: keyof ShipmentSessionDetails;
	countryKey: keyof ShipmentSessionDetails;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const createBaseAddress = (): StepAddress => ({
	full_name: '',
	additional_information: '',
	address: '',
	address_number: '',
	intercom_code: '',
	country: 'Italia',
	city: '',
	postal_code: '',
	province: '',
	telephone_number: '',
	email: '',
});

const fromSessionAddress = (sessionAddress: AddressBookAddress | null | undefined, type: string): StepAddress => ({
	...createBaseAddress(),
	type,
	full_name: sessionAddress?.name || '',
	additional_information: sessionAddress?.additional_information || '',
	address: sessionAddress?.address || '',
	address_number: sessionAddress?.address_number || '',
	intercom_code: sessionAddress?.intercom_code || '',
	country: sessionAddress?.country || 'Italia',
	city: sessionAddress?.city || '',
	postal_code: sessionAddress?.postal_code || '',
	province: sessionAddress?.province || '',
	telephone_number: sessionAddress?.telephone_number || '',
	email: sessionAddress?.email || '',
});

const createStepAddress = ({
	storedAddress,
	sessionAddress,
	sessionDetails,
	type,
	cityKey,
	postalCodeKey,
	countryKey,
}: CreateStepAddressArgs): StepAddress => {
	if (storedAddress) return { ...storedAddress };
	if (sessionAddress) return fromSessionAddress(sessionAddress, type);

	return {
		...createBaseAddress(),
		type,
		city: String(sessionDetails?.[cityKey] || ''),
		postal_code: String(sessionDetails?.[postalCodeKey] || ''),
		country: String(sessionDetails?.[countryKey] || 'Italia'),
	};
};

const hasMinimumAddressData = (address: StepAddress) =>
	Boolean(address.full_name.trim() && address.address.trim() && address.city.trim() && address.postal_code.trim());

const normalizePostalCode = (address: Pick<StepAddress | AddressBookAddress, 'country' | 'postal_code'>) => {
	const country = String(address.country || 'Italia').trim().toLowerCase();
	const rawPostalCode = String(address.postal_code || '');
	if (country === 'italia') return rawPostalCode.replace(/\D/g, '');
	return rawPostalCode.toUpperCase().replace(/[^A-Z0-9-\s]/g, '').trim();
};

const normalizeAddressText = (value: unknown) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
const normalizeAddressCountry = (value: unknown) => {
	const normalized = normalizeAddressText(value);
	return normalized === 'italia' || normalized === 'it' ? 'it' : normalized;
};
const normalizeAddressEmail = (value: unknown) => String(value || '').trim().toLowerCase();
const normalizeAddressPhone = (value: unknown) => String(value || '').replace(/\s+/g, '');

const toAddressBookPayload = (address: StepAddress): Required<AddressBookAddress> & { number_type: string } => ({
	name: address.full_name.trim(),
	additional_information: address.additional_information || '',
	address: address.address.trim(),
	number_type: 'Numero Civico',
	address_number: address.address_number.trim(),
	intercom_code: address.intercom_code || '',
	country: address.country || 'Italia',
	city: address.city.trim(),
	postal_code: normalizePostalCode(address),
	province: address.province.trim(),
	telephone_number: address.telephone_number.trim(),
	email: address.email || '',
});

const getAddressBookSignature = (address: StepAddress | AddressBookAddress) => {
	const payload = 'full_name' in address ? toAddressBookPayload(address) : address;
	return JSON.stringify({
		name: normalizeAddressText(payload.name),
		additional_information: normalizeAddressText(payload.additional_information),
		address: normalizeAddressText(payload.address),
		address_number: normalizeAddressText(payload.address_number),
		intercom_code: normalizeAddressText(payload.intercom_code),
		country: normalizeAddressCountry(payload.country),
		city: normalizeAddressText(payload.city),
		postal_code: normalizePostalCode(payload),
		province: normalizeAddressText(payload.province),
		telephone_number: normalizeAddressPhone(payload.telephone_number),
		email: normalizeAddressEmail(payload.email),
	});
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
	if (!isRecord(error)) return fallback;
	const data = isRecord(error.data) ? error.data : null;
	const message = data?.message;
	return typeof message === 'string' && message ? message : fallback;
};

export const useShipmentStepAddresses = ({
	shipmentFlowStore,
	session,
	route,
	isAuthenticated,
	sanctumClient,
	deliveryMode,
	submitError,
}: UseShipmentStepAddressesArgs) => {
	const storedOrigin = shipmentFlowStore?.originAddressData;
	const storedDest = shipmentFlowStore?.destinationAddressData;
	const sessionDetails = session.value?.data?.shipment_details;
	const sessionOriginAddress = session.value?.data?.origin_address;
	const sessionDestinationAddress = session.value?.data?.destination_address;

	const originAddress = ref<StepAddress>(
		createStepAddress({
			storedAddress: storedOrigin,
			sessionAddress: sessionOriginAddress,
			sessionDetails,
			type: 'Partenza',
			cityKey: 'origin_city',
			postalCodeKey: 'origin_postal_code',
			countryKey: 'origin_country',
		}),
	);
	const destinationAddress = ref<StepAddress>(
		createStepAddress({
			storedAddress: storedDest,
			sessionAddress: sessionDestinationAddress,
			sessionDetails,
			type: 'Destinazione',
			cityKey: 'destination_city',
			postalCodeKey: 'destination_postal_code',
			countryKey: 'destination_country',
		}),
	);

	const shouldAutoShowAddressFields = route.query.step === 'ritiro' || Boolean(storedOrigin || sessionOriginAddress);
	const savedAddresses = ref<AddressBookAddress[]>([]);
	const loadingSavedAddresses = ref(false);
	const showOriginAddressSelector = ref(false);
	const showDestAddressSelector = ref(false);
	const showOriginGuestPrompt = ref(false);
	const showDestGuestPrompt = ref(false);
	const showOriginConfigGuestPrompt = ref(false);
	const showDestConfigGuestPrompt = ref(false);
	const originSelectorRef = ref<HTMLElement | null>(null);
	const destSelectorRef = ref<HTMLElement | null>(null);
	const defaultDropdownRef = ref<HTMLElement | null>(null);
	const destDefaultDropdownRef = ref<HTMLElement | null>(null);

	const originFromSaved = ref(false);
	const destFromSaved = ref(false);
	const savingOriginAddress = ref(false);
	const savingDestAddress = ref(false);
	const originSaveSuccess = ref(false);
	const destSaveSuccess = ref(false);
	const originSavedSnapshot = ref<string | null>(null);
	const destSavedSnapshot = ref<string | null>(null);

	const getRequestedPath = () => {
		const redirectQuery = Array.isArray(route.query.redirect) ? route.query.redirect[0] : route.query.redirect;
		if (route.path === '/autenticazione' || route.path === '/login' || route.path === '/registrazione') {
			return typeof redirectQuery === 'string' && redirectQuery.startsWith('/') ? redirectQuery : '/';
		}
		return route.fullPath;
	};

	const authRedirectPath = computed(() => {
		const requestedPath = getRequestedPath();
		return requestedPath === '/' ? '/autenticazione' : `/autenticazione?redirect=${encodeURIComponent(requestedPath)}`;
	});

	const authRegisterRedirectPath = computed(() => {
		const requestedPath = getRequestedPath();
		const query = new URLSearchParams({ mode: 'register' });
		if (requestedPath !== '/') query.set('redirect', requestedPath);
		return `/autenticazione?${query.toString()}`;
	});

	const clearAddressSelectorsAndPrompts = () => {
		showOriginAddressSelector.value = false;
		showDestAddressSelector.value = false;
		showOriginGuestPrompt.value = false;
		showDestGuestPrompt.value = false;
		showOriginConfigGuestPrompt.value = false;
		showDestConfigGuestPrompt.value = false;
	};

	const loadSavedAddresses = async () => {
		if (!isAuthenticated.value || savedAddresses.value.length > 0) return;
		loadingSavedAddresses.value = true;
		try {
			const result = await sanctumClient<{ data?: AddressBookAddress[] }>('/api/user-addresses');
			savedAddresses.value = result.data || [];
		} catch {
			// The address selector stays optional: failing to load it must not block checkout.
		} finally {
			loadingSavedAddresses.value = false;
		}
	};

	watch(
		isAuthenticated,
		(authenticated) => {
			if (!authenticated) {
				savedAddresses.value = [];
				return;
			}
			void loadSavedAddresses();
		},
		{ immediate: true },
	);

	const applySavedAddress = (address: AddressBookAddress, target: AddressTarget) => {
		const addressRef = target === 'origin' ? originAddress : destinationAddress;
		const isDestPudoContactOnly = target === 'dest' && deliveryMode.value === 'pudo';
		addressRef.value.full_name = address.name || '';
		addressRef.value.telephone_number = address.telephone_number || '';
		addressRef.value.email = address.email || '';
		addressRef.value.additional_information = address.additional_information || '';

		if (!isDestPudoContactOnly) {
			addressRef.value.address = address.address || '';
			addressRef.value.address_number = address.address_number || '';
			addressRef.value.city = address.city || '';
			addressRef.value.postal_code = address.postal_code || '';
			addressRef.value.province = address.province || '';
			addressRef.value.intercom_code = address.intercom_code || '';
		}

		if (target === 'origin') {
			showOriginAddressSelector.value = false;
			originFromSaved.value = true;
			originSaveSuccess.value = false;
			originSavedSnapshot.value = getAddressBookSignature(addressRef.value);
			return;
		}

		showDestAddressSelector.value = false;
		destFromSaved.value = true;
		destSaveSuccess.value = false;
		destSavedSnapshot.value = getAddressBookSignature(addressRef.value);
	};

	watch(
		originAddress,
		(newValue) => {
			if (!originSavedSnapshot.value || getAddressBookSignature(newValue) === originSavedSnapshot.value) return;
			originFromSaved.value = false;
			originSaveSuccess.value = false;
			originSavedSnapshot.value = null;
		},
		{ deep: true },
	);

	watch(
		destinationAddress,
		(newValue) => {
			if (!destSavedSnapshot.value || getAddressBookSignature(newValue) === destSavedSnapshot.value) return;
			destFromSaved.value = false;
			destSaveSuccess.value = false;
			destSavedSnapshot.value = null;
		},
		{ deep: true },
	);

	const isOriginDuplicateAddress = computed(() => {
		if (!isAuthenticated.value || !savedAddresses.value.length || !hasMinimumAddressData(originAddress.value)) return false;
		const originSignature = getAddressBookSignature(originAddress.value);
		return savedAddresses.value.some((savedAddress) => getAddressBookSignature(savedAddress) === originSignature);
	});

	const isDestDuplicateAddress = computed(() => {
		if (!isAuthenticated.value || !savedAddresses.value.length || !hasMinimumAddressData(destinationAddress.value)) return false;
		const destinationSignature = getAddressBookSignature(destinationAddress.value);
		return savedAddresses.value.some((savedAddress) => getAddressBookSignature(savedAddress) === destinationSignature);
	});

	const canSaveOriginAddress = computed(
		() =>
			isAuthenticated.value &&
			!originFromSaved.value &&
			!originSaveSuccess.value &&
			!isOriginDuplicateAddress.value &&
			hasMinimumAddressData(originAddress.value),
	);
	const canSaveDestAddress = computed(
		() =>
			isAuthenticated.value &&
			!destFromSaved.value &&
			!destSaveSuccess.value &&
			!isDestDuplicateAddress.value &&
			hasMinimumAddressData(destinationAddress.value),
	);

	const saveAddressToBook = async (target: AddressTarget) => {
		const address = target === 'origin' ? originAddress.value : destinationAddress.value;
		const savingRef: Ref<boolean> = target === 'origin' ? savingOriginAddress : savingDestAddress;
		const successRef: Ref<boolean> = target === 'origin' ? originSaveSuccess : destSaveSuccess;
		const duplicateRef: ComputedRef<boolean> = target === 'origin' ? isOriginDuplicateAddress : isDestDuplicateAddress;
		const snapshotRef: Ref<string | null> = target === 'origin' ? originSavedSnapshot : destSavedSnapshot;

		if (duplicateRef.value) {
			submitError.value = 'Questo indirizzo e gia presente tra gli indirizzi salvati.';
			return;
		}

		savingRef.value = true;
		try {
			await sanctumClient('/api/user-addresses', { method: 'POST', body: toAddressBookPayload(address) });
			successRef.value = true;
			savedAddresses.value = [];
			snapshotRef.value = getAddressBookSignature(address);
			await loadSavedAddresses();
		} catch (error) {
			submitError.value = getApiErrorMessage(error, "Errore nel salvataggio dell'indirizzo.");
		} finally {
			savingRef.value = false;
		}
	};

	const toggleAddressSelector = (target: AddressTarget) => {
		if (!isAuthenticated.value) {
			showOriginGuestPrompt.value = target === 'origin' ? !showOriginGuestPrompt.value : false;
			showDestGuestPrompt.value = target === 'dest' ? !showDestGuestPrompt.value : false;
			showOriginAddressSelector.value = false;
			showDestAddressSelector.value = false;
			return;
		}

		void loadSavedAddresses();
		showOriginGuestPrompt.value = false;
		showDestGuestPrompt.value = false;
		showOriginAddressSelector.value = target === 'origin' ? !showOriginAddressSelector.value : false;
		showDestAddressSelector.value = target === 'dest' ? !showDestAddressSelector.value : false;
	};

	watch(
		() => session.value?.data?.shipment_details,
		(details) => {
			if (!details) return;
			if (!originAddress.value.city) originAddress.value.city = details.origin_city || '';
			if (!originAddress.value.postal_code) originAddress.value.postal_code = details.origin_postal_code || '';
			if (!originAddress.value.province && details.origin_province) originAddress.value.province = details.origin_province;
			if (!destinationAddress.value.city) destinationAddress.value.city = details.destination_city || '';
			if (!destinationAddress.value.postal_code) destinationAddress.value.postal_code = details.destination_postal_code || '';
			if (!destinationAddress.value.province && details.destination_province) destinationAddress.value.province = details.destination_province;
		},
		{ immediate: true },
	);

	watch(
		() => session.value?.data?.origin_address,
		(address) => {
			if (!address || originAddress.value.full_name) return;
			originAddress.value = fromSessionAddress(address, 'Partenza');
		},
		{ immediate: true },
	);

	watch(
		() => session.value?.data?.destination_address,
		(address) => {
			if (!address || destinationAddress.value.full_name) return;
			destinationAddress.value = fromSessionAddress(address, 'Destinazione');
		},
		{ immediate: true },
	);

	watch(
		() => shipmentFlowStore?.shipmentDetails,
		(shipmentDetails) => {
			if (!shipmentDetails) return;
			if (shipmentDetails.origin_city && !originAddress.value.city) originAddress.value.city = shipmentDetails.origin_city;
			if (shipmentDetails.origin_postal_code && !originAddress.value.postal_code) {
				originAddress.value.postal_code = shipmentDetails.origin_postal_code;
			}
			if (shipmentDetails.origin_province && !originAddress.value.province) originAddress.value.province = shipmentDetails.origin_province;
			if (shipmentDetails.destination_city && !destinationAddress.value.city) {
				destinationAddress.value.city = shipmentDetails.destination_city;
			}
			if (shipmentDetails.destination_postal_code && !destinationAddress.value.postal_code) {
				destinationAddress.value.postal_code = shipmentDetails.destination_postal_code;
			}
			if (shipmentDetails.destination_province && !destinationAddress.value.province) {
				destinationAddress.value.province = shipmentDetails.destination_province;
			}
		},
		{ immediate: true, deep: true },
	);

	return {
		authRedirectPath,
		authRegisterRedirectPath,
		canSaveDestAddress,
		canSaveOriginAddress,
		clearAddressSelectorsAndPrompts,
		defaultDropdownRef,
		destDefaultDropdownRef,
		destFromSaved,
		destSaveSuccess,
		destSavedSnapshot,
		destSelectorRef,
		destinationAddress,
		loadSavedAddresses,
		loadingSavedAddresses,
		originAddress,
		originFromSaved,
		originSaveSuccess,
		originSavedSnapshot,
		originSelectorRef,
		applySavedAddress,
		saveAddressToBook,
		savedAddresses,
		savingDestAddress,
		savingOriginAddress,
		showDestAddressSelector,
		showDestConfigGuestPrompt,
		showDestGuestPrompt,
		showOriginAddressSelector,
		showOriginConfigGuestPrompt,
		showOriginGuestPrompt,
		shouldAutoShowAddressFields,
		toggleAddressSelector,
	};
};
