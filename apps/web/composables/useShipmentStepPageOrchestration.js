// Canonical shipment-flow entrypoint.
//
// Questo file espone:
// - useShipmentStepPageOrchestration: orchestrazione UI del ventaglio
// - re-export canoniche dei sub-boundary shipment-flow
//
// I subcomposable del funnel vivono in `features/shipment-flow/` per
// mantenere l'API pubblica stabile e ridurre il monolite storico.

import { computed, onMounted, watch } from 'vue';
import { buildSecondStepPayload, normalizeShipmentPayloadForComparison } from '~/utils/shipment';
import {
	collectSelectedServiceItems,
	formatAddressAccordionSummary,
	formatColloLabel,
	formatConfirmationContact,
	formatPackageAccordionSummary,
	formatPaymentDeliveryLabel,
	formatPaymentMethodLabel,
	formatPaymentSummaryServicesLabel,
	formatPickupDate,
	formatSelectedServiceSummary,
	formatServicesAccordionSummary,
	formatTrattaLabel,
	getShipmentFlowHeroDescription,
	getShipmentFlowHeroTitle,
	getVisiblePackageItems,
} from '~/features/shipment-flow/presentation';

const isThrottleLikeFunnelError = (message) =>
	typeof message === 'string' && /throttl|rate[ -]?limit|troppo (rapido|veloce|frequente)/i.test(message);
const stripFunnelThrottleMessage = (message) => (isThrottleLikeFunnelError(message) ? '' : message);

export const resolveFunnelErrorMessage = (error, fallback) => {
	const raw = error?.data?.message || error?.message || '';
	return typeof raw === 'string' && raw.trim() ? raw : fallback;
};

const resolvePaymentEntryErrorMessage = (err, fallback) => {
	const raw = err?.data?.message || err?.message || '';
	return typeof raw === 'string' && raw.trim() ? raw : fallback;
};

// Differenzia messaggi per stato HTTP così l'utente sa cosa fare invece di vedere un generico "Riprova".
const buildPaymentEntryUserError = (err, fallback) => {
	const status = Number(err?.response?.status || err?.status || err?.statusCode || 0);
	if (status === 422) {
		const errors = err?.data?.errors || err?.response?._data?.errors;
		if (errors && typeof errors === 'object') {
			const firstField = Object.values(errors)[0];
			const firstMsg = Array.isArray(firstField) ? firstField[0] : firstField;
			if (firstMsg) return { kind: 'validation', message: String(firstMsg) };
		}
		return { kind: 'validation', message: resolvePaymentEntryErrorMessage(err, 'Dati non validi. Controlla i campi e riprova.') };
	}
	if (status === 401 || status === 419) {
		return { kind: 'auth', message: 'Sessione scaduta. Effettua di nuovo l\'accesso per continuare.' };
	}
	if (status >= 500) {
		return { kind: 'server', message: 'Errore temporaneo del server. Riprova tra qualche secondo.' };
	}
	return { kind: 'generic', message: resolvePaymentEntryErrorMessage(err, fallback) };
};

// Boundary dedicato al passaggio "draft spedizione -> checkout pagabile".
//
// Possiede:
// - sync route verso step=pagamento + order_id
// - bootstrap auth prima della creazione ordine
// - creazione/riuso client_submission_id su pendingShipment
// - apertura/inizializzazione della sezione pagamento
//
// Non possiede:
// - validazione cross-step del funnel
// - rendering accordion
// - logica Stripe o submit finale del pagamento
function useShipmentStepPaymentEntry(deps) {
	const route = useRoute();
	const router = useRouter();

	const {
		shipmentFlowStore,
		sanctumClient,
		uiFeedback,
		funnelAnalytics,
		isAuthenticated,
		showAddressFields,
		submitError,
		paymentBootstrapError,
		paymentBootstrapPending,
		paymentSummaryExpanded,
		isProceedingToPayment,
		paymentStageRef,
		scrollAccordionStageIntoView,
		openPaymentStage,
		existingOrderId,
		editCartId,
		paymentSuccess,
		checkoutPageReady,
		initCheckoutPage,
		initStripe,
		loadPriceBands,
		autoApplyReferral,
		openShipmentAuthModal,
		buildCurrentShipmentPayload,
		openAddressAccordion,
	} = deps;

	const resolveRouteOrderId = () => {
		const raw = Array.isArray(route.query.order_id) ? route.query.order_id[0] : route.query.order_id;
		return raw === undefined || raw === null || raw === '' ? null : String(raw);
	};

	const syncPaymentRouteContext = async (orderId = null) => {
		const nextQuery = { ...route.query, step: 'pagamento' };
		if (orderId) nextQuery.order_id = String(orderId);
		else delete nextQuery.order_id;
		const currentStep = Array.isArray(route.query.step) ? route.query.step[0] : route.query.step;
		const currentOrderId = resolveRouteOrderId();
		if ((currentStep || '') === 'pagamento' && (currentOrderId || '') === (orderId ? String(orderId) : '')) return;
		await router.replace({ path: route.path, query: nextQuery, hash: route.hash });
	};

	const clearPaymentRouteContext = async () => {
		const nextQuery = { ...route.query };
		delete nextQuery.order_id;
		checkoutPageReady.value = false;
		paymentBootstrapError.value = '';
		paymentSummaryExpanded.value = false;
		await router.replace({ path: route.path, query: nextQuery, hash: route.hash });
	};

	const ensureOrderCreationAuthContext = async () => {
		if (!import.meta.client) return Boolean(isAuthenticated.value);

		const { isAuthenticated: sanctumAuthenticated, refreshIdentity } = useSanctumAuth();
		const { authCookie } = useAuthUiSnapshotPersistence();
		const hasUiSnapshot = Boolean(authCookie.value?.authenticated);

		if (!sanctumAuthenticated.value) {
			await runAuthBootstrap({ force: hasUiSnapshot });
		}

		if (!sanctumAuthenticated.value) {
			const synced = await waitForPostAuthSync(refreshIdentity);
			if (!synced || !sanctumAuthenticated.value) {
				return false;
			}
		}

		try {
			await $fetch('/sanctum/csrf-cookie', {
				method: 'GET',
				credentials: 'include',
			});
		} catch {
			// Se il refresh CSRF fallisce lasciamo comunque proseguire:
			// l'errore reale verra' restituito dalla POST/PUT successiva.
		}

		return true;
	};

	const initializePaymentSection = async () => {
		if (paymentBootstrapPending.value) return Boolean(checkoutPageReady.value);
		if (!isAuthenticated.value) return false;
		paymentBootstrapPending.value = true;
		paymentBootstrapError.value = '';
		try {
			checkoutPageReady.value = await initCheckoutPage();
			if (!checkoutPageReady.value) return false;
			loadPriceBands();
			autoApplyReferral();
			await initStripe();
			return true;
		} catch (error) {
			checkoutPageReady.value = false;
			paymentBootstrapError.value = resolvePaymentEntryErrorMessage(error, 'Non siamo riusciti a preparare il pagamento.');
			return false;
		} finally {
			paymentBootstrapPending.value = false;
		}
	};

	const proceedToPaymentFromConfirm = async () => {
		if (isProceedingToPayment.value) return;
		if (!isAuthenticated.value) {
			try { await openPaymentStage(); } catch { /* noop */ }
			await syncPaymentRouteContext(null);
			openShipmentAuthModal('login');
			return;
		}
		isProceedingToPayment.value = true;
		submitError.value = null;
		try {
			const authContextReady = await ensureOrderCreationAuthContext();
			if (!authContextReady) {
				try { await openPaymentStage(); } catch { /* noop */ }
				await syncPaymentRouteContext(null);
				openShipmentAuthModal('login');
				return;
			}

			const payload = buildCurrentShipmentPayload();
			const previousPayload = shipmentFlowStore?.pendingShipment || null;
			const samePayloadAsPrevious =
				normalizeShipmentPayloadForComparison(previousPayload) === normalizeShipmentPayloadForComparison(payload);
			const clientSubmissionId = samePayloadAsPrevious && previousPayload?.client_submission_id
				? previousPayload.client_submission_id
				: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
			const payloadWithSubmission = { ...payload, client_submission_id: clientSubmissionId };
			shipmentFlowStore.pendingShipment = payloadWithSubmission;

			if (editCartId) {
				await sanctumClient(`/api/cart/${editCartId}`, { method: 'PUT', body: payloadWithSubmission });
				shipmentFlowStore.editingCartItemId = editCartId;
				uiFeedback.success('Indirizzi salvati', 'Apro il pagamento nello stesso ventaglio...', { timeout: 1800 });
				await openPaymentAccordion();
				return;
			}

			const result = await sanctumClient('/api/create-direct-order', {
				method: 'POST',
				body: payloadWithSubmission,
			});

			const orderId = result?.order_id || result?.data?.order_id;
			const canonicalSubmissionId =
				result?.client_submission_id
				|| result?.data?.client_submission_id
				|| null;
			if (canonicalSubmissionId && shipmentFlowStore?.pendingShipment) {
				shipmentFlowStore.pendingShipment = {
					...shipmentFlowStore?.pendingShipment,
					client_submission_id: canonicalSubmissionId,
				};
			}
			const amountCents = Number(result?.amount_cents || result?.data?.amount_cents || 0);
			funnelAnalytics.trackPaymentInit(amountCents);
			uiFeedback.success('Ordine creato', 'Apro il pagamento nello stesso ventaglio...', { timeout: 1800 });
			await openPaymentAccordion(orderId || null);
		} catch (error) {
			const userError = buildPaymentEntryUserError(error, 'Errore durante l\'apertura del pagamento. Riprova.');
			submitError.value = userError.message;
			// 401/419: sessione persa lato server, riapri overlay login per continuare senza perdere il contesto.
			if (userError.kind === 'auth') {
				try { await openPaymentStage(); } catch { /* noop */ }
				await syncPaymentRouteContext(null);
				openShipmentAuthModal('login');
			}
		} finally {
			isProceedingToPayment.value = false;
		}
	};

	const openPaymentAccordion = async (orderId = null) => {
		if (!showAddressFields.value) { await openAddressAccordion(); return; }
		const resolvedOrderId = orderId || resolveRouteOrderId() || existingOrderId.value || null;
		if (!isAuthenticated.value) {
			await syncPaymentRouteContext(resolvedOrderId);
			openShipmentAuthModal('login');
			return;
		}
		if (!resolvedOrderId && !editCartId) { await proceedToPaymentFromConfirm(); return; }
		paymentSummaryExpanded.value = false;
		await syncPaymentRouteContext(resolvedOrderId);
		if (await openPaymentStage() === false) return;
		if (await initializePaymentSection() === false) return;
		scrollAccordionStageIntoView(paymentStageRef, '[data-accordion-trigger="payment"]');
	};

	const ensurePaymentStageReady = async () => {
		if (!isAuthenticated.value) return;
		if (paymentBootstrapPending.value || checkoutPageReady.value || paymentSuccess.value || isProceedingToPayment.value) return;
		const resolvedOrderId = resolveRouteOrderId() || existingOrderId.value || null;
		if (!resolvedOrderId && !editCartId) {
			if (!shipmentFlowStore?.pendingShipment) return;
			await proceedToPaymentFromConfirm();
			return;
		}
		await initializePaymentSection();
	};

	return {
		clearPaymentRouteContext,
		openPaymentAccordion,
		proceedToPaymentFromConfirm,
		ensurePaymentStageReady,
	};
}

export function useShipmentStepPageOrchestration(deps) {
	const route = useRoute();
	const shipmentFlowStore = useShipmentFlowStore();
	const sanctumClient = useSanctumClient();
	const uiFeedback = useUiFeedback();
	const funnelAnalytics = useFunnelAnalytics();

	const {
		isAuthenticated,
		openAuthModal,
		isBusinessProfile,
		activeAccordionStep,
		showAddressFields,
		deliveryMode,
		submitError,
		dateError,
		contentError,
		paymentBootstrapError,
		paymentBootstrapPending,
		paymentSummaryExpanded,
		isProceedingToPayment,
		packagesStageRef,
		servicesStageRef,
		addressStageRef,
		paymentStageRef,
		scrollAccordionStageIntoView,
		openPackagesStage,
		openPaymentStage,
		goBackToServices,
		goBackToAddresses,
		openAddressFields,
		validatePackagesStep,
		validateInlineServiceDetails,
		focusFirstInvalidServiceField,
		clearServiceCardErrors,
		expandedServiceKey,
		editablePackages,
		addPackageInline,
		ensurePackagesIdentity,
		loadQuickQuotePriceBands,
		initOnMounted,
		session,
		services,
		smsEmailNotification,
		featuredService,
		regularServices,
		notificationPriceLabel,
		addressReadinessItems,
		summaryOriginCity,
		summaryDestinationCity,
		summaryTotalPrice,
		summaryPackageLabel,
		summaryDimensionsLabel,
		originAddress,
		destinationAddress,
		existingOrderId,
		editCartId,
		paymentSuccess,
		paymentError,
		paymentMethod,
		checkoutPageReady,
		initCheckoutPage,
		initStripe,
		loadPriceBands,
		autoApplyReferral,
	} = deps;

	const visiblePaymentError = computed(() => stripFunnelThrottleMessage(paymentError.value));
	watch(
		() => paymentError.value,
		(value) => {
			if (value && isThrottleLikeFunnelError(value)) paymentError.value = '';
		},
		{ flush: 'sync' },
	);

	const canAdvanceFromAddresses = computed(() => addressReadinessItems.value.every((item) => item.done));
	const isPackagesAccordionOpen = computed(() => activeAccordionStep.value === 'packages');
	const isServicesAccordionOpen = computed(() => activeAccordionStep.value === 'services');
	const isAddressAccordionOpen = computed(() => activeAccordionStep.value === 'addresses');
	const isPaymentAccordionOpen = computed(() => activeAccordionStep.value === 'payment');

	const quoteHeroTitle = computed(() => getShipmentFlowHeroTitle());
	const quoteHeroDescription = computed(() => getShipmentFlowHeroDescription());

	const resolvedContentDescription = computed(() =>
		String(shipmentFlowStore?.contentDescription || session.value?.data?.content_description || '').trim(),
	);

	const packageItems = computed(() =>
		getVisiblePackageItems({
			editablePackages: editablePackages.value,
			sessionPackages: session.value?.data?.packages,
		}),
	);
	const colloLabel = computed(() => formatColloLabel(packageItems.value));
	const trattaLabel = computed(() => formatTrattaLabel(summaryOriginCity.value, summaryDestinationCity.value));
	const packageAccordionSummary = computed(() => formatPackageAccordionSummary(summaryPackageLabel.value, summaryDimensionsLabel.value));

	const selectedServiceItems = computed(() =>
		collectSelectedServiceItems({
			featuredService: featuredService.value,
			regularServices: regularServices.value,
			smsEmailNotification: smsEmailNotification.value,
			notificationPriceLabel: notificationPriceLabel.value,
		}),
	);
	const selectedServiceSummary = computed(() => formatSelectedServiceSummary(selectedServiceItems.value));
	const servicesAccordionSummary = computed(() =>
		formatServicesAccordionSummary({
			pickupDate: services.value?.date,
			selectedServiceSummary: selectedServiceSummary.value,
			resolvedContentDescription: resolvedContentDescription.value,
		}),
	);
	const addressAccordionSummary = computed(() =>
		formatAddressAccordionSummary({
			deliveryMode: deliveryMode.value,
			summaryOriginCity: summaryOriginCity.value,
			summaryDestinationCity: summaryDestinationCity.value,
			pudoName: String(shipmentFlowStore?.selectedPudo?.name || '').trim(),
		}),
	);

	const confirmationPickupDate = computed(() => formatPickupDate(services.value?.date || session.value?.data?.pickup_date));
	const confirmationOriginContact = computed(() => formatConfirmationContact(originAddress.value?.full_name, 'Mittente da completare'));
	const confirmationDestinationContact = computed(() => {
		if (deliveryMode.value === 'pudo') {
			return formatConfirmationContact(shipmentFlowStore?.selectedPudo?.name, 'Punto BRT da selezionare');
		}
		return formatConfirmationContact(destinationAddress.value?.full_name, 'Destinatario da completare');
	});
	const paymentSummaryServicesLabel = computed(() => formatPaymentSummaryServicesLabel(selectedServiceItems.value));
	const paymentMethodLabel = computed(() => formatPaymentMethodLabel(paymentMethod.value));
	const paymentDeliveryLabel = computed(() => formatPaymentDeliveryLabel(deliveryMode.value));

	const openShipmentAuthModal = (tab = 'login') => openAuthModal({ redirect: route.fullPath, tab });

	const openPackagesAccordion = async () => {
		if (isPaymentAccordionOpen.value) await clearPaymentRouteContext();
		submitError.value = null;
		await openPackagesStage();
		scrollAccordionStageIntoView(packagesStageRef, '[data-accordion-trigger="packages"]');
	};

	const openServicesAccordion = async () => {
		if (isPaymentAccordionOpen.value) await clearPaymentRouteContext();
		if (isPackagesAccordionOpen.value) {
			submitError.value = null;
			if (!validatePackagesStep()) return;
		}
		if ((await goBackToServices()) === false) return;
		scrollAccordionStageIntoView(servicesStageRef, '[data-accordion-trigger="services"]');
	};

	const openAddressAccordion = async () => {
		if (isPaymentAccordionOpen.value) {
			await clearPaymentRouteContext();
			await goBackToAddresses();
			scrollAccordionStageIntoView(addressStageRef, '[data-accordion-trigger="addresses"]');
			return;
		}
		submitError.value = null;
		dateError.value = null;
		contentError.value = null;
		clearServiceCardErrors();
		if (!validateInlineServiceDetails()) {
			focusFirstInvalidServiceField();
			return;
		}
		expandedServiceKey.value = '';
		if ((await openAddressFields()) === false) return;
		scrollAccordionStageIntoView(addressStageRef);
	};

	const collapseAddressAccordion = () => openServicesAccordion();

	const buildCurrentShipmentPayload = () => ({
		...buildSecondStepPayload({
			shipmentFlowStore,
			services,
			smsEmailNotification,
			originAddress,
			destinationAddress,
			includeAddresses: true,
		}),
		packages: editablePackages.value,
	});

	const { clearPaymentRouteContext, openPaymentAccordion, proceedToPaymentFromConfirm, ensurePaymentStageReady } =
		useShipmentStepPaymentEntry({
			shipmentFlowStore,
			sanctumClient,
			uiFeedback,
			funnelAnalytics,
			isAuthenticated,
			showAddressFields,
			submitError,
			paymentBootstrapError,
			paymentBootstrapPending,
			paymentSummaryExpanded,
			isProceedingToPayment,
			paymentStageRef,
			scrollAccordionStageIntoView,
			openPaymentStage,
			existingOrderId,
			editCartId,
			paymentSuccess,
			checkoutPageReady,
			initCheckoutPage,
			initStripe,
			loadPriceBands,
			autoApplyReferral,
			openShipmentAuthModal,
			buildCurrentShipmentPayload,
			openAddressAccordion,
		});

	watch(
		() => activeAccordionStep.value,
		async (step) => {
			if (step === 'payment') await ensurePaymentStageReady();
		},
		{ flush: 'post', immediate: true },
	);

	watch(
		() => isAuthenticated.value,
		async (auth) => {
			if (auth && activeAccordionStep.value === 'payment') await ensurePaymentStageReady();
		},
		{ flush: 'post', immediate: true },
	);

	onMounted(async () => {
		// Non bloccare il restore iniziale del funnel su una fetch non critica:
		// i listini possono arrivare in background, mentre edit/resume e shell
		// devono stabilizzarsi subito per ridurre loader e jump iniziali.
		loadQuickQuotePriceBands().catch(() => {});
		ensurePackagesIdentity();
		await initOnMounted();
		if (activeAccordionStep.value === 'payment') {
			await ensurePaymentStageReady();
		}
		if (!Array.isArray(shipmentFlowStore?.packages) || shipmentFlowStore.packages.length === 0) {
			addPackageInline();
			ensurePackagesIdentity();
		}
		try {
			const quoteType = isBusinessProfile.value ? 'business' : deliveryMode.value === 'pudo' ? 'pudo' : 'privato';
			funnelAnalytics.trackPreventivoStart(quoteType);
		} catch {
			// no-op
		}
	});

	return {
		packageAccordionSummary,
		servicesAccordionSummary,
		addressAccordionSummary,
		resolvedContentDescription,
		colloLabel,
		trattaLabel,
		confirmationPickupDate,
		confirmationOriginContact,
		confirmationDestinationContact,
		paymentSummaryServicesLabel,
		paymentMethodLabel,
		paymentDeliveryLabel,
		isPackagesAccordionOpen,
		isServicesAccordionOpen,
		isAddressAccordionOpen,
		isPaymentAccordionOpen,
		canAdvanceFromAddresses,
		quoteHeroTitle,
		quoteHeroDescription,
		visiblePaymentError,
		openPackagesAccordion,
		openServicesAccordion,
		openAddressAccordion,
		collapseAddressAccordion,
		openPaymentAccordion,
		proceedToPaymentFromConfirm,
		openShipmentAuthModal,
	};
}

export { useShipmentStepSessionPersistence } from '~/features/shipment-flow/sessionPersistence';
export { useShipmentStepFlow } from '~/features/shipment-flow/flow';
export { useShipmentStepSubmit } from '~/features/shipment-flow/submit';
export { useShipmentStepPageState } from '~/features/shipment-flow/pageState';
export { useShipmentStepCartEdit } from '~/features/shipment-flow/cartEdit';
export { useShipmentStepValidation } from '~/features/shipment-flow/validation';
