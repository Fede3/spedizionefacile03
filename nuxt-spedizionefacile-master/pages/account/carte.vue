<!--
  FILE: pages/account/carte.vue
  SCOPO: Gestione carte Stripe — lista, aggiungi, predefinita, elimina. Config admin chiavi Stripe.

  API: GET /api/stripe/payment-methods (lista carte), POST /api/stripe/create-setup-intent (setup carta),
       POST /api/stripe/set-default-payment-method (salva nuova carta come predefinita),
       POST /api/stripe/change-default-payment-method (cambia predefinita),
       DELETE /api/stripe/delete-card (elimina carta), GET/POST /api/settings/stripe (config chiavi).
  COMPONENTI: nessuno di esterno (usa Icon di Nuxt UI, Stripe Elements montati manualmente).
  ROUTE: /account/carte (middleware sanctum:auth).

  DATI IN INGRESSO: nessuno (carica carte dell'utente autenticato).
  DATI IN USCITA: carta salvata/eliminata/impostata come predefinita.

  VINCOLI: Stripe.js viene caricato dinamicamente (import asincrono).
           Se Stripe non e' configurato (mancano le chiavi API), il form non si apre.
           I dati carta NON vengono mai salvati sul server — solo il token Stripe.
  ERRORI TIPICI: non chiamare refreshIdentity() dopo aver aggiunto una carta (il customer_id potrebbe cambiare).
  PUNTI DI MODIFICA SICURI: stili campi Stripe (style object), layout lista carte.
  COLLEGAMENTI: pages/account/portafoglio.vue, pages/checkout.vue, controllers/StripeController.php.
-->
<script setup>
// Ottimizzazione bundle: import dinamico di Stripe (non incluso nel chunk principale)
// loadStripe viene importato solo quando serve, non al caricamento della pagina

// Preconnect to Stripe only on this page (not globally, to save connections on other pages)
// Aggiunto anche api.stripe.com per velocizzare le chiamate API post-caricamento
useHead({ link: [
	{ rel: 'preconnect', href: 'https://js.stripe.com', crossorigin: '' },
	{ rel: 'preconnect', href: 'https://api.stripe.com', crossorigin: '' },
] });

/* Richiede che l'utente sia autenticato */
definePageMeta({
	middleware: ["sanctum:auth"],
});

/* refreshIdentity ricarica i dati utente dopo modifiche ai pagamenti */
const { refreshIdentity } = useSanctumAuth();
const runtimeConfig = useRuntimeConfig();
const client = useSanctumClient();

/* ===== CONFIGURAZIONE STRIPE ===== */
/* Indica se Stripe e' configurato con le chiavi API */
const stripeConfigured = ref(false);
/* Chiave pubblica di Stripe (serve per il form carta lato browser) */
const stripePublishableKey = ref("");
/* Indica se stiamo ancora caricando la configurazione */
const configLoading = ref(true);
/* Mostra/nasconde il form per inserire le chiavi Stripe */
const showConfigForm = ref(false);
/* Campi del form configurazione Stripe */
const configPublishableKey = ref("");
const configSecretKey = ref("");
/* Errore durante il salvataggio configurazione */
const configError = ref(null);
/* Indica se il salvataggio configurazione e' in corso */
const configSaving = ref(false);

const isValidStripePublishableKey = (value) => {
	const key = String(value || "").trim();
	return key.startsWith("pk_") && !key.includes("placeholder");
};

// Fetch Stripe config dal backend
try {
	const config = await client("/api/settings/stripe");
	const key = String(config?.publishable_key || "").trim();
	stripePublishableKey.value = key;
	stripeConfigured.value = Boolean(config?.configured) && isValidStripePublishableKey(key);
} catch (e) {
	// Fallback a runtime config SOLO se non e' placeholder
	const fallbackKey = String(runtimeConfig.public.stripeKey || "").trim();
	stripePublishableKey.value = isValidStripePublishableKey(fallbackKey) ? fallbackKey : "";
	stripeConfigured.value = isValidStripePublishableKey(fallbackKey);
}
configLoading.value = false;

// Load Stripe.js con la chiave corretta (import dinamico per ridurre il bundle iniziale)
let stripe = null;
if (isValidStripePublishableKey(stripePublishableKey.value)) {
	try {
		const { loadStripe } = await import('@stripe/stripe-js');
		stripe = await loadStripe(stripePublishableKey.value);
	} catch (e) {
		console.error("Stripe.js non caricato:", e);
	}
}

/* Salva le chiavi API Stripe nel server e ricarica Stripe con la nuova chiave */
const saveStripeConfig = async () => {
	configError.value = null;
	configSaving.value = true;

	try {
		const res = await client("/api/settings/stripe", {
			method: "POST",
			body: {
				publishable_key: configPublishableKey.value,
				secret_key: configSecretKey.value,
			},
		});

		if (res?.success) {
			stripeConfigured.value = true;
			stripePublishableKey.value = String(configPublishableKey.value || "").trim();
			showConfigForm.value = false;

			// Ricarica Stripe con la nuova chiave (import dinamico)
			if (isValidStripePublishableKey(stripePublishableKey.value)) {
				try {
					const { loadStripe } = await import('@stripe/stripe-js');
					stripe = await loadStripe(stripePublishableKey.value);
				} catch (e) {
					console.error("Stripe.js non caricato:", e);
				}
			} else {
				stripe = null;
				stripeConfigured.value = false;
			}

			textMessage.value = "Stripe configurato con successo!";
			textMessageType.value = "success";
			setTimeout(() => { textMessage.value = ""; }, 3000);
		}
	} catch (err) {
		const msg = err?.data?.message || err?.data?.errors?.publishable_key?.[0] || err?.data?.errors?.secret_key?.[0] || "Errore durante il salvataggio.";
		configError.value = msg;
	} finally {
		configSaving.value = false;
	}
};

/* ===== GESTIONE CARTE DI CREDITO ===== */
/* Riferimenti agli elementi Stripe (numero carta, scadenza, CVC) montati nel form */
const cardNumber = ref(null);
const cardExpiry = ref(null);
const cardCvc = ref(null);
/* Segreto del client per confermare il salvataggio carta con Stripe */
const clientSecret = ref(null);
/* Oggetto Stripe Elements per creare i campi del form carta */
const elements = ref(null);

/* Messaggio di errore specifico del form carta */
const errorMessage = ref(null);
/* Nome del titolare della carta */
const cardHolderName = ref("");
/* Mostra/nasconde il form per aggiungere una nuova carta */
const showFormPayments = ref(false);
/* Messaggio globale di feedback (successo, errore, info) */
const textMessage = ref("");
const textMessageType = ref("info");
/* ID della carta per cui si sta confermando l'eliminazione */
const deleteConfirmId = ref(null);

/* Carica la lista delle carte salvate dell'utente */
// lazy: true — la lista carte puo' caricarsi dopo il render iniziale della pagina
const { data: payments, status, refresh } = useSanctumFetch("/api/stripe/payment-methods", { lazy: true });

/**
 * Mappa gli errori Stripe in messaggi user-friendly in italiano
 */
const getStripeErrorMessage = (error) => {
	const errorMap = {
		'card_declined': 'Carta rifiutata. Contatta la tua banca o prova con un\'altra carta.',
		'expired_card': 'Carta scaduta. Verifica la data di scadenza.',
		'incorrect_cvc': 'Codice CVC non corretto. Verifica il codice di sicurezza.',
		'processing_error': 'Errore durante l\'elaborazione. Riprova tra qualche minuto.',
		'incorrect_number': 'Numero carta non valido. Verifica il numero inserito.',
		'invalid_number': 'Numero carta non valido. Verifica il numero inserito.',
		'invalid_expiry_month': 'Mese di scadenza non valido.',
		'invalid_expiry_year': 'Anno di scadenza non valido.',
		'invalid_cvc': 'Codice CVC non valido.',
		'incomplete_number': 'Numero carta incompleto.',
		'incomplete_expiry': 'Data di scadenza incompleta.',
		'incomplete_cvc': 'Codice CVC incompleto.',
		'insufficient_funds': 'Fondi insufficienti sulla carta.',
		'lost_card': 'Carta segnalata come smarrita. Contatta la tua banca.',
		'stolen_card': 'Carta segnalata come rubata. Contatta la tua banca.',
	};

	return errorMap[error.code] || error.message || 'Errore durante il salvataggio della carta. Riprova.';
};

/**
 * Aggiunge una nuova carta di credito.
 * 1. Conferma il setup con Stripe (lato browser)
 * 2. Imposta la carta come predefinita sul server
 * 3. Ricarica la lista carte
 */
const handleAddCard = async () => {
	if (!clientSecret.value) {
		errorMessage.value = "Impossibile procedere. Riprova.";
		return;
	}

	textMessage.value = "Salvataggio carta in corso...";
	textMessageType.value = "info";
	errorMessage.value = null;

	try {
		if (!stripe) {
			errorMessage.value = "Stripe non disponibile. Ricarica la pagina.";
			return;
		}

		const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret.value, {
			payment_method: {
				card: cardNumber.value,
				billing_details: {
					name: cardHolderName.value,
				},
			},
		});

		if (error) {
			errorMessage.value = getStripeErrorMessage(error);
			textMessage.value = null;
			return;
		}

		if (!setupIntent?.payment_method) {
			errorMessage.value = "Metodo di pagamento non trovato. Riprova.";
			return;
		}

		const serverResponse = await client("/api/stripe/set-default-payment-method", {
			method: "POST",
			body: { payment_method: setupIntent.payment_method },
		});

		if (serverResponse?.error) {
			errorMessage.value = serverResponse.error || "Errore server. Riprova.";
			return;
		}

		await refresh();
		await refreshIdentity();

		textMessage.value = "Carta aggiunta con successo!";
		textMessageType.value = "success";
		showFormPayments.value = false;

		setTimeout(() => {
			textMessage.value = "";
		}, 3000);
	} catch (err) {
		errorMessage.value = "Errore imprevisto. Riprova.";
	}
};

/* Imposta una carta come predefinita per i pagamenti futuri */
const setDefault = async (pmId) => {
	textMessage.value = "Impostazione carta predefinita...";
	textMessageType.value = "info";

	try {
		const data = await client("/api/stripe/change-default-payment-method", {
			method: "POST",
			body: { payment_method_id: pmId },
		});
		if (data?.success) {
			textMessage.value = "Carta predefinita aggiornata.";
			textMessageType.value = "success";
			await refresh();
			setTimeout(() => {
				textMessage.value = "";
			}, 3000);
		}
	} catch (e) {
		textMessage.value = "Errore durante la modifica.";
		textMessageType.value = "error";
	}
};

/* Elimina una carta salvata dopo conferma dell'utente */
const deleteCard = async (pmId) => {
	textMessage.value = "Eliminazione in corso...";
	textMessageType.value = "info";

	try {
		const data = await client("/api/stripe/delete-card", {
			method: "DELETE",
			body: { payment_method_id: pmId },
		});

		if (data?.success) {
			await refresh();
			deleteConfirmId.value = null;
			textMessage.value = "Carta eliminata.";
			textMessageType.value = "success";
			setTimeout(() => {
				textMessage.value = "";
			}, 3000);
		}
	} catch (error) {
		textMessage.value = "Errore durante l'eliminazione.";
		textMessageType.value = "error";
	}
};

/**
 * Apre o chiude il form per aggiungere una carta.
 * Quando apre: crea un SetupIntent su Stripe e monta i campi del form.
 * Quando chiude: smonta i campi e pulisce lo stato.
 */
const togglePaymentForm = async () => {
	if (showFormPayments.value) {
		cardHolderName.value = "";
		cardNumber.value?.unmount();
		cardExpiry.value?.unmount();
		cardCvc.value?.unmount();
		cardNumber.value = null;
		cardExpiry.value = null;
		cardCvc.value = null;
		clientSecret.value = null;
		showFormPayments.value = false;
		elements.value = null;
		errorMessage.value = null;
	} else {
		clientSecret.value = null;
		errorMessage.value = null;

		if (!stripe) {
			errorMessage.value = "Stripe non disponibile. Ricarica la pagina o configura le chiavi API.";
			textMessage.value = errorMessage.value;
			textMessageType.value = "error";
			return;
		}

		try {
			const response = await client("/api/stripe/create-setup-intent", {
				method: "POST",
			});

			if (!response?.client_secret) {
				errorMessage.value = response?.error || "Impossibile inizializzare il modulo di pagamento. Riprova.";
				textMessage.value = errorMessage.value;
				textMessageType.value = "error";
				return;
			}

			clientSecret.value = response.client_secret;
			showFormPayments.value = true;

			await nextTick();

			elements.value = stripe.elements();

			const style = {
				base: {
					color: "#252B42",
					fontFamily: "Inter, system-ui, sans-serif",
					fontSize: "15px",
					fontWeight: "400",
					"::placeholder": { color: "#a0a0a0" },
				},
				invalid: { color: "#dc2626" },
			};

			cardNumber.value = elements.value.create("cardNumber", { style, placeholder: "1234 5678 9012 3456" });
			cardNumber.value.mount("#card-number");

			cardExpiry.value = elements.value.create("cardExpiry", { style });
			cardExpiry.value.mount("#card-expiry");

			cardCvc.value = elements.value.create("cardCvc", { style, placeholder: "123" });
			cardCvc.value.mount("#card-cvc");
		} catch (err) {
			const msg = err?.data?.error || err?.data?.message || err?.message || "Errore di connessione al sistema di pagamento.";
			errorMessage.value = msg;
			textMessage.value = msg;
			textMessageType.value = "error";
		}
	}
};

/* Restituisce il nome leggibile del circuito carta (Visa, Mastercard, ecc.) */
const getBrandIcon = (brand) => {
	const brands = {
		visa: "Visa",
		mastercard: "Mastercard",
		amex: "Amex",
		discover: "Discover",
	};
	return brands[brand?.toLowerCase()] || brand || "Carta";
};
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[80px]">
		<div class="my-container">
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866]">Il tuo account</NuxtLink>
				<span class="mx-[6px]">/</span>
				<span v-if="!showFormPayments && !showConfigForm" class="font-semibold text-[#252B42]">Carte e pagamenti</span>
				<template v-else-if="showConfigForm">
					<NuxtLink class="hover:underline text-[#095866] cursor-pointer" @click.prevent="showConfigForm = false">Carte e pagamenti</NuxtLink>
					<span class="mx-[6px]">/</span>
					<span class="font-semibold text-[#252B42]">Configurazione Stripe</span>
				</template>
				<template v-else>
					<NuxtLink class="hover:underline text-[#095866] cursor-pointer" @click.prevent="togglePaymentForm">Carte e pagamenti</NuxtLink>
					<span class="mx-[6px]">/</span>
					<span class="font-semibold text-[#252B42]">Aggiungi carta</span>
				</template>
			</div>

			<!-- Global feedback message -->
			<div
				v-if="textMessage"
				:class="[
					'mb-[20px] px-[16px] py-[12px] rounded-[50px] text-[0.875rem] font-medium transition-all',
					textMessageType === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : textMessageType === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200',
				]">
				{{ textMessage }}
			</div>

			<!-- ===== STRIPE NOT CONFIGURED BANNER ===== -->
			<div v-if="!stripeConfigured && !showConfigForm && !configLoading" class="mb-[24px] p-[20px] bg-amber-50 border border-amber-200 rounded-[12px]">
				<div class="flex items-start gap-[14px]">
					<div class="w-[44px] h-[44px] rounded-[50px] bg-amber-100 flex items-center justify-center shrink-0">
						<Icon name="mdi:alert-outline" class="text-[24px] text-amber-600" />
					</div>
					<div class="flex-1">
						<h3 class="text-[0.9375rem] font-bold text-[#252B42] mb-[4px]">Stripe non configurato</h3>
						<p class="text-[0.8125rem] text-[#737373] leading-[1.5] mb-[12px]">
							Per aggiungere carte di pagamento devi prima configurare le chiavi API di Stripe.
							Le trovi nella tua <a href="https://dashboard.stripe.com/apikeys" target="_blank" class="text-[#095866] underline">dashboard Stripe</a>.
						</p>
						<button
							@click="showConfigForm = true"
							class="inline-flex items-center gap-[6px] px-[18px] py-[10px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[8px] text-[0.8125rem] font-semibold transition-colors cursor-pointer">
							<Icon name="mdi:cog-outline" class="text-[16px]" />
							Configura Stripe
						</button>
					</div>
				</div>
			</div>

			<!-- ===== STRIPE CONFIG FORM ===== -->
			<template v-if="showConfigForm">
				<h1 class="text-[1.5rem] desktop:text-[1.75rem] font-bold text-[#252B42] mb-[24px]">Configurazione Stripe</h1>

				<div class="bg-white rounded-[16px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC] max-w-[540px] mx-auto">
					<p class="text-[0.875rem] text-[#737373] leading-[1.6] mb-[24px]">
						Inserisci le chiavi API dal tuo account Stripe. Le trovi in
						<a href="https://dashboard.stripe.com/apikeys" target="_blank" class="text-[#095866] underline font-medium">Dashboard &rarr; Developers &rarr; API keys</a>.
					</p>

					<div class="mb-[20px]">
						<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[6px]">Publishable Key</label>
						<input
							type="text"
							v-model="configPublishableKey"
							class="w-full px-[14px] py-[12px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] text-[#252B42] placeholder:text-[#a0a0a0] focus:border-[#095866] focus:outline-none transition-colors font-mono"
							placeholder="pk_test_..." />
					</div>

					<div class="mb-[24px]">
						<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[6px]">Secret Key</label>
						<input
							type="password"
							v-model="configSecretKey"
							class="w-full px-[14px] py-[12px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] text-[#252B42] placeholder:text-[#a0a0a0] focus:border-[#095866] focus:outline-none transition-colors font-mono"
							placeholder="sk_test_..." />
					</div>

					<p v-if="configError" class="text-red-500 text-[0.8125rem] mb-[16px] p-[10px] bg-red-50 rounded-[8px] border border-red-200">
						{{ configError }}
					</p>

					<div class="flex gap-[12px]">
						<button
							@click="showConfigForm = false"
							class="flex-1 inline-flex items-center justify-center gap-[6px] py-[14px] rounded-[50px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] font-semibold text-[0.9375rem] transition-colors cursor-pointer">
							<Icon name="mdi:close" class="text-[18px]" />
							Annulla
						</button>
						<button
							@click="saveStripeConfig"
							:disabled="configSaving || !configPublishableKey || !configSecretKey"
							class="flex-1 inline-flex items-center justify-center gap-[6px] py-[14px] rounded-[50px] bg-[#095866] hover:bg-[#074a56] text-white font-semibold text-[0.9375rem] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
							<Icon name="mdi:content-save" class="text-[18px]" />
							{{ configSaving ? 'Salvataggio...' : 'Salva configurazione' }}
						</button>
					</div>

					<div class="mt-[16px] flex items-center justify-center gap-[6px] text-[0.75rem] text-[#a0a0a0]">
						<Icon name="mdi:lock-outline" class="text-[14px]" />
						<span>Le chiavi vengono salvate in modo sicuro nel server</span>
					</div>
				</div>
			</template>

			<!-- ===== CARD LIST VIEW ===== -->
			<template v-if="!showFormPayments && !showConfigForm">
				<div class="flex items-center justify-between mb-[24px]">
					<h1 class="text-[1.5rem] desktop:text-[1.75rem] font-bold text-[#252B42]">Carte e pagamenti</h1>
					<div class="flex items-center gap-[10px]">
						<button
							type="button"
							@click="showConfigForm = true"
							class="px-[16px] py-[10px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] rounded-[50px] text-[0.8125rem] font-medium transition-colors cursor-pointer"
							title="Configura chiavi API Stripe">
							<Icon name="mdi:cog-outline" class="text-[16px] align-middle mr-[4px]" />
							Stripe
						</button>
						<button
							type="button"
							@click="togglePaymentForm"
							:disabled="!stripeConfigured"
							class="inline-flex items-center gap-[6px] px-[20px] py-[10px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[50px] text-[0.875rem] font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
							<Icon name="mdi:plus" class="text-[18px]" />
							Aggiungi carta
						</button>
					</div>
				</div>
				<p v-if="!stripeConfigured" class="text-red-500 text-[0.875rem] mt-[8px]">
					Stripe non configurato. Contatta l'amministratore per abilitare i pagamenti.
				</p>

				<!-- Loading skeleton -->
				<div v-if="status === 'pending'">
					<div v-for="n in 2" :key="n" class="bg-white rounded-[12px] p-[20px] border border-[#E9EBEC] mb-[12px]">
						<div class="flex animate-pulse items-center gap-[16px]">
							<div class="w-[52px] h-[34px] rounded-[6px] bg-gray-200"></div>
							<div class="flex-1 space-y-[8px]">
								<div class="h-[14px] rounded bg-gray-200 w-[40%]"></div>
								<div class="h-[12px] rounded bg-gray-200 w-[25%]"></div>
							</div>
						</div>
					</div>
				</div>

				<!-- Cards loaded -->
				<template v-else-if="payments && payments.data">
					<!-- Empty state -->
					<div v-if="payments.data.length === 0" class="bg-white rounded-[16px] p-[48px] shadow-sm border border-[#E9EBEC] text-center">
						<!-- Icona carte vuote con MDI -->
						<div class="w-[72px] h-[72px] mx-auto mb-[20px] bg-[#F8F9FB] rounded-full flex items-center justify-center">
							<Icon name="mdi:credit-card-outline" class="text-[32px] text-[#C8CCD0]" />
						</div>
						<h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[10px]">Nessuna carta salvata</h2>
						<p class="text-[#737373] text-[0.9375rem] max-w-[400px] mx-auto mb-[24px] leading-[1.6]">Aggiungi una carta di pagamento per velocizzare le tue spedizioni e ricaricare il portafoglio.</p>
						<button @click="stripeConfigured ? togglePaymentForm() : (showConfigForm = true)" class="px-[24px] py-[12px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[50px] font-semibold text-[0.9375rem] transition-colors cursor-pointer">
							{{ stripeConfigured ? 'Aggiungi la tua prima carta' : 'Configura Stripe' }}
						</button>
					</div>

					<!-- Card items -->
					<div v-else class="space-y-[12px]">
						<div
							v-for="(payment, index) in payments.data"
							:key="index"
							:class="[
								'bg-white rounded-[12px] p-[20px] border transition-all',
								payment.default ? 'border-[#095866] shadow-sm' : 'border-[#E9EBEC] hover:border-[#D0D0D0]',
							]">
							<div class="flex items-center gap-[16px]">
								<!-- Card brand icon -->
								<div
									:class="[
										'w-[52px] h-[34px] rounded-[6px] flex items-center justify-center text-[0.6875rem] font-bold uppercase shrink-0',
										payment.default ? 'bg-[#095866] text-white' : 'bg-[#F0F0F0] text-[#404040]',
									]">
									{{ getBrandIcon(payment.brand)?.slice(0, 4) }}
								</div>

								<!-- Card info -->
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-[8px]">
										<span class="text-[0.9375rem] font-semibold text-[#252B42]">
											{{ getBrandIcon(payment.brand) }} **** {{ payment.last4 }}
										</span>
										<span v-if="payment.default" class="inline-block px-[8px] py-[2px] rounded-full text-[0.6875rem] font-medium bg-[#095866]/10 text-[#095866]">
											Predefinita
										</span>
									</div>
									<div class="flex items-center gap-[12px] mt-[4px]">
										<span class="text-[0.8125rem] text-[#737373]">
											{{ payment.holder_name }}
										</span>
										<span class="text-[0.75rem] text-[#a0a0a0]">
											Scad. {{ payment.exp_month }}/{{ payment.exp_year }}
										</span>
									</div>
								</div>

								<!-- Actions -->
								<div class="flex items-center gap-[8px] shrink-0">
									<button
										v-if="!payment.default"
										@click="setDefault(payment.id)"
										class="inline-flex items-center gap-[4px] text-[0.8125rem] text-[#095866] hover:underline cursor-pointer font-medium">
										<Icon name="mdi:check-circle-outline" class="text-[14px]" />
										Imposta predefinita
									</button>

									<template v-if="deleteConfirmId !== payment.id">
										<button
											@click="deleteConfirmId = payment.id"
											class="inline-flex items-center gap-[4px] text-[0.8125rem] text-red-400 hover:text-red-600 cursor-pointer ml-[4px]">
											<Icon name="mdi:delete-outline" class="text-[14px]" />
											Elimina
										</button>
									</template>
									<template v-else>
										<div class="flex items-center gap-[6px]">
											<button
												@click="deleteCard(payment.id)"
												class="inline-flex items-center gap-[4px] px-[12px] py-[6px] bg-red-600 hover:bg-red-700 text-white rounded-[6px] text-[0.75rem] font-medium cursor-pointer">
												<Icon name="mdi:check" class="text-[14px]" />
												Conferma
											</button>
											<button
												@click="deleteConfirmId = null"
												class="inline-flex items-center gap-[4px] px-[12px] py-[6px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] rounded-[6px] text-[0.75rem] font-medium cursor-pointer">
												<Icon name="mdi:close" class="text-[14px]" />
												Annulla
											</button>
										</div>
									</template>
								</div>
							</div>
						</div>
					</div>
				</template>

				<!-- Security note -->
				<!-- Nota sicurezza con icona MDI -->
				<div class="mt-[24px] flex items-start gap-[10px] p-[14px] bg-[#F8F9FB] rounded-[50px]">
					<Icon name="mdi:lock-outline" class="text-[18px] text-[#737373] shrink-0 mt-[1px]" />
					<p class="text-[0.8125rem] text-[#737373] leading-[1.5]">
						I dati delle carte sono gestiti in modo sicuro da Stripe. Non conserviamo mai i numeri completi delle tue carte.
					</p>
				</div>
			</template>

			<!-- ===== ADD CARD FORM ===== -->
			<template v-if="showFormPayments">
				<h1 class="text-[1.5rem] desktop:text-[1.75rem] font-bold text-[#252B42] mb-[24px]">Aggiungi carta</h1>

				<div class="bg-white rounded-[16px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC] max-w-[480px] mx-auto">
					<div class="mb-[20px]">
						<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[6px]">Numero carta</label>
						<div class="stripe-field" id="card-number"></div>
					</div>

					<div class="mb-[20px]">
						<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[6px]">Titolare carta</label>
						<input
							type="text"
							v-model="cardHolderName"
							class="w-full px-[14px] py-[12px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.9375rem] text-[#252B42] placeholder:text-[#a0a0a0] focus:border-[#095866] focus:outline-none transition-colors"
							placeholder="Mario Rossi"
							required />
					</div>

					<div class="flex gap-[12px] mb-[24px]">
						<div class="flex-1">
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[6px]">Scadenza</label>
							<div class="stripe-field" id="card-expiry"></div>
						</div>
						<div class="w-[120px]">
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[6px]">CVC</label>
							<div class="stripe-field" id="card-cvc"></div>
						</div>
					</div>

					<p v-if="errorMessage" class="text-red-500 text-[0.8125rem] mb-[16px] p-[10px] bg-red-50 rounded-[8px] border border-red-200">
						{{ errorMessage }}
					</p>

					<div class="flex gap-[12px]">
						<button
							@click.prevent="togglePaymentForm"
							class="flex-1 inline-flex items-center justify-center gap-[6px] py-[14px] rounded-[50px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] font-semibold text-[0.9375rem] transition-colors cursor-pointer">
							<Icon name="mdi:close" class="text-[18px]" />
							Annulla
						</button>
						<button
							@click="handleAddCard"
							class="flex-1 inline-flex items-center justify-center gap-[6px] py-[14px] rounded-[50px] bg-[#095866] hover:bg-[#074a56] text-white font-semibold text-[0.9375rem] transition-colors cursor-pointer">
							<Icon name="mdi:content-save" class="text-[18px]" />
							Salva carta
						</button>
					</div>

					<div class="mt-[16px] flex items-center justify-center gap-[6px] text-[0.75rem] text-[#a0a0a0]">
						<Icon name="mdi:lock-outline" class="text-[14px]" />
						<span>Connessione sicura SSL</span>
					</div>
				</div>
			</template>
		</div>
	</section>
</template>

<style scoped>
.stripe-field {
	background-color: #f8f9fb;
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
