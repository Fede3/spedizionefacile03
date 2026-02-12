<script setup>
import { loadStripe } from "@stripe/stripe-js";

const { user } = useSanctumAuth();
const { cart, refresh: refreshCart } = useCart();
const router = useRouter();
const sanctum = useSanctumClient();
const config = useRuntimeConfig();

definePageMeta({
	middleware: ["sanctum:auth"],
});

// Check cart not empty
const checkCart = () => {
	if (!cart.value || cart.value.data?.length === 0) {
		return navigateTo("/carrello");
	}
};
await checkCart();

// Stripe setup
const stripePromise = loadStripe(config.public.stripeKey);
const stripe = await stripePromise;

// Saved card
const { data: defaultPayment } = useSanctumFetch("/api/stripe/default-payment-method");

// Price helper
const formatPrice = (cents) => {
	if (!cents && cents !== 0) return '0€';
	const euros = Number(cents) / 100;
	return euros.toFixed(2).replace('.', ',') + '€';
};

const getTotal = computed(() => cart.value?.meta?.total || '0,00€');

const getNumberTotal = computed(() => {
	return Number(String(getTotal.value).replace("€", "").replace(",", ".").trim());
});

const totalPackages = computed(() => {
	if (!cart.value?.data) return 0;
	return cart.value.data.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
});

// Content description from packages
const contentDescription = computed(() => {
	if (!cart.value?.data?.length) return '';
	const types = cart.value.data.map(item => item.package_type || 'Pacco').filter(Boolean);
	return [...new Set(types)].join(', ');
});

// Fatturazione
const fatturazioneType = ref('ricevuta');
const fatturaData = ref({
	ragione_sociale: '',
	p_iva: '',
	codice_fiscale: '',
	indirizzo: '',
	pec: '',
	codice_sdi: '',
});

// Payment method selection
const paymentMethod = ref('carta');

// Stripe card element
const cardElement = ref(null);
const cardMounted = ref(false);
const cardComplete = ref(false);
const cardError = ref(null);

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

watch(paymentMethod, async (val) => {
	if (val === 'carta' && !defaultPayment.value?.card) {
		await mountCardElement();
	}
});

const useNewCard = ref(false);

watch(useNewCard, async (val) => {
	if (val) {
		await nextTick();
		await mountCardElement();
	}
});

// Terms
const termsAccepted = ref(false);

// Payment state
const isProcessing = ref(false);
const paymentError = ref(null);
const paymentSuccess = ref(false);
const successOrderId = ref(null);

const canPay = computed(() => {
	if (!termsAccepted.value) return false;
	if (isProcessing.value) return false;
	if (paymentMethod.value === 'carta') {
		if (defaultPayment.value?.card && !useNewCard.value) return true;
		return cardComplete.value;
	}
	if (paymentMethod.value === 'bonifico') return true;
	if (paymentMethod.value === 'paypal') return true;
	return false;
});

const processPayment = async () => {
	if (!canPay.value) return;
	isProcessing.value = true;
	paymentError.value = null;

	try {
		const orderResponse = await sanctum("/api/stripe/create-order", {
			method: "POST",
			body: { subtotal: Math.round(getNumberTotal.value * 100) },
		});

		const orderId = orderResponse.order_id;

		if (paymentMethod.value === 'bonifico') {
			paymentSuccess.value = true;
			successOrderId.value = orderId;
			await refreshCart();
			return;
		}

		if (paymentMethod.value === 'carta' && defaultPayment.value?.card && !useNewCard.value) {
			const payResult = await sanctum("/api/stripe/create-payment", {
				method: "POST",
				body: {
					order_id: orderId,
					currency: "eur",
					customer_id: user.value.customer_id,
					payment_method_id: defaultPayment.value.card.id,
				},
			});

			if (payResult.status === "succeeded") {
				await sanctum("/api/stripe/order-paid", {
					method: "POST",
					body: { order_id: orderId, ext_id: payResult.payment_intent_id },
				});
				paymentSuccess.value = true;
				successOrderId.value = orderId;
				await refreshCart();
			} else {
				paymentError.value = "Pagamento non riuscito. Stato: " + payResult.status;
			}
			return;
		}

		if (paymentMethod.value === 'carta' && (useNewCard.value || !defaultPayment.value?.card)) {
			const piResponse = await sanctum("/api/stripe/create-payment-intent", {
				method: "POST",
				body: { order_id: orderId },
			});

			if (piResponse.error) {
				paymentError.value = piResponse.error;
				return;
			}

			const { error, paymentIntent } = await stripe.confirmCardPayment(
				piResponse.client_secret,
				{ payment_method: { card: cardElement.value } }
			);

			if (error) {
				paymentError.value = error.message;
				return;
			}

			if (paymentIntent.status === "succeeded") {
				await sanctum("/api/stripe/order-paid", {
					method: "POST",
					body: { order_id: orderId, ext_id: paymentIntent.id },
				});
				paymentSuccess.value = true;
				successOrderId.value = orderId;
				await refreshCart();
			} else {
				paymentError.value = "Stato pagamento: " + paymentIntent.status;
			}
			return;
		}

	} catch (err) {
		console.error('Payment error:', err);
		paymentError.value = err?.response?._data?.error || err?.data?.error || err?.message || "Errore durante il pagamento. Riprova.";
	} finally {
		isProcessing.value = false;
	}
};

onMounted(async () => {
	if (paymentMethod.value === 'carta' && !defaultPayment.value?.card) {
		await mountCardElement();
	}
});
</script>

<template>
	<section class="min-h-[600px] py-[30px] desktop:py-[50px] bg-[#F0F0F0]">
		<div class="my-container max-w-[1100px]">
			<!-- Steps -->
			<Steps :current-step="4" />

			<!-- Success -->
			<div v-if="paymentSuccess" class="max-w-[600px] mx-auto text-center py-[60px]">
				<div class="w-[80px] h-[80px] mx-auto mb-[20px] bg-emerald-100 rounded-full flex items-center justify-center">
					<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
				</div>
				<h1 class="text-[1.75rem] font-bold text-[#252B42] mb-[12px]">Pagamento completato!</h1>
				<p class="text-[#737373] text-[1rem] leading-[1.6] mb-[8px]">
					Il tuo ordine <span class="font-semibold text-[#252B42]">#{{ successOrderId }}</span> è stato creato con successo.
				</p>
				<p v-if="paymentMethod === 'bonifico'" class="text-[#737373] text-[0.9375rem] mb-[24px]">
					Riceverai le coordinate bancarie via email per completare il pagamento.
				</p>
				<p v-else class="text-[#737373] text-[0.9375rem] mb-[24px]">
					Il pagamento è stato elaborato correttamente.
				</p>
				<div class="flex gap-[12px] justify-center">
					<NuxtLink to="/account/spedizioni" class="inline-flex items-center gap-[6px] px-[24px] py-[12px] bg-[#095866] text-white rounded-[10px] font-semibold text-[0.9375rem] hover:bg-[#0a7a8c] transition">
						Vedi le tue spedizioni
					</NuxtLink>
					<NuxtLink to="/" class="inline-flex items-center gap-[6px] px-[24px] py-[12px] border border-[#E9EBEC] text-[#737373] rounded-[10px] font-medium text-[0.9375rem] hover:bg-white transition">
						Torna alla home
					</NuxtLink>
				</div>
			</div>

			<!-- Checkout form -->
			<div v-else class="max-w-[1050px] mx-auto space-y-[24px]">

				<!-- Riepilogo -->
				<div class="bg-[#E6E6E6] rounded-[20px] p-[30px_36px]">
					<div class="flex items-center justify-between mb-[16px]">
						<h2 class="text-[1.25rem] font-bold text-[#252B42]">Riepilogo</h2>
						<NuxtLink to="/carrello" class="bg-[#E44203] text-white font-semibold text-[0.875rem] px-[20px] py-[8px] rounded-[8px] hover:opacity-90 transition">
							Modifica
						</NuxtLink>
					</div>

					<!-- Table header -->
					<div class="flex items-center justify-between py-[8px] border-b border-[#C0C0C0] text-[0.875rem] font-bold text-[#252B42]">
						<span>Prodotto</span>
						<span>Importo totale</span>
					</div>

					<!-- Spedizioni -->
					<div class="flex items-center justify-between py-[10px] border-b border-[#E0E0E0]">
						<span class="text-[0.9375rem] text-[#252B42] flex items-center gap-[6px]">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2"><rect x="1" y="3" width="22" height="18" rx="2"/><path d="M1 9h22"/></svg>
							Spedizioni x{{ totalPackages }}
						</span>
						<span class="text-[0.9375rem] font-semibold text-[#252B42]">{{ getTotal }}</span>
					</div>

					<!-- Servizi -->
					<div class="flex items-center justify-between py-[10px] border-b border-[#E0E0E0]">
						<span class="text-[0.9375rem] text-[#252B42]">Servizi</span>
						<span class="text-[0.9375rem] font-semibold text-[#252B42]">{{ getTotal }}</span>
					</div>

					<!-- Totale -->
					<div class="flex items-center justify-between py-[10px]">
						<span class="text-[1rem] font-bold text-[#252B42]">Totale</span>
						<span class="text-[1rem] font-bold text-[#252B42]">{{ getTotal }}</span>
					</div>

					<div v-if="contentDescription" class="mt-[12px] text-[0.875rem] text-[#252B42]">
						Contenuto: <span class="font-bold">{{ contentDescription }}</span>
					</div>
				</div>

				<!-- Dettagli fatturazione -->
				<div class="bg-[#E6E6E6] rounded-[20px] p-[30px_36px]">
					<h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[16px]">Dettagli fatturazione</h2>

					<div class="flex items-center justify-between mb-[8px]">
						<div>
							<p class="text-[0.9375rem] text-[#252B42]">Importo servizi fatturati:</p>
							<p class="text-[0.9375rem] font-semibold text-[#252B42]">{{ getTotal }}</p>
						</div>
						<span class="text-[0.9375rem] font-semibold text-[#252B42]">{{ getTotal }}</span>
					</div>

					<div class="flex gap-[12px] mt-[20px]">
						<button type="button" @click="fatturazioneType = 'ricevuta'"
							:class="fatturazioneType === 'ricevuta' ? 'bg-white border-[#252B42] text-[#252B42]' : 'bg-white border-[#D0D0D0] text-[#737373]'"
							class="px-[24px] py-[10px] rounded-[8px] text-[0.875rem] font-medium cursor-pointer transition-colors border">
							Ricevuta
						</button>
						<button type="button" @click="fatturazioneType = 'fattura'"
							:class="fatturazioneType === 'fattura' ? 'bg-white border-[#252B42] text-[#252B42]' : 'bg-white border-[#D0D0D0] text-[#737373]'"
							class="px-[24px] py-[10px] rounded-[8px] text-[0.875rem] font-medium cursor-pointer transition-colors border">
							Fattura
						</button>
					</div>

					<div v-if="fatturazioneType === 'fattura'" class="space-y-[12px] mt-[16px]">
						<div>
							<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[4px]">Ragione Sociale *</label>
							<input v-model="fatturaData.ragione_sociale" type="text" placeholder="Ragione Sociale" class="w-full bg-white p-[10px_14px] border border-[#D0D0D0] rounded-[8px] text-[0.875rem] placeholder:text-[#A0A5AB]" />
						</div>
						<div class="grid grid-cols-2 gap-[12px]">
							<div>
								<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[4px]">P. IVA *</label>
								<input v-model="fatturaData.p_iva" type="text" placeholder="P. IVA" class="w-full bg-white p-[10px_14px] border border-[#D0D0D0] rounded-[8px] text-[0.875rem] placeholder:text-[#A0A5AB]" />
							</div>
							<div>
								<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[4px]">Codice Fiscale</label>
								<input v-model="fatturaData.codice_fiscale" type="text" placeholder="CF" class="w-full bg-white p-[10px_14px] border border-[#D0D0D0] rounded-[8px] text-[0.875rem] placeholder:text-[#A0A5AB]" />
							</div>
						</div>
						<div>
							<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[4px]">Indirizzo</label>
							<input v-model="fatturaData.indirizzo" type="text" placeholder="Indirizzo completo" class="w-full bg-white p-[10px_14px] border border-[#D0D0D0] rounded-[8px] text-[0.875rem] placeholder:text-[#A0A5AB]" />
						</div>
						<div class="grid grid-cols-2 gap-[12px]">
							<div>
								<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[4px]">PEC</label>
								<input v-model="fatturaData.pec" type="email" placeholder="email@pec.it" class="w-full bg-white p-[10px_14px] border border-[#D0D0D0] rounded-[8px] text-[0.875rem] placeholder:text-[#A0A5AB]" />
							</div>
							<div>
								<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[4px]">Codice SDI</label>
								<input v-model="fatturaData.codice_sdi" type="text" placeholder="0000000" maxlength="7" class="w-full bg-white p-[10px_14px] border border-[#D0D0D0] rounded-[8px] text-[0.875rem] placeholder:text-[#A0A5AB]" />
							</div>
						</div>
					</div>
				</div>

				<!-- Metodi di pagamento -->
				<div class="bg-[#E6E6E6] rounded-[20px] p-[30px_36px]">
					<h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[20px]">Metodi di pagamento</h2>

					<div class="flex flex-wrap gap-[12px] mb-[20px]">
						<button type="button" @click="paymentMethod = 'bonifico'"
							:class="paymentMethod === 'bonifico' ? 'border-[#252B42] bg-white' : 'border-[#D0D0D0] bg-white'"
							class="flex items-center gap-[8px] px-[20px] py-[12px] rounded-[8px] text-[0.875rem] font-medium cursor-pointer transition-colors border">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 10h20"/></svg>
							<span class="text-[#252B42]">Bonifico bancario</span>
						</button>
						<button type="button" @click="paymentMethod = 'paypal'"
							:class="paymentMethod === 'paypal' ? 'border-[#252B42] bg-white' : 'border-[#D0D0D0] bg-white'"
							class="flex items-center gap-[8px] px-[20px] py-[12px] rounded-[8px] text-[0.875rem] font-medium cursor-pointer transition-colors border">
							<span class="text-[#003087] font-bold text-[0.875rem]">P</span>
							<span class="text-[#252B42]">PayPal</span>
						</button>
						<button type="button" @click="paymentMethod = 'carta'"
							:class="paymentMethod === 'carta' ? 'border-[#252B42] bg-white' : 'border-[#D0D0D0] bg-white'"
							class="flex items-center gap-[8px] px-[20px] py-[12px] rounded-[8px] text-[0.875rem] font-medium cursor-pointer transition-colors border">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
							<span class="text-[#252B42]">Carta di credito/debito</span>
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
						<p>Verrai reindirizzato a PayPal per completare il pagamento in sicurezza.</p>
					</div>

					<div class="mt-[20px]">
						<label class="flex items-start gap-[8px] cursor-pointer">
							<input type="checkbox" v-model="termsAccepted" class="w-[18px] h-[18px] accent-[#095866] mt-[2px] shrink-0 cursor-pointer" />
							<span class="text-[0.8125rem] text-[#737373] leading-[1.5]">Ho letto e accetto i <NuxtLink to="/termini" class="text-[#095866] hover:underline font-medium">Termini e condizioni</NuxtLink></span>
						</label>
					</div>
				</div>

				<p v-if="paymentError" class="text-red-500 text-[0.875rem] bg-red-50 p-[14px] rounded-[12px] border border-red-200">{{ paymentError }}</p>

				<div class="flex justify-center">
					<button type="button" @click="processPayment" :disabled="!canPay"
						:class="[
							'px-[40px] py-[14px] rounded-[30px] text-white font-semibold text-[1rem] transition-all flex items-center justify-center gap-[8px]',
							canPay ? 'bg-[#E44203] hover:opacity-90 cursor-pointer' : 'bg-gray-300 cursor-not-allowed',
						]">
						<svg v-if="isProcessing" class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
						<span v-if="isProcessing">Elaborazione...</span>
						<span v-else>Completa il pagamento</span>
					</button>
				</div>
			</div>
		</div>
	</section>
</template>
