<!--
  FILE: pages/account/prelievi.vue
  SCOPO: Pagina prelievi commissioni — orchestratore.
  API: GET /api/withdrawals, POST /api/withdrawals.
  COMPONENTI: AccountPrelieviBalance, AccountPrelieviHistory, AccountPageHeader.
  ROUTE: /account/prelievi (middleware sanctum:auth).
-->
<script setup>
import { formatEuro } from '~/utils/price.js';

definePageMeta({ middleware: ["app-auth"] });

const { user } = useSanctumAuth();
const sanctum = useSanctumClient();

const isPro = computed(() => user.value?.role === 'Partner Pro');

const withdrawals = ref([]);
const earnings = ref(null);
const isLoadingData = ref(true);
const isLoading = ref(false);
const message = ref(null);
const messageType = ref('success');

const fetchData = async () => {
	if (!isPro.value) { isLoadingData.value = false; return; }
	try {
		const [wData, eData] = await Promise.all([
			sanctum('/api/withdrawals'),
			sanctum('/api/referral/earnings'),
		]);
		withdrawals.value = wData?.data || wData || [];
		earnings.value = eData;
	} catch { /* silent */ }
	finally { isLoadingData.value = false; }
};

onMounted(fetchData);

const availableBalance = computed(() => Number(earnings.value?.commission_balance || 0));

const hasPending = computed(() => {
	if (!Array.isArray(withdrawals.value)) return false;
	return withdrawals.value.some((w) => w.status === 'pending');
});

const requestWithdrawal = async () => {
	if (availableBalance.value < 1) {
		message.value = 'Saldo commissioni insufficiente. Minimo 1,00 EUR.';
		messageType.value = 'error';
		return;
	}
	if (hasPending.value) {
		message.value = 'Hai già una richiesta in attesa di approvazione.';
		messageType.value = 'error';
		return;
	}
	isLoading.value = true;
	message.value = null;
	try {
		const result = await sanctum('/api/withdrawals', { method: 'POST' });
		if (result?.success) {
			message.value = `Richiesta di prelievo di \u20AC${formatEuro(availableBalance.value)} inviata con successo.`;
			messageType.value = 'success';
			await fetchData();
		} else {
			message.value = result?.message || 'Errore durante la richiesta.';
			messageType.value = 'error';
		}
	} catch (e) {
		message.value = e?.response?._data?.message || e?.data?.message || 'Errore imprevisto. Riprova.';
		messageType.value = 'error';
	} finally { isLoading.value = false; }
};

/* Header computeds */
const withdrawalHeader = computed(() => ({
	eyebrow: 'Partner Pro',
	title: isPro.value ? 'Prelievi' : 'Prelievi Pro',
	description: '',
}));

const withdrawalHeaderStats = computed(() => [
	{ label: 'Minimo', value: '1,00\u20AC' },
	{ label: 'Storico', value: `${withdrawals.value.length || 0} richieste` },
]);

const pendingWithdrawals = computed(() => {
	if (!Array.isArray(withdrawals.value)) return 0;
	return withdrawals.value.filter((w) => w.status === 'pending').length;
});

const lastWithdrawalLabel = computed(() => {
	if (!Array.isArray(withdrawals.value) || !withdrawals.value.length) return 'Nessuna richiesta ancora';
	const statusLabels = { pending: 'In attesa', approved: 'Approvata', rejected: 'Rifiutata', completed: 'Completata' };
	return statusLabels[withdrawals.value[0].status] || withdrawals.value[0].status;
});

const withdrawalOverview = computed(() => [
	{ label: 'Disponibile', value: `\u20AC${formatEuro(availableBalance.value)}`, tone: 'bg-[#F0F6F7] text-[#095866]' },
	{ label: 'In attesa', value: pendingWithdrawals.value ? `${pendingWithdrawals.value} richiesta` : 'Nessuna', tone: 'bg-[#FFF7E8] text-[#B45309]' },
	{ label: 'Ultimo stato', value: lastWithdrawalLabel.value, tone: 'bg-[#F8F9FB] text-[#404040]' },
]);
</script>

<template>
	<section class="min-h-[600px] py-[28px] desktop:py-[64px]">
		<div class="my-container">
			<AccountPageHeader
				:eyebrow="withdrawalHeader.eyebrow"
				:title="withdrawalHeader.title"
				:description="withdrawalHeader.description"
				:crumbs="[{ label: 'Account', to: '/account' }, { label: 'Prelievi' }]"
			>
				<template #meta>
					<div class="flex flex-wrap gap-[8px]">
						<span v-for="stat in withdrawalHeaderStats" :key="stat.label" class="inline-flex items-center gap-[6px] rounded-full bg-[#F0F6F7] px-[12px] py-[6px] text-[0.8125rem] font-semibold text-[#095866]">
							{{ stat.label }}: {{ stat.value }}
						</span>
					</div>
				</template>
				<template #actions v-if="!isPro">
					<NuxtLink to="/account/account-pro" class="btn-secondary btn-compact inline-flex items-center justify-center gap-[8px]">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
						Scopri Pro
					</NuxtLink>
				</template>
			</AccountPageHeader>

			<!-- Panoramica (solo Pro) -->
			<div v-if="isPro" class="mb-[18px] rounded-[12px] border border-[#E9EBEC] bg-white px-[16px] py-[14px] shadow-sm desktop:px-[20px] desktop:py-[16px]">
				<div class="grid gap-[12px] desktop:grid-cols-[minmax(0,1.05fr)_repeat(3,minmax(0,0.55fr))] desktop:items-center">
					<div>
						<p class="text-[0.75rem] font-semibold uppercase tracking-[1px] text-[#095866]">Panoramica prelievi</p>
						<h2 class="mt-[4px] text-[1rem] font-bold text-[#252B42]">Saldo e stato richieste</h2>
					</div>
					<div v-for="item in withdrawalOverview" :key="item.label" class="rounded-[12px] border border-[#E9EBEC] px-[14px] py-[12px]">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.8px] text-[#737373]">{{ item.label }}</p>
						<span :class="['mt-[8px] inline-flex rounded-full px-[10px] py-[5px] text-[0.75rem] font-semibold', item.tone]">{{ item.value }}</span>
					</div>
				</div>
			</div>

			<!-- Not Pro -->
			<div v-if="!isPro" class="bg-white rounded-[12px] p-[18px] desktop:p-[28px] shadow-sm border border-[#E9EBEC] text-center">
				<div class="w-[64px] h-[64px] mx-auto mb-[16px] bg-[#edf7f8] rounded-full flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#095866"><path d="M5,6H23V18H5V6M14,9A3,3 0 0,1 17,12A3,3 0 0,1 14,15A3,3 0 0,1 11,12A3,3 0 0,1 14,9M9,8A2,2 0 0,1 7,10V14A2,2 0 0,1 9,16H19A2,2 0 0,1 21,14V10A2,2 0 0,1 19,8H9M1,10H3V20H19V22H1V10Z"/></svg>
				</div>
				<h2 class="text-[1.15rem] desktop:text-[1.25rem] font-bold text-[#252B42] mb-[8px]">Partner Pro richiesto</h2>
				<p class="text-[#667281] text-[0.85rem] max-w-[420px] mx-auto mb-[16px] leading-[1.5]">Attiva Pro per i prelievi.</p>
				<NuxtLink to="/account/account-pro" class="btn-secondary btn-compact inline-flex items-center gap-[8px]">
					<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
					Scopri Pro
				</NuxtLink>
			</div>

			<!-- Pro content -->
			<template v-else>
				<AccountPrelieviBalance
					:available-balance="availableBalance"
					:is-loading="isLoading"
					:has-pending="hasPending"
					:message="message"
					:message-type="messageType"
					@request-withdrawal="requestWithdrawal"
				/>

				<AccountPrelieviHistory
					:withdrawals="withdrawals"
					:is-loading-data="isLoadingData"
				/>
			</template>
		</div>
	</section>
</template>
