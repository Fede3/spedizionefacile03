<!--
  FILE: pages/checkout.vue
  SCOPO: Checkout — pagamento spedizioni (Stripe carta/bonifico, wallet, coupon/referral).
  API: POST /api/stripe/create-order, POST /api/stripe/create-payment-intent,
       POST /api/stripe/order-paid, POST /api/coupon, POST /api/wallet/pay,
       GET /api/stripe-config, GET /api/wallet/balance, GET /api/referral/my-discount.
  COMPOSABLE: useCart (dati carrello), useSanctumAuth (utente autenticato).
  ROUTE: /checkout (protetta, middleware sanctum:auth).
  NOTE: Supporta ?order_id=XXX per pagamento ordine esistente.
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
onMounted(async () => {
	try {
		const { loadStripe } = await import('@stripe/stripe-js');
		const stripePromise = loadStripe(config.public.stripeKey);
		stripe = await stripePromise;
		stripeReady.value = true;
		// Se il metodo di pagamento selezionato e' carta e non c'e' una carta salvata, mostra il form Stripe
		if (paymentMethod.value === 'carta' && !defaultPayment.value?.card) {
			await mountCardElement();
		}
	} catch (e) {
		console.error('Stripe load error:', e);
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

// Quando l'utente sceglie di usare una nuova carta, monta l'elemento Stripe
watch(useNewCard, async (val) => {
	if (val && stripeReady.value) {
		await nextTick();
		await mountCardElement();
	}
});

// --- TERMINI E CONDIZIONI ---
const termsAccepted = ref(false);

// --- STATO DEL PAGAMENTO ---
const isProcessing = ref(false);      // Pagamento in corso
const paymentError = ref(null);       // Errore durante il pagamento
const paymentSuccess = ref(false);    // Pagamento completato con successo
const successOrderId = ref(null);     // ID dell'ordine pagato

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

	try {
		let orderIds = [];
		const isExisting = !!existingOrderId.value;

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
		};

		// Helper: processa il pagamento per un singolo ordine
		// Viene chiamato per ogni ordine quando ce ne sono piu' di uno
		const payOrder = async (orderId, isFirst) => {
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

				const { error, paymentIntent } = await stripe.confirmCardPayment(
					piResponse.client_secret,
					{ payment_method: { card: cardElement.value } }
				);

				if (error) {
					paymentError.value = error.message;
					return false;
				}

				if (paymentIntent.status === "succeeded") {
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
				} else {
					paymentError.value = "Stato pagamento: " + paymentIntent.status;
					return false;
				}
			}

			return false;
		};

		// Processa il pagamento per tutti gli ordini in sequenza
		for (let i = 0; i < orderIds.length; i++) {
			const success = await payOrder(orderIds[i], i === 0);
			if (!success) return;
		}

		await onPaymentSuccess();

	} catch (err) {
		console.error('Payment error:', err);
		paymentError.value = err?.response?._data?.error || err?.response?._data?.message || err?.data?.error || err?.message || "Errore durante il pagamento. Riprova.";
	} finally {
		isProcessing.value = false;
	}
};
</script>

<template>
	<section class="min-h-[600px] py-[30px] desktop:py-[50px] bg-[#F0F0F0]">
		<div class="my-container max-w-[1100px]">
			<!-- Steps -->
			<Steps :current-step="4" />

			<!-- Success -->
			<div v-if="paymentSuccess" class="max-w-[600px] mx-auto text-center py-[60px]">
				<div class="w-[80px] h-[80px] mx-auto mb-[20px] bg-emerald-100 rounded-full flex items-center justify-center">
					<Icon name="mdi:check-circle" class="text-[40px] text-emerald-500" />
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
					<NuxtLink to="/account/spedizioni" class="inline-flex items-center justify-center gap-[6px] px-[24px] py-[12px] min-h-[48px] bg-[#095866] text-white rounded-[10px] font-semibold text-[0.9375rem] hover:bg-[#074a56] transition">
						<Icon name="mdi:truck-fast-outline" class="text-[18px]" />
						Vedi le tue spedizioni
					</NuxtLink>
					<NuxtLink to="/" class="inline-flex items-center justify-center gap-[6px] px-[24px] py-[12px] min-h-[48px] border border-[#E9EBEC] text-[#737373] rounded-[10px] font-medium text-[0.9375rem] hover:bg-white transition">
						<Icon name="mdi:home-outline" class="text-[18px]" />
						Torna alla home
					</NuxtLink>
				</div>
			</div>

			<!-- Checkout form -->
			<div v-else class="max-w-[1050px] mx-auto space-y-[24px]">

				<!-- Riepilogo -->
				<div class="bg-[#E6E6E6] rounded-[20px] p-[16px_12px] tablet:p-[24px_20px] desktop:p-[30px_36px]">
					<!-- Header -->
					<div class="flex items-center justify-between mb-[20px]">
						<div class="flex items-center gap-[10px]">
							<div class="w-[36px] h-[36px] bg-[#095866] rounded-[10px] flex items-center justify-center shrink-0">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="22" height="18" rx="2"/><path d="M1 9h22"/></svg>
							</div>
							<div>
								<h2 class="text-[1.25rem] font-bold text-[#252B42] leading-tight">{{ displayPackages.length <= 1 ? 'Riepilogo ordine' : 'Riepilogo ordini' }}</h2>
								<p class="text-[0.8125rem] text-[#737373]">{{ totalPackages }} {{ totalPackages === 1 ? 'spedizione' : 'spedizioni' }}<span v-if="contentDescription"> &middot; {{ contentDescription }}</span></p>
							</div>
						</div>
						<NuxtLink v-if="!existingOrderId" to="/carrello" class="bg-[#E44203] text-white font-semibold text-[0.8125rem] px-[18px] py-[8px] rounded-[8px] hover:opacity-90 transition flex items-center gap-[6px]">
							<Icon name="mdi:pencil" class="text-[14px]" />
							Modifica
						</NuxtLink>
						<span v-else class="text-[0.8125rem] font-semibold text-[#737373] bg-white px-[14px] py-[6px] rounded-[8px]">
							Ordine #{{ existingOrderId }}
						</span>
					</div>

					<!-- Merge info banner -->
					<div v-if="!existingOrderId && hasMultipleGroups" class="bg-[#095866]/10 border border-[#095866]/20 rounded-[10px] p-[12px_16px] mb-[14px] flex items-center gap-[10px]">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>
						<p class="text-[0.8125rem] text-[#095866] font-medium">
							Verranno creati <span class="font-bold">{{ mergeGroupsCount }} ordini separati</span> in base agli indirizzi. I pacchi con stessi indirizzi saranno uniti in una singola spedizione.
						</p>
					</div>
					<div v-else-if="!existingOrderId && addressGroups.some(g => g.count > 1)" class="bg-emerald-50 border border-emerald-200 rounded-[10px] p-[12px_16px] mb-[14px] flex items-center gap-[10px]">
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

					<div v-if="couponApplied" class="flex items-center gap-[12px] bg-emerald-50 border border-emerald-200 rounded-[10px] p-[14px]">
						<Icon name="mdi:check-circle" class="text-[24px] text-emerald-600 shrink-0" />
						<div class="flex-1">
							<p class="text-[0.9375rem] font-semibold text-emerald-800">Codice {{ couponApplied.code }} applicato!</p>
							<p class="text-[0.8125rem] text-emerald-700">Sconto del {{ couponApplied.discount_percent }}% da {{ couponApplied.pro_name }}</p>
						</div>
						<button type="button" @click="removeCoupon" class="inline-flex items-center gap-[4px] text-[0.8125rem] text-red-500 hover:underline font-medium cursor-pointer"><Icon name="mdi:close" class="text-[14px]" />Rimuovi</button>
					</div>
					<div v-else class="flex flex-col tablet:flex-row gap-[12px]">
						<input
							v-model="couponCode"
							type="text"
							placeholder="Inserisci codice promozionale..."
							maxlength="20"
							class="flex-1 bg-white p-[12px_16px] border border-[#D0D0D0] rounded-[10px] text-[1rem] placeholder:text-[#A0A5AB] uppercase tracking-wider focus:border-[#095866] focus:outline-none"
							@keyup.enter="validateCoupon" />
						<button
							type="button"
							@click="validateCoupon"
							:disabled="couponLoading || !couponCode.trim()"
							class="inline-flex items-center justify-center gap-[6px] px-[24px] min-h-[48px] bg-[#095866] text-white rounded-[10px] font-semibold text-[0.875rem] hover:bg-[#074a56] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
							<Icon name="mdi:tag-outline" class="text-[18px]" />
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
							<div class="flex items-center gap-[12px] p-[14px] bg-white rounded-[10px] border border-[#D0D0D0]">
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
							<div id="card-element" class="p-[14px] bg-white border border-[#D0D0D0] rounded-[10px]"></div>
							<p v-if="cardError" class="text-red-500 text-[0.75rem] mt-[6px]">{{ cardError }}</p>
						</div>
					</div>

					<div v-if="paymentMethod === 'bonifico'" class="bg-white rounded-[10px] p-[16px] text-[0.8125rem] text-[#737373] leading-[1.6]">
						<p class="font-semibold text-[#252B42] mb-[6px]">Pagamento tramite bonifico bancario</p>
						<p>Dopo aver confermato l'ordine, riceverai le coordinate bancarie via email.</p>
					</div>

					<div v-if="paymentMethod === 'paypal'" class="bg-white rounded-[10px] p-[16px] text-[0.8125rem] text-[#737373] leading-[1.6]">
						<p class="font-semibold text-[#252B42] mb-[6px]">Pagamento tramite PayPal</p>
						<p>Il pagamento tramite PayPal sarà disponibile a breve. Seleziona un altro metodo di pagamento per procedere.</p>
					</div>

					<div v-if="paymentMethod === 'wallet'" class="bg-white rounded-[10px] p-[16px] text-[0.8125rem] text-[#737373] leading-[1.6]">
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

				<p v-if="paymentError" class="text-red-500 text-[0.875rem] bg-red-50 p-[14px] rounded-[12px] border border-red-200">{{ paymentError }}</p>

				<div class="flex flex-col items-center gap-[8px]">
					<button type="button" @click="processPayment" :disabled="!canPay"
						:class="[
							'w-full tablet:w-auto px-[24px] tablet:px-[40px] py-[16px] min-h-[52px] rounded-[30px] text-white font-semibold text-[1rem] transition-[background-color,opacity,transform] flex items-center justify-center gap-[8px]',
							canPay ? 'bg-[#E44203] hover:opacity-90 cursor-pointer' : 'bg-gray-300 cursor-not-allowed',
						]">
						<Icon v-if="isProcessing" name="mdi:loading" class="text-[20px] animate-spin" />
						<Icon v-else name="mdi:lock-outline" class="text-[18px]" />
						<span v-if="isProcessing">Elaborazione...</span>
						<span v-else>Completa il pagamento {{ finalTotalFormatted }}</span>
					</button>
					<p v-if="!canPay && payButtonTooltip" class="text-[0.8125rem] text-[#737373]">{{ payButtonTooltip }}</p>
				</div>
			</div>
		</div>
	</section>
</template>
