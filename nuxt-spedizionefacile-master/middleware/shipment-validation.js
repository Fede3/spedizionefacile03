import {
	canAccessShipmentFlowRoute,
	deriveShipmentFlowStateFromUserStore,
	isShipmentFlowResumeException,
	pickMostAdvancedShipmentFlowState,
	resolveShipmentFlowState,
	trimUserStoreToFlowState,
} from '~/utils/shipmentFlowState';

const BLOCK_TOAST_KEY = 'shipment-flow-guard-toast';

const isShipmentProtectedPath = (routeLike) => {
	const path = String(routeLike?.path || routeLike?.fullPath || '');
	return path.startsWith('/la-tua-spedizione')
		|| path.startsWith('/riepilogo')
		|| path.startsWith('/checkout');
};

export default defineNuxtRouteMiddleware(async (to, from) => {
	if (import.meta.server) {
		return;
	}

	const { init, user } = useSanctumAuth();
	const { authCookie } = useAuthUiSnapshotPersistence();
	const { session, refresh } = useSession();
	const userStore = useUserStore();
	const uiFeedback = useUiFeedback();
	const { openGate } = useShipmentFlowAdminGate();
	const quoteTransitionLock = useState('shipment-flow-quote-transition-lock', () => false);
	const localFlowState = deriveShipmentFlowStateFromUserStore(userStore);

	const hasCachedSessionData = Boolean(session.value?.data);
	const isInternalShipmentNavigation = Boolean(from?.path)
		&& isShipmentProtectedPath(from)
		&& isShipmentProtectedPath(to);
	const isShipmentQueryStepHop = Boolean(from?.fullPath)
		&& from.path === to.path
		&& to.path.startsWith('/la-tua-spedizione');
	const isQuoteAdvanceIntoServices = Boolean(from?.path)
		&& (from.path === '/' || from.path.startsWith('/preventivo'))
		&& to.path.startsWith('/la-tua-spedizione');
	const shouldBootstrapAuth = Boolean(authCookie.value?.authenticated)
		&& (to.path.startsWith('/checkout') || to.path.startsWith('/carrello'));
	const localFastPathAllowed = canAccessShipmentFlowRoute(to, localFlowState)
		&& (isInternalShipmentNavigation || isShipmentQueryStepHop || isQuoteAdvanceIntoServices || quoteTransitionLock.value);

	if (localFastPathAllowed) {
		return;
	}

	if (isQuoteAdvanceIntoServices && localFlowState.quote_ready) {
		return;
	}

	if (!(hasCachedSessionData && (isInternalShipmentNavigation || isShipmentQueryStepHop))) {
		await refresh().catch(() => session.value);

		if (shouldBootstrapAuth) {
			try {
				await init();
			} catch {
				// Se lo snapshot auth era stantio lasciamo proseguire il funnel normale.
			}
		}
	}

	const sessionData = session.value?.data || {};
	const remoteFlowState = resolveShipmentFlowState(sessionData);
	const flowState = pickMostAdvancedShipmentFlowState(remoteFlowState, localFlowState);
	const hasAccess = canAccessShipmentFlowRoute(to, flowState);

	if (user.value?.role === 'Admin') {
		if (!hasAccess && !isShipmentFlowResumeException(to)) {
			openGate({
				targetPath: to.fullPath,
				lastValidRoute: flowState.last_valid_route || '/preventivo',
				reason: 'admin-out-of-flow',
			});
		}
		return;
	}

	if (hasAccess) {
		return;
	}

	const remoteRank = Number(remoteFlowState.summary_ready) * 4
		|| Number(remoteFlowState.addresses_ready) * 3
		|| Number(remoteFlowState.services_ready) * 2
		|| Number(remoteFlowState.quote_ready);
	const localRank = Number(localFlowState.summary_ready) * 4
		|| Number(localFlowState.addresses_ready) * 3
		|| Number(localFlowState.services_ready) * 2
		|| Number(localFlowState.quote_ready);

	if (remoteRank >= localRank) {
		trimUserStoreToFlowState(userStore, flowState);
	}

	const redirectTarget = flowState.last_valid_route || '/preventivo';
	const toastLock = useState(BLOCK_TOAST_KEY, () => false);
	if (!toastLock.value) {
		toastLock.value = true;
		uiFeedback.info('Ultimo step valido', 'Ti abbiamo riportato all’ultimo step valido del tuo flusso.', { timeout: 3200 });
		setTimeout(() => {
			toastLock.value = false;
		}, 3500);
	}

	if (to.fullPath !== redirectTarget) {
		return navigateTo(redirectTarget, { replace: true });
	}
});
