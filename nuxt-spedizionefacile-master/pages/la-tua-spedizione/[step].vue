<!--
  FILE: pages/la-tua-spedizione/[step].vue
  SCOPO: Configurazione multi-step — Step 1: servizi/data ritiro; Step 2: indirizzi mittente/destinatario.
  API: GET /api/session (dati sessione), GET /api/user-addresses (rubrica),
       GET /api/locations/search (autocompletamento citta'), GET /api/saved-shipments (configurazioni).
  STORE: userStore.pendingShipment (salva dati per riepilogo).
  ROUTE: /la-tua-spedizione/1 e /la-tua-spedizione/2 (middleware shipment-validation).
-->
<script setup>
const userStore = useUserStore();
const route = useRoute();
const { openAuthModal } = useAuthModal();
const { isAuthenticatedForUi } = useAuthUiState();

// Step corrente dalla route
const currentStep = computed(() => Number(route.params.step));


// Protegge la pagina: deve esserci una sessione con i dati dei pacchi
definePageMeta({
	middleware: ["shipment-validation"],
});

const { session, status, refresh } = useSession();
const dateError = ref(null);
const submitError = ref(null);
const isAuthenticated = isAuthenticatedForUi;
const sanctumClient = useSanctumClient();
const quoteTransitionLock = useState('shipment-flow-quote-transition-lock', () => false);
const deliveryMode = computed({
	get: () => userStore.deliveryMode,
	set: (value) => { userStore.deliveryMode = value; },
});

const pickupDateSectionRef = ref(null);

const {
	chooseDate,
	chooseService,
	daysInMonth,
	ensureServiceSelected,
	expandedServiceName,
	featuredService,
	regularServices,
	removeServiceFromSidebar,
	resetServicesState,
	serviceData,
	services,
	servicesList,
	smsEmailNotification,
	notificationPriceLabel,
	syncSelectedServicesVisual,
	toggleServiceDetails,
	toggleServiceSelection,
} = useShipmentStepServices({
	userStore,
	dateError,
});

const SERVICE_ICON_FILTER_IDLE = "brightness(0) saturate(100%) invert(23%) sepia(23%) saturate(1100%) hue-rotate(151deg) brightness(92%) contrast(88%)";
const SERVICE_ICON_FILTER_ACTIVE = SERVICE_ICON_FILTER_IDLE;

// editablePackages definito qui per uso nel composable service cards
const editablePackages = computed(() => {
	if (editCartId && userStore.packages?.length > 0 && !session.value?.data?.packages?.length) {
		return userStore.packages;
	}
	if (session.value?.data?.packages?.length) return session.value.data.packages;
	if (userStore.packages?.length) return userStore.packages;
	return [];
});

const {
	serviceCardErrors,
	normalizeCurrencyInput,
	parseCurrencyValue,
	contrassegnoIncassoOptions,
	contrassegnoRimborsoOptions,
	requiresContrassegnoDettaglio,
	insurancePackages,
	validateInlineServiceDetails,
	isConfigurableServiceReady,
	isServiceExpanded,
	isServiceSelected,
	featuredServiceIndex,
	canConfigureService,
	shouldShowServiceToggle,
	shouldShowConfigureButton,
	canActivateConfiguredService,
	getServiceStateLabel,
	getServiceConfigureLabel,
	handleServicePrimaryAction,
	toggleRegularService,
	toggleServiceAccordion,
	toggleFeaturedService,
} = useShipmentStepServiceCards({
	editablePackages,
	ensureServiceSelected,
	expandedServiceName,
	featuredService,
	chooseService,
	resetServicesState,
	serviceData,
	servicesList,
	smsEmailNotification,
	submitError,
	toggleServiceDetails,
	toggleServiceSelection,
	userStore,
});

const hasPersistedServiceSelection = computed(() => {
	const serviceType = String(session.value?.data?.services?.service_type || "").trim();
	const notificationsEnabled = Boolean(
		session.value?.data?.sms_email_notification
		?? session.value?.data?.services?.sms_email_notification
		?? false,
	);

	return Boolean(serviceType) || notificationsEnabled;
});

const showInitialStepLoading = computed(() => {
	if (loadingEditData.value) return true;
	if (status.value !== 'pending') return false;

	const hasSessionSnapshot = Boolean(session.value?.data?.shipment_details)
		|| (Array.isArray(session.value?.data?.packages) && session.value.data.packages.length > 0);
	const hasLocalQuoteSnapshot = Array.isArray(userStore.packages) && userStore.packages.length > 0;
	return !hasSessionSnapshot && !hasLocalQuoteSnapshot;
});

const isOriginDetailsEdited = ref(false);
const isDestinationDetailsEdited = ref(false);

const temporaryShipmentDetails = ref({});

const editOriginDetails = () => {
	temporaryShipmentDetails.value = { ...userStore.shipmentDetails };

	isOriginDetailsEdited.value = !isOriginDetailsEdited.value;
};

const editDestinationDetails = () => {
	temporaryShipmentDetails.value = { ...userStore.shipmentDetails };

	isDestinationDetailsEdited.value = !isDestinationDetailsEdited.value;
};

watch(
	() => [currentStep.value, status.value, userStore.editingCartItemId, hasPersistedServiceSelection.value],
	([step, sessionStatus, editingCartItemId, persistedSelection]) => {
		if (step !== 2) return;
		if (sessionStatus === "pending") return;
		if (editingCartItemId) return;
		if (persistedSelection) return;
		if (!userStore.servicesArray.length && !smsEmailNotification.value) return;

		resetServicesState();
	},
	{ immediate: true },
);
const {
	applySavedAddress,
	canSaveDestAddress,
	canSaveOriginAddress,
	clearAddressSelectorsAndPrompts,
	defaultDropdownRef,
	destDefaultDropdownRef,
	destFromSaved,
	destSaveSuccess,
	destSavedSnapshot,
	destSelectorRef,
	destinationAddress,
	loadSavedAddresses,
	loadingSavedAddresses,
	originAddress,
	originFromSaved,
	originSaveSuccess,
	originSavedSnapshot,
	originSelectorRef,
	saveAddressToBook,
	savedAddresses,
	savingDestAddress,
	savingOriginAddress,
	showDestAddressSelector,
	showDestConfigGuestPrompt,
	showDestGuestPrompt,
	showOriginAddressSelector,
	showOriginConfigGuestPrompt,
	showOriginGuestPrompt,
	shouldAutoShowAddressFields,
	toggleAddressSelector,
} = useShipmentStepAddresses({
	userStore,
	session,
	route,
	isAuthenticated,
	sanctumClient,
	deliveryMode,
	submitError,
});

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

const openShipmentAuthModal = (tab = 'login') => {
	openAuthModal({
		redirect: route.fullPath,
		tab,
	});
};

// --- VALIDAZIONE CAMPI (Smart Validation) ---
const contentError = ref(null);
const {
	applyFieldAssist,
	contentFieldHint,
	destCapSuggestions,
	destCitySuggestions,
	destProvinceSuggestions,
	destinationSectionHint,
	fieldClass,
	fieldErrorText,
	focusFormError,
	focusContentDescriptionField,
	focusFirstFormError,
	formErrorSummary,
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
	originSectionHint,
	selectCap,
	selectCity,
	selectProvincia,
	showGlobalFormSummary,
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

const formRef = ref(null);
const focusPickupDateSection = () => {
	nextTick(() => {
		const sectionEl = pickupDateSectionRef.value?.$el || pickupDateSectionRef.value;
		if (sectionEl && typeof sectionEl.scrollIntoView === 'function') {
			sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
		const firstDateInput = document.querySelector('[id^="date-"]');
		if (firstDateInput && typeof firstDateInput.focus === 'function') {
			firstDateInput.focus({ preventScroll: true });
		}
	});
};

const {
	canOpenAddressFields,
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

const stepsRef = ref(null);
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

// Action handlers moved to /riepilogo page

const { endpoint, refresh: refreshCart } = useCart();

// --- MODIFICA DA CARRELLO ---
// Se la URL contiene ?edit=123, carichiamo i dati del pacco dal carrello e pre-compiliamo tutto
const editCartId = route.query.edit ? Number(route.query.edit) : null;
const loadingEditData = ref(!!editCartId);

const loadCartItemForEdit = async () => {
	if (!editCartId) return;
	if (!isAuthenticated.value) {
		loadingEditData.value = false;
		return;
	}
	try {
		const result = await sanctumClient(`/api/cart/${editCartId}`);
		const item = result?.data || result;

		userStore.editingCartItemId = editCartId;

		if (item.origin_address) {
			originAddress.value.full_name = item.origin_address.name || "";
			originAddress.value.address = item.origin_address.address || "";
			originAddress.value.address_number = item.origin_address.address_number || "";
			originAddress.value.city = item.origin_address.city || "";
			originAddress.value.postal_code = item.origin_address.postal_code || "";
			originAddress.value.province = item.origin_address.province || "";
			originAddress.value.telephone_number = item.origin_address.telephone_number || "";
			originAddress.value.email = item.origin_address.email || "";
			originAddress.value.additional_information = item.origin_address.additional_information || "";
			originAddress.value.intercom_code = item.origin_address.intercom_code || "";
		}

		if (item.destination_address) {
			destinationAddress.value.full_name = item.destination_address.name || "";
			destinationAddress.value.address = item.destination_address.address || "";
			destinationAddress.value.address_number = item.destination_address.address_number || "";
			destinationAddress.value.city = item.destination_address.city || "";
			destinationAddress.value.postal_code = item.destination_address.postal_code || "";
			destinationAddress.value.province = item.destination_address.province || "";
			destinationAddress.value.telephone_number = item.destination_address.telephone_number || "";
			destinationAddress.value.email = item.destination_address.email || "";
			destinationAddress.value.additional_information = item.destination_address.additional_information || "";
			destinationAddress.value.intercom_code = item.destination_address.intercom_code || "";
		}

		if (item.services) {
			services.value.date = item.services.date || "";
			services.value.time = item.services.time || "";
			services.value.service_type = item.services.service_type || "";
			userStore.pickupDate = item.services.date || "";

			const serviceTypes = (item.services.service_type || "").split(", ").filter(s => s && s !== "Nessuno");
			userStore.servicesArray = serviceTypes;
			syncSelectedServicesVisual();
		}

		if (item.content_description) {
			userStore.contentDescription = item.content_description;
		}

		if (item.services?.serviceData) {
			userStore.serviceData = { ...item.services.serviceData };
		}

		const priceInEuro = item.single_price ? (Number(item.single_price) / 100) : 0;
		userStore.packages = [{
			package_type: item.package_type || "Pacco",
			quantity: item.quantity || 1,
			weight: item.weight,
			first_size: item.first_size,
			second_size: item.second_size,
			third_size: item.third_size,
			weight_price: item.weight_price,
			volume_price: item.volume_price,
			single_price: priceInEuro,
		}];

		userStore.shipmentDetails = {
			origin_city: item.origin_address?.city || "",
			origin_postal_code: item.origin_address?.postal_code || "",
			destination_city: item.destination_address?.city || "",
			destination_postal_code: item.destination_address?.postal_code || "",
			date: item.services?.date || "",
		};

		showAddressFields.value = true;

	} catch (e) {
	} finally {
		loadingEditData.value = false;
	}
};

onMounted(() => {
	const hasSessionSnapshot = Boolean(session.value?.data?.shipment_details)
		|| (Array.isArray(session.value?.data?.packages) && session.value.data.packages.length > 0);
	const hasLocalSnapshot = Boolean(userStore.pendingShipment)
		|| (Array.isArray(userStore.packages) && userStore.packages.length > 0);

	// Evitiamo un secondo refresh immediato se il middleware o il passaggio dal
	// preventivo hanno gia' riallineato la sessione. Quel doppio fetch era una
	// fonte concreta di repaint e micro-flash nella transizione step 1 -> step 2.
	if (status.value === 'idle' && !quoteTransitionLock.value && !hasSessionSnapshot && !hasLocalSnapshot) {
		refresh().catch(() => {
		});
	}

	if (editCartId && isAuthenticated.value) {
		loadCartItemForEdit();
	} else if (editCartId && !isAuthenticated.value) {
		loadingEditData.value = false;
	}
});

// --- SPEDIZIONI CONFIGURATE (DATI DEFAULT) ---
// Permette di caricare indirizzi da spedizioni precedentemente salvate
const {
	applyConfig,
	loadingConfigs,
	loadSavedConfigs,
	savedConfigs,
	showDefaultDropdown,
	showDefaultDropdownTarget,
	toggleAddressSelectorWithDefaultClose,
} = useShipmentStepSavedConfigs({
	clearAddressSelectorsAndPrompts,
	defaultDropdownRef,
	destDefaultDropdownRef,
	destFromSaved,
	destSaveSuccess,
	destSavedSnapshot,
	destSelectorRef,
	destinationAddress,
	deliveryMode,
	isAuthenticated,
	originAddress,
	originFromSaved,
	originSaveSuccess,
	originSavedSnapshot,
	originSelectorRef,
	sanctumClient,
	showDestConfigGuestPrompt,
	showOriginConfigGuestPrompt,
	toggleAddressSelector,
});
const uiFeedback = useUiFeedback();

const {
	continueToCart: persistAndContinueToCart,
	isSubmitting,
} = useShipmentStepSubmit({
	destinationAddress,
	editablePackages,
	editCartId,
	focusFirstFormError,
	focusPickupDateSection,
	formRef,
	normalizeLocationText,
	originAddress,
	persistSecondStep: (payload) => persistShipmentFlowState({ includeAddresses: true, payload }),
	routeConsistencyState,
	smsEmailNotification,
	services,
	submitError,
	uiFeedback,
	userStore,
	validateForm,
});

const continueToCart = async () => {
	if (!validateInlineServiceDetails()) {
		return;
	}

	await persistAndContinueToCart();
};

</script>

<template>
	<section>
		<div class="my-container shipment-step-shell mt-[48px] tablet:mt-[72px] mb-[96px] tablet:mb-[120px]">
			<div v-if="showInitialStepLoading" class="min-h-[560px] bg-[#E4E4E4] rounded-[16px] animate-pulse"></div>
			<form v-else ref="formRef" @submit.prevent="continueToCart">
				<div ref="stepsRef" class="mb-[16px] tablet:mb-[18px]">
					<Steps :current-step="currentShipmentStep - 1" />
				</div>

				<div>
					<!-- Summary Box Collapsabile STICKY -->
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

					<div
						class="services-stage-block sf-stack-section"
						:class="{ 'is-collapsed-on-mobile': showAddressFields }">

						<!-- Pickup Date -->
						<ShipmentStepPickupDate
							ref="pickupDateSectionRef"
							:date-error="dateError"
							:days-in-month="daysInMonth"
							:services="services"
							@choose-date="chooseDate" />

						<!-- Services Grid -->
						<ShipmentStepServicesGrid
							:featured-service="featuredService"
							:regular-services="regularServices"
							:service-data="serviceData"
							:service-card-errors="serviceCardErrors"
							:is-service-expanded="isServiceExpanded"
							:is-service-selected="isServiceSelected"
							:can-configure-service="canConfigureService"
							:should-show-service-toggle="shouldShowServiceToggle"
							:should-show-configure-button="shouldShowConfigureButton"
							:can-activate-configured-service="canActivateConfiguredService"
							:get-service-state-label="getServiceStateLabel"
							:get-service-configure-label="getServiceConfigureLabel"
							:contrassegno-incasso-options="contrassegnoIncassoOptions"
							:contrassegno-rimborso-options="contrassegnoRimborsoOptions"
							:requires-contrassegno-dettaglio="requiresContrassegnoDettaglio"
							:insurance-packages="insurancePackages"
							:normalize-currency-input="normalizeCurrencyInput"
							:service-icon-filter-idle="SERVICE_ICON_FILTER_IDLE"
							:service-icon-filter-active="SERVICE_ICON_FILTER_ACTIVE"
							:content-description="userStore.contentDescription"
							:content-error="contentError"
							:content-field-hint="contentFieldHint"
							:sms-email-notification="smsEmailNotification"
							:notification-price-label="notificationPriceLabel"
							@toggle-featured-service="toggleFeaturedService"
							@toggle-regular-service="toggleRegularService"
							@handle-service-primary-action="handleServicePrimaryAction"
							@activate-configured-service="activateConfiguredService"
							@update:content-description="userStore.contentDescription = $event"
							@update:content-error="contentError = $event"
							@update:sms-email-notification="smsEmailNotification = $event" />
					</div>

					<!-- Address Section -->
					<ShipmentStepAddressSection
						v-if="showAddressFields"
						:origin-address="originAddress"
						:destination-address="destinationAddress"
						:delivery-mode="deliveryMode"
						:show-global-form-summary="showGlobalFormSummary"
						:form-error-summary="formErrorSummary"
						:origin-section-hint="originSectionHint"
						:destination-section-hint="destinationSectionHint"
						:route-warning-message="routeWarningMessage"
						:field-class="fieldClass"
						:get-field-error="getFieldError"
						:field-error-text="fieldErrorText"
						:get-field-assist="getFieldAssist"
						:apply-field-assist="applyFieldAssist"
						:smart-blur="smartBlur"
						:on-name-input="onNameInput"
						:on-city-input="onCityInput"
						:on-city-focus="onCityFocus"
						:on-provincia-input="onProvinciaInput"
						:on-province-focus="onProvinceFocus"
						:on-cap-input="onCapInput"
						:on-cap-focus="onCapFocus"
						:on-telefono-input="onTelefonoInput"
						:select-city="selectCity"
						:select-provincia="selectProvincia"
						:select-cap="selectCap"
						:format-city-suggestion-label="formatCitySuggestionLabel"
						:format-cap-suggestion-label="formatCapSuggestionLabel"
						:sv="sv"
						:origin-city-suggestions="originCitySuggestions"
						:origin-province-suggestions="originProvinceSuggestions"
						:origin-cap-suggestions="originCapSuggestions"
						:dest-city-suggestions="destCitySuggestions"
						:dest-province-suggestions="destProvinceSuggestions"
						:dest-cap-suggestions="destCapSuggestions"
						:can-save-origin-address="canSaveOriginAddress"
						:can-save-dest-address="canSaveDestAddress"
						:saving-origin-address="savingOriginAddress"
						:saving-dest-address="savingDestAddress"
						:origin-save-success="originSaveSuccess"
						:dest-save-success="destSaveSuccess"
						:saved-addresses="savedAddresses"
						:loading-saved-addresses="loadingSavedAddresses"
						:show-origin-address-selector="showOriginAddressSelector"
						:show-dest-address-selector="showDestAddressSelector"
						:show-origin-guest-prompt="showOriginGuestPrompt"
						:show-dest-guest-prompt="showDestGuestPrompt"
						:saved-configs="savedConfigs"
						:loading-configs="loadingConfigs"
						:show-default-dropdown="showDefaultDropdown"
						:show-default-dropdown-target="showDefaultDropdownTarget"
						:show-origin-config-guest-prompt="showOriginConfigGuestPrompt"
						:show-dest-config-guest-prompt="showDestConfigGuestPrompt"
						:is-authenticated="isAuthenticated"
						:selected-pudo="userStore.selectedPudo"
						v-model:default-dropdown-ref="defaultDropdownRef"
						v-model:dest-default-dropdown-ref="destDefaultDropdownRef"
						v-model:origin-selector-ref="originSelectorRef"
						v-model:dest-selector-ref="destSelectorRef"
						@update:delivery-mode="(v) => deliveryMode = v"
						@save-address="saveAddressToBook"
						@load-saved-configs="loadSavedConfigs"
						@apply-config="applyConfig"
						@toggle-address-selector="toggleAddressSelectorWithDefaultClose"
						@apply-saved-address="applySavedAddress"
						@focus-form-error="focusFormError"
						@open-auth-modal="openShipmentAuthModal"
						@pudo-selected="onPudoSelected"
						@pudo-deselected="onPudoDeselected" />

					<!-- Navigation -->
					<ShipmentStepNavigation
						:show-address-fields="showAddressFields"
						:can-open-address-fields="canOpenAddressFields"
						:is-submitting="isSubmitting"
						:edit-cart-id="editCartId"
						:summary-total-price="summaryTotalPrice"
						:submit-error="submitError"
						:soften-error-message="softenErrorMessage"
						@go-back-to-services="goBackToServices"
						@open-address-fields="openAddressFields" />
				</div>
			</form>
		</div>
	</section>
</template>
