<!--
  FILE: pages/account/prelievi.vue
  SCOPO: Pagina prelievi commissioni — orchestratore.
  API: GET /api/withdrawals, POST /api/withdrawals.
  COMPONENTI: AccountPrelieviBalance, AccountPrelieviHistory, AccountPageHeader.
  ROUTE: /account/prelievi (middleware sanctum:auth).
-->
<script setup>
import { formatEuro } from '~/utils/price.js';

definePageMeta({ middleware: ['app-auth'] });

useSeoMeta({
	title: 'Prelievi account | SpediamoFacile',
	ogTitle: 'Prelievi account | SpediamoFacile',
	description: 'Gestisci richieste di prelievo, saldo commissioni e storico prelievi dal tuo account SpediamoFacile.',
	ogDescription: 'Saldo commissioni, richieste di prelievo e storico Partner Pro su SpediamoFacile.',
});

const { user } = useSanctumAuth();
const { uiSnapshot } = useAuthUiState();
const sanctum = useSanctumClient();

const hasMounted = ref(false);
const effectiveRole = computed(() => uiSnapshot.value.role || user.value?.role || null);
const isPro = computed(() => effectiveRole.value === 'Partner Pro');
const showProContent = computed(() => hasMounted.value && isPro.value);
const showProUpsell = computed(() => hasMounted.value && !isPro.value);

const withdrawals = ref([]);
const earnings = ref(null);
const isLoadingData = ref(true);
const isLoading = ref(false);
const message = ref(null);
const messageType = ref('success');
const pageError = ref(null);
const hasLoadedPageState = ref(false);

const fetchData = async () => {
	isLoadingData.value = true;
	pageError.value = null;

	if (!isPro.value) {
		withdrawals.value = [];
		earnings.value = null;
		isLoadingData.value = false;
		hasLoadedPageState.value = true;
		return;
	}
	try {
		const [wData, eData] = await Promise.all([sanctum('/api/withdrawals'), sanctum('/api/referral/earnings')]);
		withdrawals.value = wData?.data || wData || [];
		earnings.value = eData;
	} catch {
		withdrawals.value = [];
		earnings.value = { commission_balance: 0 };
		pageError.value = 'Non riesco a caricare saldo e richieste di prelievo. Riprova.';
	} finally {
		isLoadingData.value = false;
		hasLoadedPageState.value = true;
	}
};

onMounted(async () => {
	hasMounted.value = true;
	await fetchData();
});

watch(
	() => effectiveRole.value,
	async (nextRole, previousRole) => {
		if (!hasMounted.value) return;
		if (nextRole === previousRole && hasLoadedPageState.value) return;
		await fetchData();
	},
);

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
	} finally {
		isLoading.value = false;
	}
};

/* Header computeds */
const withdrawalHeader = computed(() => ({
	eyebrow: 'Partner Pro',
	title: 'Prelievi',
	description: isPro.value
		? 'Richiedi prelievi, controlla lo storico e tieni monitorato il saldo commissioni in un solo punto.'
		: 'Attiva Partner Pro per trasformare le commissioni in saldo prelevabile, con storico richieste e stato sempre visibile.',
}));

const withdrawalHeaderStats = computed(() => [
	{ label: 'Minimo', value: '1,00\u20AC' },
	{ label: 'Storico', value: `${withdrawals.value.length || 0} richieste` },
]);

const retryLoad = async () => {
	await fetchData();
};

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
	{ label: 'Disponibile', value: `\u20AC${formatEuro(availableBalance.value)}`, tone: 'bg-[#F0F6F7] text-[var(--color-brand-primary)]' },
	{
		label: 'In attesa',
		value: pendingWithdrawals.value ? `${pendingWithdrawals.value} richiesta` : 'Nessuna',
		tone: 'bg-[#FFF7E8] text-[#B45309]',
	},
	{ label: 'Ultimo stato', value: lastWithdrawalLabel.value, tone: 'bg-[#F8F9FB] text-[#404040]' },
]);

const withdrawalUpsellBenefits = computed(() => [
	{
		label: 'Saldo prelevabile',
		value: 'da 1,00€',
		meta: 'Quando sei Pro puoi trasformare le commissioni in richieste vere, senza soglie inutilmente alte.',
	},
	{
		label: 'Storico richieste',
		value: `${withdrawals.value.length || 0} registrate`,
		meta: 'Ogni invio resta tracciato qui, con stato e data sempre leggibili.',
	},
	{
		label: 'Flusso Pro',
		value: 'piu lineare',
		meta: 'Referral, commissioni e prelievi restano nello stesso spazio operativo dell account.',
	},
]);
</script>

<template>
	<section class="sf-account-shell min-h-[600px] py-[28px] desktop:py-[64px]">
		<div class="my-container">
			<AccountPageHeader
				:eyebrow="withdrawalHeader.eyebrow"
				:title="withdrawalHeader.title"
				:description="withdrawalHeader.description"
				:crumbs="[{ label: 'Account', to: '/account' }, { label: 'Prelievi' }]">
				<template #meta>
					<div class="flex flex-wrap gap-[8px]">
						<span
							v-for="stat in withdrawalHeaderStats"
							:key="stat.label"
							class="inline-flex items-center gap-[6px] rounded-full bg-[#F0F6F7] px-[12px] py-[6px] text-[0.8125rem] font-semibold text-[var(--color-brand-primary)]">
							{{ stat.label }}: {{ stat.value }}
						</span>
					</div>
				</template>
				<template #actions v-if="showProUpsell">
					<NuxtLink to="/account/account-pro" class="btn-secondary btn-compact inline-flex items-center justify-center gap-[8px]">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2">
							<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
						</svg>
						Scopri Pro
					</NuxtLink>
				</template>
			</AccountPageHeader>

			<div v-if="pageError" class="ux-alert ux-alert--warning mb-[18px]">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					class="ux-alert__icon"
					fill="none"
					stroke="currentColor"
					stroke-width="1.9"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true">
					<path d="M12 9v4" />
					<path d="M12 17h.01" />
					<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
				</svg>
				<div class="flex min-w-0 flex-1 flex-col gap-[4px]">
					<p class="ux-alert__title">{{ pageError }}</p>
				</div>
				<button type="button" class="btn-secondary btn-compact" @click="retryLoad">Riprova</button>
			</div>

			<div v-if="!hasMounted" class="sf-account-panel rounded-[20px] p-[18px] desktop:p-[28px]">
				<div class="animate-pulse space-y-[12px]">
					<div class="h-[18px] w-[180px] rounded-full bg-[var(--color-brand-border)]"></div>
					<div class="grid gap-[12px] desktop:grid-cols-3">
						<div v-for="index in 3" :key="index" class="h-[92px] rounded-[16px] bg-[#F5F7F8]"></div>
					</div>
				</div>
			</div>

			<!-- Panoramica (solo Pro) -->
			<div
				v-else-if="showProContent"
				class="sf-account-panel mb-[18px] rounded-[20px] px-[16px] py-[14px] desktop:px-[20px] desktop:py-[16px]">
				<div class="grid gap-[12px] desktop:grid-cols-[minmax(0,1.05fr)_repeat(3,minmax(0,0.55fr))] desktop:items-center">
					<div>
						<p class="text-[0.75rem] font-semibold uppercase tracking-[1px] text-[var(--color-brand-primary)]">Panoramica prelievi</p>
						<h2 class="mt-[4px] text-[1rem] font-bold text-[var(--color-brand-text)]">Saldo e stato richieste</h2>
					</div>
					<div v-for="item in withdrawalOverview" :key="item.label" class="rounded-[12px] border border-[var(--color-brand-border)] px-[14px] py-[12px]">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.8px] text-[var(--color-brand-text-secondary)]">{{ item.label }}</p>
						<span :class="['mt-[8px] inline-flex rounded-full px-[10px] py-[5px] text-[0.75rem] font-semibold', item.tone]">
							{{ item.value }}
						</span>
					</div>
				</div>
			</div>

			<!-- Not Pro -->
			<div v-else-if="showProUpsell" class="sf-account-panel prelievi-upsell rounded-[24px] p-[20px] desktop:p-[28px]">
				<div class="prelievi-upsell__intro">
					<div class="prelievi-upsell__icon-shell">
						<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" class="text-[var(--color-brand-primary)]">
							<path
								d="M5,6H23V18H5V6M14,9A3,3 0 0,1 17,12A3,3 0 0,1 14,15A3,3 0 0,1 11,12A3,3 0 0,1 14,9M9,8A2,2 0 0,1 7,10V14A2,2 0 0,1 9,16H19A2,2 0 0,1 21,14V10A2,2 0 0,1 19,8H9M1,10H3V20H19V22H1V10Z" />
						</svg>
					</div>
					<div class="prelievi-upsell__copy">
						<p class="prelievi-upsell__eyebrow">Partner Pro richiesto</p>
						<h2 class="prelievi-upsell__title">Sblocca i prelievi quando vuoi trasformare le commissioni in saldo reale</h2>
						<p class="prelievi-upsell__text">
							Con Pro tieni insieme commissioni, stato richieste e storico senza uscire dall'account. Qui non trovi un blocco generico: trovi il punto in cui il flusso referral diventa operativo.
						</p>
					</div>
				</div>

				<div class="prelievi-upsell__benefits">
					<article v-for="item in withdrawalUpsellBenefits" :key="item.label" class="prelievi-upsell__benefit">
						<span class="prelievi-upsell__benefit-label">{{ item.label }}</span>
						<strong class="prelievi-upsell__benefit-value">{{ item.value }}</strong>
						<p class="prelievi-upsell__benefit-text">{{ item.meta }}</p>
					</article>
				</div>

				<div class="prelievi-upsell__footer">
					<p class="prelievi-upsell__note">
						Appena passi a Pro, questa pagina mostra saldo disponibile, richieste pendenti e cronologia completa nello stesso posto.
					</p>
					<NuxtLink to="/account/account-pro" class="btn-secondary btn-compact inline-flex items-center gap-[8px]">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="17"
							height="17"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2">
							<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
						</svg>
						Scopri Pro
					</NuxtLink>
				</div>
			</div>

			<!-- Pro content -->
			<template v-else-if="showProContent">
				<AccountPrelieviBalance
					:available-balance="availableBalance"
					:is-loading="isLoading"
					:has-pending="hasPending"
					:message="message"
					:message-type="messageType"
					@request-withdrawal="requestWithdrawal" />

				<AccountPrelieviHistory :withdrawals="withdrawals" :is-loading-data="isLoadingData" />
			</template>
		</div>
	</section>
</template>

<style scoped>
.prelievi-upsell {
	display: grid;
	gap: 20px;
}

.prelievi-upsell__intro {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	gap: 16px;
	align-items: start;
}

.prelievi-upsell__icon-shell {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 64px;
	height: 64px;
	border-radius: 20px;
	background: linear-gradient(180deg, #edf7f8 0%, #e5f2f4 100%);
	border: 1px solid #d7e5e9;
	box-shadow: 0 8px 18px rgba(20, 37, 48, 0.05);
}

.prelievi-upsell__copy {
	display: grid;
	gap: 6px;
	max-width: 44rem;
}

.prelievi-upsell__eyebrow {
	margin: 0;
	font-size: 0.72rem;
	font-weight: 800;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: #6a7a89;
}

.prelievi-upsell__title {
	margin: 0;
	font-size: clamp(1.18rem, 1.05rem + 0.35vw, 1.5rem);
	line-height: 1.12;
	font-weight: 800;
	letter-spacing: -0.03em;
	color: #1f2a3c;
}

.prelievi-upsell__text,
.prelievi-upsell__note {
	margin: 0;
	font-size: 0.9rem;
	line-height: 1.55;
	color: #5d6e7f;
}

.prelievi-upsell__benefits {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12px;
}

.prelievi-upsell__benefit {
	position: relative;
	display: grid;
	gap: 4px;
	padding: 16px;
	border-radius: 18px;
	border: 1px solid #d9e6ea;
	background: linear-gradient(180deg, #ffffff 0%, #fbfcfd 100%);
	box-shadow: 0 8px 18px rgba(20, 37, 48, 0.04);
	overflow: hidden;
}

.prelievi-upsell__benefit::before {
	content: '';
	position: absolute;
	inset: 0 auto 0 0;
	width: 4px;
	background: linear-gradient(180deg, var(--color-brand-primary-light) 0%, #e45c20 100%);
}

.prelievi-upsell__benefit-label {
	font-size: 0.72rem;
	font-weight: 800;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: #6f7f8f;
}

.prelievi-upsell__benefit-value {
	font-size: 1.08rem;
	line-height: 1.1;
	font-weight: 800;
	color: #1f2a3c;
}

.prelievi-upsell__benefit-text {
	margin: 0;
	font-size: 0.82rem;
	line-height: 1.48;
	color: #5d6e7f;
}

.prelievi-upsell__footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding-top: 4px;
	border-top: 1px solid #e7eef2;
}

@media (max-width: 1023.98px) {
	.prelievi-upsell__benefits {
		grid-template-columns: minmax(0, 1fr);
	}
}

@media (max-width: 767.98px) {
	.prelievi-upsell__intro,
	.prelievi-upsell__footer {
		grid-template-columns: minmax(0, 1fr);
		display: grid;
	}

	.prelievi-upsell__icon-shell {
		width: 56px;
		height: 56px;
	}
}
</style>
