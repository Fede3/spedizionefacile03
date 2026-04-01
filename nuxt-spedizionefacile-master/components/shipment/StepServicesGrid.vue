<!--
  FILE: components/shipment/StepServicesGrid.vue
  SCOPO: Griglia servizi (featured + regolari) + contenuto pacco + notifiche.
  Featured card delegata a ShipmentServiceFeaturedCard.vue.
  Contenuto/notifiche delegati a ShipmentServiceContentNotifications.vue.
-->
<script setup>
const props = defineProps({
	/* Service data */
	featuredService: { type: Object, default: null },
	regularServices: { type: Array, required: true },
	serviceData: { type: Object, required: true },
	serviceCardErrors: { type: Object, required: true },

	/* Service state helpers */
	isServiceExpanded: { type: Function, required: true },
	canConfigureService: { type: Function, required: true },
	canActivateConfiguredService: { type: Function, required: true },
	getServiceStateLabel: { type: Function, required: true },
	getServiceConfigureLabel: { type: Function, required: true },

	/* Contrassegno / Assicurazione */
	contrassegnoIncassoOptions: { type: Array, required: true },
	contrassegnoRimborsoOptions: { type: Array, required: true },
	contrassegnoCodPaymentOptions: { type: Array, default: () => [] },
	requiresContrassegnoDettaglio: { type: Boolean, default: false },
	insurancePackages: { type: Array, required: true },
	normalizeCurrencyInput: { type: Function, required: true },

	/* Icon filter constants */
	serviceIconFilterIdle: { type: String, required: true },
	serviceIconFilterActive: { type: String, required: true },

	/* Content description */
	contentDescription: { type: String, default: "" },
	contentError: { type: [String, Object], default: null },
	contentFieldHint: { type: String, default: "" },

	/* Notifications */
	smsEmailNotification: { type: Boolean, default: false },
	notificationPriceLabel: { type: String, default: "" },
});

const emit = defineEmits([
	"toggle-featured-service",
	"toggle-regular-service",
	"handle-service-primary-action",
	"activate-configured-service",
	"remove-configured-service",
	"update:content-description",
	"update:content-error",
	"update:sms-email-notification",
]);
</script>

<template>
	<section class="services-stage-shell sf-section-block">
		<div class="flow-section-header flow-section-header--services sf-section-block__header">
			<div class="flow-section-header__copy">
				<h2 class="flow-section-header__title sf-section-title">Servizi</h2>
			</div>
		</div>

		<div class="services-stage-shell__content font-montserrat">
			<div class="w-full mx-auto">
				<div class="w-full">
					<!-- Servizio "Senza etichetta" -->
					<ShipmentServiceFeaturedCard
						v-if="featuredService"
						:featured-service="featuredService"
						:service-icon-filter-idle="serviceIconFilterIdle"
						:service-icon-filter-active="serviceIconFilterActive"
						:action-label="featuredService.isSelected ? 'Rimuovi' : 'Attiva'"
						@trigger="$emit('toggle-featured-service')" />

					<!-- Servizi regolari -->
					<div class="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-[16px]">
						<article
							v-for="(service, serviceIndex) in regularServices"
							:key="service.key || serviceIndex"
							class="service-card-tile"
							:class="{
								'service-card-tile--selected': service.isSelected,
								'service-card-tile--idle': !service.isSelected,
								'service-card-tile--expanded': isServiceExpanded(service.key),
							}">
							<div class="service-card-tile__body-hit">
								<div class="service-card-tile__top">
									<div
										class="service-card-tile__icon-shell sf-icon-shell"
										:class="{ 'service-card-tile__icon-shell--selected': service.isSelected }">
										<div
											class="service-card-tile__icon"
											:style="{
												'--service-icon-bg': `url(/img/quote/second-step/${service.img})`,
												'--service-icon-width': `${service.width}px`,
												'--service-icon-height': `${service.height}px`,
												'--service-icon-filter': service.isSelected ? serviceIconFilterActive : serviceIconFilterIdle,
											}"></div>
									</div>
									<span
										class="service-card-tile__price"
										:class="{ 'service-card-tile__price--selected': service.isSelected }">
										{{ service.priceLabel }}
									</span>
								</div>
								<div class="service-card-tile__title-row">
									<h3 class="service-card-tile__title">{{ service.name }}</h3>
									<span
										class="service-card-tile__badge"
										:class="{ 'service-card-tile__badge--selected': service.isSelected }">
										{{ service.statusLabel }}
									</span>
								</div>
								<p class="service-card-tile__description">{{ service.description }}</p>
							</div>
							<div
								class="service-card-tile__footer-row"
								:class="{ 'service-card-tile__footer-row--cta-only': !service.isSelected && !isServiceExpanded(service.key) }">
								<div
									v-if="service.isSelected || isServiceExpanded(service.key)"
									class="service-card-tile__state-pill"
									:class="{
										'service-card-tile__state-pill--open': isServiceExpanded(service.key),
										'service-card-tile__state-pill--selected': service.isSelected && !isServiceExpanded(service.key),
									}">
									<span class="service-card-tile__state-dot"></span>
									<span>{{ getServiceStateLabel(service) }}</span>
								</div>
								<div class="service-card-tile__controls">
									<button
										v-if="canConfigureService(service)"
										type="button"
										class="service-card-tile__action service-card-tile__action--primary no-radius"
										:class="{ 'is-active': isServiceExpanded(service.key) }"
										:aria-label="`${isServiceExpanded(service.key) ? 'Chiudi' : 'Apri'} dettagli ${service.name}`"
										:aria-expanded="isServiceExpanded(service.key) ? 'true' : 'false'"
										:aria-controls="`service-inline-panel-${service.key || serviceIndex}`"
										@click.stop.prevent="$emit('handle-service-primary-action', service)"
										@keydown.enter.stop.prevent="$emit('handle-service-primary-action', service)"
										@keydown.space.stop.prevent="$emit('handle-service-primary-action', service)">
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
											<path d="M6 9h12" />
											<path d="m9 12 3 3 3-3" />
										</svg>
										<span>{{ getServiceConfigureLabel(service) }}</span>
									</button>
									<button
										v-if="service.isSelected && canConfigureService(service)"
										type="button"
										class="service-card-tile__action service-card-tile__action--neutral no-radius"
										:aria-label="`Rimuovi ${service.name}`"
										@click.stop.prevent="$emit('remove-configured-service', service)">
										Rimuovi
									</button>
									<button
										v-if="!canConfigureService(service)"
										type="button"
										class="service-card-tile__action no-radius"
										:class="service.isSelected ? 'service-card-tile__action--neutral' : 'service-card-tile__action--primary'"
										:aria-label="service.isSelected ? `Rimuovi ${service.name}` : `Attiva ${service.name}`"
										@click.stop.prevent="$emit('toggle-regular-service', service)"
										@keydown.enter.stop.prevent="$emit('toggle-regular-service', service)"
										@keydown.space.stop.prevent="$emit('toggle-regular-service', service)">
										{{ service.isSelected ? 'Rimuovi' : 'Attiva' }}
									</button>
								</div>
							</div>
							<transition name="service-inline-expand">
								<div
									v-if="canConfigureService(service) && isServiceExpanded(service.key)"
									:id="`service-inline-panel-${service.key || serviceIndex}`"
									class="service-card-tile__accordion">
									<!-- Contrassegno -->
									<div v-if="service.key === 'contrassegno'" class="service-inline-panel">
										<div class="service-inline-panel__grid service-inline-panel__grid--double">
											<div class="service-inline-field">
												<label class="service-inline-field__label" :for="`contrassegno-importo-${serviceIndex}`">Importo</label>
												<div class="service-inline-field__input-shell">
													<input :id="`contrassegno-importo-${serviceIndex}`" v-model="serviceData.contrassegno.importo" type="text" inputmode="decimal" autocomplete="off" class="service-inline-field__input" placeholder="0,00" @input="serviceData.contrassegno.importo = normalizeCurrencyInput($event.target.value); serviceCardErrors.contrassegnoImporto = ''" />
													<span class="service-inline-field__suffix">&euro;</span>
												</div>
												<p v-if="serviceCardErrors.contrassegnoImporto" class="service-inline-field__error">{{ serviceCardErrors.contrassegnoImporto }}</p>
											</div>
											<div v-if="requiresContrassegnoDettaglio" class="service-inline-field">
												<label class="service-inline-field__label" :for="`contrassegno-iban-${serviceIndex}`">IBAN</label>
												<input :id="`contrassegno-iban-${serviceIndex}`" v-model="serviceData.contrassegno.dettaglio_rimborso" type="text" class="service-inline-field__input" placeholder="IT60X054281110..." @input="serviceCardErrors.contrassegnoDettaglio = ''" />
												<p v-if="serviceCardErrors.contrassegnoDettaglio" class="service-inline-field__error">{{ serviceCardErrors.contrassegnoDettaglio }}</p>
											</div>
										</div>
										<div class="service-inline-choice-block">
											<span class="service-inline-field__label">Incasso</span>
											<div class="service-inline-choice-wrap" role="group" aria-label="Modalita incasso contrassegno">
												<button v-for="option in contrassegnoIncassoOptions" :key="option.value" type="button" class="service-inline-choice" :class="{ 'is-active': serviceData.contrassegno.modalita_incasso === option.value }" @click="serviceData.contrassegno.modalita_incasso = option.value; serviceCardErrors.contrassegnoIncasso = ''">{{ option.label }}</button>
											</div>
											<p v-if="serviceCardErrors.contrassegnoIncasso" class="service-inline-field__error">{{ serviceCardErrors.contrassegnoIncasso }}</p>
										</div>
										<div class="service-inline-choice-block">
											<span class="service-inline-field__label">Rimborso</span>
											<div class="service-inline-choice-wrap" role="group" aria-label="Modalita rimborso contrassegno">
												<button v-for="option in contrassegnoRimborsoOptions" :key="option.value" type="button" class="service-inline-choice" :class="{ 'is-active': serviceData.contrassegno.modalita_rimborso === option.value }" @click="serviceData.contrassegno.modalita_rimborso = option.value; serviceCardErrors.contrassegnoRimborso = ''">{{ option.label }}</button>
											</div>
											<p v-if="serviceCardErrors.contrassegnoRimborso" class="service-inline-field__error">{{ serviceCardErrors.contrassegnoRimborso }}</p>
										</div>
										<div v-if="contrassegnoCodPaymentOptions.length" class="service-inline-choice-block">
											<span class="service-inline-field__label">Tipo pagamento corriere</span>
											<div class="service-inline-choice-wrap" role="group" aria-label="Tipo pagamento contrassegno BRT">
												<button v-for="option in contrassegnoCodPaymentOptions" :key="option.value" type="button" class="service-inline-choice" :class="{ 'is-active': serviceData.contrassegno.cod_payment_method === option.value }" @click="serviceData.contrassegno.cod_payment_method = option.value; serviceCardErrors.contrassegnoCodPayment = ''">{{ option.label }}</button>
											</div>
											<p v-if="serviceCardErrors.contrassegnoCodPayment" class="service-inline-field__error">{{ serviceCardErrors.contrassegnoCodPayment }}</p>
										</div>
									</div>

									<!-- Assicurazione -->
									<div v-else-if="service.key === 'assicurazione'" class="service-inline-panel">
										<div class="service-inline-insurance-list">
											<div v-for="(pack, indexPopup) in insurancePackages" :key="`${service.name}-${indexPopup}`" class="service-inline-insurance-card">
												<div class="service-inline-insurance-card__head">
													<span class="service-inline-insurance-card__title">Collo {{ indexPopup + 1 }}</span>
													<span class="service-inline-insurance-card__meta">{{ pack.weight || '0' }} kg · {{ pack.first_size || '0' }}x{{ pack.second_size || '0' }}x{{ pack.third_size || '0' }} cm</span>
												</div>
												<div class="service-inline-field__input-shell">
													<input :id="`assicurazione-${indexPopup}`" v-model="serviceData.assicurazione[indexPopup]" type="text" inputmode="decimal" autocomplete="off" class="service-inline-field__input" placeholder="Valore assicurato" @input="serviceData.assicurazione[indexPopup] = normalizeCurrencyInput($event.target.value); serviceCardErrors.assicurazione[indexPopup] = ''" />
													<span class="service-inline-field__suffix">&euro;</span>
												</div>
												<p v-if="serviceCardErrors.assicurazione[indexPopup]" class="service-inline-field__error">{{ serviceCardErrors.assicurazione[indexPopup] }}</p>
											</div>
										</div>
									</div>
									<div v-if="canConfigureService(service)" class="service-inline-panel__actions" :class="{ 'service-inline-panel__actions--split': service.isSelected }">
										<button
											v-if="service.isSelected"
											type="button"
											class="service-card-tile__action service-card-tile__action--neutral service-inline-panel__dismiss no-radius"
											@click.stop.prevent="$emit('remove-configured-service', service)">
											Rimuovi
										</button>
										<button
											type="button"
											class="service-card-tile__action service-card-tile__action--primary service-inline-panel__submit no-radius"
											:disabled="!service.isSelected && !canActivateConfiguredService(service)"
											@click.stop.prevent="$emit('activate-configured-service', service)">
											{{ service.isSelected ? 'Salva modifiche' : 'Salva e attiva' }}
										</button>
									</div>
								</div>
							</transition>
						</article>
					</div>

					<!-- Contenuto pacco + notifiche -->
					<ShipmentServiceContentNotifications
						:content-description="contentDescription"
						:content-error="contentError"
						:content-field-hint="contentFieldHint"
						:sms-email-notification="smsEmailNotification"
						:notification-price-label="notificationPriceLabel"
						@update:content-description="$emit('update:content-description', $event)"
						@update:content-error="$emit('update:content-error', $event)"
						@update:sms-email-notification="$emit('update:sms-email-notification', $event)" />
				</div>
			</div>
		</div>
	</section>
</template>
