<!--
  ShipmentServiceModalInsurance.vue
  Form assicurazione dentro il modal servizi.
  Estratto da ShipmentStepServiceModal.vue.
-->
<script setup>
defineProps({
	serviceData: { type: Object, required: true },
	serviceErrors: { type: Object, required: true },
	insurancePackages: { type: Array, required: true },
	getPackageVisual: { type: Function, required: true },
	getInsuranceSummary: { type: Function, required: true },
});

const emit = defineEmits(['insurance-input']);
</script>

<template>
	<div class="service-form-stack service-form-stack--insurance">
		<div
			v-for="(pack, indexPopup) in insurancePackages"
			:key="indexPopup"
			class="service-insurance-card">
			<div class="service-insurance-card__row">
				<div class="service-insurance-card__package">
					<div class="service-insurance-card__icon-shell">
						<img :src="getPackageVisual(pack)" :alt="`Collo ${indexPopup + 1}`" class="service-insurance-card__icon" />
					</div>
					<div class="service-insurance-card__copy">
						<p class="service-insurance-card__eyebrow">Collo {{ indexPopup + 1 }}</p>
						<p class="service-insurance-card__summary">
							{{ getInsuranceSummary(pack) }}
						</p>
					</div>
				</div>
				<div class="service-insurance-card__field">
					<label :for="`pack_value_${indexPopup}`" class="sr-only">
						Valore assicurato collo {{ indexPopup + 1 }}
					</label>
					<input
						:id="`pack_value_${indexPopup}`"
						v-model="serviceData.assicurazione[indexPopup]"
						type="text"
						inputmode="decimal"
						autocomplete="off"
						class="service-field__input service-field__input--currency"
						placeholder="Valore"
						@input="$emit('insurance-input', indexPopup, $event)" />
					<span class="service-field__suffix" aria-hidden="true">&euro;</span>
				</div>
			</div>
			<p v-if="serviceErrors.assicurazione[indexPopup]" class="service-field__error service-field__error--inline">
				{{ serviceErrors.assicurazione[indexPopup] }}
			</p>
		</div>
	</div>
</template>
