<script setup>
import { loadStripe } from "@stripe/stripe-js";

definePageMeta({
	middleware: ["sanctum:auth"],
});

const { user } = useSanctumAuth();

const { data: balance, refresh: refreshBalance } = useSanctumFetch("/api/wallet/balance");
const { data: movements, refresh: refreshMovements } = useSanctumFetch("/api/wallet/movements");
const { data: defaultPayment } = useSanctumFetch("/api/stripe/default-payment-method");

const topUpAmount = ref("");
const isLoading = ref(false);
const message = ref(null);
const messageType = ref("success");

const presetAmounts = [10, 25, 50, 100, 200];

const selectPreset = (amount) => {
	topUpAmount.value = amount;
};

const handleTopUp = async () => {
	if (!topUpAmount.value || topUpAmount.value < 1) {
		message.value = "Inserisci un importo minimo di 1,00 EUR";
		messageType.value = "error";
		return;
	}

	if (!defaultPayment.value?.card) {
		message.value = "Aggiungi una carta di pagamento prima di ricaricare.";
		messageType.value = "error";
		return;
	}

	isLoading.value = true;
	message.value = null;

	try {
		const { data, error } = await useSanctumFetch("/api/wallet/top-up", {
			method: "POST",
			body: {
				amount: Number(topUpAmount.value),
				payment_method_id: defaultPayment.value.card.id,
			},
		});

		if (data.value?.success) {
			message.value = `Ricarica di ${Number(topUpAmount.value).toFixed(2)} EUR completata!`;
			messageType.value = "success";
			topUpAmount.value = "";
			await refreshBalance();
			await refreshMovements();
		} else {
			message.value = error.value?.data?.message || "Errore durante la ricarica.";
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

const getMovementColor = (mov) => {
	if (mov.type === "credit") return "text-emerald-600";
	return "text-red-500";
};

const getMovementSign = (mov) => {
	return mov.type === "credit" ? "+" : "-";
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
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[80px]">
		<div class="my-container max-w-[800px]">
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866]">Il tuo account</NuxtLink>
				<span class="mx-[6px]">/</span>
				<span class="font-semibold text-[#252B42]">Portafoglio</span>
			</div>

			<!-- Balance Card -->
			<div class="bg-gradient-to-br from-[#095866] to-[#0a7a8c] rounded-[16px] p-[32px] text-white mb-[32px] shadow-lg">
				<p class="text-[0.875rem] opacity-80 uppercase tracking-[1px] mb-[8px]">Saldo disponibile</p>
				<p class="text-[2.5rem] desktop:text-[3rem] font-bold tracking-tight">
					{{ balance ? Number(balance.balance).toFixed(2) : "0.00" }}
					<span class="text-[1.25rem] font-normal opacity-70">EUR</span>
				</p>
				<div v-if="balance?.commission_balance !== null && balance?.commission_balance !== undefined" class="mt-[16px] pt-[16px] border-t border-white/20">
					<p class="text-[0.8125rem] opacity-70">Commissioni accumulate</p>
					<p class="text-[1.25rem] font-semibold">{{ Number(balance.commission_balance).toFixed(2) }} EUR</p>
				</div>
			</div>

			<!-- Top Up Section -->
			<div class="bg-white rounded-[16px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC] mb-[32px]">
				<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px]">Ricarica portafoglio</h2>

				<!-- Preset amounts -->
				<div class="flex flex-wrap gap-[10px] mb-[20px]">
					<button
						v-for="amount in presetAmounts"
						:key="amount"
						@click="selectPreset(amount)"
						:class="[
							'px-[20px] py-[10px] rounded-[8px] text-[0.9375rem] font-medium transition-all cursor-pointer border',
							topUpAmount == amount
								? 'bg-[#095866] text-white border-[#095866]'
								: 'bg-[#F8F9FB] text-[#252B42] border-[#E9EBEC] hover:border-[#095866]',
						]">
						{{ amount }},00 &euro;
					</button>
				</div>

				<!-- Custom amount -->
				<div class="flex items-center gap-[12px] mb-[20px]">
					<div class="relative flex-1">
						<span class="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#737373] text-[0.9375rem]">&euro;</span>
						<input
							v-model="topUpAmount"
							type="number"
							min="1"
							step="0.01"
							placeholder="Altro importo"
							class="w-full pl-[36px] pr-[14px] py-[12px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.9375rem] focus:border-[#095866] focus:outline-none transition-colors" />
					</div>
				</div>

				<!-- Payment method -->
				<div v-if="defaultPayment?.card" class="flex items-center gap-[12px] mb-[20px] p-[14px] bg-[#F8F9FB] rounded-[8px] border border-[#E9EBEC]">
					<div class="w-[40px] h-[26px] bg-[#252B42] rounded-[4px] flex items-center justify-center text-white text-[0.6875rem] font-bold uppercase">
						{{ defaultPayment.card.brand?.slice(0, 4) }}
					</div>
					<span class="text-[0.875rem] text-[#404040]">
						**** {{ defaultPayment.card.last4 }}
					</span>
					<span class="text-[0.75rem] text-[#737373] ml-auto">
						{{ defaultPayment.card.exp_month }}/{{ defaultPayment.card.exp_year }}
					</span>
				</div>
				<div v-else class="mb-[20px] p-[14px] bg-amber-50 rounded-[8px] border border-amber-200 text-amber-700 text-[0.875rem]">
					Nessuna carta salvata.
					<NuxtLink to="/account/carte" class="underline font-semibold">Aggiungi una carta</NuxtLink>
				</div>

				<button
					@click="handleTopUp"
					:disabled="isLoading || !defaultPayment?.card"
					:class="[
						'w-full py-[14px] rounded-[10px] text-white font-semibold text-[1rem] transition-all',
						isLoading || !defaultPayment?.card
							? 'bg-gray-300 cursor-not-allowed'
							: 'bg-[#095866] hover:bg-[#0a7a8c] cursor-pointer',
					]">
					<span v-if="isLoading">Elaborazione...</span>
					<span v-else>Ricarica</span>
				</button>

				<!-- Feedback message -->
				<p v-if="message" :class="['mt-[14px] text-[0.875rem] text-center font-medium', messageType === 'success' ? 'text-emerald-600' : 'text-red-500']">
					{{ message }}
				</p>
			</div>

			<!-- Movements -->
			<div class="bg-white rounded-[16px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
				<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px]">Movimenti</h2>

				<div v-if="!movements?.data?.length" class="text-center py-[40px] text-[#737373]">
					<p class="text-[1rem]">Nessun movimento</p>
					<p class="text-[0.8125rem] mt-[4px]">I tuoi movimenti appariranno qui dopo la prima ricarica.</p>
				</div>

				<ul v-else class="divide-y divide-[#F0F0F0]">
					<li v-for="mov in movements.data" :key="mov.id" class="flex items-center justify-between py-[14px]">
						<div class="flex-1 min-w-0">
							<p class="text-[0.9375rem] font-medium text-[#252B42] truncate">{{ mov.description }}</p>
							<div class="flex items-center gap-[8px] mt-[4px]">
								<span class="text-[0.75rem] text-[#737373]">{{ formatDate(mov.created_at) }}</span>
								<span class="text-[0.6875rem] px-[8px] py-[2px] rounded-full bg-[#F0F0F0] text-[#737373]">{{ getSourceLabel(mov.source) }}</span>
							</div>
						</div>
						<span :class="['text-[1rem] font-semibold tabular-nums whitespace-nowrap ml-[16px]', getMovementColor(mov)]">
							{{ getMovementSign(mov) }}{{ Number(mov.amount).toFixed(2) }} &euro;
						</span>
					</li>
				</ul>
			</div>
		</div>
	</section>
</template>
