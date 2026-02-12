<script setup>
definePageMeta({
	middleware: ["sanctum:auth"],
});

const { user } = useSanctumAuth();
const sanctum = useSanctumClient();

const isPro = computed(() => user.value?.role === "Partner Pro");

const withdrawals = ref([]);
const earnings = ref(null);
const isLoadingData = ref(true);
const isLoading = ref(false);
const message = ref(null);
const messageType = ref("success");

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

const availableBalance = computed(() => {
	if (!earnings.value) return 0;
	return Number(earnings.value.commission_balance || 0);
});

const hasPending = computed(() => {
	if (!Array.isArray(withdrawals.value)) return false;
	return withdrawals.value.some((w) => w.status === "pending");
});

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

const statusConfig = {
	pending: { label: "In attesa", icon: "mdi:clock-outline", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
	approved: { label: "Approvata", icon: "mdi:check-circle-outline", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
	rejected: { label: "Rifiutata", icon: "mdi:close-circle-outline", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
	completed: { label: "Completata", icon: "mdi:check-all", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
};
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container max-w-[900px]">
			<!-- Breadcrumb -->
			<div class="mb-[28px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866] font-medium">Il tuo account</NuxtLink>
				<span class="mx-[8px] text-[#C8CCD0]">/</span>
				<span class="font-semibold text-[#252B42]">Prelievi</span>
			</div>

			<!-- Not Pro -->
			<div v-if="!isPro" class="bg-white rounded-[20px] p-[32px] desktop:p-[48px] shadow-sm border border-[#E9EBEC] text-center">
				<div class="w-[80px] h-[80px] mx-auto mb-[24px] bg-gradient-to-br from-teal-50 to-teal-100 rounded-full flex items-center justify-center">
					<Icon name="mdi:cash-multiple" class="text-[36px] text-teal-500" />
				</div>
				<h2 class="text-[1.5rem] font-bold text-[#252B42] mb-[12px]">Sezione riservata ai Partner Pro</h2>
				<p class="text-[#737373] text-[0.9375rem] max-w-[480px] mx-auto mb-[24px] leading-[1.6]">
					I prelievi delle commissioni sono disponibili solo per gli account Partner Pro.
				</p>
				<NuxtLink to="/account/account-pro" class="inline-flex items-center gap-[8px] px-[24px] py-[12px] bg-[#095866] text-white rounded-[10px] font-semibold text-[0.9375rem] hover:bg-[#0a7a8c] transition-colors">
					<Icon name="mdi:star-outline" class="text-[18px]" />
					Scopri Account Pro
				</NuxtLink>
			</div>

			<!-- Pro User Content -->
			<template v-else>
				<!-- Balance + Request Card -->
				<div class="relative bg-gradient-to-br from-[#095866] to-[#0a7a8c] rounded-[20px] p-[32px] text-white mb-[24px] shadow-[0_8px_32px_rgba(9,88,102,0.25)] overflow-hidden">
					<div class="absolute top-0 right-0 w-[200px] h-[200px] rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2"></div>
					<div class="relative z-1 flex flex-col desktop:flex-row desktop:items-center desktop:justify-between gap-[20px]">
						<div>
							<div class="flex items-center gap-[10px] mb-[12px]">
								<div class="w-[40px] h-[40px] rounded-[10px] bg-white/15 flex items-center justify-center">
									<Icon name="mdi:bank-transfer-out" class="text-[22px]" />
								</div>
								<p class="text-[0.8125rem] uppercase tracking-[1.5px] opacity-80 font-medium">Saldo prelevabile</p>
							</div>
							<p class="text-[2.5rem] desktop:text-[3rem] font-bold tracking-tight leading-none">
								&euro;{{ availableBalance.toFixed(2) }}
							</p>
							<p class="text-[0.8125rem] opacity-60 mt-[8px]">Commissioni accumulate dalle referral</p>
						</div>
						<div class="flex flex-col items-start desktop:items-end gap-[8px]">
							<button
								@click="requestWithdrawal"
								:disabled="isLoading || hasPending || availableBalance < 1"
								:class="[
									'px-[28px] py-[14px] rounded-[12px] font-semibold text-[0.9375rem] transition-all flex items-center gap-[8px]',
									isLoading || hasPending || availableBalance < 1
										? 'bg-white/20 cursor-not-allowed text-white/50'
										: 'bg-white text-[#095866] hover:bg-white/90 cursor-pointer shadow-lg',
								]">
								<Icon v-if="!isLoading && !hasPending" name="mdi:bank-transfer-out" class="text-[18px]" />
								<Icon v-if="hasPending && !isLoading" name="mdi:clock-outline" class="text-[18px]" />
								<span v-if="isLoading">Invio in corso...</span>
								<span v-else-if="hasPending">Richiesta in attesa</span>
								<span v-else>Richiedi prelievo</span>
							</button>
							<p v-if="hasPending" class="text-[0.75rem] opacity-60">In attesa di approvazione dall'admin.</p>
						</div>
					</div>

					<div v-if="message" :class="['mt-[20px] text-[0.875rem] font-medium rounded-[10px] px-[16px] py-[12px] flex items-center gap-[8px]', messageType === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20']">
						<Icon :name="messageType === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'" class="text-[18px]" />
						{{ message }}
					</div>
				</div>

				<!-- How it works -->
				<div class="bg-white rounded-[16px] p-[24px] border border-[#E9EBEC] shadow-sm mb-[24px]">
					<h3 class="text-[0.9375rem] font-bold text-[#252B42] mb-[16px] flex items-center gap-[8px]">
						<Icon name="mdi:information-outline" class="text-[18px] text-[#095866]" />
						Come funziona il prelievo
					</h3>
					<div class="grid grid-cols-1 account-pages:grid-cols-2 desktop:grid-cols-4 gap-[16px]">
						<div class="flex items-start gap-[12px]">
							<div class="w-[32px] h-[32px] rounded-full bg-[#095866]/10 flex items-center justify-center shrink-0 text-[0.8125rem] font-bold text-[#095866]">1</div>
							<p class="text-[0.8125rem] text-[#404040] leading-[1.5]">Il saldo include tutte le commissioni confermate.</p>
						</div>
						<div class="flex items-start gap-[12px]">
							<div class="w-[32px] h-[32px] rounded-full bg-[#095866]/10 flex items-center justify-center shrink-0 text-[0.8125rem] font-bold text-[#095866]">2</div>
							<p class="text-[0.8125rem] text-[#404040] leading-[1.5]">Invia richiesta per l'intero saldo disponibile.</p>
						</div>
						<div class="flex items-start gap-[12px]">
							<div class="w-[32px] h-[32px] rounded-full bg-[#095866]/10 flex items-center justify-center shrink-0 text-[0.8125rem] font-bold text-[#095866]">3</div>
							<p class="text-[0.8125rem] text-[#404040] leading-[1.5]">L'admin verifica e approva la richiesta.</p>
						</div>
						<div class="flex items-start gap-[12px]">
							<div class="w-[32px] h-[32px] rounded-full bg-[#095866]/10 flex items-center justify-center shrink-0 text-[0.8125rem] font-bold text-[#095866]">4</div>
							<p class="text-[0.8125rem] text-[#404040] leading-[1.5]">L'importo viene accreditato sulla tua carta.</p>
						</div>
					</div>
				</div>

				<!-- Withdrawal History -->
				<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
					<div class="flex items-center gap-[12px] mb-[24px]">
						<div class="w-[40px] h-[40px] rounded-[10px] bg-purple-50 flex items-center justify-center">
							<Icon name="mdi:history" class="text-[22px] text-purple-600" />
						</div>
						<h2 class="text-[1.125rem] font-bold text-[#252B42]">Storico richieste</h2>
					</div>

					<div v-if="isLoadingData" class="py-[40px] flex justify-center">
						<div class="w-[32px] h-[32px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></div>
					</div>

					<div v-else-if="!withdrawals?.length" class="text-center py-[48px]">
						<div class="w-[64px] h-[64px] mx-auto mb-[16px] rounded-full bg-[#F8F9FB] flex items-center justify-center">
							<Icon name="mdi:bank-transfer" class="text-[28px] text-[#C8CCD0]" />
						</div>
						<p class="text-[1rem] font-medium text-[#252B42]">Nessuna richiesta di prelievo</p>
						<p class="text-[0.8125rem] text-[#737373] mt-[6px]">Le tue richieste appariranno qui.</p>
					</div>

					<div v-else class="space-y-[12px]">
						<div
							v-for="withdrawal in withdrawals"
							:key="withdrawal.id"
							:class="['p-[20px] rounded-[14px] border transition-colors', statusConfig[withdrawal.status]?.border || 'border-[#E9EBEC]', statusConfig[withdrawal.status]?.bg || 'bg-white']">
							<div class="flex items-center justify-between mb-[8px]">
								<div class="flex items-center gap-[10px]">
									<span class="text-[1.125rem] font-bold text-[#252B42]">&euro;{{ Number(withdrawal.amount).toFixed(2) }}</span>
									<span
										:class="[
											'inline-flex items-center gap-[4px] px-[10px] py-[3px] rounded-full text-[0.6875rem] font-medium',
											statusConfig[withdrawal.status]?.text || 'text-gray-700',
										]">
										<Icon :name="statusConfig[withdrawal.status]?.icon || 'mdi:help-circle-outline'" class="text-[14px]" />
										{{ statusConfig[withdrawal.status]?.label || withdrawal.status }}
									</span>
								</div>
								<span class="text-[0.75rem] text-[#737373]">{{ formatDate(withdrawal.created_at) }}</span>
							</div>
							<p v-if="withdrawal.admin_notes" class="text-[0.8125rem] text-[#737373] italic mt-[4px]">
								Note: {{ withdrawal.admin_notes }}
							</p>
							<p v-if="withdrawal.reviewed_at" class="text-[0.75rem] text-[#737373] mt-[4px]">
								Verificata il {{ formatDate(withdrawal.reviewed_at) }}
							</p>
						</div>
					</div>
				</div>
			</template>
		</div>
	</section>
</template>
