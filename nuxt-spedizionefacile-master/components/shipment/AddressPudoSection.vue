<script setup>
const props = defineProps({
	deliveryMode: { type: String, required: true },
	destinationAddress: { type: Object, required: true },
	selectedPudo: { type: Object, default: null },
});

defineEmits(["update:delivery-mode", "pudo-selected", "pudo-deselected"]);

const selectedPudoSummary = computed(() => {
	if (!props.selectedPudo) return "";

	const location = [
		String(props.selectedPudo.address || "").trim(),
		[props.selectedPudo.zip_code, props.selectedPudo.city].filter(Boolean).join(" ").trim(),
	].filter(Boolean).join(" · ");

	return location;
});
</script>

<template>
	<div class="address-delivery-shell">
		<div class="address-delivery-shell__choices">
			<button
				type="button"
				class="sf-choice-tile address-delivery-choice"
				:class="deliveryMode === 'home' ? 'sf-choice-tile--selected' : ''"
				:aria-pressed="deliveryMode === 'home' ? 'true' : 'false'"
				aria-label="Consegna a domicilio"
				@click="$emit('update:delivery-mode', 'home')">
				<span class="sf-icon-shell address-delivery-choice__icon-shell" :class="deliveryMode === 'home' ? 'sf-icon-shell--selected' : ''">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
				</span>
				<span class="address-delivery-choice__copy">
					<span class="address-delivery-choice__title">Domicilio</span>
				</span>
			</button>

			<button
				type="button"
				class="sf-choice-tile address-delivery-choice"
				:class="deliveryMode === 'pudo' ? 'sf-choice-tile--selected' : ''"
				:aria-pressed="deliveryMode === 'pudo' ? 'true' : 'false'"
				aria-label="Consegna in un punto BRT"
				@click="$emit('update:delivery-mode', 'pudo')">
				<span class="sf-icon-shell address-delivery-choice__icon-shell" :class="deliveryMode === 'pudo' ? 'sf-icon-shell--selected' : ''">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
				</span>
				<span class="address-delivery-choice__copy">
					<span class="address-delivery-choice__title">Punto BRT</span>
				</span>
			</button>
		</div>

		<div v-if="deliveryMode === 'pudo'" class="address-pudo-shell">
			<div v-if="selectedPudo" class="address-pudo-selected">
				<div class="address-pudo-selected__icon">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
				</div>
				<div class="address-pudo-selected__copy">
					<p class="address-pudo-selected__name">{{ selectedPudo.name }}</p>
					<p class="address-pudo-selected__address">{{ selectedPudoSummary }}</p>
				</div>
			</div>

			<PudoSelector
				:initial-city="destinationAddress.city"
				:initial-zip="destinationAddress.postal_code"
				@select="$emit('pudo-selected', $event)"
				@deselect="$emit('pudo-deselected')" />
		</div>
	</div>
</template>
