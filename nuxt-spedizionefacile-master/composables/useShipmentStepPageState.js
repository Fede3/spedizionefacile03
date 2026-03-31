/**
 * Composable: useShipmentStepPageState
 *
 * Gestisce lo stato di pagina generale dello step di spedizione:
 * - computed per il loading iniziale
 * - computed per la persistenza delle selezioni servizi
 * - watcher per il reset dei servizi al cambio step
 * - logica di montaggio (refresh sessione, avvio modifica carrello)
 */
export const useShipmentStepPageState = ({
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
}) => {
	const route = useRoute();
	const currentStep = computed(() => Number(route.params.step));
	const quoteTransitionLock = useState('shipment-flow-quote-transition-lock', () => false);

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

	// Watcher: reset dei servizi quando si torna allo step 2 senza dati persistiti
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

	// Logica di montaggio
	const initOnMounted = () => {
		const hasSessionSnapshot = Boolean(session.value?.data?.shipment_details)
			|| (Array.isArray(session.value?.data?.packages) && session.value.data.packages.length > 0);
		const hasLocalSnapshot = Boolean(userStore.pendingShipment)
			|| (Array.isArray(userStore.packages) && userStore.packages.length > 0);

		if (status.value === 'idle' && !quoteTransitionLock.value && !hasSessionSnapshot && !hasLocalSnapshot) {
			refresh().catch(() => {});
		}

		if (editCartId && isAuthenticated.value) {
			loadCartItemForEdit({ originAddress, destinationAddress, services, showAddressFields });
		} else if (editCartId && !isAuthenticated.value) {
			loadingEditData.value = false;
		}
	};

	return {
		currentStep,
		hasPersistedServiceSelection,
		initOnMounted,
		showInitialStepLoading,
	};
};
