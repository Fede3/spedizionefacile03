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
});

defineEmits(['toggle']);
</script>

<template>
	<article
		class="senza-etichetta-card service-card-tile service-card-tile--featured sf-card no-radius"
		:class="{
			'sf-card--selected': featuredService.isSelected,
			'is-selected': featuredService.isSelected,
			'is-idle': !featuredService.isSelected,
		}">
		<div class="service-card-tile__body-hit no-radius">
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
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" />
					</svg>
					Consigliato
				</span>
			</div>
			<p class="service-card-tile__description">Etichetta applicata al ritiro.</p>
		</div>
		<div class="service-card-tile__footer-row">
			<div class="service-card-tile__state-pill service-card-tile__state-pill--accent">
				<span class="service-card-tile__state-dot"></span>
				<span>Pronto subito</span>
			</div>
			<div class="service-card-tile__controls">
				<button
					type="button"
					class="service-card-tile__footer no-radius"
					:aria-label="featuredService.isSelected ? 'Disattiva Senza Etichetta' : 'Attiva Senza Etichetta'"
					@click.stop.prevent="$emit('toggle')">
					<span class="service-card-tile__switch sf-toggle" :class="{ 'is-active': featuredService.isSelected }">
						<span class="service-card-tile__switch-thumb sf-toggle__thumb"></span>
					</span>
					<span
						class="service-card-tile__switch-label"
						:class="{ 'service-card-tile__switch-label--selected': featuredService.isSelected }">
						{{ featuredService.isSelected ? 'Attivo' : 'Non attivo' }}
					</span>
				</button>
			</div>
		</div>
	</article>
</template>
