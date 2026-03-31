<!--
	FILE PRINCIPALE DELL'APPLICAZIONE (app.vue)

	Questo e' il punto di ingresso di TUTTO il sito.
	E' il primo file che viene caricato quando un utente apre il sito.

	Cosa fa:
	1. Carica la sessione dal server (i dati temporanei del preventivo in corso)
	2. Se nella sessione ci sono dati salvati (pacchi e dettagli spedizione),
	   li ripristina nello store (la memoria condivisa del sito), cosi' l'utente
	   non perde i dati se aggiorna la pagina o naviga tra le pagine
	3. Mostra la struttura base del sito:
	   - UApp: il contenitore principale della libreria Nuxt UI
	   - NuxtLayout: il layout (cornice con header e footer)
	   - NuxtPage: la pagina corrente che cambia a seconda dell'indirizzo

	Il "watch" serve a gestire il caso in cui la sessione arriva dal server
	dopo che la pagina e' gia' stata caricata (caricamento asincrono):
	in quel caso ripristina i dati appena diventano disponibili.
-->
<script setup>
import {
	buildPendingShipmentFromSession,
	extractShipmentServicesArray,
	getShipmentFlowStepNumber,
	resolveShipmentFlowState,
	toStepAddressState,
} from '~/utils/shipmentFlowState';

const userStore = useUserStore();
const route = useRoute();
const QUOTE_SESSION_ROUTE_PREFIXES = ['/preventivo', '/la-tua-spedizione', '/riepilogo', '/checkout', '/carrello'];
const quoteTransitionLock = useState('shipment-flow-quote-transition-lock', () => false);
const restoredQuoteSession = useState('shipment-flow-quote-restored', () => false);

const shouldRestoreQuoteSession = computed(() =>
	route.path === '/'
	|| route.path === '/preview/home-hero'
	|| QUOTE_SESSION_ROUTE_PREFIXES.some((prefix) => route.path.startsWith(prefix))
);
const { session, status } = useSession();
const restoredQuoteRoute = useState('shipment-flow-quote-restored-route', () => '');

const hasLocalQuoteState = () => {
	const details = userStore.shipmentDetails || {};
	return Boolean(userStore.pendingShipment)
		|| Boolean(userStore.pickupDate)
		|| Boolean(userStore.contentDescription?.trim?.())
		|| (Array.isArray(userStore.packages) && userStore.packages.length > 0)
		|| ['origin_city', 'origin_postal_code', 'destination_city', 'destination_postal_code', 'date']
			.some((key) => String(details?.[key] || '').trim());
};

const restoreSession = (data) => {
	if (!data?.shipment_details && !data?.packages?.length) return;
	const flowState = resolveShipmentFlowState(data);

	const currentDetails = userStore.shipmentDetails || {};
	const remoteDetails = data?.shipment_details || {};
	const pickDetail = (key, fallback = '') => {
		const localValue = String(currentDetails?.[key] || '').trim();
		if (localValue) return localValue;
		return String(remoteDetails?.[key] || fallback).trim();
	};
	const mergedDetails = {
		origin_city: pickDetail('origin_city'),
		origin_postal_code: pickDetail('origin_postal_code'),
		origin_country_code: pickDetail('origin_country_code', 'IT') || 'IT',
		origin_country: pickDetail('origin_country', 'Italia') || 'Italia',
		destination_city: pickDetail('destination_city'),
		destination_postal_code: pickDetail('destination_postal_code'),
		destination_country_code: pickDetail('destination_country_code', 'IT') || 'IT',
		destination_country: pickDetail('destination_country', 'Italia') || 'Italia',
		date: pickDetail('date'),
	};

	Object.assign(userStore.shipmentDetails, mergedDetails);

	if ((!Array.isArray(userStore.packages) || userStore.packages.length === 0) && Array.isArray(data?.packages) && data.packages.length > 0) {
		userStore.packages = [...data.packages];
	}

	if (!userStore.totalPrice && Number(data?.total_price || 0) > 0) {
		userStore.totalPrice = Number(data.total_price);
	}

	if (!userStore.isQuoteStarted && flowState.quote_ready) {
		userStore.isQuoteStarted = true;
	}

	if (!userStore.servicesArray.length) {
		const services = extractShipmentServicesArray(data);
		if (services.length) {
			userStore.servicesArray = [...services];
		}
	}

	if (!userStore.contentDescription && String(data?.content_description || '').trim()) {
		userStore.contentDescription = String(data.content_description).trim();
	}

	if (!userStore.pickupDate && String(data?.pickup_date || data?.services?.date || '').trim()) {
		userStore.pickupDate = String(data.pickup_date || data?.services?.date || '').trim();
	}

	const remoteSmsNotification = Boolean(
		data?.sms_email_notification
		?? data?.services?.sms_email_notification
		?? data?.service_data?.sms_email_notification
	);

	if (!userStore.smsEmailNotification && remoteSmsNotification) {
		userStore.smsEmailNotification = true;
	}

	if (!Object.keys(userStore.serviceData || {}).length) {
		const remoteServiceData = data?.service_data || data?.services?.serviceData || null;
		if (remoteServiceData && typeof remoteServiceData === 'object') {
			userStore.serviceData = { ...remoteServiceData };
		}
	}

	if (!userStore.originAddressData && data?.origin_address) {
		userStore.originAddressData = toStepAddressState(data.origin_address);
	}

	if (!userStore.destinationAddressData && data?.destination_address) {
		userStore.destinationAddressData = toStepAddressState(data.destination_address);
	}

	if (userStore.deliveryMode === 'home' && String(data?.delivery_mode || '').trim() === 'pudo') {
		userStore.deliveryMode = 'pudo';
	}

	if (!userStore.selectedPudo && data?.selected_pudo) {
		userStore.selectedPudo = data.selected_pudo;
	}

	if (!userStore.pendingShipment) {
		const pendingShipment = buildPendingShipmentFromSession(data);
		if (pendingShipment) {
			userStore.pendingShipment = pendingShipment;
		}
	}

	if (!userStore.stepNumber) {
		userStore.stepNumber = getShipmentFlowStepNumber(flowState);
	}
};

const restoreSessionIfNeeded = (data) => {
	if (!shouldRestoreQuoteSession.value) return;
	if (restoredQuoteSession.value) return;
	if (hasLocalQuoteState()) return;
	if (quoteTransitionLock.value) return;
	if (status.value === 'pending') return;
	restoreSession(data);
	restoredQuoteSession.value = true;
	restoredQuoteRoute.value = route.fullPath;
};

// Ripristina solo quando arrivano davvero dati sessione utili; evitiamo di
// riapplicare il restore nel primo frame o durante un cambio route in corso,
// che erano una fonte concreta di flicker/remount percepito nel funnel.
watch(
	() => session.value?.data,
	(data) => {
		if (!data) return;
		restoreSessionIfNeeded(data);
	},
	{ flush: 'post' },
);

watch(
	() => route.fullPath,
	() => {
		if (!shouldRestoreQuoteSession.value) {
			restoredQuoteSession.value = false;
			restoredQuoteRoute.value = '';
			return;
		}

		if (restoredQuoteRoute.value !== route.fullPath) {
			restoredQuoteSession.value = false;
		}

		if (session.value?.data) {
			restoreSessionIfNeeded(session.value.data);
		}
	},
	{ flush: 'post' },
);

onMounted(() => {
	if (session.value?.data) {
		nextTick(() => restoreSessionIfNeeded(session.value.data));
	}
});

// Failsafe: evita lock scroll globale se una route preview lascia classi/stili sul body.
if (process.client) {
	const unlockGlobalScroll = () => {
		const isPreviewRoute = route.path.startsWith('/preview/home-hero');
		if (isPreviewRoute) return;
		document.documentElement.classList.remove('hero-preview-body');
		document.body.classList.remove('hero-preview-body');
		document.documentElement.style.overflow = '';
		document.documentElement.style.overflowY = '';
		document.body.style.overflow = '';
		document.body.style.overflowY = '';
	};

	onMounted(unlockGlobalScroll);
	watch(() => route.path, unlockGlobalScroll);
}
</script>

<template>
	<UApp>
		<NuxtLayout>
			<NuxtPage />
		</NuxtLayout>
		<ShipmentFlowAdminGateModal />
	</UApp>
</template>
