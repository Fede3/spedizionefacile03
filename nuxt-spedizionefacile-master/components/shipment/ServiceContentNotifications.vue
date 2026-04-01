<!--
  ShipmentServiceContentNotifications.vue
  Sezione "Contenuto del pacco" + "Notifiche spedizione".
  Estratto da StepServicesGrid.vue.
-->
<script setup>
defineProps({
	contentDescription: { type: String, default: '' },
	contentError: { type: [String, Object], default: null },
	contentFieldHint: { type: String, default: '' },
	smsEmailNotification: { type: Boolean, default: false },
	notificationPriceLabel: { type: String, default: '' },
});

defineEmits([
	'update:content-description',
	'update:content-error',
	'update:sms-email-notification',
]);
</script>

<template>
	<div class="service-support-grid">
		<div class="service-support-field">
			<div class="service-support-field__label-row">
				<label for="content_description" class="service-support-field__label">
					Contenuto del pacco<span class="text-red-500 ml-[2px]">*</span>
				</label>
				<div class="relative group">
					<button type="button" class="service-support-field__help" aria-label="Esempi di contenuto del pacco">
						?
					</button>
					<div class="service-support-field__tooltip">
						<p class="font-semibold mb-[6px]">Esempi di contenuto:</p>
						<ul class="list-disc list-inside space-y-[2px] text-[0.75rem]">
							<li>Elettronica</li>
							<li>Abbigliamento</li>
							<li>Documenti</li>
							<li>Articoli per la casa</li>
							<li>Prodotti confezionati</li>
						</ul>
						<div class="service-support-field__tooltip-arrow"></div>
					</div>
				</div>
			</div>
			<p v-if="contentError" class="field-gentle-error mb-[8px]">
				{{ contentFieldHint }}
			</p>
			<input
				type="text"
				id="content_description"
				:value="contentDescription"
				@input="$emit('update:content-description', $event.target.value); $emit('update:content-error', null)"
				placeholder="Es. Elettronica, Abbigliamento, Documenti..."
				maxlength="255"
				required
				:class="[
					'service-support-field__input',
					contentError ? 'input-preventivo-step-2--warning border-2' : ''
				]" />
		</div>

		<div class="service-support-field">
			<label class="service-support-field__label" for="notification-toggle">Notifiche spedizione</label>
			<div
				class="service-support-field__notification-card"
				:class="{ 'is-active': smsEmailNotification }">
				<div class="service-support-field__notification-main">
					<div class="service-support-field__notification-icon sf-icon-shell">
						<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
							<path d="M13.73 21a2 2 0 0 1-3.46 0"/>
						</svg>
					</div>
					<div class="service-support-field__notification-copy-wrap">
						<div class="service-support-field__notification-headline">
							<p class="service-support-field__notification-copy">SMS ed Email dal corriere</p>
							<span class="service-support-field__notification-price">{{ notificationPriceLabel }}</span>
						</div>
					</div>
				</div>

				<div class="service-support-field__notification-side">
					<div
						v-if="smsEmailNotification"
						class="service-card-tile__state-pill service-card-tile__state-pill--selected service-support-field__notification-state">
						<span class="service-card-tile__state-dot"></span>
						<span>Attivo</span>
					</div>
					<button
						id="notification-toggle"
						type="button"
						class="service-card-tile__action"
						:class="smsEmailNotification ? 'service-card-tile__action--neutral' : 'service-card-tile__action--primary btn-secondary'"
						:aria-label="smsEmailNotification ? 'Rimuovi notifiche SMS ed email' : 'Attiva notifiche SMS ed email'"
						@click="$emit('update:sms-email-notification', !smsEmailNotification)">
						{{ smsEmailNotification ? 'Rimuovi' : 'Attiva' }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
