export const useShipmentStepValidation = ({
	contentError,
	dateError,
	deliveryMode,
	destinationAddress,
	originAddress,
	sanctumClient,
	services,
	userStore,
}) => {
const sv = useSmartValidation();
const showValidation = ref(false);
const {
	dedupeLocations,
	getProvinceLabel,
	normalizeLocationText,
	searchLocations,
	searchLocationsByCap,
	searchLocationsByCity,
} = useLocationSearch(sanctumClient);

// Province autocomplete
const originProvinceSuggestions = ref([]);
const destProvinceSuggestions = ref([]);

// City/CAP autocomplete
const originCitySuggestions = ref([]);
const destCitySuggestions = ref([]);
const originCapSuggestions = ref([]);
const destCapSuggestions = ref([]);
const citySearchTimeout = { origin: null, dest: null };
const capSearchTimeout = { origin: null, dest: null };
const citySearchSeq = reactive({ origin: 0, dest: 0 });
const capSearchSeq = reactive({ origin: 0, dest: 0 });
const locationLinkHints = reactive({ origin: [], dest: [] });

const getSectionAddress = (section) => (section === "origin" ? originAddress.value : destinationAddress.value);
const getSectionCountryCode = (section) => (
	section === "origin"
		? String(userStore.shipmentDetails.origin_country_code || "IT").trim().toUpperCase()
		: String(userStore.shipmentDetails.destination_country_code || "IT").trim().toUpperCase()
);
const isItalianSection = (section) => getSectionCountryCode(section) === "IT";

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

const validateProvinceField = (section, value) => {
	if (!isItalianSection(section)) {
		if (!value || !String(value).trim()) {
			sv.setError(`${section}_province`, 'Provincia/Stato è obbligatorio');
			return false;
		}
		sv.clearError(`${section}_province`);
		return true;
	}

	return sv.validateProvincia(`${section}_province`, value);
};

const onProvinciaInput = (section, value) => {
	if (!isItalianSection(section)) {
		const cleaned = String(value || "").trimStart();
		if (section === 'origin') {
			originAddress.value.province = cleaned;
			originProvinceSuggestions.value = [];
		} else {
			destinationAddress.value.province = cleaned;
			destProvinceSuggestions.value = [];
		}
		sv.onInput(`${section}_province`, () => validateProvinceField(section, cleaned));
		return;
	}

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
	sv.onInput(`${section}_province`, () => validateProvinceField(section, filtered));
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
		const results = await searchLocationsByCity(city, 300);
		const cityNorm = normalizeLocationText(city);
		let filtered = results
			.filter((loc) => normalizeLocationText(loc.place_name).startsWith(cityNorm));
		if (isItalianSection(section)) {
			filtered = filtered.sort((a, b) => String(a.postal_code).localeCompare(String(b.postal_code)));
		}
		setSectionCapSuggestions(section, filtered.slice(0, 40));
		setProvinceSuggestionsFromLocations(section, filtered);
	} catch (error) {
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
	const filtered = isItalianSection(section)
		? sv.filterProvincia(addr.province || "")
		: String(addr.province || "").trimStart();
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

	// Valida anche il campo città
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
			const results = await searchLocationsByCity(value, 300);
			if (seq !== citySearchSeq[section]) return;

			const queryNorm = normalizeLocationText(value);
			const address = getSectionAddress(section);
			const capPrefix = String(address.postal_code || "");
			const provincePrefix = normalizeLocationText(address.province || "");

			let suggestions = results.filter((loc) =>
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

const applyLocationToSection = (section, location) => {
	const address = getSectionAddress(section);
	address.city = location.place_name || address.city;
	address.postal_code = String(location.postal_code || address.postal_code || "");
	address.country = location.country_name || address.country || "Italia";
	const province = getProvinceLabel(location);
	if (province) address.province = province;
	setSectionCitySuggestions(section, []);
	setSectionCapSuggestions(section, []);
	setSectionProvinceSuggestions(section, []);
	sv.clearError(`${section}_city`);
	sv.clearError(`${section}_postal_code`);
	sv.clearError(`${section}_province`);
};

const selectCity = (section, location) => {
	applyLocationToSection(section, location);
};

const selectCap = (section, location) => {
	applyLocationToSection(section, location);
};

// Auto-capitalize and filter for nome/cognome
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
	const countryCode = getSectionCountryCode(section);
	const filtered = sv.filterCAP(value, { countryCode });
	if (section === 'origin') {
		originAddress.value.postal_code = filtered;
	} else {
		destinationAddress.value.postal_code = filtered;
	}
	sv.onInput(`${section}_postal_code`, () => sv.validateCAP(`${section}_postal_code`, filtered, { countryCode }));

	if (!filtered || filtered.length < (countryCode === 'IT' ? 3 : 2)) {
		setSectionCapSuggestions(section, []);
		return;
	}

	const delay = options.immediate ? 0 : 220;
	capSearchTimeout[section] = setTimeout(async () => {
		const seq = ++capSearchSeq[section];
		const address = getSectionAddress(section);
		const cityNorm = normalizeLocationText(address.city);
		const provinceNorm = normalizeLocationText(address.province);

		try {
			let results = [];
			if (countryCode === 'IT' && filtered.length === 5) {
				results = await searchLocationsByCap(filtered);
			} else {
				results = await searchLocations(filtered, 300);
			}
			if (seq !== capSearchSeq[section]) return;

			let suggestions = countryCode === 'IT'
				? results.filter((loc) => String(loc.postal_code || "").startsWith(filtered))
				: results.filter((loc) => String(loc.postal_code || "").toUpperCase().startsWith(filtered.toUpperCase()));

			if (cityNorm.length >= 2) {
				suggestions = suggestions.filter((loc) =>
					normalizeLocationText(loc.place_name).startsWith(cityNorm)
				);
			}

			if (countryCode === 'IT' && provinceNorm.length === 2) {
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

			if (countryCode === 'IT' && filtered.length === 5) {
				const exactCoherent = suggestions.find((loc) =>
					isLocationCoherent(loc, address.city, address.province)
				);
				if (exactCoherent) {
					applyLocationToSection(section, exactCoherent);
				} else if (!address.city && suggestions.length === 1) {
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
		sv.onBlur(key, () => sv.validateCAP(key, value, { countryCode: getSectionCountryCode(section) }));
		setTimeout(() => setSectionCapSuggestions(section, []), 200);
		void validateAddressLocationLink(section);
	} else if (field === 'telephone_number') {
		sv.onBlur(key, () => sv.validateTelefono(key, value));
	} else if (field === 'email') {
		sv.onBlur(key, () => sv.validateEmail(key, value));
	} else if (field === 'province') {
		sv.onBlur(key, () => validateProvinceField(section, value));
		// Hide autocomplete on blur
		setTimeout(() => {
			setSectionProvinceSuggestions(section, []);
		}, 200);
		void validateAddressLocationLink(section);
	} else {
		// Generic required field
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
	// In modalita' PUDO la destinazione e' gestita dal punto selezionato.
	if (section === "dest" && deliveryMode.value === "pudo") return true;
	if (!isItalianSection(section)) return true;

	const address = getSectionAddress(section);
	const city = String(address.city || "").trim();
	const province = sv.filterProvincia(address.province || "");
	const cap = sv.filterCAP(address.postal_code || "");
	if (!city || !province || cap.length !== 5) return true;

	try {
		const results = await searchLocationsByCap(cap);
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

		address.city = exact.place_name || address.city;
		address.province = getProvinceLabel(exact) || address.province;
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
			['province', addr.province, () => validateProvinceField(section, addr.province)],
			['postal_code', addr.postal_code, () => sv.validateCAP(`${section}_postal_code`, addr.postal_code, { countryCode: getSectionCountryCode(section) })],
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

const FIELD_ERROR_ORDER = [
	'origin_full_name',
	'origin_address',
	'origin_address_number',
	'origin_city',
	'origin_province',
	'origin_postal_code',
	'origin_telephone_number',
	'origin_email',
	'dest_full_name',
	'dest_address',
	'dest_address_number',
	'dest_city',
	'dest_province',
	'dest_postal_code',
	'dest_telephone_number',
	'dest_email',
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

const getFieldError = (section, field) => {
	return sv.getError(`${section}_${field}`);
};

const fieldClass = (section, field) => {
	const key = `${section}_${field}`;
	return sv.hasError(key)
		? 'input-preventivo-step-2 input-preventivo-step-2--warning'
		: 'input-preventivo-step-2';
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

const fieldErrorText = (section, field) => softenErrorMessage(getFieldError(section, field));

const contentFieldHint = computed(() => {
	if (!contentError.value) return '';
	return 'Ti ho portato qui perché manca il contenuto del pacco. Inseriscilo per continuare.';
});

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
		applyFieldAssist,
		contentFieldHint,
		destCapSuggestions,
		destCitySuggestions,
		destProvinceSuggestions,
		destinationSectionHint,
		fieldClass,
		fieldErrorText,
		focusFormError,
		focusContentDescriptionField,
		focusFirstFormError,
		formErrorSummary,
		formatCapSuggestionLabel,
		formatCitySuggestionLabel,
		getFieldAssist,
		getFieldError,
		normalizeLocationText,
		onCapFocus,
		onCapInput,
		onCityFocus,
		onCityInput,
		onNameInput,
		onProvinciaInput,
		onProvinceFocus,
		onTelefonoInput,
		originCapSuggestions,
		originCitySuggestions,
		originProvinceSuggestions,
		originSectionHint,
		selectCap,
		selectCity,
		selectProvincia,
		showGlobalFormSummary,
		smartBlur,
		softenErrorMessage,
		sv,
		validateForm,
	};
};
