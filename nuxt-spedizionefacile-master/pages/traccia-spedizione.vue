<!--
  FILE: pages/traccia-spedizione.vue
  SCOPO: Tracking spedizione — ricerca per codice BRT/ordine/riferimento, timeline stato.

  API: GET /api/tracking/search?code=XXX (ricerca unificata: ordine interno o codice BRT).
  COMPONENTI: nessuno (pagina standalone).
  ROUTE: /traccia-spedizione (pubblica).

  DATI IN INGRESSO: ?code=XXX (query param per precompilare e cercare automaticamente).
  DATI IN USCITA: risultato tracking con timeline e link a BRT esterno.

  VINCOLI: la ricerca usa $fetch diretto (non sanctumClient) perche' e' pubblica.
           Se la spedizione non e' nel DB, offre link diretto al tracking BRT.
  ERRORI TIPICI: confondere raw_status (chiave interna) con status (etichetta tradotta).
  PUNTI DI MODIFICA SICURI: timeline stati (statusTimeline), colori stato, testi UI.
  COLLEGAMENTI: pages/account/spedizioni/, controllers/TrackingController.php.
-->
<script setup>
// Meta tag SEO per la pagina di tracking
useSeoMeta({
	title: 'Traccia Spedizione | SpediamoFacile',
	ogTitle: 'Traccia Spedizione | SpediamoFacile',
	description: 'Traccia la tua spedizione in tempo reale con SpediamoFacile.',
	ogDescription: 'Traccia la tua spedizione in tempo reale con SpediamoFacile.',
});

const config = useRuntimeConfig();

// Legge il codice di tracking dall'URL (query string ?code=...)
const route = useRoute();
const trackingCode = ref(route.query.code || '');

// Stato della ricerca
const trackingResult = ref(null);
const trackingError = ref(null);
const isLoading = ref(false);

// Timeline degli stati della spedizione (in ordine cronologico)
const statusTimeline = [
	{ key: 'processing', label: 'Pagamento ricevuto', icon: 'card' },
	{ key: 'completed', label: 'Pronto per la spedizione', icon: 'check' },
	{ key: 'in_transit', label: 'In transito', icon: 'truck' },
	{ key: 'delivered', label: 'Consegnato', icon: 'flag' },
];

// Determina il progresso nella timeline in base allo stato corrente
const currentStepIndex = computed(() => {
	if (!trackingResult.value) return -1;
	const raw = trackingResult.value.raw_status;
	const idx = statusTimeline.findIndex(s => s.key === raw);
	return idx;
});

// Colori per lo stato
const statusColorClass = computed(() => {
	if (!trackingResult.value) return '';
	const map = {
		pending: 'bg-yellow-100 text-yellow-700',
		processing: 'bg-blue-100 text-blue-700',
		completed: 'bg-emerald-100 text-emerald-700',
		in_transit: 'bg-blue-100 text-blue-700',
		delivered: 'bg-emerald-100 text-emerald-700',
		in_giacenza: 'bg-orange-100 text-orange-700',
		payment_failed: 'bg-red-100 text-red-700',
		cancelled: 'bg-gray-100 text-gray-700',
	};
	return map[trackingResult.value.raw_status] || 'bg-gray-100 text-gray-700';
});

// Funzione che esegue il tracking della spedizione
const trackShipment = async () => {
	if (!trackingCode.value.trim()) return;
	trackingError.value = null;
	trackingResult.value = null;
	isLoading.value = true;

	try {
		const apiBase = config.public?.apiBase || config.public?.sanctum?.baseUrl || '';
		const response = await $fetch(`${apiBase}/api/tracking/search`, {
			params: { code: trackingCode.value.trim() },
			credentials: 'include',
		});

		if (response.found) {
			trackingResult.value = response;
		} else {
			// Spedizione non trovata nel database, offri link diretto a BRT
			trackingResult.value = null;
			trackingError.value = null;
			// Mostra il risultato "non trovato" con link a BRT
			trackingResult.value = {
				found: false,
				brt_tracking_url: response.brt_tracking_url,
				message: response.message,
			};
		}
	} catch (e) {
		trackingError.value = 'Errore durante la ricerca. Riprova tra qualche istante.';
	} finally {
		isLoading.value = false;
	}
};

// Se il codice viene passato via URL, cerca automaticamente
onMounted(() => {
	if (trackingCode.value) {
		trackShipment();
	}
});
</script>

<template>
	<section class="min-h-[500px] py-[40px] desktop:py-[60px]">
		<div class="my-container">
			<div class="sf-page-intro sf-page-intro--center mb-[28px] tablet:mb-[32px]">
				<h1 class="sf-section-title">Traccia Spedizione</h1>
				<p class="sf-section-description mx-auto">Inserisci il codice di tracking BRT, il numero d'ordine o il riferimento mittente per seguire la tua spedizione.</p>
			</div>

			<!-- Form di ricerca -->
			<div class="bg-white rounded-[16px] p-[24px_20px] desktop:p-[32px] shadow-[0_14px_28px_rgba(20,37,48,0.06)] border border-[#E5EAEC]">
				<label for="tracking_code" class="form-label mb-[6px]">Codice di tracking</label>
				<div class="flex gap-[12px]">
					<input
						v-model="trackingCode"
						type="text"
						id="tracking_code"
						placeholder="es. 058802401600012345, SF-000042, 42..."
						class="flex-1 bg-[#F8F9FB] p-[12px_16px] border border-[#E9EBEC] rounded-[12px] text-[0.9375rem] placeholder:text-[#a0a0a0] focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] focus:outline-none"
						@keyup.enter="trackShipment" />
					<button
						type="button"
						@click="trackShipment"
						:disabled="isLoading || !trackingCode.trim()"
						class="btn-primary px-[24px] py-[12px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-[8px] text-[0.875rem]">
						<!-- Search icon SVG -->
						<svg v-if="!isLoading" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
						<!-- Loading spinner SVG -->
						<svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
						{{ isLoading ? 'Ricerca...' : 'Traccia' }}
					</button>
				</div>
				<p v-if="trackingError" class="text-red-500 text-[0.8125rem] mt-[8px]">{{ trackingError }}</p>
			</div>

			<!-- Risultato: spedizione trovata -->
			<div v-if="trackingResult && trackingResult.found" class="mt-[24px] bg-white rounded-[16px] p-[24px_20px] desktop:p-[32px] shadow-[0_14px_28px_rgba(20,37,48,0.06)] border border-[#E5EAEC]">
				<!-- Header risultato -->
				<div class="flex items-center justify-between mb-[20px] flex-wrap gap-[10px]">
					<h2 class="text-[1.25rem] font-bold text-[#252B42]">Spedizione trovata</h2>
					<span :class="statusColorClass" class="px-[16px] py-[6px] rounded-full text-[0.875rem] font-semibold">
						{{ trackingResult.status }}
					</span>
				</div>

				<!-- Informazioni ordine -->
				<div class="grid grid-cols-1 desktop:grid-cols-2 gap-[16px] mb-[24px]">
					<div class="bg-[#F8F9FB] rounded-[14px] p-[16px]">
						<p class="text-[0.75rem] text-[#737373] uppercase font-medium mb-[4px]">Numero Ordine</p>
						<p class="text-[0.9375rem] font-semibold text-[#252B42]">#{{ trackingResult.order_id }}</p>
					</div>
					<div class="bg-[#F8F9FB] rounded-[14px] p-[16px]">
						<p class="text-[0.75rem] text-[#737373] uppercase font-medium mb-[4px]">Data Ordine</p>
						<p class="text-[0.9375rem] font-semibold text-[#252B42]">{{ trackingResult.created_at || '—' }}</p>
					</div>
					<div v-if="trackingResult.brt_parcel_id" class="bg-[#F8F9FB] rounded-[14px] p-[16px]">
						<p class="text-[0.75rem] text-[#737373] uppercase font-medium mb-[4px]">Codice BRT</p>
						<p class="text-[0.9375rem] font-semibold text-[#252B42] font-mono">{{ trackingResult.brt_parcel_id }}</p>
					</div>
					<div class="bg-[#F8F9FB] rounded-[14px] p-[16px]">
						<p class="text-[0.75rem] text-[#737373] uppercase font-medium mb-[4px]">Stato Attuale</p>
						<p class="text-[0.9375rem] font-semibold text-[#252B42]">{{ trackingResult.status_description }}</p>
					</div>
				</div>

				<!-- Timeline stati -->
				<div v-if="currentStepIndex >= 0" class="mb-[24px]">
					<h3 class="text-[0.875rem] font-semibold text-[#252B42] mb-[16px]">Avanzamento spedizione</h3>
					<div class="flex items-start justify-between relative">
						<!-- Linea di progresso sfondo -->
						<div class="absolute top-[18px] left-[24px] right-[24px] h-[3px] bg-[#E9EBEC] rounded-full"></div>
						<!-- Linea di progresso attiva -->
						<div
							class="absolute top-[18px] left-[24px] h-[3px] bg-[#095866] rounded-full transition-[width] duration-500"
							:style="{ width: currentStepIndex >= statusTimeline.length - 1 ? 'calc(100% - 48px)' : `calc(${(currentStepIndex / (statusTimeline.length - 1)) * 100}% - ${24 * (1 - currentStepIndex / (statusTimeline.length - 1))}px)` }">
						</div>

						<!-- Step -->
						<div v-for="(step, idx) in statusTimeline" :key="step.key" class="flex flex-col items-center relative z-10 flex-1">
							<div
								:class="idx <= currentStepIndex ? 'bg-[#095866] text-white' : 'bg-[#E9EBEC] text-[#A0A5AB]'"
								class="w-[36px] h-[36px] rounded-full flex items-center justify-center transition-colors duration-300">
								<!-- Card/payment icon -->
								<svg v-if="step.icon === 'card'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
								<!-- Check icon -->
								<svg v-else-if="step.icon === 'check'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
								<!-- Truck icon -->
								<svg v-else-if="step.icon === 'truck'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
								<!-- Flag icon -->
								<svg v-else-if="step.icon === 'flag'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
							</div>
							<p :class="idx <= currentStepIndex ? 'text-[#252B42] font-semibold' : 'text-[#A0A5AB]'" class="text-[0.6875rem] mt-[8px] text-center leading-tight">
								{{ step.label }}
							</p>
						</div>
					</div>
				</div>

				<!-- Link tracking BRT -->
				<div v-if="trackingResult.brt_tracking_url" class="border-t border-[#E9EBEC] pt-[16px]">
					<a
						:href="trackingResult.brt_tracking_url"
						target="_blank"
						rel="noopener noreferrer"
						class="btn-primary inline-flex items-center gap-[8px] px-[20px] py-[12px] text-[0.875rem]">
						<!-- External link icon SVG -->
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
						Dettaglio tracking su BRT
					</a>
					<p class="text-[0.8125rem] text-[#737373] mt-[8px]">Clicca per vedere tutti i dettagli e gli aggiornamenti in tempo reale sul sito ufficiale BRT.</p>
				</div>
			</div>

			<!-- Risultato: non trovato nel database, link a BRT -->
			<div v-else-if="trackingResult && !trackingResult.found" class="mt-[24px] bg-white rounded-[16px] p-[24px_20px] desktop:p-[32px] shadow-[0_14px_28px_rgba(20,37,48,0.06)] border border-[#E5EAEC]">
				<div class="flex items-start gap-[12px] mb-[16px]">
					<!-- Info icon SVG -->
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E8A500" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-[2px]"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
					<div>
						<p class="text-[0.9375rem] font-semibold text-[#252B42] mb-[4px]">Spedizione non trovata nel nostro sistema</p>
						<p class="text-[0.8125rem] text-[#737373]">Il codice inserito non corrisponde a nessuna spedizione nel nostro archivio. Se hai un codice BRT, puoi verificare lo stato direttamente sul sito del corriere.</p>
					</div>
				</div>
				<a
					v-if="trackingResult.brt_tracking_url"
					:href="trackingResult.brt_tracking_url"
					target="_blank"
					rel="noopener noreferrer"
					class="btn-primary inline-flex items-center gap-[8px] px-[20px] py-[12px] text-[0.875rem]">
					<!-- External link icon SVG -->
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
					Cerca su BRT
				</a>
			</div>

			<p class="text-[#A0A5AB] text-[0.8125rem] text-center mt-[20px]">
				Puoi anche tracciare le tue spedizioni dall'area <NuxtLink to="/account/spedizioni" class="text-[#095866] hover:underline">Le tue spedizioni</NuxtLink>.
			</p>
		</div>
	</section>
</template>
