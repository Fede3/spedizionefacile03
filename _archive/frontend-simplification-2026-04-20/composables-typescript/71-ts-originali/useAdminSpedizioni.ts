// Filtro "problem" (in_giacenza + returned + refused) applicato lato client: backend accetta un solo valore status per chiamata.
import type { AdminPaginatedResponse, AdminStatusOption } from '~/types'

interface AdminShipment {
	id: number
	status: string
	brt_parcel_id?: string | number | null
	[key: string]: unknown
}

interface ShipmentStatusFilter {
	key: string
	label: string
	count: number
}

export const useAdminSpedizioni = () => {
	const sanctum = useSanctumClient();
	const {
		actionLoading, actionMessage, showSuccess, showError,
		formatCurrency, formatCents, formatDate, orderStatusConfig, downloadLabel,
	} = useAdmin();

	const shipmentsData = ref<AdminPaginatedResponse<AdminShipment>>({ data: [], last_page: 1, total: 0 });
	const shipmentsPage = ref<number>(1);
	const shipmentsSearch = ref<string>('');
	const shipmentsStatusFilter = ref<string>('');
	const tabLoading = ref<boolean>(false);
	const fetchError = ref<boolean>(false);
	const activeFilter = ref<string>('all');

	/* Mappa pill filter → valore status backend (stringa o array). */
	const filterMap: Record<string, string[]> = {
		all: [],
		processing: ['processing', 'label_generated', 'payed', 'completed'],
		in_transit: ['in_transit', 'out_for_delivery'],
		delivered: ['delivered'],
		problem: ['in_giacenza', 'returned', 'refused'],
	};

	const fetchShipments = async (): Promise<void> => {
		tabLoading.value = true;
		fetchError.value = false;
		try {
			const params = new URLSearchParams();
			params.set('page', String(shipmentsPage.value));
			if (shipmentsSearch.value) params.set('search', shipmentsSearch.value);
			if (shipmentsStatusFilter.value) params.set('status', shipmentsStatusFilter.value);
			const res = await sanctum(`/api/admin/shipments?${params.toString()}`) as
				{ data?: AdminShipment[]; last_page?: number; total?: number } | AdminShipment[] | null;
			if (res && typeof res === 'object' && !Array.isArray(res) && Array.isArray(res.data)) {
				shipmentsData.value = { data: res.data, last_page: res.last_page || 1, total: res.total || res.data.length };
			} else if (Array.isArray(res)) {
				shipmentsData.value = { data: res, last_page: 1, total: res.length };
			} else {
				shipmentsData.value = { data: [], last_page: 1, total: 0 };
			}
		} catch {
			shipmentsData.value = { data: [], last_page: 1, total: 0 };
			fetchError.value = true;
		}
		tabLoading.value = false;
	};

	let shipmentsSearchTimeout: ReturnType<typeof setTimeout> | undefined;
	const onShipmentsSearch = (): void => {
		clearTimeout(shipmentsSearchTimeout);
		shipmentsSearchTimeout = setTimeout(() => {
			shipmentsPage.value = 1;
			fetchShipments();
		}, 400);
	};

	const setActiveFilter = async (key: string): Promise<void> => {
		activeFilter.value = key;
		const values = filterMap[key] || [];
		/* Backend accetta una singola stringa: se il gruppo ha piu stati,
		   usiamo la prima come filtro primario e completiamo lato client. */
		shipmentsStatusFilter.value = values.length === 1 ? (values[0] ?? '') : '';
		shipmentsPage.value = 1;
		await fetchShipments();
	};

	/* Lista spedizioni filtrata lato client per pill "problem"/"processing"/"in_transit"
	   (raggruppa piu stati in un singolo filtro). */
	const visibleShipments = computed<AdminShipment[]>(() => {
		const all = shipmentsData.value.data || [];
		const allowed = filterMap[activeFilter.value];
		if (!allowed || allowed.length === 0) return all;
		if (allowed.length === 1) return all;
		return all.filter((s) => allowed.includes(s.status));
	});

	const visibleShipmentsCount = computed<number>(() => visibleShipments.value.length);

	/* Conteggi pill sulla pagina corrente. */
	const statusFilters = computed<ShipmentStatusFilter[]>(() => {
		const all = shipmentsData.value.data || [];
		const processingSet = filterMap.processing ?? [];
		const inTransitSet = filterMap.in_transit ?? [];
		const problemSet = filterMap.problem ?? [];
		return [
			{ key: 'all', label: 'Tutte', count: all.length },
			{ key: 'processing', label: 'In lavorazione', count: all.filter((s) => processingSet.includes(s.status)).length },
			{ key: 'in_transit', label: 'In transito', count: all.filter((s) => inTransitSet.includes(s.status)).length },
			{ key: 'delivered', label: 'Consegnate', count: all.filter((s) => s.status === 'delivered').length },
			{ key: 'problem', label: 'Problema', count: all.filter((s) => problemSet.includes(s.status)).length },
		];
	});

	const paginationLabel = computed<string>(() => `Pagina ${shipmentsPage.value} di ${shipmentsData.value.last_page || 1}`);
	const hasActiveFilters = computed<boolean>(() => Boolean(shipmentsSearch.value) || activeFilter.value !== 'all');

	const resetFilters = async (): Promise<void> => {
		shipmentsSearch.value = '';
		shipmentsStatusFilter.value = '';
		activeFilter.value = 'all';
		shipmentsPage.value = 1;
		await fetchShipments();
	};

	const changeOrderStatus = async (orderId: number | string, status: string): Promise<void> => {
		if (!status) return;
		actionLoading.value = `order-${orderId}`;
		try {
			await sanctum(`/api/admin/orders/${orderId}/status`, { method: 'PATCH', body: { status } });
			showSuccess(`Stato ordine #${orderId} aggiornato.`);
			await fetchShipments();
		} catch (e) {
			showError(e, "Errore durante l'aggiornamento stato ordine.");
		} finally {
			actionLoading.value = null;
		}
	};

	/* Ritorna i prossimi stati raggiungibili per una spedizione.
	   Limitato agli stati "shipment" (in_transit, out_for_delivery, delivered, in_giacenza, returned, refused). */
	const shipmentTransitions: Record<string, string[]> = {
		processing: ['label_generated', 'in_transit', 'cancelled'],
		label_generated: ['in_transit', 'cancelled'],
		payed: ['processing', 'cancelled'],
		completed: ['in_transit'],
		in_transit: ['out_for_delivery', 'delivered', 'in_giacenza', 'returned', 'refused'],
		out_for_delivery: ['delivered', 'returned', 'refused', 'in_giacenza'],
		in_giacenza: ['out_for_delivery', 'returned', 'refused'],
		delivered: [],
		returned: [],
		refused: [],
	};

	const getAvailableStatuses = (currentStatus: string): AdminStatusOption[] => {
		const allStatuses: AdminStatusOption[] = [
			{ value: 'label_generated', label: 'Etichetta generata' },
			{ value: 'in_transit', label: 'In transito' },
			{ value: 'out_for_delivery', label: 'In consegna' },
			{ value: 'delivered', label: 'Consegnato' },
			{ value: 'in_giacenza', label: 'In giacenza' },
			{ value: 'returned', label: 'Reso' },
			{ value: 'refused', label: 'Rifiutato' },
			{ value: 'cancelled', label: 'Annullato' },
		];
		const allowed = shipmentTransitions[currentStatus] || [];
		return allStatuses.filter((s) => allowed.includes(s.value));
	};

	return {
		/* State */
		shipmentsData, shipmentsPage, shipmentsSearch, shipmentsStatusFilter,
		tabLoading, fetchError, activeFilter,
		/* Computed */
		visibleShipments, visibleShipmentsCount, statusFilters,
		paginationLabel, hasActiveFilters,
		/* Actions */
		fetchShipments, onShipmentsSearch, changeOrderStatus,
		setActiveFilter, resetFilters, getAvailableStatuses,
		/* From useAdmin */
		actionLoading, actionMessage, showSuccess, showError,
		formatCurrency, formatCents, formatDate, orderStatusConfig, downloadLabel,
	};
};
