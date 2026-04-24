import { formatEuro } from '~/utils/price.js';

/**
 * @typedef {Object} PackageLike
 * @property {number|string|null} [single_price]
 * @property {number|string|null} [single_priceOrig]
 * @property {number|string|null} [weight_price]
 * @property {number|string|null} [volume_price]
 * @property {number|string|null} [quantity]
 * @property {string} [package_type]
 * @property {number|string|null} [first_size]
 * @property {number|string|null} [second_size]
 * @property {number|string|null} [third_size]
 * @property {number|string|null} [length]
 * @property {number|string|null} [width]
 * @property {number|string|null} [height]
 */

/** @type {Record<string, { label: string, icon: string }>} */
export const packageTypeVisualMap = {
	pacco: { label: 'Pacco', icon: '/img/quote/first-step/pack.png' },
	pallet: { label: 'Pallet', icon: '/img/quote/first-step/pallet.png' },
	valigia: { label: 'Valigia', icon: '/img/quote/first-step/suitcase.png' },
	busta: { label: 'Busta', icon: '/img/quote/first-step/envelope.png' },
	wallet: { label: 'Wallet', icon: '/img/quote/first-step/suitcase.png' },
};

const VISUAL_MAP_LOOKUP = packageTypeVisualMap;

/** Parsa un importo da varie rappresentazioni (numero, stringa IT/EN). */
export const parsePriceAmount = (value) => {
	if (value === null || value === undefined) return null;
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null;
	}

	const raw = String(value).trim();
	if (!raw) return null;

	let normalized = raw.replace(/[\u20AC\s]/g, '');
	if (normalized.includes(',') && normalized.includes('.')) {
		if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
			normalized = normalized.replace(/\./g, '').replace(',', '.');
		} else {
			normalized = normalized.replace(/,/g, '');
		}
	} else if (normalized.includes(',')) {
		normalized = normalized.replace(',', '.');
	}

	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
};

/** Formatta un numero come euro. */
export const formatPriceAmount = (amount) => formatEuro(amount);

/** Sceglie il miglior candidato di prezzo tra più valori. */
export const pickBestPriceAmount = (candidates) => {
	const valid = candidates.filter((value) => value !== null && Number.isFinite(value));
	const positive = valid.find((value) => value > 0);
	if (positive !== undefined) return positive;
	return valid.length ? (valid[0] ?? 0) : 0;
};

/** Normalizza un prezzo pacco (cents -> euro se serve). */
export const normalizePackagePrice = (rawAmount) => {
	const amount = Number(rawAmount) || 0;
	if (!amount) return 0;
	return amount > 1000 ? amount / 100 : amount;
};

/** Calcola il totale di una riga pacco in base ai prezzi disponibili. */
export const getPackageLineAmount = (pack) => {
	const single = parsePriceAmount(pack?.single_price);
	if (single !== null && single > 0) return normalizePackagePrice(single);

	const singleOrig = parsePriceAmount(pack?.single_priceOrig);
	if (singleOrig !== null && singleOrig > 0) return normalizePackagePrice(singleOrig);

	const weightPrice = parsePriceAmount(pack?.weight_price) || 0;
	const volumePrice = parsePriceAmount(pack?.volume_price) || 0;
	const base = Math.max(weightPrice, volumePrice);
	if (base <= 0) return 0;

	const qty = Number(pack?.quantity) || 1;
	return base * qty;
};

/** Somma il totale di tutti i pacchi. */
export const getPackagesTotal = (packages) => {
	if (!Array.isArray(packages) || !packages.length) return null;
	const total = packages.reduce((sum, pack) => sum + getPackageLineAmount(pack), 0);
	return total > 0 ? total : null;
};

/** Normalizza la label del tipo pacco (lowercase, trim). */
export const normalizePackageTypeLabel = (value) => {
	if (!value) return 'pacco';
	return String(value).trim().toLowerCase();
};

/** Restituisce la label visuale del tipo pacco. */
export const getPackageTypeLabel = (pack) => {
	const normalized = normalizePackageTypeLabel(pack?.package_type || 'Pacco');
	const mapped = VISUAL_MAP_LOOKUP[normalized];
	if (mapped?.label) return mapped.label;
	return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Pacco';
};

/** Restituisce l'icona del tipo pacco. */
export const getPackageTypeIcon = (pack) => {
	const normalized = normalizePackageTypeLabel(pack?.package_type || 'Pacco');
	const mapped = VISUAL_MAP_LOOKUP[normalized];
	return mapped?.icon || packageTypeVisualMap.pacco.icon;
};

/** Normalizza un valore dimensione (cm) validando positività. */
export const normalizeDimensionValue = (value) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

/** Compone la label delle dimensioni del pacco (es. 30x20x10 cm). */
export const getPackageDimensionLabel = (pack) => {
	const side1 = normalizeDimensionValue(pack?.first_size ?? pack?.length);
	const side2 = normalizeDimensionValue(pack?.second_size ?? pack?.width);
	const side3 = normalizeDimensionValue(pack?.third_size ?? pack?.height);
	if (!side1 || !side2 || !side3) return null;
	return `${side1}×${side2}×${side3} cm`;
};

/** Risolve la coppia {label, icon} per il riassunto della miscela di tipi pacco. */
export const resolvePackageTypeInfoForList = (packages) => {
	const types = (packages || [])
		.map((pack) => normalizePackageTypeLabel(pack?.package_type || 'Pacco'))
		.filter(Boolean);

	if (!types.length) {
		return packageTypeVisualMap.pacco;
	}

	const uniqueTypes = [...new Set(types)];
	if (uniqueTypes.length === 1) {
		const firstType = uniqueTypes[0] ?? 'pacco';
		const match = VISUAL_MAP_LOOKUP[firstType];
		if (match) return match;

		const label = firstType.charAt(0).toUpperCase() + firstType.slice(1);
		return { label, icon: packageTypeVisualMap.pacco.icon };
	}

	return { label: 'Misto', icon: packageTypeVisualMap.pacco.icon };
};
