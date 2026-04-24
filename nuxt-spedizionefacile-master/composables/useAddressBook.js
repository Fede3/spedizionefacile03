/**
 * useAddressBook.js - Aggregatore form + rubrica indirizzi:
 *   useAddressFormCore     → stato form, pre-fill da session/userStore, can-save
 *   useAddressForm         → orchestratore (FormCore + Autocomplete + SavedConfigs + Pudo)
 *   useAddressSavedConfigs → rubrica, spedizioni configurate (presets), toggle/dropdown
 * ARCHIVIATO: _archive/cleanup-features-2026-04-20/composables-consolidati-location-address/
 */
import { ref, computed, watch } from "vue";
import { getProvinceLabel } from "~/utils/location";
// useAddressAutocomplete e useAddressPudo provengono da useLocation.js
// (auto-imported via Nuxt — non serve import esplicito, ma lo facciamo
// per chiarezza dato che l'orchestratore li compone qui sotto)
import { useAddressAutocomplete, useAddressPudo } from "~/composables/useLocation";

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 1: FormCore (ex useAddressFormCore)
// Stato reattivo del form indirizzi (origine/destinazione),
// pre-fill da session/userStore, tracciamento rubrica vs manuali,
// can-save computed, delivery mode, UI refs, auth redirects.
// ─────────────────────────────────────────────────────────────────────────────
export function useAddressFormCore({ session, isAuthenticated, userStore, route }) {
  // --- STRUTTURA BASE INDIRIZZO ---
  const address = {
    full_name: "",
    additional_information: "",
    address: "",
    address_number: "",
    intercom_code: "",
    country: "Italia",
    province: "",
    telephone_number: "",
    email: "",
  };

  // Pre-fill from userStore if navigating back from riepilogo
  const storedOrigin = userStore.originAddressData;
  const storedDest = userStore.destinationAddressData;

  const originAddress = ref(storedOrigin ? { ...storedOrigin } : {
    ...address,
    type: "Partenza",
    city: session.value?.data?.shipment_details?.origin_city || "",
    postal_code: session.value?.data?.shipment_details?.origin_postal_code || "",
  });

  const destinationAddress = ref(storedDest ? { ...storedDest } : {
    ...address,
    type: "Destinazione",
    city: session.value?.data?.shipment_details?.destination_city || "",
    postal_code: session.value?.data?.shipment_details?.destination_postal_code || "",
  });

  // --- UI REFS ---
  const originSelectorRef = ref(null);
  const destSelectorRef = ref(null);
  const defaultDropdownRef = ref(null);
  const destDefaultDropdownRef = ref(null);

  // --- AUTH REDIRECT ---
  const authRedirectPath = computed(() => `/autenticazione?redirect=${encodeURIComponent(route.fullPath)}`);
  const authRegisterRedirectPath = computed(() => `/autenticazione?mode=register&redirect=${encodeURIComponent(route.fullPath)}`);

  // --- TRACCIAMENTO INDIRIZZI DA RUBRICA vs MANUALI ---
  const originFromSaved = ref(false);
  const destFromSaved = ref(false);
  const savingOriginAddress = ref(false);
  const savingDestAddress = ref(false);
  const originSaveSuccess = ref(false);
  const destSaveSuccess = ref(false);
  const originSavedSnapshot = ref(null);
  const destSavedSnapshot = ref(null);

  // Reset saved flag when user manually edits address fields
  watch(originAddress, (newVal) => {
    if (originFromSaved.value && originSavedSnapshot.value) {
      if (JSON.stringify(newVal) !== originSavedSnapshot.value) {
        originFromSaved.value = false;
        originSaveSuccess.value = false;
        originSavedSnapshot.value = null;
      }
    }
  }, { deep: true });

  watch(destinationAddress, (newVal) => {
    if (destFromSaved.value && destSavedSnapshot.value) {
      if (JSON.stringify(newVal) !== destSavedSnapshot.value) {
        destFromSaved.value = false;
        destSaveSuccess.value = false;
        destSavedSnapshot.value = null;
      }
    }
  }, { deep: true });

  // --- CAN-SAVE COMPUTED ---
  const canSaveOriginAddress = computed(() => {
    if (!isAuthenticated.value) return false;
    if (originFromSaved.value) return false;
    if (originSaveSuccess.value) return false;
    const a = originAddress.value;
    return !!(a.full_name?.trim() && a.address?.trim() && a.city?.trim() && a.postal_code?.trim());
  });

  const canSaveDestAddress = computed(() => {
    if (!isAuthenticated.value) return false;
    if (destFromSaved.value) return false;
    if (destSaveSuccess.value) return false;
    const a = destinationAddress.value;
    return !!(a.full_name?.trim() && a.address?.trim() && a.city?.trim() && a.postal_code?.trim());
  });

  // --- PUDO delivery mode (bound to userStore) ---
  const deliveryMode = computed({
    get: () => userStore.deliveryMode,
    set: (v) => { userStore.deliveryMode = v; },
  });

  // --- PRE-FILL WATCHERS ---
  // Pre-fill address data when session loads
  watch(() => session.value?.data?.shipment_details, (details) => {
    if (details) {
      if (!originAddress.value.city) originAddress.value.city = details.origin_city;
      if (!originAddress.value.postal_code) originAddress.value.postal_code = details.origin_postal_code;
      if (!destinationAddress.value.city) destinationAddress.value.city = details.destination_city;
      if (!destinationAddress.value.postal_code) destinationAddress.value.postal_code = details.destination_postal_code;
    }
  }, { immediate: true });

  // Pre-fill address CAP/city from userStore quote data (Preventivo Rapido)
  watch(() => userStore.shipmentDetails, (sd) => {
    if (sd) {
      if (sd.origin_city && !originAddress.value.city) originAddress.value.city = sd.origin_city;
      if (sd.origin_postal_code && !originAddress.value.postal_code) originAddress.value.postal_code = sd.origin_postal_code;
      if (sd.destination_city && !destinationAddress.value.city) destinationAddress.value.city = sd.destination_city;
      if (sd.destination_postal_code && !destinationAddress.value.postal_code) destinationAddress.value.postal_code = sd.destination_postal_code;
    }
  }, { immediate: true, deep: true });

  return {
    originAddress,
    destinationAddress,
    originSelectorRef,
    destSelectorRef,
    defaultDropdownRef,
    destDefaultDropdownRef,
    authRedirectPath,
    authRegisterRedirectPath,
    originFromSaved,
    destFromSaved,
    savingOriginAddress,
    savingDestAddress,
    originSaveSuccess,
    destSaveSuccess,
    originSavedSnapshot,
    destSavedSnapshot,
    canSaveOriginAddress,
    canSaveDestAddress,
    deliveryMode,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 2: SavedConfigs (ex useAddressSavedConfigs)
// Gestione rubrica indirizzi salvati, spedizioni configurate (presets),
// toggle selettori, dropdown, salvataggio indirizzi.
//
// DIPENDENZE INIETTATE:
//   - originAddress, destinationAddress: ref indirizzi
//   - deliveryMode: computed delivery mode
//   - isAuthenticated: ref autenticazione
//   - sanctumClient: API client
//   - submitError: ref errore submit
//   - originFromSaved, destFromSaved, originSaveSuccess, destSaveSuccess,
//     originSavedSnapshot, destSavedSnapshot, savingOriginAddress, savingDestAddress: state refs
//   - originSelectorRef, destSelectorRef, defaultDropdownRef, destDefaultDropdownRef: DOM refs
// ─────────────────────────────────────────────────────────────────────────────
export function useAddressSavedConfigs({
  originAddress,
  destinationAddress,
  deliveryMode,
  isAuthenticated,
  sanctumClient,
  submitError,
  originFromSaved,
  destFromSaved,
  originSaveSuccess,
  destSaveSuccess,
  originSavedSnapshot,
  destSavedSnapshot,
  savingOriginAddress,
  savingDestAddress,
  originSelectorRef,
  destSelectorRef,
  defaultDropdownRef,
  destDefaultDropdownRef,
}) {
  // --- SAVED ADDRESSES ---
  const savedAddresses = ref([]);
  const loadingSavedAddresses = ref(false);
  const showOriginAddressSelector = ref(false);
  const showDestAddressSelector = ref(false);
  const showOriginGuestPrompt = ref(false);
  const showDestGuestPrompt = ref(false);
  const showOriginConfigGuestPrompt = ref(false);
  const showDestConfigGuestPrompt = ref(false);

  const loadSavedAddresses = async () => {
    if (!isAuthenticated.value) return;
    if (savedAddresses.value.length > 0) return;
    loadingSavedAddresses.value = true;
    try {
      const result = await sanctumClient("/api/user-addresses");
      savedAddresses.value = result?.data || [];
    } catch (e) {
      // silent: saved addresses are optional
    } finally {
      loadingSavedAddresses.value = false;
    }
  };

  const applySavedAddress = (addr, target) => {
    const addrRef = target === "origin" ? originAddress : destinationAddress;
    const isDestPudoContactOnly = target === "dest" && deliveryMode.value === "pudo";

    addrRef.value.full_name = addr.name || "";
    addrRef.value.telephone_number = addr.telephone_number || "";
    addrRef.value.email = addr.email || "";
    addrRef.value.additional_information = addr.additional_information || "";

    if (!isDestPudoContactOnly) {
      addrRef.value.address = addr.address || "";
      addrRef.value.address_number = addr.address_number || "";
      addrRef.value.city = addr.city || "";
      addrRef.value.postal_code = addr.postal_code || "";
      addrRef.value.province = addr.province || "";
      addrRef.value.intercom_code = addr.intercom_code || "";
    }
    if (target === "origin") {
      showOriginAddressSelector.value = false;
      originFromSaved.value = true;
      originSaveSuccess.value = false;
      originSavedSnapshot.value = JSON.stringify(addrRef.value);
    } else {
      showDestAddressSelector.value = false;
      destFromSaved.value = true;
      destSaveSuccess.value = false;
      destSavedSnapshot.value = JSON.stringify(addrRef.value);
    }
  };

  const saveAddressToBook = async (target) => {
    const addr = target === "origin" ? originAddress.value : destinationAddress.value;
    const savingRef = target === "origin" ? savingOriginAddress : savingDestAddress;
    const successRef = target === "origin" ? originSaveSuccess : destSaveSuccess;

    savingRef.value = true;
    try {
      await sanctumClient("/api/user-addresses", {
        method: "POST",
        body: {
          name: addr.full_name?.trim() || "",
          additional_information: addr.additional_information || "",
          address: addr.address?.trim() || "",
          number_type: "Numero Civico",
          address_number: addr.address_number?.trim() || "",
          intercom_code: addr.intercom_code || "",
          country: addr.country || "Italia",
          city: addr.city?.trim() || "",
          postal_code: String(addr.postal_code || "").replace(/[^0-9]/g, ""),
          province: addr.province?.trim() || "",
          telephone_number: addr.telephone_number?.trim() || "",
          email: addr.email || "",
        },
      });
      successRef.value = true;
      savedAddresses.value = [];
    } catch (e) {
      const msg = e?.data?.message || "Errore nel salvataggio dell'indirizzo.";
      submitError.value = msg;
    } finally {
      savingRef.value = false;
    }
  };

  const toggleAddressSelector = (target) => {
    showDefaultDropdown.value = false;

    if (!isAuthenticated.value) {
      if (target === "origin") {
        showOriginGuestPrompt.value = !showOriginGuestPrompt.value;
        showDestGuestPrompt.value = false;
        showOriginAddressSelector.value = false;
        showDestAddressSelector.value = false;
      } else {
        showDestGuestPrompt.value = !showDestGuestPrompt.value;
        showOriginGuestPrompt.value = false;
        showOriginAddressSelector.value = false;
        showDestAddressSelector.value = false;
      }
      return;
    }

    loadSavedAddresses();
    showOriginGuestPrompt.value = false;
    showDestGuestPrompt.value = false;

    if (target === "origin") {
      showOriginAddressSelector.value = !showOriginAddressSelector.value;
      showDestAddressSelector.value = false;
    } else {
      showDestAddressSelector.value = !showDestAddressSelector.value;
      showOriginAddressSelector.value = false;
    }
  };

  // --- SAVED SHIPMENT CONFIGS ---
  const showDefaultDropdown = ref(false);
  const showDefaultDropdownTarget = ref("origin");
  const savedConfigs = ref([]);
  const loadingConfigs = ref(false);
  const savedConfigsLoaded = ref(false);

  const closeTopDropdowns = () => {
    showDefaultDropdown.value = false;
    showDefaultDropdownTarget.value = "origin";
    showOriginAddressSelector.value = false;
    showDestAddressSelector.value = false;
    showOriginGuestPrompt.value = false;
    showDestGuestPrompt.value = false;
    showOriginConfigGuestPrompt.value = false;
    showDestConfigGuestPrompt.value = false;
  };

  const handleTopDropdownClickOutside = (event) => {
    const target = event?.target;
    const insideDefaultOrigin = defaultDropdownRef.value?.contains?.(target);
    const insideDefaultDest = destDefaultDropdownRef.value?.contains?.(target);
    const insideOrigin = originSelectorRef.value?.contains?.(target);
    const insideDest = destSelectorRef.value?.contains?.(target);
    if (!insideDefaultOrigin && !insideDefaultDest && !insideOrigin && !insideDest) {
      closeTopDropdowns();
    }
  };

  const handleTopDropdownEsc = (event) => {
    if (event.key === "Escape") {
      closeTopDropdowns();
    }
  };

  const loadSavedConfigs = async (targetSection = "origin") => {
    if (!isAuthenticated.value) {
      if (targetSection === "origin") {
        showOriginConfigGuestPrompt.value = !showOriginConfigGuestPrompt.value;
        showDestConfigGuestPrompt.value = false;
      } else {
        showDestConfigGuestPrompt.value = !showDestConfigGuestPrompt.value;
        showOriginConfigGuestPrompt.value = false;
      }
      showOriginAddressSelector.value = false;
      showDestAddressSelector.value = false;
      showOriginGuestPrompt.value = false;
      showDestGuestPrompt.value = false;
      return;
    }

    showOriginConfigGuestPrompt.value = false;
    showDestConfigGuestPrompt.value = false;
    if (showDefaultDropdown.value && showDefaultDropdownTarget.value === targetSection) {
      showDefaultDropdown.value = false;
      return;
    }
    showOriginAddressSelector.value = false;
    showDestAddressSelector.value = false;
    showOriginGuestPrompt.value = false;
    showDestGuestPrompt.value = false;
    showDefaultDropdownTarget.value = targetSection;

    if (savedConfigsLoaded.value) {
      showDefaultDropdown.value = true;
      return;
    }
    loadingConfigs.value = true;
    try {
      const result = await sanctumClient("/api/saved-shipments");
      savedConfigs.value = result?.data || [];
      savedConfigsLoaded.value = true;
      showDefaultDropdown.value = true;
    } catch (e) {
      // silent: saved configs are optional
    } finally {
      loadingConfigs.value = false;
    }
  };

  const applyConfigToOrigin = (configAddress) => {
    if (!configAddress) return;
    originAddress.value.full_name = configAddress.name || "";
    originAddress.value.address = configAddress.address || "";
    originAddress.value.address_number = configAddress.address_number || "";
    originAddress.value.city = configAddress.city || "";
    originAddress.value.postal_code = configAddress.postal_code || "";
    originAddress.value.province = configAddress.province || "";
    originAddress.value.telephone_number = configAddress.telephone_number || "";
    originAddress.value.email = configAddress.email || "";
    originAddress.value.additional_information = configAddress.additional_information || "";
    originAddress.value.intercom_code = configAddress.intercom_code || "";
    originFromSaved.value = true;
    originSaveSuccess.value = false;
    originSavedSnapshot.value = JSON.stringify(originAddress.value);
  };

  const applyConfigToDestination = (configAddress) => {
    if (!configAddress) return;
    const contactOnly = deliveryMode.value === "pudo";
    destinationAddress.value.full_name = configAddress.name || destinationAddress.value.full_name || "";
    destinationAddress.value.telephone_number = configAddress.telephone_number || destinationAddress.value.telephone_number || "";
    destinationAddress.value.email = configAddress.email || destinationAddress.value.email || "";
    destinationAddress.value.additional_information = configAddress.additional_information || destinationAddress.value.additional_information || "";

    if (!contactOnly) {
      destinationAddress.value.address = configAddress.address || "";
      destinationAddress.value.address_number = configAddress.address_number || "";
      destinationAddress.value.city = configAddress.city || "";
      destinationAddress.value.postal_code = configAddress.postal_code || "";
      destinationAddress.value.province = configAddress.province || "";
      destinationAddress.value.intercom_code = configAddress.intercom_code || "";
    }

    destFromSaved.value = true;
    destSaveSuccess.value = false;
    destSavedSnapshot.value = JSON.stringify(destinationAddress.value);
  };

  const applyConfig = (item, targetSection = "origin") => {
    if (item.origin_address && (targetSection === "origin" || targetSection === "both")) {
      applyConfigToOrigin(item.origin_address);
    }
    if (item.destination_address && (targetSection === "dest" || targetSection === "both")) {
      applyConfigToDestination(item.destination_address);
    }
    showDefaultDropdown.value = false;
    showOriginConfigGuestPrompt.value = false;
    showDestConfigGuestPrompt.value = false;
  };

  return {
    savedAddresses,
    loadingSavedAddresses,
    loadSavedAddresses,
    showOriginAddressSelector,
    showDestAddressSelector,
    showOriginGuestPrompt,
    showDestGuestPrompt,
    showOriginConfigGuestPrompt,
    showDestConfigGuestPrompt,
    applySavedAddress,
    saveAddressToBook,
    toggleAddressSelector,
    showDefaultDropdown,
    showDefaultDropdownTarget,
    savedConfigs,
    loadingConfigs,
    savedConfigsLoaded,
    loadSavedConfigs,
    applyConfig,
    closeTopDropdowns,
    handleTopDropdownClickOutside,
    handleTopDropdownEsc,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 3: Form Orchestratore (ex useAddressForm)
// Compone FormCore + AddressAutocomplete (da useLocation.js) +
// SavedConfigs + AddressPudo (da useLocation.js).
//
// DOVE SI USA: pages/la-tua-spedizione/[step].vue (step 3 — indirizzi)
//
// COSA RESTITUISCE:
//   - originAddress, destinationAddress, UI refs
//   - savedAddresses, loadSavedAddresses
//   - show*Selector / show*GuestPrompt + toggleAddressSelector
//   - applySavedAddress, saveAddressToBook
//   - can-save computed, savingOriginAddress/savingDestAddress, success flags
//   - savedConfigs, loadingConfigs, loadSavedConfigs, applyConfig
//   - closeTopDropdowns, handleTopDropdownClickOutside, handleTopDropdownEsc
//   - authRedirectPath, authRegisterRedirectPath
//   - Tutto l'autocomplete (suggestions, handlers, formatters)
//   - deliveryMode, onPudoSelected, onPudoDeselected
// ─────────────────────────────────────────────────────────────────────────────
export function useAddressForm({ session, sv, submitError }) {
  const userStore = useShipmentFlowStore();
  const route = useRoute();
  const sanctumClient = useSanctumClient();
  const { isAuthenticated } = useSanctumAuth();

  // --- 1. Core form state ---
  const core = useAddressFormCore({ session, isAuthenticated, userStore, route });

  // --- 2. Autocomplete (da useLocation.js) ---
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

  // --- 4. PUDO (da useLocation.js) ---
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
