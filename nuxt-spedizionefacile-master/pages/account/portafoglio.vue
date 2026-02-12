<script setup>
import { loadStripe } from "@stripe/stripe-js";

definePageMeta({
	middleware: ["sanctum:auth"],
});

const { user } = useSanctumAuth();
const sanctum = useSanctumClient();

const balance = ref(null);
const movements = ref([]);
const defaultPaymentMethod = ref(null);
const isLoadingBalance = ref(true);
const isLoadingMovements = ref(true);

const topUpAmount = ref("");
const isLoading = ref(false);
const message = ref(null);
const messageType = ref("success");
const activeTab = ref("topup");

const presetAmounts = [10, 25, 50, 100, 200];

const fetchBalance = async () => {
	try {
		const res = await sanctum("/api/wallet/balance");
		balance.value = res;
	} catch (e) {
		balance.value = { balance: 0, commission_balance: 0 };
	} finally {
		isLoadingBalance.value = false;
	}
};

const fetchMovements = async () => {
	try {
		const res = await sanctum("/api/wallet/movements");
		movements.value = res?.data || res || [];
	} catch (e) {
		movements.value = [];
	} finally {
		isLoadingMovements.value = false;
	}
};

const fetchPaymentMethod = async () => {
	try {
		const res = await sanctum("/api/stripe/default-payment-method");
		defaultPaymentMethod.value = res;
	} catch (e) {
		defaultPaymentMethod.value = null;
	}
};

onMounted(async () => {
	await Promise.all([fetchBalance(), fetchMovements(), fetchPaymentMethod()]);
});

const selectPreset = (amount) => {
	topUpAmount.value = amount;
};

const handleTopUp = async () => {
	if (!topUpAmount.value || topUpAmount.value < 1) {
		message.value = "Inserisci un importo minimo di 1,00 EUR";
		messageType.value = "error";
		return;
	}

	if (!defaultPaymentMethod.value?.card) {
		message.value = "Aggiungi una carta di pagamento prima di ricaricare.";
		messageType.value = "error";
		return;
	}

	isLoading.value = true;
	message.value = null;

	try {
		const result = await sanctum("/api/wallet/top-up", {
			method: "POST",
			body: {
				amount: Number(topUpAmount.value),
				payment_method_id: defaultPaymentMethod.value.card.id,
			},
		});

		if (result?.success) {
			message.value = `Ricarica di €${Number(topUpAmount.value).toFixed(2)} completata!`;
			messageType.value = "success";
			topUpAmount.value = "";
			await fetchBalance();
			await fetchMovements();
		} else {
			message.value = result?.message || "Errore durante la ricarica.";
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

const getMovementColor = (mov) => {
	if (mov.type === "credit") return "text-emerald-600";
	return "text-red-500";
};

const getMovementSign = (mov) => {
	return mov.type === "credit" ? "+" : "-";
};

const getMovementIcon = (mov) => {
	if (mov.source === "stripe") return mov.type === "credit" ? "mdi:credit-card-plus-outline" : "mdi:credit-card-minus-outline";
	if (mov.source === "commission") return "mdi:account-cash-outline";
	if (mov.source === "withdrawal") return "mdi:bank-transfer-out";
	if (mov.source === "wallet") return "mdi:wallet-outline";
	if (mov.source === "refund") return "mdi:cash-refund";
	return "mdi:swap-horizontal";
};

const getSourceLabel = (source) => {
	const labels = {
		stripe: "Carta",
		commission: "Commissione",
		withdrawal: "Prelievo",
		wallet: "Portafoglio",
		refund: "Rimborso",
	};
	return labels[source] || source || "—";
};

const getSourceColor = (source) => {
	const colors = {
		stripe: "bg-blue-50 text-blue-700",
		commission: "bg-amber-50 text-amber-700",
		withdrawal: "bg-purple-50 text-purple-700",
		wallet: "bg-teal-50 text-teal-700",
		refund: "bg-rose-50 text-rose-700",
	};
	return colors[source] || "bg-gray-50 text-gray-600";
};

const isPro = computed(() => user.value?.role === "Partner Pro");
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container max-w-[900px]">
			<!-- Breadcrumb -->
			<div class="mb-[28px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866] font-medium">Il tuo account</NuxtLink>
				<span class="mx-[8px] text-[#C8CCD0]">/</span>
				<span class="font-semibold text-[#252B42]">Portafoglio</span>
			</div>

			<!-- Balance Cards Row -->
			<div class="grid grid-cols-1 desktop:grid-cols-2 gap-[20px] mb-[32px]">
				<!-- Main Balance -->
				<div class="relative bg-gradient-to-br from-[#095866] to-[#0a7a8c] rounded-[20px] p-[28px] desktop:p-[32px] text-white shadow-[0_8px_32px_rgba(9,88,102,0.25)] overflow-hidden">
					<div class="absolute top-0 right-0 w-[200px] h-[200px] rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2"></div>
					<div class="absolute bottom-0 left-0 w-[120px] h-[120px] rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2"></div>
					<div class="relative z-1">
						<div class="flex items-center gap-[10px] mb-[16px]">
							<div class="w-[40px] h-[40px] rounded-[10px] bg-white/15 flex items-center justify-center">
								<Icon name="mdi:wallet-outline" class="text-[22px]" />
							</div>
							<p class="text-[0.8125rem] uppercase tracking-[1.5px] opacity-80 font-medium">Saldo disponibile</p>
						</div>
						<p class="text-[2.25rem] desktop:text-[2.75rem] font-bold tracking-tight leading-none">
							&euro;{{ balance ? Number(balance.balance).toFixed(2) : "0.00" }}
						</p>
						<p class="text-[0.8125rem] opacity-60 mt-[8px]">Portafoglio SpedizioneFacile</p>
					</div>
				</div>

				<!-- Commission Balance (Pro users) -->
				<div v-if="isPro" class="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-[20px] p-[28px] desktop:p-[32px] text-white shadow-[0_8px_32px_rgba(26,26,46,0.25)] overflow-hidden">
					<div class="absolute top-0 right-0 w-[180px] h-[180px] rounded-full bg-amber-400/5 -translate-y-1/2 translate-x-1/2"></div>
					<div class="relative z-1">
						<div class="flex items-center gap-[10px] mb-[16px]">
							<div class="w-[40px] h-[40px] rounded-[10px] bg-amber-400/15 flex items-center justify-center">
								<Icon name="mdi:account-cash-outline" class="text-[22px] text-amber-400" />
							</div>
							<p class="text-[0.8125rem] uppercase tracking-[1.5px] opacity-80 font-medium">Commissioni</p>
						</div>
						<p class="text-[2.25rem] desktop:text-[2.75rem] font-bold tracking-tight leading-none">
							&euro;{{ balance ? Number(balance.commission_balance || 0).toFixed(2) : "0.00" }}
						</p>
						<NuxtLink to="/account/prelievi" class="inline-flex items-center gap-[6px] mt-[12px] text-[0.8125rem] text-amber-400 hover:text-amber-300 font-medium transition-colors">
							Richiedi prelievo
							<Icon name="mdi:arrow-right" class="text-[16px]" />
						</NuxtLink>
					</div>
				</div>

				<!-- Non-Pro: Quick actions -->
				<div v-else class="bg-white rounded-[20px] p-[28px] desktop:p-[32px] border border-[#E9EBEC] shadow-sm flex flex-col justify-between">
					<div>
						<h3 class="text-[1rem] font-bold text-[#252B42] mb-[8px]">Azioni rapide</h3>
						<p class="text-[0.8125rem] text-[#737373] leading-[1.5]">Gestisci il tuo portafoglio e i metodi di pagamento.</p>
					</div>
					<div class="flex flex-col gap-[10px] mt-[20px]">
						<NuxtLink to="/account/carte" class="flex items-center gap-[10px] text-[0.875rem] font-medium text-[#095866] hover:text-[#0a7a8c] transition-colors">
							<Icon name="mdi:credit-card-outline" class="text-[18px]" />
							Gestisci carte
						</NuxtLink>
						<NuxtLink to="/account/spedizioni" class="flex items-center gap-[10px] text-[0.875rem] font-medium text-[#095866] hover:text-[#0a7a8c] transition-colors">
							<Icon name="mdi:truck-fast-outline" class="text-[18px]" />
							Le tue spedizioni
						</NuxtLink>
					</div>
				</div>
			</div>

			<!-- Top Up Section -->
			<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC] mb-[24px]">
				<div class="flex items-center gap-[12px] mb-[24px]">
					<div class="w-[40px] h-[40px] rounded-[10px] bg-emerald-50 flex items-center justify-center">
						<Icon name="mdi:plus-circle-outline" class="text-[22px] text-emerald-600" />
					</div>
					<div>
						<h2 class="text-[1.125rem] font-bold text-[#252B42]">Ricarica portafoglio</h2>
						<p class="text-[0.8125rem] text-[#737373]">Seleziona o inserisci l'importo da ricaricare</p>
					</div>
				</div>

				<!-- Preset amounts -->
				<div class="grid grid-cols-3 account-pages:grid-cols-5 gap-[10px] mb-[20px]">
					<button
						v-for="amount in presetAmounts"
						:key="amount"
						@click="selectPreset(amount)"
						:class="[
							'py-[14px] rounded-[12px] text-[0.9375rem] font-semibold transition-all cursor-pointer border-2',
							topUpAmount == amount
								? 'bg-[#095866] text-white border-[#095866] shadow-[0_2px_8px_rgba(9,88,102,0.3)]'
								: 'bg-white text-[#252B42] border-[#E9EBEC] hover:border-[#095866] hover:bg-[#f0fafb]',
						]">
						&euro;{{ amount }}
					</button>
				</div>

				<!-- Custom amount -->
				<div class="relative mb-[20px]">
					<span class="absolute left-[16px] top-1/2 -translate-y-1/2 text-[#737373] text-[1.125rem] font-medium">&euro;</span>
					<input
						v-model="topUpAmount"
						type="number"
						min="1"
						step="0.01"
						placeholder="Inserisci importo personalizzato"
						class="w-full pl-[40px] pr-[16px] py-[14px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[12px] text-[1rem] focus:border-[#095866] focus:bg-white focus:outline-none focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] transition-all" />
				</div>

				<!-- Payment method display -->
				<div v-if="defaultPaymentMethod?.card" class="flex items-center gap-[14px] mb-[20px] p-[16px] bg-[#F8F9FB] rounded-[12px] border border-[#E9EBEC]">
					<div class="w-[48px] h-[32px] bg-gradient-to-br from-[#1a1a2e] to-[#4a4a6a] rounded-[6px] flex items-center justify-center text-white text-[0.6875rem] font-bold uppercase tracking-wider">
						{{ defaultPaymentMethod.card.brand?.slice(0, 4) }}
					</div>
					<div class="flex-1">
						<span class="text-[0.9375rem] font-medium text-[#252B42]">
							•••• {{ defaultPaymentMethod.card.last4 }}
						</span>
						<span class="text-[0.75rem] text-[#737373] ml-[8px]">
							Scad. {{ defaultPaymentMethod.card.exp_month }}/{{ defaultPaymentMethod.card.exp_year }}
						</span>
					</div>
					<NuxtLink to="/account/carte" class="text-[0.8125rem] text-[#095866] font-medium hover:underline">Cambia</NuxtLink>
				</div>
				<div v-else class="mb-[20px] p-[16px] bg-amber-50/80 rounded-[12px] border border-amber-200 text-[0.875rem]">
					<div class="flex items-center gap-[10px]">
						<Icon name="mdi:alert-circle-outline" class="text-[20px] text-amber-600" />
						<span class="text-amber-800">
							Nessuna carta salvata.
							<NuxtLink to="/account/carte" class="underline font-semibold text-amber-900">Aggiungi una carta</NuxtLink>
						</span>
					</div>
				</div>

				<button
					@click="handleTopUp"
					:disabled="isLoading || !defaultPaymentMethod?.card"
					:class="[
						'w-full py-[16px] rounded-[12px] text-white font-semibold text-[1rem] transition-all flex items-center justify-center gap-[8px]',
						isLoading || !defaultPaymentMethod?.card
							? 'bg-gray-200 text-gray-400 cursor-not-allowed'
							: 'bg-[#095866] hover:bg-[#0a7a8c] cursor-pointer shadow-[0_2px_8px_rgba(9,88,102,0.25)] hover:shadow-[0_4px_16px_rgba(9,88,102,0.3)]',
					]">
					<Icon v-if="!isLoading" name="mdi:wallet-plus-outline" class="text-[20px]" />
					<span v-if="isLoading">Elaborazione in corso...</span>
					<span v-else>Ricarica{{ topUpAmount ? ` €${Number(topUpAmount).toFixed(2)}` : '' }}</span>
				</button>

				<!-- Feedback message -->
				<div v-if="message" :class="['mt-[16px] p-[14px] rounded-[10px] text-[0.875rem] font-medium flex items-center gap-[8px]', messageType === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600']">
					<Icon :name="messageType === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'" class="text-[18px] shrink-0" />
					{{ message }}
				</div>
			</div>

			<!-- Movements History -->
			<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
				<div class="flex items-center justify-between mb-[24px]">
					<div class="flex items-center gap-[12px]">
						<div class="w-[40px] h-[40px] rounded-[10px] bg-blue-50 flex items-center justify-center">
							<Icon name="mdi:history" class="text-[22px] text-blue-600" />
						</div>
						<h2 class="text-[1.125rem] font-bold text-[#252B42]">Movimenti</h2>
					</div>
					<span v-if="movements?.length" class="text-[0.8125rem] text-[#737373] bg-[#F0F0F0] px-[10px] py-[4px] rounded-full">
						{{ movements.length }} {{ movements.length === 1 ? 'movimento' : 'movimenti' }}
					</span>
				</div>

				<div v-if="isLoadingMovements" class="py-[40px] flex justify-center">
					<div class="w-[32px] h-[32px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></div>
				</div>

				<div v-else-if="!movements?.length" class="text-center py-[48px]">
					<div class="w-[64px] h-[64px] mx-auto mb-[16px] rounded-full bg-[#F8F9FB] flex items-center justify-center">
						<Icon name="mdi:receipt-text-outline" class="text-[28px] text-[#C8CCD0]" />
					</div>
					<p class="text-[1rem] font-medium text-[#252B42]">Nessun movimento</p>
					<p class="text-[0.8125rem] text-[#737373] mt-[6px]">I movimenti appariranno qui dopo la prima ricarica.</p>
				</div>

				<ul v-else class="space-y-[4px]">
					<li v-for="mov in movements" :key="mov.id" class="flex items-center gap-[14px] p-[14px] rounded-[12px] hover:bg-[#F8F9FB] transition-colors">
						<div :class="['w-[42px] h-[42px] rounded-[10px] flex items-center justify-center shrink-0', mov.type === 'credit' ? 'bg-emerald-50' : 'bg-red-50']">
							<Icon :name="getMovementIcon(mov)" :class="['text-[20px]', mov.type === 'credit' ? 'text-emerald-600' : 'text-red-500']" />
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-[0.9375rem] font-medium text-[#252B42] truncate">{{ mov.description }}</p>
							<div class="flex items-center gap-[8px] mt-[4px]">
								<span class="text-[0.75rem] text-[#737373]">{{ formatDate(mov.created_at) }}</span>
								<span :class="['text-[0.6875rem] px-[8px] py-[2px] rounded-full font-medium', getSourceColor(mov.source)]">{{ getSourceLabel(mov.source) }}</span>
							</div>
						</div>
						<span :class="['text-[1rem] font-bold tabular-nums whitespace-nowrap', getMovementColor(mov)]">
							{{ getMovementSign(mov) }}&euro;{{ Number(mov.amount).toFixed(2) }}
						</span>
					</li>
				</ul>
			</div>
		</div>
	</section>
</template>
