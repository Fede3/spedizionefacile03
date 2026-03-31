/**
 * COMPOSABLE: useAdminUtenti
 * SCOPO: Logica di business per la pagina admin utenti e richieste Pro.
 * DOVE SI USA: pages/account/amministrazione/utenti.vue
 */
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
