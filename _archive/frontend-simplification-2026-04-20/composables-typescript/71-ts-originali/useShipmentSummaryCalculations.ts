import { formatEuro } from '~/utils/price.js';

export interface PackageLike {
	single_price?: number | string | null;
	single_priceOrig?: number | string | null;
	weight_price?: number | string | null;
	volume_price?: number | string | null;
	quantity?: number | string | null;
	package_type?: string;
	first_size?: number | string | null;
	second_size?: number | string | null;
	third_size?: number | string | null;
	length?: number | string | null;
	width?: number | string | null;
	height?: number | string | null;
}

export const packageTypeVisualMap = {
	pacco: { label: 'Pacco', icon: '/img/quote/first-step/pack.png' },
	pallet: { label: 'Pallet', icon: '/img/quote/first-step/pallet.png' },
	valigia: { label: 'Valigia', icon: '/img/quote/first-step/suitcase.png' },
	busta: { label: 'Busta', icon: '/img/quote/first-step/envelope.png' },
	wallet: { label: 'Wallet', icon: '/img/quote/first-step/suitcase.png' },
} as const satisfies Record<string, { label: string; icon: string }>;

type PackageTypeVisual = { label: string; icon: string };
const VISUAL_MAP_LOOKUP = packageTypeVisualMap as Record<string, PackageTypeVisual | undefined>;

export const parsePriceAmount = (value: unknown): number | null => {
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

export const formatPriceAmount = (amount: number): string => formatEuro(amount);

export const pickBestPriceAmount = (candidates: Array<number | null>): number => {
	const valid = candidates.filter((value): value is number => value !== null && Number.isFinite(value));
	const positive = valid.find((value) => value > 0);
	if (positive !== undefined) return positive;
	return valid.length ? (valid[0] ?? 0) : 0;
};

export const normalizePackagePrice = (rawAmount: unknown): number => {
	const amount = Number(rawAmount) || 0;
	if (!amount) return 0;
	return amount > 1000 ? amount / 100 : amount;
};

export const getPackageLineAmount = (pack: PackageLike): number => {
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

export const getPackagesTotal = (packages: PackageLike[] | undefined | null): number | null => {
	if (!Array.isArray(packages) || !packages.length) return null;
	const total = packages.reduce((sum, pack) => sum + getPackageLineAmount(pack), 0);
	return total > 0 ? total : null;
};

export const normalizePackageTypeLabel = (value: string | undefined | null): string => {
	if (!value) return 'pacco';
	return String(value).trim().toLowerCase();
};

export const getPackageTypeLabel = (pack: PackageLike): string => {
	const normalized = normalizePackageTypeLabel(pack?.package_type || 'Pacco');
	const mapped = VISUAL_MAP_LOOKUP[normalized];
	if (mapped?.label) return mapped.label;
	return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Pacco';
};

export const getPackageTypeIcon = (pack: PackageLike): string => {
	const normalized = normalizePackageTypeLabel(pack?.package_type || 'Pacco');
	const mapped = VISUAL_MAP_LOOKUP[normalized];
	return mapped?.icon || packageTypeVisualMap.pacco.icon;
};

export const normalizeDimensionValue = (value: unknown): number | null => {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const getPackageDimensionLabel = (pack: PackageLike): string | null => {
	const side1 = normalizeDimensionValue(pack?.first_size ?? pack?.length);
	const side2 = normalizeDimensionValue(pack?.second_size ?? pack?.width);
	const side3 = normalizeDimensionValue(pack?.third_size ?? pack?.height);
	if (!side1 || !side2 || !side3) return null;
	return `${side1}×${side2}×${side3} cm`;
};

/** Risolve la coppia {label, icon} per il riassunto della miscela di tipi pacco. */
export const resolvePackageTypeInfoForList = (packages: PackageLike[] | undefined | null): PackageTypeVisual => {
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
