/**
 * COMPOSABLE: useAddressPudo (useAddressPudo.js)
 * SCOPO: Gestione selezione/deselezione punto PUDO (BRT pickup point),
 *        aggiornamento indirizzo destinazione da PUDO, watcher delivery mode.
 *
 * DOVE SI USA: importato da useAddressForm.js (orchestratore)
 *
 * DIPENDENZE INIETTATE:
 *   - destinationAddress: ref indirizzo destinazione
 *   - deliveryMode: computed delivery mode
 *   - session: ref sessione spedizione
 *   - userStore: Pinia user store
 *   - sv: validation helper (useShipmentFieldValidation)
 */
import { watch } from "vue";

export function useAddressPudo({
  destinationAddress,
  deliveryMode,
  session,
  userStore,
  sv,
}) {
  // --- NORMALIZE HELPER (local, no external dep needed) ---
  const normalizeLocationText = (value = "") =>
    String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  // --- PUDO SELECT/DESELECT ---
  const onPudoSelected = (pudo) => {
    userStore.selectedPudo = pudo;
    destinationAddress.value.address = pudo.address || "";
    destinationAddress.value.address_number = "SNC";
    destinationAddress.value.city = pudo.city || "";
    destinationAddress.value.postal_code = pudo.zip_code || "";
    destinationAddress.value.province = pudo.province || "ND";
    const selectedPudoName = normalizeLocationText(pudo?.name || "");
    const currentDestName = normalizeLocationText(destinationAddress.value.full_name || "");
    if (selectedPudoName && currentDestName && selectedPudoName === currentDestName) {
      destinationAddress.value.full_name = "";
    }
    userStore.shipmentDetails = {
      ...(userStore.shipmentDetails || {}),
      destination_city: pudo.city || destinationAddress.value.city || "",
      destination_postal_code: pudo.zip_code || destinationAddress.value.postal_code || "",
    };
  };

  const onPudoDeselected = () => {
    userStore.selectedPudo = null;
    destinationAddress.value.address = "";
    destinationAddress.value.address_number = "";
    destinationAddress.value.city = session.value?.data?.shipment_details?.destination_city || "";
    destinationAddress.value.postal_code = session.value?.data?.shipment_details?.destination_postal_code || "";
    destinationAddress.value.province = "";
  };

  // --- DELIVERY MODE WATCHER ---
  watch(deliveryMode, (newMode) => {
    if (newMode === "home") {
      userStore.selectedPudo = null;
      return;
    }
    [
      "dest_address",
      "dest_address_number",
      "dest_city",
      "dest_province",
      "dest_postal_code",
    ].forEach((fieldKey) => sv.clearError(fieldKey));
  });

  return {
    onPudoSelected,
    onPudoDeselected,
  };
}
