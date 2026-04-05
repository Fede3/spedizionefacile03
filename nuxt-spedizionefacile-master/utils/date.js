const ITALY_TIME_ZONE = 'Europe/Rome';
const INVALID_DATE_LABEL = 'Data non disponibile';

const createFormatter = (options) =>
	new Intl.DateTimeFormat('it-IT', {
		timeZone: ITALY_TIME_ZONE,
		...options,
	});

const dateFormatter = createFormatter({
	day: '2-digit',
	month: 'short',
	year: 'numeric',
});

const dateTimeFormatter = createFormatter({
	day: '2-digit',
	month: 'short',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
});

const toValidDate = (value) => {
	if (!value) return null;
	const parsed = value instanceof Date ? value : new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatWithFallback = (formatter, value, fallback = INVALID_DATE_LABEL) => {
	const parsed = toValidDate(value);
	return parsed ? formatter.format(parsed) : fallback;
};

export const formatDateIt = (value, fallback = INVALID_DATE_LABEL) => formatWithFallback(dateFormatter, value, fallback);

export const formatDateTimeIt = (value, fallback = INVALID_DATE_LABEL) => formatWithFallback(dateTimeFormatter, value, fallback);
