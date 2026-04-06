<script setup>
const userStore = useUserStore();
const route = useRoute();
const { openAuthModal } = useAuthModal();
const isAuthenticated = useAuthUiState().isAuthenticatedForUi;
definePageMeta({ middleware: ['shipment-validation'] });

useSeoMeta({
	title: 'Configura la tua Spedizione — SpedizioneFacile',
	description: 'Scegli servizi, date di ritiro e indirizzi per configurare la tua spedizione in pochi passaggi.',
	ogTitle: 'Configura la tua Spedizione — SpedizioneFacile',
	ogDescription: 'Scegli servizi, date di ritiro e indirizzi per configurare la tua spedizione in pochi passaggi.',
});
const { session, status, refresh } = useSession({ server: true });
const sanctumClient = useSanctumClient();
const dateError = ref(null);
const submitError = ref(null);
const contentError = ref(null);
const formRef = ref(null);
const stepsRef = ref(null);
const pickupDateSectionRef = ref(null);
const servicesStageRef = ref(null);
const addressStageRef = ref(null);
const deliveryMode = computed({
	get: () => userStore.deliveryMode,
	set: (v) => {
		userStore.deliveryMode = v;
	},
});
const SERVICE_ICON_FILTER_IDLE =
	'brightness(0) saturate(100%) invert(23%) sepia(23%) saturate(1100%) hue-rotate(151deg) brightness(92%) contrast(88%)';
const SERVICE_ICON_FILTER_ACTIVE =
	'brightness(0) invert(1)';

const {
	chooseDate,
	chooseService,
	daysInMonth,
	ensureServiceSelected,
	expandedServiceKey,
	featuredService,
	regularServices,
	removeService,
	resetServicesState,
	serviceData,
	services,
	servicesList,
	smsEmailNotification,
	notificationPriceLabel,
	syncSelectedServicesVisual,
	toggleServiceDetails,
	toggleServiceSelection,
} = useShipmentStepServices({ userStore, dateError });

const { editCartId, editablePackages, loadCartItemForEdit, loadingEditData } = useShipmentStepCartEdit({
	sanctumClient,
	session,
	syncSelectedServicesVisual,
	userStore,
});

const {
	serviceCardErrors,
	clearServiceCardErrors,
	normalizeCurrencyInput,
	contrassegnoIncassoOptions,
	contrassegnoRimborsoOptions,
	requiresContrassegnoDettaglio,
	insurancePackages,
	validateInlineServiceDetails,
	isServiceExpanded,
	canConfigureService,
	getServiceConfigureLabel,
	handleServicePrimaryAction,
	removeConfiguredService,
	toggleRegularService,
	toggleFeaturedService,
	activateConfiguredService,
} = useShipmentStepServiceCards({
	editablePackages,
	ensureServiceSelected,
	expandedServiceKey,
	featuredService,
	chooseService,
	removeService,
	resetServicesState,
	serviceData,
	servicesList,
	smsEmailNotification,
	submitError,
	toggleServiceDetails,
	toggleServiceSelection,
	userStore,
});

const {
	applySavedAddress,
	destSelectorRef,
	destinationAddress,
	loadingSavedAddresses,
	originAddress,
	originSelectorRef,
	saveAddressToBook,
	savedAddresses,
	showDestAddressSelector,
	showOriginAddressSelector,
	shouldAutoShowAddressFields,
	toggleAddressSelector,
	canSaveOriginAddress,
	canSaveDestAddress,
	savingOriginAddress,
	savingDestAddress,
} = useShipmentStepAddresses({ userStore, session, route, isAuthenticated, sanctumClient, deliveryMode, submitError });

const { persistShipmentFlowState } = useShipmentStepSessionPersistence({
	sanctumClient,
	refresh,
	session,
	submitError,
	userStore,
	services,
	smsEmailNotification,
	originAddress,
	destinationAddress,
});

const {
	applyFieldAssist,
	contentFieldHint,
	destCapSuggestions,
	destCitySuggestions,
	destProvinceSuggestions,
	fieldClass,
	fieldErrorText,
	focusContentDescriptionField,
	focusFirstFormError,
	formatCapSuggestionLabel,
	formatCitySuggestionLabel,
	getFieldAssist,
	getFieldError,
	normalizeLocationText,
	onCapFocus,
	onCapInput,
	onCityFocus,
	onCityInput,
	onNameInput,
	onProvinciaInput,
	onProvinceFocus,
	onTelefonoInput,
	originCapSuggestions,
	originCitySuggestions,
	originProvinceSuggestions,
	selectCap,
	selectCity,
	selectProvincia,
	smartBlur,
	softenErrorMessage,
	sv,
	validateForm,
} = useShipmentStepValidation({
	contentError,
	dateError,
	deliveryMode,
	destinationAddress,
	originAddress,
	sanctumClient,
	services,
	userStore,
});

const focusPickupDateSection = () => {
	nextTick(() => {
		const sectionRoot =
			pickupDateSectionRef.value?.$el instanceof HTMLElement ? pickupDateSectionRef.value.$el : pickupDateSectionRef.value;
		const firstDateButton = sectionRoot?.querySelector?.('[data-pickup-day]') || document.querySelector('[data-pickup-day], [id^="date-"]');

		sectionRoot?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
		firstDateButton?.focus?.({ preventScroll: true });
	});
};

const {
	activeAccordionStep,
	addressReadinessItems,
	goBackToServices,
	onPudoDeselected,
	onPudoSelected,
	openAddressFields,
	showAddressFields,
} = useShipmentStepFlow({
	contentError,
	dateError,
	deliveryMode,
	destinationAddress,
	focusContentDescriptionField,
	focusPickupDateSection,
	normalizeLocationText,
	persistServicesStep: () => persistShipmentFlowState({ includeAddresses: false }),
	session,
	services,
	shouldAutoShowAddressFields,
	sv,
	userStore,
});

const { currentStep, initOnMounted, showInitialStepLoading } = useShipmentStepPageState({
	destinationAddress,
	editCartId,
	isAuthenticated,
	loadCartItemForEdit,
	loadingEditData,
	originAddress,
	refresh,
	resetServicesState,
	services,
	session,
	showAddressFields,
	smsEmailNotification,
	status,
	userStore,
});

const {
	canExpandSummaryDimensions,
	canExpandSummaryServices,
	currentShipmentStep,
	goToSummaryMiniStep,
	routeConsistencyState,
	routeWarningMessage,
	showSummaryMiniSteps,
	summaryDetailPanel,
	summaryDimensionsItems,
	summaryDimensionsLabel,
	summaryDestinationCity,
	summaryExpanded,
	summaryMiniSteps,
	summaryOriginCity,
	summaryPackageLabel,
	summaryPackageTypeInfo,
	summaryRouteLabel,
	summaryServicesItems,
	summaryServicesLabel,
	summaryTotalPrice,
	toggleSummaryDetailPanel,
} = useShipmentStepSummary({
	destinationAddress,
	editablePackages,
	normalizeLocationText,
	originAddress,
	session,
	showAddressFields,
	status,
	stepsRef,
	userStore,
});

useCart();

const uiFeedback = useUiFeedback();
const { continueToCart: persistAndContinueToCart, isSubmitting } = useShipmentStepSubmit({
	destinationAddress,
	editablePackages,
	editCartId,
	focusFirstFormError,
	focusPickupDateSection,
	formRef,
	normalizeLocationText,
	originAddress,
	persistSecondStep: (p) => persistShipmentFlowState({ includeAddresses: true, payload: p }),
	routeConsistencyState,
	smsEmailNotification,
	services,
	submitError,
	uiFeedback,
	userStore,
	validateForm,
});

const focusFirstInvalidServiceField = () => {
	nextTick(() => {
		const expandedCard = document.querySelector('.service-option--expanded');
		if (!expandedCard) return;

		const focusTarget = expandedCard.querySelector('.service-inline-field__input, .service-inline-choice, .service-inline-panel__submit');

		focusTarget?.focus?.({ preventScroll: true });
	});
};

const continueToCart = async () => {
	if (!validateInlineServiceDetails()) {
		focusFirstInvalidServiceField();
		return;
	}

	await persistAndContinueToCart();
};

const resolvedContentDescription = computed(() =>
	String(userStore.contentDescription || session.value?.data?.content_description || '').trim(),
);

const selectedServiceSummary = computed(() => {
	const selectedLabels = [];

	if (featuredService.value?.isSelected && featuredService.value?.name) {
		selectedLabels.push(String(featuredService.value.name).trim());
	}

	for (const service of regularServices.value || []) {
		if (!service?.isSelected || !service?.name) continue;
		selectedLabels.push(String(service.name).trim());
	}

	if (smsEmailNotification.value) {
		selectedLabels.push('Notifiche');
	}

	const normalized = [...new Set(selectedLabels.filter(Boolean))];
	if (!normalized.length) return '';

	const visible = normalized.slice(0, 2);
	const remaining = normalized.length - visible.length;
	const summary = visible.join(', ');

	return remaining > 0 ? `${summary} +${remaining}` : summary;
});

const servicesAccordionSummary = computed(() => {
	const parts = [];
	const selectedDate = String(services.value?.date || session.value?.data?.pickup_date || session.value?.data?.services?.date || '').trim();
	if (selectedDate) {
		parts.push(selectedDate);
	}

	const serviceLabel = selectedServiceSummary.value;
	if (serviceLabel) {
		parts.push(serviceLabel);
	}

	const contentLabel = resolvedContentDescription.value;
	if (contentLabel) {
		parts.push(contentLabel.length > 24 ? `${contentLabel.slice(0, 21)}...` : contentLabel);
	}

	return parts.join(' · ') || 'Pronto';
});

const showServicesReadinessNote = computed(() => {
	const hasServiceCardErrors = Object.values(serviceCardErrors || {}).some(Boolean);
	return !(contentError.value || dateError.value || hasServiceCardErrors);
});

const isServicesAccordionOpen = computed(() => activeAccordionStep.value === 'services');
const isAddressAccordionOpen = computed(() => activeAccordionStep.value === 'addresses');

// --- PROVIDE: funzioni form/validazione iniettate nei componenti figli ---
// Evita prop drilling di 19+ funzioni attraverso StepAddressSection → AddressFormFields
provide('shipmentFormHandlers', {
	fieldClass, getFieldError, fieldErrorText, getFieldAssist, applyFieldAssist, smartBlur,
	onNameInput, onCityInput, onCityFocus, onProvinciaInput, onProvinceFocus,
	onCapInput, onCapFocus, onTelefonoInput,
	selectCity, selectProvincia, selectCap,
	formatCitySuggestionLabel, formatCapSuggestionLabel, sv,
});
provide('shipmentSuggestions', {
	originCitySuggestions, originProvinceSuggestions, originCapSuggestions,
	destCitySuggestions, destProvinceSuggestions, destCapSuggestions,
});

const servicesPendingSummary = computed(() => {
	const pendingItems = addressReadinessItems.value.filter((item) => !item.done).map((item) => item.label.toLowerCase());

	if (!pendingItems.length) {
		return 'Apri il prossimo step per completare partenza e destinazione.';
	}

	if (pendingItems.length === 1) {
		return `Completa ${pendingItems[0]} per passare agli indirizzi.`;
	}

	return `Completa ${pendingItems[0]} e ${pendingItems[1]} per passare agli indirizzi.`;
});

const addressAccordionSummary = computed(() => {
	const parts = [];
	const hasRoutePreview =
		summaryOriginCity.value && summaryOriginCity.value !== '—' && summaryDestinationCity.value && summaryDestinationCity.value !== '—';

	if (hasRoutePreview) {
		parts.push(summaryRouteLabel.value);
	} else {
		parts.push('Partenza e destinazione');
	}

	parts.push(deliveryMode.value === 'pudo' ? 'Punto BRT' : 'Consegna a domicilio');
	return parts.join(' · ');
});

const resolveStageElement = (stageRef) => {
	const rawRef = stageRef?.value;
	if (!rawRef) return null;
	return rawRef?.$el instanceof HTMLElement ? rawRef.$el : rawRef;
};

const scrollAccordionStageIntoView = (stageRef, focusSelector) => {
	nextTick(() => {
		const stageElement = resolveStageElement(stageRef);
		if (!stageElement) return;

		window.setTimeout(() => {
			stageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
			if (focusSelector) {
				const focusTarget = stageElement.querySelector(focusSelector);
				focusTarget?.focus?.({ preventScroll: true });
			}
		}, 120);
	});
};

const openShipmentAuthModal = (tab = 'login') => {
	openAuthModal({ redirect: route.fullPath, tab });
};

const openAddressAccordion = async () => {
	submitError.value = null;
	dateError.value = null;
	contentError.value = null;
	clearServiceCardErrors();

	if (!validateInlineServiceDetails()) {
		focusFirstInvalidServiceField();
		return;
	}

	expandedServiceKey.value = '';
	const opened = await openAddressFields();
	if (opened === false) return;

	scrollAccordionStageIntoView(addressStageRef, '#name, #dest_name, input:not([readonly])');
};

const collapseAddressAccordion = async () => {
	const collapsed = await goBackToServices();
	if (collapsed === false) return;

	scrollAccordionStageIntoView(servicesStageRef, '[data-accordion-trigger="services"]');
};

const clearAccordionPanelTransitionStyles = (el) => {
	el.style.height = '';
	el.style.opacity = '';
	el.style.transform = '';
	el.style.overflow = '';
	el.style.transition = '';
};

const bindAccordionPanelTransitionEnd = (el, done) => {
	const onTransitionEnd = (event) => {
		if (event.target !== el || event.propertyName !== 'height') return;
		el.removeEventListener('transitionend', onTransitionEnd);
		done();
	};

	el.addEventListener('transitionend', onTransitionEnd);
};

const onAccordionPanelBeforeEnter = (el) => {
	el.style.height = '0px';
	el.style.opacity = '0';
	el.style.overflow = 'hidden';
};

const onAccordionPanelEnter = (el, done) => {
	el.style.transition = 'height 350ms cubic-bezier(0.22,1,0.36,1), opacity 250ms ease';
	void el.offsetHeight;
	bindAccordionPanelTransitionEnd(el, done);

	requestAnimationFrame(() => {
		el.style.height = `${el.scrollHeight}px`;
		el.style.opacity = '1';
	});
};

const onAccordionPanelAfterEnter = (el) => {
	clearAccordionPanelTransitionStyles(el);
};

const onAccordionPanelBeforeLeave = (el) => {
	el.style.height = `${el.scrollHeight}px`;
	el.style.opacity = '1';
	el.style.overflow = 'hidden';
};

const onAccordionPanelLeave = (el, done) => {
	el.style.height = `${el.scrollHeight}px`;
	el.style.transition = 'height 300ms cubic-bezier(0.22,1,0.36,1), opacity 200ms ease';
	void el.offsetHeight;
	bindAccordionPanelTransitionEnd(el, done);

	requestAnimationFrame(() => {
		el.style.height = '0px';
		el.style.opacity = '0';
	});
};

const onAccordionPanelAfterLeave = (el) => {
	clearAccordionPanelTransitionStyles(el);
};

onMounted(initOnMounted);
</script>

<template>
	<section class="shipment-step-page">
		<div class="shipment-step-container">
			<div v-if="showInitialStepLoading" class="min-h-[560px] bg-[#E4E4E4] rounded-[18px] animate-pulse" />
			<form v-else ref="formRef" @submit.prevent="continueToCart">
				<div ref="stepsRef" class="mb-[6px] tablet:mb-[8px]">
					<Steps :current-step="currentShipmentStep - 1" />
				</div>
				<ShipmentStepSummaryCard
					v-if="currentStep === 2"
					:expanded="summaryExpanded"
					:compact-mobile="true"
					:detail-panel="summaryDetailPanel"
					:show-mini-steps="showSummaryMiniSteps"
					:summary-mini-steps="summaryMiniSteps"
					:summary-package-label="summaryPackageLabel"
					:summary-package-type-info="summaryPackageTypeInfo"
					:summary-dimensions-label="summaryDimensionsLabel"
					:summary-route-label="summaryRouteLabel"
					:summary-total-price="summaryTotalPrice"
					:route-warning-message="routeWarningMessage"
					:summary-origin-city="summaryOriginCity"
					:summary-destination-city="summaryDestinationCity"
					:can-expand-summary-dimensions="canExpandSummaryDimensions"
					:can-expand-summary-services="canExpandSummaryServices"
					:summary-services-label="summaryServicesLabel"
					:summary-dimensions-items="summaryDimensionsItems"
					:summary-services-items="summaryServicesItems"
					@go-mini-step="goToSummaryMiniStep"
					@toggle-detail-panel="toggleSummaryDetailPanel"
					@update:expanded="summaryExpanded = $event" />
				<div class="shipment-flow-accordion">
					<section ref="servicesStageRef" class="shipment-flow-stage" :class="{ 'shipment-flow-stage--open': isServicesAccordionOpen }">
						<button
							type="button"
							class="shipment-flow-stage__toggle"
							data-accordion-trigger="services"
							:aria-expanded="isServicesAccordionOpen ? 'true' : 'false'"
							@click="!isServicesAccordionOpen && collapseAddressAccordion()">
							<span class="shipment-flow-stage__badge">2</span>
							<div class="shipment-flow-stage__copy">
								<p class="shipment-flow-stage__eyebrow">Step 2</p>
								<h2 class="shipment-flow-stage__title">Servizi</h2>
								<p class="shipment-flow-stage__summary">
									{{ isServicesAccordionOpen ? 'Ritiro, extra e contenuto del pacco.' : servicesAccordionSummary }}
								</p>
							</div>
							<span
								class="shipment-flow-stage__indicator"
								:class="{ 'shipment-flow-stage__indicator--open': isServicesAccordionOpen }"
								aria-hidden="true">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M6 9l6 6 6-6" />
								</svg>
							</span>
						</button>
						<Transition
							@before-enter="onAccordionPanelBeforeEnter"
							@enter="onAccordionPanelEnter"
							@after-enter="onAccordionPanelAfterEnter"
							@before-leave="onAccordionPanelBeforeLeave"
							@leave="onAccordionPanelLeave"
							@after-leave="onAccordionPanelAfterLeave">
							<div v-if="isServicesAccordionOpen" class="shipment-flow-stage__body shipment-flow-stage__body--services">
								<ShipmentStepPickupDate
									ref="pickupDateSectionRef"
									:date-error="dateError"
									:days-in-month="daysInMonth"
									:services="services"
									@choose-date="chooseDate" />
								<ShipmentStepServicesGrid
									:featured-service="featuredService"
									:regular-services="regularServices"
									:service-data="serviceData"
									:service-card-errors="serviceCardErrors"
									:is-service-expanded="isServiceExpanded"
									:can-configure-service="canConfigureService"
									:get-service-configure-label="getServiceConfigureLabel"
									:contrassegno-incasso-options="contrassegnoIncassoOptions"
									:contrassegno-rimborso-options="contrassegnoRimborsoOptions"
									:requires-contrassegno-dettaglio="requiresContrassegnoDettaglio"
									:insurance-packages="insurancePackages"
									:normalize-currency-input="normalizeCurrencyInput"
									:service-icon-filter-idle="SERVICE_ICON_FILTER_IDLE"
									:service-icon-filter-active="SERVICE_ICON_FILTER_ACTIVE"
									@toggle-featured-service="toggleFeaturedService"
									@toggle-regular-service="toggleRegularService"
									@handle-service-primary-action="handleServicePrimaryAction"
									@activate-configured-service="activateConfiguredService"
									@remove-configured-service="removeConfiguredService" />
								<ShipmentServiceContentNotifications
									:content-description="resolvedContentDescription"
									:content-error="contentError"
									:content-field-hint="contentFieldHint"
									:sms-email-notification="smsEmailNotification"
									:notification-price-label="notificationPriceLabel"
									@update:content-description="userStore.contentDescription = $event"
									@update:content-error="contentError = $event"
									@update:sms-email-notification="smsEmailNotification = $event" />
								<div class="shipment-flow-stage__footer">
									<p
										class="shipment-flow-stage__footer-note"
										:class="{ 'shipment-flow-stage__footer-note--ready': showServicesReadinessNote }">
										{{ showServicesReadinessNote ? 'Apri il prossimo step e completa gli indirizzi qui sotto.' : servicesPendingSummary }}
									</p>
									<button type="button" class="sf-flow-cta sf-flow-cta--primary shipment-flow-stage__advance" @click="openAddressAccordion">
										<span>Continua agli indirizzi</span>
										<span class="sf-flow-cta__arrow">
											<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
												<path d="M5 12h14M12 5l7 7-7 7" />
											</svg>
										</span>
									</button>
								</div>
							</div>
						</Transition>
					</section>

					<section ref="addressStageRef" class="shipment-flow-stage" :class="{ 'shipment-flow-stage--open': isAddressAccordionOpen }">
						<button
							type="button"
							class="shipment-flow-stage__toggle"
							data-accordion-trigger="addresses"
							:aria-expanded="isAddressAccordionOpen ? 'true' : 'false'"
							@click="!isAddressAccordionOpen && openAddressAccordion()">
							<span class="shipment-flow-stage__badge">3</span>
							<div class="shipment-flow-stage__copy">
								<p class="shipment-flow-stage__eyebrow">Step 3</p>
								<h2 class="shipment-flow-stage__title">Indirizzi</h2>
								<p class="shipment-flow-stage__summary">
									{{ isAddressAccordionOpen ? 'Partenza, destinazione e consegna.' : addressAccordionSummary }}
								</p>
							</div>
							<span
								class="shipment-flow-stage__indicator"
								:class="{ 'shipment-flow-stage__indicator--open': isAddressAccordionOpen }"
								aria-hidden="true">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M6 9l6 6 6-6" />
								</svg>
							</span>
						</button>
						<Transition
							@before-enter="onAccordionPanelBeforeEnter"
							@enter="onAccordionPanelEnter"
							@after-enter="onAccordionPanelAfterEnter"
							@before-leave="onAccordionPanelBeforeLeave"
							@leave="onAccordionPanelLeave"
							@after-leave="onAccordionPanelAfterLeave">
							<div v-if="isAddressAccordionOpen" class="shipment-flow-stage__body shipment-flow-stage__body--addresses">
								<ShipmentStepAddressSection
									:is-open="showAddressFields"
									:origin-address="originAddress"
									:destination-address="destinationAddress"
									:delivery-mode="deliveryMode"
									:saved-addresses="savedAddresses"
									:loading-saved-addresses="loadingSavedAddresses"
									:show-origin-address-selector="showOriginAddressSelector"
									:show-dest-address-selector="showDestAddressSelector"
									:is-authenticated="isAuthenticated"
									:can-save-origin-address="canSaveOriginAddress"
									:can-save-dest-address="canSaveDestAddress"
									:saving-origin-address="savingOriginAddress"
									:saving-dest-address="savingDestAddress"
									:selected-pudo="userStore.selectedPudo"
									v-model:origin-selector-ref="originSelectorRef"
									v-model:dest-selector-ref="destSelectorRef"
									@update:delivery-mode="(v) => (deliveryMode = v)"
									@save-address="saveAddressToBook"
									@toggle-address-selector="toggleAddressSelector"
									@apply-saved-address="applySavedAddress"
									@open-auth-modal="openShipmentAuthModal"
									@pudo-selected="onPudoSelected"
									@pudo-deselected="onPudoDeselected" />
							</div>
						</Transition>
					</section>
					<ShipmentStepNavigation
						:show-address-fields="showAddressFields"
						:address-readiness-items="addressReadinessItems"
						:show-readiness-note="false"
						:show-desktop-advance-button="false"
						:is-submitting="isSubmitting"
						:edit-cart-id="editCartId"
						:summary-total-price="summaryTotalPrice"
						:submit-error="submitError"
						:soften-error-message="softenErrorMessage"
						@go-back-to-services="collapseAddressAccordion"
						@open-address-fields="openAddressAccordion" />
				</div>
			</form>
		</div>
	</section>
</template>

<style scoped>
.shipment-step-page {
	min-height: 100vh;
	background: linear-gradient(180deg, #F8F9FB 0%, #EEF0F3 100%);
	padding-top: 28px;
	padding-bottom: 96px;
}

@media (min-width: 45rem) {
	.shipment-step-page {
		padding-top: 40px;
		padding-bottom: 120px;
	}
}

.shipment-step-container {
	width: 100%;
	max-width: 1280px;
	margin-inline: auto;
	padding-inline: 14px;
}

@media (min-width: 40rem) {
	.shipment-step-container {
		padding-inline: 40px;
	}
}
</style>
