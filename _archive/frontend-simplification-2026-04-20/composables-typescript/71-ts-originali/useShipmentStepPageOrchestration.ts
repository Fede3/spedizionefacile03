// useShipmentStepPageOrchestration — summary/label computed, accordion open/close,
// proceedToPaymentFromConfirm.

import { computed, onMounted, watch } from 'vue';
import { buildSecondStepPayload } from '~/composables/useShipmentStepSessionPersistence';

const isThrottleLikeFunnelError = (msg) => typeof msg === 'string' && /throttl|rate[ -]?limit|troppo (rapido|veloce|frequente)/i.test(msg);
const stripFunnelThrottleMessage = (msg) => (isThrottleLikeFunnelError(msg) ? '' : msg);
const resolveFunnelErrorMessage = (err, fallback) => {
	const raw = err?.data?.message || err?.message || '';
	return typeof raw === 'string' && raw.trim() ? raw : fallback;
};

export function useShipmentStepPageOrchestration(deps) {
	const route = useRoute();
	const router = useRouter();
	const shipmentFlowStore = useShipmentFlowStore();
	const sanctumClient = useSanctumClient();
	const uiFeedback = useUiFeedback();
	const funnelAnalytics = useFunnelAnalytics();
	const ecommerceAnalytics = useEcommerceAnalytics();

	const {
		isAuthenticated, openAuthModal, isBusinessProfile,
		activeAccordionStep, showAddressFields, deliveryMode,
		submitError, dateError, contentError, paymentBootstrapError, paymentBootstrapPending,
		paymentSummaryExpanded, isProceedingToPayment,
		packagesStageRef, servicesStageRef, addressStageRef, paymentStageRef,
		scrollAccordionStageIntoView,
		openPackagesStage, openPaymentStage, goBackToServices, goBackToAddresses,
		openAddressFields,
		validatePackagesStep, validateInlineServiceDetails, focusFirstInvalidServiceField,
		clearServiceCardErrors, expandedServiceKey,
		editablePackages, addPackageInline, ensurePackagesIdentity,
		loadQuickQuotePriceBands, initOnMounted,
		session, services, smsEmailNotification, featuredService, regularServices,
		notificationPriceLabel, addressReadinessItems,
		summaryOriginCity, summaryDestinationCity, summaryTotalPrice,
		summaryPackageLabel, summaryDimensionsLabel,
		originAddress, destinationAddress,
		existingOrderId, editCartId, paymentSuccess, paymentError,
		paymentMethod, checkoutPageReady,
		initCheckoutPage, initStripe, loadPriceBands, autoApplyReferral,
	} = deps;

	/* Error visibility */
	const visiblePaymentError = computed(() => stripFunnelThrottleMessage(paymentError.value));
	watch(
		() => paymentError.value,
		(value) => { if (value && isThrottleLikeFunnelError(value)) paymentError.value = ''; },
		{ flush: 'sync' },
	);

	/* Accordion state derivatives */
	const canAdvanceFromAddresses = computed(() => addressReadinessItems.value.every((item) => item.done));
	const isPackagesAccordionOpen = computed(() => activeAccordionStep.value === 'packages');
	const isServicesAccordionOpen = computed(() => activeAccordionStep.value === 'services');
	const isAddressAccordionOpen = computed(() => activeAccordionStep.value === 'addresses');
	const isPaymentAccordionOpen = computed(() => activeAccordionStep.value === 'payment');

	/* Hero copy */
	const quoteHeroTitle = computed(() => 'Preventivo');
	const quoteHeroDescription = computed(() =>
		'Colli, servizi, indirizzi e pagamento restano nello stesso flusso, con passaggi chiari e modificabili senza perdere il contesto.',
	);

	/* Display/summary computed */
	const resolvedContentDescription = computed(() =>
		String(shipmentFlowStore.contentDescription || session.value?.data?.content_description || '').trim(),
	);

	const packageItems = computed(() => {
		if (editablePackages.value?.length > 0) return editablePackages.value;
		const sp = session.value?.data?.packages;
		return Array.isArray(sp) && sp.length > 0 ? sp : [];
	});
	const colloLabel = computed(() => {
		const c = packageItems.value.length || 1;
		return `${c} coll${c === 1 ? 'o' : 'i'}`;
	});
	const trattaLabel = computed(() => `${summaryOriginCity.value || 'Da definire'} -> ${summaryDestinationCity.value || 'Da definire'}`);

	const packageAccordionSummary = computed(() => {
		const parts = [summaryPackageLabel.value, summaryDimensionsLabel.value].filter(Boolean);
		return parts.length ? parts.join(' · ') : 'Tipo, quantità e misure';
	});

	const selectedServiceSummary = computed(() => {
		const labels = [];
		if (featuredService.value?.isSelected && featuredService.value?.name) labels.push(String(featuredService.value.name).trim());
		for (const s of regularServices.value || []) if (s?.isSelected && s?.name) labels.push(String(s.name).trim());
		if (smsEmailNotification.value) labels.push('Notifiche');
		const normalized = [...new Set(labels.filter(Boolean))];
		if (!normalized.length) return '';
		const visible = normalized.slice(0, 2);
		const remaining = normalized.length - visible.length;
		return remaining > 0 ? `${visible.join(', ')} +${remaining}` : visible.join(', ');
	});

	const servicesAccordionSummary = computed(() => {
		const parts = [];
		if (services.value?.date) parts.push(`Ritiro ${services.value.date}`);
		if (selectedServiceSummary.value) parts.push(selectedServiceSummary.value);
		if (!parts.length && resolvedContentDescription.value) parts.push('Contenuto inserito');
		return parts.length ? parts.slice(0, 2).join(' · ') : 'Ritiro, extra e contenuto';
	});

	const addressAccordionSummary = computed(() => {
		if (deliveryMode.value === 'pudo') {
			const pudoName = String(shipmentFlowStore.selectedPudo?.name || '').trim();
			if (summaryOriginCity.value && pudoName) return `${summaryOriginCity.value} · ${pudoName}`;
			if (summaryOriginCity.value) return `${summaryOriginCity.value} · Punto BRT`;
			return 'Mittente e punto BRT';
		}
		if (summaryOriginCity.value && summaryDestinationCity.value) return `${summaryOriginCity.value} -> ${summaryDestinationCity.value}`;
		if (summaryOriginCity.value) return `${summaryOriginCity.value} · Destinazione da completare`;
		return 'Mittente e destinatario';
	});

	/* Payment step summary labels */
	const selectedServicesForSummary = computed(() => {
		const items = [];
		if (featuredService.value?.isSelected) items.push({ label: featuredService.value.name || 'Senza Etichetta', price: featuredService.value.price || '' });
		for (const s of regularServices.value || []) if (s?.isSelected) items.push({ label: s.name || '', price: s.price || '' });
		if (smsEmailNotification.value) items.push({ label: 'Notifiche SMS', price: notificationPriceLabel.value || '' });
		return items;
	});

	const confirmationPickupDate = computed(() => String(services.value?.date || session.value?.data?.pickup_date || '').trim() || 'Da definire');
	const confirmationOriginContact = computed(() => String(originAddress.value?.full_name || '').trim() || 'Mittente da completare');
	const confirmationDestinationContact = computed(() => {
		if (deliveryMode.value === 'pudo') return String(shipmentFlowStore.selectedPudo?.name || '').trim() || 'Punto BRT da selezionare';
		return String(destinationAddress.value?.full_name || '').trim() || 'Destinatario da completare';
	});
	const paymentSummaryServicesLabel = computed(() => {
		const list = selectedServicesForSummary.value.length ? selectedServicesForSummary.value : [{ label: 'Nessun extra selezionato', price: '' }];
		const labels = list.map((s) => String(s?.label || '').trim()).filter(Boolean);
		if (!labels.length) return 'Nessun extra selezionato';
		if (labels.length <= 2) return labels.join(' · ');
		return `${labels.slice(0, 2).join(' · ')} +${labels.length - 2}`;
	});
	const paymentMethodLabel = computed(() =>
		paymentMethod.value === 'bonifico' ? 'Bonifico' : paymentMethod.value === 'wallet' ? 'Wallet' : 'Carta',
	);
	const paymentDeliveryLabel = computed(() => deliveryMode.value === 'pudo' ? 'Consegna in Punto BRT' : 'Consegna a domicilio');

	/* Route helpers (payment) */
	const openShipmentAuthModal = (tab = 'login') => openAuthModal({ redirect: route.fullPath, tab });

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

	/* Payment bootstrap (stripe/checkout) */
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
			paymentBootstrapError.value = resolveFunnelErrorMessage(error, 'Non siamo riusciti a preparare il pagamento.');
			return false;
		} finally {
			paymentBootstrapPending.value = false;
		}
	};

	/* Accordion open/close orchestrators */
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
		if (await goBackToServices() === false) return;
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
		if (await openAddressFields() === false) return;
		scrollAccordionStageIntoView(addressStageRef);
	};

	const collapseAddressAccordion = () => openServicesAccordion();

	const buildCurrentShipmentPayload = () => ({
		...buildSecondStepPayload({
			shipmentFlowStore, services, smsEmailNotification, originAddress, destinationAddress,
			includeAddresses: true,
		}),
		packages: editablePackages.value,
	});

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
			const payload = shipmentFlowStore.pendingShipment || buildCurrentShipmentPayload();
			shipmentFlowStore.pendingShipment = payload;

			if (editCartId) {
				await sanctumClient(`/api/cart/${editCartId}`, { method: 'PUT', body: payload });
				shipmentFlowStore.editingCartItemId = editCartId;
				uiFeedback.success('Indirizzi salvati', 'Apro il pagamento nello stesso ventaglio...', { timeout: 1800 });
				await openPaymentAccordion();
				return;
			}

			const clientSubmissionId = shipmentFlowStore.pendingShipment?.client_submission_id
				|| `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
			shipmentFlowStore.pendingShipment = { ...payload, client_submission_id: clientSubmissionId };

			const result = await sanctumClient('/api/create-direct-order', {
				method: 'POST',
				body: { ...payload, client_submission_id: clientSubmissionId },
			});

			const orderId = result?.order_id || result?.data?.order_id;
			const amountCents = Number(result?.amount_cents || result?.data?.amount_cents || 0);
			funnelAnalytics.trackPaymentInit(amountCents);
			try { ecommerceAnalytics?.beginCheckout?.({ totalCents: amountCents }); } catch { /* no-op */ }
			uiFeedback.success('Ordine creato', 'Apro il pagamento nello stesso ventaglio...', { timeout: 1800 });
			await openPaymentAccordion(orderId || null);
		} catch (error) {
			submitError.value = resolveFunnelErrorMessage(error, 'Errore durante l\'apertura del pagamento. Riprova.');
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
			if (!shipmentFlowStore.pendingShipment) return;
			await proceedToPaymentFromConfirm();
			return;
		}
		await initializePaymentSection();
	};

	/* Watchers */
	watch(
		() => activeAccordionStep.value,
		async (step) => { if (step === 'payment') await ensurePaymentStageReady(); },
		{ flush: 'post' },
	);

	watch(
		() => isAuthenticated.value,
		async (auth) => { if (auth && activeAccordionStep.value === 'payment') await ensurePaymentStageReady(); },
		{ flush: 'post' },
	);

	// GA4 add_payment_info on method change (not on mount).
	watch(
		() => paymentMethod.value,
		(method, prev) => {
			if (!method || method === prev) return;
			try {
				const eurs = Number(String(summaryTotalPrice?.value ?? '0').replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
				ecommerceAnalytics?.addPaymentInfo?.({ paymentType: String(method), totalCents: Math.round(eurs * 100) });
			} catch { /* no-op */ }
		},
	);

	/* Lifecycle */
	onMounted(async () => {
		await loadQuickQuotePriceBands().catch(() => {});
		ensurePackagesIdentity();
		await initOnMounted();
		if (!Array.isArray(shipmentFlowStore.packages) || shipmentFlowStore.packages.length === 0) {
			addPackageInline();
			ensurePackagesIdentity();
		}
		try {
			const quoteType = isBusinessProfile.value ? 'business' : deliveryMode.value === 'pudo' ? 'pudo' : 'privato';
			funnelAnalytics.trackPreventivoStart(quoteType);
		} catch { /* no-op */ }
	});

	return {
		packageAccordionSummary, servicesAccordionSummary, addressAccordionSummary,
		resolvedContentDescription, colloLabel, trattaLabel,
		confirmationPickupDate, confirmationOriginContact, confirmationDestinationContact,
		paymentSummaryServicesLabel, paymentMethodLabel, paymentDeliveryLabel,
		isPackagesAccordionOpen, isServicesAccordionOpen, isAddressAccordionOpen, isPaymentAccordionOpen,
		canAdvanceFromAddresses,
		quoteHeroTitle, quoteHeroDescription,
		visiblePaymentError,
		openPackagesAccordion, openServicesAccordion, openAddressAccordion,
		collapseAddressAccordion, openPaymentAccordion,
		proceedToPaymentFromConfirm,
		openShipmentAuthModal,
	};
}
