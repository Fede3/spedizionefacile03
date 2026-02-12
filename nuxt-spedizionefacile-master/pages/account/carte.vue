<script setup>
import { loadStripe } from "@stripe/stripe-js";

definePageMeta({
	middleware: ["sanctum:auth"],
});

const { refreshIdentity } = useSanctumAuth();

const runtimeConfig = useRuntimeConfig();
const stripePromise = loadStripe(runtimeConfig.public.stripeKey);

const client = useSanctumClient();

// Stripe sarà null se il caricamento fallisce (ad-blocker, rete)
let stripe = null;
try {
	stripe = await stripePromise;
} catch (e) {
	console.error("Stripe.js non caricato:", e);
}

const cardNumber = ref(null);
const cardExpiry = ref(null);
const cardCvc = ref(null);
const clientSecret = ref(null);
const elements = ref(null);

const errorMessage = ref(null);
const cardHolderName = ref("");
const showFormPayments = ref(false);
const textMessage = ref("");
const textMessageType = ref("info");
const deleteConfirmId = ref(null);

const { data: payments, status, refresh } = useSanctumFetch("/api/stripe/payment-methods");

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
			errorMessage.value = error.message;
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
			errorMessage.value = "Stripe non disponibile. Ricarica la pagina.";
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

			// Individual card elements (cardNumber/cardExpiry/cardCvc) NON usano clientSecret in elements()
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
		<div class="my-container max-w-[800px]">
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866]">Il tuo account</NuxtLink>
				<span class="mx-[6px]">/</span>
				<span v-if="!showFormPayments" class="font-semibold text-[#252B42]">Carte e pagamenti</span>
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
					'mb-[20px] px-[16px] py-[12px] rounded-[10px] text-[0.875rem] font-medium transition-all',
					textMessageType === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : textMessageType === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200',
				]">
				{{ textMessage }}
			</div>

			<!-- ===== CARD LIST VIEW ===== -->
			<template v-if="!showFormPayments">
				<div class="flex items-center justify-between mb-[24px]">
					<h1 class="text-[1.5rem] desktop:text-[1.75rem] font-bold text-[#252B42]">Carte e pagamenti</h1>
					<button
						type="button"
						@click="togglePaymentForm"
						class="px-[20px] py-[10px] bg-[#095866] hover:bg-[#0a7a8c] text-white rounded-[10px] text-[0.875rem] font-semibold transition-colors cursor-pointer">
						+ Aggiungi carta
					</button>
				</div>

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
						<div class="w-[72px] h-[72px] mx-auto mb-[20px] bg-[#F8F9FB] rounded-full flex items-center justify-center">
							<span class="text-[2rem]">&#128179;</span>
						</div>
						<h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[10px]">Nessuna carta salvata</h2>
						<p class="text-[#737373] text-[0.9375rem] max-w-[400px] mx-auto mb-[24px] leading-[1.6]">Aggiungi una carta di pagamento per velocizzare le tue spedizioni e ricaricare il portafoglio.</p>
						<button @click="togglePaymentForm" class="px-[24px] py-[12px] bg-[#095866] hover:bg-[#0a7a8c] text-white rounded-[10px] font-semibold text-[0.9375rem] transition-colors cursor-pointer">
							Aggiungi la tua prima carta
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
										class="text-[0.8125rem] text-[#095866] hover:underline cursor-pointer font-medium">
										Imposta predefinita
									</button>

									<template v-if="deleteConfirmId !== payment.id">
										<button
											@click="deleteConfirmId = payment.id"
											class="text-[0.8125rem] text-red-400 hover:text-red-600 cursor-pointer ml-[4px]">
											Elimina
										</button>
									</template>
									<template v-else>
										<div class="flex items-center gap-[6px]">
											<button
												@click="deleteCard(payment.id)"
												class="px-[12px] py-[6px] bg-red-600 hover:bg-red-700 text-white rounded-[6px] text-[0.75rem] font-medium cursor-pointer">
												Conferma
											</button>
											<button
												@click="deleteConfirmId = null"
												class="px-[12px] py-[6px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] rounded-[6px] text-[0.75rem] font-medium cursor-pointer">
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
				<div class="mt-[24px] flex items-start gap-[10px] p-[14px] bg-[#F8F9FB] rounded-[10px]">
					<span class="text-[1rem] shrink-0">&#128274;</span>
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
							class="flex-1 py-[14px] rounded-[10px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] font-semibold text-[0.9375rem] transition-colors cursor-pointer">
							Annulla
						</button>
						<button
							@click="handleAddCard"
							class="flex-1 py-[14px] rounded-[10px] bg-[#095866] hover:bg-[#0a7a8c] text-white font-semibold text-[0.9375rem] transition-colors cursor-pointer">
							Salva carta
						</button>
					</div>

					<div class="mt-[16px] flex items-center justify-center gap-[6px] text-[0.75rem] text-[#a0a0a0]">
						<span>&#128274;</span>
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
	padding: 12px 14px;
	border: 1px solid #e9ebec;
	border-radius: 8px;
	width: 100%;
	transition: border-color 0.2s;
}

.stripe-field:focus-within {
	border-color: #095866;
}
</style>
