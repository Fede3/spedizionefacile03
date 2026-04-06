<!--
  FILE: pages/carrello.vue
  SCOPO: Carrello spedizioni — layout prototipo: griglia items + sidebar sticky.
  Logica interamente in useCarrello(). Visual ispirato al prototipo React con
  miglioramenti brand (teal/arancione, pill, gradient BG, card ring).
-->
<script setup>
useSeoMeta({
  title: 'Carrello | SpediamoFacile',
  ogTitle: 'Carrello | SpediamoFacile',
  description: 'Rivedi le tue spedizioni nel carrello, modifica quantità e procedi al checkout su SpediamoFacile.',
  ogDescription: 'Rivedi le tue spedizioni nel carrello, modifica quantità e procedi al checkout su SpediamoFacile.',
});

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
  <div class="cart-page min-h-screen" style="background: #ffffff">

    <!-- ===== CART WITH ITEMS ===== -->
    <div v-if="cart?.data?.length > 0" class="max-w-[1280px] mx-auto px-[14px] sm:px-[40px] pt-[24px] sm:pt-[32px] pb-[80px]">

      <!-- Promo banner -->
      <div v-if="promoSettings?.active && promoSettings?.label_text" class="flex justify-center mb-[16px]">
        <span :style="{ backgroundColor: promoSettings.label_color || 'var(--color-brand-accent)' }"
          class="inline-flex items-center gap-[6px] px-[16px] py-[8px] rounded-full text-white text-[14px] font-bold tracking-wide shadow-sm">
          <img v-if="promoSettings.label_image" :src="promoSettings.label_image" alt="" loading="lazy" decoding="async" width="40" height="20" class="h-[20px] w-auto" />
          {{ promoSettings.label_text }}
        </span>
      </div>

      <!-- Header -->
      <div class="mb-[20px]">
        <h1 class="font-montserrat text-[var(--color-brand-text)] text-[clamp(1.5rem,3.5vw,1.75rem)] tracking-[-0.5px]" style="font-weight: 800">Carrello</h1>
        <p class="text-[var(--color-brand-text-secondary)] text-[14px] mt-[4px]" style="font-weight: 400">
          {{ cart.data.length }} spedizion{{ cart.data.length === 1 ? 'e' : 'i' }} &middot; Totale {{ displayTotal }}
        </p>
      </div>

      <!-- Grid: items left, sidebar right -->
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-[28px] items-start">

        <!-- LEFT COLUMN: search + items -->
        <div class="flex flex-col gap-[10px]">

          <!-- Search bar -->
          <div class="relative">
            <input
              type="text"
              v-model="filterRiferimento"
              placeholder="Cerca spedizione..."
              class="w-full h-[48px] rounded-[12px] bg-white ring-[1.5px] ring-[#DFE2E7] focus:ring-[3px] focus:ring-[var(--color-brand-primary)]/60 pl-[38px] pr-[14px] text-[14px] text-[var(--color-brand-text)] placeholder:text-[var(--color-brand-text-muted)] outline-none transition-all"
              style="font-weight: 500"
            />
            <!-- Search icon -->
            <svg class="absolute left-[14px] top-1/2 -translate-y-1/2 text-[var(--color-brand-text-muted)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>

          <!-- Filter by city (optional, only shown when multiple cities) -->
          <div v-if="uniqueCities.length > 1" class="relative">
            <select
              v-model="filterProvenienza"
              class="w-full h-[48px] rounded-[12px] bg-white ring-[1.5px] ring-[#DFE2E7] focus:ring-[3px] focus:ring-[var(--color-brand-primary)]/60 pl-[38px] pr-[14px] text-[14px] text-[var(--color-brand-text)] appearance-none cursor-pointer outline-none transition-all"
              style="font-weight: 500"
            >
              <option value="">Tutte le provenienze</option>
              <option v-for="city in uniqueCities" :key="city" :value="city">{{ city }}</option>
            </select>
            <!-- MapPin icon -->
            <svg class="absolute left-[14px] top-1/2 -translate-y-1/2 text-[var(--color-brand-text-muted)] pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>

          <!-- Cart entries -->
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

          <!-- Empty filter result -->
          <div v-if="displayEntries.length === 0 && cart?.data?.length > 0" class="bg-[#F5F6F9] rounded-[16px] ring-[1.5px] ring-[#DFE2E7] p-[20px] text-center" style="box-shadow: 0 1px 4px rgba(0,0,0,0.03)">
            <p class="text-[var(--color-brand-text-secondary)] text-[14px]">Nessuna spedizione corrisponde ai filtri.</p>
          </div>
        </div>

        <!-- RIGHT COLUMN: sidebar (sticky) -->
        <div class="flex flex-col gap-[12px] relative">

          <!-- Summary card -->
          <CartTotals
            :cart-meta="cart?.meta"
            :coupon-applied="couponApplied"
            :coupon-discount="couponDiscount"
            :applied-total="appliedTotal"
            :display-total="displayTotal"
            :display-entries="displayEntries"
            :coupon-code="couponCode"
            :coupon-message="couponMessage"
            :show-coupon-field="showCouponField"
            :show-coupon-panel="showCouponPanel"
            @toggle-coupon="showCouponField = !showCouponField"
            @apply-coupon="applyCoupon"
            @remove-coupon="removeCoupon"
            @update:coupon-code="couponCode = $event"
          />

          <!-- CTA: Checkout -->
          <button
            type="button"
            @click="openCheckoutWithAuthGate"
            class="w-full h-[50px] rounded-full text-white text-[15px] flex items-center justify-center gap-[8px] cursor-pointer outline-none transition-all hover:-translate-y-[1px]"
            style="font-weight: 700; background: linear-gradient(135deg, #E44203, #c73600); box-shadow: 0 4px 16px rgba(228,66,3,0.2)"
          >
            Procedi al checkout
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>

          <!-- Bottom actions -->
          <div class="flex gap-[8px]">
            <NuxtLink to="/preventivo"
              class="flex-1 h-[42px] rounded-full ring-[1px] ring-[#DFE2E7] bg-white text-[var(--color-brand-text)] text-[13px] flex items-center justify-center gap-[5px] cursor-pointer hover:bg-[#f5f6f8] transition-colors outline-none"
              style="font-weight: 600"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              Continua
            </NuxtLink>
            <button
              type="button"
              @click="showEmptyConfirm = true"
              class="h-[42px] px-[16px] rounded-full ring-[1px] ring-[#DFE2E7] bg-white text-[#E44203] text-[13px] flex items-center justify-center gap-[5px] cursor-pointer hover:bg-[#FEF2F2] transition-colors outline-none"
              style="font-weight: 600"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Svuota
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== EMPTY CART ===== -->
    <div v-else-if="status !== 'pending'" class="min-h-screen flex items-center justify-center px-[20px]">
      <div class="text-center max-w-[400px]">
        <div class="w-[64px] h-[64px] rounded-full bg-[#E6E9EE] flex items-center justify-center mx-auto mb-[16px]">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        </div>
        <h1 class="font-montserrat text-[var(--color-brand-text)] text-[22px] sm:text-[26px] tracking-[-0.5px]" style="font-weight: 800">Il carrello è vuoto</h1>
        <p class="text-[var(--color-brand-text-secondary)] text-[14px] mt-[6px]">Configura una spedizione e aggiungila al carrello.</p>
        <NuxtLink to="/preventivo"
          class="inline-flex items-center justify-center mt-[20px] h-[46px] px-[28px] rounded-full text-white text-[14px] cursor-pointer outline-none transition-all hover:-translate-y-[1px]"
          style="font-weight: 700; background: linear-gradient(135deg, #E44203, #c73600); box-shadow: 0 4px 16px rgba(228,66,3,0.2)"
        >
          Nuova spedizione
        </NuxtLink>
      </div>
    </div>

    <!-- ===== LOADING STATE ===== -->
    <div v-else class="min-h-screen flex items-center justify-center">
      <div class="w-[40px] h-[40px] rounded-full border-[3px] border-[#DFE2E7] border-t-[var(--color-brand-primary)] animate-spin"></div>
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
  </div>
</template>
