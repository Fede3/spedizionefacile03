<!--
  FILE: pages/account/amministrazione/prezzi.vue
  SCOPO: Pannello admin — editor fasce di prezzo (peso e volume) e gestione promozione sito.
         Tabelle editabili inline con prezzi base, scontati, percentuale sconto, toggle visibilita'.
         Sezione promozione: etichetta personalizzabile, colore, immagine, descrizione, anteprima live.
  API: GET /api/admin/price-bands — leggi fasce prezzo,
       PUT /api/admin/price-bands — salva modifiche fasce,
       POST /api/admin/price-bands/seed — inizializza fasce nel DB,
       GET /api/admin/promo-settings — leggi impostazioni promo,
       POST /api/admin/promo-settings — salva impostazioni promo,
       POST /api/admin/promo-settings/upload-image — carica immagine promo.
  COMPONENTI: AdminPrezziNazionale, AdminPrezziEuropa, AdminPrezziServizi, AdminPrezziPromo.
  COMPOSABLE: useAdminPrezzi — logica completa del pannello prezzi.
  ROUTE: /account/amministrazione/prezzi (middleware sanctum:auth + admin).
  CSS: assets/css/admin-prezzi.css
-->
<script setup>
definePageMeta({
	middleware: ["app-auth", "admin"],
});

const {
	// State
	isLoading, saving, seeding, weightBands, volumeBands, bandsFromDb,
	extraRules, supplementRules, pricingVersion,
	europePricing, servicePricing, automaticSupplements, operationalFees,
	adminView, compactEuropeView, europeSearch, europeStatusFilter,
	europeBandFilter, europeSort, serviceSearch, serviceFilter,
	promoLoading, promoSaving, promoImageUploading, promo,
	editingCell, editValue, actionMessage,
	// Computed
	hasChanges, servicePricingEntries, automaticSupplementEntries,
	operationalFeeEntries, filteredServiceEntries, europeBandFilters,
	filteredEuropeBands, extraRuleExamples, pricingPreviewCases,
	// Utility
	centsToEuro, euroToCents, effectivePrice, discountInfo,
	formatApplicationLabel,
	// Band actions
	startEdit, confirmEdit, cancelEdit, toggleShowDiscount,
	addBand, removeBand, moveBand,
	// Supplement actions
	addSupplement, removeSupplement, supplementAmountToEuro, updateSupplementAmountFromEuro,
	// Service/keyed rule helpers
	keyedRuleAmountToEuro, updateKeyedRuleAmountFromEuro,
	keyedRuleMinFeeToEuro, updateKeyedRuleMinFeeFromEuro,
	updateArrayField, addTierRow, removeTierRow,
	// Europe helpers
	updateEuropeRateAmountFromEuro, toggleEuropeRateQuote,
	// Fetch/save
	fetchPriceBands, fetchPromoSettings, seedBands, savePriceBands, savePromo, uploadPromoImage,
} = useAdminPrezzi();

onMounted(() => {
	fetchPriceBands();
	fetchPromoSettings();
	if (window.innerWidth < 1280) {
		compactEuropeView.value = true;
	}
});
</script>

<template>
	<section class="admin-prezzi-section">
		<div class="my-container">
			<!-- Breadcrumb -->
			<div class="admin-prezzi-breadcrumb">
				<NuxtLink to="/account" class="hover:underline text-[#095866] font-medium">Account</NuxtLink>
				<span class="mx-[8px] text-[#C8CCD0]">/</span>
				<span class="font-semibold text-[#252B42]">Prezzi e fasce</span>
			</div>

			<h1 class="admin-prezzi-title">Prezzi e fasce</h1>
			<p class="admin-prezzi-subtitle">Clicca su un prezzo per modificarlo. Premi Invio per confermare o Esc per annullare.</p>

			<!-- Tab navigation + filters -->
			<div class="admin-prezzi-tabs-card">
				<div class="grid gap-[12px]">
					<div class="grid grid-cols-1 tablet:grid-cols-3 gap-[10px] tablet:gap-[12px] desktop:max-w-[800px] desktop:w-full">
						<button
							v-for="view in [
								{ id: 'nazionale', label: 'Nazionale' },
								{ id: 'europa', label: 'Europa monocollo' },
								{ id: 'servizi', label: 'Servizi e supplementi' },
							]"
							:key="view.id"
							type="button"
							@click="adminView = view.id"
							:class="adminView === view.id ? 'bg-[#095866] text-white border-[#095866]' : 'bg-[#F7FAFC] text-[#425466] border-[#D8E3E8]'"
							class="admin-prezzi-tab-btn">
							{{ view.label }}
						</button>
					</div>

					<!-- Context-dependent filters -->
					<div class="admin-prezzi-filters-row">
						<div v-if="adminView === 'europa'" class="grid w-full grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-[minmax(0,1fr)_160px_160px_180px_auto] gap-[10px]">
							<input v-model="europeSearch" type="text" placeholder="Cerca paese o codice..." class="admin-prezzi-input">
							<select v-model="europeStatusFilter" class="admin-prezzi-input">
								<option value="all">Tutti</option>
								<option value="active">Prezzo attivo</option>
								<option value="quote_required">Solo preventivo</option>
							</select>
							<select v-model="europeBandFilter" class="admin-prezzi-input">
								<option v-for="option in europeBandFilters" :key="option.value" :value="option.value">{{ option.label }}</option>
							</select>
							<select v-model="europeSort" class="admin-prezzi-input">
								<option value="country_asc">Ordina per paese</option>
								<option value="price_asc">Prezzo crescente</option>
								<option value="price_desc">Prezzo decrescente</option>
								<option value="status">Per stato</option>
							</select>
							<label class="inline-flex min-h-[42px] items-center gap-[8px] whitespace-nowrap text-[0.8125rem] text-[#4F5D75] desktop:justify-self-end">
								<input v-model="compactEuropeView" type="checkbox" class="rounded border-[#C8CCD0] text-[#095866] focus:ring-[#095866]">
								Vista compatta
							</label>
						</div>

						<div v-else-if="adminView === 'servizi'" class="grid w-full grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-[minmax(0,1fr)_190px_auto] gap-[10px]">
							<input v-model="serviceSearch" type="text" placeholder="Cerca regola o supplemento..." class="admin-prezzi-input">
							<select v-model="serviceFilter" class="admin-prezzi-input">
								<option value="all">Tutte le sezioni</option>
								<option value="service_pricing">Servizi utente</option>
								<option value="automatic_supplements">Supplementi automatici</option>
								<option value="operational_fees">Fee operative</option>
							</select>
							<div class="inline-flex min-h-[42px] items-center gap-[8px] px-[12px] py-[10px] rounded-[12px] bg-[#F4FAFC] border border-[#D8E9F0] text-[0.8125rem] text-[#095866] desktop:justify-self-end">
								{{ filteredServiceEntries.length }} regole visibili
							</div>
						</div>

						<div v-else class="inline-flex min-h-[42px] items-center gap-[8px] rounded-[12px] bg-[#F8FBFC] border border-[#E2ECEF] px-[12px] py-[10px] text-[0.8125rem] text-[#5B6B7D]">
							Gestisci fasce nazionali, volume e supplementi CAP da un layout stabile.
						</div>
					</div>
				</div>
			</div>

			<!-- Info calcolatore -->
			<div class="admin-prezzi-info-box">
				<h3 class="text-[0.9375rem] font-bold text-purple-800 mb-[8px] flex items-center gap-[6px]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M7,2H17A2,2 0 0,1 19,4V20A2,2 0 0,1 17,22H7A2,2 0 0,1 5,20V4A2,2 0 0,1 7,2M7,4V8H17V4H7M7,10V12H9V10H7M11,10V12H13V10H11M15,10V12H17V10H15M7,14V16H9V14H7M11,14V16H13V14H11M15,14V16H17V14H15M7,18V20H9V18H7M11,18V20H13V18H11M15,18V20H17V18H15Z"/></svg>
					Come funziona il calcolatore
				</h3>
				<ul class="text-[0.8125rem] text-purple-700 space-y-[4px] list-disc list-inside">
					<li><strong>Prezzo finale = MAX(prezzo_peso, prezzo_volume)</strong> + supplementi CAP configurati</li>
					<li><strong>Peso volumetrico:</strong> (Lunghezza x Larghezza x Altezza) / 5000 (dimensioni in cm)</li>
					<li><strong>Supplementi CAP:</strong> definibili da admin per prefisso, importo e applicazione (origine/destinazione/entrambi)</li>
					<li>Se c'e' un <strong>prezzo scontato</strong>, viene usato al posto del prezzo base</li>
					<li>Il prezzo visualizzato dal cliente e' il <strong>"Prezzo effettivo"</strong> in verde</li>
					<li><strong>Sconto %:</strong> calcolato automaticamente come (1 - scontato/base) &times; 100</li>
					<li><strong>Visibile:</strong> controlla se il badge sconto appare sul sito per quella fascia</li>
				</ul>
			</div>

			<!-- Action message -->
			<div
				v-if="actionMessage"
				:class="[
					'admin-prezzi-message',
					actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200',
				]">
				<svg v-if="actionMessage.type === 'success'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg>
				<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
				{{ actionMessage.text }}
			</div>

			<!-- Loading -->
			<div v-if="isLoading" class="py-[60px] flex justify-center">
				<div class="w-[40px] h-[40px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></div>
			</div>

			<template v-else>
				<div class="space-y-[24px]">
					<!-- Nazionale -->
					<AdminPrezziNazionale
						v-if="adminView === 'nazionale'"
						:weight-bands="weightBands"
						:volume-bands="volumeBands"
						:extra-rules="extraRules"
						:supplement-rules="supplementRules"
						:bands-from-db="bandsFromDb"
						:seeding="seeding"
						:editing-cell="editingCell"
						v-model:edit-value="editValue"
						:extra-rule-examples="extraRuleExamples"
						:pricing-preview-cases="pricingPreviewCases"
						:cents-to-euro="centsToEuro"
						:euro-to-cents="euroToCents"
						:effective-price="effectivePrice"
						:discount-info="discountInfo"
						:start-edit="startEdit"
						:confirm-edit="confirmEdit"
						:cancel-edit="cancelEdit"
						:toggle-show-discount="toggleShowDiscount"
						:add-band="addBand"
						:remove-band="removeBand"
						:move-band="moveBand"
						:seed-bands="seedBands"
						:add-supplement="addSupplement"
						:remove-supplement="removeSupplement"
						:supplement-amount-to-euro="supplementAmountToEuro"
						:update-supplement-amount-from-euro="updateSupplementAmountFromEuro"
					/>

					<!-- Europa monocollo -->
					<AdminPrezziEuropa
						v-if="adminView === 'europa'"
						:europe-pricing="europePricing"
						:filtered-europe-bands="filteredEuropeBands"
						:compact-europe-view="compactEuropeView"
						:cents-to-euro="centsToEuro"
						:update-europe-rate-amount-from-euro="updateEuropeRateAmountFromEuro"
						:toggle-europe-rate-quote="toggleEuropeRateQuote"
					/>

					<!-- Servizi e supplementi -->
					<AdminPrezziServizi
						v-if="adminView === 'servizi'"
						:service-pricing-entries="servicePricingEntries"
						:automatic-supplement-entries="automaticSupplementEntries"
						:operational-fee-entries="operationalFeeEntries"
						:filtered-service-entries="filteredServiceEntries"
						:euro-to-cents="euroToCents"
						:format-application-label="formatApplicationLabel"
						:keyed-rule-amount-to-euro="keyedRuleAmountToEuro"
						:update-keyed-rule-amount-from-euro="updateKeyedRuleAmountFromEuro"
						:keyed-rule-min-fee-to-euro="keyedRuleMinFeeToEuro"
						:update-keyed-rule-min-fee-from-euro="updateKeyedRuleMinFeeFromEuro"
						:update-array-field="updateArrayField"
						:add-tier-row="addTierRow"
						:remove-tier-row="removeTierRow"
					/>

					<!-- Save configurazione prezzi -->
					<div class="admin-prezzi-save-bar">
						<div class="flex items-center gap-[8px] text-[0.75rem]">
							<span v-if="pricingVersion" class="inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-[999px] bg-[#E8F4FB] text-[#095866] border border-[#B0D4E8]">
								Versione {{ pricingVersion }}
							</span>
							<span v-if="hasChanges" class="inline-flex items-center gap-[4px] px-[10px] py-[4px] rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-200">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>
								Modifiche non salvate
							</span>
						</div>
						<button @click="savePriceBands" :disabled="saving || !hasChanges" class="admin-prezzi-save-btn">
							<svg v-if="saving" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] animate-spin" fill="currentColor"><path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/></svg>
							<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z"/></svg>
							{{ saving ? "Salvataggio..." : "Salva configurazione prezzi" }}
						</button>
					</div>

					<!-- Promozione Sito -->
					<AdminPrezziPromo
						:promo="promo"
						:promo-loading="promoLoading"
						:promo-saving="promoSaving"
						:promo-image-uploading="promoImageUploading"
						:save-promo="savePromo"
						:upload-promo-image="uploadPromoImage"
					/>
				</div>
			</template>
		</div>
	</section>
</template>
<!-- CSS in assets/css/admin-prezzi.css -->
