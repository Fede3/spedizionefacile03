/**
 * usePudoUtils — Funzioni pure di utility per i punti PUDO.
 *
 * Contiene: parsing coordinate, calcolo distanza Haversine,
 * normalizzazione punti, deduplicazione, ordinamento,
 * parsing e formattazione orari, stato aperto/chiuso.
 */

// ── Parsing coordinate ──────────────────────────────────────────
export const parseCoordinate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseFloat(String(value).trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

export const extractLatitude = (point = {}) =>
  parseCoordinate(
    point.latitude ?? point.lat ??
    point?.coordinates?.latitude ?? point?.coordinates?.lat ??
    point?.coordinate?.latitude ?? point?.coordinate?.lat ??
    point?.geo?.latitude ?? point?.geo?.lat ??
    point?.location?.latitude ?? point?.location?.lat ??
    point?.address_coordinates?.latitude ?? point?.address_coordinates?.lat
  );

export const extractLongitude = (point = {}) =>
  parseCoordinate(
    point.longitude ?? point.lng ?? point.lon ??
    point?.coordinates?.longitude ?? point?.coordinates?.lng ?? point?.coordinates?.lon ??
    point?.coordinate?.longitude ?? point?.coordinate?.lng ?? point?.coordinate?.lon ??
    point?.geo?.longitude ?? point?.geo?.lng ?? point?.geo?.lon ??
    point?.location?.longitude ?? point?.location?.lng ?? point?.location?.lon ??
    point?.address_coordinates?.longitude ?? point?.address_coordinates?.lng ?? point?.address_coordinates?.lon
  );

export const isFiniteCoordinate = (value) => Number.isFinite(parseCoordinate(value));

export const parseDistanceMeters = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const raw = String(value).trim().toLowerCase();
  const cleaned = raw.replace(',', '.').replace(/[^\d.-]/g, '');
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return null;
  if (raw.includes('km')) return Math.round(parsed * 1000);
  return Math.round(parsed);
};

// ── Calcolo distanza Haversine ──────────────────────────────────
const toRadians = (deg) => deg * (Math.PI / 180);

export const distanceInMeters = (from, to) => {
  if (!from || !to) return null;
  const earthRadius = 6371000;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadius * c);
};

// ── UI key e normalizzazione ────────────────────────────────────
const normalizeTextKey = (value) => String(value || '').trim().toLowerCase();

export const getPudoUiKey = (point) => {
  const primary = String(point?.pudo_id || point?.carrier_pudo_id || point?.id || '').trim();
  if (primary) return primary;
  const lat = extractLatitude(point);
  const lng = extractLongitude(point);
  const latPart = Number.isFinite(lat) ? lat.toFixed(6) : 'na';
  const lngPart = Number.isFinite(lng) ? lng.toFixed(6) : 'na';
  return [
    normalizeTextKey(point?.name),
    normalizeTextKey(point?.address),
    normalizeTextKey(point?.zip_code),
    normalizeTextKey(point?.city),
    latPart,
    lngPart,
  ].join('|');
};

export const normalizePudoPoint = (rawPoint) => {
  const point = rawPoint || {};
  const id = point.pudo_id || point.carrier_pudo_id || point.id || '';
  const latitude = extractLatitude(point);
  const longitude = extractLongitude(point);
  const distance = parseDistanceMeters(
    point.distance_meters ?? point.distance ?? point.distance_text ?? point.distance_label
  );
  return {
    pudo_id: String(id),
    carrier_pudo_id: String(point.carrier_pudo_id || id || ''),
    ui_key: getPudoUiKey(point),
    provider: String(point.provider || 'BRT'),
    name: point.name || 'Punto di ritiro BRT',
    address: point.address || '',
    city: point.city || '',
    zip_code: point.zip_code || '',
    province: point.province || '',
    country: point.country || 'ITA',
    latitude,
    longitude,
    distance_meters: distance,
    enabled: typeof point.enabled === 'boolean' ? point.enabled : true,
    opening_hours: point.opening_hours || null,
    localization_hint: point.localization_hint || '',
  };
};

// ── Deduplicazione e ordinamento ────────────────────────────────
export const dedupePudoPoints = (points) => {
  const byKey = new Map();
  points.forEach((point) => {
    const key = getPudoUiKey(point);
    if (!byKey.has(key)) {
      byKey.set(key, point);
      return;
    }
    const current = byKey.get(key);
    const currentDist = Number.isFinite(Number(current.distance_meters))
      ? Number(current.distance_meters)
      : Number.POSITIVE_INFINITY;
    const incomingDist = Number.isFinite(Number(point.distance_meters))
      ? Number(point.distance_meters)
      : Number.POSITIVE_INFINITY;
    if (incomingDist < currentDist) byKey.set(key, point);
  });
  return Array.from(byKey.values());
};

export const sortByDistance = (points) =>
  [...points].sort((a, b) => {
    const aD = Number.isFinite(Number(a.distance_meters))
      ? Number(a.distance_meters)
      : Number.POSITIVE_INFINITY;
    const bD = Number.isFinite(Number(b.distance_meters))
      ? Number(b.distance_meters)
      : Number.POSITIVE_INFINITY;
    if (aD !== bD) return aD - bD;
    return String(a.name || '').localeCompare(String(b.name || ''), 'it', {
      sensitivity: 'base',
    });
  });

// ── Formattazione distanza ──────────────────────────────────────
export const formatDistance = (meters) => {
  const value = Number(meters);
  if (!Number.isFinite(value)) return '';
  if (value >= 1000) return `${(value / 1000).toFixed(1)} km`;
  return `${Math.round(value)} m`;
};

export const hasDistance = (pudo) => Number.isFinite(Number(pudo?.distance_meters));

export const distanceLabelFn = (pudo) => {
  if (hasDistance(pudo)) return formatDistance(pudo.distance_meters);
  return 'n/d';
};

// ── Parsing e formattazione orari ───────────────────────────────
export const splitHoursParts = (rawHours) => {
  if (!rawHours) return [];
  if (Array.isArray(rawHours))
    return rawHours.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof rawHours === 'object') {
    return Object.entries(rawHours)
      .map(([key, value]) => `${key}: ${value}`)
      .filter(Boolean);
  }
  return String(rawHours).split(/\n|\||;/g).map((item) => item.trim()).filter(Boolean);
};

const dayTokenMap = {
  0: ['dom', 'domenica', 'sun', 'sunday'],
  1: ['lun', 'lunedi', 'mon', 'monday'],
  2: ['mar', 'martedi', 'tue', 'tuesday'],
  3: ['mer', 'mercoledi', 'wed', 'wednesday'],
  4: ['gio', 'giovedi', 'thu', 'thursday'],
  5: ['ven', 'venerdi', 'fri', 'friday'],
  6: ['sab', 'sabato', 'sat', 'saturday'],
};

export const extractTodayHours = (rawHours, nowTick) => {
  const dayTokens = dayTokenMap[new Date(nowTick).getDay()] || [];
  const parts = splitHoursParts(rawHours);
  if (!parts.length) return '';
  const dayMatches = parts.filter((part) =>
    dayTokens.some((token) => part.toLowerCase().includes(token))
  );
  if (dayMatches.length) return dayMatches.join(' | ');
  if (parts.length === 1) return parts[0];
  return '';
};

const parseHourToMinutes = (hourText) => {
  const normalized = String(hourText || '').trim().replace('.', ':');
  const match = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

export const isCurrentlyOpen = (hoursText, nowTick) => {
  if (!hoursText) return null;
  const lower = hoursText.toLowerCase();
  if (lower.includes('chiuso')) return false;
  const ranges = [
    ...hoursText.matchAll(
      /(\d{1,2}[:.]\d{2})\s*[-\u2013]\s*(\d{1,2}[:.]\d{2})/g
    ),
  ];
  if (!ranges.length) return null;
  const now = new Date(nowTick);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return ranges.some((range) => {
    const start = parseHourToMinutes(range[1]);
    const end = parseHourToMinutes(range[2]);
    if (start === null || end === null) return false;
    return nowMinutes >= start && nowMinutes <= end;
  });
};

export const formatOpeningHoursFn = (hours) => {
  if (!hours) return '';
  if (typeof hours === 'string') return hours;
  if (Array.isArray(hours)) return hours.join(' | ');
  if (typeof hours === 'object') {
    return Object.entries(hours)
      .map(([day, value]) => `${day}: ${value}`)
      .join(' | ');
  }
  return '';
};
