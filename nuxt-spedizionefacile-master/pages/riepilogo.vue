<!--
  FILE: pages/riepilogo.vue
  SCOPO: Riepilogo spedizione — revisione dati, modifica inline, invio a carrello/checkout/salvati.

  API: POST /api/cart o /api/guest-cart (aggiungi al carrello),
       PUT /api/cart/{id} (aggiorna pacco esistente), GET /api/cart/{id} (carica pacco per modifica),
       POST /api/saved-shipments (salva configurazione), POST /api/create-direct-order (ordine diretto).
  STORE: userStore.pendingShipment (dati spedizione da confermare), userStore.editingCartItemId.
  COMPONENTI: Steps, RiepilogoColliSection, RiepilogoAddressCard, RiepilogoServicesSection,
              RiepilogoTotalCard, RiepilogoActions.
  ROUTE: /riepilogo (pubblica, ma i dati arrivano dallo store Pinia).

  LOGICA: Tutta estratta in composables/useRiepilogo.js.
  COMPONENTI TEMPLATE: Estratti in components/riepilogo/*.vue.
-->
<script setup>
useSeoMeta({
	title: 'Riepilogo Spedizione | SpediamoFacile',
	ogTitle: 'Riepilogo Spedizione | SpediamoFacile',
});

definePageMeta({
	middleware: ['shipment-validation'],
});

const {
	// State
	isSubmitting, submitError, pageReady, loadingEditData,
	shipment, editingId, isEditFromCart, promoSettings,
	// Inline editing
	editingSection, editColli, editOrigin, editDestination,
	// Formatting
	formatPrice, getPackageTypeVisual, formatServiceDisplayName,
	totalPrice, preOrderNumber,
	// Actions
	initRiepilogoPage, startEdit, cancelEdit, saveEdit,
	proceedToCheckout, goToSavedShipments, addAnotherShipment,
	goToCart, goBack, goToServicesEdit,
	// Auth
	isAuthenticated,
} = useRiepilogo();

pageReady.value = await initRiepilogoPage();
</script>

<template>
	<section class="min-h-[600px]">
		<div class="my-container mt-[20px] tablet:mt-[32px] mb-[48px] tablet:mb-[84px] px-[12px] tablet:px-0">
			<!-- Skeleton loading -->
			<div v-if="!pageReady" class="space-y-[16px] animate-pulse">
				<div class="h-[64px] rounded-[12px] border border-[#E5EAEC] bg-white/90"></div>
				<div class="rounded-[12px] border border-[#E5EAEC] bg-white p-[18px] tablet:p-[24px] space-y-[14px]">
					<div class="h-[24px] w-[44%] rounded-[12px] bg-[#EEF3F5]"></div>
					<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[12px]">
						<div class="h-[124px] rounded-[12px] bg-[#EEF3F5]"></div>
						<div class="h-[124px] rounded-[12px] bg-[#EEF3F5]"></div>
					</div>
					<div class="h-[82px] rounded-[12px] bg-[#EEF3F5]"></div>
					<div class="grid grid-flow-col auto-cols-[minmax(220px,1fr)] gap-[12px] overflow-hidden tablet:grid-flow-row tablet:grid-cols-3">
						<div class="h-[78px] rounded-[12px] bg-[#F4F7F9]"></div>
						<div class="h-[78px] rounded-[12px] bg-[#F4F7F9]"></div>
						<div class="h-[78px] rounded-[12px] bg-[#F4F7F9]"></div>
					</div>
				</div>
			</div>
			<template v-else>
			<Steps v-if="!isEditFromCart" :current-step="3" />

			<!-- Loading state per modifica dal carrello -->
			<div v-if="loadingEditData" class="text-center py-[60px]">
				<div class="inline-block w-[40px] h-[40px] border-4 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin mb-[16px]"></div>
				<p class="text-[1rem] text-[#737373]">Caricamento dati spedizione...</p>
			</div>

			<div v-else-if="!shipment" class="text-center py-[60px]">
				<p class="text-[1rem] text-[#737373]">Nessuna spedizione pronta. Torna alla configurazione.</p>
				<NuxtLink to="/la-tua-spedizione/2" class="btn-primary inline-flex mt-[20px] min-h-[48px] items-center justify-center">
					Torna alla configurazione
				</NuxtLink>
			</div>

			<div v-else class="mx-auto">
				<!-- Header -->
				<div class="sf-page-intro sf-page-intro--center mb-[28px] tablet:mb-[32px]">
					<h1 class="sf-section-title max-w-[16ch]">{{ editingId ? 'Aggiorna spedizione' : 'Riepilogo' }}</h1>
					<div v-if="!isEditFromCart" class="inline-flex items-center gap-[8px] rounded-[999px] border border-[#D6E7EA] bg-white px-[14px] py-[6px] shadow-[0_8px_18px_rgba(20,37,48,0.05)]">
						<span class="sf-section-kicker !mb-0">Ordine</span>
						<span class="font-mono text-[0.875rem] font-bold text-[#095866]">{{ preOrderNumber }}</span>
					</div>
				</div>

				<!-- Colli -->
				<RiepilogoColliSection
					:packages="shipment.packages"
					:editing-section="editingSection"
					:edit-colli="editColli"
					:format-price="formatPrice"
					:get-package-type-visual="getPackageTypeVisual"
					@start-edit="startEdit"
					@cancel-edit="cancelEdit"
					@save-edit="saveEdit"
				/>

				<!-- Indirizzi -->
				<div class="grid grid-cols-1 desktop:grid-cols-2 gap-[16px] mb-[16px]">
					<RiepilogoAddressCard
						type="origin"
						:address="shipment.origin_address"
						:edit-address="editOrigin"
						:editing-section="editingSection"
						@start-edit="startEdit"
						@cancel-edit="cancelEdit"
						@save-edit="saveEdit"
						@update:edit-address="editOrigin = $event"
					/>
					<RiepilogoAddressCard
						type="destination"
						:address="shipment.destination_address"
						:edit-address="editDestination"
						:editing-section="editingSection"
						:pudo="shipment.pudo"
						:go-back="goBack"
						@start-edit="startEdit"
						@cancel-edit="cancelEdit"
						@save-edit="saveEdit"
						@update:edit-address="editDestination = $event"
					/>
				</div>

				<!-- Servizi -->
				<RiepilogoServicesSection
					:services="shipment.services"
					:format-service-display-name="formatServiceDisplayName"
					@edit-services="goToServicesEdit"
				/>

				<!-- Totale -->
				<RiepilogoTotalCard
					:total-price="totalPrice"
					:promo-settings="promoSettings"
				/>

				<!-- Azioni -->
				<RiepilogoActions
					:is-edit-from-cart="isEditFromCart"
					:is-submitting="isSubmitting"
					:is-authenticated="isAuthenticated"
					:submit-error="submitError"
					@go-back="goBack"
					@proceed-checkout="proceedToCheckout"
					@go-to-cart="goToCart"
					@go-to-saved="goToSavedShipments"
					@add-another="addAnotherShipment"
				/>
			</div>
			</template>
		</div>
	</section>
</template>
