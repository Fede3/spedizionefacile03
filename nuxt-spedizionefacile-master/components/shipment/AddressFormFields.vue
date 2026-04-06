<script setup>
const props = defineProps({
	type: { type: String, required: true, validator: (value) => ["origin", "dest"].includes(value) },
	address: { type: Object, required: true },
	citySuggestions: { type: Array, default: () => [] },
	provinceSuggestions: { type: Array, default: () => [] },
	capSuggestions: { type: Array, default: () => [] },
	readonly: { type: Boolean, default: false },
});

// Funzioni form/validazione iniettate dal parent ([step].vue) via provide/inject
const {
	fieldClass, getFieldError, fieldErrorText, getFieldAssist, applyFieldAssist, smartBlur,
	onNameInput, onCityInput, onCityFocus, onProvinciaInput, onProvinceFocus,
	onCapInput, onCapFocus, onTelefonoInput,
	selectCity, selectProvincia, selectCap,
	formatCitySuggestionLabel, formatCapSuggestionLabel, sv,
} = inject('shipmentFormHandlers');

const typeKey = props.type;
const idPrefix = typeKey === "origin" ? "" : "dest_";

const readonlyClass = computed(() => (
	props.readonly
		? "!bg-white !border-[#CBD5DF] !text-[var(--color-brand-text-secondary)] cursor-not-allowed"
		: ""
));

const hasOptionalDetails = computed(() => (
	Boolean(String(props.address.additional_information || "").trim())
	|| Boolean(String(props.address.intercom_code || "").trim())
));

const showOptionalDetails = ref(!props.readonly && hasOptionalDetails.value);

watch(
	() => [props.readonly, props.address.additional_information, props.address.intercom_code],
	([readonly, additionalInformation, intercomCode]) => {
		if (readonly) {
			showOptionalDetails.value = false;
			return;
		}

		if (String(additionalInformation || "").trim() || String(intercomCode || "").trim()) {
			showOptionalDetails.value = true;
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div class="address-form-shell">
		<section class="address-form-block address-form-block--contact">
			<div class="address-form-inline-grid">
				<div>
					<label :for="`${idPrefix}name`" class="form-label">Nome*</label>
					<input
						:id="typeKey === 'origin' ? 'name' : 'dest_name'"
						v-model="address.full_name"
						type="text"
						:class="fieldClass(typeKey, 'full_name')"
						required
						@blur="smartBlur(typeKey, 'full_name')"
						@input="onNameInput(typeKey, address.full_name)" />
					<p v-if="getFieldError(typeKey, 'full_name')" class="field-gentle-error">{{ fieldErrorText(typeKey, 'full_name') }}</p>
				</div>

				<div>
					<label :for="`${idPrefix}telephone`" class="form-label">Telefono*</label>
					<input
						:id="`${idPrefix}telephone`"
						v-model="address.telephone_number"
						type="tel"
						:class="fieldClass(typeKey, 'telephone_number')"
						required
						@input="onTelefonoInput(typeKey, address.telephone_number)"
						@blur="smartBlur(typeKey, 'telephone_number')" />
					<p v-if="getFieldError(typeKey, 'telephone_number')" class="field-gentle-error">{{ fieldErrorText(typeKey, 'telephone_number') }}</p>
				</div>
			</div>
		</section>

		<section class="address-form-block address-form-block--location">
			<div class="address-form-street-grid">
				<div>
					<label :for="`${idPrefix}address`" class="form-label">Via*</label>
					<input
						:id="`${idPrefix}address`"
						v-model="address.address"
						type="text"
						:class="[fieldClass(typeKey, 'address'), readonlyClass]"
						:readonly="readonly"
						required />
					<p v-if="getFieldError(typeKey, 'address')" class="field-gentle-error">{{ fieldErrorText(typeKey, 'address') }}</p>
				</div>

				<div>
					<label :for="`${idPrefix}address_number`" class="form-label">N.*</label>
					<input
						:id="`${idPrefix}address_number`"
						v-model="address.address_number"
						type="text"
						:class="[fieldClass(typeKey, 'address_number'), readonlyClass]"
						:readonly="readonly"
						required />
					<p v-if="getFieldError(typeKey, 'address_number')" class="field-gentle-error">{{ fieldErrorText(typeKey, 'address_number') }}</p>
				</div>
			</div>

			<div class="address-form-country-grid">
				<div class="relative address-form-country-grid__city">
					<label :for="`${idPrefix}city`" class="form-label">Città*</label>
					<input
						:id="`${idPrefix}city`"
						v-model="address.city"
						type="text"
						:class="[fieldClass(typeKey, 'city'), readonlyClass]"
						:readonly="readonly"
						required
						@input="onCityInput(typeKey, address.city)"
						@focus="onCityFocus(typeKey)"
						@blur="smartBlur(typeKey, 'city')" />
					<p v-if="getFieldError(typeKey, 'city')" class="field-gentle-error">{{ fieldErrorText(typeKey, 'city') }}</p>
					<ul v-if="!readonly && citySuggestions.length > 0" class="address-field-menu">
						<li
							v-for="location in citySuggestions"
							:key="`${location.postal_code}-${location.place_name}`"
							class="address-field-menu__item"
							@mousedown.prevent="selectCity(typeKey, location)">
							<span class="address-field-menu__label">{{ formatCitySuggestionLabel(location) }}</span>
						</li>
					</ul>
				</div>

				<div class="relative">
					<label :for="`${idPrefix}province`" class="form-label">Prov.*</label>
					<input
						:id="`${idPrefix}province`"
						v-model="address.province"
						type="text"
						:class="[fieldClass(typeKey, 'province'), readonlyClass]"
						:readonly="readonly"
						required
						maxlength="2"
						@input="onProvinciaInput(typeKey, address.province)"
						@focus="onProvinceFocus(typeKey)"
						@blur="smartBlur(typeKey, 'province')" />
					<p v-if="getFieldError(typeKey, 'province')" class="field-gentle-error">{{ fieldErrorText(typeKey, 'province') }}</p>
				</div>

				<div class="relative">
					<label :for="`${idPrefix}postal_code`" class="form-label">CAP*</label>
					<input
						:id="`${idPrefix}postal_code`"
						v-model="address.postal_code"
						type="text"
						:class="[fieldClass(typeKey, 'postal_code'), readonlyClass]"
						:readonly="readonly"
						required
						maxlength="5"
						@input="onCapInput(typeKey, address.postal_code)"
						@focus="onCapFocus(typeKey)"
						@blur="smartBlur(typeKey, 'postal_code')" />
					<p v-if="getFieldError(typeKey, 'postal_code')" class="field-gentle-error">{{ fieldErrorText(typeKey, 'postal_code') }}</p>
				</div>
			</div>

			<div v-if="!readonly" class="address-form-optional">
				<button
					type="button"
					class="address-form-optional__toggle"
					:aria-expanded="showOptionalDetails ? 'true' : 'false'"
					@click="showOptionalDetails = !showOptionalDetails">
					<span>Dettagli</span>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path :d="showOptionalDetails ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'" />
					</svg>
				</button>

				<div v-if="showOptionalDetails" class="address-form-optional__grid">
					<div>
						<label :for="`${idPrefix}additional_info`" class="form-label">Dettagli</label>
						<input
							:id="`${idPrefix}additional_info`"
							v-model="address.additional_information"
							type="text"
							placeholder="Scala, piano, riferimento"
							class="input-preventivo-step-2" />
					</div>

					<div>
						<label :for="`${idPrefix}intercom`" class="form-label">Citofono</label>
						<input
							:id="`${idPrefix}intercom`"
							v-model="address.intercom_code"
							type="text"
							placeholder="Rossi"
							class="input-preventivo-step-2" />
					</div>

					<div class="address-form-optional__wide">
						<label :for="`${idPrefix}email`" class="form-label">Email</label>
						<input
							:id="`${idPrefix}email`"
							v-model="address.email"
							type="email"
							placeholder="nome@email.com"
							:class="fieldClass(typeKey, 'email')"
							@blur="smartBlur(typeKey, 'email')"
							@input="sv.onInput(`${typeKey}_email`, () => sv.validateEmail(`${typeKey}_email`, address.email))" />
						<p v-if="getFieldError(typeKey, 'email')" class="field-gentle-error">{{ fieldErrorText(typeKey, 'email') }}</p>
					</div>
				</div>
			</div>
		</section>
	</div>
</template>
