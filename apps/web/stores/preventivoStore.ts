/**
 * @file preventivoStore — Pinia store preventivoStore.
 */
import { defineStore } from 'pinia';
import type { Ref } from 'vue';
import { buildQuotePayloadSnapshotFor } from '~/utils/preventivoHelpers';
import { buildQuoteComparableSignature, extractSessionComparablePayload, formatResolvedLocation } from '~/utils/quickQuoteContract';
import { buildShipmentFlowLocation } from '~/utils/shipment';

type QuotePackage = Record<string, unknown>;
type QuoteShipmentDetails = Record<string, string | number | null | undefined>;
type QuoteSessionData = {
	shipment_details?: QuoteShipmentDetails;
	packages?: QuotePackage[];
	total_price?: number | string;
	step?: number | string;
	[key: string]: unknown;
};
type QuoteSyncOptions = {
	sourceSignature?: string;
};
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

/**
 * preventivoStore — sorgente di verita' condivisa per il modulo Preventivo Rapido.
 *
 * Tiene lo stato che le tre sezioni (form, quote, results) si scambiano
 * in modo bidirezionale: flag di calcolo, signature dell'ultima quote
 * andata a buon fine, gestione del timer di auto-quote, lock di transizione
 * verso lo step "servizi". Espone anche le actions di alto livello che
 * orchestrano le sezioni (calcolo tariffa + navigazione step).
 */
export const usePreventivoStore = defineStore('preventivo', () => {
	const messageError = ref<string | null>(null);
	const isCalculating = ref(false);
	const isSyncingQuote = ref(false);
	const isAdvancingToServices = ref(false);
	const lastQuotedSignature = ref('');

	let autoQuoteTimer: ReturnType<typeof setTimeout> | null = null;
	let pendingQuotePromise: Promise<boolean> | null = null;
	let pendingQuoteSignature = '';
	let pendingQuoteSilent = false;
	let pendingQuoteRequestId = 0;
	let latestQuoteRequestId = 0;

	const getAutoQuoteTimer = () => autoQuoteTimer;
	const setAutoQuoteTimer = (timer: ReturnType<typeof setTimeout> | null) => {
		autoQuoteTimer = timer;
	};
	const clearAutoQuoteTimer = () => {
		if (autoQuoteTimer) {
			clearTimeout(autoQuoteTimer);
			autoQuoteTimer = null;
		}
	};

	const getPendingQuotePromise = () => pendingQuotePromise;
	const getPendingQuoteSignature = () => pendingQuoteSignature;
	const setPending = (
		promise: Promise<boolean> | null,
		signature: string,
		silent: boolean,
		requestId: number,
	) => {
		pendingQuotePromise = promise;
		pendingQuoteSignature = signature;
		pendingQuoteSilent = silent;
		pendingQuoteRequestId = requestId;
	};
	const releasePendingIfMatches = (requestId: number) => {
		if (pendingQuoteRequestId === requestId) {
			pendingQuotePromise = null;
			pendingQuoteSignature = '';
			pendingQuoteSilent = false;
			pendingQuoteRequestId = 0;
		}
	};
	const isPendingSilent = () => pendingQuoteSilent;
	const nextRequestId = () => ++latestQuoteRequestId;
	const isLatestRequest = (requestId: number) => requestId === latestQuoteRequestId;

	const quoteTransitionLock = useState('shipment-flow-quote-transition-lock', () => false);

	/**
	 * Sincronizza lo stato dello store con la sessione backend restituita
	 * dall'endpoint `/api/session/first-step` (o da una refresh successiva).
	 *
	 * `sourceSignature` consente di scartare risposte stale: se la signature
	 * della richiesta non corrisponde a quella ricalcolata sulla sessione il
	 * sync degli shipmentDetails/packages viene saltato.
	 */
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
			shipmentFlowStore.totalPrice = Number(sessionData?.total_price || shipmentFlowStore?.totalPrice || 0);
			shipmentFlowStore.stepNumber = Number(sessionData?.step || 2);
			shipmentFlowStore.isQuoteStarted = true;
			ensurePackagesIdentity();
			ensurePrimaryPackage();
			return;
		}
		const shipmentDetails = sessionData?.shipment_details || {};
		for (const [key, value] of Object.entries(shipmentDetails)) {
			if (key in shipmentFlowStore.shipmentDetails) {
				shipmentFlowStore.shipmentDetails[key] = value ?? '';
			}
		}
		const packages = Array.isArray(sessionData?.packages)
			? sessionData.packages.map((pack) => ({ ...pack }))
			: null;
		if (packages) {
			shipmentFlowStore?.packages.splice(0, shipmentFlowStore?.packages.length, ...packages);
			ensurePackagesIdentity();
		}
		shipmentFlowStore.totalPrice = Number(sessionData?.total_price || shipmentFlowStore?.totalPrice || 0);
		shipmentFlowStore.stepNumber = Number(sessionData?.step || 2);
		shipmentFlowStore.isQuoteStarted = true;
		ensurePrimaryPackage();
	};

	/**
	 * Reset minimale chiamato dai watcher quando l'utente modifica
	 * input/packages: pulisce gli errori e annulla il timer di auto-quote.
	 * Il flag `isAdvancingToServices` blocca il reset durante la transizione.
	 */
	const resetQuoteState = () => {
		if (isAdvancingToServices.value) return;
		messageError.value = null;
		clearAutoQuoteTimer();
	};

	/**
	 * Avanza al prossimo step del flow ("servizi").
	 *
	 * Forza la risoluzione delle location in input, poi triggera (o riusa)
	 * una calculateRate non-silent. Su successo aggiorna la sessione, sincronizza
	 * lo store e naviga a `/la-tua-spedizione/servizi`. Il lock di transizione
	 * dura al massimo 8s per evitare deadlock in caso di race condition.
	 */
	const continueToNextStep = async (deps: ContinueToNextStepDeps) => {
		const {
			shipmentFlowStore,
			flushLocationDraftsForSubmit,
			calculateRate,
			ensurePackagesIdentity,
			ensurePrimaryPackage,
			session,
			refresh,
		} = deps;
		if (isCalculating.value || isAdvancingToServices.value) return;
		messageError.value = null;
		isAdvancingToServices.value = true;
		quoteTransitionLock.value = true;
		clearAutoQuoteTimer();
		const unlockTimer = setTimeout(() => {
			quoteTransitionLock.value = false;
		}, 8000);
		try {
			await flushLocationDraftsForSubmit(formatResolvedLocation);
			const payloadSnapshot = buildQuotePayloadSnapshotFor(shipmentFlowStore) as QuoteSessionData;
			const payloadSignature = buildQuoteComparableSignature(payloadSnapshot);
			const pendingPromise = getPendingQuotePromise();
			const pendingSig = getPendingQuoteSignature();
			let isValid = false;
			if (pendingPromise && pendingSig === payloadSignature) {
				isValid = await pendingPromise;
				if (!isValid) {
					isValid = await calculateRate({ silent: false, payload: payloadSnapshot });
				}
			} else {
				isValid = await calculateRate({ silent: false, payload: payloadSnapshot });
			}
			if (!isValid) return;
			const refreshedSession = await refresh().catch(() => session.value);
			const refreshedData = (refreshedSession && 'data' in refreshedSession ? refreshedSession.data : refreshedSession) as QuoteSessionData | null;
			if (refreshedData) {
				syncQuoteStateFromSession(
					shipmentFlowStore,
					ensurePackagesIdentity,
					ensurePrimaryPackage,
					refreshedData,
					{ sourceSignature: payloadSignature },
				);
			} else {
				syncQuoteStateFromSession(
					shipmentFlowStore,
					ensurePackagesIdentity,
					ensurePrimaryPackage,
					payloadSnapshot,
					{ sourceSignature: payloadSignature },
				);
			}
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

	return {
		messageError,
		isCalculating,
		isSyncingQuote,
		isAdvancingToServices,
		lastQuotedSignature,
		quoteTransitionLock,
		getAutoQuoteTimer,
		setAutoQuoteTimer,
		clearAutoQuoteTimer,
		getPendingQuotePromise,
		getPendingQuoteSignature,
		setPending,
		releasePendingIfMatches,
		isPendingSilent,
		nextRequestId,
		isLatestRequest,
		syncQuoteStateFromSession,
		resetQuoteState,
		continueToNextStep,
	};
});
