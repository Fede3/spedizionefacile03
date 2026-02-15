<!--
  FILE: components/PudoSelector.vue
  SCOPO: Componente per cercare e selezionare un punto PUDO BRT.

  COS'E' UN PUDO?
  PUDO = Pick Up / Drop Off. Sono negozi convenzionati con BRT (tabaccai, edicole, cartolerie, ecc.)
  dove il destinatario puo' andare a ritirare il pacco invece di farselo consegnare a casa.
  Utile per chi non e' mai a casa o vuole piu' flessibilita'.

  COME FUNZIONA:
  1. L'utente inserisce citta' e/o CAP della zona dove vuole ritirare
  2. Clicca "Cerca punti di ritiro" → chiama l'API BRT che restituisce i punti vicini
  3. Appaiono delle card con nome, indirizzo, distanza di ogni punto
  4. L'utente clicca su una card per selezionare quel punto
  5. Il componente emette l'evento "select" con i dati del punto → il padre auto-compila la destinazione

  API USATE:
  - GET /api/brt/pudo/search?city=X&zip_code=Y  → restituisce lista di punti PUDO
  - GET /api/brt/pudo/{pudoId}                   → restituisce dettagli (orari completi, indicazioni)

  USATO DA: pages/la-tua-spedizione/[step].vue (step 2, sezione Destinazione)
  EMETTE:
  - @select(pudo)   → quando l'utente seleziona un punto (pudo = oggetto con pudo_id, name, address, ecc.)
  - @deselect        → quando l'utente clicca di nuovo sullo stesso punto per deselezionarlo
-->
<script setup>
// Props: citta' e CAP iniziali (pre-compilati dalla destinazione scelta nel preventivo)
const props = defineProps({
	initialCity: { type: String, default: '' },   // es. "Milano" — dal campo destinazione del preventivo
	initialZip: { type: String, default: '' },     // es. "20100" — dal campo CAP destinazione
});

// Eventi emessi al componente padre (la pagina [step].vue)
const emit = defineEmits(['select', 'deselect']);

// Client HTTP autenticato (gestisce automaticamente cookie/CSRF di Sanctum)
const sanctumClient = useSanctumClient();

// Campi di ricerca — inizializzati dai props ma modificabili dall'utente
const searchCity = ref(props.initialCity);     // Citta' inserita dall'utente nel campo di ricerca
const searchZip = ref(props.initialZip);       // CAP inserito dall'utente nel campo di ricerca
const pudoResults = ref([]);                   // Array dei punti PUDO trovati dalla ricerca
const loading = ref(false);                    // true durante la chiamata API di ricerca
const searched = ref(false);                   // true dopo la prima ricerca (per mostrare "nessun risultato")
const searchError = ref(null);                 // Messaggio di errore se la ricerca fallisce

// Gestione dei dettagli espansi (orari completi, indicazioni)
const expandedPudoId = ref(null);              // ID del PUDO di cui si stanno vedendo i dettagli (null = nessuno)
const loadingDetails = ref(null);              // ID del PUDO di cui si stanno caricando i dettagli
const pudoDetails = ref({});                   // Cache dei dettagli gia' scaricati { pudoId: {...dati...} }

// ID del PUDO attualmente selezionato dall'utente (null = nessuna selezione)
const selectedPudoId = ref(null);

// Se il componente padre aggiorna citta'/CAP (es. l'utente cambia indirizzo),
// aggiorniamo i campi di ricerca solo se l'utente non ha gia' scritto qualcosa
watch(() => props.initialCity, (v) => { if (v && !searchCity.value) searchCity.value = v; });
watch(() => props.initialZip, (v) => { if (v && !searchZip.value) searchZip.value = v; });

/**
 * Cerca i punti PUDO tramite l'API BRT.
 * Chiama GET /api/brt/pudo/search con citta' e CAP.
 * L'API di BRT restituisce max 10 punti ordinati per distanza.
 */
const searchPudo = async () => {
	// Non cercare se entrambi i campi sono vuoti
	if (!searchCity.value?.trim() && !searchZip.value?.trim()) return;
	loading.value = true;
	searched.value = true;
	searchError.value = null;
	pudoResults.value = [];
	try {
		// Costruiamo i parametri della query string
		const params = new URLSearchParams();
		if (searchCity.value) params.set('city', searchCity.value.trim());
		if (searchZip.value) params.set('zip_code', searchZip.value.trim());
		params.set('country', 'ITA');       // Solo punti in Italia
		params.set('max_results', '10');    // Massimo 10 risultati
		const result = await sanctumClient(`/api/brt/pudo/search?${params.toString()}`);
		// La risposta ha il formato { success: true/false, pudo: [...], error: "..." }
		if (result?.success === false) {
			searchError.value = result?.error || 'Errore dalla API BRT. Riprova.';
			pudoResults.value = [];
		} else {
			pudoResults.value = result?.pudo || result?.data?.pudo || [];
		}
	} catch (e) {
		console.error('Errore ricerca PUDO:', e);
		// Mostra l'errore specifico dal backend se disponibile
		const errorMsg = e?.response?._data?.message || e?.data?.error || e?.message || '';
		searchError.value = errorMsg ? `Errore: ${errorMsg}` : 'Errore durante la ricerca. Controlla la connessione e riprova.';
	} finally {
		loading.value = false;
	}
};

/**
 * Mostra/nasconde i dettagli di un punto PUDO (orari completi, indicazioni stradali).
 * Chiama GET /api/brt/pudo/{pudoId} solo la prima volta, poi usa la cache.
 */
const toggleDetails = async (pudo) => {
	// Se e' gia' espanso, lo chiudiamo
	if (expandedPudoId.value === pudo.pudo_id) {
		expandedPudoId.value = null;
		return;
	}
	expandedPudoId.value = pudo.pudo_id;
	// Se abbiamo gia' scaricato i dettagli, non li riscarichiamo (cache)
	if (pudoDetails.value[pudo.pudo_id]) return;
	loadingDetails.value = pudo.pudo_id;
	try {
		const result = await sanctumClient(`/api/brt/pudo/${pudo.pudo_id}`);
		pudoDetails.value[pudo.pudo_id] = result?.data || result;
	} catch (e) {
		console.error('Errore dettagli PUDO:', e);
	} finally {
		loadingDetails.value = null;
	}
};

/**
 * Seleziona o deseleziona un punto PUDO.
 * Se l'utente clicca su un punto gia' selezionato → lo deseleziona (toggle).
 * Emette 'select' o 'deselect' al componente padre.
 */
const selectPudo = (pudo) => {
	if (selectedPudoId.value === pudo.pudo_id) {
		// L'utente ha cliccato di nuovo sullo stesso punto → deseleziona
		selectedPudoId.value = null;
		emit('deselect');
	} else {
		// L'utente ha selezionato un nuovo punto
		selectedPudoId.value = pudo.pudo_id;
		emit('select', pudo);
	}
};

/**
 * Formatta la distanza in metri in una stringa leggibile.
 * Esempio: 850 → "850 m", 1500 → "1.5 km"
 */
const formatDistance = (meters) => {
	if (!meters) return '';
	const m = Number(meters);
	if (m >= 1000) return (m / 1000).toFixed(1) + ' km';
	return Math.round(m) + ' m';
};

/**
 * Formatta gli orari di apertura. Puo' essere una stringa ("Lun-Ven 9-18")
 * o un array (["Lun 9-13", "Mar 9-13", ...]) a seconda della risposta BRT.
 */
const formatOpeningHours = (hours) => {
	if (!hours) return '';
	if (typeof hours === 'string') return hours;
	if (Array.isArray(hours)) return hours.join(' | ');
	return '';
};
</script>

<template>
	<div class="mt-[16px]">
		<!-- BARRA DI RICERCA: citta' + CAP + bottone cerca -->
		<!-- L'utente inserisce la zona dove vuole ritirare e clicca "Cerca punti di ritiro" -->
		<div class="flex flex-col tablet:flex-row gap-[10px] items-end">
			<!-- Campo citta' -->
			<div class="flex-1 w-full">
				<label class="block text-[0.75rem] text-[#737373] mb-[4px]">Città</label>
				<input
					type="text"
					v-model="searchCity"
					placeholder="es. Milano"
					class="w-full bg-white rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]"
					style="font-size: 16px;"
					@keydown.enter.prevent="searchPudo" />
			</div>
			<!-- Campo CAP -->
			<div class="w-full tablet:w-[120px]">
				<label class="block text-[0.75rem] text-[#737373] mb-[4px]">CAP</label>
				<input
					type="text"
					v-model="searchZip"
					placeholder="es. 20100"
					maxlength="5"
					class="w-full bg-white rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]"
					style="font-size: 16px;"
					@keydown.enter.prevent="searchPudo" />
			</div>
			<!-- Bottone di ricerca: disabilitato se entrambi i campi sono vuoti o se sta gia' cercando -->
			<button
				type="button"
				@click="searchPudo"
				:disabled="loading || (!searchCity?.trim() && !searchZip?.trim())"
				class="inline-flex items-center justify-center gap-[6px] h-[44px] px-[18px] bg-[#095866] text-white rounded-[8px] text-[0.875rem] font-semibold hover:bg-[#074a56] transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap w-full tablet:w-auto">
				<!-- Icona lente (quando non sta caricando) -->
				<svg v-if="!loading" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
				<!-- Spinner (quando sta cercando) -->
				<span v-if="loading" class="inline-block w-[16px] h-[16px] border-2 border-white border-t-transparent rounded-full animate-spin"></span>
				{{ loading ? 'Ricerca...' : 'Cerca punti di ritiro' }}
			</button>
		</div>

		<!-- Messaggio di errore (se la chiamata API fallisce) -->
		<p v-if="searchError" class="text-red-500 text-[0.875rem] mt-[12px]">{{ searchError }}</p>

		<!-- RISULTATI DELLA RICERCA -->
		<div v-if="searched && !loading" class="mt-[16px]">
			<!-- Nessun punto trovato -->
			<p v-if="pudoResults.length === 0 && !searchError" class="text-[0.875rem] text-[#737373] py-[20px] text-center">
				Nessun punto di ritiro trovato per questa zona. Prova con un'altra città o CAP.
			</p>

			<!-- Griglia delle card dei punti PUDO trovati -->
			<!-- Su mobile: 1 colonna. Su tablet/desktop: 2 colonne -->
			<div v-else class="grid grid-cols-1 tablet:grid-cols-2 gap-[10px]">
				<!-- Card singolo PUDO -->
				<!-- Bordo teal + ombra se selezionato, bordo grigio se non selezionato -->
				<div
					v-for="pudo in pudoResults"
					:key="pudo.pudo_id"
					class="bg-white rounded-[12px] border-2 p-[14px] transition-[border-color,box-shadow] duration-200 cursor-pointer"
					:class="selectedPudoId === pudo.pudo_id ? 'border-[#095866] shadow-md' : 'border-[#D0D0D0] hover:border-[#095866]/50'"
					@click="selectPudo(pudo)">

					<!-- Riga superiore: icona casa + nome + indirizzo | checkmark se selezionato -->
					<div class="flex items-start justify-between gap-[8px]">
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-[6px]">
								<!-- Icona casa/negozio -->
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
								<span class="text-[0.875rem] font-bold text-[#252B42] truncate">{{ pudo.name }}</span>
							</div>
							<p class="text-[0.8125rem] text-[#737373] mt-[2px]">{{ pudo.address }}, {{ pudo.zip_code }} {{ pudo.city }}</p>
						</div>
						<!-- Cerchio teal con checkmark bianco: visibile solo quando questo PUDO e' selezionato -->
						<div v-if="selectedPudoId === pudo.pudo_id" class="w-[24px] h-[24px] rounded-full bg-[#095866] flex items-center justify-center shrink-0">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
						</div>
					</div>

					<!-- Info aggiuntive: distanza dal punto cercato + orari sintetici -->
					<div class="flex items-center gap-[12px] mt-[8px] text-[0.75rem] text-[#737373]">
						<!-- Distanza (es. "850 m" o "1.5 km") -->
						<span v-if="pudo.distance_meters" class="inline-flex items-center gap-[3px]">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
							{{ formatDistance(pudo.distance_meters) }}
						</span>
						<!-- Orari sintetici -->
						<span v-if="pudo.opening_hours" class="inline-flex items-center gap-[3px] truncate">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
							{{ typeof pudo.opening_hours === 'string' ? pudo.opening_hours : 'Vedi orari' }}
						</span>
					</div>

					<!-- Pannello dettagli espanso (visibile solo quando l'utente clicca "Dettagli e orari") -->
					<!-- Chiama l'API /api/brt/pudo/{id} per gli orari completi -->
					<div v-if="expandedPudoId === pudo.pudo_id" class="mt-[10px] pt-[10px] border-t border-[#E4E4E4] text-[0.8125rem]" @click.stop>
						<!-- Spinner durante il caricamento dei dettagli -->
						<div v-if="loadingDetails === pudo.pudo_id" class="flex items-center gap-[6px] text-[#737373]">
							<span class="inline-block w-[14px] h-[14px] border-2 border-[#095866] border-t-transparent rounded-full animate-spin"></span>
							Caricamento dettagli...
						</div>
						<!-- Dettagli caricati: orari completi e indicazioni per trovare il punto -->
						<template v-else-if="pudoDetails[pudo.pudo_id]">
							<p v-if="pudoDetails[pudo.pudo_id].opening_hours" class="text-[#252B42]">
								<span class="font-semibold">Orari:</span> {{ formatOpeningHours(pudoDetails[pudo.pudo_id].opening_hours) }}
							</p>
							<p v-if="pudoDetails[pudo.pudo_id].localization_hint" class="text-[#737373] mt-[4px]">
								{{ pudoDetails[pudo.pudo_id].localization_hint }}
							</p>
						</template>
					</div>

					<!-- Link per espandere/chiudere i dettagli -->
					<button
						type="button"
						@click.stop="toggleDetails(pudo)"
						class="mt-[8px] text-[0.75rem] text-[#095866] font-semibold hover:underline cursor-pointer">
						{{ expandedPudoId === pudo.pudo_id ? 'Chiudi dettagli' : 'Dettagli e orari' }}
					</button>
				</div>
			</div>
		</div>

		<!-- Spinner di caricamento durante la ricerca -->
		<div v-if="loading" class="flex items-center justify-center py-[30px]">
			<span class="inline-block w-[28px] h-[28px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></span>
		</div>
	</div>
</template>
