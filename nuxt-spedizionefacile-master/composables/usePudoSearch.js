/**
 * usePudoSearch.js
 * Thin orchestrator composable for PUDO search and selection.
 *
 * Composes:
 *   - usePudoSearchApi  (API calls, geocoding, coordinates, normalization, search)
 *   - usePudoMap         (UI interactions, display helpers, time ticker)
 *
 * Public API is unchanged — all return keys are identical to the original monolith.
 *
 * API usate:
 *   GET /api/brt/pudo/search
 *   GET /api/brt/pudo/nearby
 *   GET /api/brt/pudo/{id}
 *   Nominatim (geocode/reverse geocode)
 */
import { usePudoSearchApi } from "./usePudoSearchApi";
import { usePudoMap } from "./usePudoMap";

export function usePudoSearch(props, emit) {
	// ── API layer: search, geocoding, coordinates, normalization, results ──
	const api = usePudoSearchApi(props, emit);

	// ── UI layer: select/toggle, display helpers, time ticker ──
	const map = usePudoMap(
		{
			selectedPudoKey: api.selectedPudoKey,
			expandedPudoKey: api.expandedPudoKey,
			pudoDetails: api.pudoDetails,
			detailsErrors: api.detailsErrors,
			loadingDetailsKey: api.loadingDetailsKey,
			fetchPudoDetails: api.fetchPudoDetails,
		},
		emit,
	);

	// ── Return exact same public API as before ──
	return {
		// Search fields
		searchAddress: api.searchAddress,
		searchCity: api.searchCity,
		searchZip: api.searchZip,
		// State
		loading: api.loading,
		geolocating: api.geolocating,
		searched: api.searched,
		searchError: api.searchError,
		searchMeta: api.searchMeta,
		referenceUpdateMessage: api.referenceUpdateMessage,
		// Results
		pudoResults: api.pudoResults,
		selectedPudoKey: api.selectedPudoKey,
		expandedPudoKey: api.expandedPudoKey,
		loadingDetailsKey: api.loadingDetailsKey,
		pudoDetails: api.pudoDetails,
		detailsErrors: api.detailsErrors,
		mapClickLoading: api.mapClickLoading,
		// Computed
		hasSearchInput: api.hasSearchInput,
		mapPoints: api.mapPoints,
		mapReferencePoint: api.mapReferencePoint,
		strategyListLabel: api.strategyListLabel,
		// Actions
		searchPudo: api.searchPudo,
		useCurrentLocation: api.useCurrentLocation,
		onMapReferenceClick: api.onMapReferenceClick,
		selectPudo: map.selectPudo,
		toggleDetails: map.toggleDetails,
		// Display helpers
		distanceLabel: map.distanceLabel,
		getTodayHoursText: map.getTodayHoursText,
		getPudoStatus: map.getPudoStatus,
		formatOpeningHours: map.formatOpeningHours,
		// Timer lifecycle
		startNowTimer: map.startNowTimer,
		stopNowTimer: map.stopNowTimer,
	};
}
