<!--
  FILE: pages/carrello.vue
  SCOPO: Carrello spedizioni — orchestratore che compone i sotto-componenti cart/*.
  Tutta la logica vive nel composable useCarrello().
-->
<script setup>
useSeoMeta({ title: 'Carrello | SpediamoFacile', ogTitle: 'Carrello | SpediamoFacile' });

const {
  cart, refresh, status, isAuthenticated,
  promoSettings,
  filterProvenienza, filterRiferimento, filteredCartItems, uniqueCities,
  showDeleteConfirm, deleteLoading, askDelete, confirmDelete,
  showEmptyConfirm, emptyCartLoading, emptyCart,
  formatPrice, unitPrice, formatDate, getPackageIcon,
  quantityUpdating, updateQuantity, quantityButtonClass, quantityButtonCompactClass, quantityButtonMobileClass,
  addressGroups, groupColors, expandedGroups, toggleGroup, isGroupExpanded, displayEntries,
  couponCode, couponMessage, couponApplied, couponDiscount, appliedTotal,
  showCouponField, showCouponPanel, applyCoupon, removeCoupon, displayTotal,
  showAuthCheckoutModal, authCheckoutTab, authCheckoutLoading, authCheckoutError,
  authCheckoutSuccess, authCheckoutRedirect, authLoginForm, authRegisterForm,
  openCheckoutWithAuthGate, loginForCheckout, registerForCheckout,
} = useCarrello();
</script>

<template>
  <section class="min-h-[600px] py-[30px] desktop:py-[50px] bg-[#F0F0F0]">
    <div class="my-container">
      <!-- Cart content -->
      <div v-if="cart?.data?.length > 0" class="mx-auto">
        <!-- Promo banner -->
        <div v-if="promoSettings?.active && promoSettings?.label_text" class="flex justify-center mb-[16px]">
          <span :style="{ backgroundColor: promoSettings.label_color || '#E44203' }"
            class="inline-flex items-center gap-[6px] px-[16px] py-[8px] rounded-[50px] text-white text-[0.9375rem] font-bold tracking-wide shadow-sm">
            <img v-if="promoSettings.label_image" :src="promoSettings.label_image" alt="" loading="lazy" decoding="async" width="40" height="20" class="h-[20px] w-auto" />
            {{ promoSettings.label_text }}
          </span>
        </div>

        <!-- Title -->
        <div class="mb-[24px] text-center">
          <h1 class="text-[1.5rem] tablet:text-[2rem] font-bold text-[#252B42] mb-[6px] font-montserrat">Carrello</h1>
          <p class="text-[0.9375rem] text-[#6B7280] max-w-[620px] mx-auto leading-[1.6]">
            Rivedi le spedizioni, applica eventuali sconti e completa l'ordine quando tutto è pronto.
          </p>
        </div>

        <!-- Main card -->
        <div class="bg-white rounded-[24px] p-[18px] tablet:p-[28px_32px] border border-[#E5EAEC] shadow-[0_14px_40px_rgba(37,43,66,0.06)]">
          <!-- Header + checkout CTA -->
          <div class="flex flex-col desktop:flex-row desktop:items-end desktop:justify-between gap-[16px] mb-[20px]">
            <div>
              <p class="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#095866] mb-[6px]">Spedizioni pronte</p>
              <h2 class="text-[1.25rem] tablet:text-[1.5rem] font-bold text-[#252B42]">Controlla tutto prima del pagamento</h2>
              <p class="text-[0.875rem] text-[#6B7280] mt-[6px] max-w-[560px]">
                Puoi modificare quantità, rivedere i dettagli di ogni collo e passare al checkout quando il riepilogo è corretto.
              </p>
            </div>
            <button type="button" @click="openCheckoutWithAuthGate"
              class="inline-flex items-center justify-center gap-[8px] px-[22px] min-h-[48px] rounded-[16px] bg-[#095866] text-white font-semibold text-[0.9375rem] hover:bg-[#074a56] transition-[background-color,box-shadow] duration-200 shadow-sm hover:shadow-[0_8px_18px_rgba(9,88,102,0.22)] cursor-pointer">
              Procedi al checkout
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          </div>

          <!-- Filters -->
          <div class="flex flex-col tablet:flex-row gap-[12px] tablet:gap-[16px] items-stretch tablet:items-center mb-[18px]">
            <div class="w-full tablet:flex-1 tablet:min-w-[200px] tablet:max-w-[400px]">
              <select v-model="filterProvenienza" class="w-full bg-[#F8FAFB] border border-[#D7E1E4] rounded-[14px] h-[48px] tablet:h-[46px] px-[18px] text-[1rem] tablet:text-[0.875rem] text-[#404040] appearance-none cursor-pointer transition-[border-color,box-shadow] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]">
                <option value="">Provenienza</option>
                <option v-for="city in uniqueCities" :key="city" :value="city">{{ city }}</option>
              </select>
            </div>
            <div class="w-full tablet:flex-1 tablet:min-w-[200px] tablet:max-w-[400px] tablet:ml-auto">
              <input type="text" v-model="filterRiferimento" placeholder="Cerca per riferimento, mittente o destinatario"
                class="w-full bg-[#F8FAFB] border border-[#D7E1E4] rounded-[14px] h-[48px] tablet:h-[46px] px-[18px] text-[1rem] tablet:text-[0.875rem] text-[#404040] placeholder:text-[#8A939C] transition-[border-color,box-shadow] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
            </div>
          </div>

          <!-- Coupon -->
          <CartCouponPanel
            :coupon-code="couponCode"
            :coupon-applied="couponApplied"
            :coupon-discount="couponDiscount"
            :coupon-message="couponMessage"
            :show-coupon-field="showCouponField"
            :show-coupon-panel="showCouponPanel"
            @toggle="showCouponField = !showCouponField"
            @apply="applyCoupon"
            @remove="removeCoupon"
            @update:coupon-code="couponCode = $event"
          />

          <!-- Entries header -->
          <div class="flex items-end justify-between gap-[12px] mb-[16px]">
            <div>
              <h2 class="text-[1.25rem] font-bold text-[#252B42]">Spedizioni</h2>
              <p class="text-[0.8125rem] text-[#6B7280] mt-[2px]">I colli identici vengono raggruppati per aiutarti a controllare quantità e tratta più velocemente.</p>
            </div>
            <span class="hidden tablet:inline-flex items-center gap-[6px] rounded-full bg-[#F2F6F7] px-[12px] py-[6px] text-[0.75rem] font-medium text-[#095866]">
              {{ displayEntries.length }} {{ displayEntries.length === 1 ? 'blocco' : 'blocchi' }}
            </span>
          </div>

          <!-- Display entries -->
          <div class="space-y-[12px]">
            <template v-for="(entry, eIdx) in displayEntries" :key="'e-'+eIdx">
              <CartGroupEntry v-if="entry.type === 'group'"
                :entry="entry"
                :expanded="isGroupExpanded(entry.groupIndex)"
                :format-price="formatPrice"
                :unit-price="unitPrice"
                :get-package-icon="getPackageIcon"
                :quantity-button-class="quantityButtonClass"
                @toggle="toggleGroup(entry.groupIndex)"
                @update-quantity="updateQuantity"
                @delete="askDelete"
              />
              <CartSingleEntry v-else
                :entry="entry"
                :format-price="formatPrice"
                :unit-price="unitPrice"
                :get-package-icon="getPackageIcon"
                :quantity-button-compact-class="quantityButtonCompactClass"
                :quantity-button-mobile-class="quantityButtonMobileClass"
                @update-quantity="updateQuantity"
                @delete="askDelete"
              />
            </template>
          </div>

          <!-- Totals -->
          <CartTotals
            :cart-meta="cart?.meta"
            :coupon-applied="couponApplied"
            :coupon-discount="couponDiscount"
            :applied-total="appliedTotal"
            :display-total="displayTotal"
            @checkout="openCheckoutWithAuthGate"
            @empty-cart="showEmptyConfirm = true"
          />
        </div>
      </div>

      <!-- Empty cart -->
      <div v-else-if="status !== 'pending'" class="max-w-[600px] mx-auto py-[80px] text-center">
        <h1 class="text-[1.5rem] tablet:text-[2rem] font-bold text-[#252B42] text-center mb-[4px] font-montserrat">Carrello</h1>
        <div class="w-[40px] h-[3px] bg-[#E44203] mx-auto mb-[32px]"></div>
        <div class="w-[80px] h-[80px] mx-auto mb-[20px] bg-[#E44203] rounded-full flex items-center justify-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        </div>
        <h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[10px]">Il carrello è vuoto</h2>
        <p class="text-[#737373] text-[0.9375rem] max-w-[400px] mx-auto mb-[24px] leading-[1.6]">
          Non hai ancora aggiunto spedizioni al carrello. Configura la tua prima spedizione per iniziare.
        </p>
        <NuxtLink to="/preventivo"
          class="inline-flex items-center gap-[6px] px-[24px] py-[14px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[50px] font-semibold text-[0.9375rem] transition-[background-color,transform] duration-200 active:scale-[0.97] min-h-[48px]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Crea nuova spedizione
        </NuxtLink>
      </div>
    </div>

    <!-- Confirm dialogs -->
    <AccountConfirmDialog v-model:open="showDeleteConfirm" title="Conferma eliminazione"
      description="Sei sicuro di voler rimuovere questa spedizione dal carrello? L'azione non puo' essere annullata."
      confirm-label="Elimina" :loading="deleteLoading" @confirm="confirmDelete" />

    <AccountConfirmDialog v-model:open="showEmptyConfirm" title="Svuota carrello"
      description="Sei sicuro di voler svuotare tutto il carrello? Tutte le spedizioni verranno rimosse."
      confirm-label="Svuota tutto" :loading="emptyCartLoading" @confirm="emptyCart" />

    <!-- Auth modal -->
    <CartAuthModal
      :open="showAuthCheckoutModal"
      :tab="authCheckoutTab"
      :loading="authCheckoutLoading"
      :error="authCheckoutError"
      :success="authCheckoutSuccess"
      :redirect-path="authCheckoutRedirect"
      :login-form="authLoginForm"
      :register-form="authRegisterForm"
      @update:open="showAuthCheckoutModal = $event"
      @update:tab="authCheckoutTab = $event"
      @login="loginForCheckout"
      @register="registerForCheckout"
      @clear-messages="authCheckoutError = ''; authCheckoutSuccess = '';"
    />
  </section>
</template>
