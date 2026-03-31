<!--
  FILE: components/account/AccountWalletTopUp.vue
  SCOPO: Sezione ricarica portafoglio — importi preimpostati, Stripe card form inline, pulsante ricarica.
  PROPS: defaultPaymentMethod (Object|null), stripeConfigured (Boolean).
  EVENTS: topUpSuccess — emesso dopo una ricarica riuscita (il parent aggiorna saldo/movimenti).
-->
<script setup>
const props = defineProps({
  defaultPaymentMethod: { type: Object, default: null },
  stripeConfigured: { type: Boolean, default: false },
});

const emit = defineEmits(["topUpSuccess", "paymentMethodUpdated"]);

const { user, refreshIdentity } = useSanctumAuth();
const sanctum = useSanctumClient();
const runtimeConfig = useRuntimeConfig();

/* Stripe state */
const stripePublishableKey = ref("");
const stripeReady = ref(false);
const stripeLoading = ref(false);
let stripe = null;

const isValidStripePublishableKey = (value) => {
  const key = String(value || "").trim();
  return key.startsWith("pk_") && !key.includes("placeholder");
};

/* Top-up state */
const topUpAmount = ref("");
const isLoading = ref(false);
const message = ref(null);
const messageType = ref("success");
const presetAmounts = [10, 25, 50, 100, 200];

/* New card form state */
const showNewCardForm = ref(false);
const isPreparingNewCardForm = ref(false);
const cardHolderName = ref("");
const setupClientSecret = ref(null);
const elements = ref(null);
const cardNumber = ref(null);
const cardExpiry = ref(null);
const cardCvc = ref(null);
const cardError = ref(null);

/* --- Stripe helpers --- */

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
  if (!props.stripeConfigured || stripeLoading.value) return false;

  stripeLoading.value = true;
  try {
    const { loadStripe } = await import("@stripe/stripe-js");
    /* Retrieve publishable key from settings endpoint (or fall back to runtime config) */
    if (!stripePublishableKey.value) {
      try {
        const config = await sanctum("/api/settings/stripe");
        const key = String(config?.publishable_key || "").trim();
        stripePublishableKey.value = isValidStripePublishableKey(key) ? key : "";
      } catch {
        /* ignore — fallback below */
      }
      if (!stripePublishableKey.value) {
        const fallbackKey = String(runtimeConfig.public.stripeKey || "").trim();
        stripePublishableKey.value = isValidStripePublishableKey(fallbackKey) ? fallbackKey : "";
      }
    }
    if (!stripePublishableKey.value) {
      cardError.value = "Chiave Stripe non disponibile. Ricarica la pagina.";
      stripeReady.value = false;
      return false;
    }
    stripe = await loadStripe(stripePublishableKey.value);
    stripeReady.value = Boolean(stripe);
    return stripeReady.value;
  } catch {
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

/* --- Card form open / close --- */

const openNewCardForm = async () => {
  if (!props.stripeConfigured) {
    message.value = "Le ricariche con carta non sono ancora attive su questo sito.";
    messageType.value = "error";
    clearFeedbackMessage();
    return;
  }

  cardError.value = null;
  message.value = null;
  showNewCardForm.value = true;
  isPreparingNewCardForm.value = true;

  clearNewCardForm();
  cardHolderName.value = [user.value?.name, user.value?.surname].filter(Boolean).join(" ").trim();

  const stripeLoaded = await ensureStripeLoaded();
  if (!stripeLoaded) {
    isPreparingNewCardForm.value = false;
    return;
  }

  try {
    const response = await sanctum("/api/stripe/create-setup-intent", { method: "POST" });
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
      billing_details: { name: cardHolderName.value.trim() },
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

  await refreshIdentity();
  emit("paymentMethodUpdated");
  closeNewCardForm();
  return setupIntent.payment_method;
};

/* --- Computed --- */

const canSubmitTopUp = computed(() => {
  const amount = Number(topUpAmount.value);
  if (isLoading.value || !props.stripeConfigured || amount < 1) return false;
  if (showNewCardForm.value) return Boolean(setupClientSecret.value && cardHolderName.value.trim());
  return Boolean(props.defaultPaymentMethod?.card);
});

const topUpButtonLabel = computed(() => {
  if (isLoading.value) return "Elaborazione in corso...";
  const suffix = topUpAmount.value ? ` \u20AC${Number(topUpAmount.value).toFixed(2)}` : "";
  if (showNewCardForm.value) return `Salva carta e ricarica${suffix}`;
  if (!props.defaultPaymentMethod?.card) return "Aggiungi una carta per ricaricare";
  return `Ricarica${suffix}`;
});

/* --- Top-up handler --- */

const handleTopUp = async () => {
  if (!topUpAmount.value || topUpAmount.value < 1) {
    message.value = "Inserisci un importo minimo di 1,00 EUR";
    messageType.value = "error";
    clearFeedbackMessage();
    return;
  }
  if (!props.stripeConfigured) {
    message.value = "Le ricariche con carta non sono ancora attive su questo sito.";
    messageType.value = "error";
    clearFeedbackMessage();
    return;
  }

  isLoading.value = true;
  message.value = null;
  cardError.value = null;

  try {
    let paymentMethodId = props.defaultPaymentMethod?.card?.id || null;
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
      body: { amount: Number(topUpAmount.value), payment_method_id: paymentMethodId },
    });

    if (result?.success) {
      message.value = `Ricarica di \u20AC${Number(topUpAmount.value).toFixed(2)} completata!`;
      messageType.value = "success";
      topUpAmount.value = "";
      emit("topUpSuccess");
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

/* Preset selection */
const selectPreset = (amount) => { topUpAmount.value = amount; };

/* Cleanup */
onBeforeUnmount(() => { clearNewCardForm(); });
</script>

<template>
  <div class="rounded-[18px] border border-[#E9EBEC] bg-white p-[18px] shadow-sm desktop:sticky desktop:top-[108px] desktop:p-[22px]">
    <div class="flex items-start sm:items-center gap-[10px] mb-[14px] desktop:mb-[16px]">
      <div class="w-[36px] h-[36px] rounded-[50px] bg-[#edf7f8] flex items-center justify-center">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#095866]"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
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

    <!-- Payment method display (saved card) -->
    <div v-if="defaultPaymentMethod?.card && !showNewCardForm" class="flex flex-col sm:flex-row sm:items-center gap-[10px] mb-[14px] p-[14px] bg-[#F8F9FB] rounded-[14px] border border-[#E9EBEC]">
      <div class="w-[48px] h-[32px] bg-[#eef3f6] rounded-[6px] flex items-center justify-center text-[#095866] text-[0.6875rem] font-bold uppercase tracking-wider">
        {{ defaultPaymentMethod.card.brand?.slice(0, 4) }}
      </div>
      <div class="flex-1 min-w-0">
        <span class="text-[0.9375rem] font-medium text-[#252B42]">
          &bull;&bull;&bull;&bull; {{ defaultPaymentMethod.card.last4 }}
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

    <!-- New card form -->
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

    <!-- No card warning -->
    <div v-else class="mb-[14px] p-[12px] bg-amber-50/80 rounded-[12px] border border-amber-200 text-[0.8125rem]">
      <div class="flex items-center gap-[10px]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-600 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Aggiungi una carta qui
        </button>
        <NuxtLink to="/account/carte" class="text-[0.8125rem] text-amber-900 font-semibold underline">
          Gestisci carte e pagamenti
        </NuxtLink>
      </div>
    </div>

    <!-- Summary + action button -->
    <div class="grid grid-cols-1 desktop:grid-cols-[minmax(0,1fr)_240px] gap-[14px] items-start">
      <div class="rounded-[14px] border border-[#E9EBEC] bg-[#FAFCFD] px-[14px] py-[12px]">
        <p class="text-[0.75rem] font-semibold uppercase tracking-[0.04em] text-[#6B7280]">Ricarica pronta</p>
        <p class="mt-[4px] text-[0.9375rem] font-semibold text-[#252B42]">
          {{ topUpAmount ? `Importo selezionato: \u20AC${Number(topUpAmount || 0).toFixed(2)}` : 'Scegli un importo o inseriscilo manualmente' }}
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
        <svg v-if="!isLoading" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1"/><path d="M14 11h4m-2-2v4"/></svg>
        <span>{{ topUpButtonLabel }}</span>
      </button>
    </div>

    <!-- Feedback message -->
    <div v-if="message" :class="['mt-[14px] p-[12px] rounded-[16px] text-[0.8125rem] font-medium flex items-center gap-[8px]', messageType === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600']">
      <svg v-if="messageType === 'success'" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {{ message }}
    </div>
  </div>
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
