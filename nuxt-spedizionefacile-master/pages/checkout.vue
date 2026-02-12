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
	if (!cents) return '0,00 €';
	const euros = Number(cents) / 100;
	return euros.toFixed(2).replace('.', ',') + ' €';
};

const getTotal = computed(() => cart.value?.meta?.total || '0,00 €');

const getNumberTotal = computed(() => {
	return Number(String(getTotal.value).replace("€", "").replace(",", ".").trim());
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

// Use saved card vs new
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
	return false;
});

const processPayment = async () => {
	if (!canPay.value) return;
	isProcessing.value = true;
	paymentError.value = null;

	try {
		// 1. Create order
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
			// Pay with saved card
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
					body: {
						order_id: orderId,
						ext_id: payResult.payment_intent_id,
					},
				});

				paymentSuccess.value = true;
				successOrderId.value = orderId;
				await refreshCart();
			} else {
				paymentError.value = "Pagamento non riuscito. Stato: " + payResult.status;
			}
			return;
		}

		// New card: create PaymentIntent then confirm
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
				{
					payment_method: { card: cardElement.value },
				}
			);

			if (error) {
				paymentError.value = error.message;
				return;
			}

			if (paymentIntent.status === "succeeded") {
				await sanctum("/api/stripe/order-paid", {
					method: "POST",
					body: {
						order_id: orderId,
						ext_id: paymentIntent.id,
					},
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
	<section class="min-h-[600px] py-[30px] desktop:py-[50px] bg-[#F8F9FB]">
		<div class="my-container">
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
					Il pagamento è stato elaborato correttamente. Puoi seguire lo stato della spedizione dalla tua area personale.
				</p>
				<div class="flex gap-[12px] justify-center">
					<NuxtLink
						to="/account/spedizioni"
						class="inline-flex items-center gap-[6px] px-[24px] py-[12px] bg-[#095866] text-white rounded-[10px] font-semibold text-[0.9375rem] hover:bg-[#0a7a8c] transition">
						Vedi le tue spedizioni
					</NuxtLink>
					<NuxtLink
						to="/"
						class="inline-flex items-center gap-[6px] px-[24px] py-[12px] border border-[#E9EBEC] text-[#737373] rounded-[10px] font-medium text-[0.9375rem] hover:bg-white transition">
						Torna alla home
					</NuxtLink>
				</div>
			</div>

			<!-- Checkout form -->
			<div v-else class="max-w-[900px] mx-auto">
				<h1 class="text-[1.5rem] desktop:text-[1.75rem] font-bold text-[#252B42] mb-[24px]">Checkout</h1>

				<div class="grid desktop:grid-cols-[1fr_380px] gap-[24px]">
					<!-- Left column -->
					<div class="space-y-[20px]">
						<!-- Riepilogo ordine -->
						<div class="bg-white rounded-[16px] border border-[#E9EBEC] p-[24px]">
							<h2 class="text-[1rem] font-bold text-[#252B42] mb-[16px]">Riepilogo ordine</h2>
							<div class="space-y-[10px]">
								<div
									v-for="item in cart?.data"
									:key="item.id"
									class="flex items-center justify-between py-[10px] border-b border-[#F0F0F0] last:border-0">
									<div class="flex items-center gap-[12px] flex-1 min-w-0">
										<div class="w-[36px] h-[36px] rounded-[8px] bg-[#095866]/10 flex items-center justify-center shrink-0">
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2"><rect x="1" y="3" width="22" height="18" rx="2"/><path d="M1 9h22"/></svg>
										</div>
										<div class="min-w-0">
											<p class="text-[0.8125rem] font-semibold text-[#252B42] truncate">
												{{ item.origin_address?.city }} &rarr; {{ item.destination_address?.city }}
											</p>
											<p class="text-[0.75rem] text-[#737373]">{{ item.quantity }}x &ndash; {{ item.weight }} kg</p>
										</div>
									</div>
									<span class="text-[0.875rem] font-bold text-[#252B42] shrink-0 ml-[12px]">{{ formatPrice(item.single_price) }}</span>
								</div>
							</div>
						</div>

						<!-- Dettagli fatturazione -->
						<div class="bg-white rounded-[16px] border border-[#E9EBEC] p-[24px]">
							<h2 class="text-[1rem] font-bold text-[#252B42] mb-[16px]">Dettagli fatturazione</h2>
							<div class="flex gap-[8px] mb-[16px]">
								<button
									type="button"
									@click="fatturazioneType = 'ricevuta'"
									:class="fatturazioneType === 'ricevuta' ? 'bg-[#095866] text-white' : 'bg-[#F0F0F0] text-[#737373] hover:bg-[#E0E0E0]'"
									class="px-[20px] py-[10px] rounded-[10px] text-[0.8125rem] font-semibold cursor-pointer transition-colors">
									Ricevuta
								</button>
								<button
									type="button"
									@click="fatturazioneType = 'fattura'"
									:class="fatturazioneType === 'fattura' ? 'bg-[#095866] text-white' : 'bg-[#F0F0F0] text-[#737373] hover:bg-[#E0E0E0]'"
									class="px-[20px] py-[10px] rounded-[10px] text-[0.8125rem] font-semibold cursor-pointer transition-colors">
									Fattura
								</button>
							</div>
							<div v-if="fatturazioneType === 'ricevuta'" class="text-[0.875rem] text-[#737373]">
								<p>La ricevuta verrà inviata a: <span class="font-semibold text-[#252B42]">{{ user?.email }}</span></p>
							</div>
							<div v-else class="space-y-[12px]">
								<div>
									<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[4px]">Ragione Sociale *</label>
									<input v-model="fatturaData.ragione_sociale" type="text" placeholder="Ragione Sociale" class="w-full bg-[#F8F9FB] p-[10px_14px] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] placeholder:text-[#A0A5AB] focus:border-[#095866] focus:outline-none" />
								</div>
								<div class="grid grid-cols-2 gap-[12px]">
									<div>
										<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[4px]">P. IVA *</label>
										<input v-model="fatturaData.p_iva" type="text" placeholder="P. IVA" class="w-full bg-[#F8F9FB] p-[10px_14px] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] placeholder:text-[#A0A5AB] focus:border-[#095866] focus:outline-none" />
									</div>
									<div>
										<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[4px]">Codice Fiscale</label>
										<input v-model="fatturaData.codice_fiscale" type="text" placeholder="CF" class="w-full bg-[#F8F9FB] p-[10px_14px] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] placeholder:text-[#A0A5AB] focus:border-[#095866] focus:outline-none" />
									</div>
								</div>
								<div>
									<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[4px]">Indirizzo</label>
									<input v-model="fatturaData.indirizzo" type="text" placeholder="Indirizzo completo" class="w-full bg-[#F8F9FB] p-[10px_14px] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] placeholder:text-[#A0A5AB] focus:border-[#095866] focus:outline-none" />
								</div>
								<div class="grid grid-cols-2 gap-[12px]">
									<div>
										<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[4px]">PEC</label>
										<input v-model="fatturaData.pec" type="email" placeholder="email@pec.it" class="w-full bg-[#F8F9FB] p-[10px_14px] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] placeholder:text-[#A0A5AB] focus:border-[#095866] focus:outline-none" />
									</div>
									<div>
										<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[4px]">Codice SDI</label>
										<input v-model="fatturaData.codice_sdi" type="text" placeholder="0000000" maxlength="7" class="w-full bg-[#F8F9FB] p-[10px_14px] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] placeholder:text-[#A0A5AB] focus:border-[#095866] focus:outline-none" />
									</div>
								</div>
							</div>
						</div>

						<!-- Metodo di pagamento -->
						<div class="bg-white rounded-[16px] border border-[#E9EBEC] p-[24px]">
							<h2 class="text-[1rem] font-bold text-[#252B42] mb-[16px]">Metodo di pagamento</h2>
							<div class="flex gap-[8px] mb-[20px]">
								<button
									type="button"
									@click="paymentMethod = 'carta'"
									:class="paymentMethod === 'carta' ? 'bg-[#095866] text-white border-[#095866]' : 'bg-white text-[#737373] border-[#E9EBEC] hover:border-[#095866]'"
									class="flex items-center gap-[6px] px-[16px] py-[10px] rounded-[10px] text-[0.8125rem] font-semibold cursor-pointer transition-colors border">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
									Carta
								</button>
								<button
									type="button"
									@click="paymentMethod = 'bonifico'"
									:class="paymentMethod === 'bonifico' ? 'bg-[#095866] text-white border-[#095866]' : 'bg-white text-[#737373] border-[#E9EBEC] hover:border-[#095866]'"
									class="flex items-center gap-[6px] px-[16px] py-[10px] rounded-[10px] text-[0.8125rem] font-semibold cursor-pointer transition-colors border">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 10h20"/></svg>
									Bonifico
								</button>
							</div>

							<div v-if="paymentMethod === 'carta'">
								<div v-if="defaultPayment?.card && !useNewCard" class="mb-[16px]">
									<div class="flex items-center gap-[12px] p-[14px] bg-[#F8F9FB] rounded-[10px] border border-[#E9EBEC]">
										<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
										<div class="flex-1">
											<p class="text-[0.875rem] font-semibold text-[#252B42]">
												{{ defaultPayment.card.brand?.toUpperCase() }} **** {{ defaultPayment.card.last4 }}
											</p>
											<p class="text-[0.75rem] text-[#737373]">Scade {{ defaultPayment.card.exp_month }}/{{ defaultPayment.card.exp_year }}</p>
										</div>
										<span class="px-[8px] py-[2px] rounded-full bg-emerald-100 text-emerald-700 text-[0.6875rem] font-medium">Predefinita</span>
									</div>
									<button type="button" @click="useNewCard = true" class="mt-[10px] text-[0.8125rem] text-[#095866] hover:underline cursor-pointer font-medium">
										Usa una nuova carta
									</button>
								</div>

								<div v-if="!defaultPayment?.card || useNewCard">
									<div v-if="useNewCard && defaultPayment?.card" class="mb-[10px]">
										<button type="button" @click="useNewCard = false" class="text-[0.8125rem] text-[#095866] hover:underline cursor-pointer font-medium">
											&larr; Usa carta salvata
										</button>
									</div>
									<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[8px]">Dati carta</label>
									<div id="card-element" class="p-[14px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[10px]"></div>
									<p v-if="cardError" class="text-red-500 text-[0.75rem] mt-[6px]">{{ cardError }}</p>
								</div>
							</div>

							<div v-if="paymentMethod === 'bonifico'" class="bg-[#F8F9FB] rounded-[10px] p-[16px] text-[0.8125rem] text-[#737373] leading-[1.6]">
								<p class="font-semibold text-[#252B42] mb-[6px]">Pagamento tramite bonifico bancario</p>
								<p>Dopo aver confermato l'ordine, riceverai le coordinate bancarie via email. Il tuo ordine verrà processato non appena riceveremo il pagamento.</p>
							</div>
						</div>
					</div>

					<!-- Right column - Summary -->
					<div>
						<div class="bg-white rounded-[16px] border border-[#E9EBEC] p-[24px] sticky top-[100px]">
							<h2 class="text-[1rem] font-bold text-[#252B42] mb-[16px]">Riepilogo</h2>
							<div class="space-y-[8px] mb-[16px]">
								<div class="flex justify-between text-[0.875rem]">
									<span class="text-[#737373]">Spedizioni ({{ cart?.data?.length }})</span>
									<span class="font-semibold text-[#252B42]">{{ getTotal }}</span>
								</div>
								<div class="flex justify-between text-[0.875rem]">
									<span class="text-[#737373]">IVA inclusa</span>
									<span class="text-[#737373]">-</span>
								</div>
							</div>
							<div class="flex justify-between pt-[14px] border-t border-[#E9EBEC] mb-[20px]">
								<span class="text-[1rem] font-bold text-[#252B42]">Totale</span>
								<span class="text-[1.25rem] font-bold text-[#252B42]">{{ getTotal }}</span>
							</div>
							<div class="mb-[16px]">
								<label class="flex items-start gap-[8px] cursor-pointer">
									<input type="checkbox" v-model="termsAccepted" class="w-[18px] h-[18px] accent-[#095866] mt-[2px] shrink-0 cursor-pointer" />
									<span class="text-[0.8125rem] text-[#737373] leading-[1.5]">
										Accetto i <NuxtLink to="/termini" class="text-[#095866] hover:underline font-medium">Termini e le Condizioni</NuxtLink> e la <NuxtLink to="/privacy" class="text-[#095866] hover:underline font-medium">Privacy Policy</NuxtLink>
									</span>
								</label>
							</div>
							<p v-if="paymentError" class="text-red-500 text-[0.8125rem] mb-[12px] bg-red-50 p-[10px] rounded-[8px]">
								{{ paymentError }}
							</p>
							<button
								type="button"
								@click="processPayment"
								:disabled="!canPay"
								:class="[
									'w-full py-[14px] rounded-[12px] text-white font-semibold text-[0.9375rem] transition-all flex items-center justify-center gap-[8px]',
									canPay ? 'bg-[#E44203] hover:opacity-90 cursor-pointer' : 'bg-gray-300 cursor-not-allowed',
								]">
								<svg v-if="isProcessing" class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
								<span v-if="isProcessing">Elaborazione...</span>
								<span v-else>Completa il pagamento</span>
							</button>
							<p class="text-center text-[0.6875rem] text-[#A0A5AB] mt-[10px]">
								Pagamento sicuro tramite Stripe
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>
