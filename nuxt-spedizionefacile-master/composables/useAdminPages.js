/**
 * useAdminPages — aggrega useAdminOrdini / useAdminSpedizioni / useAdminUtenti.
 * Utility condivise in useAdmin.js; prezzi in useAdminPrezzi.js.
 * ARCHIVIATO: _archive/cleanup-features-2026-04-20/composables-consolidati-admin/
 */

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 1: Admin Ordini (ex useAdminOrdini)
// state + fetch + filtri pagina /account/amministrazione/ordini
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 2: Admin Spedizioni (ex useAdminSpedizioni)
// state + fetch + filtri pagina /account/amministrazione/spedizioni
// Filtro "problem" (in_giacenza + returned + refused) applicato lato client:
// backend accetta un solo valore status per chiamata.
// ─────────────────────────────────────────────────────────────────────────────
/** @typedef {import('~/types').AdminPaginatedResponse} AdminPaginatedResponse */
/** @typedef {import('~/types').AdminStatusOption} AdminStatusOption */

/** @returns {object} */
export const useAdminSpedizioni = () => {
	const sanctum = useSanctumClient();
	const {
		actionLoading, actionMessage, showSuccess, showError,
		formatCurrency, formatCents, formatDate, orderStatusConfig, downloadLabel,
	} = useAdmin();

	const shipmentsData = ref({ data: [], last_page: 1, total: 0 });
	const shipmentsPage = ref(1);
	const shipmentsSearch = ref('');
	const shipmentsStatusFilter = ref('');
	const tabLoading = ref(false);
	const fetchError = ref(false);
	const activeFilter = ref('all');

	/* Mappa pill filter → valore status backend (stringa o array). */
	const filterMap = {
		all: [],
		processing: ['processing', 'label_generated', 'payed', 'completed'],
		in_transit: ['in_transit', 'out_for_delivery'],
		delivered: ['delivered'],
		problem: ['in_giacenza', 'returned', 'refused'],
	};

	const fetchShipments = async () => {
		tabLoading.value = true;
		fetchError.value = false;
		try {
			const params = new URLSearchParams();
			params.set('page', String(shipmentsPage.value));
			if (shipmentsSearch.value) params.set('search', shipmentsSearch.value);
			if (shipmentsStatusFilter.value) params.set('status', shipmentsStatusFilter.value);
			const res = await sanctum(`/api/admin/shipments?${params.toString()}`);
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

	let shipmentsSearchTimeout;
	const onShipmentsSearch = () => {
		clearTimeout(shipmentsSearchTimeout);
		shipmentsSearchTimeout = setTimeout(() => {
			shipmentsPage.value = 1;
			fetchShipments();
		}, 400);
	};

	const setActiveFilter = async (key) => {
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
	const visibleShipments = computed(() => {
		const all = shipmentsData.value.data || [];
		const allowed = filterMap[activeFilter.value];
		if (!allowed || allowed.length === 0) return all;
		if (allowed.length === 1) return all;
		return all.filter((s) => allowed.includes(s.status));
	});

	const visibleShipmentsCount = computed(() => visibleShipments.value.length);

	/* Conteggi pill sulla pagina corrente. */
	const statusFilters = computed(() => {
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

	const paginationLabel = computed(() => `Pagina ${shipmentsPage.value} di ${shipmentsData.value.last_page || 1}`);
	const hasActiveFilters = computed(() => Boolean(shipmentsSearch.value) || activeFilter.value !== 'all');

	const resetFilters = async () => {
		shipmentsSearch.value = '';
		shipmentsStatusFilter.value = '';
		activeFilter.value = 'all';
		shipmentsPage.value = 1;
		await fetchShipments();
	};

	const changeOrderStatus = async (orderId, status) => {
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
	const shipmentTransitions = {
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

	const getAvailableStatuses = (currentStatus) => {
		const allStatuses = [
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

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 3: Admin Utenti (ex useAdminUtenti)
// state + fetch + filtri pagina /account/amministrazione/utenti
// Gestisce anche le richieste Pro (/pro-requests).
// ─────────────────────────────────────────────────────────────────────────────
export const useAdminUtenti = () => {
	const sanctum = useSanctumClient();
	const { actionLoading, actionMessage, showSuccess, showError, formatDate, proRequestStatusConfig } = useAdmin();

	const activeSubTab = ref('users');
	const showDeleteConfirm = ref(false);
	const deleteTargetUser = ref(null);

	/* === UTENTI === */
	const usersData = ref([]);
	const usersSearch = ref('');
	const usersRoleFilter = ref('');
	const hasUserFilters = computed(() => Boolean(usersSearch.value || usersRoleFilter.value));

	const fetchUsers = async () => {
		try {
			const res = await sanctum('/api/admin/users');
			usersData.value = res?.data || res || [];
		} catch { usersData.value = []; }
	};

	const unverifiedUsers = computed(() => usersData.value?.filter(u => !u.email_verified_at) || []);

	const filteredUsers = computed(() => {
		let list = usersData.value;
		if (usersRoleFilter.value) {
			list = list.filter(u => {
				if (usersRoleFilter.value === 'User') return !u.role || u.role === 'User';
				return u.role === usersRoleFilter.value;
			});
		}
		if (usersSearch.value) {
			const s = usersSearch.value.toLowerCase();
			list = list.filter(u =>
				(u.name + ' ' + u.surname).toLowerCase().includes(s) ||
				u.email?.toLowerCase().includes(s)
			);
		}
		return list;
	});

	const resetUserFilters = () => {
		usersSearch.value = '';
		usersRoleFilter.value = '';
	};

	const approveAccount = async (id) => {
		actionLoading.value = id;
		try {
			await sanctum(`/api/admin/users/${id}/approve`, { method: 'PATCH' });
			showSuccess('Account approvato e email verificata.');
			await fetchUsers();
		} catch (e) { showError(e, "Errore durante l'approvazione account."); }
		finally { actionLoading.value = null; }
	};

	const askDeleteAccount = (user) => {
		deleteTargetUser.value = user;
		showDeleteConfirm.value = true;
	};

	const deleteAccount = async () => {
		const id = deleteTargetUser.value?.id;
		if (!id) return;
		actionLoading.value = id;
		try {
			await sanctum(`/api/admin/users/${id}`, { method: 'DELETE' });
			showSuccess('Account eliminato correttamente.');
			showDeleteConfirm.value = false;
			deleteTargetUser.value = null;
			await fetchUsers();
		} catch (e) { showError(e, "Errore durante l'eliminazione account."); }
		finally { actionLoading.value = null; }
	};

	const showRoleConfirm = ref(false);
	const roleChangeData = ref({ userId: null, newRole: '', userName: '', currentRole: '' });

	const askRoleChange = (user, newRole) => {
		if (newRole === (user.role || 'User')) return;
		roleChangeData.value = {
			userId: user.id,
			newRole,
			userName: `${user.name} ${user.surname}`,
			currentRole: user.role || 'User',
		};
		showRoleConfirm.value = true;
	};

	const changeUserRole = async () => {
		const { userId, newRole } = roleChangeData.value;
		actionLoading.value = `role-${userId}`;
		try {
			await sanctum(`/api/admin/users/${userId}/role`, { method: 'PATCH', body: { role: newRole } });
			showSuccess(`Ruolo aggiornato a '${newRole}'.`);
			showRoleConfirm.value = false;
			await fetchUsers();
		} catch (e) { showError(e, "Errore durante l'aggiornamento ruolo."); }
		finally { actionLoading.value = null; }
	};

	/* === RICHIESTE PRO === */
	const proRequests = ref([]);

	const fetchProRequests = async () => {
		try {
			const res = await sanctum('/api/admin/pro-requests');
			proRequests.value = res?.data || res || [];
		} catch { proRequests.value = []; }
	};

	const approveProRequest = async (id) => {
		actionLoading.value = `pro-${id}`;
		try {
			await sanctum(`/api/admin/pro-requests/${id}/approve`, { method: 'PATCH' });
			showSuccess("Richiesta Pro approvata. L'utente e' ora Partner Pro.");
			await fetchProRequests();
		} catch (e) { showError(e, "Errore durante l'approvazione."); }
		finally { actionLoading.value = null; }
	};

	const rejectProRequest = async (id) => {
		actionLoading.value = `pro-${id}`;
		try {
			await sanctum(`/api/admin/pro-requests/${id}/reject`, { method: 'PATCH' });
			showSuccess('Richiesta Pro rifiutata.');
			await fetchProRequests();
		} catch (e) { showError(e, "Errore durante il rifiuto."); }
		finally { actionLoading.value = null; }
	};

	const pendingProRequestsCount = computed(() => proRequests.value?.filter(r => r.status === 'pending')?.length || 0);

	return {
		// State
		activeSubTab, showDeleteConfirm, deleteTargetUser,
		usersData, usersSearch, usersRoleFilter,
		showRoleConfirm, roleChangeData, proRequests,
		// Computed
		hasUserFilters, unverifiedUsers, filteredUsers, pendingProRequestsCount,
		// Actions
		fetchUsers, resetUserFilters, approveAccount,
		askDeleteAccount, deleteAccount, askRoleChange, changeUserRole,
		fetchProRequests, approveProRequest, rejectProRequest,
		// From useAdmin
		actionLoading, actionMessage, showSuccess, showError,
		formatDate, proRequestStatusConfig,
	};
};
