<!--
  FILE: pages/account/amministrazione/utenti.vue
  SCOPO: Pannello admin — gestione utenti registrati e richieste Partner Pro.
         Due sotto-tab: "Utenti" (lista, ricerca, filtri ruolo, approvazione email,
         cambio ruolo, eliminazione) e "Richieste Pro" (approvazione/rifiuto).
  API: GET /api/admin/users — lista utenti,
       PATCH /api/admin/users/{id}/approve — approva account (verifica email),
       DELETE /api/admin/users/{id} — elimina account,
       PATCH /api/admin/users/{id}/role — cambio ruolo,
       GET /api/admin/pro-requests — lista richieste Pro,
       PATCH /api/admin/pro-requests/{id}/approve — approva richiesta Pro,
       PATCH /api/admin/pro-requests/{id}/reject — rifiuta richiesta Pro.
  COMPONENTI: nessun componente custom.
  ROUTE: /account/amministrazione/utenti (middleware sanctum:auth + admin).

  DATI IN INGRESSO:
    - usersData (da fetchUsers) — lista completa utenti.
    - proRequests (da fetchProRequests) — lista richieste Partner Pro.
    - useAdmin() — composable utility admin.

  DATI IN USCITA:
    - PATCH/DELETE su utenti e richieste Pro.

  VINCOLI:
    - Solo utenti Admin (middleware admin).
    - L'eliminazione richiede conferma con window.confirm().
    - Il badge "Richieste Pro" mostra il conteggio di quelle in attesa.

  ERRORI TIPICI:
    - Eliminazione admin stesso → il backend dovrebbe impedirlo.
    - Errore di rete durante cambio ruolo → messaggio errore.

  PUNTI DI MODIFICA SICURI:
    - Aggiungere colonne alla tabella utenti: modificare <thead>/<tbody>.
    - Aggiungere nuovi ruoli: modificare <select> ruolo e filtro.
    - Aggiungere campi alle richieste Pro: modificare il template card.

  COLLEGAMENTI:
    - composables/useAdmin.js → utility condivise admin.
    - pages/account/account-pro.vue → pagina utente per richiedere Partner Pro.
-->
<script setup>
definePageMeta({
	middleware: ["sanctum:auth", "admin"],
});

const sanctum = useSanctumClient();
const { actionLoading, actionMessage, showSuccess, showError, formatDate, proRequestStatusConfig } = useAdmin();

/* Sub-tab: utenti o richieste pro */
const activeSubTab = ref("users");

/* === UTENTI === */
const usersData = ref([]);
const usersSearch = ref("");
const usersRoleFilter = ref("");

const fetchUsers = async () => {
	try {
		const res = await sanctum("/api/admin/users");
		usersData.value = res?.data || res || [];
	} catch (e) { usersData.value = []; }
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

const approveAccount = async (id) => {
	actionLoading.value = id;
	console.log(`[AUDIT] Admin approving account #${id} (email verification)`);
	try {
		await sanctum(`/api/admin/users/${id}/approve`, { method: "PATCH" });
		showSuccess("Account approvato e email verificata.");
		await fetchUsers();
	} catch (e) { showError(e, "Errore durante l'approvazione account."); }
	finally { actionLoading.value = null; }
};

const deleteAccount = async (id) => {
	if (!window.confirm("Confermi l'eliminazione definitiva di questo account?")) return;
	actionLoading.value = id;
	console.log(`[AUDIT] Admin deleting account #${id}`);
	try {
		await sanctum(`/api/admin/users/${id}`, { method: "DELETE" });
		showSuccess("Account eliminato correttamente.");
		await fetchUsers();
	} catch (e) { showError(e, "Errore durante l'eliminazione account."); }
	finally { actionLoading.value = null; }
};

// Role change confirmation
const showRoleConfirm = ref(false);
const roleChangeData = ref({ userId: null, newRole: '', userName: '', currentRole: '' });

const askRoleChange = (user, newRole) => {
	if (newRole === (user.role || 'User')) return; // No change
	roleChangeData.value = {
		userId: user.id,
		newRole: newRole,
		userName: `${user.name} ${user.surname}`,
		currentRole: user.role || 'User',
	};
	showRoleConfirm.value = true;
};

const changeUserRole = async () => {
	const { userId, newRole, userName, currentRole } = roleChangeData.value;
	actionLoading.value = `role-${userId}`;
	console.log(`[AUDIT] Admin changing user #${userId} (${userName}) role: ${currentRole} → ${newRole}`);
	try {
		await sanctum(`/api/admin/users/${userId}/role`, { method: "PATCH", body: { role: newRole } });
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
		const res = await sanctum("/api/admin/pro-requests");
		proRequests.value = res?.data || res || [];
	} catch (e) { proRequests.value = []; }
};

const approveProRequest = async (id) => {
	actionLoading.value = `pro-${id}`;
	console.log(`[AUDIT] Admin approving Pro request #${id}`);
	try {
		await sanctum(`/api/admin/pro-requests/${id}/approve`, { method: "PATCH" });
		showSuccess("Richiesta Pro approvata. L'utente e' ora Partner Pro.");
		await fetchProRequests();
	} catch (e) { showError(e, "Errore durante l'approvazione."); }
	finally { actionLoading.value = null; }
};

const rejectProRequest = async (id) => {
	actionLoading.value = `pro-${id}`;
	console.log(`[AUDIT] Admin rejecting Pro request #${id}`);
	try {
		await sanctum(`/api/admin/pro-requests/${id}/reject`, { method: "PATCH" });
		showSuccess("Richiesta Pro rifiutata.");
		await fetchProRequests();
	} catch (e) { showError(e, "Errore durante il rifiuto."); }
	finally { actionLoading.value = null; }
};

const pendingProRequestsCount = computed(() => proRequests.value?.filter(r => r.status === 'pending')?.length || 0);

onMounted(() => {
	fetchUsers();
	fetchProRequests();
});
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container">
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866] font-medium">Il tuo account</NuxtLink>
				<span class="mx-[8px] text-[#C8CCD0]">/</span>
				<span class="font-semibold text-[#252B42]">Utenti</span>
			</div>

			<NuxtLink to="/account" class="inline-flex items-center gap-[6px] text-[0.8125rem] text-[#095866] hover:underline font-medium mb-[20px]">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/></svg>
				Torna all'account
			</NuxtLink>

			<h1 class="text-[1.75rem] font-bold text-[#252B42] mb-[24px]">Utenti</h1>

			<!-- Action message -->
			<div
				v-if="actionMessage"
				:class="[
					'mb-[20px] px-[16px] py-[12px] rounded-[12px] text-[0.875rem] font-medium flex items-center gap-[8px]',
					actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200',
				]">
				<svg v-if="actionMessage.type === 'success'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg>
				<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
				{{ actionMessage.text }}
			</div>

			<!-- Sub-tab toggle -->
			<div class="flex gap-[4px] mb-[24px] bg-[#F0F0F0] rounded-[12px] p-[4px] w-fit">
				<button
					@click="activeSubTab = 'users'"
					:class="[
						'flex items-center gap-[6px] px-[14px] py-[10px] rounded-[8px] text-[0.8125rem] font-medium transition-all cursor-pointer whitespace-nowrap',
						activeSubTab === 'users' ? 'bg-white text-[#095866] shadow-sm' : 'text-[#737373] hover:text-[#404040]',
					]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/></svg>
					Utenti
				</button>
				<button
					@click="activeSubTab = 'pro_requests'"
					:class="[
						'flex items-center gap-[6px] px-[14px] py-[10px] rounded-[8px] text-[0.8125rem] font-medium transition-all cursor-pointer whitespace-nowrap',
						activeSubTab === 'pro_requests' ? 'bg-white text-[#095866] shadow-sm' : 'text-[#737373] hover:text-[#404040]',
					]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"/></svg>
					Richieste Pro
					<span v-if="pendingProRequestsCount" class="ml-[2px] w-[20px] h-[20px] rounded-full bg-purple-500 text-white text-[0.625rem] flex items-center justify-center font-bold">
						{{ pendingProRequestsCount }}
					</span>
				</button>
			</div>

			<!-- ===== USERS SUB-TAB ===== -->
			<div v-if="activeSubTab === 'users'">
				<div class="flex flex-wrap gap-[12px] mb-[20px]">
					<div class="relative flex-1 min-w-[200px]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="absolute left-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#737373]" fill="currentColor"><path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/></svg>
						<input v-model="usersSearch" type="text" placeholder="Cerca per nome, email..." class="w-full pl-[40px] pr-[14px] py-[10px] bg-white border border-[#E9EBEC] rounded-[50px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
					</div>
					<select v-model="usersRoleFilter" class="px-[14px] py-[10px] bg-white border border-[#E9EBEC] rounded-[50px] text-[0.875rem] focus:border-[#095866] focus:outline-none cursor-pointer">
						<option value="">Tutti i ruoli</option>
						<option value="User">Cliente</option>
						<option value="Partner Pro">Partner Pro</option>
						<option value="Admin">Admin</option>
					</select>
				</div>

				<div class="grid grid-cols-1 account-pages:grid-cols-3 gap-[16px] mb-[24px]">
					<div class="bg-white rounded-[16px] p-[20px] border border-[#E9EBEC] shadow-sm">
						<div class="flex items-center gap-[8px] mb-[8px]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[#252B42]" fill="currentColor"><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/></svg>
							<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Totale utenti</p>
						</div>
						<p class="text-[1.75rem] font-bold text-[#252B42]">{{ usersData.length }}</p>
					</div>
					<div class="bg-white rounded-[16px] p-[20px] border border-[#E9EBEC] shadow-sm">
						<div class="flex items-center gap-[8px] mb-[8px]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-emerald-600" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg>
							<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Verificati</p>
						</div>
						<p class="text-[1.75rem] font-bold text-emerald-600">{{ usersData.filter(u => u.email_verified_at).length }}</p>
					</div>
					<div class="bg-white rounded-[16px] p-[20px] border border-[#E9EBEC] shadow-sm">
						<div class="flex items-center gap-[8px] mb-[8px]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-amber-600" fill="currentColor"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/></svg>
							<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Non verificati</p>
						</div>
						<p class="text-[1.75rem] font-bold text-amber-600">{{ unverifiedUsers.length }}</p>
					</div>
				</div>

				<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
					<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px]">Gestione account registrati</h2>

					<div v-if="!filteredUsers?.length" class="text-center py-[48px] text-[#737373]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[40px] h-[40px] text-[#C8CCD0] mx-auto mb-[12px]" fill="currentColor"><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/></svg>
						<p>Nessun account trovato.</p>
					</div>

					<div v-else class="overflow-x-auto">
						<table class="w-full text-[0.875rem]">
							<thead>
								<tr class="border-b border-[#E9EBEC] text-left text-[#737373]">
									<th class="pb-[12px] font-medium">Nome</th>
									<th class="pb-[12px] font-medium">Email</th>
									<th class="pb-[12px] font-medium">Telefono</th>
									<th class="pb-[12px] font-medium">Ruolo</th>
									<th class="pb-[12px] font-medium">Codice Ref.</th>
									<th class="pb-[12px] font-medium">Stato</th>
									<th class="pb-[12px] font-medium">Registrazione</th>
									<th class="pb-[12px] font-medium text-right">Azioni</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="(u, idx) in filteredUsers" :key="u.id" :class="['border-b border-[#F0F0F0] last:border-0', idx % 2 === 1 ? 'bg-[#FAFBFC]' : '']">
									<td class="py-[14px] text-[#252B42] font-medium">{{ u.name }} {{ u.surname }}</td>
									<td class="py-[14px] text-[#737373]">{{ u.email }}</td>
									<td class="py-[14px] text-[#737373] text-[0.8125rem]">{{ u.telephone_number || '\u2014' }}</td>
									<td class="py-[14px]">
										<select :value="u.role || 'User'" @change="askRoleChange(u, $event.target.value); $event.target.value = u.role || 'User'" :disabled="actionLoading === `role-${u.id}`" class="px-[8px] py-[4px] rounded-[6px] text-[0.75rem] font-medium border border-[#E9EBEC] cursor-pointer bg-white focus:border-[#095866] focus:outline-none">
											<option value="User">Cliente</option>
											<option value="Partner Pro">Partner Pro</option>
											<option value="Admin">Admin</option>
										</select>
									</td>
									<td class="py-[14px]">
										<span v-if="u.referral_code" class="font-mono text-[0.75rem] bg-[#F0F0F0] px-[6px] py-[2px] rounded">{{ u.referral_code }}</span>
										<span v-else class="text-[#C8CCD0]">&mdash;</span>
									</td>
									<td class="py-[14px]">
										<span :class="u.email_verified_at ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'" class="inline-flex items-center gap-[4px] px-[8px] py-[2px] rounded-full text-[0.6875rem] font-medium">
											<svg v-if="u.email_verified_at" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[12px] h-[12px]" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg>
											<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[12px] h-[12px]" fill="currentColor"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/></svg>
											{{ u.email_verified_at ? 'Verificato' : 'Non verificato' }}
										</span>
									</td>
									<td class="py-[14px] text-[#737373] text-[0.8125rem]">{{ formatDate(u.created_at) }}</td>
									<td class="py-[14px] text-right">
										<div class="flex justify-end gap-[6px]">
											<button v-if="!u.email_verified_at" @click="approveAccount(u.id)" :disabled="actionLoading === u.id" class="px-[10px] py-[6px] rounded-[8px] bg-[#095866] text-white text-[0.75rem] cursor-pointer disabled:opacity-60 flex items-center gap-[4px]">
												<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg> Approva
											</button>
											<button @click="deleteAccount(u.id)" :disabled="actionLoading === u.id" class="px-[10px] py-[6px] rounded-[8px] bg-red-600 text-white text-[0.75rem] cursor-pointer disabled:opacity-60 flex items-center gap-[4px]">
												<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg> Elimina
											</button>
										</div>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<!-- ===== PRO REQUESTS SUB-TAB ===== -->
			<div v-if="activeSubTab === 'pro_requests'">
				<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
					<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px]">Richieste Partner Pro</h2>

					<div v-if="!proRequests?.length" class="text-center py-[48px] text-[#737373]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[40px] h-[40px] text-[#C8CCD0] mx-auto mb-[12px]" fill="currentColor"><path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"/></svg>
						<p>Nessuna richiesta Partner Pro.</p>
					</div>

					<div v-else class="space-y-[12px]">
						<div v-for="pr in proRequests" :key="pr.id" class="p-[18px] rounded-[14px] border border-[#E9EBEC] hover:border-[#D0D0D0] transition-colors">
							<div class="flex flex-col desktop:flex-row desktop:items-start justify-between gap-[12px]">
								<div class="flex-1">
									<div class="flex items-center gap-[10px] mb-[6px]">
										<span class="text-[0.9375rem] font-bold text-[#252B42]">{{ pr.user?.name }} {{ pr.user?.surname }}</span>
										<span :class="['inline-flex items-center gap-[4px] px-[10px] py-[3px] rounded-full text-[0.6875rem] font-medium', proRequestStatusConfig[pr.status]?.bg || 'bg-gray-50', proRequestStatusConfig[pr.status]?.text || 'text-gray-700']">
											<svg v-if="pr.status === 'pending'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[12px] h-[12px]" fill="currentColor"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/></svg>
											<svg v-else-if="pr.status === 'approved'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[12px] h-[12px]" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg>
											<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[12px] h-[12px]" fill="currentColor"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12C4,13.85 4.63,15.55 5.68,16.91L16.91,5.68C15.55,4.63 13.85,4 12,4M12,20A8,8 0 0,0 20,12C20,10.15 19.37,8.45 18.32,7.09L7.09,18.32C8.45,19.37 10.15,20 12,20Z"/></svg>
											{{ proRequestStatusConfig[pr.status]?.label || pr.status }}
										</span>
									</div>
									<p class="text-[0.8125rem] text-[#737373]">{{ pr.user?.email }}</p>
									<div class="mt-[10px] grid grid-cols-1 desktop:grid-cols-2 gap-[8px]">
										<div v-if="pr.company_name" class="text-[0.8125rem]">
											<span class="text-[#737373]">Azienda:</span>
											<span class="text-[#252B42] font-medium ml-[4px]">{{ pr.company_name }}</span>
										</div>
										<div v-if="pr.vat_number" class="text-[0.8125rem]">
											<span class="text-[#737373]">P.IVA:</span>
											<span class="font-mono text-[#252B42] ml-[4px]">{{ pr.vat_number }}</span>
										</div>
									</div>
									<div v-if="pr.message" class="mt-[8px] bg-[#F8F9FB] rounded-[8px] p-[10px]">
										<p class="text-[0.8125rem] text-[#404040]">{{ pr.message }}</p>
									</div>
									<p class="text-[0.75rem] text-[#737373] mt-[6px]">Richiesta: {{ formatDate(pr.created_at) }}</p>
								</div>

								<div v-if="pr.status === 'pending'" class="flex items-center gap-[8px] shrink-0">
									<button @click="approveProRequest(pr.id)" :disabled="actionLoading === `pro-${pr.id}`" class="px-[16px] py-[8px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-[8px] text-[0.8125rem] font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-[4px]">
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg> {{ actionLoading === `pro-${pr.id}` ? "..." : "Approva" }}
									</button>
									<button @click="rejectProRequest(pr.id)" :disabled="actionLoading === `pro-${pr.id}`" class="px-[16px] py-[8px] bg-red-50 hover:bg-red-100 text-red-700 rounded-[8px] text-[0.8125rem] font-medium transition-colors cursor-pointer border border-red-200 disabled:opacity-50">
										Rifiuta
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Role change confirmation modal -->
		<UModal v-model:open="showRoleConfirm" :dismissible="true" :close="false">
			<template #title>
				<h3 class="text-[1.125rem] font-bold text-[#252B42]">Conferma cambio ruolo</h3>
			</template>
			<template #body>
				<p class="text-[0.9375rem] text-[#737373] leading-[1.6] mb-[12px]">
					Stai per cambiare il ruolo di <strong class="text-[#252B42]">{{ roleChangeData.userName }}</strong>:
				</p>
				<div class="flex items-center gap-[12px] justify-center py-[12px]">
					<span class="px-[12px] py-[6px] bg-gray-100 text-gray-700 rounded-[8px] text-[0.875rem] font-semibold">{{ roleChangeData.currentRole }}</span>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-[#095866]" fill="currentColor"><path d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z"/></svg>
					<span class="px-[12px] py-[6px] bg-[#095866] text-white rounded-[8px] text-[0.875rem] font-semibold">{{ roleChangeData.newRole }}</span>
				</div>
				<p class="text-[0.8125rem] text-amber-700 bg-amber-50 border border-amber-200 rounded-[8px] p-[10px] mt-[12px]">
					<strong>Attenzione:</strong> Questa azione modificherà i permessi dell'utente.
				</p>
			</template>
			<template #footer>
				<div class="flex justify-end gap-[10px]">
					<button type="button" @click="showRoleConfirm = false" class="inline-flex items-center gap-[6px] px-[20px] py-[10px] rounded-[50px] border border-[#E9EBEC] text-[#737373] hover:bg-[#F8F9FB] transition text-[0.875rem] font-medium cursor-pointer">Annulla</button>
					<button type="button" @click="changeUserRole" :disabled="actionLoading" class="inline-flex items-center gap-[6px] px-[20px] py-[10px] rounded-[50px] bg-[#095866] text-white hover:bg-[#074a56] transition text-[0.875rem] font-semibold disabled:opacity-60 cursor-pointer">
						{{ actionLoading ? 'Aggiornamento...' : 'Conferma' }}
					</button>
				</div>
			</template>
		</UModal>
	</section>
</template>
