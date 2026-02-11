<script setup>
definePageMeta({
	middleware: ["sanctum:auth"],
});

const { user } = useSanctumAuth();

const isPro = computed(() => user.value?.role === "Partner Pro");

const { data: referralData, refresh: refreshReferral } = useSanctumFetch("/api/referral/my-code", {
	immediate: isPro.value,
});

const { data: earnings, refresh: refreshEarnings } = useSanctumFetch("/api/referral/earnings", {
	immediate: isPro.value,
});

const copied = ref(false);

const copyCode = async () => {
	if (!referralData.value?.referral_code) return;
	try {
		await navigator.clipboard.writeText(referralData.value.referral_code);
		copied.value = true;
		setTimeout(() => (copied.value = false), 2000);
	} catch {
		const el = document.createElement("textarea");
		el.value = referralData.value.referral_code;
		document.body.appendChild(el);
		el.select();
		document.execCommand("copy");
		document.body.removeChild(el);
		copied.value = true;
		setTimeout(() => (copied.value = false), 2000);
	}
};

const formatDate = (dateStr) => {
	return new Date(dateStr).toLocaleDateString("it-IT", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
};
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[80px]">
		<div class="my-container max-w-[800px]">
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866]">Il tuo account</NuxtLink>
				<span class="mx-[6px]">/</span>
				<span class="font-semibold text-[#252B42]">Account Pro</span>
			</div>

			<!-- Not Pro -->
			<div v-if="!isPro" class="bg-white rounded-[16px] p-[32px] desktop:p-[48px] shadow-sm border border-[#E9EBEC] text-center">
				<div class="w-[72px] h-[72px] mx-auto mb-[24px] bg-[#F8F9FB] rounded-full flex items-center justify-center">
					<span class="text-[2rem]">&#9734;</span>
				</div>
				<h2 class="text-[1.5rem] font-bold text-[#252B42] mb-[12px]">Diventa Partner Pro</h2>
				<p class="text-[#737373] text-[0.9375rem] max-w-[480px] mx-auto mb-[24px] leading-[1.6]">
					Ottieni un codice referral personale e guadagna una commissione del 5% su ogni spedizione acquistata tramite il tuo codice.
				</p>
				<p class="text-[0.875rem] text-[#095866] font-medium">
					Il tuo account attuale: <span class="font-bold">{{ user?.role }}</span>
				</p>
			</div>

			<!-- Pro User Content -->
			<template v-else>
				<!-- Referral Code Card -->
				<div class="bg-gradient-to-br from-[#095866] to-[#0a7a8c] rounded-[16px] p-[32px] text-white mb-[32px] shadow-lg">
					<p class="text-[0.8125rem] opacity-70 uppercase tracking-[1px] mb-[12px]">Il tuo codice referral</p>
					<div class="flex items-center gap-[16px]">
						<span class="text-[2rem] desktop:text-[2.5rem] font-mono font-bold tracking-[4px]">
							{{ referralData?.referral_code || "--------" }}
						</span>
						<button
							@click="copyCode"
							class="px-[16px] py-[8px] bg-white/20 hover:bg-white/30 rounded-[8px] text-[0.8125rem] font-medium transition-all cursor-pointer backdrop-blur-sm">
							{{ copied ? "Copiato!" : "Copia" }}
						</button>
					</div>
					<p class="text-[0.8125rem] opacity-60 mt-[12px]">Condividi questo codice per far ottenere il 5% di sconto ai tuoi contatti.</p>
				</div>

				<!-- Stats Cards -->
				<div class="grid grid-cols-1 desktop:grid-cols-3 gap-[16px] mb-[32px]">
					<div class="bg-white rounded-[12px] p-[20px] border border-[#E9EBEC] shadow-sm">
						<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px]">Commissioni totali</p>
						<p class="text-[1.5rem] font-bold text-[#252B42] mt-[4px]">
							{{ referralData ? Number(referralData.total_earnings).toFixed(2) : "0.00" }} &euro;
						</p>
					</div>
					<div class="bg-white rounded-[12px] p-[20px] border border-[#E9EBEC] shadow-sm">
						<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px]">Utilizzi codice</p>
						<p class="text-[1.5rem] font-bold text-[#252B42] mt-[4px]">
							{{ referralData?.total_usages || 0 }}
						</p>
					</div>
					<div class="bg-white rounded-[12px] p-[20px] border border-[#E9EBEC] shadow-sm">
						<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px]">Saldo prelevabile</p>
						<p class="text-[1.5rem] font-bold text-emerald-600 mt-[4px]">
							{{ earnings ? Number(earnings.commission_balance).toFixed(2) : "0.00" }} &euro;
						</p>
						<NuxtLink to="/account/prelievi" class="text-[0.75rem] text-[#095866] hover:underline mt-[4px] inline-block">
							Richiedi prelievo &rarr;
						</NuxtLink>
					</div>
				</div>

				<!-- Earnings History -->
				<div class="bg-white rounded-[16px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
					<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px]">Storico commissioni</h2>

					<div v-if="!earnings?.data?.length" class="text-center py-[40px] text-[#737373]">
						<p>Nessuna commissione ancora.</p>
						<p class="text-[0.8125rem] mt-[4px]">Condividi il tuo codice per iniziare a guadagnare.</p>
					</div>

					<div v-else class="overflow-x-auto">
						<table class="w-full text-[0.875rem]">
							<thead>
								<tr class="border-b border-[#E9EBEC] text-left text-[#737373]">
									<th class="pb-[12px] font-medium">Data</th>
									<th class="pb-[12px] font-medium">Cliente</th>
									<th class="pb-[12px] font-medium text-right">Ordine</th>
									<th class="pb-[12px] font-medium text-right">Commissione</th>
									<th class="pb-[12px] font-medium text-center">Stato</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="usage in earnings.data" :key="usage.id" class="border-b border-[#F0F0F0]">
									<td class="py-[12px] text-[#404040]">{{ formatDate(usage.created_at) }}</td>
									<td class="py-[12px] text-[#404040]">{{ usage.buyer?.name }}</td>
									<td class="py-[12px] text-right text-[#404040]">{{ Number(usage.order_amount).toFixed(2) }} &euro;</td>
									<td class="py-[12px] text-right font-semibold text-emerald-600">+{{ Number(usage.commission_amount).toFixed(2) }} &euro;</td>
									<td class="py-[12px] text-center">
										<span
											:class="[
												'inline-block px-[8px] py-[2px] rounded-full text-[0.6875rem] font-medium',
												usage.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : usage.status === 'paid' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700',
											]">
											{{ usage.status === "confirmed" ? "Confermata" : usage.status === "paid" ? "Pagata" : "In attesa" }}
										</span>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</template>
		</div>
	</section>
</template>
