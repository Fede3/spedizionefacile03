/**
 * Quick quote pricing boundary.
 *
 * Owns CSRF/session requests, request de-duplication and sync from the backend
 * first-step response back into the shipment flow store.
 */
import type { Ref } from 'vue';
import type { Package } from '~/types';

type QuoteErrors = Record<string, string[]> | null;
type QuoteRequestOptions = {
	method?: string;
	headers?: Record<string, string>;
	body?: unknown;
	credentials?: RequestCredentials;
};
type QuotePackage = Package;
type QuotePayload = {
	shipment_details: Record<string, unknown>;
	packages: QuotePackage[];
};
type QuoteSessionData = {
	total_price?: number | string;
	step?: number | string;
	shipment_details?: Record<string, string | number | null | undefined>;
	packages?: QuotePackage[];
};
type QuoteSessionResponse = QuoteSessionData | { data?: QuoteSessionData | null };
type ShipmentFlowStore = {
	totalPrice: number;
	stepNumber: number;
	isQuoteStarted: boolean;
	shipmentDetails: Record<string, string | number | null | undefined>;
	packages: QuotePackage[];
};
type AutoQuoteTimer = ReturnType<typeof setTimeout> | null;
type AutoQuoteTimerRef = {
	(value?: AutoQuoteTimer): AutoQuoteTimer;
};
type UseQuotePricingDeps = {
	shipmentFlowStore: ShipmentFlowStore;
	apiBase: string;
	formRef: Ref<HTMLFormElement | null>;
	sv?: unknown;
	scrollToFirstError: () => void;
	ensurePrimaryPackage: () => void;
	ensurePackagesIdentity: () => void;
	calcPriceWithWeight: (pack: QuotePackage) => void;
	calcPriceWithVolume: (pack: QuotePackage) => void;
	checkPrices: (pack: QuotePackage) => void;
	isOriginItaly: Ref<boolean>;
	isDestinationItaly: Ref<boolean>;
	isEuropeMonocollo: Ref<boolean>;
	buildQuotePayloadSnapshot: () => QuotePayload;
	autoQuoteTimerRef: AutoQuoteTimerRef;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const unwrapSessionResponse = (response: QuoteSessionResponse): QuoteSessionData => {
	const record = isRecord(response) ? (response as Record<string, unknown>) : null;
	if (record && isRecord(record.data)) return record.data as QuoteSessionData;
	return response as QuoteSessionData;
};

const extractQuoteErrors = (error: unknown): QuoteErrors => {
	if (!isRecord(error) || !isRecord(error.data)) return null;
	const errors = error.data.errors;
	return isRecord(errors) ? (errors as Record<string, string[]>) : null;
};

export const useQuotePricingInternal = ({
	shipmentFlowStore,
	apiBase,
	formRef,
	scrollToFirstError,
	ensurePrimaryPackage,
	ensurePackagesIdentity,
	calcPriceWithWeight,
	calcPriceWithVolume,
	checkPrices,
	isOriginItaly,
	isDestinationItaly,
	isEuropeMonocollo,
	buildQuotePayloadSnapshot,
	autoQuoteTimerRef,
}: UseQuotePricingDeps) => {
	const messageError = ref<QuoteErrors>(null);
	const isCalculating = ref(false);
	const isSyncingQuote = ref(false);
	const isAdvancingToServices = ref(false);
	const lastQuotedSignature = ref('');

	let pendingQuotePromise: Promise<boolean> | null = null;
	let pendingQuoteSignature = '';
	let pendingQuoteSilent = false;
	let pendingQuoteRequestId = 0;
	let latestQuoteRequestId = 0;

	const publicApiFetch = async <T = unknown>(path: string, options: QuoteRequestOptions = {}) => {
		const url = path.startsWith('http') ? path : `${apiBase}${path}`;
		const fetcher = $fetch as unknown as <Result = unknown>(
			request: string,
			requestOptions?: QuoteRequestOptions,
		) => Promise<Result>;
		return await fetcher<T>(url, { credentials: 'include', ...options });
	};

	const readXsrfToken = () => {
		if (import.meta.server) return '';
		const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);
		return match?.[1] ? decodeURIComponent(match[1]) : '';
	};

	const requestClient = async <T = unknown>(path: string, options: QuoteRequestOptions = {}) => {
		const method = String(options.method || 'GET').trim().toUpperCase();
		const token = readXsrfToken();
		const headers: Record<string, string> = { Accept: 'application/json', ...(options.headers || {}) };
		if (token && !['GET', 'HEAD', 'OPTIONS'].includes(method)) headers['X-XSRF-TOKEN'] = token;
		return await publicApiFetch<T>(path, { ...options, method, headers });
	};

	const syncQuoteStateFromSession = (sessionData: QuoteSessionData = {}, options: { sourceSignature?: string } = {}) => {
		const sourceSignature = String(options.sourceSignature || '');
		const sessionSignature = buildQuoteComparableSignature(extractSessionComparablePayload(sessionData));

		if (sourceSignature) {
			if (sourceSignature !== sessionSignature) return;
			shipmentFlowStore.totalPrice = Number(sessionData.total_price || shipmentFlowStore.totalPrice || 0);
			shipmentFlowStore.stepNumber = Number(sessionData.step || 2);
			shipmentFlowStore.isQuoteStarted = true;
			ensurePackagesIdentity();
			ensurePrimaryPackage();
			return;
		}

		for (const [key, value] of Object.entries(sessionData.shipment_details || {})) {
			if (key in shipmentFlowStore.shipmentDetails) shipmentFlowStore.shipmentDetails[key] = value ?? '';
		}

		const packages = Array.isArray(sessionData.packages) ? sessionData.packages.map((pack) => ({ ...pack })) : null;
		if (packages) {
			shipmentFlowStore.packages.splice(0, shipmentFlowStore.packages.length, ...packages);
			ensurePackagesIdentity();
		}

		shipmentFlowStore.totalPrice = Number(sessionData.total_price || shipmentFlowStore.totalPrice || 0);
		shipmentFlowStore.stepNumber = Number(sessionData.step || 2);
		shipmentFlowStore.isQuoteStarted = true;
		ensurePrimaryPackage();
	};

	const calculateRate = async ({ silent = false, payload = null }: { silent?: boolean; payload?: QuotePayload | null } = {}) => {
		if (silent && isAdvancingToServices.value) return false;
		if (!silent) messageError.value = null;

		const quotePayload = payload || buildQuotePayloadSnapshot();
		const currentSignature = buildQuoteComparableSignature(quotePayload);
		if (pendingQuotePromise && pendingQuoteSignature === currentSignature && pendingQuoteSilent === silent) {
			return pendingQuotePromise;
		}

		const requestId = ++latestQuoteRequestId;
		if (!formRef.value || !formRef.value.checkValidity()) {
			if (!silent) formRef.value?.reportValidity();
			return false;
		}

		const missingOrigin =
			!String(shipmentFlowStore.shipmentDetails.origin_city || '').trim() ||
			(isOriginItaly.value && !String(shipmentFlowStore.shipmentDetails.origin_postal_code || '').trim());
		const missingDestination =
			!String(shipmentFlowStore.shipmentDetails.destination_city || '').trim() ||
			(isDestinationItaly.value && !String(shipmentFlowStore.shipmentDetails.destination_postal_code || '').trim());

		if (missingOrigin || missingDestination) {
			if (!silent) {
				messageError.value = {
					...(missingOrigin
						? { origin_query: [isOriginItaly.value ? 'Seleziona una localita valida per la partenza.' : 'Inserisci almeno la citta di partenza per il paese selezionato.'] }
						: {}),
					...(missingDestination
						? { dest_query: [isDestinationItaly.value ? 'Seleziona una localita valida per la destinazione.' : 'Inserisci almeno la citta di destinazione per il paese selezionato.'] }
						: {}),
				};
				scrollToFirstError();
			}
			return false;
		}

		if (isEuropeMonocollo.value) {
			const firstPackage = shipmentFlowStore.packages[0];
			if (shipmentFlowStore.packages.length !== 1) {
				if (!silent) {
					messageError.value = { packages: ["Per l'Europa e disponibile un solo collo per spedizione."] };
					scrollToFirstError();
				}
				return false;
			}
			if (!firstPackage || (Number(firstPackage.quantity) || 1) !== 1) {
				if (!silent) {
					messageError.value = { packages: ["Per l'Europa la quantita deve essere 1."] };
					scrollToFirstError();
				}
				return false;
			}
		}

		if (!shipmentFlowStore.packages.length) {
			if (!silent) {
				messageError.value = { packages: ['Seleziona almeno un tipo di collo.'] };
				scrollToFirstError();
			}
			return false;
		}

		for (const pack of shipmentFlowStore.packages) {
			if (!pack.weight || !pack.first_size || !pack.second_size || !pack.third_size) {
				if (!silent) {
					messageError.value = { packages: ['Compila peso e dimensioni per tutti i colli.'] };
					scrollToFirstError();
				}
				return false;
			}

			if (pack.weight_price == null) calcPriceWithWeight(pack);
			if (pack.volume_price == null && pack.first_size && pack.second_size && pack.third_size) calcPriceWithVolume(pack);
			if (pack.single_price == null) checkPrices(pack);
			if (pack.single_price == null) {
				if (!silent) messageError.value = { packages: ['Errore nel calcolo del prezzo. Reinserisci peso e dimensioni.'] };
				return false;
			}
		}

		const runRequest = async () => {
			if (silent) isSyncingQuote.value = true;
			else isCalculating.value = true;
			try {
				await requestClient('/sanctum/csrf-cookie');
				const response = await requestClient<QuoteSessionResponse>('/api/session/first-step', {
					method: 'POST',
					body: quotePayload,
				});
				if (requestId !== latestQuoteRequestId) return false;
				syncQuoteStateFromSession(unwrapSessionResponse(response), { sourceSignature: currentSignature });
				lastQuotedSignature.value = currentSignature;
				if (!silent) messageError.value = null;
				return true;
			} catch (error) {
				if (!silent) {
					messageError.value = extractQuoteErrors(error) || { packages: ['Errore durante il calcolo. Riprova.'] };
					scrollToFirstError();
				}
				return false;
			} finally {
				if (silent) isSyncingQuote.value = false;
				else isCalculating.value = false;
				if (pendingQuoteRequestId === requestId) {
					pendingQuoteSignature = '';
					pendingQuoteSilent = false;
					pendingQuoteRequestId = 0;
					pendingQuotePromise = null;
				}
			}
		};

		pendingQuoteSignature = currentSignature;
		pendingQuoteSilent = silent;
		pendingQuoteRequestId = requestId;
		pendingQuotePromise = runRequest();
		return pendingQuotePromise;
	};

	const resetQuoteState = () => {
		if (isAdvancingToServices.value) return;
		messageError.value = null;
		const timer = autoQuoteTimerRef();
		if (timer) {
			clearTimeout(timer);
			autoQuoteTimerRef(null);
		}
	};

	return {
		messageError,
		isCalculating,
		isSyncingQuote,
		isAdvancingToServices,
		lastQuotedSignature,
		publicApiFetch,
		requestClient,
		syncQuoteStateFromSession,
		calculateRate,
		resetQuoteState,
		getPendingQuotePromise: () => pendingQuotePromise,
		getPendingQuoteSignature: () => pendingQuoteSignature,
	};
};
