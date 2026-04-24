// useShipmentFormFieldAssist — auto-correzione campi form indirizzi:
// capitalizza nomi, pulisce telefoni, suggerisce domini email, separa civico,
// applica location da suggestion CAP/città/provincia.
import type { Ref } from 'vue';

export interface FieldAssist {
	label: string;
	apply: () => void;
}

interface LocationCandidate {
	postal_code?: string;
	place_name?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
}

interface FieldAssistDeps {
	deliveryMode: Ref<string>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	sv: any;
	applyLocationToSection: (section: string, location: LocationCandidate) => void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getSectionAddress: (section: string) => any;
	getFieldError: (section: string, field: string) => string | null;
	locationLinkHints: Record<string, LocationCandidate[]>;
	normalizeLocationText: (text: string) => string;
	originCitySuggestions: Ref<LocationCandidate[]>;
	originCapSuggestions: Ref<LocationCandidate[]>;
	destCitySuggestions: Ref<LocationCandidate[]>;
	destCapSuggestions: Ref<LocationCandidate[]>;
}

const normalizeSimpleText = (value: unknown): string => String(value || '').replace(/\s+/g, ' ').trim();

export const buildEmailSuggestion = (email: string): string | null => {
	const raw = String(email || '').trim().toLowerCase();
	if (!raw.includes('@')) return null;
	const [local, domain] = raw.split('@');
	if (!local || !domain) return null;

	const commonFixes: Record<string, string> = {
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

export const extractAddressAndNumber = (value: unknown): { street: string; number: string } | null => {
	const raw = normalizeSimpleText(value);
	if (!raw) return null;
	const match = raw.match(/^(.*?)[,\s]+(\d[a-z0-9\-/]*)$/i);
	if (!match) return null;
	const street = normalizeSimpleText(match[1]).replace(/[,\s]+$/g, '');
	const number = normalizeSimpleText(match[2]);
	if (!street || !number) return null;
	return { street, number };
};

export const useShipmentFormFieldAssist = ({
	deliveryMode,
	sv,
	applyLocationToSection,
	getSectionAddress,
	getFieldError,
	locationLinkHints,
	normalizeLocationText,
	originCitySuggestions,
	originCapSuggestions,
	destCitySuggestions,
	destCapSuggestions,
}: FieldAssistDeps) => {
	const getBestLocationCandidate = (section: string): LocationCandidate | null => {
		const addr = getSectionAddress(section);
		const cap = String(addr.postal_code || '').trim();
		const cityNorm = normalizeLocationText(addr.city || '');
		const provinceNorm = normalizeLocationText(addr.province || '');
		const cityList = section === 'origin' ? originCitySuggestions.value : destCitySuggestions.value;
		const capList = section === 'origin' ? originCapSuggestions.value : destCapSuggestions.value;
		const hintList = locationLinkHints[section] || [];

		// eslint-disable-next-line no-undef
		let pool = dedupeLocations([...(capList || []), ...(cityList || []), ...(hintList || [])]);
		if (!pool.length) return null;

		if (cap.length === 5) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const capMatches = pool.filter((loc: any) => String(loc.postal_code || '') === cap);
			if (capMatches.length) pool = capMatches;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		pool.sort((a: any, b: any) => {
			const aCity = normalizeLocationText(a.place_name);
			const bCity = normalizeLocationText(b.place_name);
			// eslint-disable-next-line no-undef
			const aProv = normalizeLocationText(getProvinceLabel(a));
			// eslint-disable-next-line no-undef
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

	const buildFieldAssist = (section: string, field: string): FieldAssist | null => {
		const error = getFieldError(section, field);
		if (!error) return null;

		const addr = getSectionAddress(section);
		const key = `${section}_${field}`;
		const isDestPudoAddress = section === 'dest' && deliveryMode.value === 'pudo' && ['address', 'address_number', 'city', 'province', 'postal_code'].includes(field);
		if (isDestPudoAddress) return null;

		if (field === 'full_name') {
			const current = String(addr.full_name || '');
			const cleaned = sv.autoCapitalize(current.replace(/\d/g, '').replace(/\s+/g, ' ').trim());
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
			const onlyDigits = current.replace(/\D/g, '').replace(/^39/, '');
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
			// eslint-disable-next-line no-undef
			const province = getProvinceLabel(candidate);
			const cap = String(candidate.postal_code || '').trim();

			const cityDiff = city && normalizeLocationText(city) !== normalizeLocationText(addr.city || '');
			const provinceDiff = province && normalizeLocationText(province) !== normalizeLocationText(addr.province || '');
			const capDiff = cap && cap !== String(addr.postal_code || '').trim();

			if (cityDiff || provinceDiff || capDiff) {
				const labelParts: string[] = [];
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

	const fieldAssistMap = computed<Record<string, FieldAssist | null>>(() => {
		const map: Record<string, FieldAssist | null> = {};
		const fields = ['full_name', 'address', 'address_number', 'city', 'province', 'postal_code', 'telephone_number', 'email'];
		['origin', 'dest'].forEach((section) => {
			fields.forEach((field) => {
				map[`${section}_${field}`] = buildFieldAssist(section, field);
			});
		});
		return map;
	});

	const getFieldAssist = (section: string, field: string): FieldAssist | null => fieldAssistMap.value[`${section}_${field}`] || null;

	const applyFieldAssist = (section: string, field: string): void => {
		const suggestion = getFieldAssist(section, field);
		if (!suggestion?.apply) return;
		suggestion.apply();
	};

	return {
		getFieldAssist,
		applyFieldAssist,
	};
};
