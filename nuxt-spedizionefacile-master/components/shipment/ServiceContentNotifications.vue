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
	<section class="service-support-shell sf-section-block">
		<div class="service-support-shell__header sf-section-block__header">
			<div class="service-support-shell__header-copy">
				<h2 class="service-group-shell__title sf-section-title">Contenuto e notifiche</h2>
				<p class="service-support-shell__text">Descrivi il pacco e attiva gli aggiornamenti solo se ti aiutano davvero a seguirlo.</p>
			</div>
		</div>
		<div class="service-support-shell__grid sf-section-block__body">
			<div class="service-support-panel service-support-panel--content">
				<label for="content_description" class="service-support-panel__label">
					Contenuto
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
					:class="['service-support-panel__input', contentError ? 'input-preventivo-step-2--warning border-2' : '']" />
				<p v-if="contentError" class="service-support-panel__error">
					{{ contentFieldHint }}
				</p>
			</div>

			<div class="service-support-panel service-support-panel--notification" :class="{ 'is-active': smsEmailNotification }">
				<div class="service-support-panel__notification-main">
					<div class="service-support-panel__notification-copy">
						<label class="service-support-panel__label service-support-panel__label--notification" for="notification-toggle">
							Notifiche spedizione
						</label>
						<p class="service-support-panel__notification-text">Aggiornamenti via SMS ed email su ritiro, transito e consegna.</p>
					</div>
				</div>

				<div class="service-support-panel__notification-side">
					<span class="service-support-panel__price">{{ notificationPriceLabel }}</span>
					<button
						id="notification-toggle"
						type="button"
						class="service-support-panel__checkbox"
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
