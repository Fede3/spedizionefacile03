<!--
  FILE: pages/checkout.vue
  SCOPO: Checkout — pagamento spedizioni (Stripe carta/bonifico, wallet, coupon/referral).

  API: POST /api/stripe/create-order, POST /api/stripe/create-payment-intent,
       POST /api/stripe/order-paid, POST /api/stripe/mark-order-completed,
       POST /api/stripe/create-payment, POST /api/stripe/existing-order-payment,
       POST /api/calculate-coupon, POST /api/wallet/pay, POST /api/referral/apply,
       GET /api/wallet/balance, GET /api/referral/my-discount,
       GET /api/stripe/default-payment-method, GET /api/orders/{id}.
  COMPOSABLE: useCart (dati carrello), useSanctumAuth (utente autenticato), usePriceBands (promo).
  ROUTE: /checkout (protetta, middleware sanctum:auth).

  DATI IN INGRESSO: ?order_id=XXX (query param per pagamento ordine esistente).
  DATI IN USCITA: pagamento completato -> svuotamento carrello, navigazione a successo.

  VINCOLI: Stripe viene caricato in modo dinamico (import asincrono), NON nel bundle iniziale.
           I prezzi nel DB sono in centesimi. Il codice referral viene applicato DOPO il pagamento.

  BUGFIX COMPLETATI (Agent 4):
  ✅ 3D Secure moderno: confirmCardPayment con gestione completa SCA
  ✅ Validazione importo minimo: 0,50€ per pagamenti carta
  ✅ Validazione P.IVA: formato 11 cifre per fatture
  ✅ Ordini multipli atomici: tracking pagamenti parziali con messaggi chiari
  ✅ Errori Stripe user-friendly: mappatura codici errore comuni
  ✅ Progress indicator: feedback visivo durante elaborazione
  ✅ Modal conferma: conferma prima del pagamento finale
  ✅ Success animation: animazione completamento pagamento
  ✅ Inline SVG: rimossi tutti i componenti Icon

  PUNTI DI MODIFICA SICURI: metodi di pagamento (aggiungere PayPal), layout fatturazione, stili.
  COLLEGAMENTI: composables/useCart.js, pages/carrello.vue, pages/account/spedizioni/.
-->
<script setup>
// Ottimizzazione bundle: import dinamico di Stripe (non incluso nel chunk principale)
// loadStripe viene importato solo quando serve, dentro onMounted()

// Preconnect to Stripe only on this page (not globally, to save connections on other pages)
// Aggiunto anche api.stripe.com per velocizzare le chiamate API post-caricamento
useHead({ link: [
	{ rel: 'preconnect', href: 'https://js.stripe.com', crossorigin: '' },
	{ rel: 'preconnect', href: 'https://api.stripe.com', crossorigin: '' },
] });

// Meta tag SEO
useSeoMeta({
	title: 'Checkout | SpedizioneFacile',
	ogTitle: 'Checkout | SpedizioneFacile',
});

const { user } = useSanctumAuth();
const { cart, refresh: refreshCart } = useCart();
const router = useRouter();
const sanctum = useSanctumClient();
const config = useRuntimeConfig();
const stripePublishableKey = ref('');

// Promo settings per badge nel totale
const { loadPriceBands, promoSettings } = usePriceBands();
onMounted(() => { loadPriceBands(); });

// Protegge la pagina: solo utenti autenticati possono accedere
definePageMeta({
	middleware: ["sanctum:auth"],
});

const route = useRoute();
// Se c'e' un order_id nella URL, stiamo pagando un ordine gia' esistente
const existingOrderId = computed(() => route.query.order_id || null);

// Dati dell'ordine esistente (caricato dall'API se order_id presente)
const existingOrder = ref(null);

// Se stiamo pagando un ordine esistente, carica i suoi dati dall'API
if (existingOrderId.value) {
	try {
		const orderData = await sanctum(`/api/orders/${existingOrderId.value}`);
		existingOrder.value = orderData?.data || orderData;
	} catch (e) {
		console.error('Failed to load order:', e);
		navigateTo("/account/spedizioni");
	}
} else {
	// Altrimenti, forza il refresh dei dati del carrello (niente cache)
	clearNuxtData("cart");
	await refreshCart();

	// Se il carrello e' vuoto, reindirizza alla pagina carrello
	if (!cart.value || cart.value.data?.length === 0) {
		navigateTo("/carrello");
	}
}

// --- CONFIGURAZIONE STRIPE ---
// Inizializzazione lato client per evitare problemi con il rendering server-side (SSR)
let stripe = null;
const stripeReady = ref(false);

// Carica Stripe quando il componente e' montato nel browser
// Import dinamico: @stripe/stripe-js viene scaricato solo quando serve (non nel bundle iniziale)
const stripeTimeout = setTimeout(() => {
	if (!stripeReady.value) {
		paymentError.value = 'Impossibile caricare Stripe. Ricarica la pagina.';
	}
}, 10000); // 10 secondi

const resolveStripePublishableKey = async () => {
	try {
		const stripeConfig = await sanctum('/api/settings/stripe');
		const key = String(stripeConfig?.publishable_key || '').trim();
		if (key.startsWith('pk_')) return key;
	} catch (e) {
		// Fallback sotto
	}

	return String(config.public.stripeKey || '').trim();
};

onMounted(async () => {
	try {
		stripePublishableKey.value = await resolveStripePublishableKey();
		if (!stripePublishableKey.value || stripePublishableKey.value.includes('placeholder')) {
			clearTimeout(stripeTimeout);
			paymentError.value = 'Stripe non configurato correttamente. Inserisci le chiavi Stripe dal pannello Carte e Pagamenti.';
			return;
		}

		const { loadStripe } = await import('@stripe/stripe-js');
		const stripePromise = loadStripe(stripePublishableKey.value);
		stripe = await stripePromise;
		stripeReady.value = true;
		clearTimeout(stripeTimeout);
		// Se il metodo di pagamento selezionato e' carta e non c'e' una carta salvata, mostra il form Stripe
		if (paymentMethod.value === 'carta' && !defaultPayment.value?.card) {
			await mountCardElement();
		}
	} catch (e) {
		console.error('Stripe load error:', e);
		clearTimeout(stripeTimeout);
		paymentError.value = 'Errore caricamento sistema pagamenti.';
	}
});

// Recupera la carta di pagamento salvata dell'utente (se ne ha una)
// lazy: true — i dati della carta salvata non servono al primo render,
// vengono usati solo quando l'utente sceglie il metodo "carta"
const { data: defaultPayment } = useSanctumFetch("/api/stripe/default-payment-method", { lazy: true });

// Formatta il prezzo da centesimi a euro (es. 1200 -> "12,00€")
const formatPrice = (cents) => {
	if (!cents && cents !== 0) return '0€';
	const euros = Number(cents) / 100;
	return euros.toFixed(2).replace('.', ',') + '€';
};

// Pacchi da visualizzare: dall'ordine esistente o dal carrello
const displayPackages = computed(() => {
	if (existingOrder.value) return existingOrder.value.packages || [];
	return cart.value?.data || [];
});

// Gruppi di indirizzi dal carrello (per mostrare quante spedizioni verranno create)
const addressGroups = computed(() => cart.value?.meta?.address_groups || []);
const hasMultipleGroups = computed(() => addressGroups.value.filter(g => g.count >= 1).length > 1);
const mergeGroupsCount = computed(() => addressGroups.value.length);

// Totale da visualizzare (come stringa formattata)
const getTotal = computed(() => {
	if (existingOrder.value) return existingOrder.value.subtotal || '0,00€';
	return cart.value?.meta?.total || '0,00€';
});

// Totale come numero (per calcoli, es. 12.50)
// Rimuove simbolo valuta, spazi, e converte formato italiano (1.200,50) in numero (1200.50)
const getNumberTotal = computed(() => {
	const cleaned = String(getTotal.value)
		.replace(/[€\s\u00A0EUR]/gi, "")  // Rimuove simbolo euro, spazi e testo "EUR"
		.replace(/\./g, "")                 // Rimuove separatore migliaia (punto in italiano)
		.replace(",", ".");                 // Converte virgola decimale in punto
	return Number(cleaned) || 0;
});

// Numero totale di pacchi (sommando le quantita')
const totalPackages = computed(() => {
	return displayPackages.value.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
});

// Descrizione del contenuto (tipi di pacco unici, es. "Pacco, Busta")
const contentDescription = computed(() => {
	if (!displayPackages.value.length) return '';
	const types = displayPackages.value.map(item => item.package_type || 'Pacco').filter(Boolean);
	return [...new Set(types)].join(', ');
});

// --- FATTURAZIONE ---
const fatturazioneType = ref('ricevuta'); // 'ricevuta' o 'fattura'
const fatturaData = ref({
	ragione_sociale: '',
	p_iva: '',
	codice_fiscale: '',
	indirizzo: '',
	pec: '',
	codice_sdi: '',
});

// --- WALLET (portafoglio interno) ---
// Caricato in modo lazy per evitare problemi SSR
const walletBalance = ref(0);
const walletLoaded = ref(false);

// Carica il saldo del wallet dall'API (una sola volta)
const loadWalletBalance = async () => {
	if (walletLoaded.value) return;
	try {
		const result = await sanctum("/api/wallet/balance");
		walletBalance.value = Number(result?.balance ?? 0);
		walletLoaded.value = true;
	} catch (e) {
		walletBalance.value = 0;
		walletLoaded.value = true;
	}
};

// Saldo wallet formattato (es. "25,00€")
const walletFormatted = computed(() => walletBalance.value.toFixed(2).replace('.', ',') + '€');
// Controlla se il saldo wallet e' sufficiente per pagare
const walletSufficient = computed(() => walletBalance.value >= finalTotal.value);

// --- COUPON / CODICE PROMOZIONALE ---
const couponCode = ref('');           // Codice inserito dall'utente
const couponLoading = ref(false);     // Stato di caricamento verifica coupon
const couponError = ref(null);        // Messaggio di errore
const couponApplied = ref(null);      // Dati del coupon applicato (tipo, sconto, codice)

// Verifica il codice promozionale tramite API (gestisce sia coupon che codici referral)
const validateCoupon = async () => {
	if (!couponCode.value || couponCode.value.trim().length < 2) return;
	couponLoading.value = true;
	couponError.value = null;
	couponApplied.value = null;
	try {
		// Endpoint unificato che gestisce sia coupon normali che codici referral
		const result = await sanctum("/api/calculate-coupon", {
			method: "POST",
			body: { coupon: couponCode.value.trim().toUpperCase(), total: getNumberTotal.value },
		});
		if (result?.success) {
			couponApplied.value = {
				type: result.type || 'coupon',
				discount_percent: result.percentage,
				discount_amount: result.discount_amount,
				pro_name: result.pro_user_name || '',
				code: result.referral_code || couponCode.value.trim().toUpperCase(),
			};
		}
	} catch (e) {
		const data = e?.response?._data || e?.data;
		couponError.value = data?.error || data?.message || "Codice non valido.";
	} finally {
		couponLoading.value = false;
	}
};

// Applica automaticamente il codice referral se l'utente e' stato invitato da un altro utente
const autoApplyReferral = async () => {
	if (couponApplied.value) return;
	try {
		const result = await sanctum("/api/referral/my-discount");
		if (result?.has_discount && result?.referral_code) {
			couponCode.value = result.referral_code;
			const discountAmount = Math.round(getNumberTotal.value * (result.discount_percent / 100) * 100) / 100;
			couponApplied.value = {
				type: 'referral',
				discount_percent: result.discount_percent,
				discount_amount: discountAmount,
				pro_name: result.pro_name || '',
				code: result.referral_code,
			};
		}
	} catch (e) {
		// Silently ignore - user may not have referral
	}
};

onMounted(() => {
	autoApplyReferral();
});

// Rimuove il coupon applicato
const removeCoupon = () => {
	couponApplied.value = null;
	couponCode.value = '';
	couponError.value = null;
};

// Totale finale dopo aver sottratto lo sconto del coupon (se applicato)
const finalTotal = computed(() => {
	if (couponApplied.value) {
		return Math.max(0, getNumberTotal.value - couponApplied.value.discount_amount);
	}
	return getNumberTotal.value;
});

const finalTotalFormatted = computed(() => {
	return finalTotal.value.toFixed(2).replace('.', ',') + '€';
});

// --- SELEZIONE METODO DI PAGAMENTO ---
const paymentMethod = ref('carta'); // Metodo di default: carta di credito

// Quando l'utente cambia metodo di pagamento, carica i dati necessari
watch(paymentMethod, async (val) => {
	if (val === 'wallet') {
		await loadWalletBalance();
	}
	if (val === 'carta' && !defaultPayment.value?.card && stripeReady.value) {
		await mountCardElement();
	}
});

// --- ELEMENTO CARTA STRIPE ---
const cardElement = ref(null);     // Riferimento all'elemento carta Stripe
const cardMounted = ref(false);    // Se l'elemento carta e' stato montato nel DOM
const cardComplete = ref(false);   // Se l'utente ha completato l'inserimento dei dati carta
const cardError = ref(null);       // Errore di validazione della carta

// Monta l'elemento carta Stripe nel contenitore #card-element
const mountCardElement = async () => {
	if (cardMounted.value || !stripe) return;

	await nextTick();
	const elements = stripe.elements();
	cardElement.value = elements.create('card', {
		style: {
			base: {
				fontSize: '15px',
				color: '#252B42',
				fontFamily: '"Inter", sans-serif',
				'::placeholder': { color: '#A0A5AB' },
			},
			invalid: { color: '#EF4444' },
		},
		hidePostalCode: true,
	});
	const container = document.getElementById('card-element');
	if (container) {
		cardElement.value.mount('#card-element');
		cardMounted.value = true;
		cardElement.value.on('change', (event) => {
			cardComplete.value = event.complete;
			cardError.value = event.error?.message || null;
		});
	}
};

// Se true, l'utente vuole usare una nuova carta invece di quella salvata
const useNewCard = ref(false);
// Se true, la nuova carta viene salvata come predefinita per i prossimi pagamenti
const saveCardForFuture = ref(true);

// Quando l'utente sceglie di usare una nuova carta, monta l'elemento Stripe
watch(useNewCard, async (val) => {
	if (val && stripeReady.value) {
		await nextTick();
		await mountCardElement();
	}
});

// --- TERMINI E CONDIZIONI ---
const termsAccepted = ref(false);

// --- CONFERMA PAGAMENTO ---
const showConfirmModal = ref(false);

// Mostra modal di conferma prima del pagamento
const confirmPayment = () => {
	if (!canPay.value) return;
	showConfirmModal.value = true;
};

// Procede con il pagamento dopo conferma
const proceedWithPayment = () => {
	showConfirmModal.value = false;
	processPayment();
};

// --- STATO DEL PAGAMENTO ---
const isProcessing = ref(false);      // Pagamento in corso
const paymentError = ref(null);       // Errore durante il pagamento
const paymentSuccess = ref(false);    // Pagamento completato con successo
const successOrderId = ref(null);     // ID dell'ordine pagato
const paymentStep = ref('');          // Step corrente del pagamento (per UI)

// Controlla se l'utente puo' procedere al pagamento
// (termini accettati, metodo valido, dati completi)
const canPay = computed(() => {
	if (!termsAccepted.value) return false;
	if (isProcessing.value) return false;
	if (paymentMethod.value === 'paypal') return false;
	if (paymentMethod.value === 'carta') {
		if (defaultPayment.value?.card && !useNewCard.value) return true;
		return cardComplete.value;
	}
	if (paymentMethod.value === 'bonifico') return true;
	if (paymentMethod.value === 'wallet') return walletSufficient.value;
	return false;
});

// Testo tooltip per il bottone di pagamento disabilitato (spiega perche' non si puo' pagare)
const payButtonTooltip = computed(() => {
	if (!termsAccepted.value) return 'Accetta i termini e condizioni per procedere.';
	if (paymentMethod.value === 'paypal') return 'PayPal non e ancora disponibile.';
	if (paymentMethod.value === 'wallet' && walletLoaded.value && !walletSufficient.value) return 'Saldo wallet insufficiente.';
	if (paymentMethod.value === 'carta' && !defaultPayment.value?.card && !cardComplete.value) return 'Inserisci i dati della carta.';
	return '';
});

// --- PROCESSO DI PAGAMENTO PRINCIPALE ---
// Gestisce tutti i metodi di pagamento: carta (salvata/nuova), bonifico, wallet
// Flusso: crea ordine -> applica referral -> esegui pagamento -> segna come pagato
const processPayment = async () => {
	if (!canPay.value) return;
	isProcessing.value = true;
	paymentError.value = null;
	paymentStep.value = 'Validazione dati...';

	// TASK 1: Validazione importo minimo Stripe
	if (paymentMethod.value === 'carta' && finalTotal.value < 0.50) {
		paymentError.value = 'Importo minimo per pagamento con carta: 0,50€';
		isProcessing.value = false;
		paymentStep.value = '';
		return;
	}

	// TASK 2: Validazione form fatturazione
	if (fatturazioneType.value === 'fattura') {
		if (!fatturaData.value.ragione_sociale?.trim()) {
			paymentError.value = 'Ragione Sociale obbligatoria per fattura';
			isProcessing.value = false;
			paymentStep.value = '';
			return;
		}
		if (!fatturaData.value.p_iva?.trim()) {
			paymentError.value = 'P.IVA obbligatoria per fattura';
			isProcessing.value = false;
			paymentStep.value = '';
			return;
		}
		// Validazione formato P.IVA italiana (11 cifre)
		const pivaClean = fatturaData.value.p_iva.replace(/\s/g, '');
		if (!/^\d{11}$/.test(pivaClean)) {
			paymentError.value = 'P.IVA non valida. Deve contenere 11 cifre.';
			isProcessing.value = false;
			paymentStep.value = '';
			return;
		}
	}

	try {
		let orderIds = [];
		const isExisting = !!existingOrderId.value;

		paymentStep.value = 'Creazione ordine...';

		if (isExisting) {
			orderIds = [existingOrderId.value];
		} else {
			const orderResponse = await sanctum("/api/stripe/create-order", {
				method: "POST",
				body: { subtotal: Math.round(getNumberTotal.value * 100) },
			});
			// Supporta sia singolo order_id che multipli order_ids (raggruppamento per indirizzo)
			orderIds = orderResponse.order_ids || [orderResponse.order_id];
		}

		const primaryOrderId = orderIds[0];

		// Helper: solo svuota il carrello quando si paga dal carrello (non da un ordine esistente)
		// Applica anche il codice referral DOPO il pagamento riuscito (non prima, per evitare commissioni su pagamenti falliti)
		const onPaymentSuccess = async () => {
			paymentStep.value = 'Finalizzazione...';
			// Applica la commissione referral solo dopo che il pagamento e' andato a buon fine
			if (couponApplied.value && couponApplied.value.type === 'referral') {
				try {
					await sanctum("/api/referral/apply", {
						method: "POST",
						body: {
							code: couponApplied.value.code,
							order_id: primaryOrderId,
							order_amount: getNumberTotal.value,
						},
					});
				} catch (e) {
					console.warn('Referral apply warning:', e);
				}
			}

			paymentSuccess.value = true;
			successOrderId.value = orderIds.length > 1
				? orderIds.join(', ')
				: primaryOrderId;
			if (!existingOrderId.value) {
				clearNuxtData("cart");
				await refreshNuxtData("cart");
			}
			paymentStep.value = '';
		};

		// Helper: processa il pagamento per un singolo ordine
		// Viene chiamato per ogni ordine quando ce ne sono piu' di uno
		const payOrder = async (orderId, isFirst) => {
			if (orderIds.length > 1) {
				paymentStep.value = `Pagamento ordine ${orderIds.indexOf(orderId) + 1} di ${orderIds.length}...`;
			} else {
				paymentStep.value = 'Elaborazione pagamento...';
			}

			if (paymentMethod.value === 'bonifico') {
				await sanctum("/api/stripe/mark-order-completed", {
					method: "POST",
					body: {
						order_id: orderId,
						payment_type: 'bonifico',
						is_existing_order: !!existingOrderId.value,
					},
				});
				return true;
			}

			if (paymentMethod.value === 'wallet') {
				// Per il wallet, calcoliamo l'importo per questo ordine specifico
				const orderData = orderIds.length > 1
					? await sanctum(`/api/orders/${orderId}`)
					: null;
				const orderAmount = orderData
					? Number(String(orderData?.data?.subtotal || '0').replace(/[^0-9.,]/g, '').replace(',', '.'))
					: finalTotal.value;

				const walletResult = await sanctum("/api/wallet/pay", {
					method: "POST",
					body: {
						amount: orderAmount,
						reference: `order-${orderId}`,
						description: `Pagamento ordine #${orderId}`,
					},
				});

				if (walletResult?.success) {
					await sanctum("/api/stripe/mark-order-completed", {
						method: "POST",
						body: {
							order_id: orderId,
							payment_type: 'wallet',
							ext_id: `wallet-${walletResult?.data?.id || Date.now()}`,
							is_existing_order: !!existingOrderId.value,
						},
					});
					return true;
				} else {
					paymentError.value = walletResult?.message || "Pagamento con wallet non riuscito.";
					return false;
				}
			}

			if (paymentMethod.value === 'carta' && defaultPayment.value?.card && !useNewCard.value) {
				const payEndpoint = isExisting ? '/api/stripe/existing-order-payment' : '/api/stripe/create-payment';
				const payResult = await sanctum(payEndpoint, {
					method: "POST",
					body: {
						order_id: orderId,
						currency: "eur",
						customer_id: user.value.customer_id,
						payment_method_id: defaultPayment.value.card.id,
					},
				});

				if (payResult.status === "succeeded") {
					const paidEndpoint = isExisting ? '/api/stripe/existing-order-paid' : '/api/stripe/order-paid';
					await sanctum(paidEndpoint, {
						method: "POST",
						body: {
							order_id: orderId,
							ext_id: payResult.payment_intent_id,
							is_existing_order: isExisting,
						},
					});
					return true;
				} else if (payResult.status === "requires_action") {
					paymentError.value = "La tua banca richiede autenticazione 3D Secure. Usa una nuova carta per completare l'autenticazione.";
					return false;
				} else {
					paymentError.value = "Pagamento non riuscito. Stato: " + payResult.status;
					return false;
				}
			}

			if (paymentMethod.value === 'carta' && (useNewCard.value || !defaultPayment.value?.card)) {
				const piEndpoint = isExisting ? '/api/stripe/existing-order-payment-intent' : '/api/stripe/create-payment-intent';
				const piResponse = await sanctum(piEndpoint, {
					method: "POST",
					body: { order_id: orderId },
				});

				if (piResponse.error) {
					paymentError.value = piResponse.error;
					return false;
				}

				// FIXED: confirmCardPayment gestisce automaticamente 3D Secure (SCA)
				// Stripe SDK mostra il modal 3DS quando richiesto dalla banca
				const confirmationData = {
					payment_method: { card: cardElement.value },
					...(saveCardForFuture.value ? { setup_future_usage: 'off_session' } : {}),
				};

				const { error, paymentIntent } = await stripe.confirmCardPayment(
					piResponse.client_secret,
					confirmationData
				);

				if (error) {
					// Messaggi user-friendly per errori comuni Stripe
					const errorMessages = {
						'card_declined': 'Carta rifiutata. Verifica i dati o usa un\'altra carta.',
						'insufficient_funds': 'Fondi insufficienti sulla carta.',
						'expired_card': 'Carta scaduta.',
						'incorrect_cvc': 'Codice CVC non corretto.',
						'incorrect_number': 'Numero carta non valido.',
						'invalid_expiry_year': 'Anno di scadenza non valido.',
						'invalid_expiry_month': 'Mese di scadenza non valido.',
						'processing_error': 'Errore temporaneo. Riprova tra qualche minuto.',
						'authentication_required': 'Autenticazione 3D Secure fallita.',
						'payment_intent_authentication_failure': 'Autenticazione 3D Secure non riuscita.',
					};
					paymentError.value = errorMessages[error.code] || error.message;
					return false;
				}

				// Gestione completa degli stati del PaymentIntent
				if (paymentIntent.status === "succeeded") {
					if (saveCardForFuture.value && paymentIntent.payment_method) {
						try {
							await sanctum('/api/stripe/set-default-payment-method', {
								method: 'POST',
								body: { payment_method: paymentIntent.payment_method },
							});
							await refreshNuxtData('/api/stripe/default-payment-method');
						} catch (saveErr) {
							console.warn('Save card warning:', saveErr);
						}
					}

					const paidEndpoint = isExisting ? '/api/stripe/existing-order-paid' : '/api/stripe/order-paid';
					await sanctum(paidEndpoint, {
						method: "POST",
						body: {
							order_id: orderId,
							ext_id: paymentIntent.id,
							is_existing_order: isExisting,
						},
					});
					return true;
				} else if (paymentIntent.status === "requires_action") {
					// Questo non dovrebbe accadere perché confirmCardPayment gestisce l'azione
					paymentError.value = "Autenticazione 3D Secure richiesta ma non completata.";
					return false;
				} else if (paymentIntent.status === "processing") {
					paymentError.value = "Pagamento in elaborazione. Controlla lo stato tra qualche minuto.";
					return false;
				} else if (paymentIntent.status === "requires_payment_method") {
					paymentError.value = "Metodo di pagamento non valido. Riprova con un'altra carta.";
					return false;
				} else {
					paymentError.value = "Stato pagamento: " + paymentIntent.status;
					return false;
				}
			}

			return false;
		};

		// FIXED: Gestione atomica ordini multipli
		// Per ordini multipli, traccia quali sono stati pagati per gestire fallimenti parziali
		const paidOrderIds = [];
		let allSuccess = true;

		for (let i = 0; i < orderIds.length; i++) {
			const success = await payOrder(orderIds[i], i === 0);
			if (success) {
				paidOrderIds.push(orderIds[i]);
			} else {
				allSuccess = false;
				// Se fallisce un ordine dopo che altri sono stati pagati, informa l'utente
				if (paidOrderIds.length > 0) {
					paymentError.value = `Attenzione: ${paidOrderIds.length} ordine/i pagato/i con successo (${paidOrderIds.join(', ')}), ma il pagamento dell'ordine ${orderIds[i]} è fallito. Contatta l'assistenza per completare l'ordine rimanente.`;
				}
				return;
			}
		}

		if (allSuccess) {
			await onPaymentSuccess();
		}

	} catch (err) {
		console.error('Payment error:', err);
		paymentError.value = err?.response?._data?.error || err?.response?._data?.message || err?.data?.error || err?.message || "Errore durante il pagamento. Riprova.";
	} finally {
		isProcessing.value = false;
		paymentStep.value = '';
	}
};
</script>

<template>
	<section class="min-h-[600px] py-[30px] desktop:py-[50px] bg-[#F0F0F0]">
		<div class="my-container">
			<!-- Steps -->
			<Steps :current-step="4" />

			<!-- Success -->
			<div v-if="paymentSuccess" class="max-w-[600px] mx-auto text-center py-[60px]">
				<div class="w-[80px] h-[80px] mx-auto mb-[20px] bg-emerald-100 rounded-full flex items-center justify-center animate-[success-bounce_0.6s_ease-out]">
					<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="animate-[check-draw_0.5s_ease-out_0.2s_both]">
						<polyline points="20 6 9 17 4 12"/>
					</svg>
				</div>
				<h1 class="text-[1.75rem] font-bold text-[#252B42] mb-[12px]">Pagamento completato!</h1>
				<p class="text-[#737373] text-[1rem] leading-[1.6] mb-[8px]">
					<template v-if="String(successOrderId).includes(',')">
						I tuoi ordini <span class="font-semibold text-[#252B42]">#{{ successOrderId }}</span> sono stati creati con successo.
					</template>
					<template v-else>
						Il tuo ordine <span class="font-semibold text-[#252B42]">#{{ successOrderId }}</span> è stato creato con successo.
					</template>
				</p>
				<p v-if="paymentMethod === 'bonifico'" class="text-[#737373] text-[0.9375rem] mb-[24px]">
					Riceverai le coordinate bancarie via email per completare il pagamento.
				</p>
				<p v-else class="text-[#737373] text-[0.9375rem] mb-[24px]">
					Il pagamento è stato elaborato correttamente.
				</p>
				<div class="flex flex-col tablet:flex-row gap-[12px] justify-center">
					<NuxtLink to="/account/spedizioni" class="inline-flex items-center justify-center gap-[6px] px-[24px] py-[12px] min-h-[48px] bg-[#095866] text-white rounded-[50px] font-semibold text-[0.9375rem] hover:bg-[#074a56] transition">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
						Vedi le tue spedizioni
					</NuxtLink>
					<NuxtLink to="/" class="inline-flex items-center justify-center gap-[6px] px-[24px] py-[12px] min-h-[48px] border border-[#E9EBEC] text-[#737373] rounded-[50px] font-medium text-[0.9375rem] hover:bg-white transition">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
						Torna alla home
					</NuxtLink>
				</div>
			</div>

			<!-- Checkout form -->
			<div v-else class="mx-auto space-y-[24px]">

				<!-- Riepilogo -->
				<div class="bg-[#E6E6E6] rounded-[20px] p-[16px_12px] tablet:p-[24px_20px] desktop:p-[30px_36px]">
					<!-- Header -->
					<div class="flex items-center justify-between mb-[20px]">
						<div class="flex items-center gap-[10px]">
							<div class="w-[36px] h-[36px] bg-[#095866] rounded-[50px] flex items-center justify-center shrink-0">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="22" height="18" rx="2"/><path d="M1 9h22"/></svg>
							</div>
							<div>
								<h2 class="text-[1.25rem] font-bold text-[#252B42] leading-tight">{{ displayPackages.length <= 1 ? 'Riepilogo ordine' : 'Riepilogo ordini' }}</h2>
								<p class="text-[0.8125rem] text-[#737373]">{{ totalPackages }} {{ totalPackages === 1 ? 'spedizione' : 'spedizioni' }}<span v-if="contentDescription"> &middot; {{ contentDescription }}</span></p>
							</div>
						</div>
						<NuxtLink v-if="!existingOrderId" to="/carrello" class="bg-[#E44203] text-white font-semibold text-[0.8125rem] px-[18px] py-[8px] rounded-[8px] hover:opacity-90 transition flex items-center gap-[6px]">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
							Modifica
						</NuxtLink>
						<span v-else class="text-[0.8125rem] font-semibold text-[#737373] bg-white px-[14px] py-[6px] rounded-[8px]">
							Ordine #{{ existingOrderId }}
						</span>
					</div>

					<!-- Merge info banner -->
					<div v-if="!existingOrderId && hasMultipleGroups" class="bg-[#095866]/10 border border-[#095866]/20 rounded-[50px] p-[12px_16px] mb-[14px] flex items-center gap-[10px]">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>
						<p class="text-[0.8125rem] text-[#095866] font-medium">
							Verranno creati <span class="font-bold">{{ mergeGroupsCount }} ordini separati</span> in base agli indirizzi. I pacchi con stessi indirizzi saranno uniti in una singola spedizione.
						</p>
					</div>
					<div v-else-if="!existingOrderId && addressGroups.some(g => g.count > 1)" class="bg-emerald-50 border border-emerald-200 rounded-[50px] p-[12px_16px] mb-[14px] flex items-center gap-[10px]">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
						<p class="text-[0.8125rem] text-emerald-700 font-medium">
							Tutti i pacchi hanno gli stessi indirizzi e verranno spediti come un'unica spedizione multi-collo.
						</p>
					</div>

					<!-- Package cards -->
					<div class="space-y-[14px] mb-[20px]">
						<div v-for="(pkg, pkgIdx) in displayPackages" :key="pkg.id || pkgIdx"
							class="bg-white rounded-[14px] p-[18px_20px] border border-[#E9EBEC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">

							<!-- Package header row: type + price -->
							<div class="flex items-center justify-between mb-[14px]">
								<div class="flex items-center gap-[8px]">
									<span class="inline-flex items-center justify-center w-[28px] h-[28px] bg-[#095866]/10 text-[#095866] rounded-[8px] text-[0.75rem] font-bold">{{ pkgIdx + 1 }}</span>
									<span class="text-[0.9375rem] font-semibold text-[#252B42]">{{ pkg.package_type || 'Pacco' }}</span>
									<span v-if="pkg.content_description" class="text-[0.75rem] text-[#737373] bg-[#F5F5F5] px-[8px] py-[2px] rounded-[4px]">{{ pkg.content_description }}</span>
								</div>
								<span class="text-[1.0625rem] font-bold text-[#095866]"
									:title="'Prezzo unitario per questo collo: ' + formatPrice(pkg.single_price) + (pkg.quantity > 1 ? ' x ' + pkg.quantity + ' = ' + formatPrice(pkg.single_price * pkg.quantity) : '')">
									{{ formatPrice(pkg.single_price) }}
								</span>
							</div>

							<!-- Package specs row -->
							<div class="flex flex-wrap gap-[8px] mb-[14px]">
								<span class="inline-flex items-center gap-[4px] bg-[#F5F5F5] text-[0.8125rem] text-[#252B42] px-[10px] py-[5px] rounded-[6px]"
									:title="'Peso del pacco: ' + pkg.weight + ' chilogrammi'">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#737373" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
									<span class="font-medium">{{ pkg.weight }} kg</span>
								</span>
								<span class="inline-flex items-center gap-[4px] bg-[#F5F5F5] text-[0.8125rem] text-[#252B42] px-[10px] py-[5px] rounded-[6px]"
									:title="'Dimensioni: larghezza ' + pkg.first_size + ' cm x altezza ' + pkg.second_size + ' cm x profondità ' + pkg.third_size + ' cm'">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#737373" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3"/></svg>
									<span class="font-medium">{{ pkg.first_size }}&times;{{ pkg.second_size }}&times;{{ pkg.third_size }} cm</span>
								</span>
								<span v-if="(pkg.quantity || 1) > 1" class="inline-flex items-center gap-[4px] bg-[#F5F5F5] text-[0.8125rem] text-[#252B42] px-[10px] py-[5px] rounded-[6px]"
									title="Numero di colli identici in questa spedizione">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#737373" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="8" height="8" rx="1"/></svg>
									<span class="font-medium">Qtà: {{ pkg.quantity }}</span>
								</span>
							</div>

							<!-- Addresses section -->
							<div v-if="pkg.origin_address || pkg.destination_address" class="border-t border-[#F0F0F0] pt-[14px] mb-[14px]">
								<div class="grid grid-cols-1 desktop:grid-cols-2 gap-[12px]">
									<!-- Sender -->
									<div v-if="pkg.origin_address" class="flex gap-[10px]">
										<div class="w-[32px] h-[32px] bg-[#095866]/10 rounded-[8px] flex items-center justify-center shrink-0 mt-[2px]"
											title="Indirizzo del mittente">
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>
										</div>
										<div class="min-w-0">
											<p class="text-[0.75rem] font-semibold text-[#095866] uppercase tracking-wider mb-[2px]">Da:</p>
											<p class="text-[0.8125rem] font-medium text-[#252B42] leading-snug">{{ pkg.origin_address.name }}</p>
											<p class="text-[0.8125rem] text-[#737373] leading-snug">{{ pkg.origin_address.address }} {{ pkg.origin_address.address_number }}</p>
											<p class="text-[0.8125rem] text-[#737373] leading-snug">{{ pkg.origin_address.postal_code }} {{ pkg.origin_address.city }} ({{ pkg.origin_address.province }})</p>
										</div>
									</div>
									<!-- Recipient -->
									<div v-if="pkg.destination_address" class="flex gap-[10px]">
										<div class="w-[32px] h-[32px] bg-[#E44203]/10 rounded-[8px] flex items-center justify-center shrink-0 mt-[2px]"
											title="Indirizzo del destinatario">
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E44203" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>
										</div>
										<div class="min-w-0">
											<p class="text-[0.75rem] font-semibold text-[#E44203] uppercase tracking-wider mb-[2px]">A:</p>
											<p class="text-[0.8125rem] font-medium text-[#252B42] leading-snug">{{ pkg.destination_address.name }}</p>
											<p class="text-[0.8125rem] text-[#737373] leading-snug">{{ pkg.destination_address.address }} {{ pkg.destination_address.address_number }}</p>
											<p class="text-[0.8125rem] text-[#737373] leading-snug">{{ pkg.destination_address.postal_code }} {{ pkg.destination_address.city }} ({{ pkg.destination_address.province }})</p>
										</div>
									</div>
								</div>
							</div>

							<!-- Services & Pickup date -->
							<div v-if="pkg.services && ((pkg.services.service_type && pkg.services.service_type !== 'Nessuno') || pkg.services.date)"
								class="border-t border-[#F0F0F0] pt-[12px] flex flex-wrap items-center gap-[12px]">
								<span v-if="pkg.services.service_type && pkg.services.service_type !== 'Nessuno'"
									class="inline-flex items-center gap-[6px] text-[0.8125rem] text-[#252B42]"
									title="Servizio aggiuntivo selezionato per questa spedizione">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
									<span class="font-medium">{{ pkg.services.service_type }}</span>
								</span>
								<span v-if="pkg.services.date"
									class="inline-flex items-center gap-[6px] text-[0.8125rem] text-[#252B42]"
									title="Data programmata per il ritiro del pacco">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
									<span class="font-medium">Ritiro: {{ pkg.services.date }}</span>
								</span>
							</div>
						</div>
					</div>

					<!-- Totals summary -->
					<div class="bg-white rounded-[14px] p-[18px_20px] border border-[#E9EBEC]">
						<!-- Subtotal -->
						<div class="flex items-center justify-between py-[8px]">
							<span class="text-[0.9375rem] text-[#737373]">Subtotale ({{ totalPackages }} {{ totalPackages === 1 ? 'spedizione' : 'spedizioni' }})</span>
							<span class="text-[0.9375rem] font-medium text-[#252B42]">{{ getTotal }}</span>
						</div>

						<!-- Discount row -->
						<div v-if="couponApplied" class="flex items-center justify-between py-[8px] border-t border-[#F0F0F0]">
							<span class="text-[0.9375rem] text-emerald-700 flex items-center gap-[6px]"
								:title="'Sconto ' + couponApplied.discount_percent + '% applicato con il codice ' + couponApplied.code">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
								Sconto {{ couponApplied.discount_percent }}% ({{ couponApplied.code }})
							</span>
							<span class="text-[0.9375rem] font-semibold text-emerald-700">-{{ couponApplied.discount_amount.toFixed(2).replace('.', ',') }}€</span>
						</div>

						<!-- Divider before total -->
						<div class="border-t-2 border-[#E0E0E0] mt-[4px] mb-[4px]"></div>

						<!-- Final total -->
						<div class="flex items-center justify-between py-[8px]">
							<div class="flex items-center gap-[8px]">
								<span class="text-[1.0625rem] font-bold text-[#252B42]">Totale da pagare</span>
								<!-- Promo badge -->
								<span v-if="promoSettings?.active && promoSettings?.label_text"
									:style="{ backgroundColor: promoSettings.label_color || '#E44203' }"
									class="inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-[6px] text-white text-[0.6875rem] font-bold tracking-wide">
									<!-- Ottimizzazione: lazy loading + decoding async + dimensioni per CLS -->
									<img v-if="promoSettings.label_image" :src="promoSettings.label_image" alt="" loading="lazy" decoding="async" width="24" height="12" class="h-[12px] w-auto" />
									{{ promoSettings.label_text }}
								</span>
							</div>
							<span class="text-[1.25rem] font-bold text-[#095866]"
								:title="couponApplied ? `Totale originale: ${getTotal} - Sconto: ${couponApplied.discount_amount.toFixed(2).replace('.', ',')}€ = ${finalTotalFormatted}` : 'Totale ordine IVA inclusa'">
								{{ finalTotalFormatted }}
							</span>
						</div>
					</div>
				</div>

				<!-- Codice promozionale -->
				<div class="bg-[#E6E6E6] rounded-[20px] p-[16px_12px] tablet:p-[24px_20px] desktop:p-[30px_36px]">
					<h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[16px]">Codice promozionale</h2>

					<div v-if="couponApplied" class="flex items-center gap-[12px] bg-emerald-50 border border-emerald-200 rounded-[50px] p-[14px]">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
						<div class="flex-1">
							<p class="text-[0.9375rem] font-semibold text-emerald-800">Codice {{ couponApplied.code }} applicato!</p>
							<p class="text-[0.8125rem] text-emerald-700">Sconto del {{ couponApplied.discount_percent }}% da {{ couponApplied.pro_name }}</p>
						</div>
						<button type="button" @click="removeCoupon" class="inline-flex items-center gap-[4px] text-[0.8125rem] text-red-500 hover:underline font-medium cursor-pointer">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
							Rimuovi
						</button>
					</div>
					<div v-else class="flex flex-col tablet:flex-row gap-[12px]">
						<input
							v-model="couponCode"
							type="text"
							placeholder="Inserisci codice promozionale..."
							maxlength="20"
							class="flex-1 bg-white p-[12px_16px] border border-[#D0D0D0] rounded-[50px] text-[1rem] placeholder:text-[#A0A5AB] uppercase tracking-wider focus:border-[#095866] focus:outline-none"
							@keyup.enter="validateCoupon" />
						<button
							type="button"
							@click="validateCoupon"
							:disabled="couponLoading || !couponCode.trim()"
							class="inline-flex items-center justify-center gap-[6px] px-[24px] min-h-[48px] bg-[#095866] text-white rounded-[50px] font-semibold text-[0.875rem] hover:bg-[#074a56] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
							{{ couponLoading ? 'Verifica...' : 'Applica' }}
						</button>
					</div>
					<p v-if="couponError" class="text-red-500 text-[0.8125rem] mt-[8px]">{{ couponError }}</p>
				</div>

				<!-- Dettagli fatturazione -->
				<div class="bg-[#E6E6E6] rounded-[20px] p-[16px_12px] tablet:p-[24px_20px] desktop:p-[30px_36px]">
					<h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[16px]">Dettagli fatturazione</h2>

					<div class="flex items-center justify-between mb-[8px]">
						<div>
							<p class="text-[0.9375rem] text-[#252B42]">Importo servizi fatturati:</p>
							<p class="text-[0.9375rem] font-semibold text-[#252B42]">{{ finalTotalFormatted }}</p>
						</div>
					</div>

					<div class="flex gap-[12px] mt-[20px]">
						<button type="button" @click="fatturazioneType = 'ricevuta'"
							:class="fatturazioneType === 'ricevuta' ? 'bg-white border-[#252B42] text-[#252B42]' : 'bg-white border-[#D0D0D0] text-[#737373]'"
							class="px-[24px] min-h-[44px] rounded-[8px] text-[0.875rem] font-medium cursor-pointer transition-colors border">
							Ricevuta
						</button>
						<button type="button" @click="fatturazioneType = 'fattura'"
							:class="fatturazioneType === 'fattura' ? 'bg-white border-[#252B42] text-[#252B42]' : 'bg-white border-[#D0D0D0] text-[#737373]'"
							class="px-[24px] min-h-[44px] rounded-[8px] text-[0.875rem] font-medium cursor-pointer transition-colors border">
							Fattura
						</button>
					</div>

					<div v-if="fatturazioneType === 'fattura'" class="space-y-[12px] mt-[16px]">
						<div>
							<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[4px]">Ragione Sociale *</label>
							<input v-model="fatturaData.ragione_sociale" type="text" placeholder="Ragione Sociale" class="w-full bg-white p-[12px_14px] border border-[#D0D0D0] rounded-[8px] text-[1rem] placeholder:text-[#A0A5AB] focus:border-[#095866] focus:outline-none transition-colors" />
						</div>
						<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[12px]">
							<div>
								<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[4px]">P. IVA *</label>
								<input v-model="fatturaData.p_iva" type="text" placeholder="P. IVA" class="w-full bg-white p-[12px_14px] border border-[#D0D0D0] rounded-[8px] text-[1rem] placeholder:text-[#A0A5AB] focus:border-[#095866] focus:outline-none transition-colors" />
							</div>
							<div>
								<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[4px]">Codice Fiscale</label>
								<input v-model="fatturaData.codice_fiscale" type="text" placeholder="CF" class="w-full bg-white p-[12px_14px] border border-[#D0D0D0] rounded-[8px] text-[1rem] placeholder:text-[#A0A5AB] focus:border-[#095866] focus:outline-none transition-colors" />
							</div>
						</div>
						<div>
							<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[4px]">Indirizzo</label>
							<input v-model="fatturaData.indirizzo" type="text" placeholder="Indirizzo completo" class="w-full bg-white p-[12px_14px] border border-[#D0D0D0] rounded-[8px] text-[1rem] placeholder:text-[#A0A5AB] focus:border-[#095866] focus:outline-none transition-colors" />
						</div>
						<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[12px]">
							<div>
								<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[4px]">PEC</label>
								<input v-model="fatturaData.pec" type="email" placeholder="email@pec.it" class="w-full bg-white p-[12px_14px] border border-[#D0D0D0] rounded-[8px] text-[1rem] placeholder:text-[#A0A5AB] focus:border-[#095866] focus:outline-none transition-colors" />
							</div>
							<div>
								<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[4px]">Codice SDI</label>
								<input v-model="fatturaData.codice_sdi" type="text" placeholder="0000000" maxlength="7" class="w-full bg-white p-[12px_14px] border border-[#D0D0D0] rounded-[8px] text-[1rem] placeholder:text-[#A0A5AB] focus:border-[#095866] focus:outline-none transition-colors" />
							</div>
						</div>
					</div>
				</div>

				<!-- Metodi di pagamento -->
				<div class="bg-[#E6E6E6] rounded-[20px] p-[16px_12px] tablet:p-[24px_20px] desktop:p-[30px_36px]">
					<h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[20px]">Metodi di pagamento</h2>

					<div class="grid grid-cols-1 tablet:grid-cols-2 desktop:flex desktop:flex-wrap gap-[10px] tablet:gap-[12px] mb-[20px]">
						<button type="button" @click="paymentMethod = 'bonifico'"
							:class="paymentMethod === 'bonifico' ? 'border-[#252B42] bg-white' : 'border-[#D0D0D0] bg-white'"
							class="flex items-center gap-[8px] px-[16px] tablet:px-[20px] py-[14px] min-h-[48px] rounded-[8px] text-[0.875rem] font-medium cursor-pointer transition-colors border">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" class="shrink-0"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 10h20"/></svg>
							<span class="text-[#252B42]">Bonifico bancario</span>
						</button>
						<button type="button" @click="paymentMethod = 'paypal'"
							:class="paymentMethod === 'paypal' ? 'border-[#252B42] bg-white' : 'border-[#D0D0D0] bg-white'"
							class="flex items-center gap-[8px] px-[16px] tablet:px-[20px] py-[14px] min-h-[48px] rounded-[8px] text-[0.875rem] font-medium cursor-pointer transition-colors border relative">
							<span class="text-[#003087] font-bold text-[0.875rem]">P</span>
							<span class="text-[#252B42]">PayPal</span>
							<span class="text-[0.6875rem] text-[#A0A5AB] font-normal">(presto)</span>
						</button>
						<button type="button" @click="paymentMethod = 'carta'"
							:class="paymentMethod === 'carta' ? 'border-[#252B42] bg-white' : 'border-[#D0D0D0] bg-white'"
							class="flex items-center gap-[8px] px-[16px] tablet:px-[20px] py-[14px] min-h-[48px] rounded-[8px] text-[0.875rem] font-medium cursor-pointer transition-colors border">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" class="shrink-0"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
							<span class="text-[#252B42]">Carta di credito/debito</span>
						</button>
						<button type="button" @click="paymentMethod = 'wallet'"
							:class="paymentMethod === 'wallet' ? 'border-[#252B42] bg-white' : 'border-[#D0D0D0] bg-white'"
							class="flex items-center gap-[8px] px-[16px] tablet:px-[20px] py-[14px] min-h-[48px] rounded-[8px] text-[0.875rem] font-medium cursor-pointer transition-colors border">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" class="shrink-0"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
							<span class="text-[#252B42]">Wallet</span>
							<span v-if="walletLoaded" class="text-[0.75rem] text-[#095866] font-semibold">({{ walletFormatted }})</span>
						</button>
					</div>

					<div v-if="paymentMethod === 'carta'">
						<div v-if="defaultPayment?.card && !useNewCard" class="mb-[16px]">
							<div class="flex items-center gap-[12px] p-[14px] bg-white rounded-[12px] border border-[#D0D0D0]">
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
								<div class="flex-1">
									<p class="text-[0.875rem] font-semibold text-[#252B42]">{{ defaultPayment.card.brand?.toUpperCase() }} **** {{ defaultPayment.card.last4 }}</p>
									<p class="text-[0.75rem] text-[#737373]">Scade {{ defaultPayment.card.exp_month }}/{{ defaultPayment.card.exp_year }}</p>
								</div>
							</div>
							<button type="button" @click="useNewCard = true" class="mt-[10px] text-[0.8125rem] text-[#095866] hover:underline cursor-pointer font-medium">Usa una nuova carta</button>
						</div>
						<div v-if="!defaultPayment?.card || useNewCard">
							<div v-if="useNewCard && defaultPayment?.card" class="mb-[10px]">
								<button type="button" @click="useNewCard = false" class="text-[0.8125rem] text-[#095866] hover:underline cursor-pointer font-medium">&larr; Usa carta salvata</button>
							</div>
							<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[8px]">Dati carta</label>
							<div id="card-element" class="p-[14px] bg-white border border-[#D0D0D0] rounded-[12px]"></div>
							<label class="mt-[10px] flex items-start gap-[8px] cursor-pointer">
								<input type="checkbox" v-model="saveCardForFuture" class="w-[16px] h-[16px] min-w-[16px] accent-[#095866] mt-[2px] cursor-pointer" />
								<span class="text-[0.8125rem] text-[#252B42] leading-[1.4]">Salva questa carta per i prossimi pagamenti</span>
							</label>
							<p v-if="cardError" class="text-red-500 text-[0.75rem] mt-[6px]">{{ cardError }}</p>
						</div>
					</div>

					<div v-if="paymentMethod === 'bonifico'" class="bg-white rounded-[50px] p-[16px] text-[0.8125rem] text-[#737373] leading-[1.6]">
						<p class="font-semibold text-[#252B42] mb-[6px]">Pagamento tramite bonifico bancario</p>
						<p>Dopo aver confermato l'ordine, riceverai le coordinate bancarie via email.</p>
					</div>

					<div v-if="paymentMethod === 'paypal'" class="bg-white rounded-[50px] p-[16px] text-[0.8125rem] text-[#737373] leading-[1.6]">
						<p class="font-semibold text-[#252B42] mb-[6px]">Pagamento tramite PayPal</p>
						<p>Il pagamento tramite PayPal sarà disponibile a breve. Seleziona un altro metodo di pagamento per procedere.</p>
					</div>

					<div v-if="paymentMethod === 'wallet'" class="bg-white rounded-[50px] p-[16px] text-[0.8125rem] text-[#737373] leading-[1.6]">
						<p class="font-semibold text-[#252B42] mb-[6px]">Pagamento tramite Wallet</p>
						<p>Saldo disponibile: <span class="font-bold text-[#095866]">{{ walletFormatted }}</span></p>
						<p v-if="walletLoaded && !walletSufficient" class="text-red-500 mt-[8px] font-medium">Saldo insufficiente. Ricarica il tuo wallet per procedere.</p>
						<p v-else-if="walletLoaded" class="text-emerald-600 mt-[8px]">Saldo sufficiente per completare il pagamento.</p>
					</div>

					<div class="mt-[20px]">
						<label class="flex items-start gap-[10px] cursor-pointer py-[4px]">
							<input type="checkbox" v-model="termsAccepted" class="w-[20px] h-[20px] min-w-[20px] accent-[#095866] mt-[2px] shrink-0 cursor-pointer" />
							<span class="text-[0.8125rem] text-[#737373] leading-[1.5]">Ho letto e accetto i <NuxtLink to="/termini" class="text-[#095866] hover:underline font-medium">Termini e condizioni</NuxtLink></span>
						</label>
					</div>
				</div>

				<p v-if="paymentError" class="text-red-500 text-[0.875rem] bg-red-50 p-[14px] rounded-[50px] border border-red-200 flex items-center gap-[10px]">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
					<span>{{ paymentError }}</span>
				</p>

				<!-- Payment progress indicator -->
				<div v-if="isProcessing && paymentStep" class="bg-blue-50 border border-blue-200 rounded-[50px] p-[14px] flex items-center gap-[10px]">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 animate-spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
					<span class="text-[0.875rem] text-blue-700 font-medium">{{ paymentStep }}</span>
				</div>

				<div class="flex flex-col items-center gap-[8px]">
					<button type="button" @click="confirmPayment" :disabled="!canPay"
						:class="[
							'w-full tablet:w-auto px-[24px] tablet:px-[40px] py-[16px] min-h-[52px] rounded-[30px] text-white font-semibold text-[1rem] transition-[background-color,opacity,transform] flex items-center justify-center gap-[8px]',
							canPay ? 'bg-[#E44203] hover:opacity-90 cursor-pointer' : 'bg-gray-300 cursor-not-allowed',
						]">
						<svg v-if="isProcessing" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
						<svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
						<span v-if="isProcessing">Elaborazione...</span>
						<span v-else>Completa il pagamento {{ finalTotalFormatted }}</span>
					</button>
					<p v-if="!canPay && payButtonTooltip" class="text-[0.8125rem] text-[#737373]">{{ payButtonTooltip }}</p>
				</div>

				<!-- Confirmation Modal -->
				<Teleport to="body">
					<div v-if="showConfirmModal" class="fixed inset-0 z-[9999] flex items-center justify-center p-[20px] bg-black/50 backdrop-blur-sm" @click.self="showConfirmModal = false">
						<div class="bg-white rounded-[20px] p-[24px] max-w-[480px] w-full shadow-2xl animate-[scale-in_0.2s_ease-out]">
							<div class="flex items-center gap-[12px] mb-[16px]">
								<div class="w-[48px] h-[48px] bg-[#E44203]/10 rounded-full flex items-center justify-center shrink-0">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E44203" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
								</div>
								<h3 class="text-[1.25rem] font-bold text-[#252B42]">Conferma pagamento</h3>
							</div>
							<p class="text-[0.9375rem] text-[#737373] mb-[20px] leading-[1.6]">
								Stai per pagare <span class="font-bold text-[#252B42]">{{ finalTotalFormatted }}</span>
								<template v-if="paymentMethod === 'carta'">con carta di credito</template>
								<template v-else-if="paymentMethod === 'bonifico'">tramite bonifico bancario</template>
								<template v-else-if="paymentMethod === 'wallet'">con il tuo wallet</template>
								per <span class="font-bold text-[#252B42]">{{ totalPackages }} {{ totalPackages === 1 ? 'spedizione' : 'spedizioni' }}</span>.
							</p>
							<div class="flex gap-[12px]">
								<button type="button" @click="showConfirmModal = false" class="flex-1 px-[20px] py-[12px] min-h-[48px] border border-[#D0D0D0] text-[#737373] rounded-[50px] font-medium text-[0.9375rem] hover:bg-gray-50 transition cursor-pointer">
									Annulla
								</button>
								<button type="button" @click="proceedWithPayment" class="flex-1 px-[20px] py-[12px] min-h-[48px] bg-[#E44203] text-white rounded-[50px] font-semibold text-[0.9375rem] hover:opacity-90 transition cursor-pointer">
									Conferma
								</button>
							</div>
						</div>
					</div>
				</Teleport>
			</div>
		</div>
	</section>
</template>

<style scoped>
@keyframes scale-in {
	from {
		opacity: 0;
		transform: scale(0.95);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
}

@keyframes success-bounce {
	0% {
		opacity: 0;
		transform: scale(0);
	}
	50% {
		transform: scale(1.1);
	}
	100% {
		opacity: 1;
		transform: scale(1);
	}
}

@keyframes check-draw {
	0% {
		stroke-dasharray: 0 100;
		stroke-dashoffset: 0;
	}
	100% {
		stroke-dasharray: 100 100;
		stroke-dashoffset: 0;
	}
}
</style>
