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
/* Preconnect to Stripe only on this page */
useHead({ link: [
	{ rel: 'preconnect', href: 'https://js.stripe.com', crossorigin: '' },
	{ rel: 'preconnect', href: 'https://api.stripe.com', crossorigin: '' },
] });

definePageMeta({ middleware: ["app-auth"] });

const { user } = useSanctumAuth();
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
/* Stripe disponibilita' */
const stripeConfigured = ref(false);

const isValidStripePublishableKey = (value) => {
	const key = String(value || '').trim();
	return key.startsWith('pk_') && !key.includes('placeholder');
};

/* Controlla se l'utente e' un Partner Pro */
const isPro = computed(() => user.value?.role === "Partner Pro");

/* --- Data fetching --- */

const fetchBalance = async () => {
	try {
		const res = await sanctum("/api/wallet/balance");
		balance.value = res;
	} catch {
		balance.value = { balance: 0, commission_balance: 0 };
	} finally {
		isLoadingBalance.value = false;
	}
};

const fetchMovements = async () => {
	try {
		const res = await sanctum("/api/wallet/movements");
		movements.value = res?.data || res || [];
	} catch {
		movements.value = [];
	} finally {
		isLoadingMovements.value = false;
	}
};

const fetchPaymentMethod = async () => {
	try {
		const res = await sanctum("/api/stripe/default-payment-method");
		defaultPaymentMethod.value = res;
	} catch {
		defaultPaymentMethod.value = null;
	}
};

const fetchStripeAvailability = async () => {
	const runtimeConfig = useRuntimeConfig();
	try {
		const config = await sanctum("/api/settings/stripe");
		const key = String(config?.publishable_key || '').trim();
		stripeConfigured.value = Boolean(config?.configured) && isValidStripePublishableKey(key);
	} catch {
		const fallbackKey = String(runtimeConfig.public.stripeKey || '').trim();
		stripeConfigured.value = isValidStripePublishableKey(fallbackKey);
	}
};

/* Ricarica dati dopo un top-up riuscito */
const onTopUpSuccess = () => {
	fetchBalance();
	fetchMovements();
	fetchPaymentMethod();
};

/* Ricarica carta predefinita dopo salvataggio nuova carta */
const onPaymentMethodUpdated = () => {
	fetchPaymentMethod();
};

/* All'apertura della pagina, carica in parallelo */
onMounted(() => {
	Promise.all([fetchBalance(), fetchMovements(), fetchPaymentMethod(), fetchStripeAvailability()]);
});
</script>

<template>
	<section class="min-h-[600px] py-[24px] tablet:py-[28px] desktop:py-[48px]">
		<div class="my-container">
			<AccountPageHeader
				title="Portafoglio"
				description=""
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Portafoglio' },
				]"
			/>

			<div class="grid grid-cols-1 gap-[18px] desktop:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] desktop:items-start">
				<AccountWalletBalanceCards
					:balance="balance"
					:is-pro="isPro"
					:is-loading-balance="isLoadingBalance"
				/>

				<AccountWalletTopUp
					:default-payment-method="defaultPaymentMethod"
					:stripe-configured="stripeConfigured"
					@top-up-success="onTopUpSuccess"
					@payment-method-updated="onPaymentMethodUpdated"
				/>
			</div>

			<AccountWalletMovements
				:movements="movements"
				:is-loading-movements="isLoadingMovements"
			/>
		</div>
	</section>
</template>
