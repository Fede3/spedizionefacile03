<script setup>
import '~/assets/css/components/sf-servizio-card.css';

const props = defineProps({
	service: { type: Object, required: true },
	meta: { type: Object, required: true },
	highlights: { type: Array, default: () => [] },
	visualTone: { type: String, default: 'primary' },
	description: { type: String, default: '' },
});

const iconBySlug = {
	'pagamento-alla-consegna': 'mdi:cash-multiple',
	'spedizione-senza-etichetta': 'mdi:printer-off-outline',
	'ritiro-a-domicilio': 'mdi:home-import-outline',
	'assicurazione': 'mdi:shield-check-outline',
	'assicurazione-spedizione': 'mdi:shield-check-outline',
	'sponda-idraulica': 'mdi:forklift',
	'spedizione-programmata': 'mdi:calendar-clock-outline',
};
const serviceIcon = iconBySlug[props.service.slug] || 'mdi:truck-outline';
</script>

<template>
	<NuxtLink
		:to="`/servizi/${service.slug}`"
		class="sv-card"
	>
		<div
			class="sv-card__visual"
			:class="`sv-card__visual--${visualTone}`"
		>
			<div class="sv-card__visual-header">
				<div class="sv-card__icon-shell" aria-hidden="true">
					<UIcon :name="serviceIcon" class="sv-card__icon" />
				</div>
				<span
					class="sv-card__badge"
					:style="{ background: meta.badgeColor }"
				>
					{{ meta.badge }}
				</span>
			</div>

			<div v-if="highlights.length" class="sv-card__chips">
				<span
					v-for="chip in highlights"
					:key="`${service.slug}-${chip}`"
					class="sv-card__chip">
					{{ chip }}
				</span>
			</div>
		</div>

		<div class="sv-card__body">
			<h3 class="sv-card__title">{{ service.title }}</h3>
			<p class="sv-card__desc">{{ description }}</p>
			<div class="sv-card__footer">
				<span class="sv-card__time">
					<UIcon name="mdi:clock-outline" class="sv-card__time-icon" />
					{{ meta.readTime }}
				</span>
				<span class="sv-card__cta">
					Scopri
					<UIcon name="mdi:arrow-right" class="sv-card__cta-icon" />
				</span>
			</div>
		</div>
	</NuxtLink>
</template>

