<!--
	COMPONENTE: MapPudo (MapPudo.client.vue)
	SCOPO: Mappa interattiva Leaflet per visualizzare e selezionare i punti PUDO.

	DOVE SI USA: components/PudoSelector.vue
	PROPS: points (Array di punti PUDO con lat/lng), selectedId (String), referencePoint (Object)
	EMITS: @select(pudo) — quando l'utente clicca un marker sulla mappa

	Il suffisso .client.vue fa sì che Nuxt lo renda solo lato client (Leaflet richiede window/document).
-->
<script setup>
// Import espliciti: necessari in .client.vue per inizializzazione corretta di Leaflet
import { LMap, LMarker, LIcon, LPopup, LTileLayer } from '@vue-leaflet/vue-leaflet';
import 'leaflet/dist/leaflet.css';

const props = defineProps({
	points: { type: Array, default: () => [] },
	selectedId: { type: String, default: null },
	referencePoint: { type: Object, default: null },
});

const emit = defineEmits(['select']);

const mapRef = ref(null);
const mapReady = ref(false);
let invalidateTimer = null;

// Centro di default: Italia
const defaultCenter = [41.9028, 12.4964];
const defaultZoom = 6;

const parsedReferencePoint = computed(() => {
	const latitude = Number.parseFloat(props.referencePoint?.latitude);
	const longitude = Number.parseFloat(props.referencePoint?.longitude);
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
	return {
		latitude,
		longitude,
		address: props.referencePoint?.address || '',
		city: props.referencePoint?.city || '',
		zip_code: props.referencePoint?.zip_code || '',
		label: props.referencePoint?.label || '',
	};
});

// Calcola il centro della mappa in base ai punti disponibili
const mapCenter = computed(() => {
	if (parsedReferencePoint.value) {
		return [parsedReferencePoint.value.latitude, parsedReferencePoint.value.longitude];
	}
	if (!props.points.length) return defaultCenter;
	const lats = props.points.filter(p => p.latitude && p.longitude).map(p => Number.parseFloat(p.latitude));
	const lngs = props.points.filter(p => p.latitude && p.longitude).map(p => Number.parseFloat(p.longitude));
	if (!lats.length) return defaultCenter;
	return [
		lats.reduce((a, b) => a + b, 0) / lats.length,
		lngs.reduce((a, b) => a + b, 0) / lngs.length,
	];
});

const mapZoom = computed(() => {
	if (parsedReferencePoint.value && !props.points.length) return 14;
	return props.points.length ? 13 : defaultZoom;
});

// Quando cambiano punti/riferimento, adatta la vista della mappa
watch([() => props.points, () => props.referencePoint], ([pts]) => {
	if (!mapRef.value?.leafletObject) return;
	const validPts = pts
		.filter(p => p.latitude && p.longitude)
		.map(p => [Number.parseFloat(p.latitude), Number.parseFloat(p.longitude)])
		.filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
	const ref = parsedReferencePoint.value;
	const allBounds = ref ? [[ref.latitude, ref.longitude], ...validPts] : validPts;
	if (!allBounds.length) return;

	nextTick(() => {
		try {
			const map = mapRef.value.leafletObject;
			map.invalidateSize({ animate: false });
			if (allBounds.length === 1) {
				map.setView(allBounds[0], ref ? 14 : 13, { animate: true });
				return;
			}
			map.fitBounds(allBounds, { padding: [40, 40], maxZoom: 15 });
		} catch { /* ignore */ }
	});
}, { immediate: true, deep: true });

// Quando cambia il punto selezionato, centra la mappa su di esso
watch(() => props.selectedId, (id) => {
	if (!id || !mapRef.value?.leafletObject) return;
	const point = props.points.find(p => String(p.pudo_id) === String(id));
	if (point?.latitude && point?.longitude) {
		mapRef.value.leafletObject.setView(
			[Number.parseFloat(point.latitude), Number.parseFloat(point.longitude)],
			15,
			{ animate: true }
		);
	}
});

const onMapReady = () => {
	mapReady.value = true;
	// Invalida la size dopo mount: evita mappe bianche quando il contenitore
	// viene creato dinamicamente dopo la ricerca PUDO.
	// Delay piu' lungo: il container potrebbe non avere ancora le dimensioni
	// definitive quando sticky + Tailwind finiscono di applicare gli stili
	invalidateTimer = window.setTimeout(() => {
		try {
			mapRef.value?.leafletObject?.invalidateSize({ animate: false });
		} catch {
			// no-op
		}
	}, 300);
};

const selectPoint = (pudo) => {
	emit('select', pudo);
};

onBeforeUnmount(() => {
	if (invalidateTimer) {
		clearTimeout(invalidateTimer);
		invalidateTimer = null;
	}
	// Destroy the Leaflet instance to prevent "Cannot read properties of null" during unmount
	try {
		const map = mapRef.value?.leafletObject;
		if (map) {
			map.off();
			map.remove();
		}
	} catch {
		// no-op — map already destroyed
	}
	mapRef.value = null;
});
</script>

<template>
	<div class="relative w-full h-full min-h-[300px] rounded-[12px] overflow-hidden border border-[#D0D0D0]">
		<LMap
			ref="mapRef"
			:zoom="mapZoom"
			:center="mapCenter"
			:use-global-leaflet="false"
			class="w-full h-full"
			style="min-height: 300px; z-index: 0;"
			@ready="onMapReady"
		>
			<LTileLayer
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>"
				layer-type="base"
				name="OpenStreetMap"
			/>

			<!-- Marker di riferimento: posizione geolocalizzata o via/civico inseriti -->
			<LMarker
				v-if="parsedReferencePoint"
				:lat-lng="[parsedReferencePoint.latitude, parsedReferencePoint.longitude]">
				<LIcon
					:icon-size="[32, 44]"
					:icon-anchor="[16, 44]"
					:popup-anchor="[0, -38]"
					class-name="pudo-reference-marker-icon">
					<div class="w-[32px] h-[32px] rounded-full bg-[#E44203] border-[3px] border-white shadow-[0_6px_18px_rgba(228,66,3,0.45)] flex items-center justify-center">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
							<path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" />
							<circle cx="12" cy="9" r="2.5" />
						</svg>
					</div>
					<div
						class="w-0 h-0 mx-auto -mt-[1px]"
						:style="{
							borderLeft: '8px solid transparent',
							borderRight: '8px solid transparent',
							borderTop: '10px solid #E44203',
						}"
					/>
				</LIcon>

				<LPopup :options="{ closeButton: true, maxWidth: 280 }">
					<div class="text-[0.8125rem] leading-[1.4]">
						<p class="font-bold text-[#252B42] text-[0.875rem]">Punto di riferimento</p>
						<p v-if="parsedReferencePoint.label" class="text-[#737373] mt-[2px]">{{ parsedReferencePoint.label }}</p>
						<p v-else class="text-[#737373] mt-[2px]">
							{{ [parsedReferencePoint.address, [parsedReferencePoint.zip_code, parsedReferencePoint.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') }}
						</p>
					</div>
				</LPopup>
			</LMarker>

			<LMarker
				v-for="pudo in points.filter(p => p.latitude && p.longitude)"
				:key="pudo.pudo_id"
				:lat-lng="[Number.parseFloat(pudo.latitude), Number.parseFloat(pudo.longitude)]"
				@click="selectPoint(pudo)"
			>
				<LIcon
					:icon-size="String(pudo.pudo_id) === String(selectedId) ? [36, 46] : [28, 38]"
					:icon-anchor="String(pudo.pudo_id) === String(selectedId) ? [18, 46] : [14, 38]"
					:popup-anchor="[0, -40]"
					class-name="pudo-marker-icon"
				>
					<div
						class="flex items-center justify-center rounded-full shadow-lg transition-all duration-200"
						:class="String(pudo.pudo_id) === String(selectedId)
							? 'w-[36px] h-[36px] bg-[#095866] ring-4 ring-[#095866]/30'
							: 'w-[28px] h-[28px] bg-white border-[3px] border-[#095866] hover:bg-[#095866] hover:border-[#095866]'"
						:style="String(pudo.pudo_id) === String(selectedId) ? '' : ''"
					>
						<svg
							v-if="String(pudo.pudo_id) === String(selectedId)"
							width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
						><polyline points="20 6 9 17 4 12"/></svg>
						<div
							v-else
							class="w-[10px] h-[10px] rounded-full bg-[#095866]"
						/>
					</div>
					<!-- Punta triangolare sotto il marker -->
					<div
						class="w-0 h-0 mx-auto -mt-[1px]"
						:style="{
							borderLeft: '8px solid transparent',
							borderRight: '8px solid transparent',
							borderTop: String(pudo.pudo_id) === String(selectedId)
								? '10px solid #095866'
								: '10px solid #095866'
						}"
					/>
				</LIcon>

				<LPopup :options="{ closeButton: true, maxWidth: 250 }">
					<div class="text-[0.8125rem] leading-[1.4]">
						<p class="font-bold text-[#252B42] text-[0.875rem]">{{ pudo.name }}</p>
						<p class="text-[#737373] mt-[2px]">{{ pudo.address }}</p>
						<p class="text-[#737373]">{{ pudo.zip_code }} {{ pudo.city }}</p>
						<p v-if="pudo.distance_meters" class="text-[#095866] font-semibold mt-[4px]">
							Distanza: {{ pudo.distance_meters >= 1000 ? (pudo.distance_meters / 1000).toFixed(1) + ' km' : Math.round(pudo.distance_meters) + ' m' }}
						</p>
						<button
							type="button"
							class="mt-[8px] w-full py-[6px] bg-[#095866] text-white text-[0.8125rem] font-semibold rounded-[6px] hover:bg-[#074a56] transition cursor-pointer"
							@click.stop="selectPoint(pudo)"
						>
							Seleziona questo punto
						</button>
					</div>
				</LPopup>
			</LMarker>
		</LMap>

		<div
			v-if="!mapReady"
			class="absolute inset-0 flex items-center justify-center bg-[#F8F9FB]/90 text-[#737373] text-[0.875rem]">
			Caricamento mappa...
		</div>
	</div>
</template>

<style>
/* Fix: Leaflet CSS per i marker custom con LIcon slot */
.pudo-marker-icon {
	background: none !important;
	border: none !important;
}

.pudo-reference-marker-icon {
	background: none !important;
	border: none !important;
}
</style>
