<!--
  FILE: pages/account/amministrazione/utenti.vue
  SCOPO: Pannello admin — gestione utenti registrati e richieste Partner Pro.
         Due sotto-tab: "Utenti" (lista, ricerca, filtri ruolo, approvazione email,
         cambio ruolo, eliminazione) e "Richieste Pro" (approvazione/rifiuto).
  API: GET /api/admin/users, PATCH /api/admin/users/{id}/approve,
       DELETE /api/admin/users/{id}, PATCH /api/admin/users/{id}/role,
       GET /api/admin/pro-requests, PATCH /api/admin/pro-requests/{id}/approve,
       PATCH /api/admin/pro-requests/{id}/reject.
  ROUTE: /account/amministrazione/utenti (middleware sanctum:auth + admin).
  COMPOSABLE: useAdminUtenti — logica business, fetch, filtri, CRUD utenti, richieste Pro.
-->
<script setup>
definePageMeta({
	middleware: ['app-auth', 'admin'],
});

useSeoMeta({
	title: 'Utenti admin | SpediamoFacile',
	ogTitle: 'Utenti admin | SpediamoFacile',
	description: 'Consulta utenti, ruoli e richieste account dal pannello admin SpediamoFacile.',
	ogDescription: 'Gestione utenti e ruoli nel pannello admin SpediamoFacile.',
});

const {
	activeSubTab,
	showDeleteConfirm,
	deleteTargetUser,
	usersData,
	usersSearch,
	usersRoleFilter,
	showRoleConfirm,
	roleChangeData,
	proRequests,
	hasUserFilters,
	unverifiedUsers,
	filteredUsers,
	pendingProRequestsCount,
	fetchUsers,
	resetUserFilters,
	approveAccount,
	askDeleteAccount,
	deleteAccount,
	askRoleChange,
	changeUserRole,
	fetchProRequests,
	approveProRequest,
	rejectProRequest,
	actionLoading,
	actionMessage,
	formatDate,
	proRequestStatusConfig,
} = useAdminUtenti();

onMounted(() => {
	fetchUsers();
	fetchProRequests();
});
</script>

<template>
	<section class="min-h-[600px] py-[32px] tablet:py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Admin"
				title="Utenti"
				description="Ricerca, filtri, ruoli e richieste Partner Pro nella stessa shell amministrativa."
				back-to="/account/amministrazione"
				back-label="Torna al pannello admin"
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Amministrazione', to: '/account/amministrazione' },
					{ label: 'Utenti' },
				]" />

			<!-- Action message -->
			<div
				v-if="actionMessage"
				:class="['mb-[20px] ux-alert', actionMessage.type === 'success' ? 'ux-alert--success' : 'ux-alert--critical']">
				<svg
					v-if="actionMessage.type === 'success'"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					class="ux-alert__icon"
					fill="currentColor">
					<path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" />
				</svg>
				<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="ux-alert__icon" fill="currentColor">
					<path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
				</svg>
				<div>{{ actionMessage.text }}</div>
			</div>

			<!-- Sub-tab toggle -->
			<div class="mb-[24px]">
				<div class="sf-account-shell-tabs w-full tablet:w-fit">
					<button
						type="button"
						@click="activeSubTab = 'users'"
						:class="['sf-account-shell-tabs__item', activeSubTab === 'users' && 'sf-account-shell-tabs__item--active']">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor">
							<path
								d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
						</svg>
						Utenti
					</button>
					<button
						type="button"
						@click="activeSubTab = 'pro_requests'"
						:class="['sf-account-shell-tabs__item', activeSubTab === 'pro_requests' && 'sf-account-shell-tabs__item--active']">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor">
							<path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z" />
						</svg>
						Richieste Pro
						<span
							v-if="pendingProRequestsCount"
							class="sf-account-meta-pill sf-account-meta-pill--muted ml-[2px] !min-h-[20px] !px-[8px] !py-[3px] !text-[0.625rem]">
							{{ pendingProRequestsCount }}
						</span>
					</button>
				</div>
			</div>

			<!-- ===== USERS SUB-TAB ===== -->
			<div v-if="activeSubTab === 'users'">
				<!-- Toolbar -->
				<div class="mb-[20px] rounded-[12px] border border-[#E9EBEC] bg-[#F8FAFB] p-[14px] tablet:p-[18px] shadow-sm">
					<div class="flex flex-col gap-[14px] desktop:flex-row desktop:items-center desktop:justify-between">
						<div>
							<p class="text-[0.75rem] font-semibold uppercase tracking-[0.6px] text-[#6B7280]">Toolbar utenti</p>
							<h2 class="mt-[4px] text-[1rem] font-semibold text-[#252B42]">Ricerca, filtri e azioni rapide</h2>
						</div>
						<div class="flex flex-wrap items-center gap-[8px]">
							<span class="sf-account-meta-pill">{{ filteredUsers.length }} risultati</span>
							<button v-if="hasUserFilters" type="button" @click="resetUserFilters" class="btn-secondary btn-compact">Azzera filtri</button>
						</div>
					</div>
					<div class="mt-[14px] grid grid-cols-1 gap-[12px] tablet:grid-cols-[minmax(0,1fr)_220px] desktop:grid-cols-[minmax(0,1fr)_240px]">
						<div class="relative min-w-0">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								class="absolute left-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#737373]"
								fill="currentColor">
								<path
									d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
							</svg>
							<input v-model="usersSearch" type="text" placeholder="Cerca per nome, email..." class="form-input pl-[40px]" />
						</div>
						<select v-model="usersRoleFilter" class="form-input cursor-pointer">
							<option value="">Tutti i ruoli</option>
							<option value="User">Cliente</option>
							<option value="Partner Pro">Partner Pro</option>
							<option value="Admin">Admin</option>
						</select>
					</div>
				</div>

				<!-- Stats cards -->
				<div class="grid grid-cols-1 tablet:grid-cols-3 gap-[12px] mb-[22px]">
					<div class="bg-white rounded-[12px] p-[16px] tablet:p-[18px] border border-[#E9EBEC] shadow-sm">
						<div class="flex items-center gap-[8px] mb-[8px]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[#252B42]" fill="currentColor">
								<path
									d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
							</svg>
							<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Totale utenti</p>
						</div>
						<p class="text-[1.75rem] font-bold text-[#252B42]">{{ usersData.length }}</p>
					</div>
					<div class="bg-white rounded-[12px] p-[16px] tablet:p-[18px] border border-[#E9EBEC] shadow-sm">
						<div class="flex items-center gap-[8px] mb-[8px]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-emerald-600" fill="currentColor">
								<path
									d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" />
							</svg>
							<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Verificati</p>
						</div>
						<p class="text-[1.75rem] font-bold text-emerald-600">{{ usersData.filter((u) => u.email_verified_at).length }}</p>
					</div>
					<div class="bg-white rounded-[12px] p-[16px] tablet:p-[18px] border border-[#E9EBEC] shadow-sm">
						<div class="flex items-center gap-[8px] mb-[8px]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-amber-600" fill="currentColor">
								<path
									d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" />
							</svg>
							<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Non verificati</p>
						</div>
						<p class="text-[1.75rem] font-bold text-amber-600">{{ unverifiedUsers.length }}</p>
					</div>
				</div>

				<!-- Users list -->
				<div class="bg-white rounded-[12px] p-[20px] tablet:p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC] overflow-hidden">
					<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px]">Gestione account registrati</h2>
					<AdminUtentiList
						:users="filteredUsers"
						:action-loading="actionLoading"
						:format-date="formatDate"
						@approve="approveAccount"
						@delete="askDeleteAccount"
						@role-change="askRoleChange" />
				</div>
			</div>

			<!-- ===== PRO REQUESTS SUB-TAB ===== -->
			<div v-if="activeSubTab === 'pro_requests'">
				<AdminProRequestsList
					:requests="proRequests"
					:pro-request-status-config="proRequestStatusConfig"
					:action-loading="actionLoading"
					:format-date="formatDate"
					@approve="approveProRequest"
					@reject="rejectProRequest" />
			</div>
		</div>

		<!-- Role change confirmation modal -->
		<UModal v-model:open="showRoleConfirm" :dismissible="true" :close="false">
			<template #title>
				<h3 class="text-[1.125rem] font-bold text-[#252B42]">Conferma cambio ruolo</h3>
			</template>
			<template #body>
				<p class="text-[0.9375rem] text-[#737373] leading-[1.6] mb-[12px]">
					Stai per cambiare il ruolo di
					<strong class="text-[#252B42]">{{ roleChangeData.userName }}</strong>
					:
				</p>
				<div class="flex items-center gap-[12px] justify-center py-[12px]">
					<span class="sf-account-meta-pill sf-account-meta-pill--muted">{{ roleChangeData.currentRole }}</span>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-[#095866]" fill="currentColor">
						<path d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z" />
					</svg>
					<span class="sf-account-meta-pill">{{ roleChangeData.newRole }}</span>
				</div>
				<p class="text-[0.8125rem] text-amber-700 bg-amber-50 border border-amber-200 rounded-[12px] p-[10px] mt-[12px]">
					<strong>Attenzione:</strong>
					Questa azione modifichera' i permessi dell'utente.
				</p>
			</template>
			<template #footer>
				<div class="flex flex-col-reverse gap-[10px] tablet:flex-row tablet:justify-end">
					<button type="button" @click="showRoleConfirm = false" class="btn-secondary btn-compact">Annulla</button>
					<button type="button" @click="changeUserRole" :disabled="actionLoading" class="btn-cta btn-compact disabled:opacity-60">
						{{ actionLoading ? 'Aggiornamento...' : 'Conferma' }}
					</button>
				</div>
			</template>
		</UModal>

		<AccountConfirmDialog
			v-model:open="showDeleteConfirm"
			title="Elimina account"
			:description="
				deleteTargetUser
					? `Stai per eliminare definitivamente l'account di ${deleteTargetUser.name} ${deleteTargetUser.surname}. L'operazione rimuove l'accesso e non si puo' annullare.`
					: ''
			"
			confirm-label="Elimina account"
			:loading="actionLoading === deleteTargetUser?.id"
			@confirm="deleteAccount" />
	</section>
</template>
