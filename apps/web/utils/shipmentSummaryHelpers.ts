/**
 * Helper puri usati da useShipmentStepSummary.ts.
 * Estratti per ridurre il composable da 737 LOC e renderlo
 * piu' scansionabile da un junior dev.
 *
 * NOTA: zero dipendenze Vue/Pinia. Pure functions testabili in isolamento.
 */

export type SummaryPackage = {
	single_price?: number | string | null
	single_priceOrig?: number | string | null
	weight_price?: number | string | null
	volume_price?: number | string | null
	quantity?: number | string | null
	[key: string]: unknown
}

const SENTINEL_VALUES = new Set(['n/d', 'nd', '—', '-', 'null', 'undefined']);

/**
 * Pulisce display text rimuovendo whitespace + scarta sentinel.
 * Accetta opzionalmente un normalizer custom (es. normalizeLocationText).
 */
export const cleanDisplayText = (
	value: unknown,
	normalizer?: (text: string) => string,
): string => {
	const raw = String(value ?? '').trim();
	if (!raw) return '';

	const normalized = typeof normalizer === 'function'
		? normalizer(raw)
		: raw.replace(/\s+/g, ' ').trim();
	const lowered = normalized.toLowerCase();

	return !normalized || SENTINEL_VALUES.has(lowered) ? '' : normalized;
};

/** Ritorna il primo candidate non sentinel. */
export const firstMeaningfulValue = (
	candidates: unknown[],
	normalizer?: (text: string) => string,
): string => {
	for (const candidate of candidates) {
		const normalized = cleanDisplayText(candidate, normalizer);
		if (normalized) return normalized;
	}
	return '';
};

/**
 * Parse importo in formato europeo (virgola decimale, euro) → number.
 * "12,50 €" / "1.234,56" / 12.5 → 12.5. Non parsable → null.
 */
export const parsePriceAmount = (value: unknown): number | null => {
	if (value === null || value === undefined) return null;
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null;
	}

	const raw = String(value).trim();
	if (!raw) return null;

	let normalized = raw.replace(/[€\s]/g, '');
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

/**
 * Formatta number → "11,90 €" con NBSP.
 * Pattern usato sitewide per il riepilogo pagamento.
 */
export const formatPriceAmount = (amount: unknown): string => {
	const n = Number(amount);
	if (!Number.isFinite(n)) return '0,00 €';
	return n.toFixed(2).replace('.', ',') + ' €';
};

/** Picca il primo candidato valido > 0, altrimenti il primo finito, altrimenti 0. */
export const pickBestPriceAmount = (candidates: Array<number | null>): number => {
	const valid = candidates.filter((value): value is number => value !== null && Number.isFinite(value));
	const positive = valid.find((value) => value > 0);
	if (positive !== undefined) return positive;
	return valid[0] ?? 0;
};

/**
 * Backend a volte ritorna prezzi in centesimi (>1000 = centesimi),
 * a volte in euro (<1000). Normalizza a euro.
 */
export const normalizePackagePrice = (rawAmount: unknown): number => {
	const amount = Number(rawAmount) || 0;
	if (!amount) return 0;
	return amount > 1000 ? amount / 100 : amount;
};

/** Importo riga collo: usa single_price > weight/volume_price * quantity. */
export const getPackageLineAmount = (pack: SummaryPackage): number => {
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

/** Somma totale colli (null se array vuoto o totale 0). */
export const getPackagesTotal = (packages?: SummaryPackage[] | null): number | null => {
	if (!Array.isArray(packages) || !packages.length) return null;
	const total = packages.reduce((sum, pack) => sum + getPackageLineAmount(pack), 0);
	return total > 0 ? total : null;
};
