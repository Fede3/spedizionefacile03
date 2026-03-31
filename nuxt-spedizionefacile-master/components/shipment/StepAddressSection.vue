<!--
  FILE: components/shipment/StepAddressSection.vue
  SCOPO: Sezione indirizzi (partenza + destinazione) con PUDO, rubrica, spedizioni configurate.
  Toolbar delegato a ShipmentAddressToolbar.vue, PUDO a ShipmentAddressPudoSection.vue.
-->
<script setup>
const props = defineProps({
	originAddress: { type: Object, required: true },
	destinationAddress: { type: Object, required: true },
	deliveryMode: { type: String, required: true },
	showGlobalFormSummary: { type: Boolean, default: false },
	formErrorSummary: { type: Array, default: () => [] },
	originSectionHint: { type: String, default: "" },
	destinationSectionHint: { type: String, default: "" },
	routeWarningMessage: { type: String, default: "" },
	fieldClass: { type: Function, required: true },
	getFieldError: { type: Function, required: true },
	fieldErrorText: { type: Function, required: true },
	getFieldAssist: { type: Function, required: true },
	applyFieldAssist: { type: Function, required: true },
	smartBlur: { type: Function, required: true },
	onNameInput: { type: Function, required: true },
	onCityInput: { type: Function, required: true },
	onCityFocus: { type: Function, required: true },
	onProvinciaInput: { type: Function, required: true },
	onProvinceFocus: { type: Function, required: true },
	onCapInput: { type: Function, required: true },
	onCapFocus: { type: Function, required: true },
	onTelefonoInput: { type: Function, required: true },
	selectCity: { type: Function, required: true },
	selectProvincia: { type: Function, required: true },
	selectCap: { type: Function, required: true },
	formatCitySuggestionLabel: { type: Function, required: true },
	formatCapSuggestionLabel: { type: Function, required: true },
	sv: { type: Object, required: true },
	originCitySuggestions: { type: Array, default: () => [] },
	originProvinceSuggestions: { type: Array, default: () => [] },
	originCapSuggestions: { type: Array, default: () => [] },
	destCitySuggestions: { type: Array, default: () => [] },
	destProvinceSuggestions: { type: Array, default: () => [] },
	destCapSuggestions: { type: Array, default: () => [] },
	canSaveOriginAddress: { type: Boolean, default: false },
	canSaveDestAddress: { type: Boolean, default: false },
	savingOriginAddress: { type: Boolean, default: false },
	savingDestAddress: { type: Boolean, default: false },
	originSaveSuccess: { type: Boolean, default: false },
	destSaveSuccess: { type: Boolean, default: false },
	savedAddresses: { type: Array, default: () => [] },
	loadingSavedAddresses: { type: Boolean, default: false },
	showOriginAddressSelector: { type: Boolean, default: false },
	showDestAddressSelector: { type: Boolean, default: false },
	showOriginGuestPrompt: { type: Boolean, default: false },
	showDestGuestPrompt: { type: Boolean, default: false },
	savedConfigs: { type: Array, default: () => [] },
	loadingConfigs: { type: Boolean, default: false },
	showDefaultDropdown: { type: Boolean, default: false },
	showDefaultDropdownTarget: { type: String, default: "" },
	showOriginConfigGuestPrompt: { type: Boolean, default: false },
	showDestConfigGuestPrompt: { type: Boolean, default: false },
	isAuthenticated: { type: Boolean, default: false },
	selectedPudo: { type: Object, default: null },
});

const emit = defineEmits([
	"update:delivery-mode", "save-address", "load-saved-configs", "apply-config",
	"toggle-address-selector", "apply-saved-address", "focus-form-error",
	"open-auth-modal", "pudo-selected", "pudo-deselected",
]);

const defaultDropdownRef = defineModel("defaultDropdownRef", { type: Object });
const destDefaultDropdownRef = defineModel("destDefaultDropdownRef", { type: Object });
const originSelectorRef = defineModel("originSelectorRef", { type: Object });
const destSelectorRef = defineModel("destSelectorRef", { type: Object });

const originToolbarComp = ref(null);
const destToolbarComp = ref(null);

watch(originToolbarComp, (comp) => {
	if (!comp) return;
	defaultDropdownRef.value = comp.configDropdownRef;
	originSelectorRef.value = comp.addressSelectorRef;
});
watch(destToolbarComp, (comp) => {
	if (!comp) return;
	destDefaultDropdownRef.value = comp.configDropdownRef;
	destSelectorRef.value = comp.addressSelectorRef;
});

/* Shared address form fields props (avoids duplication in template) */
const sharedFieldProps = {
	fieldClass: props.fieldClass, getFieldError: props.getFieldError,
	fieldErrorText: props.fieldErrorText, getFieldAssist: props.getFieldAssist,
	applyFieldAssist: props.applyFieldAssist, smartBlur: props.smartBlur,
	onNameInput: props.onNameInput, onCityInput: props.onCityInput,
	onCityFocus: props.onCityFocus, onProvinciaInput: props.onProvinciaInput,
	onProvinceFocus: props.onProvinceFocus, onCapInput: props.onCapInput,
	onCapFocus: props.onCapFocus, onTelefonoInput: props.onTelefonoInput,
	selectCity: props.selectCity, selectProvincia: props.selectProvincia,
	selectCap: props.selectCap, formatCitySuggestionLabel: props.formatCitySuggestionLabel,
	formatCapSuggestionLabel: props.formatCapSuggestionLabel, sv: props.sv,
};
</script>

<template>
	<div class="address-stage-shell sf-stack-block">
		<div class="address-stage-banner flow-section-header flow-section-header--addresses sf-section-block__header">
			<div class="address-stage-banner__copy flow-section-header__copy">
				<h3 class="address-stage-banner__title flow-section-header__title sf-section-title">Indirizzi</h3>
			</div>
		</div>

		<div>
			<!-- Error summary -->
			<div v-if="showGlobalFormSummary" class="ux-alert ux-alert--soft mt-[18px]">
				<svg xmlns="http://www.w3.org/2000/svg" class="ux-alert__icon" viewBox="0 0 24 24"><path fill="currentColor" d="M11 15h2v2h-2zm0-8h2v6h-2z"/><path fill="currentColor" d="M1 21h22L12 2zm12-3h-2v-2h2zm0-4h-2V8h2z"/></svg>
				<div class="min-w-0">
					<span class="ux-alert__title">Controlliamo insieme questi campi</span>
					<ul class="mt-[6px] space-y-[4px]">
						<li v-for="errorItem in formErrorSummary" :key="errorItem.key">
							<button type="button" class="text-left text-[0.8125rem] text-[#7A5A2C] underline decoration-[#D7B078] hover:decoration-[#B8823B] cursor-pointer" @click="$emit('focus-form-error', errorItem)">{{ errorItem.label }}: {{ errorItem.message }}</button>
						</li>
					</ul>
				</div>
			</div>

			<!-- PARTENZA -->
			<div class="bg-[#E4E4E4] rounded-[12px] text-[#252B42] mt-[20px] px-[16px] tablet:px-[40px] pt-[24px] tablet:pt-[36px] pb-[24px] tablet:pb-[44px]">
				<div class="flex items-center justify-between mb-[20px] tablet:mb-[40px] flex-wrap gap-[10px]">
					<div class="flex items-center gap-[10px]">
						<h2 class="font-bold text-[1.125rem] tracking-[0.1px]">Partenza</h2>
						<button v-if="canSaveOriginAddress" type="button" @click="$emit('save-address', 'origin')" :disabled="savingOriginAddress" class="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[6px] bg-[#095866] text-white hover:bg-[#074a56] transition cursor-pointer disabled:opacity-60" title="Salva indirizzo" aria-label="Salva indirizzo partenza">
							<svg v-if="!savingOriginAddress" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
							<svg v-else class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
						</button>
						<span v-if="originSaveSuccess" class="inline-flex items-center gap-[4px] text-[0.75rem] text-green-600 font-semibold">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
							Salvato
						</span>
					</div>
					<ShipmentAddressToolbar ref="originToolbarComp" type="origin" :is-authenticated="isAuthenticated" :saved-configs="savedConfigs" :loading-configs="loadingConfigs" :show-config-dropdown="showDefaultDropdown && showDefaultDropdownTarget === 'origin'" :show-config-guest-prompt="showOriginConfigGuestPrompt" :saved-addresses="savedAddresses" :loading-saved-addresses="loadingSavedAddresses" :show-address-selector="showOriginAddressSelector" :show-guest-prompt="showOriginGuestPrompt" @load-saved-configs="$emit('load-saved-configs', $event)" @apply-config="$emit('apply-config', $event, 'both')" @toggle-address-selector="$emit('toggle-address-selector', $event)" @apply-saved-address="(addr, t) => $emit('apply-saved-address', addr, t)" @open-auth-modal="$emit('open-auth-modal', $event)" />
				</div>
				<div v-if="originSectionHint" class="ux-alert ux-alert--soft mb-[12px]">
					<svg xmlns="http://www.w3.org/2000/svg" class="ux-alert__icon" viewBox="0 0 24 24"><path fill="currentColor" d="M11 15h2v2h-2zm0-8h2v6h-2z"/><path fill="currentColor" d="M1 21h22L12 2z"/></svg>
					<span>{{ originSectionHint }}</span>
				</div>
				<ShipmentAddressFormFields type="origin" :address="originAddress" v-bind="sharedFieldProps" :city-suggestions="originCitySuggestions" :province-suggestions="originProvinceSuggestions" :cap-suggestions="originCapSuggestions" />
			</div>

			<!-- PUDO toggle + selector -->
			<ShipmentAddressPudoSection :delivery-mode="deliveryMode" :destination-address="destinationAddress" :selected-pudo="selectedPudo" @update:delivery-mode="$emit('update:delivery-mode', $event)" @pudo-selected="$emit('pudo-selected', $event)" @pudo-deselected="$emit('pudo-deselected')" />

			<!-- DESTINAZIONE -->
			<div class="bg-[#E4E4E4] rounded-[12px] text-[#252B42] mt-[20px] px-[16px] tablet:px-[40px] pt-[24px] tablet:pt-[36px] pb-[24px] tablet:pb-[44px]">
				<div class="flex items-center justify-between mb-[20px] tablet:mb-[40px]">
					<div class="flex items-center gap-[10px]">
						<h2 class="font-bold text-[1.125rem] tracking-[0.1px]">{{ deliveryMode === 'pudo' ? 'Destinazione (Punto BRT)' : 'Destinazione' }}</h2>
						<button v-if="canSaveDestAddress && deliveryMode !== 'pudo'" type="button" @click="$emit('save-address', 'dest')" :disabled="savingDestAddress" class="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[6px] bg-[#095866] text-white hover:bg-[#074a56] transition cursor-pointer disabled:opacity-60" title="Salva indirizzo" aria-label="Salva indirizzo destinazione">
							<svg v-if="!savingDestAddress" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
							<svg v-else class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
						</button>
						<span v-if="destSaveSuccess" class="inline-flex items-center gap-[4px] text-[0.75rem] text-green-600 font-semibold">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
							Salvato
						</span>
					</div>
					<ShipmentAddressToolbar ref="destToolbarComp" type="dest" :is-authenticated="isAuthenticated" :saved-configs="savedConfigs" :loading-configs="loadingConfigs" :show-config-dropdown="showDefaultDropdown && showDefaultDropdownTarget === 'dest'" :show-config-guest-prompt="showDestConfigGuestPrompt" :saved-addresses="savedAddresses" :loading-saved-addresses="loadingSavedAddresses" :show-address-selector="showDestAddressSelector" :show-guest-prompt="showDestGuestPrompt" @load-saved-configs="$emit('load-saved-configs', $event)" @apply-config="$emit('apply-config', $event, 'both')" @toggle-address-selector="$emit('toggle-address-selector', $event)" @apply-saved-address="(addr, t) => $emit('apply-saved-address', addr, t)" @open-auth-modal="$emit('open-auth-modal', $event)" />
				</div>
				<div v-if="destinationSectionHint" class="ux-alert ux-alert--soft mb-[12px]">
					<svg xmlns="http://www.w3.org/2000/svg" class="ux-alert__icon" viewBox="0 0 24 24"><path fill="currentColor" d="M11 15h2v2h-2zm0-8h2v6h-2z"/><path fill="currentColor" d="M1 21h22L12 2z"/></svg>
					<span>{{ destinationSectionHint }}</span>
				</div>
				<div v-if="deliveryMode === 'pudo' && selectedPudo" class="ux-alert ux-alert--info mb-[16px]">
					<svg width="16" height="16" viewBox="0 0 24 24" class="ux-alert__icon" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
					<span>Indirizzo compilato automaticamente dal Punto BRT selezionato.</span>
				</div>
				<div v-if="deliveryMode === 'pudo' && !selectedPudo" class="ux-alert ux-alert--soft mb-[16px]">
					<svg width="16" height="16" viewBox="0 0 24 24" class="ux-alert__icon" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
					<span>Seleziona un Punto BRT qui sopra per procedere.</span>
				</div>
				<div v-if="routeWarningMessage" class="ux-alert ux-alert--soft mb-[16px]">
					<svg width="16" height="16" viewBox="0 0 24 24" class="ux-alert__icon" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>
					<span>{{ routeWarningMessage }}</span>
				</div>
				<p v-if="deliveryMode === 'pudo'" class="text-[0.8125rem] text-[#4B5563] font-semibold mb-[10px]">Indirizzo di consegna bloccato dal Punto BRT selezionato</p>
				<ShipmentAddressFormFields type="dest" :address="destinationAddress" v-bind="sharedFieldProps" :city-suggestions="destCitySuggestions" :province-suggestions="destProvinceSuggestions" :cap-suggestions="destCapSuggestions" :readonly="deliveryMode === 'pudo'" :pudo-note="deliveryMode === 'pudo' ? 'Inserisci il nome della persona che ritira il pacco, non il nome del Punto BRT.' : ''" />
			</div>
		</div>
	</div>
</template>
