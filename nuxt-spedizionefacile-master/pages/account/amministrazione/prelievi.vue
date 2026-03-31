<!--
  FILE: pages/account/amministrazione/prelievi.vue
  SCOPO: Pannello admin — gestione richieste di prelievo commissioni Partner Pro.
         Approvazione, rifiuto e storico delle richieste.
  API: GET /api/admin/withdrawals — lista richieste prelievo,
       PATCH /api/admin/withdrawals/{id}/approve — approva prelievo,
       PATCH /api/admin/withdrawals/{id}/reject — rifiuta prelievo.
  ROUTE: /account/amministrazione/prelievi (middleware sanctum:auth + admin).

  COLLEGAMENTI:
    - pages/account/prelievi.vue → lato utente Partner Pro.
-->
<script setup>
definePageMeta({
	middleware: ["app-auth", "admin"],
});

const sanctum = useSanctumClient();
const { actionLoading, actionMessage, showSuccess, showError, formatCurrency, formatDate, withdrawalStatusConfig } = useAdmin();

const withdrawalsData = ref([]);

const fetchWithdrawals = async () => {
	try {
		const res = await sanctum("/api/admin/withdrawals");
		withdrawalsData.value = res?.data || res || [];
	} catch (e) { withdrawalsData.value = []; }
};

const pendingWithdrawals = computed(() => withdrawalsData.value?.filter(w => w.status === 'pending') || []);
const approvedWithdrawals = computed(() => withdrawalsData.value?.filter(w => w.status === 'approved') || []);
const totalApproved = computed(() => approvedWithdrawals.value.reduce((sum, w) => sum + Number(w.amount), 0));
const totalRejected = computed(() => withdrawalsData.value?.filter(w => w.status === 'rejected').length || 0);

const rejectNotes = ref("");
const rejectingId = ref(null);

const startReject = (id) => { rejectingId.value = id; rejectNotes.value = ""; };
const cancelReject = () => { rejectingId.value = null; rejectNotes.value = ""; };

const approveWithdrawal = async (id) => {
	actionLoading.value = id;
	try {
		await sanctum(`/api/admin/withdrawals/${id}/approve`, { method: "POST" });
		showSuccess("Prelievo approvato con successo.");
		await fetchWithdrawals();
	} catch (e) { showError(e, "Errore durante l'approvazione."); }
	finally { actionLoading.value = null; }
};

const confirmReject = async (id) => {
	actionLoading.value = id;
	try {
		await sanctum(`/api/admin/withdrawals/${id}/reject`, { method: "POST", body: { admin_notes: rejectNotes.value } });
		showSuccess("Prelievo rifiutato.");
		rejectingId.value = null;
		rejectNotes.value = "";
		await fetchWithdrawals();
	} catch (e) { showError(e, "Errore durante il rifiuto."); }
	finally { actionLoading.value = null; }
};

onMounted(() => { fetchWithdrawals(); });
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Area amministrazione"
				title="Prelievi"
				description="Richieste e storico commissioni."
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Amministrazione', to: '/account/amministrazione' },
					{ label: 'Prelievi' },
				]"
			/>

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

			<div class="mb-[20px] rounded-[18px] border border-[#E9EBEC] bg-[#F8FAFB] p-[14px] tablet:p-[18px]">
				<div class="flex flex-col gap-[14px] desktop:flex-row desktop:items-center desktop:justify-between">
					<div>
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.6px] text-[#6B7280]">Toolbar prelievi</p>
						<h2 class="mt-[4px] text-[1rem] font-semibold text-[#252B42]">Coda richieste e stato approvazioni</h2>
					</div>
					<div class="flex flex-wrap items-center gap-[8px]">
						<span class="inline-flex min-h-[34px] items-center rounded-full border border-[#DCE7E8] bg-white px-[12px] text-[0.75rem] font-medium text-[#095866]">
							{{ withdrawalsData.length }} richieste
						</span>
						<span class="inline-flex min-h-[34px] items-center rounded-full border border-[#E7ECEE] bg-white px-[12px] text-[0.75rem] font-medium text-[#5F6C75]">
							{{ pendingWithdrawals.length }} in attesa
						</span>
					</div>
				</div>
			</div>

			<div class="grid grid-cols-1 tablet:grid-cols-3 xl:grid-cols-4 gap-[16px] mb-[24px]">
				<div class="bg-white rounded-[16px] p-[20px] border border-[#E9EBEC] shadow-sm">
					<div class="flex items-center gap-[8px] mb-[8px]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-amber-600" fill="currentColor"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/></svg>
						<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">In attesa</p>
					</div>
					<p class="text-[1.75rem] font-bold text-amber-600">{{ pendingWithdrawals.length }}</p>
				</div>
				<div class="bg-white rounded-[16px] p-[20px] border border-[#E9EBEC] shadow-sm">
					<div class="flex items-center gap-[8px] mb-[8px]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-emerald-600" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg>
						<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Approvate</p>
					</div>
					<p class="text-[1.75rem] font-bold text-emerald-600">{{ approvedWithdrawals.length }}</p>
				</div>
				<div class="bg-white rounded-[16px] p-[20px] border border-[#E9EBEC] shadow-sm">
					<div class="flex items-center gap-[8px] mb-[8px]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[#252B42]" fill="currentColor"><path d="M15,18.5C12.49,18.5 10.32,17.08 9.24,15H15L16,13H8.58C8.53,12.67 8.5,12.34 8.5,12C8.5,11.66 8.53,11.33 8.58,11H15L16,9H9.24C10.32,6.92 12.5,5.5 15,5.5C16.61,5.5 18.09,6.09 19.23,7.07L21,5.29C19.41,3.86 17.31,3 15,3C11.08,3 7.76,5.51 6.52,9H3L2,11H6.06C6.02,11.33 6,11.66 6,12C6,12.34 6.02,12.67 6.06,13H3L2,15H6.52C7.76,18.49 11.08,21 15,21C17.31,21 19.41,20.14 21,18.71L19.22,16.93C18.09,17.91 16.62,18.5 15,18.5Z"/></svg>
						<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Totale approvato</p>
					</div>
					<p class="text-[1.75rem] font-bold text-[#252B42]">&euro;{{ formatCurrency(totalApproved) }}</p>
				</div>
				<div class="bg-white rounded-[16px] p-[20px] border border-[#E9EBEC] shadow-sm">
					<div class="flex items-center gap-[8px] mb-[8px]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-red-600" fill="currentColor"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12C4,13.85 4.63,15.55 5.68,16.91L16.91,5.68C15.55,4.63 13.85,4 12,4M12,20A8,8 0 0,0 20,12C20,10.15 19.37,8.45 18.32,7.09L7.09,18.32C8.45,19.37 10.15,20 12,20Z"/></svg>
						<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Rifiutate</p>
					</div>
					<p class="text-[1.75rem] font-bold text-red-600">{{ totalRejected }}</p>
				</div>
			</div>

			<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
				<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px]">Richieste di prelievo</h2>
				<div v-if="!withdrawalsData?.length" class="text-center py-[48px] text-[#737373]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[40px] h-[40px] text-[#C8CCD0] mx-auto mb-[12px]" fill="currentColor"><path d="M2,5H22V7H2V5M15,10H22V12H15V10M15,16H22V18H15V16M2,10H13L8,15H2V10M2,16H8L13,21H2V16Z"/></svg>
					<p>Nessuna richiesta di prelievo.</p>
				</div>
				<div v-else class="space-y-[12px]">
					<div v-for="w in withdrawalsData" :key="w.id" class="rounded-[16px] border border-[#E9EBEC] bg-white p-[16px] tablet:p-[18px] hover:border-[#D0D0D0] transition-colors">
						<div class="flex flex-col desktop:flex-row desktop:items-center justify-between gap-[12px]">
							<div class="flex-1">
								<div class="flex flex-wrap items-center gap-[10px] mb-[6px]">
									<span class="text-[1.125rem] font-bold text-[#252B42]">&euro;{{ formatCurrency(w.amount) }}</span>
									<span :class="['inline-flex items-center gap-[4px] px-[10px] py-[3px] rounded-full text-[0.6875rem] font-medium', withdrawalStatusConfig[w.status]?.bg || 'bg-gray-50', withdrawalStatusConfig[w.status]?.text || 'text-gray-700']">
										<svg v-if="w.status === 'pending'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[12px] h-[12px]" fill="currentColor"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/></svg>
										<svg v-else-if="w.status === 'approved'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[12px] h-[12px]" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg>
										<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[12px] h-[12px]" fill="currentColor"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12C4,13.85 4.63,15.55 5.68,16.91L16.91,5.68C15.55,4.63 13.85,4 12,4M12,20A8,8 0 0,0 20,12C20,10.15 19.37,8.45 18.32,7.09L7.09,18.32C8.45,19.37 10.15,20 12,20Z"/></svg>
										{{ withdrawalStatusConfig[w.status]?.label || w.status }}
									</span>
								</div>
								<p class="text-[0.875rem] text-[#404040]">
									<span class="font-medium">{{ w.user?.name }} {{ w.user?.surname }}</span>
									<span class="text-[#737373] ml-[8px] break-all">{{ w.user?.email }}</span>
								</p>
								<p class="text-[0.75rem] text-[#737373] mt-[2px]">Richiesta: {{ formatDate(w.created_at) }}</p>
								<p v-if="w.admin_notes" class="mt-[8px] rounded-[12px] bg-[#F8FAFB] px-[12px] py-[10px] text-[0.75rem] text-[#737373] italic">Note: {{ w.admin_notes }}</p>
							</div>
							<div v-if="w.status === 'pending'" class="flex w-full flex-col gap-[8px] tablet:w-auto tablet:flex-row tablet:items-center tablet:justify-end">
								<template v-if="rejectingId !== w.id">
									<button @click="approveWithdrawal(w.id)" :disabled="actionLoading === w.id" class="w-full tablet:w-auto px-[16px] py-[8px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-[8px] text-[0.8125rem] font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-[4px]">
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg> {{ actionLoading === w.id ? "..." : "Approva" }}
									</button>
									<button @click="startReject(w.id)" :disabled="actionLoading === w.id" class="w-full tablet:w-auto px-[16px] py-[8px] bg-red-50 hover:bg-red-100 text-red-700 rounded-[8px] text-[0.8125rem] font-medium transition-colors cursor-pointer border border-red-200">Rifiuta</button>
								</template>
								<template v-else>
									<div class="grid grid-cols-1 tablet:grid-cols-[minmax(0,1fr)_auto_auto] gap-[8px]">
										<input v-model="rejectNotes" type="text" placeholder="Motivo (opzionale)" class="w-full px-[12px] py-[8px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.8125rem] focus:border-[#095866] focus:outline-none" />
										<button @click="confirmReject(w.id)" :disabled="actionLoading === w.id" class="px-[14px] py-[8px] bg-red-600 hover:bg-red-700 text-white rounded-[8px] text-[0.8125rem] font-medium cursor-pointer disabled:opacity-50">{{ actionLoading === w.id ? "..." : "Conferma" }}</button>
										<button @click="cancelReject" class="px-[14px] py-[8px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] rounded-[8px] text-[0.8125rem] font-medium cursor-pointer">Annulla</button>
									</div>
								</template>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>
