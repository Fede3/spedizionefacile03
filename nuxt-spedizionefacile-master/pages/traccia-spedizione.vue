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

// Colore del pallino per la timeline verticale
const dotColor = (idx) => {
	if (!trackingResult.value) return 'bg-[var(--color-brand-border)]';
	if (idx < currentStepIndex.value) return 'bg-[var(--color-brand-primary)]';
	if (idx === currentStepIndex.value) return 'bg-[var(--color-brand-primary)] ring-[4px] ring-[rgba(9,88,102,0.15)]';
	return 'bg-[var(--color-brand-border)]';
};

// Colori per lo stato badge
const statusColorClass = computed(() => {
	if (!trackingResult.value) return '';
	const map = {
		pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
		processing: 'bg-[#eef7f8] text-[#095866] border border-[#bdd5da]',
		completed: 'bg-[#f0fdf4] text-[#0a8a7a] border border-[#d1fae5]',
		in_transit: 'bg-[#eef7f8] text-[#095866] border border-[#bdd5da]',
		delivered: 'bg-[#f0fdf4] text-[#0a8a7a] border border-[#d1fae5]',
		in_giacenza: 'bg-orange-50 text-orange-700 border border-orange-200',
		payment_failed: 'bg-red-50 text-red-700 border border-red-200',
		cancelled: 'bg-gray-50 text-[var(--color-brand-text-secondary)] border border-gray-200',
	};
	return map[trackingResult.value.raw_status] || 'bg-gray-50 text-[var(--color-brand-text-secondary)] border border-gray-200';
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
			trackingResult.value = {
				found: false,
				brt_tracking_url: response.brt_tracking_url,
				message: response.message,
			};
		}
	} catch {
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
	<section class="tracking-page min-h-screen py-[40px] desktop:py-[60px]">
		<div class="my-container" style="max-width: 720px;">

			<!-- Titolo e descrizione -->
			<div class="sf-page-intro sf-page-intro--center mb-[32px] tablet:mb-[40px]">
				<h1 class="font-montserrat text-[2rem] font-[800] tracking-[-0.04em] text-[var(--color-brand-text)] desktop:text-[2.5rem]">Traccia la tua spedizione</h1>
				<p class="sf-section-description mx-auto">Inserisci il codice di tracking BRT, il numero d'ordine o il riferimento mittente per seguire la tua spedizione in tempo reale.</p>
			</div>

			<!-- Card di ricerca -->
			<div class="tracking-search-card rounded-[14px] ring-[1px] ring-[#DFE2E7] bg-white p-[24px_20px] shadow-[0_1px_4px_rgba(0,0,0,0.03)] desktop:p-[32px] mb-[24px]">
				<label for="tracking_code" class="form-label mb-[8px]">Codice di tracking</label>
				<div class="tracking-search-row">
					<div class="tracking-search-input-wrap">
						<!-- Search icon dentro l'input -->
						<svg class="tracking-search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
						<input
							id="tracking_code"
							v-model="trackingCode"
							type="text"
							placeholder="es. 058802401600012345, SF-000042, 42..."
							class="tracking-search-input"
							@keyup.enter="trackShipment"
						>
					</div>
					<button
						:disabled="isLoading || !trackingCode.trim()"
						type="button"
						class="btn-cta tracking-search-btn"
						@click="trackShipment">
						<!-- Loading spinner SVG -->
						<svg v-if="isLoading" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
						{{ isLoading ? 'Ricerca...' : 'Cerca' }}
					</button>
				</div>
				<p v-if="trackingError" class="text-[var(--color-brand-error)] text-[0.8125rem] mt-[10px]">{{ trackingError }}</p>
			</div>

			<!-- Risultato: spedizione trovata -->
			<div v-if="trackingResult && trackingResult.found" class="rounded-[14px] ring-[1px] ring-[#DFE2E7] bg-white p-[24px_20px] shadow-[0_1px_4px_rgba(0,0,0,0.03)] desktop:p-[32px]">
				<!-- Header risultato -->
				<div class="flex items-center justify-between mb-[24px] flex-wrap gap-[10px]">
					<h2 class="font-montserrat text-[1.125rem] font-[800] text-[var(--color-brand-text)]">Spedizione trovata</h2>
					<span :class="statusColorClass" class="px-[14px] py-[5px] rounded-full text-[0.8125rem] font-semibold">
						{{ trackingResult.status }}
					</span>
				</div>

				<!-- Informazioni ordine -->
				<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[12px] mb-[28px]">
					<div class="tracking-info-cell">
						<p class="tracking-info-label">Numero Ordine</p>
						<p class="tracking-info-value">#{{ trackingResult.order_id }}</p>
					</div>
					<div class="tracking-info-cell">
						<p class="tracking-info-label">Data Ordine</p>
						<p class="tracking-info-value">{{ trackingResult.created_at || '\u2014' }}</p>
					</div>
					<div v-if="trackingResult.brt_parcel_id" class="tracking-info-cell">
						<p class="tracking-info-label">Codice BRT</p>
						<p class="tracking-info-value font-mono">{{ trackingResult.brt_parcel_id }}</p>
					</div>
					<div class="tracking-info-cell">
						<p class="tracking-info-label">Stato Attuale</p>
						<p class="tracking-info-value">{{ trackingResult.status_description }}</p>
					</div>
				</div>

				<!-- Timeline verticale -->
				<div v-if="currentStepIndex >= 0" class="mb-[28px]">
					<h3 class="font-montserrat text-[0.8125rem] font-[800] text-[var(--color-brand-text)] uppercase tracking-[0.06em] mb-[20px]">Avanzamento spedizione</h3>
					<div class="tracking-timeline">
						<div
							v-for="(step, idx) in statusTimeline"
							:key="step.key"
							class="tracking-timeline-event"
							:class="{ 'tracking-timeline-event--last': idx === statusTimeline.length - 1 }">
							<!-- Pallino colorato -->
							<div class="tracking-timeline-dot-col">
								<div
									class="tracking-timeline-dot"
									:class="dotColor(idx)">
									<!-- Check animato per step completati -->
									<svg v-if="idx <= currentStepIndex" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
								</div>
								<!-- Linea verticale -->
								<div
									v-if="idx < statusTimeline.length - 1"
									class="tracking-timeline-line"
									:class="idx < currentStepIndex ? 'bg-[var(--color-brand-primary)]' : 'bg-[var(--color-brand-border)]'"
								/>
							</div>
							<!-- Contenuto evento -->
							<div class="tracking-timeline-content" :class="idx <= currentStepIndex ? 'opacity-100' : 'opacity-50'">
								<p class="tracking-timeline-label" :class="idx === currentStepIndex ? 'text-[var(--color-brand-primary)] font-bold' : 'text-[var(--color-brand-text)]'">
									{{ step.label }}
								</p>
								<p v-if="idx === currentStepIndex" class="tracking-timeline-detail">
									Stato attuale
								</p>
								<p v-else-if="idx < currentStepIndex" class="tracking-timeline-detail">
									Completato
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Link tracking BRT -->
				<div v-if="trackingResult.brt_tracking_url" class="border-t border-[var(--color-brand-border)] pt-[20px]">
					<a
						:href="trackingResult.brt_tracking_url"
						target="_blank"
						rel="noopener noreferrer"
						class="btn-secondary inline-flex items-center gap-[8px] px-[20px] py-[11px] text-[0.875rem]">
						<!-- External link icon SVG -->
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
						Dettaglio tracking su BRT
					</a>
					<p class="text-[0.8125rem] text-[var(--color-brand-text-secondary)] mt-[10px]">Clicca per vedere tutti i dettagli e gli aggiornamenti in tempo reale sul sito ufficiale BRT.</p>
				</div>
			</div>

			<!-- Risultato: non trovato nel database — empty state con illustrazione -->
			<div v-else-if="trackingResult && !trackingResult.found" class="rounded-[14px] ring-[1px] ring-[#DFE2E7] bg-white p-[32px_20px] shadow-[0_1px_4px_rgba(0,0,0,0.03)] desktop:p-[40px] text-center">
				<!-- Illustrazione empty state: pacco con lente d'ingrandimento -->
				<div class="tracking-empty-illustration">
					<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" fill="none">
						<!-- Pacco -->
						<rect x="16" y="28" width="36" height="30" rx="4" fill="var(--color-brand-secondary-soft-bg)" stroke="var(--color-brand-secondary-soft-border)" stroke-width="2"/>
						<line x1="16" y1="40" x2="52" y2="40" stroke="var(--color-brand-secondary-soft-border)" stroke-width="2"/>
						<line x1="34" y1="28" x2="34" y2="58" stroke="var(--color-brand-secondary-soft-border)" stroke-width="2"/>
						<path d="M16 32C16 29.8 17.8 28 20 28H48C50.2 28 52 29.8 52 32V40H16V32Z" fill="var(--color-brand-secondary-selected-bg)"/>
						<!-- Lente d'ingrandimento -->
						<circle cx="56" cy="24" r="12" fill="white" stroke="var(--color-brand-primary)" stroke-width="2.5"/>
						<circle cx="56" cy="24" r="7" fill="none" stroke="var(--color-brand-primary)" stroke-width="1.5" stroke-dasharray="3 2"/>
						<line x1="64.5" y1="33" x2="70" y2="38.5" stroke="var(--color-brand-primary)" stroke-width="2.5" stroke-linecap="round"/>
						<!-- Punto interrogativo nella lente -->
						<text x="56" y="28" text-anchor="middle" fill="var(--color-brand-primary)" font-size="14" font-weight="700" font-family="Inter, sans-serif">?</text>
					</svg>
				</div>
				<p class="text-[1rem] font-bold text-[var(--color-brand-text)] mb-[6px]">Spedizione non trovata</p>
				<p class="text-[0.875rem] text-[var(--color-brand-text-secondary)] mb-[20px] max-w-[44ch] mx-auto">Il codice inserito non corrisponde a nessuna spedizione nel nostro archivio. Se hai un codice BRT, prova direttamente sul sito del corriere.</p>
				<a
					v-if="trackingResult.brt_tracking_url"
					:href="trackingResult.brt_tracking_url"
					target="_blank"
					rel="noopener noreferrer"
					class="btn-secondary inline-flex items-center gap-[8px] px-[20px] py-[11px] text-[0.875rem]">
					<!-- External link icon SVG -->
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
					Cerca su BRT
				</a>
			</div>

			<!-- Empty state iniziale (nessuna ricerca ancora) -->
			<div v-else-if="!trackingResult && !trackingError && !isLoading" class="tracking-idle-hint">
				<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-secondary-soft-border)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="11" cy="11" r="8"/>
					<line x1="21" y1="21" x2="16.65" y2="16.65"/>
				</svg>
				<p class="text-[0.875rem] text-[var(--color-brand-text-secondary)] mt-[8px]">Inserisci un codice per avviare la ricerca</p>
			</div>

			<!-- Link all'area personale -->
			<p class="text-[var(--color-brand-text-secondary)] text-[0.8125rem] text-center mt-[24px]">
				Puoi anche tracciare le tue spedizioni dall'area <NuxtLink to="/account/spedizioni" class="text-[var(--color-brand-primary)] font-semibold hover:underline">Le tue spedizioni</NuxtLink>.
			</p>
		</div>
	</section>
</template>

<style scoped>
/* ============================================================
   TRACKING PAGE — layout e componenti specifici
   ============================================================ */

.tracking-page {
	background: linear-gradient(180deg, #F8F9FB 0%, #EEF0F3 100%);
}

/* --- Barra di ricerca --- */
.tracking-search-row {
	display: flex;
	gap: 12px;
	align-items: stretch;
}

.tracking-search-input-wrap {
	position: relative;
	flex: 1;
}

.tracking-search-icon {
	position: absolute;
	left: 16px;
	top: 50%;
	transform: translateY(-50%);
	color: var(--color-brand-text-secondary);
	pointer-events: none;
}

.tracking-search-input {
	width: 100%;
	background: var(--color-brand-secondary-soft-bg);
	padding: 14px 16px 14px 46px;
	border: none;
	border-radius: 12px;
	font-size: 0.9375rem;
	color: var(--color-brand-text);
	box-shadow: inset 0 0 0 1.5px var(--color-brand-border);
	transition: box-shadow 0.2s cubic-bezier(0.22, 1, 0.36, 1);
	height: 50px;
}
.tracking-search-input::placeholder {
	color: var(--color-brand-text-secondary);
	opacity: 0.6;
}
.tracking-search-input:focus {
	outline: none;
	box-shadow: inset 0 0 0 1.5px var(--color-brand-primary), 0 0 0 3px rgba(9, 88, 102, 0.1);
}

.tracking-search-btn {
	white-space: nowrap;
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 0 28px;
	font-size: 0.9375rem;
	border-radius: 999px;
}

/* Mobile: stack verticale */
@media (max-width: 519px) {
	.tracking-search-row {
		flex-direction: column;
	}
	.tracking-search-btn {
		justify-content: center;
		padding: 13px 24px;
	}
}

/* --- Celle info ordine --- */
.tracking-info-cell {
	background: var(--color-brand-secondary-soft-bg);
	border-radius: 14px;
	padding: 14px 16px;
	box-shadow: inset 0 0 0 1px var(--color-brand-border);
}
.tracking-info-label {
	font-size: 0.6875rem;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--color-brand-text-secondary);
	margin-bottom: 3px;
}
.tracking-info-value {
	font-size: 0.9375rem;
	font-weight: 600;
	color: var(--color-brand-text);
}

/* --- Timeline verticale --- */
.tracking-timeline {
	display: flex;
	flex-direction: column;
}

.tracking-timeline-event {
	display: flex;
	align-items: flex-start;
	gap: 14px;
	min-height: 56px;
}
.tracking-timeline-event--last {
	min-height: auto;
}

.tracking-timeline-dot-col {
	display: flex;
	flex-direction: column;
	align-items: center;
	flex-shrink: 0;
	width: 20px;
}

.tracking-timeline-dot {
	width: 20px;
	height: 20px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	transition: background-color 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.tracking-timeline-line {
	width: 2px;
	flex: 1;
	min-height: 24px;
	border-radius: 1px;
	transition: background-color 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.tracking-timeline-content {
	padding-bottom: 16px;
	transition: opacity 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.tracking-timeline-event--last .tracking-timeline-content {
	padding-bottom: 0;
}

.tracking-timeline-label {
	font-size: 0.9375rem;
	font-weight: 600;
	line-height: 1.3;
}

.tracking-timeline-detail {
	font-size: 0.75rem;
	color: var(--color-brand-text-secondary);
	margin-top: 2px;
}

/* --- Empty state illustrazione --- */
.tracking-empty-illustration {
	margin-bottom: 16px;
}

/* --- Idle hint (prima della ricerca) --- */
.tracking-idle-hint {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 32px 20px;
	opacity: 0.7;
}
</style>
