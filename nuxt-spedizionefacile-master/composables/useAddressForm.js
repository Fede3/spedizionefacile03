/**
 * COMPOSABLE: useAddressForm (useAddressForm.js)
 * SCOPO: Orchestratore — compone i sub-composable per gestire indirizzi
 *        di partenza/destinazione, rubrica, autocompletamento, PUDO.
 *
 * DOVE SI USA: pages/la-tua-spedizione/[step].vue (step 3 — indirizzi)
 *
 * SUB-COMPOSABLES:
 *   - useAddressFormCore: stato form, pre-fill, tracking rubrica, delivery mode
 *   - useAddressAutocomplete: autocomplete città/CAP/provincia, blur/focus, validazione coerenza
 *   - useAddressSavedConfigs: rubrica salvata, spedizioni configurate, dropdown
 *   - useAddressPudo: selezione/deselezione punto PUDO
 *
 * COSA RESTITUISCE:
 *   - originAddress, destinationAddress: ref dati indirizzo
 *   - savedAddresses, loadingSavedAddresses, loadSavedAddresses()
 *   - showOriginAddressSelector, showDestAddressSelector, toggleAddressSelector()
 *   - showOriginGuestPrompt, showDestGuestPrompt
 *   - showOriginConfigGuestPrompt, showDestConfigGuestPrompt
 *   - originSelectorRef, destSelectorRef, defaultDropdownRef, destDefaultDropdownRef
 *   - applySavedAddress(), saveAddressToBook()
 *   - canSaveOriginAddress, canSaveDestAddress
 *   - originFromSaved, destFromSaved, originSaveSuccess, destSaveSuccess
 *   - savingOriginAddress, savingDestAddress
 *   - showDefaultDropdown, showDefaultDropdownTarget
 *   - savedConfigs, loadingConfigs, savedConfigsLoaded
 *   - loadSavedConfigs(), applyConfig()
 *   - closeTopDropdowns(), handleTopDropdownClickOutside(), handleTopDropdownEsc()
 *   - authRedirectPath, authRegisterRedirectPath
 *   - Autocompletamento: originCitySuggestions, destCitySuggestions, etc.
 *   - onCityInput, onCapInput, onNameInput, onTelefonoInput, onProvinciaInput
 *   - selectCity, selectCap, selectProvincia
 *   - onCityFocus, onCapFocus, onProvinceFocus
 *   - smartBlur, formatCitySuggestionLabel, formatCapSuggestionLabel
 *   - deliveryMode, onPudoSelected, onPudoDeselected
 */
import { useAddressFormCore } from "~/composables/useAddressFormCore";
import { useAddressAutocomplete } from "~/composables/useAddressAutocomplete";
import { useAddressSavedConfigs } from "~/composables/useAddressSavedConfigs";
import { useAddressPudo } from "~/composables/useAddressPudo";
import { getProvinceLabel } from "~/utils/location";

export function useAddressForm({ session, sv, submitError }) {
  const userStore = useUserStore();
  const route = useRoute();
  const sanctumClient = useSanctumClient();
  const { isAuthenticated } = useSanctumAuth();

  // --- 1. Core form state ---
  const core = useAddressFormCore({ session, isAuthenticated, userStore, route });

  // --- 2. Autocomplete ---
  const autocomplete = useAddressAutocomplete({
    originAddress: core.originAddress,
    destinationAddress: core.destinationAddress,
    deliveryMode: core.deliveryMode,
    sv,
    sanctumClient,
  });

  // --- 3. Saved addresses & configs ---
  const configs = useAddressSavedConfigs({
    originAddress: core.originAddress,
    destinationAddress: core.destinationAddress,
    deliveryMode: core.deliveryMode,
    isAuthenticated,
    sanctumClient,
    submitError,
    originFromSaved: core.originFromSaved,
    destFromSaved: core.destFromSaved,
    originSaveSuccess: core.originSaveSuccess,
    destSaveSuccess: core.destSaveSuccess,
    originSavedSnapshot: core.originSavedSnapshot,
    destSavedSnapshot: core.destSavedSnapshot,
    savingOriginAddress: core.savingOriginAddress,
    savingDestAddress: core.savingDestAddress,
    originSelectorRef: core.originSelectorRef,
    destSelectorRef: core.destSelectorRef,
    defaultDropdownRef: core.defaultDropdownRef,
    destDefaultDropdownRef: core.destDefaultDropdownRef,
  });

  // --- 4. PUDO ---
  const pudo = useAddressPudo({
    destinationAddress: core.destinationAddress,
    deliveryMode: core.deliveryMode,
    session,
    userStore,
    sv,
  });

  // --- PUBLIC API (same keys as original) ---
  return {
    // Core state
    originAddress: core.originAddress,
    destinationAddress: core.destinationAddress,
    originSelectorRef: core.originSelectorRef,
    destSelectorRef: core.destSelectorRef,
    defaultDropdownRef: core.defaultDropdownRef,
    destDefaultDropdownRef: core.destDefaultDropdownRef,
    authRedirectPath: core.authRedirectPath,
    authRegisterRedirectPath: core.authRegisterRedirectPath,
    canSaveOriginAddress: core.canSaveOriginAddress,
    canSaveDestAddress: core.canSaveDestAddress,
    originFromSaved: core.originFromSaved,
    destFromSaved: core.destFromSaved,
    savingOriginAddress: core.savingOriginAddress,
    savingDestAddress: core.savingDestAddress,
    originSaveSuccess: core.originSaveSuccess,
    destSaveSuccess: core.destSaveSuccess,

    // Saved addresses & configs
    savedAddresses: configs.savedAddresses,
    loadingSavedAddresses: configs.loadingSavedAddresses,
    loadSavedAddresses: configs.loadSavedAddresses,
    showOriginAddressSelector: configs.showOriginAddressSelector,
    showDestAddressSelector: configs.showDestAddressSelector,
    showOriginGuestPrompt: configs.showOriginGuestPrompt,
    showDestGuestPrompt: configs.showDestGuestPrompt,
    showOriginConfigGuestPrompt: configs.showOriginConfigGuestPrompt,
    showDestConfigGuestPrompt: configs.showDestConfigGuestPrompt,
    applySavedAddress: configs.applySavedAddress,
    saveAddressToBook: configs.saveAddressToBook,
    toggleAddressSelector: configs.toggleAddressSelector,
    showDefaultDropdown: configs.showDefaultDropdown,
    showDefaultDropdownTarget: configs.showDefaultDropdownTarget,
    savedConfigs: configs.savedConfigs,
    loadingConfigs: configs.loadingConfigs,
    savedConfigsLoaded: configs.savedConfigsLoaded,
    loadSavedConfigs: configs.loadSavedConfigs,
    applyConfig: configs.applyConfig,
    closeTopDropdowns: configs.closeTopDropdowns,
    handleTopDropdownClickOutside: configs.handleTopDropdownClickOutside,
    handleTopDropdownEsc: configs.handleTopDropdownEsc,

    // Autocompletamento
    originProvinceSuggestions: autocomplete.originProvinceSuggestions,
    destProvinceSuggestions: autocomplete.destProvinceSuggestions,
    originCitySuggestions: autocomplete.originCitySuggestions,
    destCitySuggestions: autocomplete.destCitySuggestions,
    originCapSuggestions: autocomplete.originCapSuggestions,
    destCapSuggestions: autocomplete.destCapSuggestions,
    normalizeLocationText: autocomplete.normalizeLocationText,
    getSectionAddress: autocomplete.getSectionAddress,
    formatCitySuggestionLabel: autocomplete.formatCitySuggestionLabel,
    formatCapSuggestionLabel: autocomplete.formatCapSuggestionLabel,
    getProvinceLabel,
    onProvinciaInput: autocomplete.onProvinciaInput,
    selectProvincia: autocomplete.selectProvincia,
    onCityInput: autocomplete.onCityInput,
    onCapInput: autocomplete.onCapInput,
    onNameInput: autocomplete.onNameInput,
    onTelefonoInput: autocomplete.onTelefonoInput,
    selectCity: autocomplete.selectCity,
    selectCap: autocomplete.selectCap,
    onCityFocus: autocomplete.onCityFocus,
    onCapFocus: autocomplete.onCapFocus,
    onProvinceFocus: autocomplete.onProvinceFocus,
    smartBlur: autocomplete.smartBlur,
    validateAddressLocationLink: autocomplete.validateAddressLocationLink,
    locationLinkHints: autocomplete.locationLinkHints,
    dedupeLocations: autocomplete.dedupeLocations,
    applyLocationToSection: autocomplete.applyLocationToSection,

    // PUDO
    deliveryMode: core.deliveryMode,
    onPudoSelected: pudo.onPudoSelected,
    onPudoDeselected: pudo.onPudoDeselected,

    // Autenticazione (passthrough)
    isAuthenticated,
  };
}
