<!--
  ShipmentServiceFeaturedCard.vue
  Card "Senza Etichetta" (servizio consigliato).
  Estratto da StepServicesGrid.vue.
-->
<script setup>
defineProps({
	featuredService: { type: Object, required: true },
	serviceIconFilterIdle: { type: String, required: true },
	serviceIconFilterActive: { type: String, required: true },
	actionLabel: { type: String, default: "Attiva" },
});

defineEmits(['trigger']);
</script>

<template>
	<article
		class="senza-etichetta-card service-card-tile service-card-tile--featured"
		:class="{
			'is-selected': featuredService.isSelected,
			'is-idle': !featuredService.isSelected,
		}">
		<div class="service-card-tile__body-hit">
			<div class="service-card-tile__top">
				<div
					class="service-card-tile__icon-shell sf-icon-shell"
					:class="{ 'service-card-tile__icon-shell--selected': featuredService.isSelected }">
					<div
						class="service-card-tile__icon"
						:style="{
							'--service-icon-bg': 'url(/img/quote/second-step/no-label.png)',
							'--service-icon-width': '28px',
							'--service-icon-height': '24px',
							'--service-icon-filter': featuredService.isSelected ? serviceIconFilterActive : serviceIconFilterIdle,
						}"></div>
				</div>
				<span
					class="service-card-tile__price"
					:class="{ 'service-card-tile__price--selected': featuredService.isSelected }">
					{{ featuredService.currentPriceLabel }}
				</span>
			</div>
			<div class="service-card-tile__title-row">
				<h3 class="service-card-tile__title">Senza Etichetta</h3>
				<span class="service-card-tile__badge">
					Consigliato
				</span>
			</div>
			<p class="service-card-tile__description">Etichetta applicata al ritiro.</p>
		</div>
		<div class="service-card-tile__footer-row">
			<div
				v-if="featuredService.isSelected"
				class="service-card-tile__state-pill service-card-tile__state-pill--selected">
				<span class="service-card-tile__state-dot"></span>
				<span>Attivo</span>
			</div>
			<div class="service-card-tile__controls">
				<button
					type="button"
					class="service-card-tile__action no-radius"
					:class="featuredService.isSelected ? 'service-card-tile__action--neutral' : 'service-card-tile__action--primary'"
					:aria-label="featuredService.isSelected ? 'Rimuovi Senza Etichetta' : 'Attiva Senza Etichetta'"
					@click.stop.prevent="$emit('trigger')">
					{{ actionLabel }}
				</button>
			</div>
		</div>
	</article>
</template>
