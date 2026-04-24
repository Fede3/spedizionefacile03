/**
 * composables/useChartLogic.ts
 *
 * Helpers condivisi dai grafici admin (AdminConsoleAnalytics e futuri split).
 * Centralizza formatters e normalizzazione dati cosi' da evitare duplicazione
 * logica quando il componente verra' spezzato in Orders/Revenue/Status charts.
 *
 * Esporta un singolo `useChartLogic()` che restituisce funzioni pure —
 * nessuno stato reattivo interno, per poter essere usato sia in <script setup>
 * che in utility non-componenti.
 */

type NumericLike = number | string | null | undefined;

interface RawSeriesPoint {
	date?: string | Date | null;
	count?: NumericLike;
	value?: NumericLike;
	orders?: NumericLike;
	amount?: NumericLike;
	revenue?: NumericLike;
}

interface NormalizedPoint {
	key: string;
	label: string;
	fullLabel: string;
	value: number;
	date: string | null;
}

interface RawStatusItem {
	status?: string;
	key?: string;
	label?: string;
	count?: NumericLike;
	value?: NumericLike;
}

interface ChartSegment {
	key: string;
	label: string;
	count: number;
	share: number;
}

/**
 * Composable helpers per i grafici admin.
 * Tutte le funzioni sono pure: non memorizzano stato fra chiamate.
 */
export function useChartLogic() {
	/**
	 * Converte un qualsiasi input numerico (string, null, undefined) in un numero
	 * finito. Fallback a 0 per valori non parseabili — evita NaN nei grafici.
	 */
	const toNumber = (value: NumericLike): number => {
		const n = Number(value ?? 0);
		return Number.isFinite(n) ? n : 0;
	};

	/**
	 * Formatta un importo in centesimi come stringa EUR italiana.
	 * Esempio: 1999 -> "19,99 €".
	 */
	const formatCurrency = (cents: NumericLike): string => {
		const euros = toNumber(cents) / 100;
		return new Intl.NumberFormat('it-IT', {
			style: 'currency',
			currency: 'EUR',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(euros);
	};

	/**
	 * Versione compatta: sopra 1000€ elide i decimali ("1.250 €"),
	 * sotto mantiene 2 decimali. Utile per label di assi e card riassuntive.
	 */
	const formatCurrencyShort = (cents: NumericLike): string => {
		const euros = toNumber(cents) / 100;
		if (euros >= 1000) {
			return new Intl.NumberFormat('it-IT', {
				style: 'currency',
				currency: 'EUR',
				minimumFractionDigits: 0,
				maximumFractionDigits: 0,
			}).format(euros);
		}
		return formatCurrency(cents);
	};

	/**
	 * Percentuale clampata in [0, 1] e formattata come "42%".
	 */
	const formatPercentage = (value: NumericLike): string => {
		return new Intl.NumberFormat('it-IT', {
			style: 'percent',
			maximumFractionDigits: 0,
		}).format(Math.max(0, Math.min(1, toNumber(value))));
	};

	/**
	 * Intero formattato alla italiana (separatori migliaia). Usato per conteggi.
	 */
	const formatInteger = (value: NumericLike): string => {
		return new Intl.NumberFormat('it-IT', {
			maximumFractionDigits: 0,
		}).format(Math.round(toNumber(value)));
	};

	/**
	 * Data breve: "17/4". Se il valore non e' parseabile restituisce
	 * "{fallbackIndex + 1}/4" cosi' il grafico resta leggibile.
	 */
	const formatDateShort = (value: string | Date | null | undefined, fallbackIndex = 0): string => {
		if (!value) return `${fallbackIndex + 1}/4`;
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return `${fallbackIndex + 1}/4`;
		return new Intl.DateTimeFormat('it-IT', {
			day: 'numeric',
			month: 'numeric',
		}).format(date);
	};

	/**
	 * Data lunga: "17 apr". Usata nei tooltip e fullLabel.
	 */
	const formatDate = (value: string | Date | null | undefined, fallbackIndex = 0): string => {
		if (!value) return `Giorno ${fallbackIndex + 1}`;
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return `Giorno ${fallbackIndex + 1}`;
		return new Intl.DateTimeFormat('it-IT', {
			day: 'numeric',
			month: 'short',
		}).format(date);
	};

	/**
	 * Normalizza una serie temporale (ordini o ricavi) estraendo ultimi 30 punti
	 * e uniformando label + date. Input eterogeneo tollerato: il backend a volte
	 * espone `count`, altre `value`, altre ancora `orders` o `amount`.
	 */
	const normalizeChartData = (data: RawSeriesPoint[] | null | undefined): NormalizedPoint[] => {
		const series = Array.isArray(data) ? data : [];
		return series.slice(-30).map((item, index) => ({
			key: item?.date ? String(item.date) : `day-${index}`,
			label: formatDateShort(item?.date, index),
			fullLabel: formatDate(item?.date, index),
			value: toNumber(item?.count ?? item?.value ?? item?.orders ?? item?.amount ?? item?.revenue),
			date: item?.date ? String(item.date) : null,
		}));
	};

	/**
	 * Calcola il totale delle quote (share) per un donut/pie chart partendo da
	 * conteggi grezzi. Ritorna segmenti con share in [0,1] e total normalizzato.
	 */
	const computeSegments = (items: RawStatusItem[] | null | undefined): ChartSegment[] => {
		const raw = Array.isArray(items) ? items : [];
		const normalized = raw.map((item, index) => {
			const key = (item?.status || item?.key || item?.label || `status-${index}`)
				.toString()
				.toLowerCase()
				.replace(/\s+/g, '_');
			const count = toNumber(item?.count ?? item?.value ?? 0);
			return {
				key,
				label: (item?.label || item?.status || key).toString(),
				count,
				share: 0,
			};
		});

		const total = normalized.reduce((sum, item) => sum + item.count, 0);
		if (total <= 0) return normalized;

		return normalized.map((item) => ({
			...item,
			share: item.count / total,
		}));
	};

	return {
		toNumber,
		formatCurrency,
		formatCurrencyShort,
		formatPercentage,
		formatInteger,
		formatDate,
		formatDateShort,
		normalizeChartData,
		computeSegments,
	};
}

export type { NormalizedPoint, ChartSegment, RawSeriesPoint, RawStatusItem };
