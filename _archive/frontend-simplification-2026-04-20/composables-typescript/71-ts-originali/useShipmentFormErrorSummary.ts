// useShipmentFormErrorSummary — ordina/raggruppa/umanizza errori step indirizzi.
// Espone FIELD_ERROR_ORDER / LABELS / IDS + computed (formErrorSummary, groupedFormErrors, hints).
import type { Ref } from 'vue';

export interface FormErrorItem {
	key: string;
	message: string;
	label: string;
	targetId: string;
}

export interface GroupedErrors {
	origin: FormErrorItem[];
	dest: FormErrorItem[];
	generic: FormErrorItem[];
}

export const FIELD_ERROR_ORDER: string[] = [
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

export const FIELD_ERROR_LABELS: Record<string, string> = {
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

export const FIELD_ERROR_IDS: Record<string, string> = {
	origin_full_name: 'name',
	origin_address: 'address',
	origin_address_number: 'address_number',
	origin_city: 'city',
	origin_province: 'province',
	origin_postal_code: 'postal_code',
	origin_telephone_number: 'telephone',
	origin_email: 'email',
	dest_full_name: 'dest_name',
	dest_address: 'dest_address',
	dest_address_number: 'dest_address_number',
	dest_city: 'dest_city',
	dest_province: 'dest_province',
	dest_postal_code: 'dest_postal_code',
	dest_telephone_number: 'dest_telephone',
	dest_email: 'dest_email',
};

/** Riformula i messaggi tecnici in linguaggio user-friendly italiano. */
export const softenErrorMessage = (message: string | null | undefined): string => {
	const raw = String(message || '').trim();
	if (!raw) return '';

	const exactMap: Record<string, string> = {
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

interface SummaryDeps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	sv: any;
	contentError: Ref<string | null>;
}

/** Crea i computed di sintesi / raggruppamento / section hints da `sv.errors`. */
export const useShipmentFormErrorSummary = ({ sv, contentError }: SummaryDeps) => {
	const formErrorSummary = computed<FormErrorItem[]>(() => {
		const errors = sv.errors?.value || {};
		const keys = Object.keys(errors || {}).sort((a: string, b: string) => {
			const aIndex = FIELD_ERROR_ORDER.indexOf(a);
			const bIndex = FIELD_ERROR_ORDER.indexOf(b);
			return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
		});

		return keys
			.filter((key: string) => Boolean(errors[key]))
			.map((key: string) => ({
				key,
				message: softenErrorMessage(errors[key]),
				label: FIELD_ERROR_LABELS[key] || key,
				targetId: FIELD_ERROR_IDS[key] || '',
			}));
	});

	const groupedFormErrors = computed<GroupedErrors>(() => {
		const groups: GroupedErrors = { origin: [], dest: [], generic: [] };
		for (const item of formErrorSummary.value) {
			if (item.key.startsWith('origin_')) groups.origin.push(item);
			else if (item.key.startsWith('dest_')) groups.dest.push(item);
			else groups.generic.push(item);
		}
		return groups;
	});

	const sectionsWithErrorsCount = computed<number>(() => {
		let count = 0;
		if (groupedFormErrors.value.origin.length) count += 1;
		if (groupedFormErrors.value.dest.length) count += 1;
		if (groupedFormErrors.value.generic.length) count += 1;
		return count;
	});

	const showGlobalFormSummary = computed(() => formErrorSummary.value.length > 1 && sectionsWithErrorsCount.value > 1);

	const originSectionHint = computed<string>(() => {
		const errors = groupedFormErrors.value.origin;
		if (!errors.length) return '';
		if (errors.length === 1) return `${errors[0].label}: ${errors[0].message}`;
		return `Controlla ${errors.length} campi nella sezione Partenza.`;
	});

	const destinationSectionHint = computed<string>(() => {
		const errors = groupedFormErrors.value.dest;
		if (!errors.length) return '';
		if (errors.length === 1) return `${errors[0].label}: ${errors[0].message}`;
		return `Controlla ${errors.length} campi nella sezione Destinazione.`;
	});

	const contentFieldHint = computed<string>(() => {
		if (!contentError.value) return '';
		return 'Ti ho portato qui perché manca il contenuto del pacco. Inseriscilo per continuare.';
	});

	return {
		formErrorSummary,
		groupedFormErrors,
		sectionsWithErrorsCount,
		showGlobalFormSummary,
		originSectionHint,
		destinationSectionHint,
		contentFieldHint,
	};
};
