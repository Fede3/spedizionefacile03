<!--
  FILE: pages/account/portafoglio.vue
  SCOPO: Portafoglio — saldo, ricarica via Stripe, storico movimenti, saldo commissioni Pro.

  API: GET /api/wallet/balance (saldo principale + commissioni),
       GET /api/wallet/movements (storico movimenti), POST /api/wallet/top-up (ricarica),
       GET /api/stripe/default-payment-method (carta predefinita per la ricarica).
  COMPONENTI: nessuno di esterno (usa Icon di Nuxt UI).
  ROUTE: /account/portafoglio (middleware sanctum:auth).

  DATI IN INGRESSO: nessuno (carica automaticamente saldo e movimenti dell'utente).
  DATI IN USCITA: ricarica portafoglio con carta predefinita.

  VINCOLI: Stripe.js viene caricato solo quando serve per aggiungere una nuova carta inline.
           Il saldo commissioni e' visibile solo ai Partner Pro (isPro computed).
  ERRORI TIPICI: non aggiornare saldo/movimenti/carta predefinita dopo una ricarica riuscita.
  PUNTI DI MODIFICA SICURI: importi preimpostati (presetAmounts), stili card saldo, etichette fonti,
                           microcopy della sezione ricarica.
  COLLEGAMENTI: pages/account/carte.vue, pages/account/prelievi.vue, controllers/WalletController.php.
-->
<script setup>
// Preconnect to Stripe only on this page (not globally, to save connections on other pages)
// Aggiunto anche api.stripe.com per velocizzare le chiamate API di pagamento
useHead({ link: [
	{ rel: 'preconnect', href: 'https://js.stripe.com', crossorigin: '' },
	{ rel: 'preconnect', href: 'https://api.stripe.com', crossorigin: '' },
] });

/* Richiede che l'utente sia autenticato */
definePageMeta({
	middleware: ["app-auth"],
});

const { user, refreshIdentity } = useSanctumAuth();
const sanctum = useSanctumClient();
const runtimeConfig = useRuntimeConfig();
const stripeConfigured = ref(false);
const stripePublishableKey = ref("");
const stripeReady = ref(false);
const stripeLoading = ref(false);
const isValidStripePublishableKey = (value) => {
	const key = String(value || '').trim();
	return key.startsWith('pk_') && !key.includes('placeholder');
};
let stripe = null;

/* Saldo del portafoglio (principale e commissioni) */
const balance = ref(null);
/* Lista dei movimenti (ricariche, pagamenti, commissioni, ecc.) */
const movements = ref([]);
/* Carta di pagamento predefinita dell'utente (per la ricarica) */
const defaultPaymentMethod = ref(null);
/* Indicatori di caricamento per saldo e movimenti */
const isLoadingBalance = ref(true);
const isLoadingMovements = ref(true);

/* Importo scelto dall'utente per la ricarica */
const topUpAmount = ref("");
/* Indica se la ricarica e' in corso */
const isLoading = ref(false);
/* Messaggio di feedback (successo o errore) dopo un'operazione */
const message = ref(null);
const messageType = ref("success");
/* Importi preimpostati per la ricarica rapida */
const presetAmounts = [10, 25, 50, 100, 200];
/* Stato del form nuova carta inline */
const showNewCardForm = ref(false);
const isPreparingNewCardForm = ref(false);
const cardHolderName = ref("");
const setupClientSecret = ref(null);
const elements = ref(null);
const cardNumber = ref(null);
const cardExpiry = ref(null);
const cardCvc = ref(null);
const cardError = ref(null);

const getStripeErrorMessage = (error) => {
	const errorMap = {
		card_declined: "Carta rifiutata. Contatta la tua banca o prova con un'altra carta.",
		expired_card: "Carta scaduta. Verifica la data di scadenza.",
		incorrect_cvc: "Codice CVC non corretto. Verifica il codice di sicurezza.",
		processing_error: "Errore temporaneo durante l'elaborazione. Riprova tra qualche minuto.",
		incorrect_number: "Numero carta non valido. Verifica il numero inserito.",
		invalid_number: "Numero carta non valido. Verifica il numero inserito.",
		invalid_expiry_month: "Mese di scadenza non valido.",
		invalid_expiry_year: "Anno di scadenza non valido.",
		invalid_cvc: "Codice CVC non valido.",
		incomplete_number: "Numero carta incompleto.",
		incomplete_expiry: "Data di scadenza incompleta.",
		incomplete_cvc: "Codice CVC incompleto.",
		insufficient_funds: "Fondi insufficienti sulla carta.",
		lost_card: "Carta segnalata come smarrita. Contatta la tua banca.",
		stolen_card: "Carta segnalata come rubata. Contatta la tua banca.",
	};

	return errorMap[error?.code] || error?.message || "Errore durante il salvataggio della carta. Riprova.";
};

const clearFeedbackMessage = () => {
	setTimeout(() => { message.value = null; }, 5000);
};

const clearNewCardForm = () => {
	cardHolderName.value = "";
	setupClientSecret.value = null;
	cardError.value = null;

	cardNumber.value?.unmount();
	cardExpiry.value?.unmount();
	cardCvc.value?.unmount();

	cardNumber.value = null;
	cardExpiry.value = null;
	cardCvc.value = null;
	elements.value = null;
};

const ensureStripeLoaded = async () => {
	if (stripeReady.value && stripe) return true;
	if (!stripeConfigured.value || stripeLoading.value) return false;

	stripeLoading.value = true;

	try {
		const { loadStripe } = await import("@stripe/stripe-js");
		stripe = await loadStripe(stripePublishableKey.value);
		stripeReady.value = Boolean(stripe);
		return stripeReady.value;
	} catch (e) {
		stripeReady.value = false;
		cardError.value = "Impossibile caricare Stripe. Ricarica la pagina e riprova.";
		return false;
	} finally {
		stripeLoading.value = false;
	}
};

const mountNewCardFields = async () => {
	if (!stripe || !showNewCardForm.value) return;

	await nextTick();

	elements.value = stripe.elements();

	const style = {
		base: {
			color: "#252B42",
			fontFamily: '"Inter", sans-serif',
			fontSize: "15px",
			fontWeight: "400",
			"::placeholder": { color: "#a0a0a0" },
		},
		invalid: { color: "#dc2626" },
	};

	cardNumber.value = elements.value.create("cardNumber", { style, placeholder: "1234 5678 9012 3456" });
	cardNumber.value.mount("#wallet-card-number");

	cardExpiry.value = elements.value.create("cardExpiry", { style });
	cardExpiry.value.mount("#wallet-card-expiry");

	cardCvc.value = elements.value.create("cardCvc", { style, placeholder: "123" });
	cardCvc.value.mount("#wallet-card-cvc");
};

const openNewCardForm = async () => {
	if (!stripeConfigured.value) {
		message.value = "Le ricariche con carta non sono ancora attive su questo sito.";
		messageType.value = "error";
		clearFeedbackMessage();
		return;
	}

	cardError.value = null;
	message.value = null;
	showNewCardForm.value = true;
	isPreparingNewCardForm.value = true;

	if (!cardHolderName.value.trim()) {
		cardHolderName.value = [user.value?.name, user.value?.surname].filter(Boolean).join(" ").trim();
	}

	clearNewCardForm();
	cardHolderName.value = [user.value?.name, user.value?.surname].filter(Boolean).join(" ").trim();

	const stripeLoaded = await ensureStripeLoaded();
	if (!stripeLoaded) {
		isPreparingNewCardForm.value = false;
		return;
	}

	try {
		const response = await sanctum("/api/stripe/create-setup-intent", {
			method: "POST",
		});

		if (!response?.client_secret) {
			cardError.value = response?.error || "Impossibile inizializzare il modulo carta. Riprova.";
			return;
		}

		setupClientSecret.value = response.client_secret;
		await mountNewCardFields();
	} catch (err) {
		cardError.value = err?.data?.error || err?.data?.message || err?.message || "Errore di connessione al sistema di pagamento.";
	} finally {
		isPreparingNewCardForm.value = false;
	}
};

const closeNewCardForm = () => {
	showNewCardForm.value = false;
	clearNewCardForm();
};

const saveNewCardAndGetPaymentMethodId = async () => {
	if (!setupClientSecret.value) {
		cardError.value = "Impossibile inizializzare il modulo carta. Riprova.";
		return null;
	}

	if (!cardHolderName.value.trim()) {
		cardError.value = "Inserisci il nome del titolare della carta.";
		return null;
	}

	const stripeLoaded = await ensureStripeLoaded();
	if (!stripeLoaded || !stripe) {
		cardError.value = "Stripe non disponibile. Ricarica la pagina e riprova.";
		return null;
	}

	const { setupIntent, error } = await stripe.confirmCardSetup(setupClientSecret.value, {
		payment_method: {
			card: cardNumber.value,
			billing_details: {
				name: cardHolderName.value.trim(),
			},
		},
	});

	if (error) {
		cardError.value = getStripeErrorMessage(error);
		return null;
	}

	if (!setupIntent?.payment_method) {
		cardError.value = "Metodo di pagamento non trovato. Riprova.";
		return null;
	}

	const serverResponse = await sanctum("/api/stripe/set-default-payment-method", {
		method: "POST",
		body: { payment_method: setupIntent.payment_method },
	});

	if (serverResponse?.error) {
		cardError.value = serverResponse.error || "Errore durante il salvataggio della carta.";
		return null;
	}

	await Promise.all([refreshIdentity(), fetchPaymentMethod()]);
	closeNewCardForm();

	return setupIntent.payment_method;
};

const canSubmitTopUp = computed(() => {
	const amount = Number(topUpAmount.value);

	if (isLoading.value || !stripeConfigured.value || amount < 1) {
		return false;
	}

	if (showNewCardForm.value) {
		return Boolean(setupClientSecret.value && cardHolderName.value.trim());
	}

	return Boolean(defaultPaymentMethod.value?.card);
});

const topUpButtonLabel = computed(() => {
	if (isLoading.value) return "Elaborazione in corso...";

	const suffix = topUpAmount.value ? ` €${Number(topUpAmount.value).toFixed(2)}` : "";

	if (showNewCardForm.value) {
		return `Salva carta e ricarica${suffix}`;
	}

	if (!defaultPaymentMethod.value?.card) {
		return "Aggiungi una carta per ricaricare";
	}

	return `Ricarica${suffix}`;
});

/* Carica il saldo del portafoglio dal server */
const fetchBalance = async () => {
	try {
		const res = await sanctum("/api/wallet/balance");
		balance.value = res;
	} catch (e) {
		balance.value = { balance: 0, commission_balance: 0 };
	} finally {
		isLoadingBalance.value = false;
	}
};

/* Carica lo storico dei movimenti dal server */
const fetchMovements = async () => {
	try {
		const res = await sanctum("/api/wallet/movements");
		movements.value = res?.data || res || [];
	} catch (e) {
		movements.value = [];
	} finally {
		isLoadingMovements.value = false;
	}
};

/* Carica la carta di pagamento predefinita dell'utente */
const fetchPaymentMethod = async () => {
	try {
		const res = await sanctum("/api/stripe/default-payment-method");
		defaultPaymentMethod.value = res;
	} catch (e) {
		defaultPaymentMethod.value = null;
	}
};

const fetchStripeAvailability = async () => {
	try {
		const config = await sanctum("/api/settings/stripe");
		const key = String(config?.publishable_key || '').trim();
		stripePublishableKey.value = isValidStripePublishableKey(key) ? key : "";
		stripeConfigured.value = Boolean(config?.configured) && isValidStripePublishableKey(key);
	} catch (e) {
		const fallbackKey = String(runtimeConfig.public.stripeKey || '').trim();
		stripePublishableKey.value = isValidStripePublishableKey(fallbackKey) ? fallbackKey : "";
		stripeConfigured.value = isValidStripePublishableKey(fallbackKey);
	}
};

/* All'apertura della pagina, carica in parallelo: saldo, movimenti e carta predefinita */
onMounted(async () => {
	await Promise.all([fetchBalance(), fetchMovements(), fetchPaymentMethod(), fetchStripeAvailability()]);
});

onBeforeUnmount(() => {
	clearNewCardForm();
});

/* Quando l'utente clicca un importo preimpostato (es. 25 EUR), lo seleziona */
const selectPreset = (amount) => {
	topUpAmount.value = amount;
};

/**
 * Esegue la ricarica del portafoglio.
 * Verifica che ci sia un importo valido e una carta, poi invia la richiesta.
 * Dopo il successo, aggiorna saldo e movimenti.
 */
const handleTopUp = async () => {
	if (!topUpAmount.value || topUpAmount.value < 1) {
		message.value = "Inserisci un importo minimo di 1,00 EUR";
		messageType.value = "error";
		clearFeedbackMessage();
		return;
	}

	if (!stripeConfigured.value) {
		message.value = "Le ricariche con carta non sono ancora attive su questo sito.";
		messageType.value = "error";
		clearFeedbackMessage();
		return;
	}

	isLoading.value = true;
	message.value = null;
	cardError.value = null;

	try {
		let paymentMethodId = defaultPaymentMethod.value?.card?.id || null;

		if (showNewCardForm.value || !paymentMethodId) {
			paymentMethodId = await saveNewCardAndGetPaymentMethodId();
		}

		if (!paymentMethodId) {
			message.value = "Aggiungi e salva una carta valida per completare la ricarica.";
			messageType.value = "error";
			clearFeedbackMessage();
			return;
		}

		const result = await sanctum("/api/wallet/top-up", {
			method: "POST",
			body: {
				amount: Number(topUpAmount.value),
				payment_method_id: paymentMethodId,
			},
		});

		if (result?.success) {
			message.value = `Ricarica di €${Number(topUpAmount.value).toFixed(2)} completata!`;
			messageType.value = "success";
			topUpAmount.value = "";
			await Promise.all([fetchBalance(), fetchMovements(), fetchPaymentMethod()]);
			clearFeedbackMessage();
		} else {
			message.value = result?.message || "Errore durante la ricarica.";
			messageType.value = "error";
			clearFeedbackMessage();
		}
	} catch (e) {
		const errorMsg = e?.response?._data?.message || e?.data?.message;
		message.value = errorMsg || "Errore imprevisto. Riprova.";
		messageType.value = "error";
		clearFeedbackMessage();
	} finally {
		isLoading.value = false;
	}
};

const formatDate = (dateStr) => {
	return new Date(dateStr).toLocaleDateString("it-IT", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

/* Restituisce il colore del testo: verde per entrate (credit), rosso per uscite (debit) */
const getMovementColor = (mov) => {
	if (mov.type === "credit") return "text-[#095866]";
	return "text-[#b42318]";
};

const getMovementSign = (mov) => {
	return mov.type === "credit" ? "+" : "-";
};

/* Sceglie l'icona giusta in base alla fonte del movimento (carta, commissione, prelievo, ecc.) */
const getMovementIcon = (mov) => {
	if (mov.source === "stripe") return mov.type === "credit" ? "mdi:credit-card-plus-outline" : "mdi:credit-card-minus-outline";
	if (mov.source === "commission") return "mdi:account-cash-outline";
	if (mov.source === "withdrawal") return "mdi:bank-transfer-out";
	if (mov.source === "wallet") return "mdi:wallet-outline";
	if (mov.source === "refund") return "mdi:cash-refund";
	return "mdi:swap-horizontal";
};

/* Traduce il nome della fonte del movimento in italiano (es. "stripe" -> "Carta") */
const getSourceLabel = (source) => {
	const labels = {
		stripe: "Carta",
		commission: "Commissione",
		withdrawal: "Prelievo",
		wallet: "Portafoglio",
		refund: "Rimborso",
	};
	return labels[source] || source || "—";
};

const getSourceColor = (source) => {
	const colors = {
		stripe: "bg-[#edf7f8] text-[#095866]",
		commission: "bg-[#fff4e8] text-[#b45309]",
		withdrawal: "bg-[#f5f7f8] text-[#4b5563]",
		wallet: "bg-[#edf7f8] text-[#095866]",
		refund: "bg-[#fef2f2] text-[#b42318]",
	};
	return colors[source] || "bg-gray-50 text-gray-600";
};

/* Controlla se l'utente e' un Partner Pro (per mostrare il saldo commissioni) */
const isPro = computed(() => user.value?.role === "Partner Pro");
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
					<div class="space-y-[12px] desktop:space-y-[14px]">
						<!-- Balance Cards Row -->
						<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[12px]">
							<!-- Main Balance -->
							<div class="rounded-[18px] border border-[#E5EDF2] bg-white p-[18px] shadow-sm desktop:p-[22px]">
								<div class="flex items-center gap-[8px] mb-[14px]">
									<div class="w-[36px] h-[36px] rounded-[50px] bg-[#edf7f8] flex items-center justify-center">
										<Icon name="mdi:wallet-outline" class="text-[20px] text-[#095866]" />
									</div>
									<p class="text-[0.75rem] uppercase tracking-[1.2px] font-medium text-[#095866]">Saldo disponibile</p>
								</div>
								<p class="text-[1.875rem] desktop:text-[2.25rem] font-bold tracking-tight leading-none text-[#252B42]">
									&euro;{{ balance ? Number(balance.balance).toFixed(2) : "0.00" }}
								</p>
								<p class="text-[0.75rem] text-[#667281] mt-[6px]">Saldo principale del wallet.</p>
							</div>

							<!-- Commission Balance (Pro users) -->
							<div v-if="isPro" class="rounded-[18px] border border-[#E5EDF2] bg-[#fbfcfd] p-[18px] shadow-sm desktop:p-[22px]">
								<div class="flex items-center gap-[8px] mb-[14px]">
									<div class="w-[36px] h-[36px] rounded-[50px] bg-[#edf7f8] flex items-center justify-center">
										<Icon name="mdi:account-cash-outline" class="text-[20px] text-[#095866]" />
									</div>
									<p class="text-[0.75rem] uppercase tracking-[1.2px] font-medium text-[#095866]">Commissioni</p>
								</div>
								<p class="text-[1.875rem] desktop:text-[2.25rem] font-bold tracking-tight leading-none text-[#252B42]">
									&euro;{{ balance ? Number(balance.commission_balance || 0).toFixed(2) : "0.00" }}
								</p>
								<NuxtLink to="/account/prelievi" class="mt-[10px] inline-flex items-center gap-[6px] rounded-[999px] border border-[#D7E6E9] bg-white px-[12px] py-[8px] text-[0.75rem] font-semibold text-[#095866] transition-colors hover:border-[#BFD8DE] hover:bg-[#f7fbfc]">
									Richiedi prelievo
									<Icon name="mdi:arrow-right" class="text-[15px]" />
								</NuxtLink>
							</div>

							<!-- Non-Pro: Quick actions -->
							<div v-else class="flex flex-col justify-between rounded-[18px] border border-[#E9EBEC] bg-white p-[18px] shadow-sm desktop:p-[22px]">
								<div>
									<h3 class="text-[0.9375rem] font-bold text-[#252B42] mb-[6px]">Azioni rapide</h3>
									<p class="text-[0.75rem] text-[#667281] leading-[1.45]">Carte e spedizioni salvate.</p>
								</div>
								<div class="mt-[14px] grid grid-cols-1 gap-[10px] tablet:grid-cols-2">
									<NuxtLink to="/account/carte" class="flex items-center gap-[8px] rounded-[14px] border border-[#E6EDF0] bg-[#FAFCFD] px-[12px] py-[12px] text-[0.8125rem] font-medium text-[#095866] hover:text-[#0b6d7d] hover:border-[#BFD8DE] transition-colors">
										<Icon name="mdi:credit-card-outline" class="text-[17px]" />
										Gestisci carte
									</NuxtLink>
									<NuxtLink to="/account/spedizioni" class="flex items-center gap-[8px] rounded-[14px] border border-[#E6EDF0] bg-[#FAFCFD] px-[12px] py-[12px] text-[0.8125rem] font-medium text-[#095866] hover:text-[#0b6d7d] hover:border-[#BFD8DE] transition-colors">
										<Icon name="mdi:truck-fast-outline" class="text-[17px]" />
										Le tue spedizioni
									</NuxtLink>
								</div>
							</div>
						</div>

						<div class="rounded-[18px] border border-[#E9EBEC] bg-white px-[16px] py-[14px] shadow-sm desktop:px-[18px] desktop:py-[16px]">
							<div class="flex flex-col gap-[8px] tablet:flex-row tablet:items-center tablet:justify-between">
								<div>
									<p class="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#095866]">Uso rapido</p>
									<p class="mt-[3px] text-[0.875rem] leading-[1.5] text-[#667281]">Usa la carta salvata o cambia metodo.</p>
								</div>
								<NuxtLink to="/account/carte" class="btn-secondary btn-compact inline-flex items-center justify-center">
									Carte e pagamenti
								</NuxtLink>
							</div>
						</div>
					</div>

					<!-- Top Up Section -->
					<div class="rounded-[18px] border border-[#E9EBEC] bg-white p-[18px] shadow-sm desktop:sticky desktop:top-[108px] desktop:p-[22px]">
					<div class="flex items-start sm:items-center gap-[10px] mb-[14px] desktop:mb-[16px]">
						<div class="w-[36px] h-[36px] rounded-[50px] bg-[#edf7f8] flex items-center justify-center">
							<Icon name="mdi:plus-circle-outline" class="text-[20px] text-[#095866]" />
					</div>
					<div>
						<h2 class="text-[1rem] font-bold text-[#252B42]">Ricarica portafoglio</h2>
						<p class="text-[0.75rem] text-[#737373]">Scegli l'importo.</p>
					</div>
				</div>

				<!-- Preset amounts -->
				<div class="grid grid-cols-2 sm:grid-cols-3 tablet:grid-cols-4 desktop:grid-cols-5 gap-[8px] mb-[14px]">
					<button
						v-for="amount in presetAmounts"
						:key="amount"
						@click="selectPreset(amount)"
						:class="[
							'py-[12px] rounded-[12px] text-[0.875rem] font-semibold transition-all cursor-pointer border-2',
							topUpAmount == amount
								? 'bg-[#095866] text-white border-[#095866] shadow-[0_2px_8px_rgba(9,88,102,0.3)]'
								: 'bg-white text-[#252B42] border-[#E9EBEC] hover:border-[#095866] hover:bg-[#f0fafb]',
						]">
						&euro;{{ amount }}
					</button>
				</div>

				<!-- Custom amount -->
				<div class="relative mb-[14px]">
					<span class="absolute left-[16px] top-1/2 -translate-y-1/2 text-[#737373] text-[1rem] font-medium">&euro;</span>
					<input
						v-model="topUpAmount"
						type="number"
						min="1"
						step="0.01"
						placeholder="Inserisci importo personalizzato"
						class="w-full pl-[38px] pr-[16px] py-[12px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[12px] text-[0.9375rem] focus:border-[#095866] focus:bg-white focus:outline-none focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] transition-all" />
				</div>

				<!-- Payment method display -->
				<div v-if="defaultPaymentMethod?.card && !showNewCardForm" class="flex flex-col sm:flex-row sm:items-center gap-[10px] mb-[14px] p-[14px] bg-[#F8F9FB] rounded-[14px] border border-[#E9EBEC]">
					<div class="w-[48px] h-[32px] bg-[#eef3f6] rounded-[6px] flex items-center justify-center text-[#095866] text-[0.6875rem] font-bold uppercase tracking-wider">
						{{ defaultPaymentMethod.card.brand?.slice(0, 4) }}
					</div>
					<div class="flex-1 min-w-0">
						<span class="text-[0.9375rem] font-medium text-[#252B42]">
							•••• {{ defaultPaymentMethod.card.last4 }}
						</span>
						<span class="text-[0.75rem] text-[#737373] ml-[8px]">
							Scad. {{ defaultPaymentMethod.card.exp_month }}/{{ defaultPaymentMethod.card.exp_year }}
						</span>
					</div>
					<div class="flex flex-row sm:flex-col items-start sm:items-end gap-[8px] sm:gap-[6px] flex-wrap">
						<NuxtLink to="/account/carte" class="text-[0.8125rem] text-[#095866] font-medium hover:underline">Cambia</NuxtLink>
						<button
							type="button"
							@click="openNewCardForm"
							class="text-[0.8125rem] text-[#095866] font-medium hover:underline cursor-pointer">
							Usa una nuova carta
						</button>
					</div>
				</div>
				<div v-else-if="showNewCardForm" class="mb-[14px] p-[14px] bg-[#F8F9FB] rounded-[16px] border border-[#E9EBEC]">
					<div class="flex items-start justify-between gap-[10px] mb-[12px]">
						<div>
							<p class="text-[0.875rem] font-semibold text-[#252B42]">Nuova carta per la ricarica</p>
							<p class="text-[0.8125rem] text-[#737373] leading-[1.5] mt-[4px]">
								La useremo per questa ricarica e la salveremo come carta predefinita per checkout e wallet.
							</p>
						</div>
						<button
							type="button"
							@click="closeNewCardForm"
							class="text-[0.8125rem] text-[#095866] font-medium hover:underline cursor-pointer whitespace-nowrap">
							{{ defaultPaymentMethod?.card ? 'Usa carta salvata' : 'Chiudi' }}
						</button>
					</div>

					<div v-if="isPreparingNewCardForm" class="flex items-center gap-[10px] rounded-[12px] bg-white px-[14px] py-[12px] border border-[#E9EBEC] text-[0.8125rem] text-[#737373]">
						<div class="w-[20px] h-[20px] border-2 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></div>
						Preparazione modulo carta in corso...
					</div>

					<div v-else class="space-y-[14px]">
						<div>
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[6px]">Titolare carta</label>
							<input
								v-model="cardHolderName"
								type="text"
								placeholder="Mario Rossi"
								class="w-full px-[14px] py-[12px] bg-white border border-[#E9EBEC] rounded-[12px] text-[0.9375rem] text-[#252B42] placeholder:text-[#a0a0a0] focus:border-[#095866] focus:outline-none transition-colors" />
						</div>

						<div>
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[6px]">Numero carta</label>
							<div id="wallet-card-number" class="stripe-field"></div>
						</div>

						<div class="grid grid-cols-1 tablet:grid-cols-[minmax(0,1fr)_132px] gap-[12px]">
							<div>
								<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[6px]">Scadenza</label>
								<div id="wallet-card-expiry" class="stripe-field"></div>
							</div>
							<div class="min-w-0 tablet:w-[132px]">
								<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[6px]">CVC</label>
								<div id="wallet-card-cvc" class="stripe-field"></div>
							</div>
						</div>

						<p v-if="cardError" class="text-red-500 text-[0.8125rem] p-[10px] bg-red-50 rounded-[12px] border border-red-200">
							{{ cardError }}
						</p>
					</div>
				</div>
				<div v-else class="mb-[14px] p-[12px] bg-amber-50/80 rounded-[12px] border border-amber-200 text-[0.8125rem]">
					<div class="flex items-center gap-[10px]">
						<Icon name="mdi:alert-circle-outline" class="text-[18px] text-amber-600" />
						<span class="text-amber-800">
							<template v-if="stripeConfigured">
								Nessuna carta salvata.
								<NuxtLink to="/account/carte" class="underline font-semibold text-amber-900">Apri carte e pagamenti</NuxtLink>
							</template>
							<template v-else>
								Le ricariche con carta non sono ancora attive su questo sito. Quando Stripe sarà configurato, qui potrai usare la tua carta salvata per ricaricare il wallet.
							</template>
						</span>
					</div>
					<div v-if="stripeConfigured" class="mt-[12px] flex flex-wrap items-center gap-[8px]">
						<button
							type="button"
							@click="openNewCardForm"
							class="inline-flex items-center gap-[6px] px-[13px] py-[8px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[50px] text-[0.75rem] font-semibold transition-colors cursor-pointer">
							<Icon name="mdi:plus" class="text-[16px]" />
							Aggiungi una carta qui
						</button>
						<NuxtLink to="/account/carte" class="text-[0.8125rem] text-amber-900 font-semibold underline">
							Gestisci carte e pagamenti
						</NuxtLink>
					</div>
				</div>

					<div class="grid grid-cols-1 desktop:grid-cols-[minmax(0,1fr)_240px] gap-[14px] items-start">
						<div class="rounded-[14px] border border-[#E9EBEC] bg-[#FAFCFD] px-[14px] py-[12px]">
							<p class="text-[0.75rem] font-semibold uppercase tracking-[0.04em] text-[#6B7280]">Ricarica pronta</p>
						<p class="mt-[4px] text-[0.9375rem] font-semibold text-[#252B42]">
							{{ topUpAmount ? `Importo selezionato: €${Number(topUpAmount || 0).toFixed(2)}` : 'Scegli un importo o inseriscilo manualmente' }}
						</p>
						<p class="mt-[4px] text-[0.75rem] text-[#737373] leading-[1.45]">
							{{ defaultPaymentMethod?.card || showNewCardForm ? 'Il pagamento userà la carta mostrata sopra.' : 'Per procedere serve una carta salvata o una nuova carta.' }}
						</p>
					</div>
				<button
					@click="handleTopUp"
					:disabled="!canSubmitTopUp"
					:class="[
						'w-full min-h-[54px] py-[13px] rounded-[14px] text-white font-semibold text-[0.9375rem] transition-all flex items-center justify-center gap-[8px]',
						!canSubmitTopUp
							? 'bg-gray-200 text-gray-400 cursor-not-allowed'
							: 'bg-[#095866] hover:bg-[#074a56] cursor-pointer shadow-[0_2px_8px_rgba(9,88,102,0.25)] hover:shadow-[0_4px_16px_rgba(9,88,102,0.3)]',
					]">
					<Icon v-if="!isLoading" name="mdi:wallet-plus-outline" class="text-[20px]" />
					<span>{{ topUpButtonLabel }}</span>
				</button>
				</div>

				<!-- Feedback message -->
				<div v-if="message" :class="['mt-[14px] p-[12px] rounded-[16px] text-[0.8125rem] font-medium flex items-center gap-[8px]', messageType === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600']">
					<Icon :name="messageType === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'" class="text-[17px] shrink-0" />
						{{ message }}
					</div>
				</div>
				</div>

				<!-- Movements History -->
				<div class="mt-[20px] rounded-[20px] border border-[#E9EBEC] bg-white p-[16px] shadow-sm desktop:mt-[24px] desktop:p-[24px]">
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-[10px] sm:gap-[14px] mb-[14px] desktop:mb-[18px]">
					<div class="flex items-center gap-[12px]">
						<div class="w-[36px] h-[36px] rounded-[50px] bg-[#edf7f8] flex items-center justify-center">
							<Icon name="mdi:history" class="text-[20px] text-[#095866]" />
						</div>
						<h2 class="text-[1rem] font-bold text-[#252B42]">Movimenti</h2>
					</div>
					<span v-if="movements?.length" class="text-[0.8125rem] text-[#737373] bg-[#F0F0F0] px-[10px] py-[4px] rounded-full">
						{{ movements.length }} {{ movements.length === 1 ? 'movimento' : 'movimenti' }}
					</span>
				</div>

				<div v-if="isLoadingMovements" class="py-[24px] flex justify-center">
					<div class="w-[30px] h-[30px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></div>
				</div>

				<div v-else-if="!movements?.length" class="text-center py-[32px]">
					<div class="w-[56px] h-[56px] mx-auto mb-[14px] rounded-full bg-[#F8F9FB] flex items-center justify-center">
						<Icon name="mdi:receipt-text-outline" class="text-[24px] text-[#C8CCD0]" />
					</div>
					<p class="text-[0.9375rem] font-medium text-[#252B42]">Nessun movimento</p>
					<p class="text-[0.8125rem] text-[#737373] mt-[6px]">I movimenti appariranno qui dopo la prima ricarica.</p>
				</div>

				<ul v-else class="space-y-[8px]">
					<li v-for="mov in movements" :key="mov.id" class="flex flex-col sm:flex-row sm:items-center gap-[10px] sm:gap-[12px] p-[12px] rounded-[14px] border border-[#EEF1F3] hover:bg-[#F8F9FB] transition-colors">
						<div :class="['w-[38px] h-[38px] rounded-[50px] flex items-center justify-center shrink-0', mov.type === 'credit' ? 'bg-[#edf7f8]' : 'bg-[#fef2f2]']">
							<Icon :name="getMovementIcon(mov)" :class="['text-[18px]', mov.type === 'credit' ? 'text-[#095866]' : 'text-[#b42318]']" />
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-[0.875rem] font-medium text-[#252B42] truncate">{{ mov.description }}</p>
							<div class="flex items-center gap-[8px] mt-[4px]">
								<span class="text-[0.75rem] text-[#737373]">{{ formatDate(mov.created_at) }}</span>
								<span :class="['text-[0.6875rem] px-[8px] py-[2px] rounded-full font-medium', getSourceColor(mov.source)]">{{ getSourceLabel(mov.source) }}</span>
							</div>
						</div>
						<span :class="['text-[0.9375rem] font-bold tabular-nums whitespace-nowrap self-start sm:self-auto', getMovementColor(mov)]">
							{{ getMovementSign(mov) }}&euro;{{ Number(mov.amount).toFixed(2) }}
						</span>
					</li>
				</ul>
			</div>
		</div>
	</section>
</template>

<style scoped>
.stripe-field {
	background-color: #ffffff;
	padding: 12px 16px;
	border: 1px solid #e9ebec;
	border-radius: 12px;
	width: 100%;
	transition: border-color 0.2s;
}

.stripe-field:focus-within {
	border-color: #095866;
}
</style>
