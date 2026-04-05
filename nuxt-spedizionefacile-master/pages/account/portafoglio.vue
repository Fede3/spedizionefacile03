<!--
  FILE: pages/account/portafoglio.vue
  SCOPO: Portafoglio — saldo, ricarica via Stripe, storico movimenti, saldo commissioni Pro.

  API: GET /api/wallet/balance (saldo principale + commissioni),
       GET /api/wallet/movements (storico movimenti), POST /api/wallet/top-up (ricarica),
       GET /api/stripe/default-payment-method (carta predefinita per la ricarica).
  COMPONENTI: AccountWalletBalanceCards, AccountWalletTopUp, AccountWalletMovements.
  ROUTE: /account/portafoglio (middleware sanctum:auth).

  DATI IN INGRESSO: nessuno (carica automaticamente saldo e movimenti dell'utente).
  DATI IN USCITA: ricarica portafoglio con carta predefinita.

  VINCOLI: Stripe.js viene caricato solo quando serve per aggiungere una nuova carta inline.
           Il saldo commissioni e' visibile solo ai Partner Pro (isPro computed).
  ERRORI TIPICI: non aggiornare saldo/movimenti/carta predefinita dopo una ricarica riuscita.
  PUNTI DI MODIFICA SICURI: importi preimpostati (nella sub-componente TopUp), stili card saldo.
  COLLEGAMENTI: pages/account/carte.vue, pages/account/prelievi.vue, controllers/WalletController.php.
-->
<script setup>
import { formatEuro } from '~/utils/price.js';

/* Preconnect to Stripe only on this page */
useHead({
	link: [
		{ rel: 'preconnect', href: 'https://js.stripe.com', crossorigin: '' },
		{ rel: 'preconnect', href: 'https://api.stripe.com', crossorigin: '' },
	],
});

definePageMeta({ middleware: ['app-auth'] });

useSeoMeta({
	title: 'Portafoglio account | SpediamoFacile',
	ogTitle: 'Portafoglio account | SpediamoFacile',
	description: 'Controlla saldo, ricariche e movimenti del portafoglio dal tuo account SpediamoFacile.',
	ogDescription: 'Saldo, ricariche e storico movimenti del portafoglio SpediamoFacile.',
});

const { user } = useSanctumAuth();
const { uiSnapshot } = useAuthUiState();
const sanctum = useSanctumClient();

/* Saldo del portafoglio (principale e commissioni) */
const balance = ref(null);
/* Lista dei movimenti (ricariche, pagamenti, commissioni, ecc.) */
const movements = ref([]);
/* Carta di pagamento predefinita dell'utente (per la ricarica) */
const defaultPaymentMethod = ref(null);
/* Indicatori di caricamento */
const isLoadingBalance = ref(true);
const isLoadingMovements = ref(true);
const isRefreshingWallet = ref(false);
/* Stato errori */
const balanceError = ref('');
const movementsError = ref('');
/* Stripe disponibilita' */
const stripeConfigured = ref(false);

const isValidStripePublishableKey = (value) => {
	const key = String(value || '').trim();
	return key.startsWith('pk_') && !key.includes('placeholder');
};

const getRequestErrorMessage = (error, fallback) => {
	return error?.response?._data?.message || error?.data?.message || error?.message || fallback;
};

const formatCardBrand = (brand) => {
	const value = String(brand || '').trim();
	if (!value) return 'Carta';
	return value.charAt(0).toUpperCase() + value.slice(1);
};

/* Controlla se l'utente e' un Partner Pro */
const effectiveRole = computed(() => uiSnapshot.value.role || user.value?.role || null);
const isPro = computed(() => effectiveRole.value === 'Partner Pro');

const movementCount = computed(() => movements.value.length || 0);
const movementCountLabel = computed(() => {
	if (isLoadingMovements.value && !movementCount.value) return 'Caricamento';
	if (movementsError.value && !movementCount.value) return 'Da aggiornare';
	if (!movementCount.value) return 'Ancora nessuno';
	return `${movementCount.value} ${movementCount.value === 1 ? 'movimento' : 'movimenti'}`;
});

const defaultPaymentMethodLabel = computed(() => {
	if (defaultPaymentMethod.value?.card) {
		return `${formatCardBrand(defaultPaymentMethod.value.card.brand)} •••• ${defaultPaymentMethod.value.card.last4}`;
	}
	if (!stripeConfigured.value) return 'Ricariche non attive';
	return 'Da aggiungere';
});

const balanceOverviewValue = computed(() => {
	if (isLoadingBalance.value && !balance.value) return 'Caricamento';
	if (balanceError.value && !balance.value) return 'Saldo non disponibile';
	return `\u20AC${formatEuro(balance.value?.balance || 0)}`;
});

const commissionOverviewValue = computed(() => {
	if (isLoadingBalance.value && !balance.value) return 'Caricamento';
	if (balanceError.value && !balance.value) return 'Da verificare';
	return `\u20AC${formatEuro(balance.value?.commission_balance || 0)}`;
});

const walletHeaderStats = computed(() => [
	{
		label: 'Saldo',
		value:
			isLoadingBalance.value && !balance.value
				? 'Caricamento'
				: balanceError.value && !balance.value
					? 'Da verificare'
					: `\u20AC${formatEuro(balance.value?.balance || 0)}`,
	},
	{ label: 'Movimenti', value: movementCountLabel.value },
	{ label: 'Carta', value: defaultPaymentMethodLabel.value },
]);

const walletOverview = computed(() => {
	const items = [
		{
			label: 'Disponibile',
			value: balanceOverviewValue.value,
			description:
				balanceError.value && !balance.value
					? 'Il saldo non e disponibile adesso: usa il retry per sincronizzare di nuovo i dati.'
					: balanceError.value
						? 'Ultimo dato disponibile: aggiorna per verificare il saldo.'
						: 'Usabile subito per spedizioni e pagamenti.',
			tone: 'bg-[#F0F6F7] text-[#095866]',
		},
		{
			label: 'Carta predefinita',
			value: defaultPaymentMethodLabel.value,
			description: stripeConfigured.value
				? 'Le nuove ricariche useranno il metodo mostrato qui.'
				: 'Stripe non risulta ancora configurato per le ricariche.',
			tone: stripeConfigured.value ? 'bg-[#F8F9FB] text-[#404040]' : 'bg-[#FFF7E8] text-[#B45309]',
		},
		{
			label: 'Storico',
			value: movementCountLabel.value,
			description: movementsError.value
				? 'Lo storico non si e aggiornato correttamente: puoi riprovare sotto.'
				: 'Qui trovi ricariche, pagamenti, rimborsi e commissioni.',
			tone: movementsError.value ? 'bg-[#FEF2F2] text-[#B42318]' : 'bg-[#F8F9FB] text-[#404040]',
		},
	];

	if (isPro.value) {
		items.push({
			label: 'Commissioni Pro',
			value: commissionOverviewValue.value,
			description: 'Restano separate dal saldo del wallet e puoi prelevarle dalla sezione dedicata.',
			tone: 'bg-[#F4FBF6] text-[#15803D]',
		});
	}

	return items;
});

/* --- Data fetching --- */

const fetchBalance = async ({ showLoader = true } = {}) => {
	if (showLoader) isLoadingBalance.value = true;
	balanceError.value = '';

	try {
		const res = await sanctum('/api/wallet/balance');
		balance.value = res || { balance: 0, commission_balance: 0 };
	} catch (error) {
		balanceError.value = getRequestErrorMessage(error, 'Non sono riuscito a recuperare il saldo del portafoglio.');
		if (!balance.value) balance.value = null;
	} finally {
		isLoadingBalance.value = false;
	}
};

const fetchMovements = async ({ showLoader = true } = {}) => {
	if (showLoader) isLoadingMovements.value = true;
	movementsError.value = '';

	try {
		const res = await sanctum('/api/wallet/movements');
		movements.value = res?.data || res || [];
	} catch (error) {
		movementsError.value = getRequestErrorMessage(error, 'Non sono riuscito ad aggiornare i movimenti del portafoglio.');
		if (!movements.value.length) movements.value = [];
	} finally {
		isLoadingMovements.value = false;
	}
};

const fetchPaymentMethod = async () => {
	try {
		const res = await sanctum('/api/stripe/default-payment-method');
		defaultPaymentMethod.value = res;
	} catch {
		if (!defaultPaymentMethod.value) defaultPaymentMethod.value = null;
	}
};

const fetchStripeAvailability = async () => {
	const runtimeConfig = useRuntimeConfig();
	try {
		const config = await sanctum('/api/settings/stripe');
		const key = String(config?.publishable_key || '').trim();
		stripeConfigured.value = Boolean(config?.configured) && isValidStripePublishableKey(key);
	} catch {
		const fallbackKey = String(runtimeConfig.public.stripeKey || '').trim();
		stripeConfigured.value = isValidStripePublishableKey(fallbackKey);
	}
};

const refreshWalletData = async () => {
	isRefreshingWallet.value = true;

	try {
		await Promise.allSettled([fetchBalance(), fetchMovements(), fetchPaymentMethod(), fetchStripeAvailability()]);
	} finally {
		isRefreshingWallet.value = false;
	}
};

const retryBalance = async () => {
	await fetchBalance();
};

const retryMovements = async () => {
	await fetchMovements();
};

/* Ricarica dati dopo un top-up riuscito */
const onTopUpSuccess = async () => {
	await Promise.allSettled([fetchBalance({ showLoader: false }), fetchMovements({ showLoader: false }), fetchPaymentMethod()]);
};

/* Ricarica carta predefinita dopo salvataggio nuova carta */
const onPaymentMethodUpdated = async () => {
	await fetchPaymentMethod();
};

/* All'apertura della pagina, carica in parallelo */
onMounted(() => {
	refreshWalletData();
});
</script>

<template>
	<section class="sf-account-shell min-h-[600px] py-[24px] tablet:py-[28px] desktop:py-[48px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Pagamenti"
				title="Portafoglio"
				description="Controlla saldo disponibile, carta predefinita e movimenti senza uscire dall'account."
				:crumbs="[{ label: 'Account', to: '/account' }, { label: 'Portafoglio' }]">
				<template #meta>
					<div class="flex flex-wrap gap-[8px]">
						<span
							v-for="stat in walletHeaderStats"
							:key="stat.label"
							class="inline-flex items-center gap-[6px] rounded-full bg-[#F0F6F7] px-[12px] py-[6px] text-[0.8125rem] font-semibold text-[#095866]">
							{{ stat.label }}: {{ stat.value }}
						</span>
					</div>
				</template>

				<template #actions>
					<div class="flex w-full flex-col gap-[10px] tablet:w-auto tablet:flex-row">
						<button
							type="button"
							@click="refreshWalletData"
							:disabled="isRefreshingWallet"
							class="btn-secondary btn-compact inline-flex items-center justify-center gap-[8px] disabled:cursor-not-allowed disabled:opacity-60">
							<svg
								v-if="!isRefreshingWallet"
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round">
								<path d="M21 2v6h-6" />
								<path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
								<path d="M3 22v-6h6" />
								<path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
							</svg>
							<span v-else class="h-[16px] w-[16px] rounded-full border-2 border-current border-r-transparent animate-spin"></span>
							<span>{{ isRefreshingWallet ? 'Aggiornamento...' : 'Aggiorna dati' }}</span>
						</button>

						<NuxtLink to="/account/carte" class="btn-cta btn-compact inline-flex items-center justify-center gap-[8px]">
							Carte e pagamenti
						</NuxtLink>
					</div>
				</template>
			</AccountPageHeader>

			<div class="sf-account-panel mb-[18px] rounded-[20px] px-[16px] py-[14px] desktop:px-[20px] desktop:py-[16px]">
				<div
					:class="[
						'grid gap-[12px] desktop:items-center',
						isPro
							? 'desktop:grid-cols-[minmax(0,1.08fr)_repeat(4,minmax(0,0.58fr))]'
							: 'desktop:grid-cols-[minmax(0,1.08fr)_repeat(3,minmax(0,0.68fr))]',
					]">
					<div>
						<p class="text-[0.75rem] font-semibold uppercase tracking-[1px] text-[#095866]">Panoramica portafoglio</p>
						<h2 class="mt-[4px] text-[1rem] font-bold text-[#252B42]">Saldo, carta e storico con una gerarchia piu chiara</h2>
						<p class="mt-[4px] max-w-[560px] text-[0.8125rem] leading-[1.55] text-[#667281]">
							Le ricariche usano la carta predefinita e, dopo ogni operazione, saldo e movimenti vengono aggiornati qui.
						</p>
					</div>

					<div v-for="item in walletOverview" :key="item.label" class="rounded-[12px] border border-[#E9EBEC] px-[14px] py-[12px]">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.8px] text-[#737373]">{{ item.label }}</p>
						<span :class="['mt-[8px] inline-flex rounded-full px-[10px] py-[5px] text-[0.75rem] font-semibold', item.tone]">
							{{ item.value }}
						</span>
						<p class="mt-[8px] text-[0.75rem] leading-[1.5] text-[#667281]">{{ item.description }}</p>
					</div>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-[18px] desktop:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] desktop:items-start">
				<AccountWalletBalanceCards
					:balance="balance"
					:is-pro="isPro"
					:is-loading-balance="isLoadingBalance"
					:balance-error="balanceError"
					@retry-balance="retryBalance" />

				<AccountWalletTopUp
					:default-payment-method="defaultPaymentMethod"
					:stripe-configured="stripeConfigured"
					@top-up-success="onTopUpSuccess"
					@payment-method-updated="onPaymentMethodUpdated" />
			</div>

			<AccountWalletMovements
				:movements="movements"
				:is-loading-movements="isLoadingMovements"
				:movements-error="movementsError"
				@retry-movements="retryMovements" />
		</div>
	</section>
</template>
