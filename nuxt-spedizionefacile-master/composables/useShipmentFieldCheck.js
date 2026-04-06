/**
 * SUB-COMPOSABLE: useShipmentFieldCheck
 * SCOPO: Validazione form (validateForm), stato campi (fieldClass, fieldErrorText),
 *        field assist (suggerimenti correzione automatica).
 *
 * Usato da useShipmentValidation come modulo di checking/assist campi.
 */
export function useShipmentFieldCheck({
  sv,
  services,
  originAddress,
  destinationAddress,
  deliveryMode,
  dateError,
  getSectionAddress,
  validateAddressLocationLink,
  originCitySuggestions,
  destCitySuggestions,
  originCapSuggestions,
  destCapSuggestions,
  locationLinkHints,
  dedupeLocations,
  getProvinceLabel,
  normalizeLocationText,
  applyLocationToSection,
  softenErrorMessage,
  contentError,
}) {
  const userStore = useUserStore();

  const showValidation = ref(false);

  const validateForm = async () => {
    showValidation.value = true;
    let isValid = true;

    if (!services.value.date) {
      dateError.value = 'Seleziona un giorno di ritiro prima di procedere.';
      isValid = false;
    } else {
      dateError.value = null;
    }

    // Validazione contenuto del pacco
    if (!userStore.contentDescription || !userStore.contentDescription.trim()) {
      contentError.value = 'Il contenuto del pacco è obbligatorio';
      isValid = false;
    } else {
      contentError.value = null;
    }

    // Mark all fields as touched and validate
    const validateRequiredField = (key, value, message) => {
      if (!value || !String(value).trim()) {
        sv.setError(key, message);
        return false;
      }
      sv.clearError(key);
      return true;
    };

    const validateAddr = (section, addr) => {
      const isDestPudoContactOnly = section === 'dest' && deliveryMode.value === 'pudo';
      const commonFields = [
        ['full_name', addr.full_name, () => sv.validateNomeCognome(`${section}_full_name`, addr.full_name)],
        ['telephone_number', addr.telephone_number, () => sv.validateTelefono(`${section}_telephone_number`, addr.telephone_number)],
      ];
      const fullAddressFields = [
        ['address', addr.address, () => validateRequiredField(`${section}_address`, addr.address, 'Indirizzo è obbligatorio')],
        ['address_number', addr.address_number, () => validateRequiredField(`${section}_address_number`, addr.address_number, 'Numero civico è obbligatorio')],
        ['city', addr.city, () => validateRequiredField(`${section}_city`, addr.city, 'Città è obbligatoria')],
        ['province', addr.province, () => sv.validateProvincia(`${section}_province`, addr.province)],
        ['postal_code', addr.postal_code, () => sv.validateCAP(`${section}_postal_code`, addr.postal_code)],
      ];
      const fields = isDestPudoContactOnly ? commonFields : [...commonFields, ...fullAddressFields];

      for (const [field, , validateFn] of fields) {
        sv.markTouched(`${section}_${field}`);
        if (!validateFn()) isValid = false;
      }

      // Email optional
      if (addr.email) {
        sv.markTouched(`${section}_email`);
        if (!sv.validateEmail(`${section}_email`, addr.email)) isValid = false;
      }
    };

    validateAddr('origin', originAddress.value);
    validateAddr('dest', destinationAddress.value);

    const originLinkOk = await validateAddressLocationLink("origin");
    if (!originLinkOk) isValid = false;

    if (deliveryMode.value !== "pudo") {
      const destLinkOk = await validateAddressLocationLink("dest");
      if (!destLinkOk) isValid = false;
    }

    return isValid;
  };

  // --- FIELD ERROR HELPERS ---
  const getFieldError = (section, field) => {
    return sv.getError(`${section}_${field}`);
  };

  const fieldClass = (section, field) => {
    const key = `${section}_${field}`;
    return sv.hasError(key)
      ? 'input-preventivo-step-2 input-preventivo-step-2--warning'
      : 'input-preventivo-step-2';
  };

  const fieldErrorText = (section, field) => softenErrorMessage(getFieldError(section, field));

  const contentFieldHint = computed(() => {
    if (!contentError.value) return '';
    return 'Ti ho portato qui perché manca il contenuto del pacco. Inseriscilo per continuare.';
  });

  // --- FIELD ASSIST ---
  const normalizeSimpleText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

  const buildEmailSuggestion = (email) => {
    const raw = String(email || '').trim().toLowerCase();
    if (!raw.includes('@')) return null;
    const [local, domain] = raw.split('@');
    if (!local || !domain) return null;
    const commonFixes = {
      'gmial.com': 'gmail.com',
      'gamil.com': 'gmail.com',
      'gnail.com': 'gmail.com',
      'gmai.com': 'gmail.com',
      'hotnail.com': 'hotmail.com',
      'hotmai.com': 'hotmail.com',
      'outlok.com': 'outlook.com',
      'outllok.com': 'outlook.com',
      'icloud.con': 'icloud.com',
      'yaho.com': 'yahoo.com',
    };
    const fixedDomain = commonFixes[domain];
    if (!fixedDomain) return null;
    return `${local}@${fixedDomain}`;
  };

  const extractAddressAndNumber = (value) => {
    const raw = normalizeSimpleText(value);
    if (!raw) return null;
    const match = raw.match(/^(.*?)[,\s]+(\d+[a-zA-Z0-9\-\/]*)$/);
    if (!match) return null;
    const street = normalizeSimpleText(match[1]).replace(/[,\s]+$/g, '');
    const number = normalizeSimpleText(match[2]);
    if (!street || !number) return null;
    return { street, number };
  };

  const getBestLocationCandidate = (section) => {
    const addr = getSectionAddress(section);
    const cap = String(addr.postal_code || '').trim();
    const cityNorm = normalizeLocationText(addr.city || '');
    const provinceNorm = normalizeLocationText(addr.province || '');
    const cityList = section === 'origin' ? originCitySuggestions.value : destCitySuggestions.value;
    const capList = section === 'origin' ? originCapSuggestions.value : destCapSuggestions.value;
    const hintList = locationLinkHints[section] || [];

    let pool = dedupeLocations([...(capList || []), ...(cityList || []), ...(hintList || [])]);
    if (!pool.length) return null;

    if (cap.length === 5) {
      const capMatches = pool.filter((loc) => String(loc.postal_code || '') === cap);
      if (capMatches.length) pool = capMatches;
    }

    pool.sort((a, b) => {
      const aCity = normalizeLocationText(a.place_name);
      const bCity = normalizeLocationText(b.place_name);
      const aProv = normalizeLocationText(getProvinceLabel(a));
      const bProv = normalizeLocationText(getProvinceLabel(b));
      const aScore =
        (aCity === cityNorm ? 3 : 0) +
        (aProv === provinceNorm ? 2 : 0) +
        (cap && String(a.postal_code || '') === cap ? 2 : 0);
      const bScore =
        (bCity === cityNorm ? 3 : 0) +
        (bProv === provinceNorm ? 2 : 0) +
        (cap && String(b.postal_code || '') === cap ? 2 : 0);
      if (aScore !== bScore) return bScore - aScore;
      return String(a.postal_code || '').localeCompare(String(b.postal_code || ''));
    });

    return pool[0] || null;
  };

  const buildFieldAssist = (section, field) => {
    const error = getFieldError(section, field);
    if (!error) return null;

    const addr = getSectionAddress(section);
    const key = `${section}_${field}`;
    const isDestPudoAddress = section === 'dest' && deliveryMode.value === 'pudo' && ['address', 'address_number', 'city', 'province', 'postal_code'].includes(field);
    if (isDestPudoAddress) return null;

    if (field === 'full_name') {
      const current = String(addr.full_name || '');
      const cleaned = sv.autoCapitalize(current.replace(/[0-9]/g, '').replace(/\s+/g, ' ').trim());
      if (cleaned && cleaned !== current) {
        return {
          label: `Usa "${cleaned}"`,
          apply: () => {
            addr.full_name = cleaned;
            sv.markTouched(key);
            sv.validateNomeCognome(key, cleaned);
          },
        };
      }
    }

    if (field === 'telephone_number') {
      const current = String(addr.telephone_number || '');
      const onlyDigits = current.replace(/[^\d]/g, '').replace(/^39/, '');
      const candidateDigits = onlyDigits.length > 10 ? onlyDigits.slice(0, 10) : onlyDigits;
      if (candidateDigits.length >= 6 && candidateDigits !== onlyDigits) {
        return {
          label: `Correggi numero in ${candidateDigits}`,
          apply: () => {
            addr.telephone_number = candidateDigits;
            sv.markTouched(key);
            sv.validateTelefono(key, candidateDigits);
          },
        };
      }
    }

    if (field === 'email') {
      const current = String(addr.email || '');
      const suggestion = buildEmailSuggestion(current);
      if (suggestion && suggestion !== current.toLowerCase()) {
        return {
          label: `Usa "${suggestion}"`,
          apply: () => {
            addr.email = suggestion;
            sv.markTouched(key);
            sv.validateEmail(key, suggestion);
          },
        };
      }
    }

    if (field === 'address') {
      const parsed = extractAddressAndNumber(addr.address);
      if (parsed && !normalizeSimpleText(addr.address_number)) {
        return {
          label: `Separa civico: ${parsed.street}, ${parsed.number}`,
          apply: () => {
            addr.address = parsed.street;
            addr.address_number = parsed.number;
            sv.markTouched(`${section}_address`);
            sv.markTouched(`${section}_address_number`);
            sv.clearError(`${section}_address`);
            sv.clearError(`${section}_address_number`);
          },
        };
      }
    }

    if (field === 'address_number') {
      const parsed = extractAddressAndNumber(addr.address);
      if (parsed && !normalizeSimpleText(addr.address_number)) {
        return {
          label: `Imposta civico ${parsed.number}`,
          apply: () => {
            addr.address = parsed.street;
            addr.address_number = parsed.number;
            sv.markTouched(`${section}_address`);
            sv.markTouched(`${section}_address_number`);
            sv.clearError(`${section}_address`);
            sv.clearError(`${section}_address_number`);
          },
        };
      }
    }

    if (['city', 'province', 'postal_code'].includes(field)) {
      const candidate = getBestLocationCandidate(section);
      if (!candidate) return null;
      const city = String(candidate.place_name || '').trim();
      const province = getProvinceLabel(candidate);
      const cap = String(candidate.postal_code || '').trim();

      const cityDiff = city && normalizeLocationText(city) !== normalizeLocationText(addr.city || '');
      const provinceDiff = province && normalizeLocationText(province) !== normalizeLocationText(addr.province || '');
      const capDiff = cap && cap !== String(addr.postal_code || '').trim();

      if (cityDiff || provinceDiff || capDiff) {
        const labelParts = [];
        if (cityDiff) labelParts.push(city);
        if (provinceDiff) labelParts.push(province);
        if (capDiff) labelParts.push(cap);

        return {
          label: `Applica correzione: ${labelParts.join(' · ')}`,
          apply: () => {
            applyLocationToSection(section, candidate);
            sv.markTouched(`${section}_city`);
            sv.markTouched(`${section}_province`);
            sv.markTouched(`${section}_postal_code`);
          },
        };
      }
    }

    return null;
  };

  const fieldAssistMap = computed(() => {
    const map = {};
    const fields = ['full_name', 'address', 'address_number', 'city', 'province', 'postal_code', 'telephone_number', 'email'];
    ['origin', 'dest'].forEach((section) => {
      fields.forEach((field) => {
        map[`${section}_${field}`] = buildFieldAssist(section, field);
      });
    });
    return map;
  });

  const getFieldAssist = (section, field) => fieldAssistMap.value[`${section}_${field}`] || null;

  const applyFieldAssist = (section, field) => {
    const suggestion = getFieldAssist(section, field);
    if (!suggestion?.apply) return;
    suggestion.apply();
  };

  return {
    validateForm,
    showValidation,
    contentFieldHint,
    getFieldError,
    fieldClass,
    fieldErrorText,
    getFieldAssist,
    applyFieldAssist,
  };
}
