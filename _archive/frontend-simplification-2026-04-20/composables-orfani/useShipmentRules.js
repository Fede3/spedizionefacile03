/**
 * SUB-COMPOSABLE: useShipmentRules
 * SCOPO: Definizioni costanti errori, softenErrorMessage, computed error summaries,
 *        focus helpers, toAddressPayload.
 *
 * Usato da useShipmentValidation come modulo di regole/definizioni.
 */
export function useShipmentRules({ sv, contentError }) {
  // --- ERRORI ORDINATI ---
  const FIELD_ERROR_ORDER = [
    'origin_full_name', 'origin_address', 'origin_address_number',
    'origin_city', 'origin_province', 'origin_postal_code',
    'origin_telephone_number', 'origin_email',
    'dest_full_name', 'dest_address', 'dest_address_number',
    'dest_city', 'dest_province', 'dest_postal_code',
    'dest_telephone_number', 'dest_email',
  ];

  const FIELD_ERROR_LABELS = {
    origin_full_name: 'Nome e Cognome partenza',
    origin_address: 'Indirizzo partenza',
    origin_address_number: 'Numero civico partenza',
    origin_city: 'Città partenza',
    origin_province: 'Provincia partenza',
    origin_postal_code: 'CAP partenza',
    origin_telephone_number: 'Telefono partenza',
    origin_email: 'Email partenza',
    dest_full_name: 'Nome e Cognome destinazione',
    dest_address: 'Indirizzo destinazione',
    dest_address_number: 'Numero civico destinazione',
    dest_city: 'Città destinazione',
    dest_province: 'Provincia destinazione',
    dest_postal_code: 'CAP destinazione',
    dest_telephone_number: 'Telefono destinazione',
    dest_email: 'Email destinazione',
  };

  const FIELD_ERROR_IDS = {
    origin_full_name: 'name',
    origin_address: 'origin_address',
    origin_address_number: 'origin_address_number',
    origin_city: 'origin_city',
    origin_province: 'origin_province',
    origin_postal_code: 'origin_postal_code',
    origin_telephone_number: 'origin_telephone',
    origin_email: 'origin_email',
    dest_full_name: 'dest_name',
    dest_address: 'dest_address',
    dest_address_number: 'dest_address_number',
    dest_city: 'dest_city',
    dest_province: 'dest_province',
    dest_postal_code: 'dest_postal_code',
    dest_telephone_number: 'dest_telephone_number',
    dest_email: 'dest_email',
  };

  const softenErrorMessage = (message) => {
    const raw = String(message || '').trim();
    if (!raw) return '';

    const exactMap = {
      'Telefono è obbligatorio': 'Inserisci il numero di telefono per continuare.',
      'Solo numeri consentiti': 'Usa solo cifre nel numero di telefono.',
      'Numero troppo corto': 'Il numero sembra incompleto: aggiungi qualche cifra.',
      'Numero troppo lungo': 'Il numero sembra troppo lungo: controlla le cifre.',
      'CAP è obbligatorio': 'Inserisci il CAP per continuare.',
      'Il CAP deve essere di 5 cifre': 'Il CAP deve contenere 5 cifre.',
      'CAP non valido': 'Controlla il CAP inserito.',
      'Inserisci un indirizzo email valido': 'Controlla il formato email (es. nome@email.it).',
      'Nome e Cognome è obbligatorio': 'Inserisci nome e cognome.',
      'Il nome non può contenere numeri': 'Nel nome evita numeri e simboli.',
      'Provincia è obbligatoria': 'Inserisci la sigla della provincia (es. RM, MI).',
      'Inserisci la sigla (2 lettere)': 'Usa la sigla provincia con 2 lettere (es. RM).',
      'Provincia non valida': 'Controlla la sigla provincia inserita.',
      'Città è obbligatoria': 'Inserisci la città.',
      'Campo obbligatorio': 'Completa questo campo per continuare.',
    };

    if (exactMap[raw]) return exactMap[raw];

    if (/^CAP\s+\d{5}\s+non trovato/i.test(raw)) {
      return `${raw}. Verifica il CAP oppure scegli un suggerimento qui sotto.`;
    }
    if (/non coerente con città\/provincia/i.test(raw)) {
      return `${raw}. Ti proponiamo una correzione veloce.`;
    }
    if (/Per CAP\s+\d{5}\s+la città corretta è/i.test(raw)) {
      return raw.replace(/^Per CAP/i, 'Per questo CAP');
    }

    return raw;
  };

  const formErrorSummary = computed(() => {
    const errors = sv.errors?.value || {};
    const keys = Object.keys(errors || {}).sort((a, b) => {
      const aIndex = FIELD_ERROR_ORDER.indexOf(a);
      const bIndex = FIELD_ERROR_ORDER.indexOf(b);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    return keys
      .filter((key) => Boolean(errors[key]))
      .map((key) => ({
        key,
        message: softenErrorMessage(errors[key]),
        label: FIELD_ERROR_LABELS[key] || key,
        targetId: FIELD_ERROR_IDS[key] || '',
      }));
  });

  const groupedFormErrors = computed(() => {
    const groups = { origin: [], dest: [], generic: [] };
    for (const item of formErrorSummary.value) {
      if (item.key.startsWith('origin_')) groups.origin.push(item);
      else if (item.key.startsWith('dest_')) groups.dest.push(item);
      else groups.generic.push(item);
    }
    return groups;
  });

  const sectionsWithErrorsCount = computed(() => {
    let count = 0;
    if (groupedFormErrors.value.origin.length) count += 1;
    if (groupedFormErrors.value.dest.length) count += 1;
    if (groupedFormErrors.value.generic.length) count += 1;
    return count;
  });

  const showGlobalFormSummary = computed(() => formErrorSummary.value.length > 1 && sectionsWithErrorsCount.value > 1);

  const originSectionHint = computed(() => {
    const errors = groupedFormErrors.value.origin;
    if (!errors.length) return '';
    if (errors.length === 1) return `${errors[0].label}: ${errors[0].message}`;
    return `Controlla ${errors.length} campi nella sezione Partenza.`;
  });

  const destinationSectionHint = computed(() => {
    const errors = groupedFormErrors.value.dest;
    if (!errors.length) return '';
    if (errors.length === 1) return `${errors[0].label}: ${errors[0].message}`;
    return `Controlla ${errors.length} campi nella sezione Destinazione.`;
  });

  const focusFormError = (errorItem) => {
    const targetId = errorItem?.targetId;
    if (!targetId) return;
    const field = document.getElementById(targetId);
    if (!field) return;
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      field.focus?.();
    }, 120);
  };

  const focusContentDescriptionField = () => {
    const field = document.getElementById('content_description');
    if (!field) return;
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      field.focus?.();
    }, 120);
  };

  const focusFirstFormError = () => {
    if (contentError.value) {
      focusContentDescriptionField();
      return;
    }
    const firstError = formErrorSummary.value[0];
    if (!firstError) return;
    focusFormError(firstError);
  };

  // Converte i dati dell'indirizzo dal form nel formato atteso dal backend
  const toAddressPayload = (addressData) => ({
    type: addressData.type || "Partenza",
    name: (addressData.full_name || "N/D").trim(),
    additional_information: addressData.additional_information || "",
    address: (addressData.address || "N/D").trim(),
    number_type: "Numero Civico",
    address_number: (addressData.address_number || "SNC").trim(),
    intercom_code: addressData.intercom_code || "",
    country: addressData.country || "Italia",
    city: (addressData.city || "N/D").trim(),
    postal_code: String(addressData.postal_code || "00000").replace(/[^0-9]/g, "") || "00000",
    province: (addressData.province || "N/D").trim(),
    telephone_number: String(addressData.telephone_number || "0000000000").trim(),
    email: addressData.email || "",
  });

  return {
    softenErrorMessage,
    formErrorSummary,
    groupedFormErrors,
    sectionsWithErrorsCount,
    showGlobalFormSummary,
    originSectionHint,
    destinationSectionHint,
    focusFormError,
    focusFirstFormError,
    focusContentDescriptionField,
    toAddressPayload,
  };
}
