<script setup>
/* Multi-step: Step 1 servizi/data, Step 2 indirizzi. Middleware: shipment-validation. */
const userStore = useUserStore();
const route = useRoute();
const { openAuthModal } = useAuthModal();
const isAuthenticated = useAuthUiState().isAuthenticatedForUi;
definePageMeta({ middleware: ["shipment-validation"] });
const { session, status, refresh } = useSession();
const sanctumClient = useSanctumClient();
const dateError = ref(null);
const submitError = ref(null);
const contentError = ref(null);
const formRef = ref(null);
const stepsRef = ref(null);
const pickupDateSectionRef = ref(null);
const deliveryMode = computed({ get: () => userStore.deliveryMode, set: (v) => { userStore.deliveryMode = v; } });
const SERVICE_ICON_FILTER_IDLE = "brightness(0) saturate(100%) invert(23%) sepia(23%) saturate(1100%) hue-rotate(151deg) brightness(92%) contrast(88%)";

const {
	chooseDate, chooseService, daysInMonth, ensureServiceSelected, expandedServiceName,
	featuredService, regularServices, resetServicesState, serviceData, services,
	servicesList, smsEmailNotification, notificationPriceLabel,
	syncSelectedServicesVisual, toggleServiceDetails, toggleServiceSelection,
} = useShipmentStepServices({ userStore, dateError });

const {
	editCartId, editablePackages, loadCartItemForEdit, loadingEditData,
} = useShipmentStepCartEdit({ sanctumClient, session, syncSelectedServicesVisual, userStore });

const {
	serviceCardErrors, normalizeCurrencyInput, contrassegnoIncassoOptions,
	contrassegnoRimborsoOptions, contrassegnoCodPaymentOptions, requiresContrassegnoDettaglio, insurancePackages,
	validateInlineServiceDetails, isServiceExpanded, isServiceSelected,
	canConfigureService, shouldShowServiceToggle, shouldShowConfigureButton,
	canActivateConfiguredService, getServiceStateLabel, getServiceConfigureLabel,
	handleServicePrimaryAction, toggleRegularService, toggleFeaturedService, activateConfiguredService,
} = useShipmentStepServiceCards({
	editablePackages, ensureServiceSelected, expandedServiceName, featuredService,
	chooseService, resetServicesState, serviceData, servicesList,
	smsEmailNotification, submitError, toggleServiceDetails, toggleServiceSelection, userStore,
});

const {
	applySavedAddress, canSaveDestAddress, canSaveOriginAddress,
	clearAddressSelectorsAndPrompts, defaultDropdownRef, destDefaultDropdownRef,
	destFromSaved, destSaveSuccess, destSavedSnapshot, destSelectorRef,
	destinationAddress, loadingSavedAddresses, originAddress, originFromSaved,
	originSaveSuccess, originSavedSnapshot, originSelectorRef, saveAddressToBook,
	savedAddresses, savingDestAddress, savingOriginAddress, showDestAddressSelector,
	showDestConfigGuestPrompt, showDestGuestPrompt, showOriginAddressSelector,
	showOriginConfigGuestPrompt, showOriginGuestPrompt, shouldAutoShowAddressFields,
	toggleAddressSelector,
} = useShipmentStepAddresses({ userStore, session, route, isAuthenticated, sanctumClient, deliveryMode, submitError });

const { persistShipmentFlowState } = useShipmentStepSessionPersistence({
	sanctumClient, refresh, session, submitError, userStore, services, smsEmailNotification, originAddress, destinationAddress,
});

const {
	applyFieldAssist, contentFieldHint, destCapSuggestions, destCitySuggestions,
	destProvinceSuggestions, destinationSectionHint, fieldClass, fieldErrorText,
	focusFormError, focusContentDescriptionField, focusFirstFormError,
	formErrorSummary, formatCapSuggestionLabel, formatCitySuggestionLabel,
	getFieldAssist, getFieldError, normalizeLocationText, onCapFocus, onCapInput,
	onCityFocus, onCityInput, onNameInput, onProvinciaInput, onProvinceFocus,
	onTelefonoInput, originCapSuggestions, originCitySuggestions,
	originProvinceSuggestions, originSectionHint, selectCap, selectCity,
	selectProvincia, showGlobalFormSummary, smartBlur, softenErrorMessage, sv, validateForm,
} = useShipmentStepValidation({ contentError, dateError, deliveryMode, destinationAddress, originAddress, sanctumClient, services, userStore });

const focusPickupDateSection = () => {
	nextTick(() => {
		const el = pickupDateSectionRef.value?.$el || pickupDateSectionRef.value;
		if (el?.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		document.querySelector('[id^="date-"]')?.focus({ preventScroll: true });
	});
};

const {
	canOpenAddressFields, goBackToServices, onPudoDeselected, onPudoSelected, openAddressFields, showAddressFields,
} = useShipmentStepFlow({
	contentError, dateError, deliveryMode, destinationAddress, focusContentDescriptionField, focusPickupDateSection,
	normalizeLocationText, persistServicesStep: () => persistShipmentFlowState({ includeAddresses: false }),
	session, services, shouldAutoShowAddressFields, sv, userStore,
});

const {
	currentStep, initOnMounted, showInitialStepLoading,
} = useShipmentStepPageState({
	destinationAddress, editCartId, isAuthenticated, loadCartItemForEdit, loadingEditData, originAddress,
	refresh, resetServicesState, services, session, showAddressFields, smsEmailNotification, status, userStore,
});

const {
	canExpandSummaryDimensions, canExpandSummaryServices, currentShipmentStep,
	goToSummaryMiniStep, routeConsistencyState, routeWarningMessage, showSummaryMiniSteps,
	summaryDetailPanel, summaryDimensionsItems, summaryDimensionsLabel, summaryDestinationCity,
	summaryExpanded, summaryMiniSteps, summaryOriginCity, summaryPackageLabel,
	summaryPackageTypeInfo, summaryRouteLabel, summaryServicesItems, summaryServicesLabel,
	summaryTotalPrice, toggleSummaryDetailPanel,
} = useShipmentStepSummary({
	destinationAddress, editablePackages, normalizeLocationText, originAddress, session, showAddressFields, status, stepsRef, userStore,
});

useCart();
const {
	applyConfig, loadingConfigs, loadSavedConfigs, savedConfigs,
	showDefaultDropdown, showDefaultDropdownTarget, toggleAddressSelectorWithDefaultClose,
} = useShipmentStepSavedConfigs({
	clearAddressSelectorsAndPrompts, defaultDropdownRef, destDefaultDropdownRef, destFromSaved, destSaveSuccess,
	destSavedSnapshot, destSelectorRef, destinationAddress, deliveryMode, isAuthenticated, originAddress, originFromSaved,
	originSaveSuccess, originSavedSnapshot, originSelectorRef, sanctumClient, showDestConfigGuestPrompt,
	showOriginConfigGuestPrompt, toggleAddressSelector,
});

const uiFeedback = useUiFeedback();
const {
	continueToCart: persistAndContinueToCart, isSubmitting,
} = useShipmentStepSubmit({
	destinationAddress, editablePackages, editCartId, focusFirstFormError, focusPickupDateSection, formRef,
	normalizeLocationText, originAddress, persistSecondStep: (p) => persistShipmentFlowState({ includeAddresses: true, payload: p }),
	routeConsistencyState, smsEmailNotification, services, submitError, uiFeedback, userStore, validateForm,
});

const continueToCart = async () => { if (!validateInlineServiceDetails()) return; await persistAndContinueToCart(); };
const openShipmentAuthModal = (tab = 'login') => { openAuthModal({ redirect: route.fullPath, tab }); };
onMounted(initOnMounted);
</script>

<template>
	<section>
		<div class="my-container shipment-step-shell mt-[48px] tablet:mt-[72px] mb-[96px] tablet:mb-[120px]">
			<div v-if="showInitialStepLoading" class="min-h-[560px] bg-[#E4E4E4] rounded-[12px] animate-pulse" />
			<form v-else ref="formRef" @submit.prevent="continueToCart">
				<div ref="stepsRef" class="mb-[16px] tablet:mb-[18px]">
					<Steps :current-step="currentShipmentStep - 1" />
				</div>
				<div>
					<ShipmentStepSummaryCard v-if="currentStep === 2"
						:expanded="summaryExpanded" :compact-mobile="true" :detail-panel="summaryDetailPanel"
						:show-mini-steps="showSummaryMiniSteps" :summary-mini-steps="summaryMiniSteps"
						:summary-package-label="summaryPackageLabel" :summary-package-type-info="summaryPackageTypeInfo"
						:summary-dimensions-label="summaryDimensionsLabel" :summary-route-label="summaryRouteLabel"
						:summary-total-price="summaryTotalPrice" :route-warning-message="routeWarningMessage"
						:summary-origin-city="summaryOriginCity" :summary-destination-city="summaryDestinationCity"
						:can-expand-summary-dimensions="canExpandSummaryDimensions"
						:can-expand-summary-services="canExpandSummaryServices"
						:summary-services-label="summaryServicesLabel" :summary-dimensions-items="summaryDimensionsItems"
						:summary-services-items="summaryServicesItems"
						@go-mini-step="goToSummaryMiniStep" @toggle-detail-panel="toggleSummaryDetailPanel"
						@update:expanded="summaryExpanded = $event" />
					<div class="services-stage-block sf-stack-section" :class="{ 'is-collapsed-on-mobile': showAddressFields }">
						<ShipmentStepPickupDate ref="pickupDateSectionRef" :date-error="dateError"
							:days-in-month="daysInMonth" :services="services" @choose-date="chooseDate" />
						<ShipmentStepServicesGrid :featured-service="featuredService" :regular-services="regularServices"
							:service-data="serviceData" :service-card-errors="serviceCardErrors"
							:is-service-expanded="isServiceExpanded" :is-service-selected="isServiceSelected"
							:can-configure-service="canConfigureService" :should-show-service-toggle="shouldShowServiceToggle"
							:should-show-configure-button="shouldShowConfigureButton"
							:can-activate-configured-service="canActivateConfiguredService"
							:get-service-state-label="getServiceStateLabel" :get-service-configure-label="getServiceConfigureLabel"
							:contrassegno-incasso-options="contrassegnoIncassoOptions"
							:contrassegno-rimborso-options="contrassegnoRimborsoOptions"
							:contrassegno-cod-payment-options="contrassegnoCodPaymentOptions"
							:requires-contrassegno-dettaglio="requiresContrassegnoDettaglio"
							:insurance-packages="insurancePackages" :normalize-currency-input="normalizeCurrencyInput"
							:service-icon-filter-idle="SERVICE_ICON_FILTER_IDLE" :service-icon-filter-active="SERVICE_ICON_FILTER_IDLE"
							:content-description="userStore.contentDescription" :content-error="contentError"
							:content-field-hint="contentFieldHint" :sms-email-notification="smsEmailNotification"
							:notification-price-label="notificationPriceLabel"
							@toggle-featured-service="toggleFeaturedService" @toggle-regular-service="toggleRegularService"
							@handle-service-primary-action="handleServicePrimaryAction"
							@activate-configured-service="activateConfiguredService"
							@update:content-description="userStore.contentDescription = $event"
							@update:content-error="contentError = $event"
							@update:sms-email-notification="smsEmailNotification = $event" />
					</div>
					<ShipmentStepAddressSection v-if="showAddressFields"
						:origin-address="originAddress" :destination-address="destinationAddress" :delivery-mode="deliveryMode"
						:show-global-form-summary="showGlobalFormSummary" :form-error-summary="formErrorSummary"
						:origin-section-hint="originSectionHint" :destination-section-hint="destinationSectionHint"
						:route-warning-message="routeWarningMessage" :field-class="fieldClass" :get-field-error="getFieldError"
						:field-error-text="fieldErrorText" :get-field-assist="getFieldAssist" :apply-field-assist="applyFieldAssist"
						:smart-blur="smartBlur" :on-name-input="onNameInput" :on-city-input="onCityInput" :on-city-focus="onCityFocus"
						:on-provincia-input="onProvinciaInput" :on-province-focus="onProvinceFocus" :on-cap-input="onCapInput"
						:on-cap-focus="onCapFocus" :on-telefono-input="onTelefonoInput" :select-city="selectCity"
						:select-provincia="selectProvincia" :select-cap="selectCap"
						:format-city-suggestion-label="formatCitySuggestionLabel"
						:format-cap-suggestion-label="formatCapSuggestionLabel" :sv="sv"
						:origin-city-suggestions="originCitySuggestions" :origin-province-suggestions="originProvinceSuggestions"
						:origin-cap-suggestions="originCapSuggestions" :dest-city-suggestions="destCitySuggestions"
						:dest-province-suggestions="destProvinceSuggestions" :dest-cap-suggestions="destCapSuggestions"
						:can-save-origin-address="canSaveOriginAddress" :can-save-dest-address="canSaveDestAddress"
						:saving-origin-address="savingOriginAddress" :saving-dest-address="savingDestAddress"
						:origin-save-success="originSaveSuccess" :dest-save-success="destSaveSuccess"
						:saved-addresses="savedAddresses" :loading-saved-addresses="loadingSavedAddresses"
						:show-origin-address-selector="showOriginAddressSelector" :show-dest-address-selector="showDestAddressSelector"
						:show-origin-guest-prompt="showOriginGuestPrompt" :show-dest-guest-prompt="showDestGuestPrompt"
						:saved-configs="savedConfigs" :loading-configs="loadingConfigs"
						:show-default-dropdown="showDefaultDropdown" :show-default-dropdown-target="showDefaultDropdownTarget"
						:show-origin-config-guest-prompt="showOriginConfigGuestPrompt"
						:show-dest-config-guest-prompt="showDestConfigGuestPrompt" :is-authenticated="isAuthenticated"
						:selected-pudo="userStore.selectedPudo"
						v-model:default-dropdown-ref="defaultDropdownRef" v-model:dest-default-dropdown-ref="destDefaultDropdownRef"
						v-model:origin-selector-ref="originSelectorRef" v-model:dest-selector-ref="destSelectorRef"
						@update:delivery-mode="(v) => deliveryMode = v" @save-address="saveAddressToBook"
						@load-saved-configs="loadSavedConfigs" @apply-config="applyConfig"
						@toggle-address-selector="toggleAddressSelectorWithDefaultClose" @apply-saved-address="applySavedAddress"
						@focus-form-error="focusFormError" @open-auth-modal="openShipmentAuthModal"
						@pudo-selected="onPudoSelected" @pudo-deselected="onPudoDeselected" />
					<ShipmentStepNavigation :show-address-fields="showAddressFields" :can-open-address-fields="canOpenAddressFields"
						:is-submitting="isSubmitting" :edit-cart-id="editCartId" :summary-total-price="summaryTotalPrice"
						:submit-error="submitError" :soften-error-message="softenErrorMessage"
						@go-back-to-services="goBackToServices" @open-address-fields="openAddressFields" />
				</div>
			</form>
		</div>
	</section>
</template>
