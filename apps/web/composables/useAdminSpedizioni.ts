/**
 * @file useAdminSpedizioni — gestione coda BRT lato admin (lista spedizioni con
 * filtri stato, ricerca, paginazione, azioni stato/etichetta).
 *
 * Esposto: state ref + computed + actions usate da `pages/account/amministrazione/spedizioni.vue`.
 *
 * Era stato rimosso durante il cleanup "orphan" del 27 apr; in realta' la pagina
 * spedizioni admin lo importa e crashava in 500 SSR ("useAdminSpedizioni is not defined").
 */

const STATUS_FILTERS = [
	{ id: 'all', label: 'Tutti' },
	{ id: 'pending', label: 'In attesa' },
	{ id: 'paid', label: 'Pagati' },
	{ id: 'label_generated', label: 'Etichetta pronta' },
	{ id: 'in_transit', label: 'In transito' },
	{ id: 'delivered', label: 'Consegnati' },
	{ id: 'cancelled', label: 'Annullati' },
 ] as const;

type StatusFilterId = typeof STATUS_FILTERS[number]['id']
type OrderStatus = Exclude<StatusFilterId, 'all'>
type AdminShipment = {
	id?: string | number
	status?: string
	[key: string]: unknown
}
type ApiListResponse<T> = { data?: T[] }
const unwrapList = <T>(response: ApiListResponse<T> | T[]): T[] =>
	Array.isArray(response) ? response : Array.isArray(response.data) ? response.data : []

const ALLOWED_NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
	pending: ['paid', 'cancelled'],
	paid: ['label_generated', 'cancelled'],
	label_generated: ['in_transit', 'cancelled'],
	in_transit: ['delivered'],
	delivered: [],
	cancelled: [],
};

const getErrorMessage = (error: unknown, fallback: string): string =>
	error && typeof error === 'object' && 'message' in error ? String(error.message) : fallback;

export function useAdminSpedizioni() {
	const sanctum = useSanctumClient();

	const shipmentsData = ref<AdminShipment[]>([]);
	const shipmentsPage = ref(1);
	const shipmentsSearch = ref('');
	const activeFilter = ref<StatusFilterId>('all');
	const tabLoading = ref(false);
	const fetchError = ref('');
	const actionMessage = ref('');

	const statusFilters = computed(() => STATUS_FILTERS);
	const visibleShipments = computed(() => shipmentsData.value);
	const visibleShipmentsCount = computed(() => visibleShipments.value.length);
	const paginationLabel = computed(() => `Pagina ${shipmentsPage.value}`);
	const hasActiveFilters = computed(
		() => activeFilter.value !== 'all' || Boolean(shipmentsSearch.value?.trim()),
	);

	const fetchShipments = async () => {
		tabLoading.value = true;
		fetchError.value = '';
		try {
			const params = new URLSearchParams();
			if (shipmentsSearch.value) params.set('search', shipmentsSearch.value);
			if (activeFilter.value && activeFilter.value !== 'all') params.set('status', activeFilter.value);
			params.set('page', String(shipmentsPage.value));
			shipmentsData.value = unwrapList(await sanctum<ApiListResponse<AdminShipment> | AdminShipment[]>(`/api/admin/orders?${params.toString()}`));
		} catch (e) {
			fetchError.value = getErrorMessage(e, 'Errore caricamento spedizioni');
			shipmentsData.value = [];
		} finally {
			tabLoading.value = false;
		}
	};

	const onShipmentsSearch = (value: unknown) => {
		shipmentsSearch.value = String(value || '');
		shipmentsPage.value = 1;
		return fetchShipments();
	};

	const setActiveFilter = (filterId: StatusFilterId | string) => {
		activeFilter.value = STATUS_FILTERS.some((filter) => filter.id === filterId) ? filterId as StatusFilterId : 'all';
		shipmentsPage.value = 1;
		return fetchShipments();
	};

	const resetFilters = () => {
		activeFilter.value = 'all';
		shipmentsSearch.value = '';
		shipmentsPage.value = 1;
		return fetchShipments();
	};

	const getAvailableStatuses = (currentStatus: string) => {
		const next = ALLOWED_NEXT_STATUS[currentStatus as OrderStatus] || [];
		return STATUS_FILTERS.filter((s) => s.id !== 'all' && next.includes(s.id));
	};

	const changeOrderStatus = async (orderId: string | number | null | undefined, newStatus: OrderStatus | string | null | undefined) => {
		if (!orderId || !newStatus) return false;
		try {
			await sanctum(`/api/admin/orders/${orderId}/status`, {
				method: 'PATCH',
				body: { status: newStatus },
			});
			actionMessage.value = `Stato aggiornato a "${newStatus}".`;
			await fetchShipments();
			return true;
		} catch (e) {
			actionMessage.value = getErrorMessage(e, 'Errore aggiornamento stato.');
			return false;
		}
	};

	const downloadLabel = async (orderId: string | number | null | undefined) => {
		if (!orderId) return false;
		try {
			const res = await sanctum(`/api/admin/orders/${orderId}/label`, { responseType: 'blob' });
			if (res instanceof Blob) {
				const url = URL.createObjectURL(res);
				const a = document.createElement('a');
				a.href = url;
				a.download = `etichetta-${orderId}.pdf`;
				a.click();
				URL.revokeObjectURL(url);
			}
			return true;
		} catch {
			return false;
		}
	};

	const formatDate = (value: string | number | Date | null | undefined) => {
		if (!value) return '';
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return String(value);
		return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
	};

	return {
		shipmentsData,
		shipmentsPage,
		shipmentsSearch,
		activeFilter,
		tabLoading,
		fetchError,
		actionMessage,
		visibleShipments,
		visibleShipmentsCount,
		statusFilters,
		paginationLabel,
		hasActiveFilters,
		fetchShipments,
		onShipmentsSearch,
		changeOrderStatus,
		setActiveFilter,
		resetFilters,
		getAvailableStatuses,
		downloadLabel,
		formatDate,
	};
}
