<!--
  Payment methods: card (saved/new), bank transfer, wallet.
  All Stripe card-element logic lives in the parent composable; we just get refs/props.
-->
<script setup>
defineProps({
  paymentMethod:          { type: String, required: true },
  paymentMethodOptions:   { type: Array,  required: true },
  cardPaymentsUnavailable:{ type: Boolean, default: false },
  cardPaymentsNotice:     { type: String,  default: '' },
  /* card sub-panel */
  hasSavedCard:    { type: Boolean, default: false },
  defaultPayment:  { type: Object,  default: null },
  useNewCard:      { type: Boolean, default: true },
  shouldShowCardForm: { type: Boolean, default: false },
  stripeLoading:   { type: Boolean, default: false },
  cardError:       { type: String,  default: '' },
  saveCardForFuture: { type: Boolean, default: false },
  /* Function ref callback — parent passes (el) => { composableRef.value = el } */
  cardRefCallback: { type: Function, default: null },
  /* wallet */
  walletFormatted: { type: String,  default: '' },
  walletLoaded:    { type: Boolean, default: false },
  walletSufficient:{ type: Boolean, default: false },
})

const emit = defineEmits([
  'select-payment-method',
  'update:useNewCard',
  'update:saveCardForFuture',
])
</script>

<template>
  <div class="checkout-stage-card checkout-stage-card--payment checkout-motion-card" style="--checkout-delay: 80ms;">
    <div class="checkout-panel-head">
      <span class="checkout-panel-head__icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
      </span>
      <div class="checkout-panel-head__copy">
        <p class="checkout-panel-head__title">Metodo di pagamento</p>
        <p class="checkout-panel-head__text">Scegli come pagare.</p>
      </div>
    </div>

    <div class="checkout-payment-options-grid">
      <button
        v-for="option in paymentMethodOptions"
        :key="option.key"
        type="button"
        @click="emit('select-payment-method', option.key)"
        :disabled="option.key === 'carta' && cardPaymentsUnavailable"
        :class="[
          'checkout-payment-option no-radius',
          paymentMethod === option.key ? 'checkout-payment-option--active' : 'checkout-payment-option--idle',
          option.key === 'carta' && cardPaymentsUnavailable ? 'checkout-payment-option--disabled' : '',
        ]">
        <span v-if="option.badge" class="checkout-payment-option__badge">{{ option.badge }}</span>
        <span class="checkout-payment-option__icon-shell">
          <svg v-if="option.key === 'carta'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          <svg v-else-if="option.key === 'bonifico'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10h18"/><path d="M5 10V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><rect x="4" y="10" width="16" height="9" rx="2"/><path d="M8 14h2"/><path d="M14 14h2"/></svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
        </span>
        <span class="checkout-payment-option__copy">
          <span class="checkout-payment-option__title">{{ option.title }}</span>
          <span class="checkout-payment-option__text">{{ option.description }}</span>
        </span>
      </button>
    </div>

    <div v-if="cardPaymentsUnavailable" class="checkout-payment-notice">
      {{ cardPaymentsNotice }}
    </div>

    <div class="payment-panel-shell checkout-payment-panel" :data-payment-method="paymentMethod">
      <!-- Card panel -->
      <div v-if="paymentMethod === 'carta' && !cardPaymentsUnavailable" class="space-y-[14px]">
        <div class="checkout-payment-choice-stack">
          <button
            v-if="hasSavedCard"
            type="button"
            @click="emit('update:useNewCard', false)"
            :class="['checkout-payment-choice no-radius', !useNewCard ? 'checkout-payment-choice--selected' : 'checkout-payment-choice--idle']">
            <span class="checkout-payment-choice__brand">{{ defaultPayment.card.brand?.toUpperCase() }}</span>
            <div class="checkout-payment-choice__copy">
              <p class="checkout-payment-choice__eyebrow">Carta salvata</p>
              <p class="checkout-payment-choice__title">&bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; {{ defaultPayment.card.last4 }}</p>
              <p class="checkout-payment-choice__text">Scade {{ defaultPayment.card.exp_month }}/{{ defaultPayment.card.exp_year }}</p>
            </div>
            <span :class="['checkout-payment-choice__radio', !useNewCard ? 'checkout-payment-choice__radio--selected' : '']"></span>
          </button>

          <div
            role="button"
            tabindex="0"
            @click="emit('update:useNewCard', true)"
            @keydown.enter.prevent="emit('update:useNewCard', true)"
            @keydown.space.prevent="emit('update:useNewCard', true)"
            :class="[
              'checkout-payment-choice checkout-payment-choice--expandable no-radius',
              (!hasSavedCard || useNewCard) ? 'checkout-payment-choice--selected' : 'checkout-payment-choice--idle'
            ]">
            <div class="checkout-payment-choice__header">
              <span class="checkout-payment-choice__icon-shell">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              </span>
              <div class="checkout-payment-choice__copy">
                <p class="checkout-payment-choice__title">Usa una nuova carta</p>
                <p class="checkout-payment-choice__text">Inserisci una carta diversa per questo pagamento.</p>
              </div>
              <span :class="['checkout-payment-choice__radio', (!hasSavedCard || useNewCard) ? 'checkout-payment-choice__radio--selected' : '']"></span>
            </div>

            <Transition name="payment-panel">
              <div v-if="shouldShowCardForm" class="checkout-payment-card-form checkout-payment-card-form--embedded">
                <div class="checkout-payment-card-form__head">
                  <div class="checkout-payment-card-form__intro">
                    <p class="checkout-payment-card-form__text">Inserisci la carta qui.</p>
                  </div>
                </div>

                <div id="card-element" :ref="cardRefCallback" class="checkout-payment-card-form__element"></div>
                <p v-if="stripeLoading" class="checkout-payment-card-form__helper">Preparazione del modulo carta in corso...</p>
                <p v-if="cardError" class="checkout-payment-card-form__error">{{ cardError }}</p>
                <label class="checkout-payment-card-form__save" @click.stop>
                  <input type="checkbox" :checked="saveCardForFuture" @change="emit('update:saveCardForFuture', $event.target.checked)" class="checkout-payment-card-form__checkbox" />
                  <span>Salva per i prossimi pagamenti</span>
                </label>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <!-- Bank transfer -->
      <div v-else-if="paymentMethod === 'bonifico'" class="checkout-payment-alt">
        <p class="checkout-payment-alt__title">Pagamento tramite bonifico</p>
        <p class="checkout-payment-alt__text">Riceverai via email le coordinate bancarie appena confermi l'ordine. L'attivazione avviene alla ricezione del bonifico.</p>
      </div>

      <!-- Wallet -->
      <div v-else-if="paymentMethod === 'wallet'" class="checkout-payment-alt">
        <p class="checkout-payment-alt__title">Pagamento tramite Wallet</p>
        <p class="checkout-payment-alt__text">Saldo disponibile: <span class="font-semibold text-[#095866]">{{ walletFormatted }}</span></p>
        <p v-if="walletLoaded && !walletSufficient" class="checkout-payment-alt__error">Saldo insufficiente. Ricarica il wallet per procedere.</p>
        <p v-else-if="walletLoaded" class="checkout-payment-alt__success">Saldo sufficiente per completare il pagamento.</p>
      </div>
    </div>
  </div>
</template>
