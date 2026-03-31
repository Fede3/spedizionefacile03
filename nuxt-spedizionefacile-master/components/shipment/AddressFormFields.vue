<!--
  FILE: components/shipment/AddressFormFields.vue
  SCOPO: Campi indirizzo riutilizzabili per le sezioni Partenza e Destinazione.
  Props: type ("origin"|"dest"), address (v-model), validation functions, autocomplete data.
  Supporta: PUDO readonly mode, field assist, autocomplete suggestions.
-->
<script setup>
const props = defineProps({
	type: { type: String, required: true, validator: (v) => ['origin', 'dest'].includes(v) },
	address: { type: Object, required: true },
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
	citySuggestions: { type: Array, default: () => [] },
	provinceSuggestions: { type: Array, default: () => [] },
	capSuggestions: { type: Array, default: () => [] },
	readonly: { type: Boolean, default: false },
	pudoNote: { type: String, default: '' },
});

const emit = defineEmits(['update:address']);

const t = props.type;
const idPrefix = t === 'origin' ? '' : 'dest_';

const readonlyClass = props.readonly
	? '!bg-white !border-[#CBD5DF] !text-[#4B5563] cursor-not-allowed'
	: '';
</script>

<template>
	<!-- Contatto: Nome + Info aggiuntive -->
	<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[16px] tablet:gap-x-[30px]">
		<div>
			<label :for="`${idPrefix}name`" class="block text-[0.875rem] sr-only">Nome e Cognome*</label>
			<input
				type="text"
				placeholder="Nome e Cognome*"
				v-model="address.full_name"
				:id="t === 'origin' ? 'name' : 'dest_name'"
				:class="fieldClass(t, 'full_name')"
				required
				@blur="smartBlur(t, 'full_name')"
				@input="onNameInput(t, address.full_name)"
				/>
			<p v-if="getFieldError(t, 'full_name')" class="field-gentle-error">{{ fieldErrorText(t, 'full_name') }}</p>
			<button
				v-if="getFieldAssist(t, 'full_name')"
				type="button"
				class="field-assist-chip"
				@click="applyFieldAssist(t, 'full_name')">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2v1M4.2 4.2l.7.7M1 12h1M4.2 19.8l.7-.7M20.5 4.9l-.7.7M23 12h-1M19.8 19.8l-.7-.7"/><path d="M15 8a3 3 0 1 0-6 0c0 2 3 4 3 6s-3 4-3 6"/></svg>
				{{ getFieldAssist(t, 'full_name')?.label }}
			</button>
			<p v-if="pudoNote" class="text-[0.75rem] text-[#667789] mt-[6px]">{{ pudoNote }}</p>
		</div>
		<div>
			<label :for="`${idPrefix}additional_info`" class="block text-[0.875rem] sr-only">Informazioni aggiuntive</label>
			<input
				type="text"
				placeholder="Informazioni aggiuntive"
				v-model="address.additional_information"
				:id="`${idPrefix}additional_info`"
				class="input-preventivo-step-2"
				/>
		</div>
	</div>

	<!-- Indirizzo: Via + Numero + Citofono -->
	<div class="mt-[16px] tablet:mt-[39px] grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-[16px] tablet:gap-x-[25px]">
		<div>
			<label :for="`${idPrefix}address`" class="block text-[0.875rem] sr-only">Indirizzo*</label>
			<input
				type="text"
				placeholder="Indirizzo*"
				v-model="address.address"
				:id="`${idPrefix}address`"
				:class="[fieldClass(t, 'address'), readonlyClass]"
				:readonly="readonly"
				required
				/>
			<p v-if="getFieldError(t, 'address')" class="field-gentle-error">{{ fieldErrorText(t, 'address') }}</p>
			<button
				v-if="getFieldAssist(t, 'address')"
				type="button"
				class="field-assist-chip"
				@click="applyFieldAssist(t, 'address')">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2v1M4.2 4.2l.7.7M1 12h1M4.2 19.8l.7-.7M20.5 4.9l-.7.7M23 12h-1M19.8 19.8l-.7-.7"/><path d="M15 8a3 3 0 1 0-6 0c0 2 3 4 3 6s-3 4-3 6"/></svg>
				{{ getFieldAssist(t, 'address')?.label }}
			</button>
		</div>
		<div>
			<label :for="`${idPrefix}address_number`" class="block text-[0.875rem] sr-only">Numero civico*</label>
			<input
				type="text"
				placeholder="Numero civico*"
				v-model="address.address_number"
				:id="`${idPrefix}address_number`"
				:class="[fieldClass(t, 'address_number'), readonlyClass]"
				:readonly="readonly"
				required
				/>
			<p v-if="getFieldError(t, 'address_number')" class="field-gentle-error">{{ fieldErrorText(t, 'address_number') }}</p>
			<button
				v-if="getFieldAssist(t, 'address_number')"
				type="button"
				class="field-assist-chip"
				@click="applyFieldAssist(t, 'address_number')">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2v1M4.2 4.2l.7.7M1 12h1M4.2 19.8l.7-.7M20.5 4.9l-.7.7M23 12h-1M19.8 19.8l-.7-.7"/><path d="M15 8a3 3 0 1 0-6 0c0 2 3 4 3 6s-3 4-3 6"/></svg>
				{{ getFieldAssist(t, 'address_number')?.label }}
			</button>
		</div>
		<div>
			<label :for="`${idPrefix}intercom`" class="block text-[0.875rem] sr-only">Citofono</label>
			<input
				type="text"
				placeholder="Citofono"
				v-model="address.intercom_code"
				:id="`${idPrefix}intercom`"
				:class="['input-preventivo-step-2', readonlyClass]"
				:readonly="readonly"
				/>
		</div>
	</div>

	<!-- Localita: Paese + Citta + Provincia + CAP -->
	<div class="mt-[16px] tablet:mt-[39px] grid grid-cols-2 desktop:grid-cols-4 gap-[16px] tablet:gap-x-[25px]">
		<div>
			<label :for="`${idPrefix}country`" class="block text-[0.875rem] sr-only">Paese*</label>
			<input
				type="text"
				placeholder="Paese*"
				:value="address.country || 'Italia'"
				:id="`${idPrefix}country`"
				class="input-preventivo-step-2"
				disabled
				/>
		</div>

		<div class="relative">
			<label :for="`${idPrefix}city`" class="block text-[0.875rem] sr-only">Citta*</label>
			<input
				type="text"
				placeholder="Citta*"
				v-model="address.city"
				:id="`${idPrefix}city`"
				:class="[fieldClass(t, 'city'), readonlyClass]"
				:readonly="readonly"
				required
				@input="onCityInput(t, address.city)"
				@focus="onCityFocus(t)"
				@blur="smartBlur(t, 'city')"
				/>
			<p v-if="getFieldError(t, 'city')" class="field-gentle-error">{{ fieldErrorText(t, 'city') }}</p>
			<button
				v-if="getFieldAssist(t, 'city')"
				type="button"
				class="field-assist-chip"
				@click="applyFieldAssist(t, 'city')">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2v1M4.2 4.2l.7.7M1 12h1M4.2 19.8l.7-.7M20.5 4.9l-.7.7M23 12h-1M19.8 19.8l-.7-.7"/><path d="M15 8a3 3 0 1 0-6 0c0 2 3 4 3 6s-3 4-3 6"/></svg>
				{{ getFieldAssist(t, 'city')?.label }}
			</button>
			<ul v-if="!readonly && citySuggestions.length > 0" class="absolute z-50 top-full left-0 right-0 bg-white border border-[#E9EBEC] rounded-[12px] mt-[2px] shadow-lg max-h-[200px] overflow-y-auto">
				<li v-for="loc in citySuggestions" :key="`${loc.postal_code}-${loc.place_name}`" @mousedown.prevent="selectCity(t, loc)" class="px-[12px] py-[8px] cursor-pointer hover:bg-[#f0fafb] text-[0.875rem] text-[#252B42]">
					<span class="font-semibold">{{ formatCitySuggestionLabel(loc) }}</span>
				</li>
			</ul>
		</div>

		<div class="relative">
			<label :for="`${idPrefix}province`" class="block text-[0.875rem] sr-only">Provincia*</label>
			<input
				type="text"
				placeholder="Provincia* (es. MI)"
				v-model="address.province"
				:id="`${idPrefix}province`"
				:class="[fieldClass(t, 'province'), readonlyClass]"
				:readonly="readonly"
				required
				maxlength="2"
				@input="onProvinciaInput(t, address.province)"
				@focus="onProvinceFocus(t)"
				@blur="smartBlur(t, 'province')"
				/>
			<p v-if="getFieldError(t, 'province')" class="field-gentle-error">{{ fieldErrorText(t, 'province') }}</p>
			<button
				v-if="getFieldAssist(t, 'province')"
				type="button"
				class="field-assist-chip"
				@click="applyFieldAssist(t, 'province')">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2v1M4.2 4.2l.7.7M1 12h1M4.2 19.8l.7-.7M20.5 4.9l-.7.7M23 12h-1M19.8 19.8l-.7-.7"/><path d="M15 8a3 3 0 1 0-6 0c0 2 3 4 3 6s-3 4-3 6"/></svg>
				{{ getFieldAssist(t, 'province')?.label }}
			</button>
			<ul v-if="!readonly && provinceSuggestions.length > 0" class="absolute z-50 top-full left-0 right-0 bg-white border border-[#E9EBEC] rounded-[12px] mt-[2px] shadow-lg">
				<li v-for="prov in provinceSuggestions" :key="prov" @mousedown.prevent="selectProvincia(t, prov)" class="px-[12px] py-[8px] cursor-pointer hover:bg-[#f0fafb] text-[0.875rem] text-[#252B42]">{{ prov }}</li>
			</ul>
		</div>

		<div class="relative">
			<label :for="`${idPrefix}postal_code`" class="block text-[0.875rem] sr-only">CAP*</label>
			<input
				type="text"
				placeholder="CAP*"
				v-model="address.postal_code"
				:id="`${idPrefix}postal_code`"
				:class="[fieldClass(t, 'postal_code'), readonlyClass]"
				:readonly="readonly"
				required
				maxlength="5"
				@input="onCapInput(t, address.postal_code)"
				@focus="onCapFocus(t)"
				@blur="smartBlur(t, 'postal_code')"
				/>
			<p v-if="getFieldError(t, 'postal_code')" class="field-gentle-error">{{ fieldErrorText(t, 'postal_code') }}</p>
			<button
				v-if="getFieldAssist(t, 'postal_code')"
				type="button"
				class="field-assist-chip"
				@click="applyFieldAssist(t, 'postal_code')">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2v1M4.2 4.2l.7.7M1 12h1M4.2 19.8l.7-.7M20.5 4.9l-.7.7M23 12h-1M19.8 19.8l-.7-.7"/><path d="M15 8a3 3 0 1 0-6 0c0 2 3 4 3 6s-3 4-3 6"/></svg>
				{{ getFieldAssist(t, 'postal_code')?.label }}
			</button>
			<ul v-if="!readonly && capSuggestions.length > 0" class="absolute z-50 top-full left-0 right-0 bg-white border border-[#E9EBEC] rounded-[12px] mt-[2px] shadow-lg max-h-[220px] overflow-y-auto">
				<li v-for="loc in capSuggestions" :key="`${t}-cap-${loc.postal_code}-${loc.place_name}-${loc.province || ''}`" @mousedown.prevent="selectCap(t, loc)" class="px-[12px] py-[8px] cursor-pointer hover:bg-[#f0fafb] text-[0.875rem] text-[#252B42]">
					<span class="font-semibold">{{ formatCapSuggestionLabel(loc) }}</span>
				</li>
			</ul>
		</div>
	</div>

	<!-- Telefono + Email -->
	<div class="mt-[16px] tablet:mt-[39px] grid grid-cols-1 tablet:grid-cols-2 gap-[16px] tablet:gap-x-[30px]">
		<div>
			<label :for="`${idPrefix}telephone`" class="block text-[0.875rem] sr-only">Telefono*</label>
			<input
				type="tel"
				placeholder="Telefono*"
				v-model="address.telephone_number"
				:id="`${idPrefix}telephone`"
				:class="fieldClass(t, 'telephone_number')"
				required
				@input="onTelefonoInput(t, address.telephone_number)"
				@blur="smartBlur(t, 'telephone_number')"
				/>
			<p v-if="getFieldError(t, 'telephone_number')" class="field-gentle-error">{{ fieldErrorText(t, 'telephone_number') }}</p>
			<button
				v-if="getFieldAssist(t, 'telephone_number')"
				type="button"
				class="field-assist-chip"
				@click="applyFieldAssist(t, 'telephone_number')">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2v1M4.2 4.2l.7.7M1 12h1M4.2 19.8l.7-.7M20.5 4.9l-.7.7M23 12h-1M19.8 19.8l-.7-.7"/><path d="M15 8a3 3 0 1 0-6 0c0 2 3 4 3 6s-3 4-3 6"/></svg>
				{{ getFieldAssist(t, 'telephone_number')?.label }}
			</button>
		</div>
		<div>
			<label :for="`${idPrefix}email`" class="block text-[0.875rem] sr-only">Email</label>
			<input
				type="email"
				placeholder="Email"
				v-model="address.email"
				:id="`${idPrefix}email`"
				:class="fieldClass(t, 'email')"
				@blur="smartBlur(t, 'email')"
				@input="sv.onInput(`${t}_email`, () => sv.validateEmail(`${t}_email`, address.email))"
				/>
			<p v-if="getFieldError(t, 'email')" class="field-gentle-error">{{ fieldErrorText(t, 'email') }}</p>
			<button
				v-if="getFieldAssist(t, 'email')"
				type="button"
				class="field-assist-chip"
				@click="applyFieldAssist(t, 'email')">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2v1M4.2 4.2l.7.7M1 12h1M4.2 19.8l.7-.7M20.5 4.9l-.7.7M23 12h-1M19.8 19.8l-.7-.7"/><path d="M15 8a3 3 0 1 0-6 0c0 2 3 4 3 6s-3 4-3 6"/></svg>
				{{ getFieldAssist(t, 'email')?.label }}
			</button>
		</div>
	</div>
</template>
