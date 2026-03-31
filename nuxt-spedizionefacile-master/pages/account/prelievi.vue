<!--
  FILE: pages/account/prelievi.vue
  SCOPO: Pagina prelievi commissioni — solo per Partner Pro.
         Mostra saldo prelevabile, storico richieste di prelievo, guida "come funziona".
         Se l'utente non e' Pro, mostra un invito a diventarlo.
  API: GET /api/withdrawals — storico richieste prelievo,
       POST /api/withdrawals — richiesta nuovo prelievo.
  COMPONENTI: nessun componente custom.
  ROUTE: /account/prelievi (middleware sanctum:auth).

  DATI IN INGRESSO:
    - user (da useSanctumAuth) — ruolo e saldo commissioni.
    - withdrawals (da API) — storico richieste.

  DATI IN USCITA:
    - POST /api/withdrawals — nuova richiesta di prelievo.

  VINCOLI:
    - L'utente deve essere autenticato.
    - Solo i Partner Pro vedono il form di prelievo.
    - Il saldo prelevabile deve essere sufficiente.

  ERRORI TIPICI:
    - Saldo insufficiente → messaggio errore.
    - Utente non Pro → mostra invito a diventarlo.

  PUNTI DI MODIFICA SICURI:
    - Cambiare il minimo prelevabile: modificare la validazione nel form.
    - Aggiungere metodi di prelievo: modificare il form.

  COLLEGAMENTI:
    - pages/account/account-pro.vue → gestione Partner Pro.
    - pages/account/bonus.vue → pagina bonus.
-->
<script setup>
/* Richiede che l'utente sia autenticato */
definePageMeta({
	middleware: ["app-auth"],
});

const { user } = useSanctumAuth();
const sanctum = useSanctumClient();

/* Controlla se l'utente e' Partner Pro (solo loro possono prelevare) */
const isPro = computed(() => user.value?.role === "Partner Pro");

/* Lista delle richieste di prelievo fatte dall'utente */
const withdrawals = ref([]);
/* Dati sui guadagni da commissioni (saldo prelevabile) */
const earnings = ref(null);
/* Indica se i dati sono in fase di caricamento iniziale */
const isLoadingData = ref(true);
/* Indica se una richiesta di prelievo e' in corso */
const isLoading = ref(false);
/* Messaggio di feedback (successo o errore) */
const message = ref(null);
const messageType = ref("success");

/* Carica dal server le richieste di prelievo e i dati sui guadagni */
const fetchData = async () => {
	if (!isPro.value) {
		isLoadingData.value = false;
		return;
	}
	try {
		const [wData, eData] = await Promise.all([
			sanctum("/api/withdrawals"),
			sanctum("/api/referral/earnings"),
		]);
		withdrawals.value = wData?.data || wData || [];
		earnings.value = eData;
	} catch (e) {
		// handle silently
	} finally {
		isLoadingData.value = false;
	}
};

onMounted(fetchData);

/* Calcola il saldo disponibile per il prelievo */
const availableBalance = computed(() => {
	if (!earnings.value) return 0;
	return Number(earnings.value.commission_balance || 0);
});

/* Controlla se c'e' gia' una richiesta di prelievo in attesa (si puo' averne solo una) */
const hasPending = computed(() => {
	if (!Array.isArray(withdrawals.value)) return false;
	return withdrawals.value.some((w) => w.status === "pending");
});

/**
 * Invia una richiesta di prelievo per l'intero saldo commissioni.
 * Controlla che il saldo sia almeno 1 EUR e che non ci siano richieste in sospeso.
 */
const requestWithdrawal = async () => {
	if (availableBalance.value < 1) {
		message.value = "Saldo commissioni insufficiente. Minimo 1,00 EUR.";
		messageType.value = "error";
		return;
	}

	if (hasPending.value) {
		message.value = "Hai già una richiesta in attesa di approvazione.";
		messageType.value = "error";
		return;
	}

	isLoading.value = true;
	message.value = null;

	try {
		const result = await sanctum("/api/withdrawals", {
			method: "POST",
		});

		if (result?.success) {
			message.value = `Richiesta di prelievo di €${availableBalance.value.toFixed(2)} inviata con successo.`;
			messageType.value = "success";
			await fetchData();
		} else {
			message.value = result?.message || "Errore durante la richiesta.";
			messageType.value = "error";
		}
	} catch (e) {
		const errorMsg = e?.response?._data?.message || e?.data?.message;
		message.value = errorMsg || "Errore imprevisto. Riprova.";
		messageType.value = "error";
	} finally {
		isLoading.value = false;
	}
};

const formatDate = (dateStr) => {
	return new Date(dateStr).toLocaleDateString("it-IT", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

const withdrawalHeader = computed(() => ({
	eyebrow: 'Partner Pro',
	title: isPro.value ? 'Prelievi' : 'Prelievi Pro',
	description: '',
}));

const withdrawalHeaderStats = computed(() => [
	{ label: 'Minimo', value: '1,00€' },
	{ label: 'Storico', value: `${withdrawals.value.length || 0} richieste` },
]);

const pendingWithdrawals = computed(() => {
	if (!Array.isArray(withdrawals.value)) return 0;
	return withdrawals.value.filter((withdrawal) => withdrawal.status === "pending").length;
});

const lastWithdrawalLabel = computed(() => {
	if (!Array.isArray(withdrawals.value) || !withdrawals.value.length) {
		return "Nessuna richiesta ancora";
	}
	const latest = withdrawals.value[0];
	return statusConfig[latest.status]?.label || latest.status;
});

const withdrawalOverview = computed(() => [
	{
		label: "Disponibile",
		value: `€${availableBalance.value.toFixed(2)}`,
		tone: "bg-[#F0F6F7] text-[#095866]",
	},
	{
		label: "In attesa",
		value: pendingWithdrawals.value ? `${pendingWithdrawals.value} richiesta` : "Nessuna",
		tone: "bg-[#FFF7E8] text-[#B45309]",
	},
	{
		label: "Ultimo stato",
		value: lastWithdrawalLabel.value,
		tone: "bg-[#F8F9FB] text-[#404040]",
	},
]);

/* Configurazione colori e icone per ogni stato della richiesta di prelievo */
const statusConfig = {
	pending: { label: "In attesa", icon: "mdi:clock-outline", bg: "bg-[#fff4e8]", text: "text-[#b45309]", border: "border-[#f3d1a7]" },
	approved: { label: "Approvata", icon: "mdi:check-circle-outline", bg: "bg-[#edf7f8]", text: "text-[#095866]", border: "border-[#bfe0e6]" },
	rejected: { label: "Rifiutata", icon: "mdi:close-circle-outline", bg: "bg-[#fef2f2]", text: "text-[#b42318]", border: "border-[#f3c1c1]" },
	completed: { label: "Completata", icon: "mdi:check-all", bg: "bg-[#f5f7f8]", text: "text-[#4b5563]", border: "border-[#d9e1e5]" },
};
</script>

<template>
	<section class="min-h-[600px] py-[28px] desktop:py-[64px]">
		<div class="my-container">
				<AccountPageHeader
				:eyebrow="withdrawalHeader.eyebrow"
				:title="withdrawalHeader.title"
				:description="withdrawalHeader.description"
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Prelievi' },
				]"
			>
				<template #meta>
					<div class="flex flex-wrap gap-[8px]">
						<span
							v-for="stat in withdrawalHeaderStats"
							:key="stat.label"
							class="inline-flex items-center gap-[6px] rounded-full bg-[#F0F6F7] px-[12px] py-[6px] text-[0.8125rem] font-semibold text-[#095866]">
							{{ stat.label }}: {{ stat.value }}
						</span>
					</div>
				</template>
				<template #actions v-if="!isPro">
					<NuxtLink to="/account/account-pro" class="btn-secondary btn-compact inline-flex items-center justify-center gap-[8px]">
						<Icon name="mdi:star-outline" class="text-[18px]" />
						Scopri Pro
					</NuxtLink>
					</template>
			</AccountPageHeader>

				<div v-if="isPro" class="mb-[18px] rounded-[18px] border border-[#E9EBEC] bg-white px-[16px] py-[14px] shadow-sm desktop:px-[20px] desktop:py-[16px]">
					<div class="grid gap-[12px] desktop:grid-cols-[minmax(0,1.05fr)_repeat(3,minmax(0,0.55fr))] desktop:items-center">
						<div>
							<p class="text-[0.75rem] font-semibold uppercase tracking-[1px] text-[#095866]">Panoramica prelievi</p>
							<h2 class="mt-[4px] text-[1rem] font-bold text-[#252B42]">Saldo e stato richieste</h2>
						</div>
						<div
							v-for="item in withdrawalOverview"
							:key="item.label"
							class="rounded-[16px] border border-[#E9EBEC] px-[14px] py-[12px]">
							<p class="text-[0.75rem] font-semibold uppercase tracking-[0.8px] text-[#737373]">{{ item.label }}</p>
							<span :class="['mt-[8px] inline-flex rounded-full px-[10px] py-[5px] text-[0.75rem] font-semibold', item.tone]">
								{{ item.value }}
							</span>
						</div>
					</div>
				</div>

				<!-- Not Pro -->
				<div v-if="!isPro" class="bg-white rounded-[18px] p-[18px] desktop:p-[28px] shadow-sm border border-[#E9EBEC] text-center">
				<div class="w-[64px] h-[64px] mx-auto mb-[16px] bg-[#edf7f8] rounded-full flex items-center justify-center">
					<Icon name="mdi:cash-multiple" class="text-[28px] text-[#095866]" />
				</div>
				<h2 class="text-[1.15rem] desktop:text-[1.25rem] font-bold text-[#252B42] mb-[8px]">Partner Pro richiesto</h2>
				<p class="text-[#667281] text-[0.85rem] max-w-[420px] mx-auto mb-[16px] leading-[1.5]">
					Attiva Pro per i prelievi.
				</p>
				<NuxtLink to="/account/account-pro" class="btn-secondary btn-compact inline-flex items-center gap-[8px]">
					<Icon name="mdi:star-outline" class="text-[17px]" />
					Scopri Pro
				</NuxtLink>
			</div>

				<!-- Pro User Content -->
				<template v-else>
					<div class="mb-[18px] grid gap-[18px] desktop:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)] desktop:items-stretch">
						<div class="rounded-[20px] border border-[#E5EDF2] bg-white p-[18px] desktop:p-[24px] shadow-sm">
							<div class="flex flex-col gap-[14px] desktop:flex-row desktop:items-center desktop:justify-between">
								<div>
									<div class="flex items-center gap-[8px] mb-[10px]">
										<div class="w-[36px] h-[36px] rounded-[50px] bg-[#edf7f8] flex items-center justify-center">
											<Icon name="mdi:bank-transfer-out" class="text-[20px] text-[#095866]" />
										</div>
								<p class="text-[0.75rem] uppercase tracking-[1.2px] font-medium text-[#095866]">Saldo</p>
							</div>
									<p class="text-[2rem] desktop:text-[2.5rem] font-bold tracking-tight leading-none text-[#252B42]">
										&euro;{{ availableBalance.toFixed(2) }}
									</p>
									<p class="text-[0.75rem] text-[#667281] mt-[6px]">Commissioni accumulate</p>
								</div>
								<div class="flex flex-col items-start desktop:items-end gap-[8px]">
									<button
										@click="requestWithdrawal"
										:disabled="isLoading || hasPending || availableBalance < 1"
										:class="[
											'w-full desktop:w-auto px-[24px] py-[12px] rounded-[12px] font-semibold text-[0.875rem] transition-all flex items-center justify-center gap-[8px]',
												isLoading || hasPending || availableBalance < 1
													? 'bg-[#edf1f3] cursor-not-allowed text-[#a5b3bb]'
													: 'bg-[#095866] text-white hover:bg-[#074a56] cursor-pointer shadow-[0_2px_8px_rgba(9,88,102,0.2)]',
										]">
										<Icon v-if="!isLoading && !hasPending" name="mdi:bank-transfer-out" class="text-[17px]" />
										<Icon v-if="hasPending && !isLoading" name="mdi:clock-outline" class="text-[17px]" />
										<span v-if="isLoading">Invio in corso...</span>
										<span v-else-if="hasPending">Richiesta in attesa</span>
										<span v-else>Preleva</span>
									</button>
									<p v-if="hasPending" class="text-[0.6875rem] opacity-60">In attesa di approvazione dall'admin.</p>
								</div>
							</div>

							<div v-if="message" :class="['relative z-1 mt-[16px] text-[0.8125rem] font-medium rounded-[16px] px-[14px] py-[10px] flex items-center gap-[8px]', messageType === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20']">
								<Icon :name="messageType === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'" class="text-[17px]" />
								{{ message }}
							</div>
						</div>

						<div class="bg-white rounded-[18px] p-[16px] desktop:p-[20px] border border-[#E9EBEC] shadow-sm">
								<h3 class="text-[0.875rem] font-bold text-[#252B42] mb-[12px] flex items-center gap-[8px]">
									<Icon name="mdi:information-outline" class="text-[17px] text-[#095866]" />
								Come funziona
							</h3>
							<div class="space-y-[10px]">
								<div class="flex items-start gap-[8px]">
									<div class="w-[30px] h-[30px] rounded-full bg-[#095866]/10 flex items-center justify-center shrink-0 text-[0.75rem] font-bold text-[#095866]">1</div>
									<p class="text-[0.8125rem] text-[#404040] leading-[1.5]">Saldo confermato.</p>
								</div>
								<div class="flex items-start gap-[8px]">
									<div class="w-[30px] h-[30px] rounded-full bg-[#095866]/10 flex items-center justify-center shrink-0 text-[0.75rem] font-bold text-[#095866]">2</div>
									<p class="text-[0.8125rem] text-[#404040] leading-[1.5]">Richiedi l&apos;intero saldo disponibile.</p>
								</div>
								<div class="flex items-start gap-[8px]">
									<div class="w-[30px] h-[30px] rounded-full bg-[#095866]/10 flex items-center justify-center shrink-0 text-[0.75rem] font-bold text-[#095866]">3</div>
									<p class="text-[0.8125rem] text-[#404040] leading-[1.5]">L&apos;admin verifica e aggiorna lo stato.</p>
								</div>
								<div class="flex items-start gap-[8px]">
									<div class="w-[30px] h-[30px] rounded-full bg-[#095866]/10 flex items-center justify-center shrink-0 text-[0.75rem] font-bold text-[#095866]">4</div>
									<p class="text-[0.8125rem] text-[#404040] leading-[1.5]">Se approvato, l&apos;importo viene accreditato.</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Withdrawal History -->
				<div class="bg-white rounded-[20px] p-[16px] desktop:p-[24px] shadow-sm border border-[#E9EBEC]">
					<div class="flex items-center gap-[10px] mb-[14px] desktop:mb-[16px]">
						<div class="w-[36px] h-[36px] rounded-[50px] bg-[#edf7f8] flex items-center justify-center">
							<Icon name="mdi:history" class="text-[20px] text-[#095866]" />
						</div>
						<h2 class="text-[1rem] font-bold text-[#252B42]">Storico</h2>
					</div>

					<div v-if="isLoadingData" class="py-[24px] flex justify-center">
						<div class="w-[30px] h-[30px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></div>
					</div>

					<div v-else-if="!withdrawals?.length" class="text-center py-[32px]">
						<div class="w-[56px] h-[56px] mx-auto mb-[14px] rounded-full bg-[#F8F9FB] flex items-center justify-center">
							<Icon name="mdi:bank-transfer" class="text-[24px] text-[#C8CCD0]" />
						</div>
						<p class="text-[0.9375rem] font-medium text-[#252B42]">Ancora nessuna richiesta</p>
						<p class="text-[0.75rem] text-[#737373] mt-[6px]">Qui appariranno le richieste.</p>
					</div>

						<div v-else class="space-y-[10px]">
							<div
								v-for="withdrawal in withdrawals"
								:key="withdrawal.id"
								:class="['p-[14px] rounded-[14px] border transition-colors', statusConfig[withdrawal.status]?.border || 'border-[#E9EBEC]', statusConfig[withdrawal.status]?.bg || 'bg-white']">
								<div class="flex flex-col gap-[10px] tablet:flex-row tablet:items-start tablet:justify-between">
									<div class="min-w-0">
										<div class="flex items-center gap-[8px] flex-wrap">
											<span class="text-[1rem] font-bold text-[#252B42]">&euro;{{ Number(withdrawal.amount).toFixed(2) }}</span>
											<span
												:class="[
													'inline-flex items-center gap-[4px] px-[9px] py-[3px] rounded-full text-[0.6875rem] font-medium',
													statusConfig[withdrawal.status]?.text || 'text-gray-700',
												]">
												<Icon :name="statusConfig[withdrawal.status]?.icon || 'mdi:help-circle-outline'" class="text-[13px]" />
												{{ statusConfig[withdrawal.status]?.label || withdrawal.status }}
											</span>
										</div>
										<p class="mt-[6px] text-[0.75rem] font-medium text-[#737373]">Richiesta #{{ withdrawal.id }}</p>
									</div>
									<div class="text-[0.6875rem] text-[#737373] tablet:text-right">
										<p class="font-medium">Inviata il</p>
										<p class="mt-[2px] whitespace-nowrap">{{ formatDate(withdrawal.created_at) }}</p>
									</div>
								</div>
								<p v-if="withdrawal.admin_notes" class="text-[0.75rem] text-[#737373] italic mt-[4px]">
									Note: {{ withdrawal.admin_notes }}
							</p>
							<p v-if="withdrawal.reviewed_at" class="text-[0.6875rem] text-[#737373] mt-[4px]">
								Verificata il {{ formatDate(withdrawal.reviewed_at) }}
							</p>
						</div>
					</div>
				</div>
			</template>
		</div>
	</section>
</template>
