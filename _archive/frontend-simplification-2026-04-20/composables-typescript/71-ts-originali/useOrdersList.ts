/**
 * Composable: useOrdersList
 * Logica completa per la pagina /account/spedizioni (lista ordini).
 *
 * Gestisce: fetch ordini, filtri per stato, formattazione, annullamento, statistiche.
 * (Il salvataggio come "spedizione configurata" è archiviato dal 2026-04-20.)
 */

interface OrderFilter {
	id: string;
	label: string;
	matches: (status: string, order?: any) => boolean;
}

interface FilterPill {
	id: string;
	label: string;
	count: number;
}

interface OrderStats {
	total: number;
	open: number;
	pending: number;
}

export default function useOrdersList() {
	const sanctum = useSanctumClient();
	const normalizeForSearch = (value: unknown = ''): string =>
		String(value ?? '')
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.trim();

	/* --- Fetch ordini --- */
	const { data: orders, refresh, status: ordersStatus } = useSanctumFetch("/api/orders", { method: "GET", lazy: true });

	/* --- Helpers stato --- */
	const statusRaw = (status: string): string => {
		const map: Record<string, string> = {
			'In attesa': 'pending', 'In lavorazione': 'processing', 'Completato': 'completed',
			'Fallito': 'payment_failed', 'Pagato': 'payed', 'Annullato': 'cancelled',
			'Rimborsato': 'refunded', 'In transito': 'in_transit', 'Consegnato': 'delivered',
			'In giacenza': 'in_giacenza',
			'Etichetta generata': 'label_generated', 'In consegna': 'out_for_delivery',
			'Reso': 'returned', 'Rifiutato': 'refused',
		};
		return map[status] || status;
	};

	const statusColor = (status: string): string => {
		const raw = statusRaw(status);
		// Palette brand coerente: teal per flusso operativo, verde solo Consegnato,
		// arancione per "problema da seguire", rosso solo per fallimento tecnico. Mai blu.
		const map: Record<string, string> = {
			pending: 'bg-[#FDEEE4] text-[#E44203]', processing: 'bg-[#eef8fa] text-[#095866]',
			completed: 'bg-[#f0fdf4] text-[#0a8a7a]', payment_failed: 'bg-red-100 text-red-700',
			payed: 'bg-[#eef8fa] text-[#095866]', cancelled: 'bg-gray-200 text-gray-600',
			refunded: 'bg-[#FDEEE4] text-[#E44203]', in_transit: 'bg-[#eef8fa] text-[#095866]',
			delivered: 'bg-[#f0fdf4] text-[#0a8a7a]', in_giacenza: 'bg-[#FDEEE4] text-[#E44203]',
			label_generated: 'bg-[#eef8fa] text-[#095866]',
			out_for_delivery: 'bg-[#dff0f3] text-[#074a56]',
			returned: 'bg-[#FDEEE4] text-[#E44203]',
			refused: 'bg-[#FDEEE4] text-[#E44203]',
		};
		return map[raw] || 'bg-gray-100 text-gray-700';
	};

	/* --- Filtri stato + ricerca --- */
	// Filtri allineati alle 4 categorie semantiche richieste:
	// "Tutte" / "In corso" (preparazione + transito) / "Consegnate" / "Problemi"
	const filterDefinitions: OrderFilter[] = [
		{ id: 'all', label: 'Tutte', matches: () => true },
		{ id: 'in_corso', label: 'In corso', matches: (raw) => ['pending', 'processing', 'payed', 'label_generated', 'in_transit', 'out_for_delivery'].includes(raw) },
		{ id: 'delivered', label: 'Consegnate', matches: (raw) => ['completed', 'delivered'].includes(raw) },
		{ id: 'issue', label: 'Problemi', matches: (raw) => ['payment_failed', 'cancelled', 'refunded', 'in_giacenza', 'returned', 'refused'].includes(raw) },
	];
	const activeFilter = ref('all');
	const searchQuery = ref('');

	const changeFilter = (filterId: string): void => {
		activeFilter.value = filterId;
	};

	const matchesFilter = (order: any, filterId: string = activeFilter.value): boolean => {
		const definition = filterDefinitions.find((item) => item.id === filterId) || filterDefinitions[0];
		return definition.matches(statusRaw(order?.status), order);
	};

	/* --- Formattazione --- */
	const formatDate = (dateStr: string | null | undefined): string => {
		if (!dateStr) return '\u2014';
		try {
			const parsed = new Date(dateStr);
			if (Number.isNaN(parsed.getTime())) return '\u2014';
			return parsed.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
		}
		catch {
			return '\u2014';
		}
	};

	// formatPrice auto-importato da utils/price.js

	const getPackageIcon = (item: any): string => {
		const type = item?.package_type?.toLowerCase() || '';
		if (type.includes('pallet')) return '/img/quote/first-step/pallet.png';
		if (type.includes('busta')) return '/img/quote/first-step/envelope.png';
		return '/img/quote/first-step/pack.png';
	};

	const getRouteLabel = (order: any): string => {
		if (!order.packages?.length) return '\u2014';
		const pkg = order.packages[0];
		const oc = pkg.origin_address?.city || ''; const op = pkg.origin_address?.province || '';
		const dc = pkg.destination_address?.city || ''; const dp = pkg.destination_address?.province || '';
		return `${oc}${op ? '(' + op + ')' : ''} \u2192 ${dc}${dp ? '(' + dp + ')' : ''}`;
	};

	const getServiceLabel = (order: any): string => {
		if (!order.packages?.length) return '\u2014';
		const raw = order.packages[0].services?.service_type?.split(',')[0]?.trim() || '';
		if (!raw || raw === 'Nessuno') return 'Standard';
		return raw;
	};

	const getSenderName = (order: any): string => order.packages?.[0]?.origin_address?.name || '\u2014';
	const getRecipientName = (order: any): string => order.packages?.[0]?.destination_address?.name || '\u2014';
	const getOrderReferenceLabel = (order: any): string => `SF-${String(order?.id ?? '').padStart(6, '0')}`;

	const getTrackingLabel = (order: any): string => {
		const candidates = [
			order?.tracking_number,
			order?.tracking,
			order?.shipment_number,
			order?.shipping_number,
			order?.brt_tracking_number,
			order?.brt_tracking_code,
			order?.brt_tracking,
			order?.packages?.[0]?.tracking_number,
		];

		return candidates.find((value) => String(value ?? '').trim()) || '';
	};

	const getOrderSubtotalLabel = (order: any): string => {
		if (typeof order?.subtotal === 'string' && order.subtotal.trim()) return order.subtotal.replace(/\s*EUR$/i, '\u20AC');
		return formatPrice(order?.subtotal_cents || 0);
	};

	const getOrderDateLabel = (order: any): string => formatDate(order?.created_at);

	const getOrderPackageLabel = (order: any): string => {
		const count = Number(order?.packages?.length || 0);
		if (!count) return 'Nessun collo';
		return count === 1 ? '1 collo' : `${count} colli`;
	};

	const collectSearchTerms = (order: any): string[] => {
		const firstPackage = order?.packages?.[0] || {};

		return [
			order?.id,
			getOrderReferenceLabel(order),
			order?.status,
			getTrackingLabel(order),
			getRouteLabel(order),
			getServiceLabel(order),
			getSenderName(order),
			getRecipientName(order),
			firstPackage?.origin_address?.city,
			firstPackage?.origin_address?.province,
			firstPackage?.destination_address?.city,
			firstPackage?.destination_address?.province,
			firstPackage?.origin_address?.postal_code,
			firstPackage?.destination_address?.postal_code,
		]
			.map((value) => normalizeForSearch(value))
			.filter(Boolean) as string[];
	};

	const filterPills = computed<FilterPill[]>(() => {
		const list = (orders.value as any)?.data || [];
		return filterDefinitions.map((filter) => ({
			id: filter.id,
			label: filter.label,
			count: list.filter((order: any) => matchesFilter(order, filter.id)).length,
		}));
	});

	/* --- Filtro ordini --- */
	const filteredOrders = computed(() => {
		const list = (orders.value as any)?.data || [];
		const query = normalizeForSearch(searchQuery.value);

		return list
			.filter((order: any) => matchesFilter(order))
			.filter((order: any) => {
				if (!query) return true;
				return collectSearchTerms(order).some((term) => term.includes(query));
			});
	});

	/* --- Pagamento in sospeso --- */
	const isPendingPayment = (order: any): boolean => {
		const raw = statusRaw(order.status);
		return raw === 'pending' || raw === 'payment_failed';
	};

	const getPendingReason = (order: any): string => {
		const raw = statusRaw(order.status);
		if (raw === 'payment_failed') return 'Pagamento non riuscito. Riprova il pagamento per completare l\'ordine.';
		if (raw === 'pending') return 'In attesa di pagamento. Completa il pagamento per procedere con la spedizione.';
		return '';
	};

	/* --- Statistiche --- */
	const orderStats = computed<OrderStats>(() => {
		const list = (orders.value as any)?.data || [];
		const openStatuses = ['In attesa', 'In lavorazione', 'In transito', 'Pagato'];
		const pendingStatuses = ['In attesa', 'Fallito', 'Pagato'];
		return {
			total: list.length,
			open: list.filter((o: any) => openStatuses.includes(o.status)).length,
			pending: list.filter((o: any) => isPendingPayment(o) || pendingStatuses.includes(o.status)).length,
		};
	});

	/* --- Modale dettaglio --- */
	const showDetail = ref(false);
	const detailItem = ref<any>(null);

	/* --- Annullamento --- */
	const cancellingOrder = ref<Record<string, boolean>>({});
	const saveError = ref<Record<string, string | null>>({});

	const isCancellable = (order: any): boolean => order.cancellable === true;

	const cancelOrder = async (order: any): Promise<void> => {
		const raw = statusRaw(order.status);
		const isPaid = ['completed', 'processing', 'in_transit'].includes(raw);
		const message = isPaid
			? 'Sei sicuro di voler annullare questa spedizione? Verra\' applicata una commissione di annullamento di 2,00 EUR. Il rimborso verra\' accreditato sul metodo di pagamento originale.'
			: 'Sei sicuro di voler annullare questo ordine?';
		if (!confirm(message)) return;
		cancellingOrder.value[order.id] = true;
		try {
			const result = await sanctum(`/api/orders/${order.id}/cancel`, { method: 'POST' }) as any;
			if (result?.refund_amount && result.refund_amount !== '0,00') saveError.value[order.id] = null;
			await refresh();
		} catch (e: any) {
			const data = e?.response?._data || e?.data;
			saveError.value[order.id] = data?.error || data?.message || 'Errore durante l\'annullamento.';
		} finally { cancellingOrder.value[order.id] = false; }
	};

	/* -- ARCHIVIATO 2026-04-20: "Salva come configurata" (_archive/frontend-simplification-2026-04-20/features/spedizioni-configurate)
	 *
	 * Il blocco usava:
	 *   - savingToConfigured, savedToConfigured, savedShipmentsList
	 *   - loadSavedShipments() via GET /api/saved-shipments (onMounted)
	 *   - isAlreadySaved(order), saveToConfigured(order) -> POST /api/saved-shipments
	 * L'intero flusso è archiviato insieme alla pagina /account/spedizioni-configurate.
	 * Snippet originale in _archive/.../features/spedizioni-configurate/call-sites-removed.patch.md
	 */

	return {
		filterPills, activeFilter, searchQuery, changeFilter,
		orders, refresh, ordersStatus, filteredOrders,
		statusRaw, statusColor,
		formatDate, formatPrice, getPackageIcon, getRouteLabel, getServiceLabel, getTrackingLabel,
		getSenderName, getRecipientName, getOrderReferenceLabel, getOrderSubtotalLabel, getOrderDateLabel, getOrderPackageLabel,
		isPendingPayment, getPendingReason, orderStats,
		showDetail, detailItem,
		cancellingOrder, saveError, isCancellable, cancelOrder,
		// savingToConfigured, savedToConfigured, isAlreadySaved, saveToConfigured -- ARCHIVIATO 2026-04-20
	};
}
