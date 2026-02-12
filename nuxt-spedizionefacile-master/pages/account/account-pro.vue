<script setup>
definePageMeta({
	middleware: ["sanctum:auth"],
});

const { user } = useSanctumAuth();
const sanctum = useSanctumClient();

const isPro = computed(() => user.value?.role === "Partner Pro");

const referralData = ref(null);
const earnings = ref(null);
const isLoading = ref(true);

const fetchData = async () => {
	if (!isPro.value) {
		isLoading.value = false;
		return;
	}
	try {
		const [refData, earningsData] = await Promise.all([
			sanctum("/api/referral/my-code"),
			sanctum("/api/referral/earnings"),
		]);
		referralData.value = refData;
		earnings.value = earningsData;
	} catch (e) {
		// Silently handle
	} finally {
		isLoading.value = false;
	}
};

onMounted(fetchData);

const copied = ref(false);
const copiedAccountCode = ref(false);

const copyCode = async () => {
	if (!referralData.value?.referral_code) return;
	try {
		await navigator.clipboard.writeText(referralData.value.referral_code);
		copied.value = true;
		setTimeout(() => (copied.value = false), 2000);
	} catch {
		fallbackCopy(referralData.value.referral_code);
		copied.value = true;
		setTimeout(() => (copied.value = false), 2000);
	}
};

const copyAccountCode = async () => {
	const code = `SF-PRO-${user.value?.id?.toString().padStart(6, '0')}`;
	try {
		await navigator.clipboard.writeText(code);
		copiedAccountCode.value = true;
		setTimeout(() => (copiedAccountCode.value = false), 2000);
	} catch {
		fallbackCopy(code);
		copiedAccountCode.value = true;
		setTimeout(() => (copiedAccountCode.value = false), 2000);
	}
};

const fallbackCopy = (text) => {
	const el = document.createElement("textarea");
	el.value = text;
	document.body.appendChild(el);
	el.select();
	document.execCommand("copy");
	document.body.removeChild(el);
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
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container max-w-[900px]">
			<!-- Breadcrumb -->
			<div class="mb-[28px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866] font-medium">Il tuo account</NuxtLink>
				<span class="mx-[8px] text-[#C8CCD0]">/</span>
				<span class="font-semibold text-[#252B42]">Account Pro</span>
			</div>

			<!-- Not Pro -->
			<div v-if="!isPro" class="bg-white rounded-[20px] p-[32px] desktop:p-[48px] shadow-sm border border-[#E9EBEC] text-center">
				<div class="w-[80px] h-[80px] mx-auto mb-[24px] bg-gradient-to-br from-amber-50 to-amber-100 rounded-full flex items-center justify-center">
					<Icon name="mdi:star-outline" class="text-[36px] text-amber-500" />
				</div>
				<h2 class="text-[1.5rem] font-bold text-[#252B42] mb-[12px]">Diventa Partner Pro</h2>
				<p class="text-[#737373] text-[0.9375rem] max-w-[480px] mx-auto mb-[24px] leading-[1.6]">
					Ottieni un codice referral personale e guadagna una commissione del 5% su ogni spedizione acquistata tramite il tuo codice. I clienti che usano il tuo codice ricevono uno sconto del 5%.
				</p>
				<div class="inline-flex items-center gap-[8px] px-[20px] py-[10px] bg-[#F8F9FB] rounded-[10px] border border-[#E9EBEC]">
					<Icon name="mdi:account-outline" class="text-[18px] text-[#737373]" />
					<span class="text-[0.875rem] text-[#737373]">Il tuo account:</span>
					<span class="text-[0.875rem] font-bold text-[#252B42]">{{ user?.role }}</span>
				</div>
				<p class="text-[0.8125rem] text-[#737373] mt-[20px]">Per diventare Partner Pro, contattaci o registrati come Partner Pro.</p>
			</div>

			<!-- Pro User Content -->
			<template v-else>
				<!-- Account Code & Referral Code -->
				<div class="grid grid-cols-1 desktop:grid-cols-2 gap-[20px] mb-[24px]">
					<!-- Account Code -->
					<div class="bg-white rounded-[20px] p-[28px] border border-[#E9EBEC] shadow-sm">
						<div class="flex items-center gap-[10px] mb-[16px]">
							<div class="w-[40px] h-[40px] rounded-[10px] bg-purple-50 flex items-center justify-center">
								<Icon name="mdi:identifier" class="text-[22px] text-purple-600" />
							</div>
							<p class="text-[0.8125rem] text-[#737373] uppercase tracking-[1px] font-medium">Codice Account</p>
						</div>
						<div class="flex items-center gap-[12px]">
							<span class="text-[1.25rem] font-mono font-bold text-[#252B42] tracking-[2px]">
								SF-PRO-{{ user?.id?.toString().padStart(6, '0') }}
							</span>
							<button @click="copyAccountCode" class="p-[8px] rounded-[8px] hover:bg-[#F8F9FB] transition-colors cursor-pointer" title="Copia codice account">
								<Icon :name="copiedAccountCode ? 'mdi:check' : 'mdi:content-copy'" :class="['text-[18px]', copiedAccountCode ? 'text-emerald-600' : 'text-[#737373]']" />
							</button>
						</div>
						<p class="text-[0.8125rem] text-[#737373] mt-[8px]">Il tuo identificativo univoco account.</p>
					</div>

					<!-- Referral Code -->
					<div class="relative bg-gradient-to-br from-[#095866] to-[#0a7a8c] rounded-[20px] p-[28px] text-white shadow-[0_8px_24px_rgba(9,88,102,0.2)] overflow-hidden">
						<div class="absolute top-0 right-0 w-[160px] h-[160px] rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2"></div>
						<div class="relative z-1">
							<div class="flex items-center gap-[10px] mb-[16px]">
								<div class="w-[40px] h-[40px] rounded-[10px] bg-white/15 flex items-center justify-center">
									<Icon name="mdi:share-variant-outline" class="text-[22px]" />
								</div>
								<p class="text-[0.8125rem] uppercase tracking-[1px] opacity-80 font-medium">Codice Referral</p>
							</div>
							<div class="flex items-center gap-[12px]">
								<span class="text-[1.5rem] desktop:text-[1.75rem] font-mono font-bold tracking-[4px]">
									{{ referralData?.referral_code || "--------" }}
								</span>
								<button
									@click="copyCode"
									class="px-[14px] py-[6px] bg-white/20 hover:bg-white/30 rounded-[8px] text-[0.8125rem] font-medium transition-all cursor-pointer">
									{{ copied ? "Copiato!" : "Copia" }}
								</button>
							</div>
							<p class="text-[0.8125rem] opacity-60 mt-[8px]">Condividi per dare il 5% di sconto ai tuoi contatti.</p>
						</div>
					</div>
				</div>

				<!-- Stats Cards -->
				<div class="grid grid-cols-1 account-pages:grid-cols-3 gap-[16px] mb-[24px]">
					<div class="bg-white rounded-[16px] p-[24px] border border-[#E9EBEC] shadow-sm">
						<div class="flex items-center gap-[8px] mb-[12px]">
							<Icon name="mdi:currency-eur" class="text-[18px] text-emerald-600" />
							<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Commissioni totali</p>
						</div>
						<p class="text-[1.75rem] font-bold text-[#252B42]">
							&euro;{{ referralData ? Number(referralData.total_earnings || 0).toFixed(2) : "0.00" }}
						</p>
					</div>
					<div class="bg-white rounded-[16px] p-[24px] border border-[#E9EBEC] shadow-sm">
						<div class="flex items-center gap-[8px] mb-[12px]">
							<Icon name="mdi:account-group-outline" class="text-[18px] text-blue-600" />
							<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Utilizzi codice</p>
						</div>
						<p class="text-[1.75rem] font-bold text-[#252B42]">
							{{ referralData?.total_usages || 0 }}
						</p>
					</div>
					<div class="bg-white rounded-[16px] p-[24px] border border-[#E9EBEC] shadow-sm">
						<div class="flex items-center gap-[8px] mb-[12px]">
							<Icon name="mdi:cash-check" class="text-[18px] text-teal-600" />
							<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Saldo prelevabile</p>
						</div>
						<p class="text-[1.75rem] font-bold text-emerald-600">
							&euro;{{ earnings ? Number(earnings.commission_balance || 0).toFixed(2) : "0.00" }}
						</p>
						<NuxtLink to="/account/prelievi" class="inline-flex items-center gap-[4px] text-[0.8125rem] text-[#095866] font-medium hover:underline mt-[6px]">
							Richiedi prelievo
							<Icon name="mdi:arrow-right" class="text-[14px]" />
						</NuxtLink>
					</div>
				</div>

				<!-- Earnings History -->
				<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
					<div class="flex items-center gap-[12px] mb-[24px]">
						<div class="w-[40px] h-[40px] rounded-[10px] bg-amber-50 flex items-center justify-center">
							<Icon name="mdi:chart-timeline-variant" class="text-[22px] text-amber-600" />
						</div>
						<h2 class="text-[1.125rem] font-bold text-[#252B42]">Storico commissioni</h2>
					</div>

					<div v-if="!earnings?.data?.length" class="text-center py-[48px]">
						<div class="w-[64px] h-[64px] mx-auto mb-[16px] rounded-full bg-[#F8F9FB] flex items-center justify-center">
							<Icon name="mdi:chart-line" class="text-[28px] text-[#C8CCD0]" />
						</div>
						<p class="text-[1rem] font-medium text-[#252B42]">Nessuna commissione ancora</p>
						<p class="text-[0.8125rem] text-[#737373] mt-[6px]">Condividi il tuo codice per iniziare a guadagnare.</p>
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
								<tr v-for="usage in earnings.data" :key="usage.id" class="border-b border-[#F0F0F0] last:border-0">
									<td class="py-[14px] text-[#404040]">{{ formatDate(usage.created_at) }}</td>
									<td class="py-[14px] text-[#404040]">{{ usage.buyer?.name || '—' }}</td>
									<td class="py-[14px] text-right text-[#404040]">&euro;{{ Number(usage.order_amount).toFixed(2) }}</td>
									<td class="py-[14px] text-right font-semibold text-emerald-600">+&euro;{{ Number(usage.commission_amount).toFixed(2) }}</td>
									<td class="py-[14px] text-center">
										<span
											:class="[
												'inline-block px-[10px] py-[3px] rounded-full text-[0.6875rem] font-medium',
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
