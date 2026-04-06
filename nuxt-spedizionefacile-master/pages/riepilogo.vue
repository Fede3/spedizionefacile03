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
	description: 'Controlla i dettagli della tua spedizione prima di aggiungerla al carrello o procedere al pagamento.',
	ogDescription: 'Controlla i dettagli della tua spedizione prima di aggiungerla al carrello o procedere al pagamento.',
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
	<section class="riepilogo-page min-h-[600px]">
		<div class="max-w-[1280px] mx-auto px-[14px] sm:px-[40px] mt-[24px] tablet:mt-[40px] mb-[60px] tablet:mb-[80px]">
			<!-- Skeleton loading -->
			<div v-if="!pageReady" class="space-y-[16px] animate-pulse">
				<div class="h-[64px] rounded-[16px] ring-[1.5px] ring-[#DFE2E7] bg-[#F5F6F9]" style="box-shadow: 0 1px 4px rgba(0,0,0,0.03)"></div>
				<div class="rounded-[16px] ring-[1.5px] ring-[#DFE2E7] bg-[#F5F6F9] p-[20px] tablet:p-[20px] space-y-[14px]" style="box-shadow: 0 1px 4px rgba(0,0,0,0.03)">
					<div class="h-[24px] w-[44%] rounded-[10px] bg-[#EEF0F3]"></div>
					<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[16px]">
						<div class="h-[124px] rounded-[14px] bg-[#EEF0F3]"></div>
						<div class="h-[124px] rounded-[14px] bg-[#EEF0F3]"></div>
					</div>
					<div class="h-[82px] rounded-[14px] bg-[#EEF0F3]"></div>
					<div class="h-[72px] rounded-[14px] bg-[#EEF0F3]"></div>
				</div>
			</div>
			<template v-else>
			<Steps v-if="!isEditFromCart" :current-step="3" />

			<!-- Loading state per modifica dal carrello -->
			<div v-if="loadingEditData" class="text-center py-[60px]">
				<div class="inline-block w-[40px] h-[40px] border-4 border-[var(--color-brand-border)] border-t-[var(--color-brand-primary)] rounded-full animate-spin mb-[16px]"></div>
				<p class="text-[1rem] text-[var(--color-brand-text-secondary)]">Caricamento dati spedizione...</p>
			</div>

			<div v-else-if="!shipment" class="text-center py-[60px]">
				<p class="text-[1rem] text-[var(--color-brand-text-secondary)]">Nessuna spedizione pronta. Torna alla configurazione.</p>
				<NuxtLink to="/la-tua-spedizione/2" class="riepilogo-back-link inline-flex mt-[20px] min-h-[50px] items-center justify-center rounded-full ring-[1.5px] ring-[#DFE2E7] bg-white px-[24px] py-[11px] font-bold text-[var(--color-brand-text-secondary)] hover:bg-[#F8F9FB] transition-colors">
					Torna alla configurazione
				</NuxtLink>
			</div>

			<div v-else class="mx-auto">
				<!-- Header -->
				<div class="sf-page-intro sf-page-intro--center mb-[28px] tablet:mb-[32px]">
					<p class="riepilogo-eyebrow text-[0.75rem] font-[700] uppercase tracking-wide text-[var(--color-brand-primary)]">Riepilogo ordine</p>
					<h1 class="font-montserrat font-[800] tracking-[-0.5px] text-[var(--color-brand-text)]" style="font-size: clamp(1.5rem, 3.5vw, 1.75rem); line-height: 1.1">{{ editingId ? 'Aggiorna spedizione' : 'Riepilogo' }}</h1>
					<div v-if="!isEditFromCart" class="inline-flex items-center gap-[8px] rounded-full ring-[1px] ring-[#DFE2E7] bg-white px-[14px] py-[6px]" style="box-shadow: 0 1px 4px rgba(0,0,0,0.03)">
						<span class="text-[0.75rem] font-[700] uppercase tracking-wide text-[var(--color-brand-primary)]">Ordine</span>
						<span class="font-mono text-[0.875rem] font-bold text-[var(--color-brand-primary)]">{{ preOrderNumber }}</span>
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
				<div class="grid grid-cols-1 desktop:grid-cols-2 gap-[16px] mb-[28px]">
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
