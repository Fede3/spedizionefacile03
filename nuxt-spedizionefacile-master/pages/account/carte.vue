<!--
  FILE: pages/account/carte.vue
  SCOPO: Gestione carte Stripe — lista, aggiungi, predefinita, elimina.
         La configurazione globale Stripe vive nel pannello admin.

  API: GET /api/stripe/payment-methods (lista carte), POST /api/stripe/create-setup-intent (setup carta),
       POST /api/stripe/set-default-payment-method (salva nuova carta come predefinita),
       POST /api/stripe/change-default-payment-method (cambia predefinita),
       DELETE /api/stripe/delete-card (elimina carta), GET /api/settings/stripe (stato configurazione).
  COMPONENTI: nessuno di esterno (usa Icon di Nuxt UI, Stripe Elements montati manualmente).
  ROUTE: /account/carte (middleware app-auth).

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
	middleware: ["app-auth"],
});

/* refreshIdentity ricarica i dati utente dopo modifiche ai pagamenti */
const { refreshIdentity, user } = useSanctumAuth();
const runtimeConfig = useRuntimeConfig();
const client = useSanctumClient();
const isAdmin = computed(() => user.value?.role === "Admin");

/* ===== CONFIGURAZIONE STRIPE ===== */
/* Indica se Stripe e' configurato con le chiavi API */
const stripeConfigured = ref(false);
/* Chiave pubblica di Stripe (serve per il form carta lato browser) */
const stripePublishableKey = ref("");
/* Indica se stiamo ancora caricando la configurazione */
const configLoading = ref(true);
const isValidStripePublishableKey = (value) => {
	const key = String(value || "").trim();
	return key.startsWith("pk_") && !key.includes("placeholder");
};
const cardsFeatureAvailable = computed(() => stripeConfigured.value);

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

const openAdminStripeSettings = () => navigateTo("/account/amministrazione/impostazioni");

// Load Stripe.js con la chiave corretta (import dinamico per ridurre il bundle iniziale)
let stripe = null;
if (isValidStripePublishableKey(stripePublishableKey.value)) {
	try {
		const { loadStripe } = await import('@stripe/stripe-js');
		stripe = await loadStripe(stripePublishableKey.value);
	} catch (e) {
	}
}

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
					fontFamily: '"Inter", sans-serif',
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
	<section class="min-h-[600px] py-[32px] desktop:py-[72px]">
		<div class="my-container">
				<AccountPageHeader
					:title="showFormPayments ? 'Aggiungi carta' : 'Carte e pagamenti'"
					description="Carte e pagamenti salvati."
				:crumbs="showFormPayments
					? [
						{ label: 'Account', to: '/account' },
						{ label: 'Carte e pagamenti', to: '/account/carte' },
						{ label: 'Aggiungi carta' },
					]
					: [
						{ label: 'Account', to: '/account' },
						{ label: 'Carte e pagamenti' },
					]"
				>
					<template v-if="!showFormPayments" #actions>
					<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-[8px]">
						<button
							v-if="isAdmin"
							type="button"
							@click="openAdminStripeSettings"
							class="btn-tertiary w-full sm:w-auto px-[14px] py-[9px] text-[0.75rem] font-medium cursor-pointer"
							title="Gestisci la configurazione globale di Stripe">
							<Icon name="mdi:cog-outline" class="text-[15px] align-middle mr-[4px]" />
							Impostazioni Stripe
						</button>
						<button
							v-if="cardsFeatureAvailable"
							type="button"
							@click="togglePaymentForm"
							class="btn-cta sf-nav-button w-full sm:w-auto inline-flex items-center justify-center gap-[6px] px-[18px] py-[9px] text-[0.8125rem] font-semibold">
							<Icon name="mdi:plus" class="text-[17px]" />
							Aggiungi carta
						</button>
					</div>
					</template>
				</AccountPageHeader>

				<div v-if="!showFormPayments" class="mb-[16px] rounded-[18px] border border-[#E9EBEC] bg-white px-[16px] py-[14px] shadow-sm desktop:px-[18px]">
					<div class="flex flex-col gap-[10px] tablet:flex-row tablet:items-center tablet:justify-between">
						<div>
							<p class="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#095866]">Metodi salvati</p>
							<p class="mt-[3px] text-[0.875rem] leading-[1.5] text-[#667281]">
								{{ payments?.data?.length ? `${payments.data.length} carte salvate.` : 'Carte pronte per checkout e wallet.' }}
							</p>
						</div>
						<NuxtLink to="/account/portafoglio" class="btn-secondary sf-nav-button inline-flex min-h-[42px] items-center justify-center px-[14px] py-[8px] text-[0.8125rem] font-semibold">
							Apri portafoglio
						</NuxtLink>
					</div>
				</div>

				<!-- Global feedback message -->
				<div
				v-if="textMessage"
				:class="[
				'mb-[16px] px-[14px] py-[10px] rounded-[14px] text-[0.8125rem] font-medium transition-all',
					textMessageType === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : textMessageType === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200',
				]">
				{{ textMessage }}
			</div>

			<!-- ===== STRIPE NOT CONFIGURED BANNER ===== -->
			<div v-if="!stripeConfigured && !configLoading && !showFormPayments" class="mb-[20px] p-[16px] bg-amber-50 border border-amber-200 rounded-[16px]">
				<div class="flex items-start gap-[12px]">
						<div class="w-[40px] h-[40px] rounded-[50px] bg-amber-100 flex items-center justify-center shrink-0">
						<Icon name="mdi:alert-outline" class="text-[20px] text-amber-600" />
					</div>
					<div class="flex-1">
						<h3 class="text-[0.875rem] font-bold text-[#252B42] mb-[4px]">Stripe non configurato</h3>
						<p class="text-[0.75rem] text-[#737373] leading-[1.5] mb-[10px]">
							<span v-if="isAdmin">
								Per abilitare carte, checkout e ricariche wallet configura Stripe dal pannello amministrazione.
							</span>
							<span v-else>
								I pagamenti con carta non sono ancora attivi su questo sito. Quando Stripe sarà configurato dall'amministratore potrai aggiungere qui le tue carte, usarle al checkout e ricaricare il wallet.
							</span>
						</p>
						<button
							v-if="isAdmin"
							@click="openAdminStripeSettings"
							class="inline-flex items-center gap-[6px] px-[16px] py-[9px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[10px] text-[0.75rem] font-semibold transition-colors cursor-pointer">
							<Icon name="mdi:cog-outline" class="text-[15px]" />
							Vai alle impostazioni admin
						</button>
					</div>
				</div>
			</div>

				<!-- ===== CARD LIST VIEW ===== -->
				<template v-if="!showFormPayments">
					<!-- Loading skeleton -->
					<div v-if="status === 'pending'">
					<div v-for="n in 2" :key="n" class="bg-white rounded-[14px] p-[16px] border border-[#E9EBEC] mb-[10px]">
						<div class="flex animate-pulse items-center gap-[12px]">
							<div class="w-[48px] h-[32px] rounded-[6px] bg-gray-200"></div>
							<div class="flex-1 space-y-[7px]">
								<div class="h-[14px] rounded bg-gray-200 w-[40%]"></div>
								<div class="h-[12px] rounded bg-gray-200 w-[25%]"></div>
							</div>
						</div>
					</div>
				</div>

				<!-- Cards loaded -->
				<template v-else-if="payments && payments.data">
					<!-- Empty state -->
					<div v-if="payments.data.length === 0" class="bg-white rounded-[18px] p-[36px] shadow-sm border border-[#E9EBEC] text-center">
						<!-- Icona carte vuote con MDI -->
						<div class="w-[64px] h-[64px] mx-auto mb-[16px] bg-[#F8F9FB] rounded-full flex items-center justify-center">
							<Icon name="mdi:credit-card-outline" class="text-[28px] text-[#C8CCD0]" />
						</div>
						<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[8px]">
							{{ cardsFeatureAvailable ? 'Nessuna carta salvata' : 'Pagamenti con carta non ancora attivi' }}
						</h2>
						<p class="text-[#737373] text-[0.875rem] max-w-[460px] mx-auto mb-[20px] leading-[1.55]">
							<span v-if="cardsFeatureAvailable">
								Aggiungi una carta per pagare più in fretta.
							</span>
							<span v-else-if="isAdmin">
								Configura Stripe per attivare carte e wallet.
							</span>
							<span v-else>
								Le carte saranno disponibili appena Stripe sarà attivo.
							</span>
						</p>
						<button v-if="cardsFeatureAvailable" @click="togglePaymentForm" class="btn-cta sf-nav-button px-[20px] py-[10px] font-semibold text-[0.875rem]">
							Aggiungi la tua prima carta
						</button>
						<button v-else-if="isAdmin" @click="openAdminStripeSettings" class="btn-cta sf-nav-button px-[20px] py-[10px] font-semibold text-[0.875rem]">
							Apri impostazioni Stripe
						</button>
						<p v-else class="text-[#737373] text-[0.875rem] font-medium">
							Quando Stripe sarà attivo, qui comparirà il pulsante per aggiungere la tua prima carta.
						</p>
					</div>

					<!-- Card items -->
					<div v-else class="space-y-[12px]">
						<div
							v-for="(payment, index) in payments.data"
							:key="index"
							:class="[
								'bg-white rounded-[14px] p-[14px] desktop:p-[18px] border transition-all',
								payment.default ? 'border-[#095866] shadow-sm' : 'border-[#E9EBEC] hover:border-[#D0D0D0]',
							]">
								<div class="flex flex-col gap-[12px] tablet:flex-row tablet:items-center tablet:gap-[14px]">
								<!-- Card brand icon -->
								<div
									:class="[
										'w-[48px] h-[32px] rounded-[6px] flex items-center justify-center text-[0.6875rem] font-bold uppercase shrink-0',
										payment.default ? 'bg-[#095866] text-white' : 'bg-[#F0F0F0] text-[#404040]',
									]">
									{{ getBrandIcon(payment.brand)?.slice(0, 4) }}
								</div>

								<!-- Card info -->
									<div class="min-w-0 w-full flex-1">
									<div class="flex flex-wrap items-center gap-[8px]">
										<span class="text-[0.875rem] font-semibold text-[#252B42]">
											{{ getBrandIcon(payment.brand) }} **** {{ payment.last4 }}
										</span>
										<span v-if="payment.default" class="inline-block px-[8px] py-[2px] rounded-full text-[0.6875rem] font-medium bg-[#095866]/10 text-[#095866]">
											Predefinita
										</span>
									</div>
										<div class="mt-[4px] flex flex-col gap-[4px] sm:flex-row sm:items-center sm:gap-[12px]">
										<span class="text-[0.75rem] text-[#737373]">
											{{ payment.holder_name }}
										</span>
										<span class="text-[0.75rem] text-[#a0a0a0]">
											Scad. {{ payment.exp_month }}/{{ payment.exp_year }}
										</span>
									</div>
								</div>

								<!-- Actions -->
										<div class="flex w-full flex-wrap items-center gap-[8px] tablet:w-auto tablet:justify-end">
										<button
											v-if="!payment.default"
											@click="setDefault(payment.id)"
											class="btn-secondary inline-flex min-h-[36px] items-center gap-[5px] px-[11px] py-[7px] text-[0.75rem] font-semibold cursor-pointer">
											<Icon name="mdi:check-circle-outline" class="text-[13px]" />
											Imposta predefinita
										</button>

										<template v-if="deleteConfirmId !== payment.id">
											<button
												@click="deleteConfirmId = payment.id"
												class="btn-tertiary inline-flex min-h-[36px] items-center gap-[4px] px-[11px] py-[7px] text-[0.75rem] font-semibold text-red-600 cursor-pointer hover:border-red-200 hover:bg-red-50">
												<Icon name="mdi:delete-outline" class="text-[14px]" />
												Elimina
											</button>
										</template>
										<template v-else>
											<div class="flex flex-wrap items-center gap-[6px]">
												<button
													@click="deleteCard(payment.id)"
													class="btn-cta inline-flex min-h-[36px] items-center gap-[4px] px-[11px] py-[7px] text-[0.6875rem] font-semibold cursor-pointer">
													<Icon name="mdi:check" class="text-[13px]" />
													Conferma
												</button>
												<button
													@click="deleteConfirmId = null"
													class="btn-secondary inline-flex min-h-[36px] items-center gap-[4px] px-[11px] py-[7px] text-[0.6875rem] font-semibold cursor-pointer">
													<Icon name="mdi:close" class="text-[13px]" />
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
				<div class="mt-[20px] flex items-start gap-[10px] p-[12px] bg-[#F8F9FB] rounded-[16px]">
					<Icon name="mdi:lock-outline" class="text-[17px] text-[#737373] shrink-0 mt-[1px]" />
					<p class="text-[0.75rem] text-[#737373] leading-[1.5]">
						I dati delle carte sono gestiti in modo sicuro da Stripe. Non conserviamo mai i numeri completi delle tue carte.
					</p>
				</div>
			</template>

			<!-- ===== ADD CARD FORM ===== -->
			<template v-if="showFormPayments">
				<div class="bg-white rounded-[18px] p-[18px] tablet:p-[22px] desktop:p-[28px] shadow-sm border border-[#E9EBEC] max-w-[760px] mx-auto">
					<div class="mb-[16px]">
						<label class="block text-[0.75rem] font-semibold text-[#404040] mb-[5px]">Numero carta</label>
						<div class="stripe-field" id="card-number"></div>
					</div>

					<div class="mb-[16px]">
						<label class="block text-[0.75rem] font-semibold text-[#404040] mb-[5px]">Titolare carta</label>
						<input
							type="text"
							v-model="cardHolderName"
							class="w-full px-[14px] py-[11px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] text-[#252B42] placeholder:text-[#a0a0a0] focus:border-[#095866] focus:outline-none transition-colors"
							placeholder="Mario Rossi"
							required />
					</div>

					<div class="grid grid-cols-1 tablet:grid-cols-[minmax(0,1fr)_132px] gap-[12px] mb-[18px]">
						<div class="min-w-0">
							<label class="block text-[0.75rem] font-semibold text-[#404040] mb-[5px]">Scadenza</label>
							<div class="stripe-field" id="card-expiry"></div>
						</div>
						<div class="min-w-0 tablet:w-[132px]">
							<label class="block text-[0.75rem] font-semibold text-[#404040] mb-[5px]">CVC</label>
							<div class="stripe-field" id="card-cvc"></div>
						</div>
					</div>

					<p v-if="errorMessage" class="text-red-500 text-[0.75rem] mb-[14px] p-[10px] bg-red-50 rounded-[8px] border border-red-200">
						{{ errorMessage }}
					</p>

					<div class="flex flex-col sm:flex-row gap-[10px]">
						<button
							@click.prevent="togglePaymentForm"
							class="btn-secondary sf-nav-button flex-1 inline-flex items-center justify-center gap-[6px] py-[12px] font-semibold text-[0.875rem] cursor-pointer">
							<Icon name="mdi:close" class="text-[17px]" />
							Annulla
						</button>
						<button
							@click="handleAddCard"
							class="btn-cta sf-nav-button flex-1 inline-flex items-center justify-center gap-[6px] py-[12px] font-semibold text-[0.875rem] cursor-pointer">
							<Icon name="mdi:content-save" class="text-[17px]" />
							Salva carta
						</button>
					</div>

					<div class="mt-[14px] flex items-center justify-center gap-[6px] text-[0.6875rem] text-[#a0a0a0]">
						<Icon name="mdi:lock-outline" class="text-[13px]" />
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
