<script setup>
definePageMeta({
	middleware: ["sanctum:auth"],
});

const { user } = useSanctumAuth();

const isPro = computed(() => user.value?.role === "Partner Pro");

const { data: withdrawals, refresh: refreshWithdrawals } = useSanctumFetch("/api/withdrawals", {
	immediate: isPro.value,
});

const { data: earnings, refresh: refreshEarnings } = useSanctumFetch("/api/referral/earnings", {
	immediate: isPro.value,
});

const isLoading = ref(false);
const message = ref(null);
const messageType = ref("success");

const availableBalance = computed(() => {
	if (!earnings.value) return 0;
	return Number(earnings.value.commission_balance || 0);
});

const hasPending = computed(() => {
	if (!withdrawals.value?.data) return false;
	return withdrawals.value.data.some((w) => w.status === "pending");
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
		const result = await useSanctumFetch("/api/withdrawals", {
			method: "POST",
		});

		if (result.data.value?.success) {
			message.value = `Richiesta di prelievo di ${availableBalance.value.toFixed(2)} EUR inviata con successo.`;
			messageType.value = "success";
			await refreshWithdrawals();
			await refreshEarnings();
		} else {
			message.value = result.data.value?.message || "Errore durante la richiesta.";
			messageType.value = "error";
		}
	} catch (e) {
		message.value = "Errore imprevisto. Riprova.";
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
	pending: { label: "In attesa", bg: "bg-amber-50", text: "text-amber-700" },
	approved: { label: "Approvata", bg: "bg-emerald-50", text: "text-emerald-700" },
	rejected: { label: "Rifiutata", bg: "bg-red-50", text: "text-red-700" },
};
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[80px]">
		<div class="my-container max-w-[800px]">
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866]">Il tuo account</NuxtLink>
				<span class="mx-[6px]">/</span>
				<span class="font-semibold text-[#252B42]">Prelievi</span>
			</div>

			<!-- Not Pro -->
			<div v-if="!isPro" class="bg-white rounded-[16px] p-[32px] desktop:p-[48px] shadow-sm border border-[#E9EBEC] text-center">
				<div class="w-[72px] h-[72px] mx-auto mb-[24px] bg-[#F8F9FB] rounded-full flex items-center justify-center">
					<span class="text-[2rem]">&#128176;</span>
				</div>
				<h2 class="text-[1.5rem] font-bold text-[#252B42] mb-[12px]">Sezione riservata ai Partner Pro</h2>
				<p class="text-[#737373] text-[0.9375rem] max-w-[480px] mx-auto mb-[24px] leading-[1.6]">
					I prelievi delle commissioni sono disponibili solo per gli account Partner Pro.
				</p>
				<NuxtLink to="/account/account-pro" class="inline-block px-[24px] py-[12px] bg-[#095866] text-white rounded-[10px] font-semibold text-[0.9375rem] hover:bg-[#0a7a8c] transition-colors">
					Scopri Account Pro
				</NuxtLink>
			</div>

			<!-- Pro User Content -->
			<template v-else>
				<!-- Balance + Request Card -->
				<div class="bg-gradient-to-br from-[#095866] to-[#0a7a8c] rounded-[16px] p-[32px] text-white mb-[32px] shadow-lg">
					<div class="flex flex-col desktop:flex-row desktop:items-center desktop:justify-between gap-[20px]">
						<div>
							<p class="text-[0.8125rem] opacity-70 uppercase tracking-[1px] mb-[8px]">Saldo prelevabile</p>
							<p class="text-[2.5rem] font-bold tracking-tight">
								{{ availableBalance.toFixed(2) }}
								<span class="text-[1.25rem] font-normal opacity-70">EUR</span>
							</p>
						</div>
						<div class="flex flex-col items-start desktop:items-end gap-[8px]">
							<button
								@click="requestWithdrawal"
								:disabled="isLoading || hasPending || availableBalance < 1"
								:class="[
									'px-[28px] py-[14px] rounded-[10px] font-semibold text-[0.9375rem] transition-all',
									isLoading || hasPending || availableBalance < 1
										? 'bg-white/20 cursor-not-allowed text-white/50'
										: 'bg-white text-[#095866] hover:bg-white/90 cursor-pointer shadow-md',
								]">
								<span v-if="isLoading">Invio in corso...</span>
								<span v-else-if="hasPending">Richiesta in attesa</span>
								<span v-else>Richiedi prelievo</span>
							</button>
							<p v-if="hasPending" class="text-[0.75rem] opacity-60">Hai già una richiesta in attesa di approvazione.</p>
						</div>
					</div>

					<p v-if="message" :class="['mt-[16px] text-[0.875rem] font-medium rounded-[8px] px-[16px] py-[10px]', messageType === 'success' ? 'bg-emerald-500/20 text-white' : 'bg-red-500/20 text-white']">
						{{ message }}
					</p>
				</div>

				<!-- Info Box -->
				<div class="bg-[#F0F9FB] rounded-[12px] p-[20px] border border-[#D0E8EC] mb-[32px]">
					<h3 class="text-[0.9375rem] font-semibold text-[#095866] mb-[8px]">Come funziona il prelievo</h3>
					<ul class="text-[0.8125rem] text-[#404040] space-y-[6px] leading-[1.6]">
						<li>1. Il saldo prelevabile include tutte le commissioni confermate.</li>
						<li>2. Puoi inviare una richiesta di prelievo per l'intero saldo disponibile.</li>
						<li>3. La richiesta viene verificata e approvata dall'amministrazione.</li>
						<li>4. Una volta approvata, l'importo viene accreditato sul tuo metodo di pagamento.</li>
					</ul>
				</div>

				<!-- Withdrawal History -->
				<div class="bg-white rounded-[16px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
					<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px]">Storico richieste</h2>

					<div v-if="!withdrawals?.data?.length" class="text-center py-[40px] text-[#737373]">
						<p class="text-[1rem]">Nessuna richiesta di prelievo</p>
						<p class="text-[0.8125rem] mt-[4px]">Le tue richieste appariranno qui.</p>
					</div>

					<div v-else class="space-y-[12px]">
						<div
							v-for="withdrawal in withdrawals.data"
							:key="withdrawal.id"
							class="flex items-center justify-between p-[16px] rounded-[10px] border border-[#F0F0F0] hover:border-[#E0E0E0] transition-colors">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-[10px] mb-[4px]">
									<span class="text-[1rem] font-semibold text-[#252B42]">{{ Number(withdrawal.amount).toFixed(2) }} EUR</span>
									<span
										:class="[
											'inline-block px-[10px] py-[3px] rounded-full text-[0.6875rem] font-medium',
											statusConfig[withdrawal.status]?.bg || 'bg-gray-50',
											statusConfig[withdrawal.status]?.text || 'text-gray-700',
										]">
										{{ statusConfig[withdrawal.status]?.label || withdrawal.status }}
									</span>
								</div>
								<p class="text-[0.75rem] text-[#737373]">{{ formatDate(withdrawal.created_at) }}</p>
								<p v-if="withdrawal.admin_notes" class="text-[0.75rem] text-[#737373] mt-[4px] italic">
									Note: {{ withdrawal.admin_notes }}
								</p>
							</div>
							<div v-if="withdrawal.reviewed_at" class="text-right ml-[16px]">
								<p class="text-[0.6875rem] text-[#737373]">Verificata il</p>
								<p class="text-[0.75rem] text-[#404040]">{{ formatDate(withdrawal.reviewed_at) }}</p>
							</div>
						</div>
					</div>
				</div>
			</template>
		</div>
	</section>
</template>
