/**
 * Composable: useOrdersList
 * Logica completa per la pagina /account/spedizioni (lista ordini).
 *
 * Gestisce: fetch ordini, filtri per stato, formattazione, annullamento,
 * salvataggio come "spedizione configurata", statistiche.
 */
import { formatDateIt } from '~/utils/date.js';
import { getBrtTrackingReference } from '~/utils/brtTracking';

type OrderAddress = {
	name?: string;
	city?: string;
	province?: string;
	address?: string;
	postal_code?: string;
	additional_information?: string;
	number_type?: string;
	address_number?: string;
	intercom_code?: string;
	country?: string;
	telephone_number?: string;
	email?: string;
};
type OrderPackage = {
	package_type?: string;
	quantity?: number | string;
	weight?: number | string;
	first_size?: number | string;
	second_size?: number | string;
	third_size?: number | string;
	single_price?: number | string;
	weight_price?: number | string;
	volume_price?: number | string;
	origin_address?: OrderAddress;
	destination_address?: OrderAddress;
	services?: { service_type?: string; date?: string; time?: string };
	service?: { service_type?: string; date?: string; time?: string };
};
type OrderItem = {
	id: number | string;
	status: string;
	cancellable?: boolean;
	packages?: OrderPackage[];
	payable_total?: string;
	payable_total_cents?: number;
	subtotal_cents?: number;
	created_at?: string;
	reference?: string;
	order_number?: string;
	tracking_number?: string;
};
type OrdersResponse = { data?: OrderItem[] };
type SavedShipment = OrderPackage;
type ApiError = { response?: { _data?: { error?: string; message?: string } }; data?: { error?: string; message?: string } };
const orderKey = (order: Pick<OrderItem, 'id'>): string => String(order.id);

export default function useOrdersList() {
	const sanctum = useSanctumClient();

	/* --- Filtri stato --- */
	const filters = ref<string[]>(["Tutti", "Aperti", "Chiusi", "Annullati", "In giacenza"]);
	const activeFilter = ref("Tutti");
	const textFilter = ref("Tutti");
	const searchQuery = ref("");

	const changeFilter = (filter: string | null, filterIndex: number | null = null) => {
		const indexedFilter = filterIndex !== null ? filters.value[filterIndex] : undefined;
		const nextFilter = typeof filter === 'string' && filter ? filter : indexedFilter || 'Tutti';
		activeFilter.value = nextFilter;
		textFilter.value = nextFilter;
	};

	/* --- Fetch ordini --- */
	const { data: orders, refresh, status: ordersStatus } = useLazySanctumFetch<OrdersResponse>("/api/orders", { method: "GET" });

	/* --- Helpers stato --- */
	const statusRaw = (status: string): string => {
		const map: Record<string, string> = {
			'In attesa': 'pending', 'In lavorazione': 'processing', 'Completato': 'completed',
			'Fallito': 'payment_failed', 'Pagato': 'paid', 'Annullato': 'cancelled',
			'Rimborsato': 'refunded', 'In transito': 'in_transit', 'Consegnato': 'delivered',
			'In giacenza': 'in_giacenza', 'Etichetta generata': 'label_generated',
			'In consegna': 'out_for_delivery', 'Reso': 'returned', 'Rifiutato': 'refused',
			'In attesa di bonifico': 'awaiting_bank_transfer',
		};
		return map[status] || status;
	};

	const statusColor = (status: string): string => {
		const raw = statusRaw(status);
		const map: Record<string, string> = {
			pending: 'bg-yellow-100 text-yellow-700', processing: 'bg-[#eef8fa] text-[#095866]',
			completed: 'bg-[#f0fdf4] text-[#0a8a7a]', payment_failed: 'bg-red-100 text-red-700',
			paid: 'bg-[#f0fdf4] text-[#0a8a7a]', cancelled: 'bg-gray-200 text-gray-600',
			refunded: 'bg-orange-100 text-orange-700', in_transit: 'bg-[#eef8fa] text-[#095866]',
			delivered: 'bg-[#f0fdf4] text-[#0a8a7a]', in_giacenza: 'bg-orange-100 text-orange-700',
			label_generated: 'bg-[#eef8fa] text-[#095866]', out_for_delivery: 'bg-[#dff0f3] text-[#074a56]',
			returned: 'bg-orange-100 text-orange-700', refused: 'bg-red-100 text-red-700',
			awaiting_bank_transfer: 'bg-[#F5F3FF] text-[#6D28D9]',
		};
		return map[raw] || 'bg-gray-100 text-gray-700';
	};

	/* --- Filtro ordini --- */
	const filteredOrders = computed(() => {
		const list: OrderItem[] = orders.value?.data || [];
		const normalizedSearch = searchQuery.value.trim().toLowerCase();
		const baseList = textFilter.value === 'Tutti'
			? list
			: (() => {
				const filterMap: Record<string, string[]> = {
					'Aperti': ['In attesa', 'In lavorazione', 'In transito', 'Pagato', 'Etichetta generata', 'In consegna', 'In attesa di bonifico'],
					'Chiusi': ['Completato', 'Consegnato'],
					'Annullati': ['Annullato', 'Rimborsato', 'Fallito', 'Reso', 'Rifiutato'],
					'In giacenza': ['In giacenza'],
				};
				const allowed = filterMap[textFilter.value] || [];
				return list.filter(order => allowed.includes(order.status));
			})();

		if (!normalizedSearch) return baseList;

		return baseList.filter((order) => {
			const haystack = [
				getOrderReferenceLabel(order),
				getTrackingLabel(order),
				getSenderName(order),
				getRecipientName(order),
				getRouteLabel(order),
			]
				.filter(Boolean)
				.join(' ')
				.toLowerCase();
			return haystack.includes(normalizedSearch);
		});
	});

	/* --- Formattazione --- */
	const formatDate = (dateStr?: string) => formatDateIt(dateStr, '\u2014');

	// formatPrice auto-importato da utils/price.js

	const getPackageIcon = (item: Partial<OrderPackage>) => {
		const type = item?.package_type?.toLowerCase() || '';
		if (type.includes('pallet')) return '/img/quote/first-step/pallet.png';
		if (type.includes('busta')) return '/img/quote/first-step/envelope.png';
		return '/img/quote/first-step/pack.png';
	};

	const getRouteLabel = (order: OrderItem): string => {
		if (!order.packages?.length) return '\u2014';
		const pkg = order.packages[0];
		if (!pkg) return '\u2014';
		const oc = pkg.origin_address?.city || ''; const op = pkg.origin_address?.province || '';
		const dc = pkg.destination_address?.city || ''; const dp = pkg.destination_address?.province || '';
		return `${oc}${op ? '(' + op + ')' : ''} \u2192 ${dc}${dp ? '(' + dp + ')' : ''}`;
	};

	const getServiceLabel = (order: OrderItem): string => {
		if (!order.packages?.length) return '\u2014';
		const pkg = order.packages[0];
		return pkg?.services?.service_type?.split(',')[0]?.trim() || 'Espresso Nazionale';
	};

	const resolveContactLabel = (address?: OrderAddress): string => {
		if (!address) return '\u2014';
		const name = String(address.name || '').trim();
		if (name && name.toUpperCase() !== 'N/D') return name;
		const city = String(address.city || '').trim();
		const province = String(address.province || '').trim();
		if (city && province) return `${city} (${province})`;
		if (city) return city;
		const street = String(address.address || '').trim();
		return street || '\u2014';
	};

	const getSenderName = (order: OrderItem) => resolveContactLabel(order.packages?.[0]?.origin_address);
	const getRecipientName = (order: OrderItem) => resolveContactLabel(order.packages?.[0]?.destination_address);

	const getOrderSubtotalLabel = (order: OrderItem) => {
		if (typeof order?.payable_total === 'string' && order.payable_total.trim()) return order.payable_total.replace(/\s*EUR$/i, '\u20AC');
		return formatPrice(order?.payable_total_cents ?? order?.subtotal_cents ?? 0);
	};

	const getOrderDateLabel = (order: OrderItem) => formatDate(order?.created_at);

	const getOrderReferenceLabel = (order: OrderItem): string => {
		const ref = order?.reference || order?.order_number || order?.tracking_number;
		if (ref) return String(ref);
		return order?.id ? `#${order.id}` : '\u2014';
	};

	const getTrackingLabel = (order: OrderItem): string => {
		return getBrtTrackingReference(order) || '';
	};

	const getOrderPackageLabel = (order: OrderItem): string => {
		const count = Number(order?.packages?.length || 0);
		if (!count) return 'Nessun collo';
		return count === 1 ? '1 collo' : `${count} colli`;
	};

	/* --- Pagamento in sospeso --- */
	const isPendingPayment = (order: OrderItem): boolean => {
		const raw = statusRaw(order.status);
		return raw === 'pending' || raw === 'payment_failed';
	};

	const getPendingReason = (order: OrderItem): string => {
		const raw = statusRaw(order.status);
		if (raw === 'payment_failed') return 'Pagamento non riuscito. Riprova il pagamento per completare l\'ordine.';
		if (raw === 'pending') return 'In attesa di pagamento. Completa il pagamento per procedere con la spedizione.';
		return '';
	};

	/* --- Statistiche --- */
	const orderStats = computed(() => {
		const list: OrderItem[] = orders.value?.data || [];
		const openStatuses = ['In attesa', 'In lavorazione', 'In transito', 'Pagato', 'Etichetta generata', 'In consegna', 'In attesa di bonifico'];
		const pendingStatuses = ['In attesa', 'Fallito', 'Pagato', 'In attesa di bonifico'];
		return {
			total: list.length,
			open: list.filter(o => openStatuses.includes(o.status)).length,
			pending: list.filter(o => isPendingPayment(o) || pendingStatuses.includes(o.status)).length,
		};
	});

	const filterPills = computed(() => {
		const list: OrderItem[] = orders.value?.data || [];
		const countByStatus = (statuses: string[]) => list.filter((order) => statuses.includes(order.status)).length;
		return [
			{ id: 'Tutti', label: 'Tutti', count: list.length },
			{ id: 'Aperti', label: 'Aperti', count: countByStatus(['In attesa', 'In lavorazione', 'In transito', 'Pagato', 'Etichetta generata', 'In consegna', 'In attesa di bonifico']) },
			{ id: 'Chiusi', label: 'Chiusi', count: countByStatus(['Completato', 'Consegnato']) },
			{ id: 'Annullati', label: 'Annullati', count: countByStatus(['Annullato', 'Rimborsato', 'Fallito', 'Reso', 'Rifiutato']) },
			{ id: 'In giacenza', label: 'In giacenza', count: countByStatus(['In giacenza']) },
		];
	});

	/* --- Modale dettaglio --- */
	const showDetail = ref(false);
	const detailItem = ref<OrderItem | null>(null);

	/* --- Annullamento --- */
	const cancellingOrder = ref<Record<string, boolean>>({});
	const saveError = ref<Record<string, string | null>>({});

	const isCancellable = (order: OrderItem) => order.cancellable === true;

	const cancelOrder = async (order: OrderItem) => {
		const raw = statusRaw(order.status);
		const isPaid = ['completed', 'processing', 'in_transit'].includes(raw);
		const message = isPaid
			? 'Sei sicuro di voler annullare questa spedizione? Verra\' applicata una commissione di annullamento di 2,00 EUR. Il rimborso verra\' accreditato sul metodo di pagamento originale.'
			: 'Sei sicuro di voler annullare questo ordine?';
		if (!confirm(message)) return;
		cancellingOrder.value[orderKey(order)] = true;
		try {
			const result = await sanctum(`/api/orders/${order.id}/cancel`, { method: 'POST' }) as { refund_amount?: string };
			if (result?.refund_amount && result.refund_amount !== '0,00') saveError.value[orderKey(order)] = null;
			await refresh();
		} catch (e) {
			const error = e as ApiError;
			const data = error?.response?._data || error?.data;
			saveError.value[orderKey(order)] = data?.error || data?.message || 'Errore durante l\'annullamento.';
		} finally { cancellingOrder.value[orderKey(order)] = false; }
	};

	/* --- Salva come configurata --- */
	const savingToConfigured = ref<Record<string, boolean>>({});
	const savedToConfigured = ref<Record<string, boolean>>({});
	const savedShipmentsList = ref<SavedShipment[]>([]);

	const loadSavedShipments = async () => {
		// Endpoint opzionale: se fallisce non vogliamo bloccare l'elenco ordini.
		try { savedShipmentsList.value = ((await sanctum("/api/saved-shipments")) as { data?: SavedShipment[] })?.data || []; }
		catch (e) { if (import.meta.dev) console.warn('[useOrdersList] saved-shipments non disponibile', e); }
	};
	onMounted(() => {
		void refresh();
		void loadSavedShipments();
	});

	const isAlreadySaved = (order: OrderItem): boolean => {
		if (savedToConfigured.value[orderKey(order)]) return true;
		if (!order.packages?.length || !savedShipmentsList.value.length) return false;
		const pkg = order.packages[0];
		if (!pkg) return false;
		return savedShipmentsList.value.some(saved =>
			saved.package_type === pkg.package_type
			&& String(saved.weight) === String(pkg.weight)
			&& String(saved.first_size) === String(pkg.first_size)
			&& String(saved.second_size) === String(pkg.second_size)
			&& String(saved.third_size) === String(pkg.third_size)
			&& saved.origin_address?.city === pkg.origin_address?.city
			&& saved.origin_address?.postal_code === pkg.origin_address?.postal_code
			&& saved.origin_address?.name === pkg.origin_address?.name
			&& saved.destination_address?.city === pkg.destination_address?.city
			&& saved.destination_address?.postal_code === pkg.destination_address?.postal_code
			&& saved.destination_address?.name === pkg.destination_address?.name
		);
	};

	const saveToConfigured = async (order: OrderItem) => {
		if (!order.packages?.length) { saveError.value[orderKey(order)] = "Nessun collo presente in questo ordine."; return; }
		if (isAlreadySaved(order)) { saveError.value[orderKey(order)] = "Questa spedizione \u00E8 gi\u00E0 stata salvata nelle spedizioni configurate."; return; }
		savingToConfigured.value[orderKey(order)] = true;
		saveError.value[orderKey(order)] = null;
		try {
			const pkg = order.packages[0];
			if (!pkg) { saveError.value[orderKey(order)] = "Nessun collo presente in questo ordine."; return; }
			const svc = pkg.services || pkg.service || {};
			await sanctum("/api/saved-shipments", {
				method: "POST",
				body: {
					origin_address: {
						type: "Partenza", name: pkg.origin_address?.name || "N/D",
						additional_information: pkg.origin_address?.additional_information || "",
						address: pkg.origin_address?.address || "N/D",
						number_type: pkg.origin_address?.number_type || "Numero Civico",
						address_number: pkg.origin_address?.address_number || "SNC",
						intercom_code: pkg.origin_address?.intercom_code || "",
						country: pkg.origin_address?.country || "Italia",
						city: pkg.origin_address?.city || "N/D",
						postal_code: pkg.origin_address?.postal_code || "00000",
						province: pkg.origin_address?.province || "N/D",
						telephone_number: pkg.origin_address?.telephone_number || "0000000000",
						email: pkg.origin_address?.email || "",
					},
					destination_address: {
						type: "Destinazione", name: pkg.destination_address?.name || "N/D",
						additional_information: pkg.destination_address?.additional_information || "",
						address: pkg.destination_address?.address || "N/D",
						number_type: pkg.destination_address?.number_type || "Numero Civico",
						address_number: pkg.destination_address?.address_number || "SNC",
						intercom_code: pkg.destination_address?.intercom_code || "",
						country: pkg.destination_address?.country || "Italia",
						city: pkg.destination_address?.city || "N/D",
						postal_code: pkg.destination_address?.postal_code || "00000",
						province: pkg.destination_address?.province || "N/D",
						telephone_number: pkg.destination_address?.telephone_number || "0000000000",
						email: pkg.destination_address?.email || "",
					},
					services: { service_type: svc.service_type || "Nessuno", date: svc.date || "", time: svc.time || "" },
					packages: order.packages.map((p) => ({
						package_type: p.package_type || "Pacco", quantity: p.quantity || 1,
						weight: p.weight || 1, first_size: p.first_size || 10,
						second_size: p.second_size || 10, third_size: p.third_size || 10,
						single_price: Number(p.single_price || 0) / 100,
						weight_price: p.weight_price || 0, volume_price: p.volume_price || 0,
					})),
				},
			});
			savedToConfigured.value[orderKey(order)] = true;
			saveError.value[orderKey(order)] = null;
			await loadSavedShipments();
		} catch (e) {
			const error = e as ApiError;
			const errorData = error?.response?._data || error?.data;
			saveError.value[orderKey(order)] = errorData?.message || "Errore durante il salvataggio. Riprova.";
		} finally { savingToConfigured.value[orderKey(order)] = false; }
	};

	return {
		filters, filterPills, activeFilter, textFilter, searchQuery, changeFilter,
		orders, refresh, ordersStatus, filteredOrders,
		statusRaw, statusColor,
		formatDate, formatPrice, getPackageIcon, getRouteLabel, getServiceLabel,
		getSenderName, getRecipientName, getOrderSubtotalLabel, getOrderDateLabel, getOrderReferenceLabel, getTrackingLabel, getOrderPackageLabel,
		isPendingPayment, getPendingReason, orderStats,
		showDetail, detailItem,
		cancellingOrder, saveError, isCancellable, cancelOrder,
		savingToConfigured, savedToConfigured, isAlreadySaved, saveToConfigured,
	};
}
