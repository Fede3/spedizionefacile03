/**
 * @file useAdminUtenti — gestione richieste Pro lato admin (sub-tab della pagina utenti).
 *
 * Esposto: `activeSubTab`, `proRequests`, `pendingProRequestsCount`, `fetchProRequests`,
 * `approveProRequest`, `rejectProRequest`, `proRequestStatusConfig`.
 *
 * Usato in `pages/account/amministrazione/utenti.vue`. Il composable era stato
 * rimosso durante il cleanup "orphan" del 27 apr: in realta' la pagina utenti
 * lo importa e crashava in 500 SSR ("useAdminUtenti is not defined").
 */
import { computed, ref } from 'vue';

export const proRequestStatusConfig = {
	pending: { label: 'In attesa', tone: 'warning' },
	approved: { label: 'Approvata', tone: 'success' },
	rejected: { label: 'Rifiutata', tone: 'danger' },
};

type ProRequestStatus = keyof typeof proRequestStatusConfig
type ProRequest = {
	id?: string | number
	status?: ProRequestStatus | string
	[key: string]: unknown
}
type ApiListResponse<T> = { data?: T[] }
const unwrapList = <T>(response: ApiListResponse<T> | T[]): T[] =>
	Array.isArray(response) ? response : Array.isArray(response.data) ? response.data : []

export function useAdminUtenti() {
	const sanctum = useSanctumClient();
	// Default tab "users" deve combaciare col v-if del template (non "utenti").
	const activeSubTab = ref('users');
	const proRequests = ref<ProRequest[]>([]);

	const pendingProRequestsCount = computed(
		() => proRequests.value.filter((r) => (r?.status || 'pending') === 'pending').length,
	);

	const fetchProRequests = async () => {
		try {
			proRequests.value = unwrapList(await sanctum<ApiListResponse<ProRequest> | ProRequest[]>('/api/admin/pro-requests'));
		} catch {
			proRequests.value = [];
		}
	};

	const approveProRequest = async (id: string | number | null | undefined) => {
		if (!id) return false;
		try {
			await sanctum(`/api/admin/pro-requests/${id}/approve`, { method: 'PATCH' });
			await fetchProRequests();
			return true;
		} catch {
			return false;
		}
	};

	const rejectProRequest = async (id: string | number | null | undefined, reason = '') => {
		if (!id) return false;
		try {
			await sanctum(`/api/admin/pro-requests/${id}/reject`, {
				method: 'PATCH',
				body: { reason },
			});
			await fetchProRequests();
			return true;
		} catch {
			return false;
		}
	};

	return {
		activeSubTab,
		proRequests,
		pendingProRequestsCount,
		fetchProRequests,
		approveProRequest,
		rejectProRequest,
		proRequestStatusConfig,
	};
}
