<script setup>
definePageMeta({
	middleware: ['app-auth', 'admin'],
});

useSeoMeta({
	title: 'Inviti admin | SpediamoFacile',
	ogTitle: 'Inviti admin | SpediamoFacile',
	description: 'Monitora utilizzi, volumi ordini e commissioni del programma inviti dall area amministrazione SpediamoFacile.',
	ogDescription: 'Statistiche inviti, volumi ordini e commissioni nel pannello admin SpediamoFacile.',
	robots: 'noindex, nofollow',
});

const sanctum = useSanctumClient();
const { formatCurrency, formatDate, referralStatusConfig } = useAdmin();

const referralStats = ref(null);
const isLoadingReferrals = ref(true);
const isRefreshingReferrals = ref(false);
const referralError = ref('');

const referralUsages = computed(() => {
	const payload = referralStats.value?.data;
	if (Array.isArray(payload)) {
		return payload;
	}

	return Array.isArray(payload?.data) ? payload.data : [];
});
const totalUsages = computed(() => referralStats.value?.summary?.total_usages || referralUsages.value.length || 0);
const totalOrderAmount = computed(() => Number(referralStats.value?.summary?.total_order_amount || 0));
const totalCommissions = computed(() => Number(referralStats.value?.summary?.total_commissions || 0));
const activePartners = computed(() => {
	const partners = new Set(
		referralUsages.value
			.map((usage) => usage?.pro_user?.id || usage?.pro_user?.email || usage?.pro_user?.name)
			.filter(Boolean),
	);
	return partners.size;
});
const pendingUsages = computed(() => referralUsages.value.filter((usage) => usage.status === 'pending').length);
const confirmedUsages = computed(() => referralUsages.value.filter((usage) => usage.status === 'confirmed').length);
const paidUsages = computed(() => referralUsages.value.filter((usage) => usage.status === 'paid').length);

const summaryCards = computed(() => [
	{
		key: 'usages',
		label: 'Totale utilizzi',
		value: totalUsages.value,
		description: 'Codici invito usati sulla piattaforma.',
		icon: 'share',
	},
	{
		key: 'volume',
		label: 'Volume ordini',
		value: `EUR ${formatCurrency(totalOrderAmount.value)}`,
		description: 'Valore ordini generato dagli inviti.',
		icon: 'orders',
	},
	{
		key: 'commissions',
		label: 'Commissioni generate',
		value: `EUR ${formatCurrency(totalCommissions.value)}`,
		description: 'Credito referral maturato dagli inviti.',
		icon: 'commission',
	},
	{
		key: 'partners',
		label: 'Partner attivi',
		value: activePartners.value,
		description: 'Account Pro presenti negli utilizzi.',
		icon: 'partners',
	},
]);

const fetchReferrals = async ({ showLoader = true } = {}) => {
	if (showLoader) {
		isLoadingReferrals.value = true;
	}

	referralError.value = '';

	try {
		const res = await sanctum('/api/admin/referrals');
		referralStats.value = res;
	} catch (error) {
		referralStats.value = null;
		const data = error?.response?._data || error?.data;
		referralError.value = data?.message || 'Non sono riuscito a caricare i dati del programma inviti.';
	} finally {
		isLoadingReferrals.value = false;
	}
};

const refreshReferrals = async () => {
	isRefreshingReferrals.value = true;
	try {
		await fetchReferrals({ showLoader: false });
	} finally {
		isRefreshingReferrals.value = false;
	}
};

const referralStatusStyle = (status) => {
	const palette = {
		confirmed: { backgroundColor: '#ECFDF3', color: '#047857' },
		paid: { backgroundColor: 'rgba(9,88,102,0.08)', color: '#095866' },
		pending: { backgroundColor: 'rgba(228,66,3,0.08)', color: '#B45309' },
	};

	return palette[status] || { backgroundColor: 'var(--color-brand-bg-alt)', color: '#4B5563' };
};

onMounted(() => {
	fetchReferrals();
});
</script>

<template>
	<section class="sf-account-shell min-h-[600px] py-[24px] tablet:py-[28px] desktop:py-[28px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Area amministrazione"
				title="Inviti"
				description="Utilizzi, volumi e commissioni del programma inviti in una sola vista operativa."
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Amministrazione', to: '/account/amministrazione' },
					{ label: 'Inviti' },
				]" />

			<div class="mb-[16px] rounded-[20px] border border-[var(--color-brand-border)] bg-[#f8fafb] px-[18px] py-[16px]">
				<div class="flex flex-col gap-[12px] desktop:flex-row desktop:items-end desktop:justify-between">
					<div class="max-w-[56ch]">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.6px] text-[var(--color-brand-text-secondary)]">Programma inviti</p>
						<h2 class="mt-[4px] text-[1.1rem] font-bold text-[var(--color-brand-text)]">Volumi, partner attivi e commissioni senza rumore visivo inutile.</h2>
						<p class="mt-[6px] text-[0.9rem] leading-[1.55] text-[var(--color-brand-text-secondary)]">
							La pagina resta una console di lettura e controllo, non un mosaico di card scollegate.
						</p>
					</div>
					<div class="flex flex-wrap items-center gap-[8px]">
						<span class="sf-account-meta-pill">{{ activePartners }} partner attivi</span>
						<span class="sf-account-meta-pill sf-account-meta-pill--muted">{{ pendingUsages }} in attesa</span>
						<span class="sf-account-meta-pill sf-account-meta-pill--muted">{{ paidUsages }} pagati</span>
					</div>
				</div>
			</div>

			<div v-if="isLoadingReferrals" class="space-y-[14px]">
				<div class="grid grid-cols-1 gap-[12px] sm:grid-cols-2 desktop:grid-cols-4">
					<div
						v-for="n in 4"
						:key="`referral-stat-${n}`"
						class="animate-pulse rounded-[18px] border border-[var(--color-brand-border)] bg-white px-[16px] py-[16px] shadow-sm">
						<div class="h-[40px] w-[40px] rounded-[14px] bg-[#edf2f4]"></div>
						<div class="mt-[14px] h-[12px] w-[38%] rounded-full bg-[#e7ecef]"></div>
						<div class="mt-[10px] h-[24px] w-[54%] rounded-full bg-[#edf2f4]"></div>
						<div class="mt-[10px] h-[12px] w-[72%] rounded-full bg-[#edf2f4]"></div>
					</div>
				</div>
				<div class="rounded-[22px] border border-[var(--color-brand-border)] bg-white px-[18px] py-[18px] shadow-sm">
					<div class="h-[18px] w-[28%] rounded-full bg-[#e7ecef]"></div>
					<div class="mt-[18px] space-y-[10px]">
						<div v-for="n in 4" :key="`referral-row-${n}`" class="h-[74px] rounded-[16px] bg-[#f7fafb]"></div>
					</div>
				</div>
			</div>

			<div
				v-else-if="referralError"
				class="rounded-[20px] border border-[rgba(228,66,3,0.18)] bg-[rgba(228,66,3,0.06)] px-[18px] py-[20px]">
				<div class="flex flex-col gap-[10px] desktop:flex-row desktop:items-center desktop:justify-between">
					<div>
						<p class="font-semibold text-[var(--color-brand-text)]">Inviti non disponibili</p>
						<p class="mt-[4px] text-[0.875rem] leading-[1.55] text-[var(--color-brand-text-secondary)]">{{ referralError }}</p>
					</div>
					<button type="button" class="btn-secondary btn-compact inline-flex items-center justify-center" @click="fetchReferrals">
						Riprova
					</button>
				</div>
			</div>

			<template v-else>
				<div class="mb-[24px] grid grid-cols-1 gap-[12px] sm:grid-cols-2 desktop:grid-cols-4">
					<div
						v-for="card in summaryCards"
						:key="card.key"
						class="rounded-[18px] border border-[var(--color-brand-border)] bg-white px-[16px] py-[16px] shadow-sm">
						<div class="flex items-center gap-[10px]">
							<div class="flex h-[40px] w-[40px] items-center justify-center rounded-[14px] bg-[#edf5f6] text-[var(--color-brand-primary)]">
								<svg
									v-if="card.icon === 'share'"
									aria-hidden="true"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									class="h-[18px] w-[18px]"
									fill="currentColor">
									<path d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.34C15.11,18.55 15.08,18.77 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.92,20.61 20.92,19A2.92,2.92 0 0,0 18,16.08Z" />
								</svg>
								<svg
									v-else-if="card.icon === 'orders'"
									aria-hidden="true"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									class="h-[18px] w-[18px]"
									fill="currentColor">
									<path d="M17,18A2,2 0 0,1 19,20A2,2 0 0,1 17,22C15.89,22 15,21.1 15,20C15,18.89 15.89,18 17,18M1,2H4.27L5.21,4H20A1,1 0 0,1 21,5C21,5.17 20.95,5.34 20.88,5.5L17.3,11.97C16.96,12.58 16.3,13 15.55,13H8.1L7.2,14.63L7.17,14.75A0.25,0.25 0 0,0 7.42,15H19V17H7C5.89,17 5,16.1 5,15C5,14.65 5.09,14.32 5.24,14.04L6.6,11.59L3,4H1V2M7,18A2,2 0 0,1 9,20A2,2 0 0,1 7,22C5.89,22 5,21.1 5,20C5,18.89 5.89,18 7,18M16,11L18.78,6H6.14L8.5,11H16Z" />
								</svg>
								<svg
									v-else-if="card.icon === 'commission'"
									aria-hidden="true"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									class="h-[18px] w-[18px]"
									fill="currentColor">
									<path d="M3 6h18v12H3zm9 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8m0 1.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5M5 8.5A1.5 1.5 0 0 1 6.5 10 1.5 1.5 0 0 1 5 11.5zm14 0A1.5 1.5 0 0 1 20.5 10 1.5 1.5 0 0 1 19 11.5z" />
								</svg>
								<svg
									v-else
									aria-hidden="true"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									class="h-[18px] w-[18px]"
									fill="currentColor">
									<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5m8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.94 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
								</svg>
							</div>
							<p class="text-[0.75rem] font-semibold uppercase tracking-[0.55px] text-[var(--color-brand-text-secondary)]">{{ card.label }}</p>
						</div>
						<p class="mt-[14px] text-[1.875rem] font-black leading-none text-[var(--color-brand-text)]">{{ card.value }}</p>
						<p class="mt-[10px] text-[0.875rem] leading-[1.5] text-[var(--color-brand-text-secondary)]">{{ card.description }}</p>
					</div>
				</div>

				<div class="overflow-hidden rounded-[24px] border border-[var(--color-brand-border)] bg-white px-[18px] py-[18px] shadow-sm tablet:px-[22px] tablet:py-[22px]">
					<div class="flex flex-col gap-[16px] border-b border-[var(--color-brand-border)] pb-[16px] desktop:flex-row desktop:items-end desktop:justify-between">
						<div class="max-w-[56ch]">
							<p class="text-[0.75rem] font-semibold uppercase tracking-[0.6px] text-[var(--color-brand-text-secondary)]">Elenco operativo</p>
							<h2 class="mt-[4px] text-[1.2rem] font-bold text-[var(--color-brand-text)]">Utilizzi inviti</h2>
							<p class="mt-[8px] text-[0.9375rem] leading-[1.6] text-[var(--color-brand-text-secondary)]">
								Codice, partner, acquirente, volume e commissione in una vista unica, senza tabelle compresse o pannelli inutili.
							</p>
						</div>
						<div class="flex flex-wrap items-center gap-[8px]">
							<span class="sf-account-meta-pill">{{ confirmedUsages }} confermati</span>
							<span class="sf-account-meta-pill sf-account-meta-pill--muted">{{ pendingUsages }} in attesa</span>
							<button
								type="button"
								class="btn-secondary btn-compact"
								:disabled="isRefreshingReferrals"
								@click="refreshReferrals">
								{{ isRefreshingReferrals ? 'Aggiornamento...' : 'Aggiorna dati' }}
							</button>
						</div>
					</div>

					<div v-if="!referralUsages.length" class="py-[26px]">
						<div class="rounded-[22px] border border-[var(--color-brand-border)] bg-[#f8fafb] px-[18px] py-[28px] text-center">
							<svg
								aria-hidden="true"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								class="mx-auto mb-[12px] h-[42px] w-[42px] text-[var(--color-brand-text-muted)]"
								fill="currentColor">
								<path d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.34C15.11,18.55 15.08,18.77 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.92,20.61 20.92,19A2.92,2.92 0 0,0 18,16.08Z" />
							</svg>
							<p class="text-[1rem] font-semibold text-[var(--color-brand-text)]">Nessun utilizzo invito registrato.</p>
							<p class="mt-[6px] text-[0.875rem] leading-[1.55] text-[var(--color-brand-text-secondary)]">
								Appena un codice viene usato, qui trovi partner, acquirente, volume ordine e commissione maturata.
							</p>
						</div>
					</div>

					<div v-else class="space-y-[12px] pt-[18px]">
						<div class="grid grid-cols-1 gap-[12px] desktop:hidden tablet:grid-cols-2">
							<div
								v-for="usage in referralUsages"
								:key="usage.id"
								class="rounded-[20px] border border-[var(--color-brand-border)] bg-white p-[16px] shadow-sm">
								<div class="flex items-start justify-between gap-[12px]">
									<div class="min-w-0">
										<p class="text-[0.75rem] text-[var(--color-brand-text-secondary)]">{{ formatDate(usage.created_at) }}</p>
										<p class="mt-[6px] inline-flex rounded-full bg-[#edf5f6] px-[10px] py-[4px] font-mono text-[0.75rem] text-[var(--color-brand-primary)]">
											{{ usage.referral_code }}
										</p>
									</div>
									<span
										class="inline-flex items-center rounded-full px-[8px] py-[3px] text-[0.6875rem] font-medium"
										:style="referralStatusStyle(usage.status)">
										{{ referralStatusConfig[usage.status]?.label || usage.status }}
									</span>
								</div>
								<div class="mt-[14px] grid grid-cols-2 gap-[10px]">
									<div class="rounded-[14px] border border-[var(--color-brand-border)] bg-[#f7fafb] px-[12px] py-[10px]">
										<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.45px] text-[var(--color-brand-text-secondary)]">Partner</p>
										<p class="mt-[4px] text-[0.875rem] font-medium text-[var(--color-brand-text)]">{{ usage.pro_user?.name || '---' }}</p>
									</div>
									<div class="rounded-[14px] border border-[var(--color-brand-border)] bg-[#f7fafb] px-[12px] py-[10px]">
										<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.45px] text-[var(--color-brand-text-secondary)]">Acquirente</p>
										<p class="mt-[4px] text-[0.875rem] font-medium text-[var(--color-brand-text)]">{{ usage.buyer?.name || '---' }}</p>
									</div>
									<div class="rounded-[14px] border border-[var(--color-brand-border)] bg-[#f7fafb] px-[12px] py-[10px]">
										<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.45px] text-[var(--color-brand-text-secondary)]">Ordine</p>
										<p class="mt-[4px] text-[0.875rem] font-semibold text-[var(--color-brand-text)]">EUR {{ formatCurrency(usage.order_amount) }}</p>
									</div>
									<div class="rounded-[14px] border border-[var(--color-brand-border)] bg-[#f7fafb] px-[12px] py-[10px]">
										<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.45px] text-[var(--color-brand-text-secondary)]">Commissione</p>
										<p class="mt-[4px] text-[0.875rem] font-semibold text-[var(--color-brand-primary)]">EUR {{ formatCurrency(usage.commission_amount) }}</p>
									</div>
								</div>
							</div>
						</div>

						<div class="hidden desktop:block space-y-[12px]">
							<div class="grid grid-cols-[1fr_1.2fr_1.2fr_0.9fr_0.9fr_0.8fr] gap-[16px] px-[6px] text-[0.6875rem] font-semibold uppercase tracking-[0.55px] text-[var(--color-brand-text-secondary)]">
								<div>Data e codice</div>
								<div>Partner</div>
								<div>Acquirente</div>
								<div>Ordine</div>
								<div>Commissione</div>
								<div class="text-right">Stato</div>
							</div>
							<article
								v-for="usage in referralUsages"
								:key="usage.id"
								class="grid grid-cols-[1fr_1.2fr_1.2fr_0.9fr_0.9fr_0.8fr] items-center gap-[16px] rounded-[20px] border border-[var(--color-brand-border)] bg-[#fbfcfd] px-[18px] py-[16px]">
								<div class="min-w-0">
									<p class="text-[0.8125rem] text-[var(--color-brand-text-secondary)]">{{ formatDate(usage.created_at) }}</p>
									<p class="mt-[8px] inline-flex rounded-full bg-[#edf5f6] px-[10px] py-[4px] font-mono text-[0.75rem] text-[var(--color-brand-primary)]">
										{{ usage.referral_code }}
									</p>
								</div>
								<div class="min-w-0">
									<p class="truncate text-[0.95rem] font-semibold text-[var(--color-brand-text)]">{{ usage.pro_user?.name || 'Partner non disponibile' }}</p>
									<p class="mt-[4px] truncate text-[0.8125rem] text-[var(--color-brand-text-secondary)]">{{ usage.pro_user?.email || '---' }}</p>
								</div>
								<div class="min-w-0">
									<p class="truncate text-[0.95rem] font-semibold text-[var(--color-brand-text)]">{{ usage.buyer?.name || 'Acquirente non disponibile' }}</p>
									<p class="mt-[4px] truncate text-[0.8125rem] text-[var(--color-brand-text-secondary)]">{{ usage.buyer?.email || '---' }}</p>
								</div>
								<div>
									<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.45px] text-[var(--color-brand-text-secondary)]">Volume</p>
									<p class="mt-[6px] text-[0.95rem] font-semibold text-[var(--color-brand-text)]">EUR {{ formatCurrency(usage.order_amount) }}</p>
								</div>
								<div>
									<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.45px] text-[var(--color-brand-text-secondary)]">Credito</p>
									<p class="mt-[6px] text-[0.95rem] font-semibold text-[var(--color-brand-primary)]">EUR {{ formatCurrency(usage.commission_amount) }}</p>
								</div>
								<div class="flex justify-end">
									<span
										class="inline-flex items-center rounded-full px-[10px] py-[4px] text-[0.6875rem] font-medium"
										:style="referralStatusStyle(usage.status)">
										{{ referralStatusConfig[usage.status]?.label || usage.status }}
									</span>
								</div>
							</article>
						</div>
					</div>
				</div>
			</template>
		</div>
	</section>
</template>
