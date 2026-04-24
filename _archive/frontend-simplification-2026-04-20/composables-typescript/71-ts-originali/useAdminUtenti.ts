import type { AdminRoleChangeData, User } from '~/types'

interface AdminUser extends User {
	[key: string]: unknown
}

interface ProRequest {
	id: number
	status: 'pending' | 'approved' | 'rejected' | string
	user?: AdminUser
	[key: string]: unknown
}

export const useAdminUtenti = () => {
	const sanctum = useSanctumClient();
	const { actionLoading, actionMessage, showSuccess, showError, formatDate, proRequestStatusConfig } = useAdmin();

	const activeSubTab = ref<string>('users');
	const showDeleteConfirm = ref<boolean>(false);
	const deleteTargetUser = ref<AdminUser | null>(null);

	/* === UTENTI === */
	const usersData = ref<AdminUser[]>([]);
	const usersSearch = ref<string>('');
	const usersRoleFilter = ref<string>('');
	const hasUserFilters = computed<boolean>(() => Boolean(usersSearch.value || usersRoleFilter.value));

	const fetchUsers = async (): Promise<void> => {
		try {
			const res = await sanctum('/api/admin/users') as { data?: AdminUser[] } | AdminUser[] | null;
			if (res && typeof res === 'object' && !Array.isArray(res) && Array.isArray(res.data)) {
				usersData.value = res.data;
			} else if (Array.isArray(res)) {
				usersData.value = res;
			} else {
				usersData.value = [];
			}
		} catch { usersData.value = []; }
	};

	const unverifiedUsers = computed<AdminUser[]>(() => usersData.value?.filter(u => !u.email_verified_at) || []);

	const filteredUsers = computed<AdminUser[]>(() => {
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

	const resetUserFilters = (): void => {
		usersSearch.value = '';
		usersRoleFilter.value = '';
	};

	const approveAccount = async (id: number): Promise<void> => {
		actionLoading.value = id;
		try {
			await sanctum(`/api/admin/users/${id}/approve`, { method: 'PATCH' });
			showSuccess('Account approvato e email verificata.');
			await fetchUsers();
		} catch (e) { showError(e, "Errore durante l'approvazione account."); }
		finally { actionLoading.value = null; }
	};

	const askDeleteAccount = (user: AdminUser): void => {
		deleteTargetUser.value = user;
		showDeleteConfirm.value = true;
	};

	const deleteAccount = async (): Promise<void> => {
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

	const showRoleConfirm = ref<boolean>(false);
	const roleChangeData = ref<AdminRoleChangeData>({ userId: null, newRole: '', userName: '', currentRole: '' });

	const askRoleChange = (user: AdminUser, newRole: string): void => {
		if (newRole === (user.role || 'User')) return;
		roleChangeData.value = {
			userId: user.id,
			newRole,
			userName: `${user.name} ${user.surname}`,
			currentRole: user.role || 'User',
		};
		showRoleConfirm.value = true;
	};

	const changeUserRole = async (): Promise<void> => {
		const { userId, newRole } = roleChangeData.value;
		if (userId == null) return;
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
	const proRequests = ref<ProRequest[]>([]);

	const fetchProRequests = async (): Promise<void> => {
		try {
			const res = await sanctum('/api/admin/pro-requests') as { data?: ProRequest[] } | ProRequest[] | null;
			if (res && typeof res === 'object' && !Array.isArray(res) && Array.isArray(res.data)) {
				proRequests.value = res.data;
			} else if (Array.isArray(res)) {
				proRequests.value = res;
			} else {
				proRequests.value = [];
			}
		} catch { proRequests.value = []; }
	};

	const approveProRequest = async (id: number): Promise<void> => {
		actionLoading.value = `pro-${id}`;
		try {
			await sanctum(`/api/admin/pro-requests/${id}/approve`, { method: 'PATCH' });
			showSuccess("Richiesta Pro approvata. L'utente è ora Partner Pro.");
			await fetchProRequests();
		} catch (e) { showError(e, "Errore durante l'approvazione."); }
		finally { actionLoading.value = null; }
	};

	const rejectProRequest = async (id: number): Promise<void> => {
		actionLoading.value = `pro-${id}`;
		try {
			await sanctum(`/api/admin/pro-requests/${id}/reject`, { method: 'PATCH' });
			showSuccess('Richiesta Pro rifiutata.');
			await fetchProRequests();
		} catch (e) { showError(e, "Errore durante il rifiuto."); }
		finally { actionLoading.value = null; }
	};

	const pendingProRequestsCount = computed<number>(() => proRequests.value?.filter(r => r.status === 'pending')?.length || 0);

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
