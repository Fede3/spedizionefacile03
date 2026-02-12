<script setup>
definePageMeta({
	middleware: ["sanctum:auth", "admin"],
});

const sanctum = useSanctumClient();

const activeTab = ref("withdrawals");

// Data
const withdrawalsData = ref([]);
const walletOverview = ref([]);
const referralStats = ref(null);
const usersData = ref([]);
const isLoading = ref(true);

const fetchWithdrawals = async () => {
	try {
		const res = await sanctum("/api/admin/withdrawals");
		withdrawalsData.value = res?.data || res || [];
	} catch (e) { withdrawalsData.value = []; }
};

const fetchWallet = async () => {
	try {
		const res = await sanctum("/api/admin/wallet/overview");
		walletOverview.value = res?.data || res || [];
	} catch (e) { walletOverview.value = []; }
};

const fetchReferrals = async () => {
	try {
		const res = await sanctum("/api/admin/referrals");
		referralStats.value = res;
	} catch (e) { referralStats.value = null; }
};

const fetchUsers = async () => {
	try {
		const res = await sanctum("/api/admin/users");
		usersData.value = res?.data || res || [];
	} catch (e) { usersData.value = []; }
};

onMounted(async () => {
	await Promise.all([fetchWithdrawals(), fetchWallet(), fetchReferrals(), fetchUsers()]);
	isLoading.value = false;
});

// User management
const { refresh: refreshUsers } = useSanctumFetch("/api/admin/users");

// Selected user movements
const selectedUserId = ref(null);
const selectedUserName = ref("");
const userMovements = ref([]);

const viewUserMovements = async (userId, userName) => {
	selectedUserId.value = userId;
	selectedUserName.value = userName;
	try {
		const res = await sanctum(`/api/admin/wallet/users/${userId}/movements`);
		userMovements.value = res?.data || res || [];
	} catch (e) {
		userMovements.value = [];
	}
};

const closeUserMovements = () => {
	selectedUserId.value = null;
	selectedUserName.value = "";
	userMovements.value = [];
};

// Withdrawal actions
const actionLoading = ref(null);
const actionMessage = ref(null);

const clearMessage = () => {
	setTimeout(() => { actionMessage.value = null; }, 5000);
};

const approveWithdrawal = async (id) => {
	actionLoading.value = id;
	actionMessage.value = null;
	try {
		await sanctum(`/api/admin/withdrawals/${id}/approve`, { method: "POST" });
		actionMessage.value = { type: "success", text: "Prelievo approvato con successo." };
		await fetchWithdrawals();
		clearMessage();
	} catch (e) {
		actionMessage.value = { type: "error", text: e?.response?._data?.message || e?.data?.message || "Errore durante l'approvazione." };
	} finally {
		actionLoading.value = null;
	}
};

const rejectNotes = ref("");
const rejectingId = ref(null);

const startReject = (id) => {
	rejectingId.value = id;
	rejectNotes.value = "";
};

const cancelReject = () => {
	rejectingId.value = null;
	rejectNotes.value = "";
};

const confirmReject = async (id) => {
	actionLoading.value = id;
	actionMessage.value = null;
	try {
		await sanctum(`/api/admin/withdrawals/${id}/reject`, {
			method: "POST",
			body: { admin_notes: rejectNotes.value },
		});
		actionMessage.value = { type: "success", text: "Prelievo rifiutato." };
		rejectingId.value = null;
		rejectNotes.value = "";
		await fetchWithdrawals();
		clearMessage();
	} catch (e) {
		actionMessage.value = { type: "error", text: e?.response?._data?.message || e?.data?.message || "Errore durante il rifiuto." };
	} finally {
		actionLoading.value = null;
	}
};

const approveAccount = async (id) => {
	actionLoading.value = id;
	actionMessage.value = null;
	try {
		await sanctum(`/api/admin/users/${id}/approve`, { method: "PATCH" });
		actionMessage.value = { type: "success", text: "Account approvato e email verificata." };
		await fetchUsers();
		clearMessage();
	} catch (e) {
		actionMessage.value = { type: "error", text: e?.response?._data?.message || e?.data?.message || "Errore durante l'approvazione account." };
	} finally {
		actionLoading.value = null;
	}
};

const deleteAccount = async (id) => {
	const confirmed = window.confirm("Confermi l'eliminazione definitiva di questo account?");
	if (!confirmed) return;

	actionLoading.value = id;
	actionMessage.value = null;
	try {
		await sanctum(`/api/admin/users/${id}`, { method: "DELETE" });
		actionMessage.value = { type: "success", text: "Account eliminato correttamente." };
		await fetchUsers();
		clearMessage();
	} catch (e) {
		actionMessage.value = { type: "error", text: e?.response?._data?.message || e?.data?.message || "Errore durante l'eliminazione account." };
	} finally {
		actionLoading.value = null;
	}
};

// Manual email verification
const manualVerifyEmail = async (id) => {
	actionLoading.value = `verify-${id}`;
	actionMessage.value = null;
	try {
		await sanctum(`/api/admin/users/${id}/approve`, { method: "PATCH" });
		actionMessage.value = { type: "success", text: "Email verificata manualmente." };
		await fetchUsers();
		clearMessage();
	} catch (e) {
		actionMessage.value = { type: "error", text: e?.response?._data?.message || "Errore durante la verifica manuale." };
	} finally {
		actionLoading.value = null;
	}
};


const formatDate = (dateStr) => {
	if (!dateStr) return "—";
	return new Date(dateStr).toLocaleDateString("it-IT", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

const formatCurrency = (val) => {
	return Number(val || 0).toFixed(2);
};

const tabs = [
	{ key: "withdrawals", label: "Prelievi" },
	{ key: "wallet", label: "Portafogli" },
	{ key: "referrals", label: "Referral" },
	{ key: "accounts", label: "Account" },
];

const withdrawalStatusConfig = {
	pending: { label: "In attesa", icon: "mdi:clock-outline", bg: "bg-amber-50", text: "text-amber-700" },
	approved: { label: "Approvata", icon: "mdi:check-circle-outline", bg: "bg-emerald-50", text: "text-emerald-700" },
	rejected: { label: "Rifiutata", icon: "mdi:close-circle-outline", bg: "bg-red-50", text: "text-red-700" },
};

const referralStatusConfig = {
	confirmed: { label: "Confermata", bg: "bg-emerald-50", text: "text-emerald-700" },
	paid: { label: "Pagata", bg: "bg-blue-50", text: "text-blue-700" },
	pending: { label: "In attesa", bg: "bg-amber-50", text: "text-amber-700" },
};

// Computed stats
const pendingWithdrawals = computed(() => withdrawalsData.value?.filter(w => w.status === 'pending') || []);
const approvedWithdrawals = computed(() => withdrawalsData.value?.filter(w => w.status === 'approved') || []);
const totalApproved = computed(() => approvedWithdrawals.value.reduce((sum, w) => sum + Number(w.amount), 0));
const unverifiedUsers = computed(() => usersData.value?.filter(u => !u.email_verified_at) || []);
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container max-w-[1200px]">
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866] font-medium">Il tuo account</NuxtLink>
				<span class="mx-[8px] text-[#C8CCD0]">/</span>
				<span class="font-semibold text-[#252B42]">Amministrazione</span>
			</div>

			<h1 class="text-[1.75rem] font-bold text-[#252B42] mb-[8px]">Pannello Amministrazione</h1>
			<p class="text-[0.875rem] text-[#737373] mb-[32px]">Gestisci utenti, prelievi, portafogli e referral.</p>

			<!-- Tabs -->
			<div class="flex flex-wrap gap-[4px] mb-[28px] bg-[#F0F0F0] rounded-[12px] p-[4px]">
				<button
					v-for="tab in tabs"
					:key="tab.key"
					@click="activeTab = tab.key"
					:class="[
						'flex items-center gap-[6px] px-[16px] py-[10px] rounded-[8px] text-[0.8125rem] font-medium transition-all cursor-pointer',
						activeTab === tab.key ? 'bg-white text-[#095866] shadow-sm' : 'text-[#737373] hover:text-[#404040]',
					]">
					<Icon :name="tab.icon" class="text-[16px]" />
					{{ tab.label }}
					<span v-if="tab.key === 'withdrawals' && pendingWithdrawals.length" class="ml-[2px] w-[20px] h-[20px] rounded-full bg-amber-500 text-white text-[0.625rem] flex items-center justify-center font-bold">
						{{ pendingWithdrawals.length }}
					</span>
					<span v-if="tab.key === 'emails' && unverifiedUsers.length" class="ml-[2px] w-[20px] h-[20px] rounded-full bg-red-500 text-white text-[0.625rem] flex items-center justify-center font-bold">
						{{ unverifiedUsers.length }}
					</span>
				</button>
			</div>

			<!-- Action message -->
			<div
				v-if="actionMessage"
				:class="[
					'mb-[20px] px-[16px] py-[12px] rounded-[12px] text-[0.875rem] font-medium flex items-center gap-[8px]',
					actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200',
				]">
				<Icon :name="actionMessage.type === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'" class="text-[18px] shrink-0" />
				{{ actionMessage.text }}
			</div>

			<!-- Loading -->
			<div v-if="isLoading" class="py-[60px] flex justify-center">
				<div class="w-[40px] h-[40px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></div>
			</div>

			<template v-else>
				<!-- ===== WITHDRAWALS TAB ===== -->
				<div v-if="activeTab === 'withdrawals'">
					<div class="grid grid-cols-1 account-pages:grid-cols-3 gap-[16px] mb-[24px]">
						<div class="bg-white rounded-[16px] p-[20px] border border-[#E9EBEC] shadow-sm">
							<div class="flex items-center gap-[8px] mb-[8px]">
								<Icon name="mdi:clock-outline" class="text-[18px] text-amber-600" />
								<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">In attesa</p>
							</div>
							<p class="text-[1.75rem] font-bold text-amber-600">{{ pendingWithdrawals.length }}</p>
						</div>
						<div class="bg-white rounded-[16px] p-[20px] border border-[#E9EBEC] shadow-sm">
							<div class="flex items-center gap-[8px] mb-[8px]">
								<Icon name="mdi:check-circle-outline" class="text-[18px] text-emerald-600" />
								<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Approvate</p>
							</div>
							<p class="text-[1.75rem] font-bold text-emerald-600">{{ approvedWithdrawals.length }}</p>
						</div>
						<div class="bg-white rounded-[16px] p-[20px] border border-[#E9EBEC] shadow-sm">
							<div class="flex items-center gap-[8px] mb-[8px]">
								<Icon name="mdi:currency-eur" class="text-[18px] text-[#252B42]" />
								<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Totale approvato</p>
							</div>
							<p class="text-[1.75rem] font-bold text-[#252B42]">&euro;{{ formatCurrency(totalApproved) }}</p>
						</div>
					</div>

					<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
						<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px]">Richieste di prelievo</h2>

						<div v-if="!withdrawalsData?.length" class="text-center py-[48px] text-[#737373]">
							<Icon name="mdi:bank-transfer" class="text-[40px] text-[#C8CCD0] mx-auto mb-[12px]" />
							<p>Nessuna richiesta di prelievo.</p>
						</div>

						<div v-else class="space-y-[12px]">
							<div
								v-for="w in withdrawalsData"
								:key="w.id"
								class="p-[18px] rounded-[14px] border border-[#E9EBEC] hover:border-[#D0D0D0] transition-colors">
								<div class="flex flex-col desktop:flex-row desktop:items-center justify-between gap-[12px]">
									<div class="flex-1">
										<div class="flex items-center gap-[10px] mb-[6px]">
											<span class="text-[1.125rem] font-bold text-[#252B42]">&euro;{{ formatCurrency(w.amount) }}</span>
											<span
												:class="[
													'inline-flex items-center gap-[4px] px-[10px] py-[3px] rounded-full text-[0.6875rem] font-medium',
													withdrawalStatusConfig[w.status]?.bg || 'bg-gray-50',
													withdrawalStatusConfig[w.status]?.text || 'text-gray-700',
												]">
												<Icon :name="withdrawalStatusConfig[w.status]?.icon || 'mdi:help'" class="text-[12px]" />
												{{ withdrawalStatusConfig[w.status]?.label || w.status }}
											</span>
										</div>
										<p class="text-[0.875rem] text-[#404040]">
											<span class="font-medium">{{ w.user?.name }} {{ w.user?.surname }}</span>
											<span class="text-[#737373] ml-[8px]">{{ w.user?.email }}</span>
										</p>
										<p class="text-[0.75rem] text-[#737373] mt-[2px]">Richiesta: {{ formatDate(w.created_at) }}</p>
										<p v-if="w.admin_notes" class="text-[0.75rem] text-[#737373] mt-[2px] italic">Note: {{ w.admin_notes }}</p>
									</div>

									<div v-if="w.status === 'pending'" class="flex items-center gap-[8px]">
										<template v-if="rejectingId !== w.id">
											<button
												@click="approveWithdrawal(w.id)"
												:disabled="actionLoading === w.id"
												class="px-[16px] py-[8px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-[8px] text-[0.8125rem] font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-[4px]">
												<Icon name="mdi:check" class="text-[16px]" />
												{{ actionLoading === w.id ? "..." : "Approva" }}
											</button>
											<button
												@click="startReject(w.id)"
												:disabled="actionLoading === w.id"
												class="px-[16px] py-[8px] bg-red-50 hover:bg-red-100 text-red-700 rounded-[8px] text-[0.8125rem] font-medium transition-colors cursor-pointer border border-red-200">
												Rifiuta
											</button>
										</template>
										<template v-else>
											<div class="flex items-center gap-[8px]">
												<input
													v-model="rejectNotes"
													type="text"
													placeholder="Motivo (opzionale)"
													class="px-[12px] py-[8px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.8125rem] w-[200px] focus:border-[#095866] focus:outline-none" />
												<button @click="confirmReject(w.id)" :disabled="actionLoading === w.id" class="px-[14px] py-[8px] bg-red-600 hover:bg-red-700 text-white rounded-[8px] text-[0.8125rem] font-medium cursor-pointer disabled:opacity-50">
													{{ actionLoading === w.id ? "..." : "Conferma" }}
												</button>
												<button @click="cancelReject" class="px-[14px] py-[8px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] rounded-[8px] text-[0.8125rem] font-medium cursor-pointer">Annulla</button>
											</div>
										</template>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- ===== WALLET TAB ===== -->
				<div v-if="activeTab === 'wallet'">
					<!-- User movements modal -->
					<div v-if="selectedUserId" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-[20px]" @click.self="closeUserMovements">
						<div class="bg-white rounded-[20px] p-[28px] shadow-2xl max-w-[700px] w-full max-h-[80vh] overflow-y-auto">
							<div class="flex items-center justify-between mb-[24px]">
								<h3 class="text-[1.125rem] font-bold text-[#252B42]">Movimenti di {{ selectedUserName }}</h3>
								<button @click="closeUserMovements" class="w-[36px] h-[36px] flex items-center justify-center rounded-full bg-[#F0F0F0] hover:bg-[#E0E0E0] cursor-pointer">
									<Icon name="mdi:close" class="text-[18px] text-[#404040]" />
								</button>
							</div>

							<div v-if="!userMovements?.length" class="text-center py-[40px] text-[#737373]">
								<p>Nessun movimento per questo utente.</p>
							</div>

							<ul v-else class="space-y-[4px]">
								<li v-for="mov in userMovements" :key="mov.id" class="flex items-center justify-between p-[12px] rounded-[10px] hover:bg-[#F8F9FB]">
									<div class="flex-1 min-w-0">
										<p class="text-[0.875rem] font-medium text-[#252B42] truncate">{{ mov.description }}</p>
										<div class="flex items-center gap-[8px] mt-[2px]">
											<span class="text-[0.75rem] text-[#737373]">{{ formatDate(mov.created_at) }}</span>
											<span v-if="mov.source" class="text-[0.6875rem] px-[8px] py-[2px] rounded-full bg-[#F0F0F0] text-[#737373]">{{ mov.source }}</span>
										</div>
									</div>
									<span :class="['text-[0.9375rem] font-bold tabular-nums whitespace-nowrap ml-[16px]', mov.type === 'credit' ? 'text-emerald-600' : 'text-red-500']">
										{{ mov.type === "credit" ? "+" : "-" }}&euro;{{ formatCurrency(mov.amount) }}
									</span>
								</li>
							</ul>
						</div>
					</div>

					<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
						<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px]">Utenti con movimenti</h2>

						<div v-if="!walletOverview?.length" class="text-center py-[48px] text-[#737373]">
							<Icon name="mdi:wallet-outline" class="text-[40px] text-[#C8CCD0] mx-auto mb-[12px]" />
							<p>Nessun utente con movimenti.</p>
						</div>

						<div v-else class="overflow-x-auto">
							<table class="w-full text-[0.875rem]">
								<thead>
									<tr class="border-b border-[#E9EBEC] text-left text-[#737373]">
										<th class="pb-[12px] font-medium">Utente</th>
										<th class="pb-[12px] font-medium">Email</th>
										<th class="pb-[12px] font-medium">Ruolo</th>
										<th class="pb-[12px] font-medium text-right">Saldo</th>
										<th class="pb-[12px] font-medium text-right">Commissioni</th>
										<th class="pb-[12px] font-medium text-center">Azioni</th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="u in walletOverview" :key="u.id" class="border-b border-[#F0F0F0] last:border-0">
										<td class="py-[14px] text-[#252B42] font-medium">{{ u.name }}</td>
										<td class="py-[14px] text-[#737373]">{{ u.email }}</td>
										<td class="py-[14px]">
											<span :class="['inline-block px-[8px] py-[2px] rounded-full text-[0.6875rem] font-medium', u.role === 'Partner Pro' ? 'bg-[#095866]/10 text-[#095866]' : u.role === 'Admin' ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-600']">
												{{ u.role || "Cliente" }}
											</span>
										</td>
										<td class="py-[14px] text-right font-semibold text-[#252B42]">&euro;{{ formatCurrency(u.wallet_balance) }}</td>
										<td class="py-[14px] text-right font-semibold text-emerald-600">&euro;{{ formatCurrency(u.commission_balance) }}</td>
										<td class="py-[14px] text-center">
											<button @click="viewUserMovements(u.id, u.name)" class="text-[0.8125rem] text-[#095866] hover:underline cursor-pointer font-medium">Movimenti</button>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>

				<!-- ===== ACCOUNTS TAB ===== -->
				<div v-if="activeTab === 'accounts'">
					<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
						<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px]">Gestione account registrati</h2>

						<div v-if="!usersData?.length" class="text-center py-[48px] text-[#737373]">
							<Icon name="mdi:account-group" class="text-[40px] text-[#C8CCD0] mx-auto mb-[12px]" />
							<p>Nessun account trovato.</p>
						</div>

						<div v-else class="overflow-x-auto">
							<table class="w-full text-[0.875rem]">
								<thead>
									<tr class="border-b border-[#E9EBEC] text-left text-[#737373]">
										<th class="pb-[12px] font-medium">Nome</th>
										<th class="pb-[12px] font-medium">Email</th>
										<th class="pb-[12px] font-medium">Ruolo</th>
										<th class="pb-[12px] font-medium">Codice Ref.</th>
										<th class="pb-[12px] font-medium">Stato</th>
										<th class="pb-[12px] font-medium">Registrazione</th>
										<th class="pb-[12px] font-medium text-right">Azioni</th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="u in usersData" :key="u.id" class="border-b border-[#F0F0F0] last:border-0">
										<td class="py-[14px] text-[#252B42] font-medium">{{ u.name }} {{ u.surname }}</td>
										<td class="py-[14px] text-[#737373]">{{ u.email }}</td>
										<td class="py-[14px]">
											<span :class="['inline-block px-[8px] py-[2px] rounded-full text-[0.6875rem] font-medium', u.role === 'Partner Pro' ? 'bg-[#095866]/10 text-[#095866]' : u.role === 'Admin' ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-600']">
												{{ u.role || "Cliente" }}
											</span>
										</td>
										<td class="py-[14px]">
											<span v-if="u.referral_code" class="font-mono text-[0.75rem] bg-[#F0F0F0] px-[6px] py-[2px] rounded">{{ u.referral_code }}</span>
											<span v-else class="text-[#C8CCD0]">—</span>
										</td>
										<td class="py-[14px]">
											<span :class="u.email_verified_at ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'" class="inline-flex items-center gap-[4px] px-[8px] py-[2px] rounded-full text-[0.6875rem] font-medium">
												<Icon :name="u.email_verified_at ? 'mdi:check-circle' : 'mdi:clock-outline'" class="text-[12px]" />
												{{ u.email_verified_at ? 'Verificato' : 'Non verificato' }}
											</span>
										</td>
										<td class="py-[14px] text-[#737373] text-[0.8125rem]">{{ formatDate(u.created_at) }}</td>
										<td class="py-[14px] text-right">
											<div class="flex justify-end gap-[6px]">
												<button v-if="!u.email_verified_at" @click="approveAccount(u.id)" :disabled="actionLoading === u.id" class="px-[10px] py-[6px] rounded-[8px] bg-[#095866] text-white text-[0.75rem] cursor-pointer disabled:opacity-60 flex items-center gap-[4px]">
													<Icon name="mdi:check" class="text-[14px]" />
													Approva
												</button>
												<button @click="deleteAccount(u.id)" :disabled="actionLoading === u.id" class="px-[10px] py-[6px] rounded-[8px] bg-red-600 text-white text-[0.75rem] cursor-pointer disabled:opacity-60 flex items-center gap-[4px]">
													<Icon name="mdi:delete-outline" class="text-[14px]" />
													Elimina
												</button>
											</div>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>


				<div v-if="activeTab === 'referrals'">
					<div v-if="referralStats" class="grid grid-cols-1 account-pages:grid-cols-3 gap-[16px] mb-[24px]">
						<div class="bg-white rounded-[16px] p-[20px] border border-[#E9EBEC] shadow-sm">
							<div class="flex items-center gap-[8px] mb-[8px]">
								<Icon name="mdi:share-variant" class="text-[18px] text-blue-600" />
								<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Totale utilizzi</p>
							</div>
							<p class="text-[1.75rem] font-bold text-[#252B42]">{{ referralStats.summary?.total_usages || 0 }}</p>
						</div>
						<div class="bg-white rounded-[16px] p-[20px] border border-[#E9EBEC] shadow-sm">
							<div class="flex items-center gap-[8px] mb-[8px]">
								<Icon name="mdi:cart-outline" class="text-[18px] text-[#252B42]" />
								<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Volume ordini</p>
							</div>
							<p class="text-[1.75rem] font-bold text-[#252B42]">&euro;{{ formatCurrency(referralStats.summary?.total_order_amount) }}</p>
						</div>
						<div class="bg-white rounded-[16px] p-[20px] border border-[#E9EBEC] shadow-sm">
							<div class="flex items-center gap-[8px] mb-[8px]">
								<Icon name="mdi:cash-check" class="text-[18px] text-emerald-600" />
								<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Commissioni generate</p>
							</div>
							<p class="text-[1.75rem] font-bold text-emerald-600">&euro;{{ formatCurrency(referralStats.summary?.total_commissions) }}</p>
						</div>
					</div>

					<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
						<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px]">Utilizzi codici referral</h2>

						<div v-if="!referralStats?.data?.length" class="text-center py-[48px] text-[#737373]">
							<Icon name="mdi:share-variant" class="text-[40px] text-[#C8CCD0] mx-auto mb-[12px]" />
							<p>Nessun utilizzo registrato.</p>
						</div>

						<div v-else class="overflow-x-auto">
							<table class="w-full text-[0.875rem]">
								<thead>
									<tr class="border-b border-[#E9EBEC] text-left text-[#737373]">
										<th class="pb-[12px] font-medium">Data</th>
										<th class="pb-[12px] font-medium">Codice</th>
										<th class="pb-[12px] font-medium">Partner Pro</th>
										<th class="pb-[12px] font-medium">Acquirente</th>
										<th class="pb-[12px] font-medium text-right">Ordine</th>
										<th class="pb-[12px] font-medium text-right">Sconto</th>
										<th class="pb-[12px] font-medium text-right">Commissione</th>
										<th class="pb-[12px] font-medium text-center">Stato</th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="usage in referralStats.data" :key="usage.id" class="border-b border-[#F0F0F0] last:border-0">
										<td class="py-[14px] text-[#404040]">{{ formatDate(usage.created_at) }}</td>
										<td class="py-[14px]">
											<span class="font-mono text-[0.8125rem] bg-[#F0F0F0] px-[8px] py-[2px] rounded">{{ usage.referral_code }}</span>
										</td>
										<td class="py-[14px] text-[#252B42] font-medium">{{ usage.pro_user?.name }}</td>
										<td class="py-[14px] text-[#404040]">{{ usage.buyer?.name }}</td>
										<td class="py-[14px] text-right text-[#404040]">&euro;{{ formatCurrency(usage.order_amount) }}</td>
										<td class="py-[14px] text-right text-blue-600">-&euro;{{ formatCurrency(usage.discount_amount) }}</td>
										<td class="py-[14px] text-right font-semibold text-emerald-600">+&euro;{{ formatCurrency(usage.commission_amount) }}</td>
										<td class="py-[14px] text-center">
											<span
												:class="['inline-block px-[8px] py-[2px] rounded-full text-[0.6875rem] font-medium', referralStatusConfig[usage.status]?.bg || 'bg-gray-50', referralStatusConfig[usage.status]?.text || 'text-gray-700']">
												{{ referralStatusConfig[usage.status]?.label || usage.status }}
											</span>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</template>
		</div>
	</section>
</template>
