/**
 * Field error UI, error summaries, field assist, focus helpers.
 * Extracted from useShipmentStepValidation for maintainability.
 */
export const useShipmentFieldValidation = ({
	contentError,
	deliveryMode,
	sv,
	// From location suggestions composable
	applyLocationToSection,
	dedupeLocations,
	destCapSuggestions,
	destCitySuggestions,
	getFieldError,
	getProvinceLabel,
	getSectionAddress,
	locationLinkHints,
	normalizeLocationText,
	originCapSuggestions,
	originCitySuggestions,
}) => {

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
		const rect = field.getBoundingClientRect?.();
		const isVisible = rect && rect.top >= 96 && rect.bottom <= window.innerHeight - 24;
		if (!isVisible) {
			field.scrollIntoView({ behavior: 'auto', block: 'nearest' });
		}
		window.setTimeout(() => {
			field.focus?.();
		}, 120);
	};

	const focusContentDescriptionField = () => {
		const field = document.getElementById('content_description');
		if (!field) return;
		const rect = field.getBoundingClientRect?.();
		const isVisible = rect && rect.top >= 96 && rect.bottom <= window.innerHeight - 24;
		if (!isVisible) {
			field.scrollIntoView({ behavior: 'auto', block: 'nearest' });
		}
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

	// --- Field Assist ---

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
		destinationSectionHint,
		fieldClass,
		fieldErrorText,
		focusContentDescriptionField,
		focusFirstFormError,
		focusFormError,
		formErrorSummary,
		getFieldAssist,
		originSectionHint,
		showGlobalFormSummary,
		softenErrorMessage,
	};
};
