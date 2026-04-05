<!--
  FILE: pages/account/amministrazione/portafogli.vue
  SCOPO: Pannello admin — panoramica portafogli di tutti gli utenti.
         Mostra saldi, modale con storico movimenti per utente.
  API: GET /api/admin/wallets — panoramica saldi,
       GET /api/admin/wallets/{userId}/movements — movimenti di un utente.
  ROUTE: /account/amministrazione/portafogli (middleware sanctum:auth + admin).

  COLLEGAMENTI:
    - pages/account/portafoglio.vue → portafoglio lato utente.
-->
<script setup>
definePageMeta({
	middleware: ['app-auth', 'admin'],
});

useSeoMeta({
	title: 'Portafogli admin | SpediamoFacile',
	ogTitle: 'Portafogli admin | SpediamoFacile',
	description: 'Controlla saldi e movimenti dei portafogli utenti dall area amministrazione SpediamoFacile.',
	ogDescription: 'Panoramica saldi e movimenti dei portafogli utenti nel pannello admin SpediamoFacile.',
});

const sanctum = useSanctumClient();
const { formatCurrency, formatDate } = useAdmin();

const walletOverview = ref([]);
const walletUsersCount = computed(() => walletOverview.value.length);
const totalWalletBalance = computed(() => walletOverview.value.reduce((sum, user) => sum + Number(user.wallet_balance || 0), 0));
const totalCommissionBalance = computed(() => walletOverview.value.reduce((sum, user) => sum + Number(user.commission_balance || 0), 0));

const fetchWallet = async () => {
	try {
		const res = await sanctum('/api/admin/wallet/overview');
		walletOverview.value = res?.data || res || [];
	} catch (e) {
		walletOverview.value = [];
	}
};

/* Modale movimenti utente */
const selectedUserId = ref(null);
const selectedUserName = ref('');
const userMovements = ref([]);

const viewUserMovements = async (userId, userName) => {
	selectedUserId.value = userId;
	selectedUserName.value = userName;
	try {
		const res = await sanctum(`/api/admin/wallet/users/${userId}/movements`);
		userMovements.value = res?.data || res || [];
	} catch (e) {
		userMovements.value = [];
	}
};

const closeUserMovements = () => {
	selectedUserId.value = null;
	selectedUserName.value = '';
	userMovements.value = [];
};

onMounted(() => {
	fetchWallet();
});
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Area amministrazione"
				title="Portafogli"
				description="Saldi e movimenti utenti."
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Amministrazione', to: '/account/amministrazione' },
					{ label: 'Portafogli' },
				]" />

			<!-- User movements modal -->
			<div
				v-if="selectedUserId"
				class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-[20px]"
				@click.self="closeUserMovements">
				<div class="bg-white rounded-[12px] p-[28px] shadow-2xl max-w-[700px] w-full max-h-[80vh] overflow-y-auto">
					<div class="flex items-center justify-between mb-[24px]">
						<h3 class="text-[1.125rem] font-bold text-[var(--color-brand-text)]">Movimenti di {{ selectedUserName }}</h3>
						<button
							@click="closeUserMovements"
							class="btn-secondary btn-compact inline-flex h-[36px] w-[36px] items-center justify-center !px-0"
							aria-label="Chiudi movimenti">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[#404040]" fill="currentColor">
								<path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
							</svg>
						</button>
					</div>
					<div v-if="!userMovements?.length" class="text-center py-[40px] text-[var(--color-brand-text-secondary)]"><p>Nessun movimento per questo utente.</p></div>
					<ul v-else class="space-y-[4px]">
						<li
							v-for="mov in userMovements"
							:key="mov.id"
							class="flex items-center justify-between p-[12px] rounded-[14px] hover:bg-[#F8F9FB]">
							<div class="flex-1 min-w-0">
								<p class="text-[0.875rem] font-medium text-[var(--color-brand-text)] truncate">{{ mov.description }}</p>
								<div class="flex items-center gap-[8px] mt-[2px]">
									<span class="text-[0.75rem] text-[var(--color-brand-text-secondary)]">{{ formatDate(mov.created_at) }}</span>
									<span v-if="mov.source" class="text-[0.6875rem] px-[8px] py-[2px] rounded-full bg-[#F0F0F0] text-[var(--color-brand-text-secondary)]">
										{{ mov.source }}
									</span>
								</div>
							</div>
							<span
								:class="[
									'text-[0.9375rem] font-bold tabular-nums whitespace-nowrap ml-[16px]',
									mov.type === 'credit' ? 'text-emerald-600' : 'text-red-500',
								]">
								{{ mov.type === 'credit' ? '+' : '-' }}&euro;{{ formatCurrency(mov.amount) }}
							</span>
						</li>
					</ul>
				</div>
			</div>

			<div class="mb-[20px] rounded-[12px] border border-[var(--color-brand-border)] bg-[#F8FAFB] p-[14px] tablet:p-[18px]">
				<div class="flex flex-col gap-[14px] desktop:flex-row desktop:items-center desktop:justify-between">
					<div>
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.6px] text-[#6B7280]">Toolbar finanze</p>
						<h2 class="mt-[4px] text-[1rem] font-semibold text-[var(--color-brand-text)]">Saldi e movimenti</h2>
					</div>
					<div class="flex flex-wrap items-center gap-[8px]">
						<span class="sf-account-meta-pill">{{ walletUsersCount }} utenti</span>
						<span class="sf-account-meta-pill sf-account-meta-pill--muted">Saldo €{{ formatCurrency(totalWalletBalance) }}</span>
					</div>
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-3 gap-[12px] mb-[22px]">
				<div class="bg-white rounded-[12px] p-[16px] tablet:p-[18px] border border-[var(--color-brand-border)] shadow-sm">
					<div class="flex items-center gap-[8px] mb-[8px]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[var(--color-brand-text)]" fill="currentColor">
							<path
								d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
						</svg>
						<p class="text-[0.75rem] text-[var(--color-brand-text-secondary)] uppercase tracking-[0.5px] font-medium">Utenti attivi</p>
					</div>
					<p class="text-[1.75rem] font-bold text-[var(--color-brand-text)]">{{ walletUsersCount }}</p>
				</div>
				<div class="bg-white rounded-[12px] p-[16px] tablet:p-[18px] border border-[var(--color-brand-border)] shadow-sm">
					<div class="flex items-center gap-[8px] mb-[8px]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[var(--color-brand-primary)]" fill="currentColor">
							<path
								d="M5,6H23V18H5V6M14,9A3,3 0 0,1 17,12A3,3 0 0,1 14,15A3,3 0 0,1 11,12A3,3 0 0,1 14,9M9,8A2,2 0 0,1 7,10V14A2,2 0 0,1 9,16H19A2,2 0 0,1 21,14V10A2,2 0 0,1 19,8H9M1,10H3V20H19V22H1V10Z" />
						</svg>
						<p class="text-[0.75rem] text-[var(--color-brand-text-secondary)] uppercase tracking-[0.5px] font-medium">Saldo totale</p>
					</div>
					<p class="text-[1.75rem] font-bold text-[var(--color-brand-text)]">&euro;{{ formatCurrency(totalWalletBalance) }}</p>
				</div>
				<div class="bg-white rounded-[12px] p-[16px] tablet:p-[18px] border border-[var(--color-brand-border)] shadow-sm">
					<div class="flex items-center gap-[8px] mb-[8px]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-emerald-600" fill="currentColor">
							<path
								d="M3,6H21V18H3V6M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M7,8A2,2 0 0,1 5,10V14A2,2 0 0,1 7,16H17A2,2 0 0,1 19,14V10A2,2 0 0,1 17,8H7Z" />
						</svg>
						<p class="text-[0.75rem] text-[var(--color-brand-text-secondary)] uppercase tracking-[0.5px] font-medium">Commissioni residue</p>
					</div>
					<p class="text-[1.75rem] font-bold text-emerald-600">&euro;{{ formatCurrency(totalCommissionBalance) }}</p>
				</div>
			</div>

			<div class="bg-white rounded-[12px] p-[24px] desktop:p-[32px] shadow-sm border border-[var(--color-brand-border)]">
				<h2 class="text-[1.125rem] font-bold text-[var(--color-brand-text)] mb-[20px]">Utenti con movimenti</h2>
				<div v-if="!walletOverview?.length" class="text-center py-[48px] text-[var(--color-brand-text-secondary)]">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						class="w-[40px] h-[40px] text-[#C8CCD0] mx-auto mb-[12px]"
						fill="currentColor">
						<path
							d="M5,6H23V18H5V6M14,9A3,3 0 0,1 17,12A3,3 0 0,1 14,15A3,3 0 0,1 11,12A3,3 0 0,1 14,9M9,8A2,2 0 0,1 7,10V14A2,2 0 0,1 9,16H19A2,2 0 0,1 21,14V10A2,2 0 0,1 19,8H9M1,10H3V20H19V22H1V10Z" />
					</svg>
					<p>Nessun utente con movimenti.</p>
				</div>
				<div v-else class="space-y-[12px]">
					<div class="desktop:hidden grid grid-cols-1 tablet:grid-cols-2 gap-[12px]">
						<div v-for="u in walletOverview" :key="u.id" class="rounded-[12px] border border-[var(--color-brand-border)] bg-white p-[14px] shadow-sm">
							<div class="flex items-start justify-between gap-[12px]">
								<div class="min-w-0">
									<p class="text-[0.9375rem] font-semibold text-[var(--color-brand-text)] truncate">{{ u.name }}</p>
									<p class="text-[0.75rem] text-[var(--color-brand-text-secondary)] truncate">{{ u.email }}</p>
									<span
										:class="[
											'inline-block mt-[8px] px-[8px] py-[2px] rounded-full text-[0.6875rem] font-medium',
											u.role === 'Partner Pro'
												? 'bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]'
												: u.role === 'Admin'
													? 'bg-purple-50 text-purple-700'
													: 'bg-gray-100 text-gray-600',
										]">
										{{ u.role || 'Cliente' }}
									</span>
								</div>
								<div class="text-right shrink-0">
									<p class="text-[0.75rem] text-[var(--color-brand-text-secondary)] uppercase tracking-[0.5px]">Saldo</p>
									<p class="text-[1rem] font-bold text-[var(--color-brand-text)]">&euro;{{ formatCurrency(u.wallet_balance) }}</p>
								</div>
							</div>
							<div class="grid grid-cols-2 gap-[10px] mt-[12px]">
								<div class="rounded-[12px] bg-[#F8F9FB] border border-[var(--color-brand-border)] p-[10px]">
									<p class="text-[0.6875rem] text-[var(--color-brand-text-secondary)] uppercase tracking-[0.5px] mb-[2px]">Commissioni</p>
									<p class="text-[0.9375rem] font-bold text-emerald-600">&euro;{{ formatCurrency(u.commission_balance) }}</p>
								</div>
								<button @click="viewUserMovements(u.id, u.name)" class="btn-secondary btn-compact justify-center">Movimenti</button>
							</div>
						</div>
					</div>

					<div class="hidden desktop:block overflow-x-auto">
						<table class="w-full text-[0.875rem]">
							<thead>
								<tr class="border-b border-[var(--color-brand-border)] text-left text-[var(--color-brand-text-secondary)]">
									<th class="pb-[12px] font-medium">Utente</th>
									<th class="pb-[12px] font-medium">Email</th>
									<th class="pb-[12px] font-medium">Ruolo</th>
									<th class="pb-[12px] font-medium text-right">Saldo</th>
									<th class="pb-[12px] font-medium text-right">Commissioni</th>
									<th class="pb-[12px] font-medium text-center">Azioni</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="(u, idx) in walletOverview"
									:key="u.id"
									:class="['border-b border-[#F0F0F0] last:border-0', idx % 2 === 1 ? 'bg-[#FAFBFC]' : '']">
									<td class="py-[14px] text-[var(--color-brand-text)] font-medium">{{ u.name }}</td>
									<td class="py-[14px] text-[var(--color-brand-text-secondary)]">{{ u.email }}</td>
									<td class="py-[14px]">
										<span
											:class="[
												'inline-block px-[8px] py-[2px] rounded-full text-[0.6875rem] font-medium',
												u.role === 'Partner Pro'
													? 'bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]'
													: u.role === 'Admin'
														? 'bg-purple-50 text-purple-700'
														: 'bg-gray-100 text-gray-600',
											]">
											{{ u.role || 'Cliente' }}
										</span>
									</td>
									<td class="py-[14px] text-right font-semibold text-[var(--color-brand-text)]">&euro;{{ formatCurrency(u.wallet_balance) }}</td>
									<td class="py-[14px] text-right font-semibold text-emerald-600">&euro;{{ formatCurrency(u.commission_balance) }}</td>
									<td class="py-[14px] text-center">
										<button
											@click="viewUserMovements(u.id, u.name)"
											class="text-[0.8125rem] text-[var(--color-brand-primary)] hover:underline cursor-pointer font-medium">
											Movimenti
										</button>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>
