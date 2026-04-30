// === utils/shipment.js — Helper funnel spedizione ===
// Consolidamento di:
//   - utils/shipmentFlowState.ts     (state machine, stage, routes, derive)
//   - utils/clientSubmissionId.ts    (idempotency key per checkout/preventivo)
// Tutti gli export originali sono preservati identici.
// Nota: la logica di pricing servizi rimane in utils/shipmentServicePricing.js
// (file complesso di 718 LOC, non coinvolto in questo consolidamento).
// ─────────────────────────────────────────────────────────────────
// SEZIONE 1 — ex utils/shipmentFlowState.ts
// ─────────────────────────────────────────────────────────────────
// Alias legacy `summary` deve puntare al payment route: il vecchio step Conferma è stato unificato nel Pagamento, e i deep-link esistenti devono continuare a funzionare.
export type ShipmentFlowStage = 'quote' | 'packages' | 'services' | 'addresses' | 'summary' | 'payment'
type ShipmentFlowRouteKey = ShipmentFlowStage
type RouteQueryValue = string | string[] | number | null | undefined
export type RouteLike = {
    path?: string
    fullPath?: string
    query?: Record<string, RouteQueryValue>
    hash?: string
}
export type AddressDraft = {
    name?: string
    full_name?: string
    address?: string
    address_number?: string
    intercom_code?: string
    city?: string
    postal_code?: string
    province?: string
    country?: string
    additional_information?: string
    telephone_number?: string
    email?: string
    type?: string
}
export type PackageDraft = {
    package_type?: string
    quantity?: number | string
    weight?: number | string
    first_size?: number | string
    second_size?: number | string
    third_size?: number | string
}
export type ShipmentFlowState = {
    quote_ready: boolean
    services_ready: boolean
    addresses_ready: boolean
    summary_ready: boolean
    last_valid_route: string
}
type ServiceDraft = {
    service_type?: string
    date?: string
    serviceData?: Record<string, unknown>
    sms_email_notification?: boolean
}
export type ShipmentFlowDeriveInput = {
    packages?: PackageDraft[]
    pickup_date?: string
    content_description?: string
    origin_address?: AddressDraft | null
    destination_address?: AddressDraft | null
    services?: ServiceDraft
    service_data?: Record<string, unknown>
    sms_email_notification?: boolean
    delivery_mode?: string
    selected_pudo?: unknown
    flow_state?: Partial<ShipmentFlowState>
    client_submission_id?: string
}
type PendingShipmentDraft = ShipmentFlowDeriveInput & {
    pudo?: unknown
}
export type UserStoreLikeInput = {
    shipmentDetails?: { origin_city?: string; destination_city?: string; date?: string }
    packages?: PackageDraft[]
    pendingShipment?: PendingShipmentDraft | null
    deliveryMode?: string
    selectedPudo?: unknown
    pickupDate?: string
    contentDescription?: string
    originAddressData?: AddressDraft | null
    destinationAddressData?: AddressDraft | null
}
export type StepAddressState = Required<Pick<AddressDraft, 'address' | 'address_number' | 'intercom_code' | 'country' | 'city' | 'postal_code' | 'province' | 'telephone_number' | 'email' | 'type'>> & {
    full_name: string
    additional_information: string
}
export type BuiltPendingShipment = {
    origin_address: AddressDraft
    destination_address: AddressDraft
    services: ServiceDraft & { serviceData: Record<string, unknown>; sms_email_notification: boolean }
    packages: PackageDraft[]
    content_description: string
    delivery_mode: string
    pudo: unknown
    sms_email_notification: boolean
    client_submission_id?: string
}
export type TrimmableUserStore = {
    pendingShipment?: unknown
    originAddressData?: unknown
    destinationAddressData?: unknown
    selectedPudo?: unknown
    servicesArray?: unknown[]
    contentDescription?: string
    pickupDate?: string
    smsEmailNotification?: boolean
    serviceData?: Record<string, unknown>
    packages?: unknown[]
    totalPrice?: number
    isQuoteStarted?: boolean
    stepNumber?: number
}
type SubmissionSource = { client_submission_id?: unknown }
type NestedSubmissionSource = SubmissionSource & {
    data?: NestedSubmissionSource | null
    pendingShipment?: NestedSubmissionSource | null
}
const EMPTY_FLOW_STATE = (): ShipmentFlowState => ({
    quote_ready: false,
    services_ready: false,
    addresses_ready: false,
    summary_ready: false,
    last_valid_route: SHIPMENT_FLOW_ROUTES.packages,
})
export const SHIPMENT_FLOW_ROUTES: Record<ShipmentFlowRouteKey, string> = Object.freeze({
    quote: '/preventivo',
    packages: '/la-tua-spedizione/2?step=colli',
    services: '/la-tua-spedizione/2?step=servizi',
    addresses: '/la-tua-spedizione/2?step=indirizzi',
    summary: '/la-tua-spedizione/2?step=pagamento',
    payment: '/la-tua-spedizione/2?step=pagamento',
});
// Helper interno: signature diversa dalla versione esportata in utils/auth.js
// (qui forza string | undefined, mentre in auth è generico). Resta privato.
const getRouteQueryValue = (value: unknown): string | undefined => {
    if (Array.isArray(value))
        return value[0] === undefined || value[0] === null ? undefined : String(value[0]);
    return value === undefined || value === null ? undefined : String(value);
};
const normalizeShipmentStep = (value: unknown, fallback = 'colli'): string => {
    const normalized = String(getRouteQueryValue(value) || '').trim();
    return normalized || fallback;
};
/**
 * Costruisce una location Nuxt per una route dentro il funnel spedizione.
 */
export const buildShipmentFlowLocation = (routeLike: RouteLike = {}, step = 'colli') => ({
    path: '/la-tua-spedizione/2',
    query: {
        ...(routeLike?.query || {}),
        step: normalizeShipmentStep(step),
    },
    hash: routeLike?.hash,
});
/**
 * Costruisce la location per modificare un item del carrello dentro il flusso.
 */
export const buildShipmentFlowEditLocation = (editId: unknown, step = 'pagamento') => ({
    path: '/la-tua-spedizione/2',
    query: {
        step: normalizeShipmentStep(step, 'pagamento'),
        edit: String(editId),
    },
});
const hasMeaningfulText = (value: unknown): boolean => String(value || '').trim().length > 0;
const hasPositiveQueryId = (value: unknown): boolean => {
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw === undefined || raw === null || raw === '')
        return false;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed > 0 : hasMeaningfulText(raw);
};
const normalizeServiceTypeList = (serviceType: unknown): string[] => String(serviceType || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
const hasPackages = (packages: unknown): packages is PackageDraft[] => Array.isArray(packages) && packages.length > 0;
const toPositiveNumber = (value: unknown): number => {
    const normalized = String(value ?? '')
        .replace(',', '.')
        .replace(/[^0-9.]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
};
const hasCompletePackageDetails = (pack: PackageDraft = {}) => (hasMeaningfulText(pack?.package_type)
    && toPositiveNumber(pack?.quantity) >= 1
    && toPositiveNumber(pack?.weight) > 0
    && toPositiveNumber(pack?.first_size) > 0
    && toPositiveNumber(pack?.second_size) > 0
    && toPositiveNumber(pack?.third_size) > 0);
const hasPackagesReady = (packages: unknown): boolean => hasPackages(packages) && packages.every((pack) => hasCompletePackageDetails(pack));
const hasAddressDraft = (address: AddressDraft | null | undefined = {}) => {
    const a = address || {};
    return (hasMeaningfulText(a.name || a.full_name)
        && hasMeaningfulText(a.address)
        && hasMeaningfulText(a.city)
        && hasMeaningfulText(a.postal_code));
};
/**
 * Deriva lo stato del flusso da un payload sessione/server.
 */
export const deriveShipmentFlowState = (data: ShipmentFlowDeriveInput = {}): ShipmentFlowState => {
    const quoteReady = hasPackagesReady(data?.packages);
    const pickupDate = data?.pickup_date || data?.services?.date || '';
    const contentDescription = data?.content_description || '';
    const servicesReady = quoteReady && hasMeaningfulText(contentDescription) && hasMeaningfulText(pickupDate);
    const addressesReady = servicesReady
        && hasAddressDraft(data?.origin_address)
        && hasAddressDraft(data?.destination_address);
    const summaryReady = addressesReady;
    let lastValidRoute: string = SHIPMENT_FLOW_ROUTES.packages;
    if (summaryReady) {
        lastValidRoute = SHIPMENT_FLOW_ROUTES.summary;
    }
    else if (servicesReady) {
        lastValidRoute = SHIPMENT_FLOW_ROUTES.addresses;
    }
    else if (quoteReady) {
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
/**
 * Se il payload contiene già flow_state persistito, lo normalizza usando derive come fallback.
 */
export const resolveShipmentFlowState = (data: ShipmentFlowDeriveInput = {}): ShipmentFlowState => {
    const raw = data?.flow_state;
    const fallback = deriveShipmentFlowState(data);
    if (!raw || typeof raw !== 'object')
        return fallback;
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
const getFlowStateRank = (flowState: Partial<ShipmentFlowState> = {}) => {
    if (flowState?.summary_ready)
        return 4;
    if (flowState?.addresses_ready)
        return 3;
    if (flowState?.services_ready)
        return 2;
    if (flowState?.quote_ready)
        return 1;
    return 0;
};
/**
 * Fra più snapshot di flow-state sceglie quello più avanzato.
 */
export const pickMostAdvancedShipmentFlowState = (...states: Array<Partial<ShipmentFlowState> | null | undefined>): ShipmentFlowState => {
    const best = states
        .filter((state): state is Partial<ShipmentFlowState> => !!state && typeof state === 'object')
        .reduce<Partial<ShipmentFlowState> | null>((currentBest, candidate) => {
        if (!currentBest)
            return candidate;
        return getFlowStateRank(candidate) > getFlowStateRank(currentBest) ? candidate : currentBest;
    }, null);
    return {
        ...EMPTY_FLOW_STATE(),
        ...(best || {}),
    };
};
/**
 * Determina lo stage corrispondente a una route (quote/packages/services/ecc.).
 */
export const getShipmentFlowStage = (routeLike: RouteLike): ShipmentFlowStage | null => {
    const path = String(routeLike?.path || routeLike?.fullPath || '');
    const query = routeLike?.query || {};
    const stepQuery = normalizeShipmentStep(query.step, '');
    if (path === SHIPMENT_FLOW_ROUTES.quote || path === '/' || path === '/#preventivo')
        return 'quote';
    if (path.startsWith('/la-tua-spedizione')) {
        if (stepQuery === 'colli')
            return 'packages';
        // Alias storico: step=conferma e' stato unificato nel payment step.
        if (stepQuery === 'pagamento' || stepQuery === 'conferma')
            return 'payment';
        if (stepQuery === 'indirizzi' || stepQuery === 'ritiro' || stepQuery === 'addresses')
            return 'addresses';
        if (stepQuery === 'servizi' || stepQuery === 'services')
            return 'services';
        return 'services';
    }
    // Trampolini legacy: /riepilogo reindirizza a pagamento via riepilogo.vue.
    if (path.startsWith('/riepilogo'))
        return 'payment';
    if (path.startsWith('/checkout'))
        return 'payment';
    return null;
};
/**
 * Riconosce route di ripresa (edit, pagamento con order_id) per bypassare il guard.
 */
export const isShipmentFlowResumeException = (routeLike: RouteLike): boolean => {
    const path = String(routeLike?.path || routeLike?.fullPath || '');
    const query = routeLike?.query || {};
    const stepQuery = normalizeShipmentStep(query.step, '');
    if (path.startsWith('/la-tua-spedizione') && hasPositiveQueryId(query.edit))
        return true;
    if (path.startsWith('/la-tua-spedizione')
        && hasPositiveQueryId(query.order_id)
        && ['pagamento', 'conferma', 'payment'].includes(stepQuery))
        return true;
    return false;
};
/**
 * Decide se l'utente può accedere a una route del funnel dato lo stato corrente.
 */
export const canAccessShipmentFlowRoute = (routeLike: RouteLike, flowState?: Partial<ShipmentFlowState> | null): boolean => {
    if (isShipmentFlowResumeException(routeLike))
        return true;
    const stage = getShipmentFlowStage(routeLike);
    if (!stage || stage === 'quote' || stage === 'packages')
        return true;
    if (stage === 'services')
        return Boolean(flowState?.quote_ready);
    if (stage === 'addresses')
        return Boolean(flowState?.services_ready);
    // stage === 'summary' e' un alias storico di 'payment' (unificati in Sprint 2.1).
    if (stage === 'summary' || stage === 'payment')
        return Boolean(flowState?.addresses_ready);
    return true;
};
/**
 * Converte uno stato flusso nello step numerico (1-4) esposto all'UI.
 */
export const getShipmentFlowStepNumber = (flowState?: Partial<ShipmentFlowState> | null): 1 | 2 | 3 | 4 => {
    if (flowState?.summary_ready)
        return 4;
    if (flowState?.services_ready)
        return 3;
    if (flowState?.quote_ready)
        return 2;
    return 1;
};
/**
 * Estrae la lista di servizi selezionati dal payload della sessione.
 */
export const extractShipmentServicesArray = (data: ShipmentFlowDeriveInput = {}) => normalizeServiceTypeList(data?.services?.service_type || '');
/**
 * Normalizza un indirizzo draft nella forma attesa dagli step address.
 */
export const toStepAddressState = (address: AddressDraft | null = null): StepAddressState | null => {
    if (!address || typeof address !== 'object')
        return null;
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
/**
 * Costruisce il payload completo di pendingShipment partendo dai dati sessione.
 */
export const buildPendingShipmentFromSession = (data: ShipmentFlowDeriveInput = {}): BuiltPendingShipment | null => {
    const flowState = resolveShipmentFlowState(data);
    if (!flowState.summary_ready)
        return null;
    if (!hasPackages(data?.packages))
        return null;
    if (!data?.origin_address || !data?.destination_address)
        return null;
    const clientSubmissionId = typeof data?.client_submission_id === 'string'
        ? data.client_submission_id.trim()
        : '';
    return {
        origin_address: data.origin_address,
        destination_address: data.destination_address,
        services: {
            ...(data.services || {}),
            serviceData: {
                ...((data.service_data || data?.services?.serviceData || {})),
                sms_email_notification: Boolean(data?.sms_email_notification
                    ?? data?.services?.sms_email_notification
                    ?? data?.service_data?.sms_email_notification),
            },
            sms_email_notification: Boolean(data?.sms_email_notification
                ?? data?.services?.sms_email_notification
                ?? data?.service_data?.sms_email_notification),
        },
        packages: Array.isArray(data.packages) ? [...data.packages] : [],
        content_description: data.content_description || '',
        delivery_mode: data.delivery_mode || 'home',
        pudo: data.selected_pudo || null,
        sms_email_notification: Boolean(data?.sms_email_notification
            ?? data?.services?.sms_email_notification
            ?? data?.service_data?.sms_email_notification),
        client_submission_id: clientSubmissionId || undefined,
    };
};
/**
 * Deriva il flow-state partendo dallo store locale (sessionStorage).
 */
export const deriveShipmentFlowStateFromUserStore = (shipmentFlowStore: UserStoreLikeInput = {}): ShipmentFlowState => {
    const shipmentDetails = shipmentFlowStore?.shipmentDetails || {};
    const packages = Array.isArray(shipmentFlowStore?.packages) ? shipmentFlowStore?.packages : [];
    const pendingShipment = shipmentFlowStore?.pendingShipment || {};
    const pendingPackages = Array.isArray(pendingShipment?.packages) ? pendingShipment.packages : [];
    const deliveryMode = shipmentFlowStore?.deliveryMode || pendingShipment?.delivery_mode || 'home';
    const selectedPudo = shipmentFlowStore?.selectedPudo || pendingShipment?.pudo || null;
    const quoteReady = hasPackagesReady(packages);
    const pickupDate = shipmentFlowStore?.pickupDate || shipmentDetails?.date || pendingShipment?.pickup_date || '';
    const contentDescription = shipmentFlowStore?.contentDescription || pendingShipment?.content_description || '';
    const servicesReady = quoteReady && hasMeaningfulText(contentDescription) && hasMeaningfulText(pickupDate);
    const originAddress = shipmentFlowStore?.originAddressData || pendingShipment?.origin_address || null;
    const destinationAddress = shipmentFlowStore?.destinationAddressData || pendingShipment?.destination_address || null;
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
    const pendingSummaryReady = hasPackagesReady(pendingPackages)
        && pendingServicesReady
        && hasAddressDraft(pendingShipment?.origin_address || null)
        && pendingDestinationReady;
    const summaryReady = addressesReady || pendingSummaryReady;
    let lastValidRoute: string = SHIPMENT_FLOW_ROUTES.packages;
    if (summaryReady) {
        lastValidRoute = SHIPMENT_FLOW_ROUTES.summary;
    }
    else if (servicesReady) {
        lastValidRoute = SHIPMENT_FLOW_ROUTES.addresses;
    }
    else if (quoteReady) {
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
/**
 * Azzera le parti di store che eccedono lo stato valido (es. quando si torna indietro).
 */
export const trimUserStoreToFlowState = (shipmentFlowStore: TrimmableUserStore | null | undefined, flowState?: Partial<ShipmentFlowState> | null) => {
    if (!shipmentFlowStore || !flowState)
        return;
    if (!flowState.summary_ready) {
        shipmentFlowStore.pendingShipment = null;
    }
    if (!flowState.addresses_ready) {
        shipmentFlowStore.originAddressData = null;
        shipmentFlowStore.destinationAddressData = null;
        shipmentFlowStore.selectedPudo = null;
    }
    if (!flowState.services_ready) {
        shipmentFlowStore.servicesArray = [];
        shipmentFlowStore.contentDescription = '';
        shipmentFlowStore.pickupDate = '';
        shipmentFlowStore.smsEmailNotification = false;
        shipmentFlowStore.serviceData = {};
    }
    if (!flowState.quote_ready) {
        shipmentFlowStore.packages = [];
        shipmentFlowStore.totalPrice = 0;
        shipmentFlowStore.isQuoteStarted = false;
    }
    shipmentFlowStore.stepNumber = getShipmentFlowStepNumber(flowState);
};
// ─────────────────────────────────────────────────────────────────
// SEZIONE 2 — ex utils/clientSubmissionId.ts
// ─────────────────────────────────────────────────────────────────
// Idempotency key client-side: protegge preventivo e checkout da doppio submit e retry di rete (usato da backend Stripe/ordini per deduplica).
const normalizeSubmissionId = (value: unknown): string => String(value ?? '').trim();
/**
 * Genera un nuovo ID submission client (idempotency key).
 */
export const createClientSubmissionId = () => (`sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
/**
 * Cerca il primo client_submission_id valido fra le sorgenti passate (flat).
 */
export const readClientSubmissionId = (...sources: Array<SubmissionSource | null | undefined>): string | null => {
    for (const source of sources) {
        if (!source || typeof source !== 'object')
            continue;
        const submissionId = normalizeSubmissionId(source.client_submission_id);
        if (submissionId)
            return submissionId;
    }
    return null;
};
/**
 * Cerca ricorsivamente client_submission_id nelle chiavi pendingShipment/data.
 */
export const readNestedClientSubmissionId = (...sources: Array<NestedSubmissionSource | null | undefined>): string | null => {
    const queue = [...sources];
    const visited = new Set<NestedSubmissionSource>();
    while (queue.length > 0) {
        const source = queue.shift();
        if (!source || typeof source !== 'object')
            continue;
        if (visited.has(source))
            continue;
        visited.add(source);
        const submissionId = normalizeSubmissionId(source.client_submission_id);
        if (submissionId)
            return submissionId;
        const nestedCandidates = [source.pendingShipment, source.data];
        for (const candidate of nestedCandidates) {
            if (candidate && typeof candidate === 'object') {
                queue.push(candidate);
            }
        }
    }
    return null;
};
/**
 * Se target non ha un client_submission_id, ne genera uno e lo salva in place.
 */
export const ensureClientSubmissionId = (target: SubmissionSource | null | undefined): string => {
    const existing = readClientSubmissionId(target);
    if (existing)
        return existing;
    const created = createClientSubmissionId();
    if (target && typeof target === 'object') {
        target.client_submission_id = created;
    }
    return created;
};
