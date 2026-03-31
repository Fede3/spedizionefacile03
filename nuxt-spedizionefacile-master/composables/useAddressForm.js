/**
 * COMPOSABLE: useAddressForm (useAddressForm.js)
 * SCOPO: Gestisce indirizzi di partenza/destinazione, rubrica salvata,
 *        spedizioni configurate, autocompletamento citta'/CAP/provincia.
 *
 * DOVE SI USA: pages/la-tua-spedizione/[step].vue (step 3 — indirizzi)
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
export function useAddressForm({ session, sv, submitError }) {
  const userStore = useUserStore();
  const route = useRoute();
  const sanctumClient = useSanctumClient();
  const { isAuthenticated } = useSanctumAuth();

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

  // --- SELETTORE INDIRIZZI SALVATI ---
  const savedAddresses = ref([]);
  const loadingSavedAddresses = ref(false);
  const showOriginAddressSelector = ref(false);
  const showDestAddressSelector = ref(false);
  const showOriginGuestPrompt = ref(false);
  const showDestGuestPrompt = ref(false);
  const showOriginConfigGuestPrompt = ref(false);
  const showDestConfigGuestPrompt = ref(false);
  const originSelectorRef = ref(null);
  const destSelectorRef = ref(null);
  const defaultDropdownRef = ref(null);
  const destDefaultDropdownRef = ref(null);

  const authRedirectPath = computed(() => `/autenticazione?redirect=${encodeURIComponent(route.fullPath)}`);
  const authRegisterRedirectPath = computed(() => `/autenticazione?mode=register&redirect=${encodeURIComponent(route.fullPath)}`);

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

  // --- TRACCIAMENTO INDIRIZZI DA RUBRICA vs MANUALI ---
  const originFromSaved = ref(false);
  const destFromSaved = ref(false);
  const savingOriginAddress = ref(false);
  const savingDestAddress = ref(false);
  const originSaveSuccess = ref(false);
  const destSaveSuccess = ref(false);
  const originSavedSnapshot = ref(null);
  const destSavedSnapshot = ref(null);

  // --- PUDO (Punto di ritiro BRT) ---
  const deliveryMode = computed({
    get: () => userStore.deliveryMode,
    set: (v) => { userStore.deliveryMode = v; },
  });

  const applySavedAddress = (addr, target) => {
    const addrRef = target === 'origin' ? originAddress : destinationAddress;
    const isDestPudoContactOnly = target === 'dest' && deliveryMode.value === 'pudo';

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
    if (target === 'origin') {
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

  const saveAddressToBook = async (target) => {
    const addr = target === 'origin' ? originAddress.value : destinationAddress.value;
    const savingRef = target === 'origin' ? savingOriginAddress : savingDestAddress;
    const successRef = target === 'origin' ? originSaveSuccess : destSaveSuccess;

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
      if (target === 'origin') {
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

    if (target === 'origin') {
      showOriginAddressSelector.value = !showOriginAddressSelector.value;
      showDestAddressSelector.value = false;
    } else {
      showDestAddressSelector.value = !showDestAddressSelector.value;
      showOriginAddressSelector.value = false;
    }
  };

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

  // --- AUTOCOMPLETAMENTO CITTA'/CAP/PROVINCIA ---
  const originProvinceSuggestions = ref([]);
  const destProvinceSuggestions = ref([]);
  const originCitySuggestions = ref([]);
  const destCitySuggestions = ref([]);
  const originCapSuggestions = ref([]);
  const destCapSuggestions = ref([]);
  const citySearchTimeout = { origin: null, dest: null };
  const capSearchTimeout = { origin: null, dest: null };
  const citySearchSeq = reactive({ origin: 0, dest: 0 });
  const capSearchSeq = reactive({ origin: 0, dest: 0 });
  const locationLinkHints = reactive({ origin: [], dest: [] });

  const normalizeLocationText = (value = "") =>
    String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const getSectionAddress = (section) => (section === "origin" ? originAddress.value : destinationAddress.value);

  const setSectionCitySuggestions = (section, suggestions) => {
    if (section === "origin") originCitySuggestions.value = suggestions;
    else destCitySuggestions.value = suggestions;
  };

  const setSectionCapSuggestions = (section, suggestions) => {
    if (section === "origin") originCapSuggestions.value = suggestions;
    else destCapSuggestions.value = suggestions;
  };

  const setSectionProvinceSuggestions = (section, suggestions) => {
    if (section === "origin") originProvinceSuggestions.value = suggestions;
    else destProvinceSuggestions.value = suggestions;
  };

  const getProvinceLabel = (location) =>
    String(location?.province || location?.province_name || "")
      .toUpperCase()
      .trim();

  const formatCitySuggestionLabel = (location) => {
    const province = getProvinceLabel(location);
    if (province) return `${location.place_name} (${province}) - ${location.postal_code}`;
    return `${location.place_name} - ${location.postal_code}`;
  };

  const formatCapSuggestionLabel = (location) => {
    const province = getProvinceLabel(location);
    if (province) return `${location.postal_code} - ${location.place_name} (${province})`;
    return `${location.postal_code} - ${location.place_name}`;
  };

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

  const setProvinceSuggestionsFromLocations = (section, locations) => {
    const provinces = [...new Set(
      dedupeLocations(locations)
        .map((loc) => getProvinceLabel(loc))
        .filter(Boolean)
    )].sort();
    setSectionProvinceSuggestions(section, provinces.slice(0, 20));
  };

  const isLocationCoherent = (location, city, province) => {
    const cityNorm = normalizeLocationText(city);
    const provinceNorm = normalizeLocationText(province);
    const locCityNorm = normalizeLocationText(location?.place_name);
    const locProvinceNorm = normalizeLocationText(getProvinceLabel(location));
    if (cityNorm && locCityNorm !== cityNorm) return false;
    if (provinceNorm && locProvinceNorm !== provinceNorm) return false;
    return true;
  };

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

    if (section === 'origin') {
      originAddress.value.province = filtered;
      originProvinceSuggestions.value = provinceSuggestions;
    } else {
      destinationAddress.value.province = filtered;
      destProvinceSuggestions.value = provinceSuggestions;
    }
    sv.onInput(`${section}_province`, () => sv.validateProvincia(`${section}_province`, filtered));
  };

  const selectProvincia = (section, prov) => {
    if (section === 'origin') {
      originAddress.value.province = prov;
      originProvinceSuggestions.value = [];
    } else {
      destinationAddress.value.province = prov;
      destProvinceSuggestions.value = [];
    }
    sv.clearError(`${section}_province`);
    void validateAddressLocationLink(section);
  };

  const loadCapSuggestionsFromCity = async (section, cityValue) => {
    const city = String(cityValue || "").trim();
    if (city.length < 2) return;
    try {
      const results = await sanctumClient(`/api/locations/by-city?city=${encodeURIComponent(city)}&limit=300`);
      const cityNorm = normalizeLocationText(city);
      const filtered = dedupeLocations(results)
        .filter((loc) => normalizeLocationText(loc.place_name).startsWith(cityNorm))
        .sort((a, b) => String(a.postal_code).localeCompare(String(b.postal_code)));
      setSectionCapSuggestions(section, filtered.slice(0, 40));
      setProvinceSuggestionsFromLocations(section, filtered);
    } catch (error) {
      // silent: autocomplete suggestions are non-critical
    }
  };

  const onCityFocus = (section) => {
    const addr = getSectionAddress(section);
    if (addr.city && String(addr.city).trim().length >= 2) {
      void onCityInput(section, addr.city, { immediate: true });
    }
  };

  const onCapFocus = (section) => {
    const addr = getSectionAddress(section);
    const cap = String(addr.postal_code || "");
    if (cap.length >= 3) {
      void onCapInput(section, cap, { immediate: true });
      return;
    }
    if (String(addr.city || "").trim().length >= 2) {
      void loadCapSuggestionsFromCity(section, addr.city);
    }
  };

  const onProvinceFocus = (section) => {
    const addr = getSectionAddress(section);
    const filtered = sv.filterProvincia(addr.province || "");
    onProvinciaInput(section, filtered);
    if (!filtered && String(addr.postal_code || "").length >= 3) {
      void onCapInput(section, addr.postal_code, { immediate: true });
    }
    if (!filtered && String(addr.city || "").trim().length >= 2) {
      void onCityInput(section, addr.city, { immediate: true });
    }
  };

  // City autocomplete with API
  const onCityInput = async (section, value, options = {}) => {
    clearTimeout(citySearchTimeout[section]);

    sv.onInput(`${section}_city`, () => {
      if (!value || !String(value).trim()) {
        sv.setError(`${section}_city`, 'Città è obbligatoria');
      } else {
        sv.clearError(`${section}_city`);
      }
    });

    if (!value || value.length < 2) {
      setSectionCitySuggestions(section, []);
      return;
    }

    const delay = options.immediate ? 0 : 260;
    citySearchTimeout[section] = setTimeout(async () => {
      const seq = ++citySearchSeq[section];
      try {
        const results = await sanctumClient(`/api/locations/by-city?city=${encodeURIComponent(value)}&limit=300`);
        if (seq !== citySearchSeq[section]) return;

        const queryNorm = normalizeLocationText(value);
        const addr = getSectionAddress(section);
        const capPrefix = String(addr.postal_code || "");
        const provincePrefix = normalizeLocationText(addr.province || "");

        let suggestions = dedupeLocations(results).filter((loc) =>
          normalizeLocationText(loc.place_name).startsWith(queryNorm)
        );

        if (capPrefix.length >= 3) {
          suggestions = suggestions.filter((loc) =>
            String(loc.postal_code || "").startsWith(capPrefix)
          );
        }

        if (provincePrefix.length === 2) {
          suggestions = suggestions.filter((loc) =>
            normalizeLocationText(getProvinceLabel(loc)) === provincePrefix
          );
        }

        suggestions.sort((a, b) => {
          const aName = normalizeLocationText(a.place_name);
          const bName = normalizeLocationText(b.place_name);
          const aExact = aName === queryNorm ? 0 : 1;
          const bExact = bName === queryNorm ? 0 : 1;
          if (aExact !== bExact) return aExact - bExact;
          if (aName.length !== bName.length) return aName.length - bName.length;
          if (aName !== bName) return aName.localeCompare(bName);
          return String(a.postal_code || "").localeCompare(String(b.postal_code || ""));
        });

        setSectionCitySuggestions(section, suggestions.slice(0, 25));
        setProvinceSuggestionsFromLocations(section, suggestions);

        if (capPrefix.length >= 3) {
          setSectionCapSuggestions(
            section,
            suggestions
              .filter((loc) => String(loc.postal_code || "").startsWith(capPrefix))
              .slice(0, 40)
          );
        }
      } catch (error) {
        setSectionCitySuggestions(section, []);
      }
    }, delay);
  };

  const selectCity = (section, location) => {
    applyLocationToSection(section, location);
  };

  const selectCap = (section, location) => {
    applyLocationToSection(section, location);
  };

  // Auto-capitalize for nome/cognome
  const onNameInput = (section, value) => {
    const capitalized = sv.autoCapitalize(value);
    if (section === 'origin') {
      originAddress.value.full_name = capitalized;
    } else {
      destinationAddress.value.full_name = capitalized;
    }
    sv.onInput(`${section}_full_name`, () => sv.validateNomeCognome(`${section}_full_name`, capitalized));
  };

  // Filter CAP input
  const onCapInput = async (section, value, options = {}) => {
    clearTimeout(capSearchTimeout[section]);
    const filtered = sv.filterCAP(value);
    if (section === 'origin') {
      originAddress.value.postal_code = filtered;
    } else {
      destinationAddress.value.postal_code = filtered;
    }
    sv.onInput(`${section}_postal_code`, () => sv.validateCAP(`${section}_postal_code`, filtered));

    if (!filtered || filtered.length < 3) {
      setSectionCapSuggestions(section, []);
      return;
    }

    const delay = options.immediate ? 0 : 220;
    capSearchTimeout[section] = setTimeout(async () => {
      const seq = ++capSearchSeq[section];
      const addr = getSectionAddress(section);
      const cityNorm = normalizeLocationText(addr.city);
      const provinceNorm = normalizeLocationText(addr.province);

      try {
        let results = [];
        if (filtered.length === 5) {
          results = await sanctumClient(`/api/locations/by-cap?cap=${encodeURIComponent(filtered)}`);
        } else {
          results = await sanctumClient(`/api/locations/search?q=${encodeURIComponent(filtered)}&limit=300`);
        }
        if (seq !== capSearchSeq[section]) return;

        let suggestions = dedupeLocations(results).filter((loc) =>
          String(loc.postal_code || "").startsWith(filtered)
        );

        if (cityNorm.length >= 2) {
          suggestions = suggestions.filter((loc) =>
            normalizeLocationText(loc.place_name).startsWith(cityNorm)
          );
        }

        if (provinceNorm.length === 2) {
          suggestions = suggestions.filter((loc) =>
            normalizeLocationText(getProvinceLabel(loc)) === provinceNorm
          );
        }

        suggestions.sort((a, b) => {
          const aCap = String(a.postal_code || "");
          const bCap = String(b.postal_code || "");
          if (aCap !== bCap) return aCap.localeCompare(bCap);
          return normalizeLocationText(a.place_name).localeCompare(normalizeLocationText(b.place_name));
        });

        setSectionCapSuggestions(section, suggestions.slice(0, 40));
        setProvinceSuggestionsFromLocations(section, suggestions);

        if (filtered.length === 5) {
          const exactCoherent = suggestions.find((loc) =>
            isLocationCoherent(loc, addr.city, addr.province)
          );
          if (exactCoherent) {
            applyLocationToSection(section, exactCoherent);
          } else if (!addr.city && suggestions.length === 1) {
            applyLocationToSection(section, suggestions[0]);
          }
        }
      } catch (error) {
        setSectionCapSuggestions(section, []);
      }
    }, delay);
  };

  // Format telefono input
  const onTelefonoInput = (section, value) => {
    const formatted = sv.formatTelefono(value);
    if (section === 'origin') {
      originAddress.value.telephone_number = formatted;
    } else {
      destinationAddress.value.telephone_number = formatted;
    }
    sv.onInput(`${section}_telephone_number`, () => sv.validateTelefono(`${section}_telephone_number`, formatted));
  };

  // Smart field-level blur handlers
  const smartBlur = (section, field) => {
    const key = `${section}_${field}`;
    const addr = section === 'origin' ? originAddress.value : destinationAddress.value;
    const value = addr[field];

    if (field === 'full_name') {
      sv.onBlur(key, () => sv.validateNomeCognome(key, value));
    } else if (field === 'city') {
      sv.onBlur(key, () => {
        if (!value || !String(value).trim()) sv.setError(key, 'Città è obbligatoria');
        else sv.clearError(key);
      });
      setTimeout(() => setSectionCitySuggestions(section, []), 200);
      void validateAddressLocationLink(section);
    } else if (field === 'postal_code') {
      sv.onBlur(key, () => sv.validateCAP(key, value));
      setTimeout(() => setSectionCapSuggestions(section, []), 200);
      void validateAddressLocationLink(section);
    } else if (field === 'telephone_number') {
      sv.onBlur(key, () => sv.validateTelefono(key, value));
    } else if (field === 'email') {
      sv.onBlur(key, () => sv.validateEmail(key, value));
    } else if (field === 'province') {
      sv.onBlur(key, () => sv.validateProvincia(key, value));
      setTimeout(() => {
        setSectionProvinceSuggestions(section, []);
      }, 200);
      void validateAddressLocationLink(section);
    } else {
      sv.onBlur(key, () => {
        if (!value || !String(value).trim()) {
          sv.setError(key, 'Campo obbligatorio');
        } else {
          sv.clearError(key);
        }
      });
    }
  };

  const validateAddressLocationLink = async (section) => {
    if (section === "dest" && deliveryMode.value === "pudo") return true;

    const addr = getSectionAddress(section);
    const city = String(addr.city || "").trim();
    const province = sv.filterProvincia(addr.province || "");
    const cap = sv.filterCAP(addr.postal_code || "");
    if (!city || !province || cap.length !== 5) return true;

    try {
      const results = dedupeLocations(await sanctumClient(`/api/locations/by-cap?cap=${encodeURIComponent(cap)}`));
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
    } catch (error) {
      locationLinkHints[section] = [];
      return true;
    }
  };

  // --- SPEDIZIONI CONFIGURATE ---
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

  // --- PUDO ---
  const onPudoSelected = (pudo) => {
    userStore.selectedPudo = pudo;
    destinationAddress.value.address = pudo.address || '';
    destinationAddress.value.address_number = 'SNC';
    destinationAddress.value.city = pudo.city || '';
    destinationAddress.value.postal_code = pudo.zip_code || '';
    destinationAddress.value.province = pudo.province || 'ND';
    const selectedPudoName = normalizeLocationText(pudo?.name || '');
    const currentDestName = normalizeLocationText(destinationAddress.value.full_name || '');
    if (selectedPudoName && currentDestName && selectedPudoName === currentDestName) {
      destinationAddress.value.full_name = '';
    }
    userStore.shipmentDetails = {
      ...(userStore.shipmentDetails || {}),
      destination_city: pudo.city || destinationAddress.value.city || "",
      destination_postal_code: pudo.zip_code || destinationAddress.value.postal_code || "",
    };
  };

  const onPudoDeselected = () => {
    userStore.selectedPudo = null;
    destinationAddress.value.address = '';
    destinationAddress.value.address_number = '';
    destinationAddress.value.city = session.value?.data?.shipment_details?.destination_city || '';
    destinationAddress.value.postal_code = session.value?.data?.shipment_details?.destination_postal_code || '';
    destinationAddress.value.province = '';
  };

  watch(deliveryMode, (newMode) => {
    if (newMode === 'home') {
      userStore.selectedPudo = null;
      return;
    }
    [
      'dest_address',
      'dest_address_number',
      'dest_city',
      'dest_province',
      'dest_postal_code',
    ].forEach((fieldKey) => sv.clearError(fieldKey));
  });

  return {
    originAddress,
    destinationAddress,
    savedAddresses,
    loadingSavedAddresses,
    loadSavedAddresses,
    showOriginAddressSelector,
    showDestAddressSelector,
    showOriginGuestPrompt,
    showDestGuestPrompt,
    showOriginConfigGuestPrompt,
    showDestConfigGuestPrompt,
    originSelectorRef,
    destSelectorRef,
    defaultDropdownRef,
    destDefaultDropdownRef,
    authRedirectPath,
    authRegisterRedirectPath,
    applySavedAddress,
    saveAddressToBook,
    toggleAddressSelector,
    canSaveOriginAddress,
    canSaveDestAddress,
    originFromSaved,
    destFromSaved,
    savingOriginAddress,
    savingDestAddress,
    originSaveSuccess,
    destSaveSuccess,
    // Autocompletamento
    originProvinceSuggestions,
    destProvinceSuggestions,
    originCitySuggestions,
    destCitySuggestions,
    originCapSuggestions,
    destCapSuggestions,
    normalizeLocationText,
    getSectionAddress,
    formatCitySuggestionLabel,
    formatCapSuggestionLabel,
    onProvinciaInput,
    selectProvincia,
    onCityInput,
    onCapInput,
    onNameInput,
    onTelefonoInput,
    selectCity,
    selectCap,
    onCityFocus,
    onCapFocus,
    onProvinceFocus,
    smartBlur,
    validateAddressLocationLink,
    locationLinkHints,
    dedupeLocations,
    getProvinceLabel,
    applyLocationToSection,
    // Spedizioni configurate
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
    // PUDO
    deliveryMode,
    onPudoSelected,
    onPudoDeselected,
    // Autenticazione (passthrough)
    isAuthenticated,
  };
}
