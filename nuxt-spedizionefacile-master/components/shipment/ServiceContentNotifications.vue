<script setup>
defineProps({
	contentDescription: { type: String, default: '' },
	contentError: { type: [String, Object], default: null },
	contentFieldHint: { type: String, default: '' },
	smsEmailNotification: { type: Boolean, default: false },
	notificationPriceLabel: { type: String, default: '' },
});

defineEmits(['update:content-description', 'update:content-error', 'update:sms-email-notification']);
</script>

<template>
	<section class="service-details-section">
		<h2 class="service-details-section__title sf-section-title">Dettagli</h2>
		<div class="service-details-grid">
			<div class="service-details-field">
				<label for="content_description" class="service-details-field__label">
					Contenuto del pacco
					<span class="text-red-500 ml-[2px]">*</span>
				</label>
				<input
					type="text"
					id="content_description"
					:value="contentDescription"
					@input="
						$emit('update:content-description', $event.target.value);
						$emit('update:content-error', null);
					"
					placeholder="Abbigliamento, documenti..."
					maxlength="255"
					required
					:class="['service-details-field__input', contentError ? 'input-preventivo-step-2--warning border-2' : '']" />
				<p v-if="contentError" class="service-details-field__error">
					{{ contentFieldHint }}
				</p>
			</div>

			<div class="service-details-field service-details-field--notification">
				<label class="service-details-field__label" for="notification-toggle">
					Notifiche
				</label>
				<div class="service-details-field__notification-row">
					<span class="service-details-field__price">{{ notificationPriceLabel }}</span>
					<button
						id="notification-toggle"
						type="button"
						class="service-details-field__checkbox"
						:class="{ 'is-active': smsEmailNotification }"
						:aria-label="smsEmailNotification ? 'Rimuovi notifiche spedizione' : 'Attiva notifiche spedizione'"
						:aria-pressed="smsEmailNotification ? 'true' : 'false'"
						@click="$emit('update:sms-email-notification', !smsEmailNotification)">
						<svg
							v-if="smsEmailNotification"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.7"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true">
							<polyline points="20 6 9 17 4 12" />
						</svg>
					</button>
				</div>
			</div>
		</div>
	</section>
</template>
