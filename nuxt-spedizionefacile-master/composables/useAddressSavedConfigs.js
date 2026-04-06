/**
 * COMPOSABLE: useAddressSavedConfigs (useAddressSavedConfigs.js)
 * SCOPO: Gestione rubrica indirizzi salvati, spedizioni configurate (presets),
 *        toggle selettori, dropdown, salvataggio indirizzi.
 *
 * DOVE SI USA: importato da useAddressForm.js (orchestratore)
 *
 * DIPENDENZE INIETTATE:
 *   - originAddress, destinationAddress: ref indirizzi
 *   - deliveryMode: computed delivery mode
 *   - isAuthenticated: ref autenticazione
 *   - sanctumClient: API client
 *   - submitError: ref errore submit
 *   - originFromSaved, destFromSaved, originSaveSuccess, destSaveSuccess,
 *     originSavedSnapshot, destSavedSnapshot, savingOriginAddress, savingDestAddress: state refs
 *   - showOriginAddressSelector, showDestAddressSelector: UI toggle refs (created here)
 *   - savedAddresses, loadingSavedAddresses: address book refs (created here)
 *   - originSelectorRef, destSelectorRef, defaultDropdownRef, destDefaultDropdownRef: DOM refs
 */
import { ref } from "vue";

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
