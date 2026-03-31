/**
 * Composable: useOrdersList
 * Logica completa per la pagina /account/spedizioni (lista ordini).
 *
 * Gestisce: fetch ordini, filtri per stato, formattazione, annullamento,
 * salvataggio come "spedizione configurata", statistiche.
 */
export default function useOrdersList() {
	const sanctum = useSanctumClient();

	/* --- Filtri stato --- */
	const filters = ref(["Tutti", "Aperti", "Chiusi", "Annullati", "In giacenza"]);
	const activeFilter = ref(0);
	const textFilter = ref("Tutti");

	const changeFilter = (filter, filterIndex) => {
		activeFilter.value = filterIndex;
		textFilter.value = filter;
	};

	/* --- Fetch ordini --- */
	const { data: orders, refresh, status: ordersStatus } = useSanctumFetch("/api/orders", { method: "GET", lazy: true });

	/* --- Helpers stato --- */
	const statusRaw = (status) => {
		const map = {
			'In attesa': 'pending', 'In lavorazione': 'processing', 'Completato': 'completed',
			'Fallito': 'payment_failed', 'Pagato': 'payed', 'Annullato': 'cancelled',
			'Rimborsato': 'refunded', 'In transito': 'in_transit', 'Consegnato': 'delivered',
			'In giacenza': 'in_giacenza',
		};
		return map[status] || status;
	};

	const statusColor = (status) => {
		const raw = statusRaw(status);
		const map = {
			pending: 'bg-yellow-100 text-yellow-700', processing: 'bg-blue-100 text-blue-700',
			completed: 'bg-emerald-100 text-emerald-700', payment_failed: 'bg-red-100 text-red-700',
			payed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-gray-200 text-gray-600',
			refunded: 'bg-orange-100 text-orange-700', in_transit: 'bg-blue-100 text-blue-700',
			delivered: 'bg-emerald-100 text-emerald-700', in_giacenza: 'bg-orange-100 text-orange-700',
		};
		return map[raw] || 'bg-gray-100 text-gray-700';
	};

	/* --- Filtro ordini --- */
	const filteredOrders = computed(() => {
		if (!orders.value?.data) return [];
		if (textFilter.value === 'Tutti') return orders.value.data;
		const filterMap = {
			'Aperti': ['In attesa', 'In lavorazione', 'In transito', 'Pagato'],
			'Chiusi': ['Completato', 'Consegnato'],
			'Annullati': ['Annullato', 'Rimborsato', 'Fallito'],
			'In giacenza': ['In giacenza'],
		};
		const allowed = filterMap[textFilter.value] || [];
		return orders.value.data.filter(order => allowed.includes(order.status));
	});

	/* --- Formattazione --- */
	const formatDate = (dateStr) => {
		if (!dateStr) return '\u2014';
		try { return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
		catch { return dateStr; }
	};

	const formatPrice = (cents) => {
		if (!cents && cents !== 0) return '0,00\u20AC';
		return (cents / 100).toFixed(2).replace('.', ',') + '\u20AC';
	};

	const getPackageIcon = (item) => {
		const type = item?.package_type?.toLowerCase() || '';
		if (type.includes('pallet')) return '/img/quote/first-step/pallet.png';
		if (type.includes('busta')) return '/img/quote/first-step/envelope.png';
		return '/img/quote/first-step/pack.png';
	};

	const getRouteLabel = (order) => {
		if (!order.packages?.length) return '\u2014';
		const pkg = order.packages[0];
		const oc = pkg.origin_address?.city || ''; const op = pkg.origin_address?.province || '';
		const dc = pkg.destination_address?.city || ''; const dp = pkg.destination_address?.province || '';
		return `${oc}${op ? '(' + op + ')' : ''} \u2192 ${dc}${dp ? '(' + dp + ')' : ''}`;
	};

	const getServiceLabel = (order) => {
		if (!order.packages?.length) return '\u2014';
		return order.packages[0].services?.service_type?.split(',')[0]?.trim() || 'Espresso Nazionale';
	};

	const getSenderName = (order) => order.packages?.[0]?.origin_address?.name || '\u2014';
	const getRecipientName = (order) => order.packages?.[0]?.destination_address?.name || '\u2014';

	const getOrderSubtotalLabel = (order) => {
		if (typeof order?.subtotal === 'string' && order.subtotal.trim()) return order.subtotal.replace(/\s*EUR$/i, '\u20AC');
		return formatPrice(order?.subtotal_cents || 0);
	};

	const getOrderDateLabel = (order) => formatDate(order?.created_at);

	const getOrderPackageLabel = (order) => {
		const count = Number(order?.packages?.length || 0);
		if (!count) return 'Nessun collo';
		return count === 1 ? '1 collo' : `${count} colli`;
	};

	/* --- Pagamento in sospeso --- */
	const isPendingPayment = (order) => {
		const raw = statusRaw(order.status);
		return raw === 'pending' || raw === 'payment_failed';
	};

	const getPendingReason = (order) => {
		const raw = statusRaw(order.status);
		if (raw === 'payment_failed') return 'Pagamento non riuscito. Riprova il pagamento per completare l\'ordine.';
		if (raw === 'pending') return 'In attesa di pagamento. Completa il pagamento per procedere con la spedizione.';
		return '';
	};

	/* --- Statistiche --- */
	const orderStats = computed(() => {
		const list = orders.value?.data || [];
		const openStatuses = ['In attesa', 'In lavorazione', 'In transito', 'Pagato'];
		const pendingStatuses = ['In attesa', 'Fallito', 'Pagato'];
		return {
			total: list.length,
			open: list.filter(o => openStatuses.includes(o.status)).length,
			pending: list.filter(o => isPendingPayment(o) || pendingStatuses.includes(o.status)).length,
		};
	});

	/* --- Modale dettaglio --- */
	const showDetail = ref(false);
	const detailItem = ref(null);

	/* --- Annullamento --- */
	const cancellingOrder = ref({});
	const saveError = ref({});

	const isCancellable = (order) => order.cancellable === true;

	const cancelOrder = async (order) => {
		const raw = statusRaw(order.status);
		const isPaid = ['completed', 'processing', 'in_transit'].includes(raw);
		const message = isPaid
			? 'Sei sicuro di voler annullare questa spedizione? Verra\' applicata una commissione di annullamento di 2,00 EUR. Il rimborso verra\' accreditato sul metodo di pagamento originale.'
			: 'Sei sicuro di voler annullare questo ordine?';
		if (!confirm(message)) return;
		cancellingOrder.value[order.id] = true;
		try {
			const result = await sanctum(`/api/orders/${order.id}/cancel`, { method: 'POST' });
			if (result?.refund_amount && result.refund_amount !== '0,00') saveError.value[order.id] = null;
			await refresh();
		} catch (e) {
			const data = e?.response?._data || e?.data;
			saveError.value[order.id] = data?.error || data?.message || 'Errore durante l\'annullamento.';
		} finally { cancellingOrder.value[order.id] = false; }
	};

	/* --- Salva come configurata --- */
	const savingToConfigured = ref({});
	const savedToConfigured = ref({});
	const savedShipmentsList = ref([]);

	const loadSavedShipments = async () => {
		try { savedShipmentsList.value = (await sanctum("/api/saved-shipments"))?.data || []; } catch {}
	};
	onMounted(loadSavedShipments);

	const isAlreadySaved = (order) => {
		if (savedToConfigured.value[order.id]) return true;
		if (!order.packages?.length || !savedShipmentsList.value.length) return false;
		const pkg = order.packages[0];
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

	const saveToConfigured = async (order) => {
		if (!order.packages?.length) { saveError.value[order.id] = "Nessun collo presente in questo ordine."; return; }
		if (isAlreadySaved(order)) { saveError.value[order.id] = "Questa spedizione \u00E8 gi\u00E0 stata salvata nelle spedizioni configurate."; return; }
		savingToConfigured.value[order.id] = true;
		saveError.value[order.id] = null;
		try {
			const pkg = order.packages[0];
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
					packages: order.packages.map(p => ({
						package_type: p.package_type || "Pacco", quantity: p.quantity || 1,
						weight: p.weight || 1, first_size: p.first_size || 10,
						second_size: p.second_size || 10, third_size: p.third_size || 10,
						single_price: Number(p.single_price || 0) / 100,
						weight_price: p.weight_price || 0, volume_price: p.volume_price || 0,
					})),
				},
			});
			savedToConfigured.value[order.id] = true;
			saveError.value[order.id] = null;
			await loadSavedShipments();
		} catch (e) {
			const errorData = e?.response?._data || e?.data;
			saveError.value[order.id] = errorData?.message || "Errore durante il salvataggio. Riprova.";
		} finally { savingToConfigured.value[order.id] = false; }
	};

	return {
		filters, activeFilter, textFilter, changeFilter,
		orders, refresh, ordersStatus, filteredOrders,
		statusRaw, statusColor,
		formatDate, formatPrice, getPackageIcon, getRouteLabel, getServiceLabel,
		getSenderName, getRecipientName, getOrderSubtotalLabel, getOrderDateLabel, getOrderPackageLabel,
		isPendingPayment, getPendingReason, orderStats,
		showDetail, detailItem,
		cancellingOrder, saveError, isCancellable, cancelOrder,
		savingToConfigured, savedToConfigured, isAlreadySaved, saveToConfigured,
	};
}
