/**
 * COMPOSABLE: useAddressFormCore (useAddressFormCore.js)
 * SCOPO: Stato reattivo del form indirizzi (origine/destinazione),
 *        pre-fill da session/userStore, tracciamento rubrica vs manuali,
 *        can-save computed, delivery mode, UI refs, auth redirects.
 *
 * DOVE SI USA: importato da useAddressForm.js (orchestratore)
 */
import { ref, computed, watch } from "vue";

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
