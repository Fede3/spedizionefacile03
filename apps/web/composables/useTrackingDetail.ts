/**
 * @file useTrackingDetail — composable per pagina dettaglio tracking spedizione.
 *
 * soglia 500 LOC. Contiene fetch + polling + normalize + computed UI helpers.
 *
 * USO:
 *   const { data, isLoading, isRefreshing, errorState, currentStepIndex,
 *           alternateEnd, isDelivered, statusChipClass, etaFormatted,
 *           STEPS, fetchTracking, startPolling, stopPolling,
 *           handleVisibilityChange, copyCode, copyOk } = useTrackingDetail(trackingCode);
 */

export const TRACKING_STEPS = [
	{ key: 'received', label: 'Ricevuto' },
	{ key: 'processing', label: 'In lavorazione' },
	{ key: 'in_transit', label: 'In transito' },
	{ key: 'out_for_delivery', label: 'In consegna' },
	{ key: 'delivered', label: 'Consegnato' },
];

const RAW_TO_STEP: Record<string, number> = {
	pending: 0,
	paid: 0,
	completed: 0,
	processing: 1,
	label_generated: 1,
	in_transit: 2,
	in_giacenza: 2,
	out_for_delivery: 3,
	delivered: 4,
};

const ALT_END = ['returned', 'refused', 'cancelled', 'refunded', 'payment_failed'];

const ALT_LABELS: Record<string, string> = {
	returned: 'Reso al mittente',
	refused: 'Rifiutato dal destinatario',
	cancelled: 'Spedizione annullata',
	refunded: 'Spedizione rimborsata',
	payment_failed: 'Pagamento fallito',
};

type TrackingApiResponse = Record<string, unknown> & {
	events?: unknown;
	found?: boolean;
	brt_tracking_url?: string;
};

const stringField = (source: TrackingApiResponse, key: string, fallback = ''): string => {
	const value = source[key];
	return typeof value === 'string' && value ? value : fallback;
};

function normalizeTrackingResponse(r: TrackingApiResponse, fallbackCode: string) {
	const evRaw = Array.isArray(r.events) ? r.events : [];
	return {
		code: stringField(r, 'code', stringField(r, 'brt_parcel_id', stringField(r, 'brt_tracking_number', fallbackCode))),
		order_id: r.order_id ?? r.id ?? null,
		raw_status: stringField(r, 'raw_status', stringField(r, 'status_raw', stringField(r, 'status', 'pending'))),
		status_label: stringField(r, 'status', stringField(r, 'status_label', 'Stato sconosciuto')),
		status_description: stringField(r, 'status_description'),
		current_step: typeof r.current_step === 'number' ? r.current_step : undefined,
		estimated_delivery_at: stringField(r, 'estimated_delivery_at') || null,
		created_at: stringField(r, 'created_at') || null,
		origin: r.origin || null,
		destination: r.destination || null,
		recipient_name: stringField(r, 'recipient_name') || null,
		package: r.package || null,
		brt_parcel_id: stringField(r, 'brt_parcel_id') || null,
		brt_tracking_number: stringField(r, 'brt_tracking_number') || null,
		brt_tracking_url: stringField(r, 'brt_tracking_url') || null,
		invoice_url: stringField(r, 'invoice_url') || null,
		can_reschedule: !!r.can_reschedule,
		can_change_address: !!r.can_change_address,
		events: evRaw,
	};
}

function formatEtaIso(iso: string | null) {
	if (!iso) return null;
	try {
		const d = new Date(iso);
		return d.toLocaleDateString('it-IT', {
			weekday: 'long',
			day: '2-digit',
			month: 'long',
			year: 'numeric',
			timeZone: 'Europe/Rome',
		});
	} catch {
		return null;
	}
}

export function useTrackingDetail(trackingCode: ComputedRef<string>) {
	const sanctum = useSanctumClient();

	const data = ref<ReturnType<typeof normalizeTrackingResponse> | null>(null);
	const isLoading = ref(true);
	const isRefreshing = ref(false);
	const errorState = ref<string | null>(null);
	const copyOk = ref(false);

	const currentStepIndex = computed(() => {
		if (!data.value) return -1;
		if (typeof data.value.current_step === 'number') return data.value.current_step;
		const raw = data.value.raw_status;
		return RAW_TO_STEP[raw] ?? -1;
	});

	const alternateEnd = computed(() => {
		if (!data.value) return null;
		const raw = data.value.raw_status;
		if (!ALT_END.includes(raw)) return null;
		return {
			type: raw === 'refused' ? 'refused' : 'returned',
			label: ALT_LABELS[raw] || 'Stato finale',
		};
	});

	const isDelivered = computed(() => data.value?.raw_status === 'delivered');

	const statusChipClass = computed(() => {
		const raw = data.value?.raw_status || '';
		// Mapping Tailwind utility (era chip-success/chip-warn/chip-danger/chip-progress in tracking.css)
		if (raw === 'delivered') return 'bg-[#f0fdf4] text-[#0a8a7a] ring-[1.5px] ring-[#c8e6cd]';
		if (ALT_END.includes(raw)) {
			return raw === 'refused' || raw === 'payment_failed'
				? 'bg-[#fdecec] text-[#b3261e] ring-[1.5px] ring-[#f1b4b4]'
				: 'bg-[#fff5ef] text-[#E44203] ring-[1.5px] ring-[#f5c8b1]';
		}
		if (raw === 'in_giacenza') return 'bg-[#fff5ef] text-[#E44203] ring-[1.5px] ring-[#f5c8b1]';
		return 'bg-[#eef7f8] text-[#095866] ring-[1.5px] ring-[#bdd5da]';
	});

	const etaFormatted = computed(() => formatEtaIso(data.value?.estimated_delivery_at || null));

	async function fetchTracking({ silent = false } = {}) {
		if (!trackingCode.value) return;
		if (!silent) {
			isLoading.value = true;
			errorState.value = null;
		} else {
			isRefreshing.value = true;
		}
		try {
			let resp: TrackingApiResponse | null = null;
			try {
				resp = await sanctum(`/api/tracking/${encodeURIComponent(trackingCode.value)}`);
			} catch (error) {
				const statusCode = typeof error === 'object' && error && 'statusCode' in error
					? Number((error as { statusCode?: unknown }).statusCode)
					: null;
				if (statusCode === 404) {
					resp = null;
				}
				try {
					resp = await sanctum('/api/tracking/search', {
						params: { code: trackingCode.value },
					});
				} catch {
					if (!silent) errorState.value = 'network';
					return;
				}
			}

			if (!resp || resp.found === false) {
				if (!silent) {
					errorState.value = 'not_found';
					data.value = null;
				}
				if (resp?.brt_tracking_url) {
					data.value = normalizeTrackingResponse(resp, trackingCode.value);
				}
				return;
			}

			data.value = normalizeTrackingResponse(resp, trackingCode.value);
			errorState.value = null;
		} finally {
			isLoading.value = false;
			isRefreshing.value = false;
		}
	}

	let pollHandle: number | null = null;
	function startPolling() {
		stopPolling();
		if (import.meta.server) return;
		pollHandle = window.setInterval(() => {
			if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
				return;
			}
			if (!isDelivered.value && !errorState.value) {
				fetchTracking({ silent: true });
			} else {
				stopPolling();
			}
		}, 60000);
	}
	function stopPolling() {
		if (pollHandle) {
			clearInterval(pollHandle);
			pollHandle = null;
		}
	}

	function handleVisibilityChange() {
		if (document.visibilityState === 'visible' && !isDelivered.value && !errorState.value) {
			fetchTracking({ silent: true });
		}
	}

	async function copyCode() {
		if (!trackingCode.value) return;
		try {
			await navigator.clipboard.writeText(trackingCode.value);
			copyOk.value = true;
			setTimeout(() => (copyOk.value = false), 1800);
		} catch {
			// silently fail
		}
	}

	return {
		data,
		isLoading,
		isRefreshing,
		errorState,
		copyOk,
		currentStepIndex,
		alternateEnd,
		isDelivered,
		statusChipClass,
		etaFormatted,
		STEPS: TRACKING_STEPS,
		fetchTracking,
		startPolling,
		stopPolling,
		handleVisibilityChange,
		copyCode,
	};
}
