/**
 * shipmentStore — store unificato del modulo Spedizione/Preventivo.
 *
 *  - shipmentFlowStore: 16 ref dati spedizione (step, packages, indirizzi, …)
 *  - preventivoStore: 5 ref orchestrazione preventivo + actions navigation
 *  - shipmentFlowAdminGateStore: 1 ref challenge accesso fuori flusso
 *
 * Dominio unico: tutto cio' che riguarda la creazione/calcolo/navigazione di
 * una spedizione passa da qui. Persistenza in sessionStorage debounced.
 */
import { defineStore } from 'pinia';
import type { Ref } from 'vue';
import type {
	Address, Package, PendingShipment, PudoPoint, ShipmentDetails, ShipmentFlowStoreState,
} from '~/types';
import {
	buildQuoteComparableSignature, buildQuotePayloadSnapshotFor,
	extractSessionComparablePayload, formatResolvedLocation,
} from '~/utils/quickQuoteHelpers';
import { buildShipmentFlowLocation } from '~/utils/shipment';

// Tipi per orchestrazione preventivo (ex preventivoStore)
type QuotePackage = Record<string, unknown>;
type QuoteShipmentDetails = Record<string, string | number | null | undefined>;
type QuoteSessionData = {
	shipment_details?: QuoteShipmentDetails;
	packages?: QuotePackage[];
	total_price?: number | string;
	step?: number | string;
	[key: string]: unknown;
};
type QuoteSyncOptions = { sourceSignature?: string };
type ShipmentFlowStoreLike = {
	shipmentDetails: QuoteShipmentDetails;
	packages: QuotePackage[];
	totalPrice: number;
	stepNumber: number;
	isQuoteStarted: boolean;
};
type ContinueToNextStepDeps = {
	shipmentFlowStore: ShipmentFlowStoreLike;
	flushLocationDraftsForSubmit: (formatter: (city?: string, cap?: string) => string) => Promise<unknown>;
	calculateRate: (options: { silent: boolean; payload: QuoteSessionData }) => Promise<boolean>;
	ensurePackagesIdentity: () => void;
	ensurePrimaryPackage: () => void;
	session: Ref<QuoteSessionData | { data?: QuoteSessionData } | null | undefined>;
	refresh: () => Promise<QuoteSessionData | { data?: QuoteSessionData } | null | undefined>;
};

// Tipi per admin gate (ex shipmentFlowAdminGateStore)
type AdminGatePayload = { targetPath?: string; lastValidRoute?: string; reason?: string };
type AdminGateChallenge = Required<AdminGatePayload> & { createdAt: number };

// Persistenza sessionStorage (ex shipmentFlowStore)
const STORAGE_KEY = 'spedizionefacile_user_store';
const DEBOUNCE_MS = 300;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const DEFAULT_SHIPMENT_DETAILS: ShipmentDetails = {
	origin_city: '', origin_postal_code: '', origin_province: '',
	origin_country_code: 'IT', origin_country: 'Italia',
	destination_city: '', destination_postal_code: '', destination_province: '',
	destination_country_code: 'IT', destination_country: 'Italia',
	date: '',
};

function loadFromSession(): Partial<ShipmentFlowStoreState> | null {
	if (!import.meta.client) return null;
	try {
		const saved = sessionStorage.getItem(STORAGE_KEY);
		if (!saved) return null;
		const parsed = JSON.parse(saved);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
		return parsed as Partial<ShipmentFlowStoreState>;
	} catch {
		return null;
	}
}

function saveToSession(state: ShipmentFlowStoreState) {
	if (!import.meta.client) return;
	try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
	catch { /* sessionStorage pieno o non disponibile: ignoriamo */ }
}

export const useShipmentStore = defineStore('shipment', () => {

	const stepNumber = ref(1);
	const hasPersistedHydration = ref(false);
	const shipmentDetails = ref<ShipmentDetails>({ ...DEFAULT_SHIPMENT_DETAILS });
	const isQuoteStarted = ref(false);
	const totalPrice = ref(0);
	const packages = ref<Package[]>([]);
	const servicesArray = ref<string[]>([]);
	const contentDescription = ref('');
	const pendingShipment = ref<PendingShipment | null>(null);
	const originAddressData = ref<Partial<Address> | null>(null);
	const destinationAddressData = ref<Partial<Address> | null>(null);
	const pickupDate = ref('');
	const editingCartItemId = ref<number | string | null>(null);
	const deliveryMode = ref<'home' | 'pudo'>('home');
	const selectedPudo = ref<PudoPoint | null>(null);
	const smsEmailNotification = ref(false);
	const serviceData = ref<Record<string, unknown>>({});

	// Registry persistenza: mappa `chiave -> ref` per evitare ripetere 16 assegnazioni in apply/snapshot/watch.
	const persistedFields = {
		stepNumber, shipmentDetails, isQuoteStarted, totalPrice, packages,
		servicesArray, contentDescription, pendingShipment, originAddressData,
		destinationAddressData, pickupDate, editingCartItemId, deliveryMode, selectedPudo,
		smsEmailNotification, serviceData,
	} as const;

	function applyPersistedState(s: Partial<ShipmentFlowStoreState> | null) {
		if (!s || typeof s !== 'object') return;
		stepNumber.value = typeof s.stepNumber === 'number' ? s.stepNumber : 1;
		shipmentDetails.value = { ...DEFAULT_SHIPMENT_DETAILS, ...(s.shipmentDetails || {}) };
		totalPrice.value = typeof s.totalPrice === 'number' ? s.totalPrice : 0;
		packages.value = Array.isArray(s.packages) ? s.packages : [];
		servicesArray.value = Array.isArray(s.servicesArray) ? s.servicesArray : [];
		isQuoteStarted.value = s.isQuoteStarted ?? false;
		contentDescription.value = s.contentDescription ?? '';
		pendingShipment.value = s.pendingShipment ?? null;
		originAddressData.value = s.originAddressData ?? null;
		destinationAddressData.value = s.destinationAddressData ?? null;
		pickupDate.value = s.pickupDate ?? '';
		editingCartItemId.value = s.editingCartItemId ?? null;
		deliveryMode.value = s.deliveryMode ?? 'home';
		selectedPudo.value = s.selectedPudo ?? null;
		smsEmailNotification.value = s.smsEmailNotification ?? false;
		serviceData.value = s.serviceData ?? {};
	}

	function hydrateFromSession() {
		if (hasPersistedHydration.value) return;
		applyPersistedState(loadFromSession());
		hasPersistedHydration.value = true;
	}

	function persist() {
		if (!hasPersistedHydration.value) return;
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			const snap: Record<string, unknown> = {};
			for (const [key, r] of Object.entries(persistedFields)) snap[key] = r.value;
			saveToSession(snap as unknown as ShipmentFlowStoreState);
		}, DEBOUNCE_MS);
	}

	watch(Object.values(persistedFields), persist, { deep: true });

	const messageError = ref<string | null>(null);
	const isCalculating = ref(false);
	const isSyncingQuote = ref(false);
	const isAdvancingToServices = ref(false);
	const lastQuotedSignature = ref('');
	const quoteTransitionLock = useState('shipment-flow-quote-transition-lock', () => false);

	let autoQuoteTimer: ReturnType<typeof setTimeout> | null = null;
	let pendingQuotePromise: Promise<boolean> | null = null;
	let pendingQuoteSignature = '';
	let pendingQuoteSilent = false;
	let pendingQuoteRequestId = 0;
	let latestQuoteRequestId = 0;

	const getAutoQuoteTimer = () => autoQuoteTimer;
	const setAutoQuoteTimer = (timer: ReturnType<typeof setTimeout> | null) => { autoQuoteTimer = timer; };
	const clearAutoQuoteTimer = () => {
		if (autoQuoteTimer) { clearTimeout(autoQuoteTimer); autoQuoteTimer = null; }
	};

	// Helper privato per assegnare/azzerare lo stato pendente in atomico.
	const writePending = (p: Promise<boolean> | null, sig: string, silent: boolean, id: number) => {
		pendingQuotePromise = p; pendingQuoteSignature = sig;
		pendingQuoteSilent = silent; pendingQuoteRequestId = id;
	};
	const getPendingQuotePromise = () => pendingQuotePromise;
	const getPendingQuoteSignature = () => pendingQuoteSignature;
	const setPending = writePending;
	const releasePendingIfMatches = (id: number) => { if (pendingQuoteRequestId === id) writePending(null, '', false, 0); };
	const isPendingSilent = () => pendingQuoteSilent;
	const nextRequestId = () => ++latestQuoteRequestId;
	const isLatestRequest = (id: number) => id === latestQuoteRequestId;

	// Aggiorna totale/step/flag isQuoteStarted dallo snapshot di sessione.
	const applySessionMeta = (s: ShipmentFlowStoreLike, d: QuoteSessionData, ensurePrimaryPackage: () => void) => {
		s.totalPrice = Number(d?.total_price || s?.totalPrice || 0);
		s.stepNumber = Number(d?.step || 2);
		s.isQuoteStarted = true;
		ensurePrimaryPackage();
	};

	const syncQuoteStateFromSession = (
		shipmentFlowStore: ShipmentFlowStoreLike,
		ensurePackagesIdentity: () => void,
		ensurePrimaryPackage: () => void,
		sessionData: QuoteSessionData = {},
		options: QuoteSyncOptions = {},
	) => {
		const sourceSignature = String(options?.sourceSignature || '');
		const sessionSignature = buildQuoteComparableSignature(extractSessionComparablePayload(sessionData));
		if (sourceSignature) {
			if (sourceSignature !== sessionSignature) return;
			ensurePackagesIdentity();
			applySessionMeta(shipmentFlowStore, sessionData, ensurePrimaryPackage);
			return;
		}
		for (const [key, value] of Object.entries(sessionData?.shipment_details || {})) {
			if (key in shipmentFlowStore.shipmentDetails) shipmentFlowStore.shipmentDetails[key] = value ?? '';
		}
		if (Array.isArray(sessionData?.packages)) {
			shipmentFlowStore?.packages.splice(0, shipmentFlowStore?.packages.length, ...sessionData.packages.map((p) => ({ ...p })));
			ensurePackagesIdentity();
		}
		applySessionMeta(shipmentFlowStore, sessionData, ensurePrimaryPackage);
	};

	const resetQuoteState = () => {
		if (isAdvancingToServices.value) return;
		messageError.value = null;
		clearAutoQuoteTimer();
	};

	const continueToNextStep = async (deps: ContinueToNextStepDeps) => {
		const {
			shipmentFlowStore, flushLocationDraftsForSubmit, calculateRate,
			ensurePackagesIdentity, ensurePrimaryPackage, session, refresh,
		} = deps;
		if (isCalculating.value || isAdvancingToServices.value) return;
		messageError.value = null;
		isAdvancingToServices.value = true;
		quoteTransitionLock.value = true;
		clearAutoQuoteTimer();
		const unlockTimer = setTimeout(() => { quoteTransitionLock.value = false; }, 8000);
		try {
			await flushLocationDraftsForSubmit(formatResolvedLocation);
			const payloadSnapshot = buildQuotePayloadSnapshotFor(shipmentFlowStore) as QuoteSessionData;
			const payloadSignature = buildQuoteComparableSignature(payloadSnapshot);
			const pending = pendingQuotePromise && pendingQuoteSignature === payloadSignature ? pendingQuotePromise : null;
			let isValid = pending ? await pending : false;
			if (!isValid) isValid = await calculateRate({ silent: false, payload: payloadSnapshot });
			if (!isValid) return;
			const refreshed = await refresh().catch(() => session.value);
			const refreshedData = (refreshed && 'data' in refreshed ? refreshed.data : refreshed) as QuoteSessionData | null;
			syncQuoteStateFromSession(
				shipmentFlowStore, ensurePackagesIdentity, ensurePrimaryPackage,
				refreshedData || payloadSnapshot, { sourceSignature: payloadSignature },
			);
			lastQuotedSignature.value = payloadSignature;
			await nextTick();
			await navigateTo(buildShipmentFlowLocation({}, 'servizi'), { replace: true });
			shipmentFlowStore.stepNumber = 2;
			shipmentFlowStore.isQuoteStarted = true;
		} finally {
			clearTimeout(unlockTimer);
			await nextTick();
			quoteTransitionLock.value = false;
			isAdvancingToServices.value = false;
		}
	};

	const adminGateChallenge = ref<AdminGateChallenge | null>(null);

	function openAdminGate(payload: AdminGatePayload = {}) {
		adminGateChallenge.value = {
			targetPath: payload.targetPath || '/',
			lastValidRoute: payload.lastValidRoute || '/preventivo',
			reason: payload.reason || 'accesso fuori flusso',
			createdAt: Date.now(),
		};
	}

	function closeAdminGate() { adminGateChallenge.value = null; }

	return {
		// Sezione 1: dati spedizione
		stepNumber, isQuoteStarted, shipmentDetails, packages, totalPrice,
		servicesArray, contentDescription, pendingShipment, originAddressData,
		destinationAddressData, pickupDate, editingCartItemId, deliveryMode, selectedPudo,
		smsEmailNotification, serviceData, hasPersistedHydration, hydrateFromSession,

		// Sezione 2: orchestrazione preventivo
		messageError, isCalculating, isSyncingQuote, isAdvancingToServices,
		lastQuotedSignature, quoteTransitionLock,
		getAutoQuoteTimer, setAutoQuoteTimer, clearAutoQuoteTimer,
		getPendingQuotePromise, getPendingQuoteSignature, setPending, releasePendingIfMatches,
		isPendingSilent, nextRequestId, isLatestRequest,
		syncQuoteStateFromSession, resetQuoteState, continueToNextStep,

		// Sezione 3: admin gate
		adminGateChallenge, openAdminGate, closeAdminGate,
	};
});
