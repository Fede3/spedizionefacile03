<!--
	COMPONENTE: Preventivo (Preventivo.vue)
	SCOPO: Modulo principale per creare un preventivo di spedizione — il cuore del sito.

	DOVE SI USA: pages/index.vue (homepage), pages/preventivo.vue (pagina dedicata)
	PROPS: nessuna
	EMITS: nessuno

	DATI IN INGRESSO: userStore (stato globale Pinia), useSession (sessione server),
	                  usePriceBands (fasce prezzo da API), useSmartValidation (validazione campi)
	DATI IN USCITA: POST /api/session/first-step (salva preventivo nel server),
	                navigazione a /la-tua-spedizione/2 (step successivo)

	VINCOLI: non modificare la formula di calcolo prezzo senza aggiornare anche
	         il backend (SessionController::firstStep). I due DEVONO dare lo stesso risultato.
	PUNTI DI MODIFICA SICURI: packageTypeList (tipi di collo), template HTML/CSS
	COLLEGAMENTI: composables/usePriceBands.js, composables/useSmartValidation.js,
	              stores/userStore.js, docs/guide/MODIFICARE-REGOLA-PREZZO.md

	FLUSSO UTENTE:
	1. L'utente sceglie il tipo di collo (Pacco, Pallet, Valigia)
	2. Inserisce citta' e CAP di partenza e destinazione (con suggerimenti automatici)
	3. Inserisce peso e dimensioni (3 lati in cm) per ogni collo
	4. Il sistema calcola automaticamente il prezzo in base a peso e volume
	   (viene usato il prezzo PIU' ALTO tra peso e volume)
	5. Cliccando "Continua", i dati vengono inviati al server per validazione
	6. Se tutto va bene, appare il prezzo totale e l'utente puo' procedere allo step successivo

	FORMULA PREZZO:
	- Si calcola un prezzo basato sul peso (7 fasce dinamiche da API, fallback hardcoded)
	- Si calcola un prezzo basato sul volume (7 fasce analoghe in m3)
	- Si prende il prezzo PIU' ALTO tra i due → MAX(peso, volume)
	- Si aggiunge il supplemento CAP 90 (+2.50€ per ogni CAP che inizia con 90)
	- Si moltiplica per la quantita' di colli uguali

	I dati del preventivo vengono salvati nello "store" Pinia (memoria condivisa del sito)
	e nella sessione del server, cosi' si mantengono navigando tra le pagine.
-->
<script setup>
// --- DIPENDENZE E STATO INIZIALE ---

const userStore = useUserStore();   // Store Pinia: stato globale condiviso (pacchi, indirizzi, prezzo)
const route = useRoute();           // Route corrente: serve per adattare lo stile (homepage vs pagina dedicata)

const formRef = ref(null);          // Riferimento al <form> HTML per la validazione nativa del browser

const isRateCalculated = ref(false); // true quando il prezzo e' stato calcolato e confermato dal server

// Carica fasce prezzo dinamiche dall'API (con fallback hardcoded)
const { loadPriceBands, getWeightPrice, getVolumePrice, promoSettings, getMinPrice } = usePriceBands();
onMounted(() => { loadPriceBands(); });

// --- AUTOCOMPLETE CITTA'/CAP ---
// L'utente digita nel campo citta' o CAP, dopo 300ms parte la ricerca API
const originSuggestions = ref([]);
const destSuggestions = ref([]);
const showOriginSuggestions = ref(false);
const showDestSuggestions = ref(false);
let originSearchTimeout = null;
let destSearchTimeout = null;

const searchLocations = async (query) => {
	if (!query || query.length < 2) return [];
	try {
		const results = await sanctum(`/api/locations/search?q=${encodeURIComponent(query)}`);
		return results || [];
	} catch (e) {
		return [];
	}
};

const onOriginCityInput = () => {
	clearTimeout(originSearchTimeout);
	originSearchTimeout = setTimeout(async () => {
		const q = userStore.shipmentDetails.origin_city;
		if (q && q.length >= 2) {
			originSuggestions.value = await searchLocations(q);
			showOriginSuggestions.value = originSuggestions.value.length > 0;
		} else {
			showOriginSuggestions.value = false;
		}
	}, 300);
};

const onOriginCapInput = () => {
	clearTimeout(originSearchTimeout);
	filterCap(userStore.shipmentDetails);
	originSearchTimeout = setTimeout(async () => {
		const q = userStore.shipmentDetails.origin_postal_code;
		if (q && q.length >= 3) {
			originSuggestions.value = await searchLocations(q);
			showOriginSuggestions.value = originSuggestions.value.length > 0;
		} else {
			showOriginSuggestions.value = false;
		}
	}, 300);
};

const selectOriginLocation = (loc) => {
	userStore.shipmentDetails.origin_city = loc.place_name;
	userStore.shipmentDetails.origin_postal_code = loc.postal_code;
	showOriginSuggestions.value = false;
};

const onDestCityInput = () => {
	clearTimeout(destSearchTimeout);
	destSearchTimeout = setTimeout(async () => {
		const q = userStore.shipmentDetails.destination_city;
		if (q && q.length >= 2) {
			destSuggestions.value = await searchLocations(q);
			showDestSuggestions.value = destSuggestions.value.length > 0;
		} else {
			showDestSuggestions.value = false;
		}
	}, 300);
};

const onDestCapInput = () => {
	clearTimeout(destSearchTimeout);
	filterCap(userStore.shipmentDetails);
	destSearchTimeout = setTimeout(async () => {
		const q = userStore.shipmentDetails.destination_postal_code;
		if (q && q.length >= 3) {
			destSuggestions.value = await searchLocations(q);
			showDestSuggestions.value = destSuggestions.value.length > 0;
		} else {
			showDestSuggestions.value = false;
		}
	}, 300);
};

const selectDestLocation = (loc) => {
	userStore.shipmentDetails.destination_city = loc.place_name;
	userStore.shipmentDetails.destination_postal_code = loc.postal_code;
	showDestSuggestions.value = false;
};

const getTodayDate = computed(() => {
	const today = new Date();
	const dd = String(today.getDate()).padStart(2, "0");
	const mm = String(today.getMonth() + 1).padStart(2, "0");
	const yyyy = today.getFullYear();

	return yyyy + "-" + mm + "-" + dd;
});

/* const getTodayDate = new Date().toISOString().split("T")[0]; */

// --- SESSIONE SERVER ---
// La sessione contiene i dati del preventivo salvati lato server (per persistenza tra pagine)
const { session, status, refresh } = useSession();

// --- TIPI DI COLLO DISPONIBILI ---
// Ogni tipo ha un testo, un'immagine e le dimensioni dell'icona
const packageTypeList = [
	{
		text: "Pacco",
		img: "pack.png",
		width: 43,
		height: 47,
	},
	{
		text: "Pallet",
		img: "pallet.png",
		width: 43,
		height: 42,
	},
	{
		text: "Valigia",
		img: "suitcase.png",
		width: 30,
		height: 52,
	},
];

// --- GESTIONE PACCHI ---

const isPackageSelected = ref(false);  // true quando l'utente ha aggiunto almeno un collo

const newPackage = ref({});            // Oggetto temporaneo per il pacco in fase di aggiunta

/* Seleziono la tipologia di pacco */
const selectPackageType = (packageType) => {
	newPackage.value = {};

	/* firstClick.value = false; */

	/* packageImage.value.img = ;
	packageImage.value.width = packageType.width;
	packageImage.value.height = packageType.height; */

	if (isRateCalculated.value) {
		isRateCalculated.value = false;
	}

	newPackage.value.package_type = packageType.text;
	newPackage.value.quantity = 1;
	newPackage.value.img = packageType.img;
	newPackage.value.width = packageType.width;
	newPackage.value.height = packageType.height;

	userStore.packages.push(newPackage.value);

	isPackageSelected.value = true;
};

const myPack = ref(null);             // Riferimento al pacco attualmente in modifica

// Client HTTP autenticato (gestisce CSRF e cookie di Sanctum automaticamente)
const sanctum = useSanctumClient();

/* Controllo se il prezzo con il volume e con il peso esistono e calcolo la quantità
 * Il prezzo finale e' il MAX tra peso e volume + supplemento CAP 90 (+2.50€ per ogni CAP che inizia con 90)
 */
const checkPrices = (pack) => {
	let basePrice = null;

	const wp = pack.weight_price != null ? Number(pack.weight_price) : null;
	const vp = pack.volume_price != null ? Number(pack.volume_price) : null;

	if (wp != null && !isNaN(wp) && vp != null && !isNaN(vp)) {
		basePrice = Math.max(wp, vp);
	} else if (wp != null && !isNaN(wp)) {
		basePrice = wp;
	} else if (vp != null && !isNaN(vp)) {
		basePrice = vp;
	}

	if (basePrice != null && basePrice > 0) {
		// Supplemento per CAP che iniziano con "90" (+2.50€ per ritiro e/o destinazione)
		let supplement = 0;
		const originCap = userStore.shipmentDetails.origin_postal_code || '';
		const destCap = userStore.shipmentDetails.destination_postal_code || '';
		if (originCap.startsWith('90')) supplement += 2.50;
		if (destCap.startsWith('90')) supplement += 2.50;

		pack.single_price = Number((basePrice + supplement).toFixed(2));
		pack.single_priceOrig = pack.single_price;
		calcQuantity(pack);
	}
};

/* Calcolo prezzo se la quantità cambia */
const calcQuantity = (pack) => {
	const orig = Number(pack.single_priceOrig) || 0;
	const qty = Number(pack.quantity) || 1;
	pack.single_price = orig * qty;

	userStore.totalPrice = 0;

	userStore.packages.forEach((p) => {
		userStore.totalPrice += Number(p.single_price) || 0;
	});
};

/* Calcolo del prezzo tenendo conto del peso
 * Usa fasce dinamiche caricate da API (con fallback hardcoded).
 * Il prezzo viene cercato tramite getWeightPrice() del composable usePriceBands.
 */
const calcPriceWithWeight = (pack) => {
	if (pack.weight != null) {
		pack.weight = String(pack.weight).replace(/[a-zA-Z]/g, "");
	}

	myPack.value = pack;
	const weight = Number(pack.weight);

	if (!pack.weight || isNaN(weight) || weight <= 0) {
		pack.weight_price = null;
		return;
	}

	pack.weight_price = getWeightPrice(weight);
	checkPrices(pack);
};

/* Calcolo prezzo tenendo conto del volume (in m³)
 * Usa fasce dinamiche caricate da API (con fallback hardcoded).
 * Il prezzo viene cercato tramite getVolumePrice() del composable usePriceBands.
 */
const calcPriceWithVolume = (pack) => {
	if (pack.first_size) {
		pack.first_size = String(pack.first_size).replace(/[^0-9]/g, "");
	}

	if (pack.second_size) {
		pack.second_size = String(pack.second_size).replace(/[^0-9]/g, "");
	}

	if (pack.third_size) {
		pack.third_size = String(pack.third_size).replace(/[^0-9]/g, "");
	}

	myPack.value = pack;

	if (pack.first_size && pack.second_size && pack.third_size) {
		const firstSize = Number(pack.first_size);
		const secondSize = Number(pack.second_size);
		const thirdSize = Number(pack.third_size);

		if (firstSize <= 0 || secondSize <= 0 || thirdSize <= 0) {
			pack.volume_price = null;
			return;
		}

		const volume = (firstSize / 100) * (secondSize / 100) * (thirdSize / 100);
		const volumeNumber = Number(volume.toFixed(6));

		pack.volume_price = getVolumePrice(volumeNumber);
		checkPrices(pack);
	}
};

// --- VALIDAZIONE CAMPI ---
// Validazione intelligente: mostra errori solo dopo che l'utente ha interagito col campo
const sv = useSmartValidation();

const filterCap = (shipment_details) => {
	if (shipment_details.origin_postal_code) {
		shipment_details.origin_postal_code = sv.filterCAP(shipment_details.origin_postal_code);
	}

	if (shipment_details.destination_postal_code) {
		shipment_details.destination_postal_code = sv.filterCAP(shipment_details.destination_postal_code);
	}
};

// Validate weight with max limit
const onWeightInput = (pack, packIndex) => {
	calcPriceWithWeight(pack);
	const key = `peso_${packIndex}`;
	if (sv.isTouched(key)) {
		sv.validatePeso(key, pack.weight);
	}
};

const onWeightBlur = (pack, packIndex) => {
	const key = `peso_${packIndex}`;
	sv.onBlur(key, () => sv.validatePeso(key, pack.weight));
};

// Validate dimensions with max limit
const onDimInput = (pack, packIndex, dimName, label) => {
	calcPriceWithVolume(pack);
	const key = `${dimName}_${packIndex}`;
	if (sv.isTouched(key)) {
		sv.validateDimensione(key, pack[dimName], label);
	}
};

const onDimBlur = (pack, packIndex, dimName, label) => {
	const key = `${dimName}_${packIndex}`;
	sv.onBlur(key, () => sv.validateDimensione(key, pack[dimName], label));
};

// CAP validation
const onCapBlur = (fieldKey, value) => {
	sv.onBlur(fieldKey, () => sv.validateCAP(fieldKey, value));
};

const onCapInputSmart = (fieldKey, value) => {
	if (sv.isTouched(fieldKey)) {
		sv.validateCAP(fieldKey, value);
	}
};

const deletePack = async (index) => {
	const wasLastPack = userStore.packages.length === 1;

	if (wasLastPack) {
		// Calcola altezza sezione e fai salire il bottone immediatamente
		const packSection = document.querySelector('.pack-section-wrapper');
		const continueButton = document.querySelector('.continue-button-wrapper');

		if (packSection && continueButton) {
			const sectionHeight = packSection.offsetHeight;
			continueButton.style.setProperty('--rise-distance', `-${sectionHeight}px`);
			continueButton.classList.add('button-rise-up');
		}
	}

	userStore.packages.splice(index, 1);

	/* const index = session.value?.data?.packages */

	/* try {
		await useSanctumFetch(`/api/session/delete-package/${index}`, {
			method: "DELETE",
		});
	} catch (error) {
		messageError.value = error.data.errors;
	}

	await refresh(); */

	if (userStore.packages.length === 0) {
		isPackageSelected.value = false;
		/* userStore.isRateCalculated = false; */
		/* firstClick.value = false; */
		/* userStore.newPackage = {}; */
		isRateCalculated.value = false;
	}

	/* userStore.newPackage = {}; */

	/* firstClick.value = false; */

	/* isRateCalculated.value = false; */

	userStore.totalPrice = 0;

	userStore.packages.forEach((pack) => {
		userStore.totalPrice += Number(pack.single_price);
	});
};

// --- STATO ERRORI E CALCOLO ---

const messageError = ref(null);      // Errori dal server o dalla validazione locale (oggetto {campo: [messaggi]})
const isCalculating = ref(false);    // true durante la chiamata API di calcolo tariffa

const scrollToFirstError = () => {
	nextTick(() => {
		const errorEl = document.querySelector('.text-red-500');
		if (errorEl) {
			errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	});
};

// --- CALCOLO TARIFFA ---
// Flusso: validazione client → validazione pacchi → POST al server → mostra prezzo
const calculateRate = async () => {
	messageError.value = null;
	// 1. Validazione HTML5 nativa (campi required, tipo, ecc.)
	if (!formRef.value || !formRef.value.checkValidity()) {
		formRef.value?.reportValidity();
		isRateCalculated.value = false;
		return false;
	}

	// 2. Controlla che ci sia almeno un collo
	if (!userStore.packages || userStore.packages.length === 0) {
		messageError.value = { packages: ["Seleziona almeno un tipo di collo."] };
		isRateCalculated.value = false;
		scrollToFirstError();
		return false;
	}

	// 3. Ogni pacco deve avere peso e dimensioni, e i prezzi devono essere calcolati
	for (let i = 0; i < userStore.packages.length; i++) {
		const pack = userStore.packages[i];
		if (!pack.weight || !pack.first_size || !pack.second_size || !pack.third_size) {
			messageError.value = { packages: ["Compila peso e dimensioni per tutti i colli."] };
			isRateCalculated.value = false;
			scrollToFirstError();
			return false;
		}

		// Recalculate prices to ensure they exist
		if (pack.weight_price == null) {
			calcPriceWithWeight(pack);
		}
		if (pack.volume_price == null && pack.first_size && pack.second_size && pack.third_size) {
			calcPriceWithVolume(pack);
		}
		// If single_price is still not set, calculate from available prices
		if (pack.single_price == null || pack.single_price === undefined) {
			checkPrices(pack);
		}
		// Final safety check
		if (pack.single_price == null || pack.single_price === undefined) {
			messageError.value = { packages: ["Errore nel calcolo del prezzo. Reinserisci peso e dimensioni."] };
			isRateCalculated.value = false;
			return false;
		}
	}

	// 4. Invio dati al server per validazione e salvataggio in sessione
	isCalculating.value = true;
	try {
		await sanctum("/sanctum/csrf-cookie");    // Rinnova il token CSRF prima del POST
		await sanctum("/api/session/first-step", {
			method: "POST",
			body: {
				shipment_details: userStore.shipmentDetails,
				packages: userStore.packages,
			},
		});
	} catch (error) {
		messageError.value = error?.data?.errors || { packages: ["Errore durante il calcolo. Riprova."] };
		isRateCalculated.value = false;
		scrollToFirstError();
		return false;
	} finally {
		isCalculating.value = false;
	}

	messageError.value = null;
	isRateCalculated.value = true;
	userStore.isQuoteStarted = true;
	await refresh();

	return true;
};


// --- NAVIGAZIONE STEP ---
// Primo click: calcola il prezzo. Secondo click: vai allo step 2.
const continueToNextStep = async () => {
	messageError.value = null;

	// Se il prezzo e' gia' calcolato, naviga allo step successivo (servizi)
	if (isRateCalculated.value) {
		await navigateTo('/la-tua-spedizione/2');
		return;
	}

	// First click: calculate rate and show price
	await calculateRate();
};
const nextStep = async () => {
	window.scrollTo(0, 0);

	userStore.stepNumber++;
};

const getPackages = computed(() => (userStore.packages.length === 0 && session.value?.data ? session.value?.data.packages : userStore.packages));

/* onMounted(() => { */
/* const saved = sessionStorage.getItem("stepNumber");

	if (saved) {
		sessionStorage.removeItem("stepNumber");
	} */
/* const isShipmentDetailsEmpty = Object.values(userStore.shipmentDetails).every((detail) => detail === ""); */
/* if (userStore.packages?.length === 0 && session.value) {
		userStore.packages = session.value?.data?.packages;
	} */
/* isLoading.value = false; */
/* }); */

// --- WATCHERS ---
// Quando cambiano pacchi o dettagli spedizione, resetta il calcolo del prezzo
// (l'utente deve cliccare "Continua" di nuovo per ricalcolare)

watch(
	() => userStore.packages,
	() => {
		messageError.value = null;
		isRateCalculated.value = false;
	},
	{ deep: true },
);

watch(
	() => userStore.shipmentDetails,
	() => {
		messageError.value = null;
		isRateCalculated.value = false;
	},
	{ deep: true },
);

// Ricalcola supplementi CAP90 quando i CAP cambiano
watch(
	() => [userStore.shipmentDetails.origin_postal_code, userStore.shipmentDetails.destination_postal_code],
	() => {
		// Ricalcola i prezzi di tutti i pacchi per aggiornare il supplemento CAP90
		for (const pack of userStore.packages) {
			if (pack.weight_price != null || pack.volume_price != null) {
				checkPrices(pack);
			}
		}
	},
);

// --- RESET FORM ---
// Controllo se ci sono dati inseriti (per mostrare il pulsante "Azzera")
const hasFormData = computed(() => {
	const sd = userStore.shipmentDetails;
	return userStore.packages.length > 0 || sd.origin_city || sd.origin_postal_code || sd.destination_city || sd.destination_postal_code;
});

const resetForm = () => {
	userStore.packages.splice(0);
	userStore.shipmentDetails.origin_city = "";
	userStore.shipmentDetails.origin_postal_code = "";
	userStore.shipmentDetails.destination_city = "";
	userStore.shipmentDetails.destination_postal_code = "";
	userStore.shipmentDetails.date = "";
	userStore.totalPrice = 0;
	isPackageSelected.value = false;
	isRateCalculated.value = false;
	messageError.value = null;
};
</script>

<template>
	<section :class="route.path === '/' ? 'mt-[-140px] tablet:mt-[-70px] desktop:mt-[-60px] relative z-50' : 'pt-[24px]'">
		<div class="my-container">
			<div
				class="bg-white w-full rounded-[20px] tablet:rounded-[24px] desktop-xl:rounded-[32px] relative z-10 p-[16px_12px] tablet:p-[20px_40px] desktop:p-[30px_36px] mx-auto"
			:class="route.path === '/'
				? 'max-w-[1260px] shadow-[0_8px_32px_rgba(0,0,0,0.12)]'
				: 'mt-[20px] max-w-[1200px] shadow-[0_4px_20px_rgba(0,0,0,0.08)]'">
				<div class="border-b-[1px] border-[#E6E6E6] pb-[8px] flex items-center justify-center relative">
					<h2 class="text-[1.25rem] desktop:text-[2rem] text-black font-bold text-center">Preventivo Rapido</h2>
					<button
						v-if="hasFormData"
						type="button"
						@click="resetForm"
						class="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-[4px] text-[0.75rem] text-[#999] hover:text-[#E44203] transition cursor-pointer group"
						title="Azzera tutti i campi del preventivo">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="group-hover:rotate-[-180deg] transition-transform duration-300"><path d="M2.5 2v6h6"/><path d="M2.66 15.57a10 10 0 1 0 .57-8.38L2.5 8"/></svg>
						<span class="hidden tablet:inline">Azzera</span>
					</button>
				</div>

				<form ref="formRef" @submit.prevent="">
					<Steps :current-step="0" />

					<h3 class="font-semibold text-[0.875rem] tablet:text-[1rem] desktop:text-[1.25rem] text-black border-b-[1px] border-[#E6E6E6] desktop:w-[469px] h-[44px] tablet:h-[50px] pl-[10px] tablet:pl-[18px] leading-[44px] tablet:leading-[50px] scroll-mt-[80px]" title="Seleziona il tipo di pacco che vuoi spedire. Puoi aggiungere più colli alla stessa spedizione.">Aggiungi altri colli alla spedizione</h3>

					<ul class="flex items-center flex-wrap gap-[12px] tablet:gap-[16px] desktop:gap-x-[30px] desktop-xl:gap-x-[40px] mt-[10px]">
						<li
							v-for="(packageType, packageTypeIndex) in packageTypeList"
							:key="packageTypeIndex"
							class="rounded-[21px] relative shadow-[6px_6px_5.3px_rgba(0,0,0,.32)] h-[50px] tablet:h-[77px] text-[0.875rem] tablet:text-[1rem] desktop-xl:text-[1.625rem] text-black font-medium tracking-[-0.624px] w-[calc(33.333%-8px)] tablet:w-[calc(25%-12px)] desktop-xl:w-[193px] transition-[transform,box-shadow] duration-200 hover:shadow-[6px_6px_12px_rgba(0,0,0,.2)] hover:-translate-y-[1px] active:scale-95">
							<button
								type="button"
								@click="selectPackageType(packageType)"
								class="w-full h-full flex justify-center items-center gap-x-[12px] tablet:gap-x-[31px] cursor-pointer package-card after:content-[''] after:bg-no-repeat after:bg-right"
								:style="{ '--after-bg': `url(/img/quote/first-step/${packageType.img})`, '--after-width': `${packageType.width}px`, '--after-height': `${packageType.height}px` }"
								:title="`Clicca per aggiungere un collo di tipo ${packageType.text}`">
								{{ packageType.text }}
							</button>
							<input type="radio" name="package_type" class="absolute left-[50%] bottom-0 opacity-0 pointer-events-none" />
							<!--  :required="!isPackageSelected" -->
						</li>
					</ul>

					<p v-if="messageError?.packages" class="text-red-500 text-[1rem] mt-[10px]">
						{{ messageError.packages[0] }}
					</p>

					<h3 class="font-semibold text-[0.875rem] tablet:text-[1rem] desktop:text-[1.25rem] text-black border-b-[1px] border-[#E6E6E6] desktop:w-[600px] h-auto min-h-[44px] tablet:min-h-[50px] pl-[10px] tablet:pl-[18px] mt-[20px] tablet:mt-[40px] py-[10px] tablet:py-0 tablet:leading-[50px] scroll-mt-[80px]">Inserisci la posizione di partenza e destinazione</h3>

					<div
						class="flex items-start flex-wrap tablet:justify-center desktop-xl:justify-between tablet:gap-x-[20px] gap-y-[16px] tablet:gap-y-[20px] desktop:gap-y-[36px] desktop-xl:gap-y-0 border-[1px] border-[rgba(0,0,0,.2)] rounded-[20px] tablet:rounded-[30px] p-[12px] tablet:p-[15px] mt-[10px]">
						<div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px] relative">
							<label for="origin_city" class="label-preventivo-rapido">Città di Ritiro</label>
							<input type="text" v-model="userStore.shipmentDetails.origin_city" id="origin_city" placeholder="Città" class="input-preventivo-rapido" required autocomplete="off" @input="onOriginCityInput" @blur="setTimeout(() => showOriginSuggestions = false, 200)" />
							<ul v-if="showOriginSuggestions && originSuggestions.length" class="absolute z-50 top-full left-0 right-0 bg-white border border-[#D0D0D0] rounded-[10px] mt-[2px] max-h-[200px] overflow-y-auto shadow-lg">
								<li v-for="loc in originSuggestions" :key="loc.id" @mousedown.prevent="selectOriginLocation(loc)" class="px-[14px] py-[12px] tablet:py-[10px] cursor-pointer hover:bg-[#f0fafb] text-[0.875rem] text-[#252B42] border-b border-[#F0F0F0] last:border-0">
									<span class="font-semibold">{{ loc.place_name }}</span> <span class="text-[#737373]">({{ loc.province_name }}) - {{ loc.postal_code }}</span>
								</li>
							</ul>
							<p v-if="messageError?.['shipment_details.origin_city']" class="text-red-500 text-[1rem] mt-[10px]">
								{{ messageError["shipment_details.origin_city"][0] }}
							</p>
						</div>

						<div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px] relative">
							<label for="origin_postal_code" class="label-preventivo-rapido">CAP di Ritiro</label>
							<input type="text" v-model="userStore.shipmentDetails.origin_postal_code" id="origin_postal_code" placeholder="CAP" :class="sv.errorClass('origin_cap', 'input-preventivo-rapido')" required autocomplete="off" maxlength="5" @input="onOriginCapInput(); onCapInputSmart('origin_cap', userStore.shipmentDetails.origin_postal_code)" @blur="setTimeout(() => showOriginSuggestions = false, 200); onCapBlur('origin_cap', userStore.shipmentDetails.origin_postal_code)" />
							<ul v-if="showOriginSuggestions && originSuggestions.length" class="absolute z-50 top-full left-0 right-0 bg-white border border-[#D0D0D0] rounded-[10px] mt-[2px] max-h-[200px] overflow-y-auto shadow-lg">
								<li v-for="loc in originSuggestions" :key="loc.id" @mousedown.prevent="selectOriginLocation(loc)" class="px-[14px] py-[12px] tablet:py-[10px] cursor-pointer hover:bg-[#f0fafb] text-[0.875rem] text-[#252B42] border-b border-[#F0F0F0] last:border-0">
									<span class="font-semibold">{{ loc.postal_code }}</span> - {{ loc.place_name }} <span class="text-[#737373]">({{ loc.province_name }})</span>
								</li>
							</ul>
							<p v-if="sv.getError('origin_cap')" class="text-red-500 text-[0.8125rem] mt-[4px]">{{ sv.getError('origin_cap') }}</p>
							<p v-else-if="messageError?.['shipment_details.origin_postal_code']" class="text-red-500 text-[1rem] mt-[10px]">
								{{ messageError["shipment_details.origin_postal_code"][0] }}
							</p>
						</div>

						<div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px] relative">
							<label for="destination_city" class="label-preventivo-rapido">Città Consegna</label>
							<input type="text" v-model="userStore.shipmentDetails.destination_city" id="destination_city" placeholder="Città" class="input-preventivo-rapido" required autocomplete="off" @input="onDestCityInput" @blur="setTimeout(() => showDestSuggestions = false, 200)" />
							<ul v-if="showDestSuggestions && destSuggestions.length" class="absolute z-50 top-full left-0 right-0 bg-white border border-[#D0D0D0] rounded-[10px] mt-[2px] max-h-[200px] overflow-y-auto shadow-lg">
								<li v-for="loc in destSuggestions" :key="loc.id" @mousedown.prevent="selectDestLocation(loc)" class="px-[14px] py-[12px] tablet:py-[10px] cursor-pointer hover:bg-[#f0fafb] text-[0.875rem] text-[#252B42] border-b border-[#F0F0F0] last:border-0">
									<span class="font-semibold">{{ loc.place_name }}</span> <span class="text-[#737373]">({{ loc.province_name }}) - {{ loc.postal_code }}</span>
								</li>
							</ul>
							<p v-if="messageError?.['shipment_details.destination_city']" class="text-red-500 text-[1rem] mt-[10px]">
								{{ messageError["shipment_details.destination_city"][0] }}
							</p>
						</div>

						<div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px] relative">
							<label for="destination_postal_code" class="label-preventivo-rapido">CAP Consegna</label>
							<input type="text" v-model="userStore.shipmentDetails.destination_postal_code" id="destination_postal_code" placeholder="CAP" :class="sv.errorClass('dest_cap', 'input-preventivo-rapido')" required autocomplete="off" maxlength="5" @input="onDestCapInput(); onCapInputSmart('dest_cap', userStore.shipmentDetails.destination_postal_code)" @blur="setTimeout(() => showDestSuggestions = false, 200); onCapBlur('dest_cap', userStore.shipmentDetails.destination_postal_code)" />
							<ul v-if="showDestSuggestions && destSuggestions.length" class="absolute z-50 top-full left-0 right-0 bg-white border border-[#D0D0D0] rounded-[10px] mt-[2px] max-h-[200px] overflow-y-auto shadow-lg">
								<li v-for="loc in destSuggestions" :key="loc.id" @mousedown.prevent="selectDestLocation(loc)" class="px-[14px] py-[12px] tablet:py-[10px] cursor-pointer hover:bg-[#f0fafb] text-[0.875rem] text-[#252B42] border-b border-[#F0F0F0] last:border-0">
									<span class="font-semibold">{{ loc.postal_code }}</span> - {{ loc.place_name }} <span class="text-[#737373]">({{ loc.province_name }})</span>
								</li>
							</ul>
							<p v-if="sv.getError('dest_cap')" class="text-red-500 text-[0.8125rem] mt-[4px]">{{ sv.getError('dest_cap') }}</p>
							<p v-else-if="messageError?.['shipment_details.destination_postal_code']" class="text-red-500 text-[1rem] mt-[10px]">
								{{ messageError["shipment_details.destination_postal_code"][0] }}
							</p>
						</div>

					</div>

					<div v-if="userStore.packages.length > 0">
						<h3 class="font-semibold text-[0.875rem] tablet:text-[1rem] desktop:text-[1.25rem] text-black border-b-[1px] border-[#E6E6E6] desktop:w-[492px] min-h-[44px] tablet:min-h-[50px] pl-[10px] tablet:pl-[18px] mt-[20px] tablet:mt-[40px] py-[10px] tablet:py-0 flex items-center gap-[8px] scroll-mt-[80px]">
							Inserisci le dimensioni e il peso dei colli
							<!-- Info icon con tooltip avviso misure -->
							<span class="relative group inline-flex">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-[#737373] cursor-help shrink-0" fill="currentColor"><path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
								<span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-[8px] w-[280px] bg-[#252B42] text-white text-[0.75rem] font-normal leading-[1.4] p-[12px] rounded-[10px] shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-[opacity,visibility] duration-200 z-50 pointer-events-none">
									Inserisci peso e dimensioni reali del collo. Il corriere verifica le misure: se risultano significativamente diverse, il pacco potrebbe essere bloccato e potrebbero essere addebitati costi aggiuntivi per lo svincolo.
									<span class="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#252B42]"></span>
								</span>
							</span>
						</h3>

						<ul class="mt-[10px]">
							<li
								v-for="(pack, packIndex) in userStore.packages"
								:key="packIndex"
								class="relative border-[1px] border-[rgba(0,0,0,.2)] rounded-[20px] tablet:rounded-[30px] p-[12px_14px] tablet:p-[15px_20px] mt-[10px] w-full scroll-mt-[80px]">
								<!-- Header riga: icona pacco + cestino (mobile) -->
								<div class="flex items-center justify-between desktop-xl:hidden mb-[12px]">
									<div class="flex items-center gap-[10px]">
										<!-- Ottimizzazione: lazy loading + decoding async -->
										<NuxtImg :src="`/img/quote/first-step/${pack.img}`" :alt="pack.package_type" width="32" height="32" loading="lazy" decoding="async" class="h-[32px] w-auto object-contain" />
										<span class="text-[0.875rem] font-semibold text-[#333]">{{ pack.package_type }}</span>
									</div>
									<button type="button" class="cursor-pointer text-[#DB9FA1] p-[4px] min-w-[36px] min-h-[36px] flex items-center justify-center hover:text-red-500 transition-colors" @click="deletePack(packIndex)" aria-label="Elimina elemento" title="Rimuovi questo collo dalla spedizione">
										<!-- Ottimizzazione: lazy loading + decoding async -->
										<NuxtImg src="/img/quote/first-step/trash.png" alt="" width="24" height="28" loading="lazy" decoding="async" />
									</button>
								</div>

								<!-- Contenuto: campi input -->
								<div class="flex items-start flex-wrap tablet:justify-center desktop-xl:justify-between tablet:gap-x-[20px] gap-y-[16px] tablet:gap-y-[20px] desktop:gap-y-[36px] desktop-xl:gap-y-0 li-card before:content-[''] before:self-center before:hidden desktop-xl:before:block"
									:style="{ '--before-bg': `url(/img/quote/first-step/${pack.img})`, '--before-width': `${pack.width}px`, '--before-height': `${pack.height}px` }">

								<div class="self-center">
									<select v-model="pack.quantity" id="quantity" class="text-black text-[1.25rem] font-medium min-h-[44px] min-w-[44px]" @change="calcQuantity(pack)" title="Numero di colli identici da spedire. Il prezzo verrà moltiplicato per la quantità.">
										<option v-for="quantity in 10" :key="quantity" :value="quantity" :disabled="quantity === pack.quantity">
											{{ quantity }}
										</option>
									</select>
									<p v-if="messageError?.[`packages.${packIndex}.quantity`]" class="text-red-500 text-[1rem] mt-[10px]">
										{{ messageError[`packages.${packIndex}.quantity`][0] }}
									</p>
								</div>

								<div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px]">
									<label for="weight" class="label-preventivo-rapido" title="Inserisci il peso effettivo del collo in kilogrammi">Peso (Kg)</label>
									<input type="text" placeholder="...Kg" v-model="pack.weight" id="weight" :class="sv.errorClass(`peso_${packIndex}`, 'input-preventivo-rapido')" @input="onWeightInput(pack, packIndex)" @blur="onWeightBlur(pack, packIndex)" required title="Peso effettivo del collo. Il prezzo viene calcolato in base al peso o al volume, a seconda di quale è maggiore." />
									<p v-if="sv.getError(`peso_${packIndex}`)" class="text-red-500 text-[0.8125rem] mt-[4px]">{{ sv.getError(`peso_${packIndex}`) }}</p>
									<p v-else-if="messageError?.[`packages.${packIndex}.weight`]" class="text-red-500 text-[1rem] mt-[10px]">
										{{ messageError[`packages.${packIndex}.weight`][0] }}
									</p>
								</div>

								<div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px]">
									<label for="first_size" class="label-preventivo-rapido" title="Misura in centimetri del primo lato del collo (lunghezza)">Lato 1 (Cm)</label>
									<input type="text" placeholder="...Cm" v-model="pack.first_size" id="first_size" :class="sv.errorClass(`first_size_${packIndex}`, 'input-preventivo-rapido')" @input="onDimInput(pack, packIndex, 'first_size', 'Lato 1')" @blur="onDimBlur(pack, packIndex, 'first_size', 'Lato 1')" required />
									<p v-if="sv.getError(`first_size_${packIndex}`)" class="text-red-500 text-[0.8125rem] mt-[4px]">{{ sv.getError(`first_size_${packIndex}`) }}</p>
									<p v-else-if="messageError?.[`packages.${packIndex}.first_size`]" class="text-red-500 text-[1rem] mt-[10px]">
										{{ messageError[`packages.${packIndex}.first_size`][0] }}
									</p>
								</div>

								<div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px]">
									<label for="second_size" class="label-preventivo-rapido" title="Misura in centimetri del secondo lato del collo (larghezza)">Lato 2 (Cm)</label>
									<input type="text" placeholder="...Cm" v-model="pack.second_size" id="second_size" :class="sv.errorClass(`second_size_${packIndex}`, 'input-preventivo-rapido')" @input="onDimInput(pack, packIndex, 'second_size', 'Lato 2')" @blur="onDimBlur(pack, packIndex, 'second_size', 'Lato 2')" required />
									<p v-if="sv.getError(`second_size_${packIndex}`)" class="text-red-500 text-[0.8125rem] mt-[4px]">{{ sv.getError(`second_size_${packIndex}`) }}</p>
									<p v-else-if="messageError?.[`packages.${packIndex}.second_size`]" class="text-red-500 text-[1rem] mt-[10px]">
										{{ messageError[`packages.${packIndex}.second_size`][0] }}
									</p>
								</div>

								<div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px]">
									<label for="third_size" class="label-preventivo-rapido" title="Misura in centimetri del terzo lato del collo (altezza)">Lato 3 (Cm)</label>
									<input type="text" placeholder="...Cm" v-model="pack.third_size" id="third_size" :class="sv.errorClass(`third_size_${packIndex}`, 'input-preventivo-rapido')" @input="onDimInput(pack, packIndex, 'third_size', 'Lato 3')" @blur="onDimBlur(pack, packIndex, 'third_size', 'Lato 3')" required />
									<p v-if="sv.getError(`third_size_${packIndex}`)" class="text-red-500 text-[0.8125rem] mt-[4px]">{{ sv.getError(`third_size_${packIndex}`) }}</p>
									<p v-else-if="messageError?.[`packages.${packIndex}.third_size`]" class="text-red-500 text-[1rem] mt-[10px]">
										{{ messageError[`packages.${packIndex}.third_size`][0] }}
									</p>
								</div>

								<button type="button" class="hidden desktop-xl:flex cursor-pointer text-[#DB9FA1] self-center p-[6px] min-w-[44px] min-h-[44px] items-center justify-center hover:text-red-500 transition-colors" @click="deletePack(packIndex)" aria-label="Elimina elemento" title="Rimuovi questo collo dalla spedizione">
									<!-- Ottimizzazione: lazy loading + decoding async -->
									<NuxtImg src="/img/quote/first-step/trash.png" alt="" width="30" height="35" loading="lazy" decoding="async" />
								</button>
								</div>
							</li>
						</ul>
					</div>

					<!-- <button
							type="button"
							class="bg-[#E44203] w-full text-white font-semibold text-center mt-[32px] desktop-xl:mt-[88px] rounded-[50px] desktop:mt-0 cursor-pointer tracking-[-0.48px] after:content-[''] after:bg-[url(/img/arrow-down.svg)] after:inline-block after:size-[16px]"
							@click="calculateRate"
							:class="{
								'text-[1.875rem] h-[80px] after:ml-[20px] after:scale-200': !isRateCalculated,
								'h-[113px] after:scale-300 after:ml-[35px] flex items-center justify-center': isRateCalculated,
							}">
							<span v-if="!isRateCalculated">Continua</span>
							<span v-else>
								<span class="text-[2.25rem] border-b-[1px] border-white pb-[4px]">Spedisci da {{ totalPrice }}€</span>
								<span class="block text-center mt-[5px]">IVA inclusa</span>
							</span>
						</button> -->

					<!-- Promo banner sopra il CTA -->
					<div v-if="promoSettings?.active && promoSettings?.label_text" class="flex justify-center mt-[20px] desktop:mt-[16px]">
						<span
							:style="{ backgroundColor: promoSettings.label_color || '#E44203' }"
							class="inline-flex items-center gap-[6px] px-[14px] py-[6px] rounded-[10px] text-white text-[0.875rem] font-bold tracking-wide shadow-sm">
							<!-- Ottimizzazione: lazy loading + decoding async + dimensioni per prevenire CLS -->
							<img v-if="promoSettings.label_image" :src="promoSettings.label_image" alt="" loading="lazy" decoding="async" width="40" height="18" class="h-[18px] w-auto" />
							{{ promoSettings.label_text }}
						</span>
					</div>

					<div
						class="continue-button-wrapper bg-[#E44203] w-full text-white font-semibold text-center rounded-[50px] tracking-[-0.48px] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[#c93800] hover:shadow-[0_6px_20px_rgba(228,66,3,0.35)] active:scale-[0.98] overflow-hidden"
						:class="[
							{ 'text-[1.5rem] tablet:text-[1.875rem] h-[64px] tablet:h-[80px]': !isRateCalculated, 'h-[90px] tablet:h-[113px]': isRateCalculated },
							promoSettings?.active && promoSettings?.label_text ? 'mt-[12px]' : 'mt-[24px] desktop-xl:mt-[40px] desktop:mt-[20px]'
						]">
							<button
								v-if="status !== 'pending' && !isCalculating"
								type="button"
								@click="continueToNextStep"
								:disabled="isCalculating"
								class="w-full h-full rounded-[50px] cursor-pointer flex items-center justify-center gap-[10px] text-[1.5rem] tablet:text-[1.875rem] disabled:opacity-70 disabled:cursor-not-allowed">
								<span v-if="!isRateCalculated">Continua</span>
								<span v-else>
									<span class="text-[1.75rem] tablet:text-[2.25rem] border-b-[1px] border-white pb-[4px]">Spedisci da {{ session?.data?.total_price }}€</span>
									<span class="block text-center mt-[5px] text-[0.875rem] tablet:text-[1rem]">IVA inclusa</span>
								</span>
								<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
							</button>

						<p v-if="status === 'pending' || isCalculating" class="h-full flex justify-center items-center">
							<Icon name="eos-icons:bubble-loading" style="font-size: 60px" />
						</p>
					</div>


					<!-- <button
							type="button"
							class="bg-[#E44203] w-full text-white font-semibold text-center mt-[32px] desktop-xl:mt-[88px] rounded-[50px] desktop:mt-0 cursor-pointer tracking-[-0.48px] after:content-[''] after:bg-[url(/img/arrow-down.svg)] after:inline-block after:size-[16px] text-[1.875rem] h-[80px] after:ml-[10px] after:scale-200"
							@click="calculateRate"
							v-if="!isRateCalculated">
							Continua
						</button>

						<NuxtLink
							to="/la-tua-spedizione"
							v-else
							class="bg-[#E44203] w-full text-white font-semibold text-center mt-[32px] desktop-xl:mt-[88px] rounded-[50px] desktop:mt-0 cursor-pointer tracking-[-0.48px] after:content-[''] after:bg-[url(/img/arrow-down.svg)] after:inline-block after:size-[16px] h-[113px] after:scale-300 after:ml-[35px] flex items-center justify-center">
							<span>
								<span class="text-[2.25rem] border-b-[1px] border-white pb-[4px]">Spedisci da {{ userStore.totalPrice }}€</span>
								<span class="block text-center mt-[5px]">IVA inclusa</span>
							</span>
						</NuxtLink> -->
				</form>
			</div>
		</div>
	</section>
</template>

<style>
/* Mobile-first: smaller images on small screens */
.package-card::after {
	background-image: var(--after-bg);
	width: calc(var(--after-width) * 0.65);
	height: calc(var(--after-height) * 0.65);
	background-size: contain;
}

.li-card::before {
	background-image: var(--before-bg);
	width: calc(var(--before-width) * 0.7);
	height: calc(var(--before-height) * 0.7);
	background-size: contain;
}

/* Tablet and up: full-size images */
@media (min-width: 45rem) {
	.package-card::after {
		width: var(--after-width);
		height: var(--after-height);
	}

	.li-card::before {
		width: var(--before-width);
		height: var(--before-height);
	}
}

.service-list::before {
	background-image: var(--before-service-bg);
	width: var(--before-service-width);
	height: var(--before-service-height);
}

/* Animazione bottone Continua che sale */
.continue-button-wrapper {
	will-change: transform;
	transition: transform 1.5s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.continue-button-wrapper.button-rise-up {
	transform: translateY(var(--rise-distance, 0));
}
</style>
