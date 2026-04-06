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
			tone: 'bg-[#F0F6F7] text-[var(--color-brand-primary)]',
		},
		{
			label: 'Carta predefinita',
			value: defaultPaymentMethodLabel.value,
			description: stripeConfigured.value
				? 'Le nuove ricariche useranno il metodo mostrato qui.'
				: 'Stripe non risulta ancora configurato per le ricariche.',
			tone: stripeConfigured.value ? 'bg-[#F5F6F9] text-[var(--color-brand-text)]' : 'bg-[#FFF7E8] text-[#B45309]',
		},
		{
			label: 'Storico',
			value: movementCountLabel.value,
			description: movementsError.value
				? 'Lo storico non si e aggiornato correttamente: puoi riprovare sotto.'
				: 'Qui trovi ricariche, pagamenti, rimborsi e commissioni.',
			tone: movementsError.value ? 'bg-[#FEF2F2] text-[#B42318]' : 'bg-[#F5F6F9] text-[var(--color-brand-text)]',
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
	<section class="min-h-[600px] py-[20px] tablet:py-[28px] desktop:py-[28px] bg-white">
		<div class="my-container max-w-[1280px]">
			<!-- Page shell header -->
			<div class="flex flex-col gap-[16px] tablet:gap-[16px] mb-[20px]">
				<NuxtLink to="/account"
					class="flex items-center gap-[6px] text-[var(--color-brand-text-muted)] text-[13px] cursor-pointer hover:text-[var(--color-brand-text-secondary)] transition-colors duration-[350ms] font-[500]">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
					Dashboard
				</NuxtLink>
				<div class="flex items-center gap-[16px]">
					<div class="w-[48px] h-[48px] rounded-[14px] bg-[rgba(9,88,102,0.08)] flex items-center justify-center shrink-0">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1"/><path d="M21 12H10m11 0-3-3m3 3-3 3"/></svg>
					</div>
					<div>
						<h1 class="text-[var(--color-brand-text)] text-[24px] tablet:text-[28px] tracking-[-0.5px] font-[800]">Portafoglio</h1>
						<p class="text-[var(--color-brand-text-muted)] text-[13px] tablet:text-[14px] mt-[2px]">Gestisci transazioni, metodi di pagamento e fatture</p>
					</div>
				</div>
			</div>

			<!-- Dark wallet card (prototype-style) -->
			<div class="rounded-[20px] px-[20px] tablet:px-[20px] py-[20px] relative overflow-hidden mb-[28px]"
				style="background: linear-gradient(135deg, #1a2332 0%, #1d2738 50%, #2d3555 100%); box-shadow: 0 6px 24px rgba(29,39,56,0.25);">
				<div class="absolute top-0 right-0 w-[200px] h-[200px] rounded-full opacity-[0.06]"
					style="background: radial-gradient(circle, #095866 0%, transparent 70%);"></div>
				<div class="relative z-10 flex flex-col tablet:flex-row tablet:items-center tablet:justify-between gap-[16px]">
					<div>
						<span class="text-white/50 text-[12px] uppercase tracking-[0.5px] block mb-[4px] font-[600]">Saldo wallet</span>
						<span class="text-white text-[32px] tablet:text-[38px] tracking-[-0.8px] font-[800]">
							{{ balanceOverviewValue }}
						</span>
					</div>
					<div class="flex gap-[8px]">
						<button
							type="button"
							@click="refreshWalletData"
							:disabled="isRefreshingWallet"
							class="h-[44px] px-[20px] rounded-full bg-white/[0.1] backdrop-blur-sm text-white text-[13px] font-[600] flex items-center gap-[6px] cursor-pointer hover:bg-white/[0.15] transition-colors duration-[350ms] disabled:opacity-60">
							<span v-if="!isRefreshingWallet">
								<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
							</span>
							<span v-else class="h-[14px] w-[14px] rounded-full border-2 border-white border-r-transparent animate-spin"></span>
							{{ isRefreshingWallet ? 'Aggiornamento...' : 'Aggiorna' }}
						</button>
						<NuxtLink to="/account/carte"
							class="h-[44px] px-[20px] rounded-full text-white text-[13px] font-[700] flex items-center gap-[6px] cursor-pointer transition-colors duration-[350ms]"
							style="background: linear-gradient(135deg, #E44203, #c73600); box-shadow: 0 4px 14px rgba(228,66,3,0.25);">
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
							Carte
						</NuxtLink>
					</div>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-[28px] desktop:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] desktop:items-start">
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
