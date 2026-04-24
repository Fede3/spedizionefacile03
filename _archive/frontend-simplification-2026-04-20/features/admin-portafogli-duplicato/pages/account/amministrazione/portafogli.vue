<script setup>
definePageMeta({
	middleware: ['app-auth', 'admin'],
});

useSeoMeta({
	title: 'Portafogli admin | SpediamoFacile',
	ogTitle: 'Portafogli admin | SpediamoFacile',
	description: 'Controlla saldi e movimenti dei portafogli utenti dall area amministrazione SpediamoFacile.',
	ogDescription: 'Panoramica saldi e movimenti dei portafogli utenti nel pannello admin SpediamoFacile.',
	robots: 'noindex, nofollow',
});

const sanctum = useSanctumClient();
const { formatCurrency, formatDate } = useAdmin();

const walletOverview = ref([]);
const isLoadingWalletOverview = ref(true);
const isRefreshingWalletOverview = ref(false);
const walletOverviewError = ref('');

const selectedUserId = ref(null);
const selectedUserName = ref('');
const userMovements = ref([]);
const isLoadingMovements = ref(false);
const userMovementsError = ref('');

const getRequestErrorMessage = (error, fallback) => error?.response?._data?.message || error?.data?.message || error?.message || fallback;

const walletUsersCount = computed(() => walletOverview.value.length);
const walletUsersWithFunds = computed(() =>
	walletOverview.value.filter((user) => Number(user.wallet_balance || 0) > 0 || Number(user.commission_balance || 0) > 0).length,
);
const walletUsersWithCommission = computed(() =>
	walletOverview.value.filter((user) => Number(user.commission_balance || 0) > 0).length,
);
const totalWalletBalance = computed(() => walletOverview.value.reduce((sum, user) => sum + Number(user.wallet_balance || 0), 0));
const totalCommissionBalance = computed(() => walletOverview.value.reduce((sum, user) => sum + Number(user.commission_balance || 0), 0));
const totalTrackedFunds = computed(() => totalWalletBalance.value + totalCommissionBalance.value);

const roleBadgeMap = {
	Admin: 'bg-[#e7f4f6] text-[var(--color-brand-primary)]',
	'Partner Pro': 'bg-[rgba(228,66,3,0.10)] text-[var(--color-brand-secondary)]',
	Cliente: 'bg-[#f3f4f6] text-[var(--color-brand-text-secondary)]',
};

const resolveRoleLabel = (user) => {
	const role = String(user?.role || '').trim();
	return role || 'Cliente';
};

const resolveRoleBadgeClass = (user) => roleBadgeMap[resolveRoleLabel(user)] || roleBadgeMap.Cliente;

const walletSummaryCards = computed(() => [
	{
		label: 'Fondi monitorati',
		value: `€${formatCurrency(totalTrackedFunds.value)}`,
		description: 'Saldo wallet e commissioni in piattaforma.',
		icon: 'funds',
	},
	{
		label: 'Portafogli monitorati',
		value: walletUsersCount.value,
		description: 'Utenti presenti nella vista finanza.',
		icon: 'users',
	},
	{
		label: 'Con fondi attivi',
		value: walletUsersWithFunds.value,
		description: 'Saldo wallet o commissioni maggiori di zero.',
		icon: 'wallet',
	},
	{
		label: 'Commissioni aperte',
		value: walletUsersWithCommission.value,
		description: 'Utenti con residuo commissionale da seguire.',
		icon: 'commission',
	},
]);

const fetchWallet = async ({ showLoader = true } = {}) => {
	if (showLoader) isLoadingWalletOverview.value = true;
	walletOverviewError.value = '';

	try {
		const res = await sanctum('/api/admin/wallet/overview');
		walletOverview.value = res?.data || res || [];
	} catch (error) {
		walletOverviewError.value = getRequestErrorMessage(error, 'Non sono riuscito ad aggiornare i portafogli utenti.');
		walletOverview.value = [];
	} finally {
		isLoadingWalletOverview.value = false;
	}
};

const refreshWalletOverview = async () => {
	isRefreshingWalletOverview.value = true;
	try {
		await fetchWallet({ showLoader: false });
	} finally {
		isRefreshingWalletOverview.value = false;
	}
};

const viewUserMovements = async (userId, userName) => {
	selectedUserId.value = userId;
	selectedUserName.value = userName;
	userMovements.value = [];
	userMovementsError.value = '';
	isLoadingMovements.value = true;

	try {
		const res = await sanctum(`/api/admin/wallet/users/${userId}/movements`);
		userMovements.value = res?.data || res || [];
	} catch (error) {
		userMovementsError.value = getRequestErrorMessage(error, 'Non sono riuscito a caricare i movimenti di questo utente.');
		userMovements.value = [];
	} finally {
		isLoadingMovements.value = false;
	}
};

const retryUserMovements = async () => {
	if (!selectedUserId.value) return;
	await viewUserMovements(selectedUserId.value, selectedUserName.value);
};

const closeUserMovements = () => {
	selectedUserId.value = null;
	selectedUserName.value = '';
	userMovements.value = [];
	isLoadingMovements.value = false;
	userMovementsError.value = '';
};

onMounted(() => {
	fetchWallet();
});
</script>

<template>
	<section class="sf-account-shell min-h-[600px] py-[24px] tablet:py-[28px] desktop:py-[28px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Area amministrazione"
				title="Portafogli"
				description="Controlla saldo wallet, commissioni e storico movimenti dei clienti da una sola vista."
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Amministrazione', to: '/account/amministrazione' },
					{ label: 'Portafogli' },
				]" />

			<div
				v-if="selectedUserId"
				class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-[20px]"
				@click.self="closeUserMovements">
				<div class="max-h-[82vh] w-full max-w-[760px] overflow-y-auto rounded-[24px] bg-white p-[18px] shadow-2xl tablet:p-[22px]">
					<div class="mb-[18px] flex items-start justify-between gap-[16px]">
						<div>
							<p class="text-[0.75rem] font-semibold uppercase tracking-[0.6px] text-[var(--color-brand-text-secondary)]">Storico utente</p>
							<h3 class="mt-[4px] text-[1.125rem] font-bold text-[var(--color-brand-text)]">Movimenti di {{ selectedUserName }}</h3>
							<p class="mt-[4px] text-[0.875rem] text-[var(--color-brand-text-secondary)]">Apri il dettaglio solo quando serve, mantenendo la vista principale pulita.</p>
						</div>
						<button
							@click="closeUserMovements"
							class="btn-secondary btn-compact inline-flex h-[36px] w-[36px] items-center justify-center !px-0"
							aria-label="Chiudi movimenti">
							<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[18px] w-[18px] text-[var(--color-brand-text)]" fill="currentColor">
								<path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
							</svg>
						</button>
					</div>

					<div v-if="isLoadingMovements" class="rounded-[20px] border border-[var(--color-brand-border)] bg-[#f8fafb] px-[18px] py-[28px] text-center text-[var(--color-brand-text-secondary)]">
						<p class="font-medium text-[var(--color-brand-text)]">Sto caricando i movimenti.</p>
						<p class="mt-[4px] text-[0.875rem]">Tra poco trovi qui il dettaglio del wallet.</p>
					</div>

					<div v-else-if="userMovementsError" class="rounded-[20px] border border-[rgba(228,66,3,0.18)] bg-[rgba(228,66,3,0.06)] px-[18px] py-[22px]">
						<p class="font-semibold text-[var(--color-brand-text)]">Movimenti non disponibili</p>
						<p class="mt-[4px] text-[0.875rem] text-[var(--color-brand-text-secondary)]">{{ userMovementsError }}</p>
						<button @click="retryUserMovements" class="btn-secondary btn-compact mt-[14px]">Riprova</button>
					</div>

					<div v-else-if="!userMovements.length" class="rounded-[20px] border border-[var(--color-brand-border)] bg-[#f8fafb] px-[18px] py-[28px] text-center text-[var(--color-brand-text-secondary)]">
						<p class="font-medium text-[var(--color-brand-text)]">Nessun movimento per questo utente.</p>
						<p class="mt-[4px] text-[0.875rem]">Il wallet comparira qui appena registra ricariche, pagamenti o commissioni.</p>
					</div>

					<ul v-else class="space-y-[10px]">
						<li
							v-for="mov in userMovements"
							:key="mov.id"
							class="flex items-center justify-between gap-[16px] rounded-[20px] border border-[var(--color-brand-border)] bg-[#fbfcfd] px-[14px] py-[14px]">
							<div class="min-w-0 flex-1">
								<p class="truncate text-[0.875rem] font-medium text-[var(--color-brand-text)]">{{ mov.description }}</p>
								<div class="mt-[6px] flex flex-wrap items-center gap-[8px]">
									<span class="text-[0.75rem] text-[var(--color-brand-text-secondary)]">{{ formatDate(mov.created_at) }}</span>
									<span
										v-if="mov.source"
										class="rounded-full bg-[#eef5f6] px-[8px] py-[2px] text-[0.6875rem] text-[var(--color-brand-text-secondary)]">
										{{ mov.source }}
									</span>
								</div>
							</div>
							<span
								:class="[
									'ml-[16px] whitespace-nowrap text-[0.9375rem] font-bold tabular-nums',
									mov.type === 'credit' ? 'text-[var(--color-brand-primary)]' : 'text-red-500',
								]">
								{{ mov.type === 'credit' ? '+' : '-' }}&euro;{{ formatCurrency(mov.amount) }}
							</span>
						</li>
					</ul>
				</div>
			</div>

			<div class="mb-[16px] rounded-[20px] border border-[var(--color-brand-border)] bg-[#f8fafb] px-[18px] py-[16px]">
				<div class="flex flex-col gap-[12px] desktop:flex-row desktop:items-end desktop:justify-between">
					<div class="max-w-[56ch]">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.6px] text-[var(--color-brand-text-secondary)]">Finanza piattaforma</p>
						<h2 class="mt-[4px] text-[1.1rem] font-bold text-[var(--color-brand-text)]">Saldo, commissioni e movimenti in una sola lettura operativa.</h2>
						<p class="mt-[6px] text-[0.9rem] leading-[1.55] text-[var(--color-brand-text-secondary)]">
							Meno pannelli decorativi, piu controllo reale dei portafogli utenti e accesso rapido allo storico quando serve.
						</p>
					</div>
					<div class="flex flex-wrap items-center gap-[8px]">
						<span class="sf-account-meta-pill">Wallet €{{ formatCurrency(totalWalletBalance) }}</span>
						<span class="sf-account-meta-pill sf-account-meta-pill--muted">Commissioni €{{ formatCurrency(totalCommissionBalance) }}</span>
					</div>
				</div>
			</div>

			<div class="mb-[24px] grid grid-cols-1 gap-[12px] sm:grid-cols-2 desktop:grid-cols-4">
				<div
					v-for="card in walletSummaryCards"
					:key="card.label"
					class="rounded-[18px] border border-[var(--color-brand-border)] bg-white px-[16px] py-[16px] shadow-sm">
					<div class="flex items-center gap-[10px]">
						<div class="flex h-[40px] w-[40px] items-center justify-center rounded-[14px] bg-[#edf5f6] text-[var(--color-brand-primary)]">
							<svg
								v-if="card.icon === 'funds'"
								aria-hidden="true"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								class="h-[18px] w-[18px]"
								fill="currentColor">
								<path d="M3 6h18v12H3zm9 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8m0 1.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5M5 8.5A1.5 1.5 0 0 1 6.5 10 1.5 1.5 0 0 1 5 11.5zm14 0A1.5 1.5 0 0 1 20.5 10 1.5 1.5 0 0 1 19 11.5z" />
							</svg>
							<svg
								v-else-if="card.icon === 'users'"
								aria-hidden="true"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								class="h-[18px] w-[18px]"
								fill="currentColor">
								<path d="M16 11c1.66 0 2.99-1.79 2.99-4S17.66 3 16 3s-3 1.79-3 4 1.34 4 3 4m-8 0c1.66 0 2.99-1.79 2.99-4S9.66 3 8 3 5 4.79 5 7s1.34 4 3 4m0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13m8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.94 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5" />
							</svg>
							<svg
								v-else-if="card.icon === 'wallet'"
								aria-hidden="true"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								class="h-[18px] w-[18px]"
								fill="currentColor">
								<path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V7c0-1.11.89-2 2-2h14c1.1 0 2 .89 2 2v1h-2V7H5v12h14v-1zm-7-4c0-1.1.9-2 2-2h6v4h-6c-1.1 0-2-.9-2-2zm2 1h4v-2h-4z" />
							</svg>
							<svg
								v-else
								aria-hidden="true"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								class="h-[18px] w-[18px]"
								fill="currentColor">
								<path d="M3 6h18v12H3zm9 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8m0 1.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5M5 8.5A1.5 1.5 0 0 1 6.5 10 1.5 1.5 0 0 1 5 11.5zm14 0A1.5 1.5 0 0 1 20.5 10 1.5 1.5 0 0 1 19 11.5z" />
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
					<div class="max-w-[54ch]">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.6px] text-[var(--color-brand-text-secondary)]">Elenco operativo</p>
						<h2 class="mt-[4px] text-[1.2rem] font-bold text-[var(--color-brand-text)]">Portafogli da monitorare</h2>
						<p class="mt-[8px] text-[0.9375rem] leading-[1.6] text-[var(--color-brand-text-secondary)]">
							Lettura rapida dei fondi attivi e accesso ai movimenti senza aggiungere colonne o pannelli inutili.
						</p>
					</div>
					<div class="flex flex-wrap items-center gap-[8px]">
						<span class="sf-account-meta-pill">{{ walletUsersCount }} profili</span>
						<span class="sf-account-meta-pill sf-account-meta-pill--muted">{{ walletUsersWithFunds }} con fondi</span>
						<button
							@click="refreshWalletOverview"
							class="btn-secondary btn-compact"
							:disabled="isRefreshingWalletOverview">
							{{ isRefreshingWalletOverview ? 'Aggiornamento...' : 'Aggiorna dati' }}
						</button>
					</div>
				</div>

				<div v-if="isLoadingWalletOverview" class="grid grid-cols-1 gap-[12px] py-[18px] desktop:grid-cols-2">
					<div
						v-for="index in 4"
						:key="index"
						class="animate-pulse rounded-[20px] border border-[var(--color-brand-border)] bg-[#f8fafb] px-[18px] py-[18px]">
						<div class="h-[16px] w-[38%] rounded-full bg-[#e7ecef]"></div>
						<div class="mt-[10px] h-[14px] w-[54%] rounded-full bg-[#edf2f4]"></div>
						<div class="mt-[16px] grid grid-cols-2 gap-[12px]">
							<div class="h-[62px] rounded-[16px] bg-[#eef3f5]"></div>
							<div class="h-[62px] rounded-[16px] bg-[#eef3f5]"></div>
						</div>
					</div>
				</div>

				<div
					v-else-if="walletOverviewError"
					class="mt-[18px] rounded-[20px] border border-[rgba(228,66,3,0.18)] bg-[rgba(228,66,3,0.06)] px-[18px] py-[22px]">
					<p class="font-semibold text-[var(--color-brand-text)]">Portafogli non disponibili</p>
					<p class="mt-[4px] text-[0.875rem] text-[var(--color-brand-text-secondary)]">{{ walletOverviewError }}</p>
					<button @click="refreshWalletOverview" class="btn-secondary btn-compact mt-[14px]">Riprova</button>
				</div>

				<div v-else-if="!walletOverview.length" class="py-[26px]">
					<div class="rounded-[22px] border border-[var(--color-brand-border)] bg-[#f8fafb] px-[18px] py-[28px] text-center">
						<svg
							aria-hidden="true"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							class="mx-auto mb-[12px] h-[42px] w-[42px] text-[var(--color-brand-text-muted)]"
							fill="currentColor">
							<path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V7c0-1.11.89-2 2-2h14c1.1 0 2 .89 2 2v1h-2V7H5v12h14v-1zm-7-4c0-1.1.9-2 2-2h6v4h-6c-1.1 0-2-.9-2-2zm2 1h4v-2h-4z" />
						</svg>
						<p class="text-[1rem] font-semibold text-[var(--color-brand-text)]">Nessun portafoglio con fondi al momento.</p>
						<p class="mt-[6px] text-[0.875rem] leading-[1.55] text-[var(--color-brand-text-secondary)]">
							Appena arrivano ricariche, commissioni o movimenti wallet, questa vista diventa la coda operativa unica della finanza utenti.
						</p>
					</div>
				</div>

				<div v-else class="space-y-[12px] pt-[18px]">
					<div class="grid grid-cols-1 gap-[12px] desktop:hidden tablet:grid-cols-2">
						<div
							v-for="u in walletOverview"
							:key="u.id"
							class="rounded-[20px] border border-[var(--color-brand-border)] bg-white p-[16px] shadow-sm">
							<div class="flex items-start justify-between gap-[12px]">
								<div class="min-w-0">
									<p class="truncate text-[0.9375rem] font-semibold text-[var(--color-brand-text)]">{{ u.name }}</p>
									<p class="truncate text-[0.75rem] text-[var(--color-brand-text-secondary)]">{{ u.email }}</p>
									<span
										:class="[
											'mt-[8px] inline-block rounded-full px-[8px] py-[3px] text-[0.6875rem] font-medium',
											resolveRoleBadgeClass(u),
										]">
										{{ resolveRoleLabel(u) }}
									</span>
								</div>
							</div>
							<div class="mt-[14px] grid grid-cols-2 gap-[12px]">
								<div class="rounded-[16px] border border-[var(--color-brand-border)] bg-[#f6f9fa] p-[12px]">
									<p class="mb-[4px] text-[0.6875rem] uppercase tracking-[0.5px] text-[var(--color-brand-text-secondary)]">Wallet</p>
									<p class="text-[1rem] font-bold text-[var(--color-brand-text)]">&euro;{{ formatCurrency(u.wallet_balance) }}</p>
								</div>
								<div class="rounded-[16px] border border-[var(--color-brand-border)] bg-[#f6f9fa] p-[12px]">
									<p class="mb-[4px] text-[0.6875rem] uppercase tracking-[0.5px] text-[var(--color-brand-text-secondary)]">Commissioni</p>
									<p class="text-[0.9375rem] font-bold text-[var(--color-brand-primary)]">&euro;{{ formatCurrency(u.commission_balance) }}</p>
								</div>
							</div>
							<button @click="viewUserMovements(u.id, u.name)" class="btn-secondary btn-compact mt-[14px] justify-center">Apri movimenti</button>
						</div>
					</div>

					<div class="hidden desktop:block space-y-[12px]">
						<div class="grid grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-[16px] px-[6px] text-[0.6875rem] font-semibold uppercase tracking-[0.55px] text-[var(--color-brand-text-secondary)]">
							<div>Profilo</div>
							<div>Wallet</div>
							<div>Commissioni</div>
							<div class="text-right">Azioni</div>
						</div>
						<article
							v-for="u in walletOverview"
							:key="u.id"
							class="grid grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-[16px] rounded-[20px] border border-[var(--color-brand-border)] bg-[#fbfcfd] px-[18px] py-[16px]">
							<div class="min-w-0">
								<p class="truncate text-[0.975rem] font-semibold text-[var(--color-brand-text)]">{{ u.name }}</p>
								<p class="mt-[4px] truncate text-[0.8125rem] text-[var(--color-brand-text-secondary)]" :title="u.email">{{ u.email }}</p>
								<span
									:class="[
										'mt-[10px] inline-block rounded-full px-[8px] py-[3px] text-[0.6875rem] font-medium',
										resolveRoleBadgeClass(u),
									]">
									{{ resolveRoleLabel(u) }}
								</span>
							</div>
							<div>
								<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[var(--color-brand-text-secondary)]">Saldo wallet</p>
								<p class="mt-[6px] text-[1rem] font-bold text-[var(--color-brand-text)]">&euro;{{ formatCurrency(u.wallet_balance) }}</p>
							</div>
							<div>
								<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[var(--color-brand-text-secondary)]">Commissioni</p>
								<p class="mt-[6px] text-[1rem] font-bold text-[var(--color-brand-primary)]">&euro;{{ formatCurrency(u.commission_balance) }}</p>
							</div>
							<div class="flex justify-end">
								<button @click="viewUserMovements(u.id, u.name)" class="btn-secondary btn-compact">Apri movimenti</button>
							</div>
						</article>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>
