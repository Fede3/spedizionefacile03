<!--
  ShipmentServiceModalContrassegno.vue
  Form contrassegno dentro il modal servizi.
  Estratto da ShipmentStepServiceModal.vue.
-->
<script setup>
defineProps({
	serviceData: { type: Object, required: true },
	serviceErrors: { type: Object, required: true },
	contrassegnoIncassoOptions: { type: Array, required: true },
	contrassegnoRimborsoOptions: { type: Array, required: true },
	contrassegnoCodPaymentOptions: { type: Array, default: () => [] },
	requiresContrassegnoDettaglio: { type: Boolean, default: false },
});

const emit = defineEmits(['importo-input']);
</script>

<template>
	<div class="service-form-grid">
		<div class="service-field">
			<label for="contrassegno_importo" class="service-field__label">Importo da incassare</label>
			<input
				id="contrassegno_importo"
				v-model="serviceData.contrassegno.importo"
				type="text"
				inputmode="decimal"
				autocomplete="off"
				class="service-field__input service-field__input--currency"
				placeholder="0,00"
				@input="$emit('importo-input', $event)" />
			<span class="service-field__suffix" aria-hidden="true">&euro;</span>
			<p v-if="serviceErrors.contrassegnoImporto" class="service-field__error">{{ serviceErrors.contrassegnoImporto }}</p>
		</div>

		<div class="service-field">
			<label for="contrassegno_dettaglio" class="service-field__label">IBAN rimborso</label>
			<input
				id="contrassegno_dettaglio"
				v-model="serviceData.contrassegno.dettaglio_rimborso"
				type="text"
				class="service-field__input"
				placeholder="IT60X054281110..." />
			<p v-if="serviceErrors.contrassegnoDettaglio" class="service-field__error">{{ serviceErrors.contrassegnoDettaglio }}</p>
		</div>

		<div class="service-field service-field--full">
			<label class="service-field__label">Incasso tramite</label>
			<div class="service-choice-wrap" role="group" aria-label="Modalita di incasso">
				<button
					v-for="option in contrassegnoIncassoOptions"
					:key="option.value"
					type="button"
					:class="[
						'service-choice',
						serviceData.contrassegno.modalita_incasso === option.value ? 'service-choice--active' : '',
					]"
					@click="serviceData.contrassegno.modalita_incasso = option.value">
					{{ option.label }}
				</button>
			</div>
			<p v-if="serviceErrors.contrassegnoIncasso" class="service-field__error">{{ serviceErrors.contrassegnoIncasso }}</p>
		</div>

		<div class="service-field service-field--full">
			<label class="service-field__label">Rimborso tramite</label>
			<div class="service-choice-wrap" role="group" aria-label="Modalita di rimborso">
				<button
					v-for="option in contrassegnoRimborsoOptions"
					:key="option.value"
					type="button"
					:class="[
						'service-choice',
						serviceData.contrassegno.modalita_rimborso === option.value ? 'service-choice--active' : '',
					]"
					@click="serviceData.contrassegno.modalita_rimborso = option.value">
					{{ option.label }}
				</button>
			</div>
			<p v-if="serviceErrors.contrassegnoRimborso" class="service-field__error">{{ serviceErrors.contrassegnoRimborso }}</p>
		</div>

		<div v-if="contrassegnoCodPaymentOptions.length" class="service-field service-field--full">
			<label class="service-field__label">Tipo pagamento corriere</label>
			<div class="service-choice-wrap" role="group" aria-label="Tipo pagamento contrassegno BRT">
				<button
					v-for="option in contrassegnoCodPaymentOptions"
					:key="option.value"
					type="button"
					:class="[
						'service-choice',
						serviceData.contrassegno.cod_payment_method === option.value ? 'service-choice--active' : '',
					]"
					@click="serviceData.contrassegno.cod_payment_method = option.value">
					{{ option.label }}
				</button>
			</div>
			<p v-if="serviceErrors.contrassegnoCodPayment" class="service-field__error">{{ serviceErrors.contrassegnoCodPayment }}</p>
		</div>
	</div>
</template>
