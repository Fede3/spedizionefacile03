/**
 * COMPOSABLE: useRiepilogo (useRiepilogo.ts)
 * SCOPO: Logica completa della pagina riepilogo — dati spedizione, modifica inline,
 *        azioni (checkout, carrello, salva, nuova spedizione), formattazione prezzi.
 *
 * API: POST /api/cart o /api/guest-cart, PUT /api/cart/{id}, GET /api/cart/{id},
 *      POST /api/saved-shipments, POST /api/create-direct-order.
 * STORE: userStore.pendingShipment, userStore.editingCartItemId.
 *
 * VINCOLI: single_price in centesimi dal DB → diviso per 100 per la visualizzazione.
 *          preparePayloadForBackend() converte centesimi→euro prima di inviarli.
 */
import type { Address, Package, PendingShipment } from '~/types'
import {
	buildPendingShipmentFromSession,
	deriveShipmentFlowStateFromUserStore,
	pickMostAdvancedShipmentFlowState,
	resolveShipmentFlowState,
} from '~/utils/shipmentFlowState';
import { ensureClientSubmissionId } from '~/utils/clientSubmissionId';
import { calculateShipmentServiceSurcharge } from "~/utils/shipmentServicePricing";

interface PackageTypeVisual {
	label: string
	icon: string
	wrapperClass: string
	iconClass: string
}

type EditSection = 'colli' | 'origin' | 'destination' | 'services' | null

export function useRiepilogo() {
	const userStore = useUserStore();
	const { isAuthenticatedForUi } = useAuthUiState();
	const isAuthenticated = isAuthenticatedForUi;
	const { openAuthModal } = useAuthModal();
	const sanctumAuth = useSanctumAuth();
	const sanctumClient = useSanctumClient();
	const { endpoint, refresh: refreshCart } = useCart();
	const { session } = useSession();
	const uiFeedback = useUiFeedback();
	const route = useRoute();

	// --- FLOW STATE ---
	const fallbackFlowRoute = computed((): string => {
		const remoteFlowState = resolveShipmentFlowState(session.value?.data || {});
		const localFlowState = deriveShipmentFlowStateFromUserStore(userStore);
		return pickMostAdvancedShipmentFlowState(remoteFlowState, localFlowState).last_valid_route || '/preventivo';
	});

	// --- PROMO ---
	const { loadPriceBands, promoSettings, priceBands } = usePriceBands();
	onMounted(() => { loadPriceBands(); });

	// --- REACTIVE STATE ---
	const isSubmitting = ref(false);
	const submitError = ref<string | null>(null);
	const pageReady = ref(false);
	const loadingEditData = ref(false);

	// Dati della spedizione in attesa di conferma (Pinia store)
	const shipment = computed(() => userStore.pendingShipment);

	// ID del pacco nel carrello in modifica (null = nuova spedizione)
	const editingId = computed(() => userStore.editingCartItemId);
	const editQueryId = route.query.edit as string | undefined;
	const isEditFromCart = computed(() => !!editingId.value || !!editQueryId);

	// --- INLINE EDITING ---
	const editingSection = ref<EditSection>(null);
	const editColli = ref<Package[]>([]);
	const editOrigin = ref<Partial<Address>>({});
	const editDestination = ref<Partial<Address>>({});

	// --- INIT ---
	const restorePendingShipmentFromSession = (): boolean => {
		const restoredShipment = buildPendingShipmentFromSession(session.value?.data || {});
		if (!restoredShipment) return false;
		userStore.pendingShipment = restoredShipment;
		return true;
	};

	const initRiepilogoPage = async (): Promise<boolean> => {
		if (!shipment.value && restorePendingShipmentFromSession()) return true;

		if (editQueryId && !shipment.value) {
			if (!isAuthenticated.value) {
				loadingEditData.value = false;
				await navigateTo(fallbackFlowRoute.value, { replace: true });
				return false;
			}
			userStore.editingCartItemId = editQueryId;
			loadingEditData.value = true;
			try {
				const res = await sanctumClient(`/api/cart/${editQueryId}`) as { data?: Record<string, unknown> } & Record<string, unknown>;
				const pkg = (res.data || res) as Record<string, unknown>;
				const priceInCents = pkg.single_price ? Number(pkg.single_price) : 0;
				userStore.pendingShipment = {
					packages: [{
						package_type: pkg.package_type as string,
						quantity: (pkg.quantity as number) || 1,
						weight: pkg.weight as number,
						first_size: pkg.first_size as number,
						second_size: pkg.second_size as number,
						third_size: pkg.third_size as number,
						weight_price: pkg.weight_price as number | undefined,
						volume_price: pkg.volume_price as number | undefined,
						single_price: priceInCents,
						content_description: (pkg.content_description as string) || '',
					}],
					origin_address: (pkg.origin_address as Partial<Address>) || {},
					destination_address: (pkg.destination_address as Partial<Address>) || {},
					services: (pkg.services as PendingShipment['services']) || {},
				};
				loadingEditData.value = false;
				return true;
			} catch {
				loadingEditData.value = false;
				await navigateTo(fallbackFlowRoute.value, { replace: true });
				return false;
			}
		}

		if (!shipment.value && !editQueryId) {
			const redirectTarget = fallbackFlowRoute.value || '/preventivo';
			if (redirectTarget === route.fullPath || redirectTarget.startsWith('/riepilogo')) {
				await navigateTo('/la-tua-spedizione/2?step=ritiro', { replace: true });
				return false;
			}
			await navigateTo(redirectTarget, { replace: true });
			return false;
		}
		return true;
	};

	// --- FORMATTING ---
	// formatPrice auto-importato da utils/price.js

	const packageTypeVisualMap: Record<string, PackageTypeVisual> = {
		pacco: {
			label: 'Pacco',
			icon: '/img/quote/first-step/pack.png',
			wrapperClass: 'p-[8px] tablet:p-[9px]',
			iconClass: 'w-[28px] h-[28px] tablet:w-[32px] tablet:h-[32px]',
		},
		pallet: {
			label: 'Pallet',
			icon: '/img/quote/first-step/pallet.png',
			wrapperClass: 'p-[7px] tablet:p-[8px]',
			iconClass: 'w-[28px] h-[28px] tablet:w-[32px] tablet:h-[32px]',
		},
		valigia: {
			label: 'Valigia',
			icon: '/img/quote/first-step/suitcase.png',
			wrapperClass: 'p-[6px_10px] tablet:p-[7px_12px]',
			iconClass: 'w-[22px] h-[34px] tablet:w-[24px] tablet:h-[38px]',
		},
	};

	const normalizePackageType = (value: string | undefined | null): string =>
		String(value || 'Pacco').trim().toLowerCase();

	const getPackageTypeVisual = (pkg: { package_type?: string } | null | undefined): PackageTypeVisual => {
		const normalized = normalizePackageType(pkg?.package_type);
		return packageTypeVisualMap[normalized] || packageTypeVisualMap.pacco;
	};

	// --- PRICE LOGIC ---
	const preparePayloadForBackend = (shipmentData: PendingShipment | null): PendingShipment | null => {
		if (!shipmentData) return null;
		const payload = { ...shipmentData };
		if (isEditFromCart.value && payload.packages) {
			payload.packages = payload.packages.map(pkg => ({
				...pkg,
				single_price: Number(pkg.single_price) / 100,
			}));
		}

		return payload;
	};

	const totalPrice = computed((): string => {
		if (shipment.value?.packages && shipment.value.packages.length > 0) {
			const packagesTotal = shipment.value.packages.reduce((sum: number, pkg: Package) => {
				const price = isEditFromCart.value
					? (Number(pkg.single_price) || 0) / 100
					: (Number(pkg.single_price) || 0);
				const qty = Number(pkg.quantity) || 1;
				return sum + (price * qty);
			}, 0);
			const serviceSurcharge = calculateShipmentServiceSurcharge({
				serviceType: shipment.value?.services?.service_type || "",
				serviceData: shipment.value?.services?.serviceData || {},
				smsEmailNotification: Boolean(
					shipment.value?.sms_email_notification
					|| shipment.value?.services?.sms_email_notification
					|| shipment.value?.services?.serviceData?.sms_email_notification
				),
				pricingConfig: priceBands.value,
				packages: shipment.value?.packages || [],
				originAddress: shipment.value?.origin_address || {},
				destinationAddress: shipment.value?.destination_address || {},
				deliveryMode: shipment.value?.delivery_mode || shipment.value?.services?.serviceData?.delivery_mode as string || "home",
				selectedPudo: shipment.value?.selected_pudo || (shipment.value as Record<string, unknown>)?.pudo || shipment.value?.services?.serviceData?.pudo || null,
			}).total;
			return (packagesTotal + serviceSurcharge).toFixed(2).replace('.', ',');
		}
		const price = session.value?.data?.total_price;
		if (!price && price !== 0) return '0,00';
		return Number(price).toFixed(2).replace('.', ',');
	});

	const preOrderNumber = useState<string>('riepilogo-preorder-number', () => `SF-${Date.now().toString().slice(-6)}`);

	// --- SERVICE DISPLAY ---
	const serviceDisplayNameMap: Record<string, string> = {
		"Spedizione Senza etichetta": "Senza Etichetta",
		"Senza Etichetta": "Senza Etichetta",
		"Contrassegno": "Contrassegno",
		"Assicurazione": "Assicurazione",
		"Sponda idraulica": "Sponda idraulica",
	};

	const formatServiceDisplayName = (serviceName: string = ''): string => {
		const normalized = String(serviceName || '').trim();
		return serviceDisplayNameMap[normalized] || normalized;
	};

	// --- AUTH HELPERS ---
	const promptGuestAuth = (message: string): void => {
		submitError.value = message;
		openAuthModal({ redirect: route.fullPath, tab: 'login' });
	};

	const ensureAuthenticatedAction = (message: string): boolean => {
		if (isAuthenticated.value || sanctumAuth.isAuthenticated?.value) return true;
		promptGuestAuth(message);
		return false;
	};

	// --- INLINE EDIT ACTIONS ---
	const goToServicesEdit = async (): Promise<void> => {
		if (editingId.value) {
			await navigateTo(`/la-tua-spedizione/2?edit=${editingId.value}&step=ritiro`);
			return;
		}
		await navigateTo('/la-tua-spedizione/2?step=ritiro');
	};

	const startEdit = (section: EditSection): void => {
		if (section === 'services') { goToServicesEdit(); return; }
		editingSection.value = section;
		if (section === 'colli' && shipment.value?.packages) {
			editColli.value = shipment.value.packages.map(p => ({ ...p }));
		}
		if (section === 'origin' && shipment.value?.origin_address) {
			editOrigin.value = { ...shipment.value.origin_address };
		}
		if (section === 'destination' && shipment.value?.destination_address) {
			editDestination.value = { ...shipment.value.destination_address };
		}
	};

	const cancelEdit = (): void => { editingSection.value = null; };

	const validateAddress = (addr: Partial<Address>): string | null => {
		if (!addr.name?.trim()) return 'Nome obbligatorio';
		if (!addr.address?.trim()) return 'Indirizzo obbligatorio';
		if (!addr.city?.trim()) return 'Città obbligatoria';
		if (!addr.postal_code?.trim()) return 'CAP obbligatorio';
		if (!addr.province?.trim()) return 'Provincia obbligatoria';
		return null;
	};

	const saveEdit = (section: EditSection): void => {
		if (section === 'colli' && userStore.pendingShipment) {
			userStore.pendingShipment.packages = editColli.value.map(p => ({ ...p }));
		}
		if (section === 'origin' && userStore.pendingShipment) {
			const error = validateAddress(editOrigin.value);
			if (error) { uiFeedback.error('Controlla i dati di partenza', error); return; }
			userStore.pendingShipment.origin_address = { ...editOrigin.value };
		}
		if (section === 'destination' && userStore.pendingShipment) {
			const error = validateAddress(editDestination.value);
			if (error) { uiFeedback.error('Controlla i dati di destinazione', error); return; }
			userStore.pendingShipment.destination_address = { ...editDestination.value };
		}
		editingSection.value = null;
		uiFeedback.success('Modifiche salvate.');
	};

	// --- MAIN ACTIONS ---
	const proceedToCheckout = async (): Promise<void> => {
		if (!shipment.value) return;
		if (!ensureAuthenticatedAction("Devi effettuare il login per procedere al pagamento.")) return;
		isSubmitting.value = true;
		submitError.value = null;
		try {
			const payload = preparePayloadForBackend(shipment.value);
			if (editingId.value) {
				await sanctumClient(`/api/cart/${editingId.value}`, { method: "PUT", body: payload });
				userStore.editingCartItemId = null;
				userStore.pendingShipment = null;
				clearNuxtData("cart");
				uiFeedback.success('Dati salvati con successo!');
				navigateTo('/checkout');
				return;
			}
			const clientSubmissionId = ensureClientSubmissionId(shipment.value);
			const result = await sanctumClient("/api/create-direct-order", {
				method: "POST",
				body: {
					...payload,
					client_submission_id: clientSubmissionId,
				},
			}) as { order_id: string | number };
			uiFeedback.success('Ordine creato con successo!');
			navigateTo(`/checkout?order_id=${result.order_id}`);
		} catch (error: unknown) {
			const err = error as { response?: { _data?: { message?: string } }; data?: { message?: string } };
			const errorData = err?.response?._data || err?.data;
			submitError.value = errorData?.message || "Errore durante la creazione dell'ordine. Riprova.";
		} finally {
			isSubmitting.value = false;
		}
	};

	const goToSavedShipments = async (): Promise<void> => {
		if (!shipment.value) return;
		if (!ensureAuthenticatedAction("Devi effettuare il login per salvare le spedizioni configurate.")) return;
		isSubmitting.value = true;
		submitError.value = null;
		try {
			const payload = preparePayloadForBackend(shipment.value);
			await sanctumClient("/api/saved-shipments", { method: "POST", body: payload });
			navigateTo('/account/spedizioni-configurate');
		} catch (error: unknown) {
			const err = error as { response?: { _data?: { message?: string } }; data?: { message?: string } };
			const errorData = err?.response?._data || err?.data;
			submitError.value = errorData?.message || "Errore durante il salvataggio. Riprova.";
		} finally {
			isSubmitting.value = false;
		}
	};

	const addAnotherShipment = async (): Promise<void> => {
		if (!shipment.value) return;
		isSubmitting.value = true;
		if (isAuthenticated.value || sanctumAuth.isAuthenticated?.value) {
			try {
				const payload = preparePayloadForBackend(shipment.value);
				await sanctumClient("/api/saved-shipments", { method: "POST", body: payload });
			} catch { /* silent */ }
		}
		isSubmitting.value = false;
		navigateTo('/preventivo');
	};

	const goToCart = async (): Promise<void> => {
		if (!shipment.value) return;
		const originError = validateAddress(shipment.value.origin_address);
		if (originError) { uiFeedback.error('Indirizzo partenza', originError, { timeout: 5000 }); return; }
		const destError = validateAddress(shipment.value.destination_address);
		if (destError) { uiFeedback.error('Indirizzo destinazione', destError, { timeout: 5000 }); return; }

		isSubmitting.value = true;
		submitError.value = null;
		try {
			const payload = preparePayloadForBackend(shipment.value);
			if (editingId.value) {
				await sanctumClient(`/api/cart/${editingId.value}`, { method: "PUT", body: payload });
				userStore.editingCartItemId = null;
				uiFeedback.success('Spedizione aggiornata nel carrello.');
			} else {
				const cartEndpoint = endpoint.value || (isAuthenticated.value ? '/api/cart' : '/api/guest-cart');
				await sanctumClient(cartEndpoint, { method: "POST", body: payload });
				uiFeedback.success('Spedizione aggiunta al carrello.');
			}
			userStore.pendingShipment = null;
			userStore.packages = [];
			userStore.servicesArray = [];
			userStore.contentDescription = '';
			userStore.shipmentDetails = {
				origin_city: '', origin_postal_code: '',
				destination_city: '', destination_postal_code: '', date: '',
			} as typeof userStore.shipmentDetails;
			clearNuxtData("cart");
			navigateTo('/carrello?updated=' + Date.now());
		} catch (error: unknown) {
			const err = error as { response?: { _data?: { message?: string } }; data?: { message?: string } };
			const errorData = err?.response?._data || err?.data;
			submitError.value = errorData?.message || "Errore durante il salvataggio nel carrello. Riprova.";
			uiFeedback.critical('Errore durante il salvataggio', submitError.value, { timeout: 8000 });
		} finally {
			isSubmitting.value = false;
		}
	};

	const goBack = (): void => {
		if (editingId.value) {
			userStore.editingCartItemId = null;
			navigateTo('/carrello');
		} else {
			navigateTo('/la-tua-spedizione/2?step=ritiro');
		}
	};

	return {
		// State
		isSubmitting,
		submitError,
		pageReady,
		loadingEditData,
		shipment,
		editingId,
		isEditFromCart,
		promoSettings,

		// Inline editing
		editingSection,
		editColli,
		editOrigin,
		editDestination,

		// Formatting
		formatPrice,
		getPackageTypeVisual,
		formatServiceDisplayName,
		totalPrice,
		preOrderNumber,

		// Actions
		initRiepilogoPage,
		startEdit,
		cancelEdit,
		saveEdit,
		proceedToCheckout,
		goToSavedShipments,
		addAnotherShipment,
		goToCart,
		goBack,
		goToServicesEdit,

		// Auth
		isAuthenticated,
	};
}
