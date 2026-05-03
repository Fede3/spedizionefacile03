/**
 * @file view-state — helper puri per UI state del funnel spedizione.
 *
 * Tutto qui è SENZA side-effect (no API, no Stripe, no store mutations).
 * Logica invariata estratta da ShipmentFlowPage per snellire lo script setup.
 */
import { computed } from "vue";

type AccordionLifecycleHooks = {
	onAccordionPanelBeforeEnter: (el: Element) => void;
	onAccordionPanelEnter: (el: Element, done: () => void) => void;
	onAccordionPanelAfterEnter: (el: Element) => void;
	onAccordionPanelBeforeLeave: (el: Element) => void;
	onAccordionPanelLeave: (el: Element, done: () => void) => void;
	onAccordionPanelAfterLeave: (el: Element) => void;
};

/**
 * Mappa i 6 hook di lifecycle navigazione → oggetto consumato dai <Transition>
 * dei pannelli accordion. Pure: nessuna chiamata, solo riassemblaggio.
 */
export const buildAccordionTransitions = (hooks: AccordionLifecycleHooks) => ({
	onBeforeEnter: hooks.onAccordionPanelBeforeEnter,
	onEnter: hooks.onAccordionPanelEnter,
	onAfterEnter: hooks.onAccordionPanelAfterEnter,
	onBeforeLeave: hooks.onAccordionPanelBeforeLeave,
	onLeave: hooks.onAccordionPanelLeave,
	onAfterLeave: hooks.onAccordionPanelAfterLeave,
});

/**
 * Predicato puro: è un profilo business in base allo userType nello snapshot UI?
 */
export const isBusinessUserType = (rawUserType: unknown): boolean => {
	const normalized = String(rawUserType || "")
		.trim()
		.toLowerCase();
	return ["commerciante", "azienda", "business"].includes(normalized);
};

/**
 * Factory dei 3 handler "package step" che azzerano packagesError prima di
 * delegare all'API quick-quote. Pure: ritorna closure che leggono i ref dati.
 */
type PackagesHandlersDeps = {
	packagesError: { value: string };
	addPackageInline: () => void;
	deletePack: (id: string | number) => void;
	updatePackageType: (pack: unknown, type: unknown) => void;
};
export const buildPackagesHandlers = (deps: PackagesHandlersDeps) => ({
	handleAddPackage: () => {
		deps.packagesError.value = "";
		deps.addPackageInline();
	},
	handleDeletePackage: (targetPackId: string | number) => {
		deps.packagesError.value = "";
		deps.deletePack(targetPackId);
	},
	handleUpdatePackageType: (pack: unknown, packageType: unknown) => {
		deps.packagesError.value = "";
		deps.updatePackageType(pack, packageType);
	},
});

/**
 * Stub dell'API quick-quote packages quando il flag debug è attivo.
 * Restituisce no-op safe (mai più chiamati lato Stripe). Pure.
 */
export const buildQuickQuoteDebugStub = () => ({
	addPackageInline: () => {},
	calcPriceWithVolume: () => {},
	calcPriceWithWeight: () => {},
	calcQuantity: () => {},
	decrementQuantity: () => {},
	deletePack: () => {},
	ensurePackagesIdentity: () => {},
	europeRestrictionMessage: computed(() => ""),
	incrementQuantity: () => {},
	isEuropeMonocollo: computed(() => false),
	packageTypeList: [
		{ text: "Pacco", img: "pack.png", width: 43, height: 47 },
		{ text: "Pallet", img: "pallet.png", width: 43, height: 42 },
		{ text: "Valigia", img: "suitcase.png", width: 30, height: 52 },
	],
	updatePackageType: () => {},
});
