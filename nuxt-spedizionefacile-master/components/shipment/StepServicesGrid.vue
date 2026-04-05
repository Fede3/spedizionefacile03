<script setup>
const props = defineProps({
	featuredService: { type: Object, default: null },
	regularServices: { type: Array, required: true },
	serviceData: { type: Object, required: true },
	serviceCardErrors: { type: Object, required: true },
	isServiceExpanded: { type: Function, required: true },
	canConfigureService: { type: Function, required: true },
	getServiceConfigureLabel: { type: Function, required: true },
	contrassegnoIncassoOptions: { type: Array, required: true },
	contrassegnoRimborsoOptions: { type: Array, required: true },
	requiresContrassegnoDettaglio: { type: Boolean, default: false },
	insurancePackages: { type: Array, required: true },
	normalizeCurrencyInput: { type: Function, required: true },
	serviceIconFilterIdle: { type: String, required: true },
	serviceIconFilterActive: { type: String, required: true },
});

const emit = defineEmits([
	'toggle-featured-service',
	'toggle-regular-service',
	'handle-service-primary-action',
	'activate-configured-service',
	'remove-configured-service',
]);

const getServiceSupportText = (service) => {
	if (!service) return '';

	const description = String(service.description || '').trim();
	const shortDescription = description.length > 34 ? `${description.slice(0, 31)}...` : description;
	const statusLabel = String(service.statusLabel || '').trim();

	if (description) return shortDescription;
	return statusLabel;
};

const getFeaturedServiceDescription = computed(() => {
	const source = props.featuredService?.isSelected
		? props.featuredService?.statusLabel || props.featuredService?.description || ''
		: props.featuredService?.description || '';
	const text = String(source).trim();
	if (!text) return '';
	if (text.length <= 62) return text;
	return `${text.slice(0, 59)}...`;
});

const INTERACTIVE_SELECTOR = 'button, a, input, textarea, select, label';

const isInteractiveTarget = (target) => target instanceof HTMLElement && Boolean(target.closest(INTERACTIVE_SELECTOR));

const handleFeaturedSurfaceClick = (event) => {
	if (!props.featuredService) return;
	if (isInteractiveTarget(event?.target)) return;
	emit('toggle-featured-service');
};

const handleFeaturedSurfaceKeydown = (event) => {
	if (!['Enter', ' '].includes(event?.key)) return;
	event.preventDefault();
	handleFeaturedSurfaceClick(event);
};

const handleRegularSurfaceClick = (service, event) => {
	if (!service) return;
	if (isInteractiveTarget(event?.target)) return;

	if (!props.canConfigureService(service)) {
		emit('toggle-regular-service', service);
		return;
	}

	if (props.isServiceExpanded(service.key)) return;
	emit('handle-service-primary-action', service);
};

const handleRegularSurfaceKeydown = (service, event) => {
	if (!['Enter', ' '].includes(event?.key)) return;
	event.preventDefault();
	handleRegularSurfaceClick(service, event);
};

const showCollapsedPrimaryAction = (service) => Boolean(service && !props.isServiceExpanded(service.key));

const getCollapsedPrimaryLabel = (service) => {
	if (!service) return '';
	if (props.canConfigureService(service)) {
		return service.isSelected ? 'Modifica' : 'Aggiungi';
	}
	return service.isSelected ? 'Rimuovi' : 'Aggiungi';
};

const handleCollapsedPrimaryAction = (service) => {
	if (!service) return;
	if (props.canConfigureService(service)) {
		emit('handle-service-primary-action', service);
		return;
	}
	emit('toggle-regular-service', service);
};

const getCollapsedPrimaryClass = (service) =>
	service?.isSelected ? 'service-option__cta service-option__cta--neutral' : 'service-option__cta service-option__cta--primary';

const showCollapsedRemoveAction = (service) =>
	Boolean(service?.isSelected && props.canConfigureService(service) && !props.isServiceExpanded(service.key));

const onInlineBeforeEnter = (el) => {
	el.style.height = '0px';
	el.style.opacity = '0';
	el.style.transform = 'translateY(-4px)';
	el.style.overflow = 'hidden';
};

const onInlineEnter = (el, done) => {
	const onTransitionEnd = (event) => {
		if (event.target !== el || event.propertyName !== 'height') return;
		el.removeEventListener('transitionend', onTransitionEnd);
		done();
	};

	el.addEventListener('transitionend', onTransitionEnd);
	requestAnimationFrame(() => {
		el.style.height = `${el.scrollHeight}px`;
		el.style.opacity = '1';
		el.style.transform = 'translateY(0)';
	});
};

const onInlineAfterEnter = (el) => {
	el.style.height = 'auto';
	el.style.overflow = 'visible';
	el.style.opacity = '';
	el.style.transform = '';
};

const onInlineBeforeLeave = (el) => {
	el.style.height = `${el.scrollHeight}px`;
	el.style.opacity = '1';
	el.style.transform = 'translateY(0)';
	el.style.overflow = 'hidden';
};

const onInlineLeave = (el, done) => {
	const onTransitionEnd = (event) => {
		if (event.target !== el || event.propertyName !== 'height') return;
		el.removeEventListener('transitionend', onTransitionEnd);
		done();
	};

	el.addEventListener('transitionend', onTransitionEnd);
	requestAnimationFrame(() => {
		el.style.height = '0px';
		el.style.opacity = '0';
		el.style.transform = 'translateY(-4px)';
	});
};
</script>

<template>
	<section class="services-stage-shell sf-section-block">
		<div class="flow-section-header flow-section-header--services sf-section-block__header">
			<div class="flow-section-header__copy">
				<h2 class="flow-section-header__title sf-section-title">Servizi aggiuntivi</h2>
				<p class="flow-section-header__text">Attiva solo quello che ti serve davvero: copertura, contrassegno e supporti operativi.</p>
			</div>
			<span class="sf-section-chip">Opzionali</span>
		</div>

		<div class="services-stage-shell__content font-montserrat">
			<article
				v-if="featuredService"
				class="service-option service-option--featured"
				:class="{ 'service-option--selected': featuredService.isSelected }">
				<div
					class="service-option__row service-option__row--featured service-option__row--interactive"
					role="button"
					tabindex="0"
					@click="handleFeaturedSurfaceClick"
					@keydown="handleFeaturedSurfaceKeydown">
					<div class="service-option__main">
						<div
							class="service-option__icon-shell service-card-tile__icon-shell sf-icon-shell"
							:class="{ 'service-card-tile__icon-shell--selected': featuredService.isSelected }">
							<div
								class="service-card-tile__icon"
								:style="{
									'--service-icon-bg': 'url(/img/quote/second-step/no-label.png)',
									'--service-icon-width': '28px',
									'--service-icon-height': '24px',
									'--service-icon-filter': featuredService.isSelected ? serviceIconFilterActive : serviceIconFilterIdle,
								}" />
						</div>
						<div class="service-option__copy">
							<div class="service-option__headline">
								<h3 class="service-option__title">{{ featuredService.name }}</h3>
								<span class="service-option__badge service-option__badge--featured sf-section-chip">Consigliato</span>
							</div>
							<p v-if="getFeaturedServiceDescription" class="service-option__description">{{ getFeaturedServiceDescription }}</p>
						</div>
					</div>
					<div class="service-option__aside service-option__aside--featured">
						<div class="service-option__price-stack service-option__price-stack--featured">
							<span class="service-option__price-current">{{ featuredService.currentPriceLabel }}</span>
						</div>
						<span
							class="service-option__status-dot"
							:class="{ 'service-option__status-dot--active': featuredService.isSelected }"
							aria-hidden="true">
							<svg
								v-if="featuredService.isSelected"
								width="13"
								height="13"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.6"
								stroke-linecap="round"
								stroke-linejoin="round">
								<polyline points="20 6 9 17 4 12" />
							</svg>
						</span>
					</div>
				</div>
			</article>
			<div class="service-group-shell">
				<div class="service-option-list" :class="{ 'service-option-list--with-featured': featuredService }">
					<article
						v-for="(service, serviceIndex) in regularServices"
						:key="service.key || serviceIndex"
						class="service-option"
						:class="{
							'service-option--selected': service.isSelected,
							'service-option--expanded': isServiceExpanded(service.key),
						}">
						<div
							class="service-option__row service-option__row--interactive"
							role="button"
							tabindex="0"
							@click="handleRegularSurfaceClick(service, $event)"
							@keydown="handleRegularSurfaceKeydown(service, $event)">
							<div class="service-option__main">
								<div
									class="service-option__icon-shell service-card-tile__icon-shell sf-icon-shell"
									:class="{ 'service-card-tile__icon-shell--selected': service.isSelected }">
									<div
										class="service-card-tile__icon"
										:style="{
											'--service-icon-bg': `url(/img/quote/second-step/${service.img})`,
											'--service-icon-width': `${service.width}px`,
											'--service-icon-height': `${service.height}px`,
											'--service-icon-filter': service.isSelected ? serviceIconFilterActive : serviceIconFilterIdle,
										}" />
								</div>
								<div class="service-option__copy">
									<div class="service-option__headline">
										<h3 class="service-option__title">{{ service.name }}</h3>
									</div>
									<p
										v-if="getServiceSupportText(service)"
										class="service-option__description"
										:class="{ 'service-option__description--status': service.isSelected }">
										{{ getServiceSupportText(service) }}
									</p>
								</div>
							</div>

							<div class="service-option__aside">
								<div class="service-option__price-stack">
									<span class="service-option__price-current">{{ service.priceLabel }}</span>
								</div>
								<div class="service-option__actions">
									<button
										v-if="showCollapsedPrimaryAction(service)"
										type="button"
										:class="['service-option__cta', 'btn-compact', getCollapsedPrimaryClass(service)]"
										:aria-expanded="isServiceExpanded(service.key) ? 'true' : 'false'"
										:aria-controls="`service-inline-panel-${service.key || serviceIndex}`"
										@click.stop.prevent="handleCollapsedPrimaryAction(service)">
										{{ getCollapsedPrimaryLabel(service) }}
									</button>
									<button
										v-if="showCollapsedRemoveAction(service)"
										type="button"
										class="service-option__link-action service-option__link-action--danger btn-danger btn-compact"
										@click.stop.prevent="$emit('remove-configured-service', service)">
										Rimuovi
									</button>
								</div>
							</div>
						</div>

						<Transition
							name="service-inline-reveal"
							@before-enter="onInlineBeforeEnter"
							@enter="onInlineEnter"
							@after-enter="onInlineAfterEnter"
							@before-leave="onInlineBeforeLeave"
							@leave="onInlineLeave">
							<div
								v-if="canConfigureService(service) && isServiceExpanded(service.key)"
								:id="`service-inline-panel-${service.key || serviceIndex}`"
								class="service-option__accordion service-inline-panel">
								<div v-if="service.key === 'contrassegno'">
									<div class="service-inline-panel__grid service-inline-panel__grid--double">
										<div class="service-inline-field">
											<label class="service-inline-field__label" :for="`contrassegno-importo-${serviceIndex}`">Importo</label>
											<div class="service-inline-field__input-shell">
												<input
													:id="`contrassegno-importo-${serviceIndex}`"
													v-model="serviceData.contrassegno.importo"
													type="text"
													inputmode="decimal"
													autocomplete="off"
													class="service-inline-field__input"
													placeholder="0,00"
													@input="
														serviceData.contrassegno.importo = normalizeCurrencyInput($event.target.value);
														serviceCardErrors.contrassegnoImporto = '';
													" />
												<span class="service-inline-field__suffix">&euro;</span>
											</div>
											<p v-if="serviceCardErrors.contrassegnoImporto" class="service-inline-field__error">
												{{ serviceCardErrors.contrassegnoImporto }}
											</p>
										</div>
										<div v-if="requiresContrassegnoDettaglio" class="service-inline-field">
											<label class="service-inline-field__label" :for="`contrassegno-iban-${serviceIndex}`">IBAN</label>
											<input
												:id="`contrassegno-iban-${serviceIndex}`"
												v-model="serviceData.contrassegno.dettaglio_rimborso"
												type="text"
												class="service-inline-field__input"
												placeholder="IT60X054281110..."
												@input="serviceCardErrors.contrassegnoDettaglio = ''" />
											<p v-if="serviceCardErrors.contrassegnoDettaglio" class="service-inline-field__error">
												{{ serviceCardErrors.contrassegnoDettaglio }}
											</p>
										</div>
									</div>
									<div class="service-inline-choice-block">
										<span class="service-inline-field__label">Incasso</span>
										<div class="service-inline-choice-wrap" role="group" aria-label="Modalita incasso contrassegno">
											<button
												v-for="option in contrassegnoIncassoOptions"
												:key="option.value"
												type="button"
												class="service-inline-choice"
												:class="{ 'is-active': serviceData.contrassegno.modalita_incasso === option.value }"
												@click="
													serviceData.contrassegno.modalita_incasso = option.value;
													serviceCardErrors.contrassegnoIncasso = '';
												">
												{{ option.label }}
											</button>
										</div>
										<p v-if="serviceCardErrors.contrassegnoIncasso" class="service-inline-field__error">
											{{ serviceCardErrors.contrassegnoIncasso }}
										</p>
									</div>
									<div class="service-inline-choice-block">
										<span class="service-inline-field__label">Rimborso</span>
										<div class="service-inline-choice-wrap" role="group" aria-label="Modalita rimborso contrassegno">
											<button
												v-for="option in contrassegnoRimborsoOptions"
												:key="option.value"
												type="button"
												class="service-inline-choice"
												:class="{ 'is-active': serviceData.contrassegno.modalita_rimborso === option.value }"
												@click="
													serviceData.contrassegno.modalita_rimborso = option.value;
													serviceCardErrors.contrassegnoRimborso = '';
												">
												{{ option.label }}
											</button>
										</div>
										<p v-if="serviceCardErrors.contrassegnoRimborso" class="service-inline-field__error">
											{{ serviceCardErrors.contrassegnoRimborso }}
										</p>
									</div>
								</div>

								<div v-else-if="service.key === 'assicurazione'">
									<div class="service-inline-insurance-list">
										<div
											v-for="(pack, indexPopup) in insurancePackages"
											:key="`${service.name}-${indexPopup}`"
											class="service-inline-insurance-card">
											<div class="service-inline-insurance-card__head">
												<span class="service-inline-insurance-card__title">Collo {{ indexPopup + 1 }}</span>
												<span class="service-inline-insurance-card__meta">
													{{ pack.weight || '0' }} kg · {{ pack.first_size || '0' }}x{{ pack.second_size || '0' }}x{{
														pack.third_size || '0'
													}}
													cm
												</span>
											</div>
											<div class="service-inline-field__input-shell">
												<input
													:id="`assicurazione-${indexPopup}`"
													v-model="serviceData.assicurazione[indexPopup]"
													type="text"
													inputmode="decimal"
													autocomplete="off"
													class="service-inline-field__input"
													placeholder="Valore assicurato"
													@input="
														serviceData.assicurazione[indexPopup] = normalizeCurrencyInput($event.target.value);
														serviceCardErrors.assicurazione[indexPopup] = '';
													" />
												<span class="service-inline-field__suffix">&euro;</span>
											</div>
											<p v-if="serviceCardErrors.assicurazione[indexPopup]" class="service-inline-field__error">
												{{ serviceCardErrors.assicurazione[indexPopup] }}
											</p>
										</div>
									</div>
								</div>

								<div class="service-inline-panel__actions" :class="{ 'service-inline-panel__actions--split': service.isSelected }">
									<button
										v-if="service.isSelected"
										type="button"
										class="btn-secondary btn-compact service-inline-panel__dismiss"
										@click.stop.prevent="$emit('remove-configured-service', service)">
										Rimuovi
									</button>
									<button
										type="button"
										class="btn-cta btn-compact service-inline-panel__submit"
										@click.stop.prevent="$emit('activate-configured-service', service)">
										Salva e attiva
									</button>
								</div>
							</div>
						</Transition>
					</article>
				</div>
			</div>
		</div>
	</section>
</template>
