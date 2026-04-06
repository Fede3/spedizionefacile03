/**
 * COMPOSABLE: useAddressValidation (useAddressValidation.js)
 *
 * SCOPO: Gestisce la validazione dei campi indirizzo, smart blur,
 *        coerenza citta'/CAP/provincia, e input filtering/formatting.
 *
 * DOVE SI USA: importato da useAddressForm.js (orchestratore)
 *
 * COSA RESTITUISCE:
 *   - smartBlur(section, field)
 *   - validateAddressLocationLink(section)
 *   - onNameInput(section, value)
 *   - onTelefonoInput(section, value)
 *   - onProvinciaInput(section, value)
 *   - selectProvincia(section, prov)
 *   - normalizeLocationText(value)
 *   - dedupeLocations(locations)
 *   - getProvinceLabel(location)
 *   - isLocationCoherent(location, city, province)
 *   - locationLinkHints
 */
import { reactive } from "vue";

/**
 * @param {Object} deps
 * @param {Object} deps.sv                   - Smart validation instance (useSmartValidation)
 * @param {import('vue').Ref} deps.originAddress
 * @param {import('vue').Ref} deps.destinationAddress
 * @param {import('vue').ComputedRef} deps.deliveryMode
 * @param {Function} deps.sanctumClient      - API client (useSanctumClient)
 * @param {Function} deps.setSectionCitySuggestions
 * @param {Function} deps.setSectionCapSuggestions
 * @param {Function} deps.setSectionProvinceSuggestions
 * @param {import('vue').Ref} deps.originProvinceSuggestions
 * @param {import('vue').Ref} deps.destProvinceSuggestions
 * @param {import('vue').Ref} deps.originCitySuggestions
 * @param {import('vue').Ref} deps.destCitySuggestions
 * @param {import('vue').Ref} deps.originCapSuggestions
 * @param {import('vue').Ref} deps.destCapSuggestions
 */
export function useAddressValidation({
  sv,
  originAddress,
  destinationAddress,
  deliveryMode,
  sanctumClient,
  setSectionCitySuggestions,
  setSectionCapSuggestions,
  setSectionProvinceSuggestions,
  originProvinceSuggestions,
  destProvinceSuggestions,
  originCitySuggestions,
  destCitySuggestions,
  originCapSuggestions,
  destCapSuggestions,
}) {
  // --- LOCATION NORMALIZATION HELPERS ---

  const normalizeLocationText = (value = "") =>
    String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036F]/g, "")
      .toLowerCase()
      .trim();

  const getProvinceLabel = (location) =>
    String(location?.province || location?.province_name || "")
      .toUpperCase()
      .trim();

  /**
   * Deduplica le location in base a postal_code + place_name + province.
   */
  const dedupeLocations = (locations) => {
    if (!Array.isArray(locations)) return [];
    const seen = new Set();
    const result = [];
    for (const loc of locations) {
      const key = `${String(loc?.postal_code || "").trim()}|${normalizeLocationText(loc?.place_name)}|${getProvinceLabel(loc)}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(loc);
    }
    return result;
  };

  /**
   * Verifica se una location e' coerente con citta' e provincia fornite.
   */
  const isLocationCoherent = (location, city, province) => {
    const cityNorm = normalizeLocationText(city);
    const provinceNorm = normalizeLocationText(province);
    const locCityNorm = normalizeLocationText(location?.place_name);
    const locProvinceNorm = normalizeLocationText(getProvinceLabel(location));
    if (cityNorm && locCityNorm !== cityNorm) return false;
    if (provinceNorm && locProvinceNorm !== provinceNorm) return false;
    return true;
  };

  // --- SECTION ADDRESS HELPERS ---

  const getSectionAddress = (section) =>
    section === "origin" ? originAddress.value : destinationAddress.value;

  const setProvinceSuggestionsFromLocations = (section, locations) => {
    const provinces = [...new Set(
      dedupeLocations(locations)
        .map((loc) => getProvinceLabel(loc))
        .filter(Boolean)
    )].sort();
    setSectionProvinceSuggestions(section, provinces.slice(0, 20));
  };

  /**
   * Applica una location scelta a una sezione (origin/dest), pulendo
   * i suggerimenti e gli errori di validazione.
   */
  const applyLocationToSection = (section, location) => {
    const addr = getSectionAddress(section);
    addr.city = location.place_name || addr.city;
    addr.postal_code = String(location.postal_code || addr.postal_code || "");
    const province = getProvinceLabel(location);
    if (province) addr.province = province;
    setSectionCitySuggestions(section, []);
    setSectionCapSuggestions(section, []);
    setSectionProvinceSuggestions(section, []);
    sv.clearError(`${section}_city`);
    sv.clearError(`${section}_postal_code`);
    sv.clearError(`${section}_province`);
  };

  // --- LOCATION LINK VALIDATION ---
  // Traccia gli hint di location per ciascuna sezione (usato nella UI
  // per mostrare suggerimenti di correzione).
  const locationLinkHints = reactive({ origin: [], dest: [] });

  /**
   * Valida la coerenza tra citta', CAP e provincia di una sezione
   * interrogando l'API /api/locations/by-cap.
   * Restituisce true se coerente, false altrimenti.
   */
  const validateAddressLocationLink = async (section) => {
    if (section === "dest" && deliveryMode.value === "pudo") return true;

    const addr = getSectionAddress(section);
    const city = String(addr.city || "").trim();
    const province = sv.filterProvincia(addr.province || "");
    const cap = sv.filterCAP(addr.postal_code || "");
    if (!city || !province || cap.length !== 5) return true;

    try {
      const results = dedupeLocations(
        await sanctumClient(`/api/locations/by-cap?cap=${encodeURIComponent(cap)}`)
      );
      locationLinkHints[section] = results;

      if (!results.length) {
        sv.setError(`${section}_postal_code`, `CAP ${cap} non trovato.`);
        return false;
      }

      const cityNorm = normalizeLocationText(city);
      const provinceNorm = normalizeLocationText(province);
      const exact = results.find((loc) =>
        normalizeLocationText(loc.place_name) === cityNorm &&
        normalizeLocationText(getProvinceLabel(loc)) === provinceNorm
      );

      if (!exact) {
        const cityMatch = results.find((loc) => normalizeLocationText(loc.place_name) === cityNorm);
        const provinceMatch = results.find((loc) => normalizeLocationText(getProvinceLabel(loc)) === provinceNorm);
        const hint = results[0];
        const hintProvince = getProvinceLabel(hint);
        const hintText = hintProvince ? `${hint.place_name} (${hintProvince})` : hint.place_name;

        sv.setError(`${section}_postal_code`, `CAP ${cap} non coerente con città/provincia.`);
        if (!cityMatch) sv.setError(`${section}_city`, `Per CAP ${cap} la città corretta è ${hintText}.`);
        if (!provinceMatch) sv.setError(`${section}_province`, `Provincia non coerente con CAP ${cap}.`);
        return false;
      }

      addr.city = exact.place_name || addr.city;
      addr.province = getProvinceLabel(exact) || addr.province;
      sv.clearError(`${section}_city`);
      sv.clearError(`${section}_province`);
      sv.clearError(`${section}_postal_code`);
      locationLinkHints[section] = [];
      return true;
    } catch {
      locationLinkHints[section] = [];
      return true;
    }
  };

  // --- INPUT HANDLERS (con validazione) ---

  /**
   * Gestisce l'input del campo provincia, filtrando e proponendo suggerimenti
   * contestuali dalle location gia' caricate.
   */
  const onProvinciaInput = (section, value) => {
    const filtered = sv.filterProvincia(value);
    const contextualLocations = dedupeLocations([
      ...(section === "origin" ? originCitySuggestions.value : destCitySuggestions.value),
      ...(section === "origin" ? originCapSuggestions.value : destCapSuggestions.value),
    ]);
    const contextualProvinces = [...new Set(
      contextualLocations
        .map((loc) => getProvinceLabel(loc))
        .filter(Boolean)
    )].filter((prov) => prov.startsWith(filtered));
    const provinceSuggestions = contextualProvinces.length > 0
      ? contextualProvinces.slice(0, 20)
      : sv.getProvinceSuggestions(filtered);

    if (section === "origin") {
      originAddress.value.province = filtered;
      originProvinceSuggestions.value = provinceSuggestions;
    } else {
      destinationAddress.value.province = filtered;
      destProvinceSuggestions.value = provinceSuggestions;
    }
    sv.onInput(`${section}_province`, () => sv.validateProvincia(`${section}_province`, filtered));
  };

  /**
   * Seleziona una provincia dal dropdown di suggerimenti.
   */
  const selectProvincia = (section, prov) => {
    if (section === "origin") {
      originAddress.value.province = prov;
      originProvinceSuggestions.value = [];
    } else {
      destinationAddress.value.province = prov;
      destProvinceSuggestions.value = [];
    }
    sv.clearError(`${section}_province`);
    void validateAddressLocationLink(section);
  };

  /**
   * Auto-capitalizza il nome/cognome durante l'input.
   */
  const onNameInput = (section, value) => {
    const capitalized = sv.autoCapitalize(value);
    if (section === "origin") {
      originAddress.value.full_name = capitalized;
    } else {
      destinationAddress.value.full_name = capitalized;
    }
    sv.onInput(`${section}_full_name`, () => sv.validateNomeCognome(`${section}_full_name`, capitalized));
  };

  /**
   * Formatta il numero di telefono durante l'input.
   */
  const onTelefonoInput = (section, value) => {
    const formatted = sv.formatTelefono(value);
    if (section === "origin") {
      originAddress.value.telephone_number = formatted;
    } else {
      destinationAddress.value.telephone_number = formatted;
    }
    sv.onInput(`${section}_telephone_number`, () => sv.validateTelefono(`${section}_telephone_number`, formatted));
  };

  /**
   * Handler smart di blur per ogni campo: chiama il validatore appropriato
   * e chiude i suggerimenti con un piccolo delay.
   */
  const smartBlur = (section, field) => {
    const key = `${section}_${field}`;
    const addr = section === "origin" ? originAddress.value : destinationAddress.value;
    const value = addr[field];

    if (field === "full_name") {
      sv.onBlur(key, () => sv.validateNomeCognome(key, value));
    } else if (field === "city") {
      sv.onBlur(key, () => {
        if (!value || !String(value).trim()) sv.setError(key, "Città è obbligatoria");
        else sv.clearError(key);
      });
      setTimeout(() => setSectionCitySuggestions(section, []), 200);
      void validateAddressLocationLink(section);
    } else if (field === "postal_code") {
      sv.onBlur(key, () => sv.validateCAP(key, value));
      setTimeout(() => setSectionCapSuggestions(section, []), 200);
      void validateAddressLocationLink(section);
    } else if (field === "telephone_number") {
      sv.onBlur(key, () => sv.validateTelefono(key, value));
    } else if (field === "email") {
      sv.onBlur(key, () => sv.validateEmail(key, value));
    } else if (field === "province") {
      sv.onBlur(key, () => sv.validateProvincia(key, value));
      setTimeout(() => setSectionProvinceSuggestions(section, []), 200);
      void validateAddressLocationLink(section);
    } else {
      // Campo generico obbligatorio
      sv.onBlur(key, () => {
        if (!value || !String(value).trim()) {
          sv.setError(key, "Campo obbligatorio");
        } else {
          sv.clearError(key);
        }
      });
    }
  };

  return {
    // Location helpers (esportati per uso in autocomplete e form)
    normalizeLocationText,
    getProvinceLabel,
    dedupeLocations,
    isLocationCoherent,
    getSectionAddress,
    applyLocationToSection,
    setProvinceSuggestionsFromLocations,
    // Validation
    locationLinkHints,
    validateAddressLocationLink,
    smartBlur,
    // Input handlers
    onProvinciaInput,
    selectProvincia,
    onNameInput,
    onTelefonoInput,
  };
}
