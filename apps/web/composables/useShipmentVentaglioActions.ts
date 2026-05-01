/**
 * useShipmentVentaglioActions
 *
 * Handler delle uscite alternative dal "ventaglio" finale dello step Indirizzi:
 *   - Aggiungi al carrello
 *   - Salva configurata (ARCHIVIATA: feature spedizioni-configurate rimossa 2026-04-20)
 *
 * Persiste prima lo stato step-2 (popola shipmentFlowStore.pendingShipment via
 * persistAndContinueToCart), poi invia il payload al cart endpoint giusto
 * (auth = /api/cart, guest = /api/guest-cart).
 *
 * e isolare la logica del flusso ventaglio.
 */
import type { Ref } from 'vue';
import { resolveApiError } from '~/utils/shipmentStepHelpers';

type SanctumClient = (input: string, init?: { method?: string; body?: unknown }) => Promise<unknown>;
type UiFeedback = {
	success: (title: string, message?: string) => void;
	error: (title: string, message?: string) => void;
};
type ShipmentFlowStoreLike = { pendingShipment: unknown };
type VentaglioDeps = {
	sanctumClient: SanctumClient;
	uiFeedback: UiFeedback;
	isAuthenticated: Ref<boolean>;
	shipmentFlowStore: ShipmentFlowStoreLike;
	validateInlineServiceDetails: () => boolean;
	focusFirstInvalidServiceField: () => void;
	persistAndContinueToCart: () => Promise<boolean | undefined> | boolean | undefined;
};

export const useShipmentVentaglioActions = (deps: VentaglioDeps) => {
	const isAddingToCart = ref(false);

	// Lo stato resta esposto solo per retro-compat del template.
	const isSavingConfigured = ref(false);

	const handleAddToCart = async () => {
		if (isAddingToCart.value) return;
		if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
		await nextTick();

		if (!deps.validateInlineServiceDetails()) {
			deps.focusFirstInvalidServiceField();
			return;
		}

		isAddingToCart.value = true;
		try {
			const persisted = await deps.persistAndContinueToCart();
			if (persisted === false) return;
			const payload = deps.shipmentFlowStore.pendingShipment;
			if (!payload) throw new Error('Dati spedizione non disponibili.');
			const cartEndpoint = deps.isAuthenticated.value ? '/api/cart' : '/api/guest-cart';
			await deps.sanctumClient(cartEndpoint, { method: 'POST', body: payload });
			deps.uiFeedback.success('Aggiunta al carrello', 'La spedizione e pronta nel tuo carrello.');
			await navigateTo('/carrello');
		} catch (err) {
			deps.uiFeedback.error('Aggiunta al carrello', resolveApiError(err, "Errore durante l'aggiunta al carrello. Riprova."));
		} finally {
			isAddingToCart.value = false;
		}
	};

	// No-op: feature archiviata. Bottone rimosso dal template ma riferimento
	// preservato nel binding @save-configured per evitare regression.
	const handleSaveConfigured = () => { /* archiviato 2026-04-20 */ };

	return {
		isAddingToCart,
		isSavingConfigured,
		handleAddToCart,
		handleSaveConfigured,
	};
};
