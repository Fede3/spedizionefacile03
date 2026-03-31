/**
 * COMPOSABLE: useAdminOrdini
 * SCOPO: Logica di business per la pagina admin ordini.
 *        Gestisce fetch, filtri, paginazione, cambio stato, PUDO, raggruppamento.
 * DOVE SI USA: pages/account/amministrazione/ordini.vue
 */
export const useAdminOrdini = () => {
	const sanctum = useSanctumClient();
	const { actionLoading, actionMessage, showSuccess, showError, formatCurrency, formatCents, formatDate, orderStatusConfig, downloadLabel } = useAdmin();

	const ordersData = ref({ data: [], last_page: 1 });
	const ordersPage = ref(1);
	const ordersSearch = ref('');
	const ordersStatusFilter = ref('');
	const tabLoading = ref(false);
	const fetchError = ref(false);
	const groupByUser = ref(false);

	const orderStatusOptions = [
		{ value: '', label: 'Tutti gli stati' },
		{ value: 'pending', label: 'In attesa' },
		{ value: 'processing', label: 'In lavorazione' },
		{ value: 'completed', label: 'Completato' },
		{ value: 'payed', label: 'Pagato' },
		{ value: 'in_transit', label: 'In transito' },
		{ value: 'delivered', label: 'Consegnato' },
		{ value: 'cancelled', label: 'Annullato' },
		{ value: 'payment_failed', label: 'Pagamento fallito' },
	];

	const fetchOrders = async () => {
		tabLoading.value = true;
		fetchError.value = false;
		try {
			const params = new URLSearchParams();
			params.set('page', ordersPage.value);
			if (ordersSearch.value) params.set('search', ordersSearch.value);
			if (ordersStatusFilter.value) params.set('status', ordersStatusFilter.value);
			const res = await sanctum(`/api/admin/orders?${params.toString()}`);
			if (res && Array.isArray(res.data)) {
				ordersData.value = { data: res.data, last_page: res.last_page || 1 };
			} else if (res && Array.isArray(res)) {
				ordersData.value = { data: res, last_page: 1 };
			} else {
				ordersData.value = { data: [], last_page: 1 };
			}
		} catch {
			ordersData.value = { data: [], last_page: 1 };
			fetchError.value = true;
		}
		tabLoading.value = false;
	};

	let ordersSearchTimeout;
	const onOrdersSearch = () => {
		clearTimeout(ordersSearchTimeout);
		ordersSearchTimeout = setTimeout(() => { ordersPage.value = 1; fetchOrders(); }, 400);
	};

	const validTransitions = {
		'pending': ['processing', 'cancelled'],
		'processing': ['completed', 'in_transit', 'cancelled'],
		'completed': ['in_transit'],
		'in_transit': ['delivered'],
		'delivered': [],
		'cancelled': [],
		'payment_failed': ['pending'],
	};

	const changeOrderStatus = async (orderId, status, currentStatus) => {
		const allowedStates = validTransitions[currentStatus] || [];
		if (!allowedStates.includes(status)) {
			showError(null, `Transizione non valida: ${currentStatus} → ${status}. Stati permessi: ${allowedStates.join(', ') || 'nessuno'}`);
			return;
		}
		actionLoading.value = `order-${orderId}`;
		try {
			await sanctum(`/api/admin/orders/${orderId}/status`, { method: 'PATCH', body: { status } });
			showSuccess(`Stato ordine #${orderId} aggiornato.`);
			await fetchOrders();
		} catch (e) { showError(e, "Errore durante l'aggiornamento stato ordine."); }
		finally { actionLoading.value = null; }
	};

	const selectedOrder = ref(null);
	const showOrderDetail = (order) => { selectedOrder.value = order; };
	const closeOrderDetail = () => { selectedOrder.value = null; };

	const expandedUsers = ref(new Set());
	const toggleUser = (userId) => {
		if (expandedUsers.value.has(userId)) {
			expandedUsers.value.delete(userId);
		} else {
			expandedUsers.value.add(userId);
		}
	};

	const groupedOrders = computed(() => {
		if (!ordersData.value.data?.length) return [];
		const map = new Map();
		for (const order of ordersData.value.data) {
			const userId = order.user?.id || 'unknown';
			if (!map.has(userId)) {
				map.set(userId, { user: order.user, orders: [], totalAmount: 0 });
			}
			const group = map.get(userId);
			group.orders.push(order);
			group.totalAmount += Number(order.subtotal?.amount ?? order.subtotal ?? 0);
		}
		return Array.from(map.values());
	});

	const visibleOrders = computed(() => ordersData.value.data || []);
	const visibleOrdersCount = computed(() => visibleOrders.value.length);
	const groupedUsersCount = computed(() => groupedOrders.value.length);
	const visibleOrdersTotal = computed(() => visibleOrders.value.reduce((sum, order) => {
		return sum + Number(order.subtotal?.amount ?? order.subtotal ?? 0);
	}, 0));
	const hasActiveFilters = computed(() => Boolean(ordersSearch.value || ordersStatusFilter.value));
	const activeStatusLabel = computed(() => {
		return orderStatusOptions.find((o) => o.value === ordersStatusFilter.value)?.label || 'Tutti gli stati';
	});
	const paginationLabel = computed(() => {
		return `Pagina ${ordersPage.value} di ${ordersData.value.last_page || 1}`;
	});

	const resetFilters = async () => {
		ordersSearch.value = '';
		ordersStatusFilter.value = '';
		ordersPage.value = 1;
		await fetchOrders();
	};

	const getAvailableStatuses = (currentStatus) => {
		const all = [
			{ value: 'pending', label: 'In attesa' },
			{ value: 'processing', label: 'In lavorazione' },
			{ value: 'completed', label: 'Completato' },
			{ value: 'in_transit', label: 'In transito' },
			{ value: 'delivered', label: 'Consegnato' },
			{ value: 'cancelled', label: 'Annullato' },
		];
		if (currentStatus === 'delivered' || currentStatus === 'in_transit') {
			return all.filter(s => s.value !== 'cancelled');
		}
		return all;
	};

	const changeUserType = async (userId, newType) => {
		try {
			await sanctum(`/api/admin/users/${userId}/user-type`, { method: 'PATCH', body: { user_type: newType } });
			showSuccess(`Tipo account aggiornato a "${newType}".`);
			for (const order of ordersData.value.data) {
				if (order.user?.id === userId) {
					order.user.user_type = newType;
				}
			}
		} catch (e) { showError(e, "Errore durante l'aggiornamento tipo account."); }
	};

	const getPudoFromOrder = (order) => {
		if (!order?.packages?.length) return null;
		for (const pkg of order.packages) {
			const sd = pkg.service?.service_data;
			if (sd?.pudo?.name) return sd.pudo;
		}
		return null;
	};

	const showPudoSelector = ref(false);
	const pudoSaving = ref(false);

	const onAdminPudoSelected = async (pudo) => {
		if (!selectedOrder.value) return;
		pudoSaving.value = true;
		try {
			await sanctum(`/api/admin/orders/${selectedOrder.value.id}/pudo`, {
				method: 'PATCH',
				body: { pudo_id: pudo.pudo_id, pudo_name: pudo.name, pudo_address: pudo.address, pudo_city: pudo.city, pudo_zip: pudo.zip_code },
			});
			selectedOrder.value.brt_pudo_id = pudo.pudo_id;
			showPudoSelector.value = false;
			showSuccess(`Punto PUDO impostato per ordine #${selectedOrder.value.id}`);
			await fetchOrders();
		} catch (e) {
			showError(e, 'Errore nel salvataggio del punto PUDO.');
		} finally {
			pudoSaving.value = false;
		}
	};

	const removeAdminPudo = async () => {
		if (!selectedOrder.value) return;
		pudoSaving.value = true;
		try {
			await sanctum(`/api/admin/orders/${selectedOrder.value.id}/pudo`, {
				method: 'PATCH',
				body: { pudo_id: null },
			});
			selectedOrder.value.brt_pudo_id = null;
			showPudoSelector.value = false;
			showSuccess(`Punto PUDO rimosso dall'ordine #${selectedOrder.value.id}`);
			await fetchOrders();
		} catch (e) {
			showError(e, 'Errore nella rimozione del punto PUDO.');
		} finally {
			pudoSaving.value = false;
		}
	};

	return {
		// State
		ordersData, ordersPage, ordersSearch, ordersStatusFilter,
		tabLoading, fetchError, groupByUser, orderStatusOptions,
		selectedOrder, expandedUsers, showPudoSelector, pudoSaving,
		// Computed
		groupedOrders, visibleOrders, visibleOrdersCount, groupedUsersCount,
		visibleOrdersTotal, hasActiveFilters, activeStatusLabel, paginationLabel,
		// Actions
		fetchOrders, onOrdersSearch, changeOrderStatus,
		showOrderDetail, closeOrderDetail, toggleUser,
		resetFilters, getAvailableStatuses, changeUserType,
		getPudoFromOrder, onAdminPudoSelected, removeAdminPudo,
		// From useAdmin
		actionLoading, actionMessage, showSuccess, showError,
		formatCurrency, formatCents, formatDate, orderStatusConfig, downloadLabel,
	};
};
