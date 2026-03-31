<!--
  FILE: components/shipment/StepAddressSection.vue
  SCOPO: Sezione indirizzi (partenza + destinazione) con PUDO, rubrica, spedizioni configurate — estratta da [step].vue.
-->
<script setup>
const props = defineProps({
	/* Addresses */
	originAddress: { type: Object, required: true },
	destinationAddress: { type: Object, required: true },
	deliveryMode: { type: String, required: true },

	/* Validation */
	showGlobalFormSummary: { type: Boolean, default: false },
	formErrorSummary: { type: Array, default: () => [] },
	originSectionHint: { type: String, default: "" },
	destinationSectionHint: { type: String, default: "" },
	routeWarningMessage: { type: String, default: "" },

	/* Address form field functions */
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

	/* Suggestions */
	originCitySuggestions: { type: Array, default: () => [] },
	originProvinceSuggestions: { type: Array, default: () => [] },
	originCapSuggestions: { type: Array, default: () => [] },
	destCitySuggestions: { type: Array, default: () => [] },
	destProvinceSuggestions: { type: Array, default: () => [] },
	destCapSuggestions: { type: Array, default: () => [] },

	/* Save address */
	canSaveOriginAddress: { type: Boolean, default: false },
	canSaveDestAddress: { type: Boolean, default: false },
	savingOriginAddress: { type: Boolean, default: false },
	savingDestAddress: { type: Boolean, default: false },
	originSaveSuccess: { type: Boolean, default: false },
	destSaveSuccess: { type: Boolean, default: false },

	/* Saved addresses */
	savedAddresses: { type: Array, default: () => [] },
	loadingSavedAddresses: { type: Boolean, default: false },
	showOriginAddressSelector: { type: Boolean, default: false },
	showDestAddressSelector: { type: Boolean, default: false },
	showOriginGuestPrompt: { type: Boolean, default: false },
	showDestGuestPrompt: { type: Boolean, default: false },

	/* Saved configs */
	savedConfigs: { type: Array, default: () => [] },
	loadingConfigs: { type: Boolean, default: false },
	showDefaultDropdown: { type: Boolean, default: false },
	showDefaultDropdownTarget: { type: String, default: "" },
	showOriginConfigGuestPrompt: { type: Boolean, default: false },
	showDestConfigGuestPrompt: { type: Boolean, default: false },

	/* Auth */
	isAuthenticated: { type: Boolean, default: false },

	/* PUDO */
	selectedPudo: { type: Object, default: null },
});

const emit = defineEmits([
	"update:delivery-mode",
	"save-address",
	"load-saved-configs",
	"apply-config",
	"toggle-address-selector",
	"apply-saved-address",
	"focus-form-error",
	"open-auth-modal",
	"pudo-selected",
	"pudo-deselected",
]);

/* Template refs forwarded from parent */
const defaultDropdownRef = defineModel("defaultDropdownRef", { type: Object });
const destDefaultDropdownRef = defineModel("destDefaultDropdownRef", { type: Object });
const originSelectorRef = defineModel("originSelectorRef", { type: Object });
const destSelectorRef = defineModel("destSelectorRef", { type: Object });
</script>

<template>
	<div class="address-stage-shell sf-stack-block">
		<div class="address-stage-banner flow-section-header flow-section-header--addresses sf-section-block__header">
			<div class="address-stage-banner__copy flow-section-header__copy">
				<h3 class="address-stage-banner__title flow-section-header__title sf-section-title">Indirizzi</h3>
			</div>
		</div>

		<!-- PARTENZA -->
		<div>
			<div
				v-if="showGlobalFormSummary"
				class="ux-alert ux-alert--soft mt-[18px]">
				<svg xmlns="http://www.w3.org/2000/svg" class="ux-alert__icon" viewBox="0 0 24 24"><path fill="currentColor" d="M11 15h2v2h-2zm0-8h2v6h-2z"/><path fill="currentColor" d="M1 21h22L12 2zm12-3h-2v-2h2zm0-4h-2V8h2z"/></svg>
				<div class="min-w-0">
					<span class="ux-alert__title">Controlliamo insieme questi campi</span>
					<ul class="mt-[6px] space-y-[4px]">
						<li v-for="errorItem in formErrorSummary" :key="errorItem.key">
							<button
								type="button"
								class="text-left text-[0.8125rem] text-[#7A5A2C] underline decoration-[#D7B078] hover:decoration-[#B8823B] cursor-pointer"
								@click="$emit('focus-form-error', errorItem)">
								{{ errorItem.label }}: {{ errorItem.message }}
							</button>
						</li>
					</ul>
				</div>
			</div>
			<div class="bg-[#E4E4E4] rounded-[16px] text-[#252B42] mt-[20px] px-[16px] tablet:px-[40px] pt-[24px] tablet:pt-[35px] pb-[24px] tablet:pb-[43px]">
				<div class="flex items-center justify-between mb-[20px] tablet:mb-[39px] flex-wrap gap-[10px]">
					<div class="flex items-center gap-[10px]">
						<h2 class="font-bold text-[1.125rem] tracking-[0.1px]">Partenza</h2>
						<button
							v-if="canSaveOriginAddress"
							type="button"
							@click="$emit('save-address', 'origin')"
							:disabled="savingOriginAddress"
							class="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[6px] bg-[#095866] text-white hover:bg-[#074a56] transition cursor-pointer disabled:opacity-60"
							title="Salva indirizzo">
							<svg v-if="!savingOriginAddress" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
							<svg v-else class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
						</button>
						<span v-if="originSaveSuccess" class="inline-flex items-center gap-[4px] text-[0.75rem] text-green-600 font-semibold">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
							Salvato
						</span>
					</div>
					<div class="flex items-center gap-[10px] flex-wrap">
						<!-- Spedizioni configurate -->
						<div ref="defaultDropdownRef" class="relative">
							<button
								type="button"
								@click="$emit('load-saved-configs', 'origin')"
								:aria-expanded="((isAuthenticated && showDefaultDropdown && showDefaultDropdownTarget === 'origin') || (!isAuthenticated && showOriginConfigGuestPrompt)) ? 'true' : 'false'"
								aria-controls="origin-config-dropdown"
								:disabled="isAuthenticated && loadingConfigs"
								class="address-utility-button address-utility-button--sand disabled:opacity-60">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
								{{ isAuthenticated && loadingConfigs ? '...' : 'Spedizioni configurate' }}
							</button>
							<div v-if="showDefaultDropdown && showDefaultDropdownTarget === 'origin' && savedConfigs.length > 0" id="origin-config-dropdown" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl max-h-[300px] overflow-y-auto w-[min(92vw,400px)]">
								<div class="p-[12px] border-b border-[#F0F0F0] text-[0.8125rem] font-bold text-[#252B42]">Seleziona una spedizione configurata completa</div>
								<div v-for="item in savedConfigs" :key="item.id" @click="$emit('apply-config', item, 'both')" class="px-[14px] py-[12px] cursor-pointer hover:bg-[#f0fafb] border-b border-[#F0F0F0] last:border-0 transition-colors">
									<div class="flex items-center gap-[8px]">
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#996D47" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
										<span class="text-[0.875rem] font-semibold text-[#252B42]">{{ item.origin_address?.city || 'Partenza' }}</span>
										<span class="text-[#737373]">&rarr;</span>
										<span class="text-[0.875rem] font-semibold text-[#252B42]">{{ item.destination_address?.city || 'Destinazione' }}</span>
									</div>
									<p class="text-[0.75rem] text-[#737373] mt-[2px]">{{ item.origin_address?.name || '' }} - {{ item.destination_address?.name || '' }}</p>
								</div>
							</div>
							<div v-if="showDefaultDropdown && showDefaultDropdownTarget === 'origin' && savedConfigs.length === 0 && !loadingConfigs" id="origin-config-dropdown" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl p-[20px] w-[min(92vw,300px)]">
								<p class="text-[0.875rem] text-[#737373]">Nessuna spedizione configurata salvata.</p>
								<NuxtLink to="/account/spedizioni-configurate" class="text-[0.8125rem] text-[#095866] hover:underline font-semibold mt-[8px] inline-block">Vai a spedizioni configurate</NuxtLink>
							</div>
							<div v-if="showOriginConfigGuestPrompt && !isAuthenticated" id="origin-config-dropdown" role="dialog" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl p-[14px] w-[min(92vw,300px)]">
								<p class="text-[0.8125rem] text-[#4B5563] leading-[1.45]">Per usare le spedizioni configurate devi accedere.</p>
								<div class="mt-[10px] flex items-center gap-[8px]">
									<button type="button" class="inline-flex items-center justify-center h-[34px] px-[12px] rounded-[8px] bg-[#095866] text-white text-[0.75rem] font-semibold hover:bg-[#074a56] transition cursor-pointer" @click="$emit('open-auth-modal', 'login')">Accedi</button>
									<button type="button" class="inline-flex items-center justify-center h-[34px] px-[12px] rounded-[8px] border border-[#C8D2D6] text-[#095866] text-[0.75rem] font-semibold hover:bg-[#F3F7F8] transition cursor-pointer" @click="$emit('open-auth-modal', 'register')">Registrati</button>
								</div>
							</div>
						</div>

						<!-- Indirizzi salvati -->
						<div ref="originSelectorRef" class="relative">
							<button
								type="button"
								@click="$emit('toggle-address-selector', 'origin')"
								:aria-expanded="(isAuthenticated ? showOriginAddressSelector : showOriginGuestPrompt) ? 'true' : 'false'"
								aria-controls="origin-addresses-dropdown"
								class="address-utility-button address-utility-button--teal">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
								Indirizzi salvati
							</button>
							<div v-if="showOriginAddressSelector && isAuthenticated" id="origin-addresses-dropdown" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl max-h-[250px] overflow-y-auto w-[min(92vw,320px)]">
								<div v-if="loadingSavedAddresses" class="p-[16px] text-center text-[0.8125rem] text-[#737373]">Caricamento...</div>
								<template v-else-if="savedAddresses.length > 0">
									<div v-for="addr in savedAddresses" :key="addr.id" @click="$emit('apply-saved-address', addr, 'origin')" class="px-[14px] py-[10px] cursor-pointer hover:bg-[#f0fafb] border-b border-[#F0F0F0] last:border-0 transition-colors">
										<p class="text-[0.875rem] font-semibold text-[#252B42]">{{ addr.name }}</p>
										<p class="text-[0.75rem] text-[#737373]">{{ addr.address }} {{ addr.address_number }}, {{ addr.postal_code }} {{ addr.city }}</p>
									</div>
								</template>
								<div v-else class="p-[16px]">
									<p class="text-[0.8125rem] text-[#737373]">Nessun indirizzo salvato.</p>
									<NuxtLink to="/account/indirizzi" class="text-[0.8125rem] text-[#095866] hover:underline font-semibold mt-[4px] inline-block">Aggiungi indirizzo</NuxtLink>
								</div>
							</div>
							<div v-if="showOriginGuestPrompt && !isAuthenticated" id="origin-addresses-dropdown" role="dialog" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl p-[14px] w-[min(92vw,280px)]">
								<p class="text-[0.8125rem] text-[#4B5563] leading-[1.45]">Per usare la rubrica indirizzi devi accedere.</p>
								<div class="mt-[10px] flex items-center gap-[8px]">
									<button type="button" class="inline-flex items-center justify-center h-[34px] px-[12px] rounded-[8px] bg-[#095866] text-white text-[0.75rem] font-semibold hover:bg-[#074a56] transition cursor-pointer" @click="$emit('open-auth-modal', 'login')">Accedi</button>
									<button type="button" class="inline-flex items-center justify-center h-[34px] px-[12px] rounded-[8px] border border-[#C8D2D6] text-[#095866] text-[0.75rem] font-semibold hover:bg-[#F3F7F8] transition cursor-pointer" @click="$emit('open-auth-modal', 'register')">Registrati</button>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div v-if="originSectionHint" class="ux-alert ux-alert--soft mb-[12px]">
					<svg xmlns="http://www.w3.org/2000/svg" class="ux-alert__icon" viewBox="0 0 24 24"><path fill="currentColor" d="M11 15h2v2h-2zm0-8h2v6h-2z"/><path fill="currentColor" d="M1 21h22L12 2z"/></svg>
					<span>{{ originSectionHint }}</span>
				</div>

				<ShipmentAddressFormFields
					type="origin"
					:address="originAddress"
					:field-class="fieldClass"
					:get-field-error="getFieldError"
					:field-error-text="fieldErrorText"
					:get-field-assist="getFieldAssist"
					:apply-field-assist="applyFieldAssist"
					:smart-blur="smartBlur"
					:on-name-input="onNameInput"
					:on-city-input="onCityInput"
					:on-city-focus="onCityFocus"
					:on-provincia-input="onProvinciaInput"
					:on-province-focus="onProvinceFocus"
					:on-cap-input="onCapInput"
					:on-cap-focus="onCapFocus"
					:on-telefono-input="onTelefonoInput"
					:select-city="selectCity"
					:select-provincia="selectProvincia"
					:select-cap="selectCap"
					:format-city-suggestion-label="formatCitySuggestionLabel"
					:format-cap-suggestion-label="formatCapSuggestionLabel"
					:sv="sv"
					:city-suggestions="originCitySuggestions"
					:province-suggestions="originProvinceSuggestions"
					:cap-suggestions="originCapSuggestions" />
			</div>

			<!-- TOGGLE MODALITA' CONSEGNA -->
			<div class="mt-[20px] mb-[4px]">
				<p class="text-[0.875rem] font-bold text-[#252B42] mb-[10px]">Modalità di consegna</p>
				<div class="flex flex-col tablet:flex-row gap-[10px]">
					<button
						type="button"
						@click="$emit('update:delivery-mode', 'home')"
						class="inline-flex items-center gap-[8px] px-[18px] py-[12px] rounded-[50px] text-[0.875rem] font-semibold border-2 transition-[background-color,color,border-color] duration-200 cursor-pointer"
						:class="deliveryMode === 'home' ? 'bg-[#095866] text-white border-[#095866]' : 'bg-white text-[#252B42] border-[#D0D0D0] hover:border-[#095866]'">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
						Consegna a domicilio
					</button>
					<button
						type="button"
						@click="$emit('update:delivery-mode', 'pudo')"
						class="inline-flex items-center gap-[8px] px-[18px] py-[12px] rounded-[50px] text-[0.875rem] font-semibold border-2 transition-[background-color,color,border-color] duration-200 cursor-pointer"
						:class="deliveryMode === 'pudo' ? 'bg-[#095866] text-white border-[#095866]' : 'bg-white text-[#252B42] border-[#D0D0D0] hover:border-[#095866]'">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
						Ritira in un Punto BRT
					</button>
				</div>
			</div>

			<!-- SELETTORE PUDO -->
			<div v-if="deliveryMode === 'pudo'" class="bg-[#E4E4E4] rounded-[16px] text-[#252B42] mt-[16px] px-[16px] tablet:px-[40px] pt-[24px] tablet:pt-[35px] pb-[24px] tablet:pb-[43px]">
				<h2 class="font-bold text-[1.125rem] tracking-[0.1px] flex items-center gap-[8px] mb-[4px]">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
					Cerca un Punto BRT
				</h2>
				<p class="text-[0.8125rem] text-[#737373] mb-[8px]">Cerca un tabaccaio, edicola o negozio convenzionato BRT vicino alla destinazione.</p>
				<PudoSelector
					:initial-city="destinationAddress.city"
					:initial-zip="destinationAddress.postal_code"
					@select="$emit('pudo-selected', $event)"
					@deselect="$emit('pudo-deselected')" />
				<div v-if="selectedPudo" class="mt-[16px] p-[12px] bg-white rounded-[10px] border-2 border-[#095866] text-[0.875rem]">
					<div class="flex items-center gap-[6px] text-[#095866] font-bold mb-[4px]">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
						Punto selezionato
					</div>
					<p class="font-semibold text-[#252B42]">{{ selectedPudo.name }}</p>
					<p class="text-[#737373]">{{ selectedPudo.address }}, {{ selectedPudo.zip_code }} {{ selectedPudo.city }}</p>
				</div>
			</div>

			<!-- DESTINAZIONE -->
			<div class="bg-[#E4E4E4] rounded-[16px] text-[#252B42] mt-[20px] px-[16px] tablet:px-[40px] pt-[24px] tablet:pt-[35px] pb-[24px] tablet:pb-[43px]">
				<div class="flex items-center justify-between mb-[20px] tablet:mb-[39px]">
					<div class="flex items-center gap-[10px]">
						<h2 class="font-bold text-[1.125rem] tracking-[0.1px]">
							{{ deliveryMode === 'pudo' ? 'Destinazione (Punto BRT)' : 'Destinazione' }}
						</h2>
						<button
							v-if="canSaveDestAddress && deliveryMode !== 'pudo'"
							type="button"
							@click="$emit('save-address', 'dest')"
							:disabled="savingDestAddress"
							class="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[6px] bg-[#095866] text-white hover:bg-[#074a56] transition cursor-pointer disabled:opacity-60"
							title="Salva indirizzo">
							<svg v-if="!savingDestAddress" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
							<svg v-else class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
						</button>
						<span v-if="destSaveSuccess" class="inline-flex items-center gap-[4px] text-[0.75rem] text-green-600 font-semibold">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
							Salvato
						</span>
					</div>
					<div class="flex items-center gap-[10px] flex-wrap justify-end">
						<div ref="destDefaultDropdownRef" class="relative">
							<button
								type="button"
								@click="$emit('load-saved-configs', 'dest')"
								:aria-expanded="((isAuthenticated && showDefaultDropdown && showDefaultDropdownTarget === 'dest') || (!isAuthenticated && showDestConfigGuestPrompt)) ? 'true' : 'false'"
								aria-controls="dest-config-dropdown"
								:disabled="isAuthenticated && loadingConfigs"
								class="address-utility-button address-utility-button--sand disabled:opacity-60">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
								{{ isAuthenticated && loadingConfigs ? '...' : 'Spedizioni configurate' }}
							</button>
							<div v-if="showDefaultDropdown && showDefaultDropdownTarget === 'dest' && savedConfigs.length > 0" id="dest-config-dropdown" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl max-h-[300px] overflow-y-auto w-[min(92vw,400px)]">
								<div class="p-[12px] border-b border-[#F0F0F0] text-[0.8125rem] font-bold text-[#252B42]">Seleziona una spedizione configurata completa</div>
								<div v-for="item in savedConfigs" :key="`dest-config-${item.id}`" @click="$emit('apply-config', item, 'both')" class="px-[14px] py-[12px] cursor-pointer hover:bg-[#f0fafb] border-b border-[#F0F0F0] last:border-0 transition-colors">
									<div class="flex items-center gap-[8px]">
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#996D47" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
										<span class="text-[0.875rem] font-semibold text-[#252B42]">{{ item.destination_address?.city || 'Destinazione' }}</span>
									</div>
									<p class="text-[0.75rem] text-[#737373] mt-[2px]">{{ item.destination_address?.name || '' }}</p>
								</div>
							</div>
							<div v-if="showDefaultDropdown && showDefaultDropdownTarget === 'dest' && savedConfigs.length === 0 && !loadingConfigs" id="dest-config-dropdown" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl p-[20px] w-[min(92vw,300px)]">
								<p class="text-[0.875rem] text-[#737373]">Nessuna spedizione configurata salvata.</p>
								<NuxtLink to="/account/spedizioni-configurate" class="text-[0.8125rem] text-[#095866] hover:underline font-semibold mt-[8px] inline-block">Vai a spedizioni configurate</NuxtLink>
							</div>
							<div v-if="showDestConfigGuestPrompt && !isAuthenticated" id="dest-config-dropdown" role="dialog" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl p-[14px] w-[min(92vw,300px)]">
								<p class="text-[0.8125rem] text-[#4B5563] leading-[1.45]">Per usare le spedizioni configurate devi accedere.</p>
								<div class="mt-[10px] flex items-center gap-[8px]">
									<button type="button" class="inline-flex items-center justify-center h-[34px] px-[12px] rounded-[8px] bg-[#095866] text-white text-[0.75rem] font-semibold hover:bg-[#074a56] transition cursor-pointer" @click="$emit('open-auth-modal', 'login')">Accedi</button>
									<button type="button" class="inline-flex items-center justify-center h-[34px] px-[12px] rounded-[8px] border border-[#C8D2D6] text-[#095866] text-[0.75rem] font-semibold hover:bg-[#F3F7F8] transition cursor-pointer" @click="$emit('open-auth-modal', 'register')">Registrati</button>
								</div>
							</div>
						</div>
						<div ref="destSelectorRef" class="relative">
							<button
								type="button"
								@click="$emit('toggle-address-selector', 'dest')"
								:aria-expanded="(isAuthenticated ? showDestAddressSelector : showDestGuestPrompt) ? 'true' : 'false'"
								aria-controls="dest-addresses-dropdown"
								class="address-utility-button address-utility-button--teal">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
								Indirizzi salvati
							</button>
							<div v-if="showDestAddressSelector && isAuthenticated" id="dest-addresses-dropdown" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl max-h-[250px] overflow-y-auto w-[min(92vw,320px)]">
								<div v-if="loadingSavedAddresses" class="p-[16px] text-center text-[0.8125rem] text-[#737373]">Caricamento...</div>
								<template v-else-if="savedAddresses.length > 0">
									<div v-for="addr in savedAddresses" :key="addr.id" @click="$emit('apply-saved-address', addr, 'dest')" class="px-[14px] py-[10px] cursor-pointer hover:bg-[#f0fafb] border-b border-[#F0F0F0] last:border-0 transition-colors">
										<p class="text-[0.875rem] font-semibold text-[#252B42]">{{ addr.name }}</p>
										<p class="text-[0.75rem] text-[#737373]">{{ addr.address }} {{ addr.address_number }}, {{ addr.postal_code }} {{ addr.city }}</p>
									</div>
								</template>
								<div v-else class="p-[16px]">
									<p class="text-[0.8125rem] text-[#737373]">Nessun indirizzo salvato.</p>
									<NuxtLink to="/account/indirizzi" class="text-[0.8125rem] text-[#095866] hover:underline font-semibold mt-[4px] inline-block">Aggiungi indirizzo</NuxtLink>
								</div>
							</div>
							<div v-if="showDestGuestPrompt && !isAuthenticated" id="dest-addresses-dropdown" role="dialog" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl p-[14px] w-[min(92vw,280px)]">
								<p class="text-[0.8125rem] text-[#4B5563] leading-[1.45]">Per usare la rubrica indirizzi devi accedere.</p>
								<div class="mt-[10px] flex items-center gap-[8px]">
									<button type="button" class="inline-flex items-center justify-center h-[34px] px-[12px] rounded-[8px] bg-[#095866] text-white text-[0.75rem] font-semibold hover:bg-[#074a56] transition cursor-pointer" @click="$emit('open-auth-modal', 'login')">Accedi</button>
									<button type="button" class="inline-flex items-center justify-center h-[34px] px-[12px] rounded-[8px] border border-[#C8D2D6] text-[#095866] text-[0.75rem] font-semibold hover:bg-[#F3F7F8] transition cursor-pointer" @click="$emit('open-auth-modal', 'register')">Registrati</button>
								</div>
							</div>
						</div>
					</div>
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

				<p v-if="deliveryMode === 'pudo'" class="text-[0.8125rem] text-[#4B5563] font-semibold mb-[10px]">
					Indirizzo di consegna bloccato dal Punto BRT selezionato
				</p>
				<ShipmentAddressFormFields
					type="dest"
					:address="destinationAddress"
					:field-class="fieldClass"
					:get-field-error="getFieldError"
					:field-error-text="fieldErrorText"
					:get-field-assist="getFieldAssist"
					:apply-field-assist="applyFieldAssist"
					:smart-blur="smartBlur"
					:on-name-input="onNameInput"
					:on-city-input="onCityInput"
					:on-city-focus="onCityFocus"
					:on-provincia-input="onProvinciaInput"
					:on-province-focus="onProvinceFocus"
					:on-cap-input="onCapInput"
					:on-cap-focus="onCapFocus"
					:on-telefono-input="onTelefonoInput"
					:select-city="selectCity"
					:select-provincia="selectProvincia"
					:select-cap="selectCap"
					:format-city-suggestion-label="formatCitySuggestionLabel"
					:format-cap-suggestion-label="formatCapSuggestionLabel"
					:sv="sv"
					:city-suggestions="destCitySuggestions"
					:province-suggestions="destProvinceSuggestions"
					:cap-suggestions="destCapSuggestions"
					:readonly="deliveryMode === 'pudo'"
					:pudo-note="deliveryMode === 'pudo' ? 'Inserisci il nome della persona che ritira il pacco, non il nome del Punto BRT.' : ''" />
			</div>
		</div>
	</div>
</template>
