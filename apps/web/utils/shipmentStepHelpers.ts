/**
 * Helper puri usati dalla pagina /la-tua-spedizione/[step].vue.
 * Estratti per ridurre LOC del page orchestrator senza toccare UI/reactivity.
 *
 * NOTA: zero dipendenze Vue/Pinia/Nuxt. Pure functions testabili in isolamento.
 */

const SENTINEL_VALUES = new Set(['n/d', 'nd', '-', '—', 'null', 'undefined']);

/**
 * Normalizza una stringa di summary pagamento: trim, collapse whitespace,
 * scarta sentinel ("n/d", "—", "null"…). Ritorna stringa vuota se non valido.
 */
export function cleanPaymentSummaryText(value: unknown): string {
	const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
	if (!normalized) return '';
	return SENTINEL_VALUES.has(normalized.toLowerCase()) ? '' : normalized;
}

/**
 * Formatta una data ordine esistente in formato it-IT (gg/mm/aaaa).
 * Ritorna la stringa raw normalizzata se la data non è parsabile.
 */
export function formatExistingOrderDate(value: unknown): string {
	const raw = cleanPaymentSummaryText(value);
	if (!raw) return '';

	const date = new Date(raw);
	if (!Number.isNaN(date.getTime())) {
		return new Intl.DateTimeFormat('it-IT', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
		}).format(date);
	}
	return raw;
}

export interface PaymentAddress {
	full_name: string;
	name: string;
	address: string;
	address_number: string;
	postal_code: string;
	city: string;
	province: string;
	country: string;
	telephone_number?: string;
	email?: string;
	additional_information?: string;
}

type PaymentAddressInput = Partial<PaymentAddress> & Record<string, unknown>;
type ExistingOrderPackage = Record<string, unknown> & {
	pivot?: { quantity?: unknown };
};
type ApiErrorLike = {
	response?: { _data?: { message?: string } };
	data?: { message?: string };
	message?: string;
};

/**
 * Address vuoto usato come fallback durante hydration SSR (evita
 * mismatch markup quando il summary non è ancora pronto).
 */
export function buildEmptyPaymentAddress(): PaymentAddress {
	return {
		full_name: '',
		name: '',
		address: '',
		address_number: '',
		postal_code: '',
		city: '',
		province: '',
		country: '',
	};
}

/**
 * Normalizza un address proveniente da un Order esistente: tutti i campi
 * passano per cleanPaymentSummaryText, country fallback "Italia".
 */
const addressField = (address: PaymentAddressInput, key: keyof PaymentAddress) =>
	cleanPaymentSummaryText(address[key]);

export function normalizeExistingOrderAddress(address: PaymentAddressInput = {}): PaymentAddress {
	return {
		full_name: cleanPaymentSummaryText(address.full_name || address.name),
		name: cleanPaymentSummaryText(address.name || address.full_name),
		address: addressField(address, 'address'),
		address_number: addressField(address, 'address_number'),
		postal_code: addressField(address, 'postal_code'),
		city: addressField(address, 'city'),
		province: addressField(address, 'province'),
		country: cleanPaymentSummaryText(address.country || 'Italia'),
		telephone_number: addressField(address, 'telephone_number'),
		email: addressField(address, 'email'),
		additional_information: addressField(address, 'additional_information'),
	};
}

/**
 * Quantità di un collo "ordine esistente": prende quantity o pivot.quantity,
 * minimo 1 (un pacco c'è sempre).
 */
export function getExistingOrderPackageQuantity(pack: ExistingOrderPackage): number {
	return Math.max(1, Number(pack?.quantity ?? pack?.pivot?.quantity) || 1);
}

/**
 * Tipo di un collo (Pacco/Pallet/Valigia). Default "Pacco" se vuoto.
 */
export function getExistingOrderPackageType(pack: ExistingOrderPackage): string {
	return cleanPaymentSummaryText(pack?.package_type) || 'Pacco';
}

/**
 * Dimensioni di un collo come "AxBxC cm". Stringa vuota se manca un lato.
 */
export function getExistingOrderPackageDimensions(pack: ExistingOrderPackage): string {
	const side1 = Number(pack?.first_size ?? pack?.length);
	const side2 = Number(pack?.second_size ?? pack?.width);
	const side3 = Number(pack?.third_size ?? pack?.height);
	return [side1, side2, side3].every((side) => Number.isFinite(side) && side > 0)
		? `${side1}x${side2}x${side3} cm`
		: '';
}

/**
 * Estrae il messaggio di errore da un errore $fetch / Sanctum, con fallback.
 * Pattern: response._data.message → data.message → message → fallback.
 *
 * Accetta `unknown` per essere chiamabile direttamente da `catch (err)` senza
 * cast — il body fa narrowing runtime sulla shape effettiva del payload.
 */
export function resolveApiError(err: unknown, fallback: string): string {
	if (!err || typeof err !== 'object') return fallback;
	const source = err as ApiErrorLike;
	return source.response?._data?.message || source.data?.message || source.message || fallback;
}
