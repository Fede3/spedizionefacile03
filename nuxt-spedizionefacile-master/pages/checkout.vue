<!--
  FILE: pages/checkout.vue
  SCOPO: Checkout orchestrator — delegates UI to components/checkout/*.
  COMPOSABLE: useCheckout (tutta la logica di pagamento).
  ROUTE: /checkout (protetta, middleware app-auth).
-->
<script setup>
useHead({ link: [
  { rel: 'preconnect', href: 'https://js.stripe.com', crossorigin: '' },
  { rel: 'preconnect', href: 'https://api.stripe.com', crossorigin: '' },
] });
useSeoMeta({ title: 'Checkout | SpediamoFacile', ogTitle: 'Checkout | SpediamoFacile' });

definePageMeta({ middleware: ["app-auth", "shipment-validation"] });

const {
  // page state
  pageReady, existingOrderId, existingOrder, initCheckoutPage,
  // stripe
  stripeLoading, stripeReady, stripeConfigured,
  cardPaymentsUnavailable, cardPaymentsNotice, initStripe,
  // promo
  loadPriceBands, promoSettings,
  // packages & totals
  displayPackages, addressGroups, hasMultipleGroups, mergeGroupsCount,
  getTotal, getNumberTotal, totalPackages, contentDescription,
  formatPrice, finalTotal, finalTotalFormatted,
  // billing
  fatturazioneType, invoiceSubjectType, fatturaData, billingShippingFullAddress,
  // wallet
  walletFormatted, walletLoaded, walletSufficient,
  // coupon
  couponCode, couponLoading, couponError, couponApplied, couponPanelOpen,
  validateCoupon, removeCoupon, autoApplyReferral,
  // payment method
  paymentMethod, paymentMethodOptions, selectPaymentMethod,
  // card element
  cardElementContainer, cardMounted, cardComplete, cardError,
  shouldShowCardForm, useNewCard, saveCardForFuture, hasSavedCard, defaultPayment,
  // payment flow
  termsAccepted, showConfirmModal, confirmPayment, proceedWithPayment,
  isProcessing, paymentError, paymentSuccess, successOrderId,
  paymentStep, paymentActionLabel, canPay, payButtonTooltip,
  // fallback
  fallbackFlowRoute,
} = useCheckout();

/** Function-ref callback so the child component can bind the Stripe card container. */
const setCardRef = (el) => { cardElementContainer.value = el; };

pageReady.value = await initCheckoutPage();

onMounted(async () => {
  loadPriceBands();
  await initStripe();
  autoApplyReferral();
});
</script>

<template>
  <section class="min-h-[600px] py-[30px] desktop:py-[50px] bg-[#F0F0F0]">
    <div class="my-container">
      <!-- Skeleton -->
      <CheckoutSkeleton v-if="!pageReady" />

      <template v-else>
        <Steps :current-step="4" />

        <!-- Success screen -->
        <CheckoutSuccess
          v-if="paymentSuccess"
          :success-order-id="successOrderId"
          :payment-method="paymentMethod"
        />

        <!-- Checkout form -->
        <div v-else class="mx-auto space-y-[24px]">
          <!-- Order summary + coupon -->
          <CheckoutOrderSummary
            :display-packages="displayPackages"
            :address-groups="addressGroups"
            :has-multiple-groups="hasMultipleGroups"
            :merge-groups-count="mergeGroupsCount"
            :total-packages="totalPackages"
            :content-description="contentDescription"
            :existing-order-id="existingOrderId"
            :get-total="getTotal"
            :final-total-formatted="finalTotalFormatted"
            :format-price="formatPrice"
            :promo-settings="promoSettings"
            :coupon-code="couponCode"
            :coupon-loading="couponLoading"
            :coupon-error="couponError"
            :coupon-applied="couponApplied"
            :coupon-panel-open="couponPanelOpen"
            @update:coupon-code="couponCode = $event"
            @update:coupon-panel-open="couponPanelOpen = $event"
            @validate-coupon="validateCoupon"
            @remove-coupon="removeCoupon"
          />

          <div class="checkout-payment-stack">
            <!-- Payment methods -->
            <CheckoutPaymentMethods
              :payment-method="paymentMethod"
              :payment-method-options="paymentMethodOptions"
              :card-payments-unavailable="cardPaymentsUnavailable"
              :card-payments-notice="cardPaymentsNotice"
              :has-saved-card="hasSavedCard"
              :default-payment="defaultPayment"
              :use-new-card="useNewCard"
              :should-show-card-form="shouldShowCardForm"
              :stripe-loading="stripeLoading"
              :card-error="cardError"
              :save-card-for-future="saveCardForFuture"
              :card-ref-callback="setCardRef"
              :wallet-formatted="walletFormatted"
              :wallet-loaded="walletLoaded"
              :wallet-sufficient="walletSufficient"
              @select-payment-method="selectPaymentMethod"
              @update:use-new-card="useNewCard = $event"
              @update:save-card-for-future="saveCardForFuture = $event"
            />

            <!-- Billing -->
            <CheckoutBilling
              :fatturazione-type="fatturazioneType"
              :invoice-subject-type="invoiceSubjectType"
              :fattura-data="fatturaData"
              :billing-shipping-full-address="billingShippingFullAddress"
              @update:fatturazione-type="fatturazioneType = $event"
              @update:invoice-subject-type="invoiceSubjectType = $event"
            />

            <!-- Footer: totals + pay button + terms -->
            <CheckoutPaymentFooter
              :final-total-formatted="finalTotalFormatted"
              :payment-method="paymentMethod"
              :payment-action-label="paymentActionLabel"
              :pay-button-tooltip="payButtonTooltip"
              :can-pay="canPay"
              :is-processing="isProcessing"
              :payment-error="paymentError"
              :payment-step="paymentStep"
              :terms-accepted="termsAccepted"
              @confirm-payment="confirmPayment"
              @update:terms-accepted="termsAccepted = $event"
            />
          </div>
        </div>

        <!-- Confirmation modal -->
        <CheckoutConfirmModal
          :show="showConfirmModal"
          :final-total-formatted="finalTotalFormatted"
          :payment-method="paymentMethod"
          :total-packages="totalPackages"
          @close="showConfirmModal = false"
          @confirm="proceedWithPayment"
        />
      </template>
    </div>
  </section>
</template>
