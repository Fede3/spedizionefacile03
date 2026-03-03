<!--
  FILE: pages/account/amministrazione/prezzi.vue
  SCOPO: Pannello admin — editor fasce di prezzo (peso e volume) e gestione promozione sito.
         Tabelle editabili inline con prezzi base, scontati, percentuale sconto, toggle visibilita'.
         Sezione promozione: etichetta personalizzabile, colore, immagine, descrizione, anteprima live.
  API: GET /api/admin/price-bands — leggi fasce prezzo,
       PUT /api/admin/price-bands — salva modifiche fasce,
       POST /api/admin/price-bands/seed — inizializza fasce nel DB,
       GET /api/admin/promo-settings — leggi impostazioni promo,
       POST /api/admin/promo-settings — salva impostazioni promo,
       POST /api/admin/promo-settings/upload-image — carica immagine promo.
  COMPONENTI: nessun componente custom.
  ROUTE: /account/amministrazione/prezzi (middleware sanctum:auth + admin).

  DATI IN INGRESSO:
    - weightBands, volumeBands (da fetchPriceBands) — fasce dal server o default.
    - promo (da fetchPromoSettings) — impostazioni promozione.
    - usePriceBands().forceReload — ricarica fasce pubbliche dopo salvataggio.

  DATI IN USCITA:
    - PUT fasce prezzo, POST promo settings, POST upload immagine.

  VINCOLI:
    - Solo utenti Admin (middleware admin).
    - I prezzi sono salvati in centesimi nel DB, visualizzati in euro nel frontend.
    - Formula prezzo: MAX(prezzo_peso, prezzo_volume) + supplemento CAP90 (+2,50 per ogni CAP "90").
    - Se discount_price e' null, il prezzo effettivo e' il base_price.

  ERRORI TIPICI:
    - Fasce non ancora nel DB → banner giallo con pulsante "Inizializza".
    - Formato prezzo errato → euroToCents restituisce null.

  PUNTI DI MODIFICA SICURI:
    - Aggiungere fasce: modificare DEFAULT_WEIGHT_BANDS / DEFAULT_VOLUME_BANDS.
    - Cambiare formula sconto: modificare discountInfo().
    - Personalizzare anteprima promo: modificare il blocco "Anteprima header homepage".

  COLLEGAMENTI:
    - composables/usePriceBands.js → cache pubblica delle fasce prezzo.
    - components/Preventivo.vue → usa le fasce per il calcolo preventivo.
    - components/ContenutoHeader.vue → mostra etichetta promo e descrizione.
-->
<script setup>
definePageMeta({
	middleware: ["sanctum:auth", "admin"],
});

const sanctum = useSanctumClient();
const { actionMessage, showSuccess, showError } = useAdmin();
const { forceReload: reloadPublicPriceBands } = usePriceBands();

const isLoading = ref(true);
const saving = ref(false);
const seeding = ref(false);
const weightBands = ref([]);
const volumeBands = ref([]);
const bandsFromDb = ref(false);
const originalWeightBands = ref([]);
const originalVolumeBands = ref([]);

// --- PROMO ---
const promoLoading = ref(false);
const promoSaving = ref(false);
const promoImageUploading = ref(false);
const promo = ref({
	active: false,
	label_text: '',
	label_color: '#E44203',
	label_image: null,
	show_badges: true,
	description: '', // Descrizione testuale dello sconto mostrata nell'header homepage
});

// Confronta se ci sono modifiche rispetto ai valori originali
const hasChanges = computed(() => {
	if (!bandsFromDb.value) return false;
	if (weightBands.value.length !== originalWeightBands.value.length) return true;
	if (volumeBands.value.length !== originalVolumeBands.value.length) return true;
	for (let i = 0; i < weightBands.value.length; i++) {
		if (weightBands.value[i].base_price !== originalWeightBands.value[i].base_price) return true;
		if (weightBands.value[i].discount_price !== originalWeightBands.value[i].discount_price) return true;
		if (weightBands.value[i].show_discount !== originalWeightBands.value[i].show_discount) return true;
	}
	for (let i = 0; i < volumeBands.value.length; i++) {
		if (volumeBands.value[i].base_price !== originalVolumeBands.value[i].base_price) return true;
		if (volumeBands.value[i].discount_price !== originalVolumeBands.value[i].discount_price) return true;
		if (volumeBands.value[i].show_discount !== originalVolumeBands.value[i].show_discount) return true;
	}
	return false;
});

// Fasce di default
const DEFAULT_WEIGHT_BANDS = [
	{ min_value: 0, max_value: 2, base_price: 890, discount_price: null, show_discount: true },
	{ min_value: 2, max_value: 5, base_price: 1190, discount_price: null, show_discount: true },
	{ min_value: 5, max_value: 10, base_price: 1490, discount_price: null, show_discount: true },
	{ min_value: 10, max_value: 25, base_price: 1990, discount_price: null, show_discount: true },
	{ min_value: 25, max_value: 50, base_price: 2990, discount_price: null, show_discount: true },
	{ min_value: 50, max_value: 75, base_price: 3990, discount_price: null, show_discount: true },
	{ min_value: 75, max_value: 100, base_price: 4990, discount_price: null, show_discount: true },
];
const DEFAULT_VOLUME_BANDS = [
	{ min_value: 0, max_value: 0.010, base_price: 890, discount_price: null, show_discount: true },
	{ min_value: 0.010, max_value: 0.020, base_price: 1190, discount_price: null, show_discount: true },
	{ min_value: 0.020, max_value: 0.040, base_price: 1490, discount_price: null, show_discount: true },
	{ min_value: 0.040, max_value: 0.100, base_price: 1990, discount_price: null, show_discount: true },
	{ min_value: 0.100, max_value: 0.200, base_price: 2990, discount_price: null, show_discount: true },
	{ min_value: 0.200, max_value: 0.300, base_price: 3990, discount_price: null, show_discount: true },
	{ min_value: 0.300, max_value: 0.400, base_price: 4990, discount_price: null, show_discount: true },
];

// Stato editing
const editingCell = ref(null);
const editValue = ref('');

const fetchPriceBands = async () => {
	isLoading.value = true;
	try {
		const res = await sanctum("/api/admin/price-bands");
		const data = res?.data || res || {};
		const w = data.weight || [];
		const v = data.volume || [];
		if (w.length > 0 || v.length > 0) {
			weightBands.value = w.map(b => ({ ...b }));
			volumeBands.value = v.map(b => ({ ...b }));
			originalWeightBands.value = w.map(b => ({ ...b }));
			originalVolumeBands.value = v.map(b => ({ ...b }));
			bandsFromDb.value = true;
		} else {
			weightBands.value = DEFAULT_WEIGHT_BANDS.map((b, i) => ({ ...b, id: `new-w-${i}` }));
			volumeBands.value = DEFAULT_VOLUME_BANDS.map((b, i) => ({ ...b, id: `new-v-${i}` }));
			bandsFromDb.value = false;
		}
	} catch (e) {
		weightBands.value = DEFAULT_WEIGHT_BANDS.map((b, i) => ({ ...b, id: `new-w-${i}` }));
		volumeBands.value = DEFAULT_VOLUME_BANDS.map((b, i) => ({ ...b, id: `new-v-${i}` }));
		bandsFromDb.value = false;
	} finally {
		isLoading.value = false;
	}
};

const fetchPromoSettings = async () => {
	promoLoading.value = true;
	try {
		const res = await sanctum("/api/admin/promo-settings");
		const data = res?.data || res || {};
		promo.value = {
			active: data.promo_active === 'true' || data.promo_active === true,
			label_text: data.promo_label_text || '',
			label_color: data.promo_label_color || '#E44203',
			label_image: data.promo_label_image || null,
			show_badges: data.promo_show_badges === 'true' || data.promo_show_badges === true,
			description: data.promo_description || '',
		};
	} catch (e) {
		// Default values already set
	} finally {
		promoLoading.value = false;
	}
};

const seedBands = async () => {
	seeding.value = true;
	try {
		await sanctum("/api/admin/price-bands/seed", { method: "POST" });
		showSuccess("Fasce di prezzo inizializzate nel database.");
		await fetchPriceBands();
		await reloadPublicPriceBands();
	} catch (e) {
		showError(e, "Errore durante l'inizializzazione delle fasce.");
	} finally {
		seeding.value = false;
	}
};

const centsToEuro = (cents) => {
	if (cents == null || cents === '') return '-';
	return (Number(cents) / 100).toFixed(2).replace('.', ',') + '\u20AC';
};

const euroToCents = (euro) => {
	if (euro == null || euro === '') return null;
	const cleaned = String(euro).replace(/[€\s]/g, '').replace(',', '.');
	const num = parseFloat(cleaned);
	return isNaN(num) ? null : Math.round(num * 100);
};

const effectivePrice = (band) => {
	return band.discount_price != null ? band.discount_price : band.base_price;
};

// Calcola la percentuale di sconto/aumento
const discountInfo = (band) => {
	if (band.discount_price == null || band.base_price <= 0) return null;
	const diff = ((1 - band.discount_price / band.base_price) * 100);
	return Math.round(diff);
};

const startEdit = (type, idx, field) => {
	const key = `${type}-${idx}-${field}`;
	editingCell.value = key;
	const bands = type === 'weight' ? weightBands.value : volumeBands.value;
	const cents = bands[idx][field];
	editValue.value = cents != null ? (Number(cents) / 100).toFixed(2).replace('.', ',') : '';
	nextTick(() => {
		const input = document.getElementById(`edit-${key}`);
		if (input) { input.focus(); input.select(); }
	});
};

const confirmEdit = (type, idx, field) => {
	const key = `${type}-${idx}-${field}`;
	if (editingCell.value !== key) return;
	const bands = type === 'weight' ? weightBands.value : volumeBands.value;
	const newCents = euroToCents(editValue.value);

	// Validate that price is not negative
	if (newCents !== null && newCents < 0) {
		showError(null, "Il prezzo non può essere negativo.");
		editingCell.value = null;
		editValue.value = '';
		return;
	}

	bands[idx][field] = newCents;
	console.log(`[AUDIT] Admin updated ${type} band #${idx + 1} ${field}: ${newCents ? (newCents / 100).toFixed(2) + '€' : 'null'}`);
	editingCell.value = null;
	editValue.value = '';
};

const cancelEdit = () => {
	editingCell.value = null;
	editValue.value = '';
};

const toggleShowDiscount = (type, idx) => {
	const bands = type === 'weight' ? weightBands.value : volumeBands.value;
	bands[idx].show_discount = !bands[idx].show_discount;
};

const savePriceBands = async () => {
	saving.value = true;
	console.log(`[AUDIT] Admin saving price bands (${weightBands.value.length} weight + ${volumeBands.value.length} volume)`);
	try {
		const allBands = [...weightBands.value, ...volumeBands.value].map(b => ({
			id: b.id,
			base_price: b.base_price,
			discount_price: b.discount_price,
			show_discount: b.show_discount ?? true,
		}));
		await sanctum("/api/admin/price-bands", { method: "PUT", body: { bands: allBands } });
		showSuccess("Fasce di prezzo salvate con successo. I nuovi prezzi sono attivi per tutti gli utenti.");
		originalWeightBands.value = weightBands.value.map(b => ({ ...b }));
		originalVolumeBands.value = volumeBands.value.map(b => ({ ...b }));
		await reloadPublicPriceBands();
	} catch (e) {
		showError(e, "Errore durante il salvataggio delle fasce.");
	} finally {
		saving.value = false;
	}
};

const savePromo = async () => {
	promoSaving.value = true;
	console.log(`[AUDIT] Admin saving promo settings: active=${promo.value.active}, label="${promo.value.label_text}"`);
	try {
		await sanctum("/api/admin/promo-settings", {
			method: "POST",
			body: {
				promo_active: promo.value.active ? 'true' : 'false',
				promo_label_text: promo.value.label_text,
				promo_label_color: promo.value.label_color,
				promo_show_badges: promo.value.show_badges ? 'true' : 'false',
				promo_description: promo.value.description,
			},
		});
		showSuccess("Impostazioni promozione salvate con successo.");
		await reloadPublicPriceBands();
	} catch (e) {
		showError(e, "Errore durante il salvataggio della promozione.");
	} finally {
		promoSaving.value = false;
	}
};

const uploadPromoImage = async (event) => {
	const file = event.target.files?.[0];
	if (!file) return;

	// Validate file type
	const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
	if (!validTypes.includes(file.type)) {
		showError(null, "Formato file non valido. Usa JPG, PNG, GIF o WebP.");
		event.target.value = ''; // Reset input
		return;
	}

	// Validate file size (max 2MB)
	const maxSize = 2 * 1024 * 1024; // 2MB in bytes
	if (file.size > maxSize) {
		showError(null, "File troppo grande. Dimensione massima: 2MB.");
		event.target.value = ''; // Reset input
		return;
	}

	promoImageUploading.value = true;
	console.log(`[AUDIT] Admin uploading promo image: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
	try {
		const formData = new FormData();
		formData.append('image', file);
		const res = await sanctum("/api/admin/promo-settings/upload-image", {
			method: "POST",
			body: formData,
		});
		promo.value.label_image = res?.image_url || null;
		showSuccess("Immagine promo caricata.");
	} catch (e) {
		showError(e, "Errore durante l'upload dell'immagine.");
	} finally {
		promoImageUploading.value = false;
		event.target.value = ''; // Reset input
	}
};

onMounted(() => {
	fetchPriceBands();
	fetchPromoSettings();
});
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container">
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866] font-medium">Il tuo account</NuxtLink>
				<span class="mx-[8px] text-[#C8CCD0]">/</span>
				<span class="font-semibold text-[#252B42]">Prezzi e fasce</span>
			</div>

			<h1 class="text-[1.375rem] tablet:text-[1.75rem] font-bold text-[#252B42] mb-[8px]">Prezzi e fasce</h1>
			<p class="text-[0.875rem] text-[#737373] mb-[16px]">Clicca su un prezzo per modificarlo. Premi Invio per confermare o Esc per annullare.</p>

			<!-- Info calcolatore -->
			<div class="bg-purple-50 rounded-[16px] p-[14px] tablet:p-[20px] border border-purple-200 mb-[24px]">
				<h3 class="text-[0.9375rem] font-bold text-purple-800 mb-[8px] flex items-center gap-[6px]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M7,2H17A2,2 0 0,1 19,4V20A2,2 0 0,1 17,22H7A2,2 0 0,1 5,20V4A2,2 0 0,1 7,2M7,4V8H17V4H7M7,10V12H9V10H7M11,10V12H13V10H11M15,10V12H17V10H15M7,14V16H9V14H7M11,14V16H13V14H11M15,14V16H17V14H15M7,18V20H9V18H7M11,18V20H13V18H11M15,18V20H17V18H15Z"/></svg>
					Come funziona il calcolatore
				</h3>
				<ul class="text-[0.8125rem] text-purple-700 space-y-[4px] list-disc list-inside">
					<li><strong>Prezzo finale = MAX(prezzo_peso, prezzo_volume)</strong> + supplemento CAP90</li>
					<li><strong>Peso volumetrico:</strong> (Lunghezza x Larghezza x Altezza) / 5000 (dimensioni in cm)</li>
					<li><strong>Supplemento CAP90:</strong> +2,50&euro; per ogni CAP che inizia con "90" (mittente e/o destinatario)</li>
					<li>Se c'e' un <strong>prezzo scontato</strong>, viene usato al posto del prezzo base</li>
					<li>Il prezzo visualizzato dal cliente e' il <strong>"Prezzo effettivo"</strong> in verde</li>
					<li><strong>Sconto %:</strong> calcolato automaticamente come (1 - scontato/base) &times; 100</li>
					<li><strong>Visibile:</strong> controlla se il badge sconto appare sul sito per quella fascia</li>
				</ul>
			</div>

			<!-- Action message -->
			<div
				v-if="actionMessage"
				:class="[
					'mb-[20px] px-[16px] py-[12px] rounded-[12px] text-[0.875rem] font-medium flex items-center gap-[8px]',
					actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200',
				]">
				<svg v-if="actionMessage.type === 'success'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg>
				<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
				{{ actionMessage.text }}
			</div>

			<!-- Loading -->
			<div v-if="isLoading" class="py-[60px] flex justify-center">
				<div class="w-[40px] h-[40px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></div>
			</div>

			<template v-else>
				<div class="space-y-[24px]">
					<!-- Banner: fasce non salvate nel DB -->
					<div v-if="!bandsFromDb" class="bg-amber-50 rounded-[16px] p-[20px] border border-amber-200 mb-[24px]">
						<div class="flex items-start gap-[12px]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[24px] h-[24px] text-amber-600 shrink-0 mt-[2px]" fill="currentColor"><path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
							<div>
								<h3 class="text-[0.9375rem] font-bold text-amber-800 mb-[4px]">Fasce di prezzo non ancora nel database</h3>
								<p class="text-[0.8125rem] text-amber-700 mb-[12px]">Stai vedendo i valori predefiniti del calcolatore. Premi il pulsante per salvarli nel database e poterli modificare.</p>
								<button
									@click="seedBands"
									:disabled="seeding"
									class="inline-flex items-center gap-[8px] px-[20px] py-[10px] bg-amber-600 hover:bg-amber-700 text-white rounded-[50px] text-[0.875rem] font-medium transition-colors cursor-pointer disabled:opacity-50">
									<svg v-if="seeding" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] animate-spin" fill="currentColor"><path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/></svg>
									<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M17,13H13V17H11V13H7V11H11V7H13V11H17M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
									{{ seeding ? "Inizializzazione..." : "Inizializza fasce nel database" }}
								</button>
							</div>
						</div>
					</div>

					<!-- Fasce peso -->
					<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
						<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[6px] flex items-center gap-[8px]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-[#095866]" fill="currentColor"><path d="M12,3A4,4 0 0,1 16,7C16,7.73 15.81,8.41 15.46,9H18C18.95,9 19.75,9.67 19.95,10.56C21.96,18.57 22,18.78 22,19A2,2 0 0,1 20,21H4A2,2 0 0,1 2,19C2,18.78 2.04,18.57 4.05,10.56C4.25,9.67 5.05,9 6,9H8.54C8.19,8.41 8,7.73 8,7A4,4 0 0,1 12,3M12,5A2,2 0 0,0 10,7A2,2 0 0,0 12,9A2,2 0 0,0 14,7A2,2 0 0,0 12,5Z"/></svg> Fasce peso
						</h2>
						<p class="text-[0.75rem] text-[#737373] mb-[20px]">Clicca sul prezzo per modificarlo. I valori sono in euro.</p>

						<div v-if="!weightBands.length" class="text-center py-[32px] text-[#737373]">
							<p>Nessuna fascia peso configurata.</p>
						</div>

						<div v-else class="overflow-x-auto">
							<table class="w-full text-[0.875rem] min-w-[700px]">
								<thead>
									<tr class="border-b border-[#E9EBEC] text-left text-[#737373]">
										<th class="pb-[12px] font-medium">#</th>
										<th class="pb-[12px] font-medium">Min</th>
										<th class="pb-[12px] font-medium">Max</th>
										<th class="pb-[12px] font-medium">Prezzo base</th>
										<th class="pb-[12px] font-medium">Prezzo scontato</th>
										<th class="pb-[12px] font-medium">Effettivo</th>
										<th class="pb-[12px] font-medium">Sconto %</th>
										<th class="pb-[12px] font-medium text-center">Visibile</th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="(band, idx) in weightBands" :key="band.id || idx" :class="['border-b border-[#F0F0F0] last:border-0', idx % 2 === 1 ? 'bg-[#FAFBFC]' : '']">
										<td class="py-[14px] font-bold text-[#252B42]">{{ idx + 1 }}</td>
										<td class="py-[14px] text-[#404040]">{{ band.min_value }} kg</td>
										<td class="py-[14px] text-[#404040]">{{ band.max_value }} kg</td>
										<td class="py-[14px]">
											<div v-if="editingCell === `weight-${idx}-base_price`" class="flex items-center gap-[6px]">
												<span class="text-[#737373]">&euro;</span>
												<input
													:id="`edit-weight-${idx}-base_price`"
													v-model="editValue"
													@keydown.enter="confirmEdit('weight', idx, 'base_price')"
													@keydown.esc="cancelEdit()"
													@blur="confirmEdit('weight', idx, 'base_price')"
													type="number"
													min="0"
													step="0.01"
													class="w-[100px] px-[10px] py-[8px] tablet:py-[6px] bg-white border-2 border-[#095866] rounded-[8px] text-[1rem] tablet:text-[0.8125rem] focus:outline-none"
													placeholder="0,00"
												/>
											</div>
											<button
												v-else
												type="button"
												@click="startEdit('weight', idx, 'base_price')"
												class="px-[12px] py-[6px] rounded-[8px] text-[0.875rem] font-semibold text-[#252B42] hover:bg-[#E8F4FB] transition-colors cursor-pointer border border-transparent hover:border-[#B0D4E8]">
												{{ centsToEuro(band.base_price) }}
											</button>
										</td>
										<td class="py-[14px]">
											<div v-if="editingCell === `weight-${idx}-discount_price`" class="flex items-center gap-[6px]">
												<span class="text-[#737373]">&euro;</span>
												<input
													:id="`edit-weight-${idx}-discount_price`"
													v-model="editValue"
													@keydown.enter="confirmEdit('weight', idx, 'discount_price')"
													@keydown.esc="cancelEdit()"
													@blur="confirmEdit('weight', idx, 'discount_price')"
													type="number"
													min="0"
													step="0.01"
													class="w-[100px] px-[10px] py-[8px] tablet:py-[6px] bg-white border-2 border-[#095866] rounded-[8px] text-[1rem] tablet:text-[0.8125rem] focus:outline-none"
													placeholder="vuoto = usa base"
												/>
											</div>
											<button
												v-else
												type="button"
												@click="startEdit('weight', idx, 'discount_price')"
												class="px-[12px] py-[6px] rounded-[8px] text-[0.875rem] text-[#737373] hover:bg-[#E8F4FB] transition-colors cursor-pointer border border-transparent hover:border-[#B0D4E8]">
												{{ band.discount_price != null ? centsToEuro(band.discount_price) : '-' }}
											</button>
										</td>
										<td class="py-[14px]">
											<span class="font-semibold text-emerald-600 text-[0.9375rem]">{{ centsToEuro(effectivePrice(band)) }}</span>
										</td>
										<td class="py-[14px]">
											<template v-if="discountInfo(band) !== null">
												<span v-if="discountInfo(band) > 0" class="inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-[6px] bg-emerald-50 text-emerald-700 text-[0.8125rem] font-semibold border border-emerald-200">
													-{{ discountInfo(band) }}%
												</span>
												<span v-else class="inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-[6px] bg-amber-50 text-amber-700 text-[0.75rem] font-medium border border-amber-200">
													+{{ Math.abs(discountInfo(band)) }}% (aumento)
												</span>
											</template>
											<span v-else class="text-[#C8CCD0]">-</span>
										</td>
										<td class="py-[14px] text-center">
											<button
												type="button"
												@click="toggleShowDiscount('weight', idx)"
												:class="band.show_discount ? 'bg-[#095866]' : 'bg-[#C8CCD0]'"
												class="relative inline-flex h-[32px] w-[56px] tablet:h-[24px] tablet:w-[44px] items-center rounded-full transition-colors cursor-pointer">
												<span
													:class="band.show_discount ? 'translate-x-[28px] tablet:translate-x-[22px]' : 'translate-x-[2px]'"
													class="inline-block h-[26px] w-[26px] tablet:h-[20px] tablet:w-[20px] transform rounded-full bg-white transition-transform shadow-sm" />
											</button>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>

					<!-- Fasce volume -->
					<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
						<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[6px] flex items-center gap-[8px]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-indigo-600" fill="currentColor"><path d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5M12,4.15L6.04,7.5L12,10.85L17.96,7.5L12,4.15M5,15.91L11,19.29V12.58L5,9.21V15.91M19,15.91V9.21L13,12.58V19.29L19,15.91Z"/></svg> Fasce volume
						</h2>
						<p class="text-[0.75rem] text-[#737373] mb-[20px]">Fasce basate sul peso volumetrico (L x P x H / 5000). Clicca sul prezzo per modificarlo.</p>

						<div v-if="!volumeBands.length" class="text-center py-[32px] text-[#737373]">
							<p>Nessuna fascia volume configurata.</p>
						</div>

						<div v-else class="overflow-x-auto">
							<table class="w-full text-[0.875rem] min-w-[700px]">
								<thead>
									<tr class="border-b border-[#E9EBEC] text-left text-[#737373]">
										<th class="pb-[12px] font-medium">#</th>
										<th class="pb-[12px] font-medium">Min</th>
										<th class="pb-[12px] font-medium">Max</th>
										<th class="pb-[12px] font-medium">Prezzo base</th>
										<th class="pb-[12px] font-medium">Prezzo scontato</th>
										<th class="pb-[12px] font-medium">Effettivo</th>
										<th class="pb-[12px] font-medium">Sconto %</th>
										<th class="pb-[12px] font-medium text-center">Visibile</th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="(band, idx) in volumeBands" :key="band.id || idx" :class="['border-b border-[#F0F0F0] last:border-0', idx % 2 === 1 ? 'bg-[#FAFBFC]' : '']">
										<td class="py-[14px] font-bold text-[#252B42]">{{ idx + 1 }}</td>
										<td class="py-[14px] text-[#404040]">{{ band.min_value }} m&sup3;</td>
										<td class="py-[14px] text-[#404040]">{{ band.max_value }} m&sup3;</td>
										<td class="py-[14px]">
											<div v-if="editingCell === `volume-${idx}-base_price`" class="flex items-center gap-[6px]">
												<span class="text-[#737373]">&euro;</span>
												<input
													:id="`edit-volume-${idx}-base_price`"
													v-model="editValue"
													@keydown.enter="confirmEdit('volume', idx, 'base_price')"
													@keydown.esc="cancelEdit()"
													@blur="confirmEdit('volume', idx, 'base_price')"
													type="number"
													min="0"
													step="0.01"
													class="w-[100px] px-[10px] py-[8px] tablet:py-[6px] bg-white border-2 border-[#095866] rounded-[8px] text-[1rem] tablet:text-[0.8125rem] focus:outline-none"
													placeholder="0,00"
												/>
											</div>
											<button
												v-else
												type="button"
												@click="startEdit('volume', idx, 'base_price')"
												class="px-[12px] py-[6px] rounded-[8px] text-[0.875rem] font-semibold text-[#252B42] hover:bg-[#E8F4FB] transition-colors cursor-pointer border border-transparent hover:border-[#B0D4E8]">
												{{ centsToEuro(band.base_price) }}
											</button>
										</td>
										<td class="py-[14px]">
											<div v-if="editingCell === `volume-${idx}-discount_price`" class="flex items-center gap-[6px]">
												<span class="text-[#737373]">&euro;</span>
												<input
													:id="`edit-volume-${idx}-discount_price`"
													v-model="editValue"
													@keydown.enter="confirmEdit('volume', idx, 'discount_price')"
													@keydown.esc="cancelEdit()"
													@blur="confirmEdit('volume', idx, 'discount_price')"
													type="number"
													min="0"
													step="0.01"
													class="w-[100px] px-[10px] py-[8px] tablet:py-[6px] bg-white border-2 border-[#095866] rounded-[8px] text-[1rem] tablet:text-[0.8125rem] focus:outline-none"
													placeholder="vuoto = usa base"
												/>
											</div>
											<button
												v-else
												type="button"
												@click="startEdit('volume', idx, 'discount_price')"
												class="px-[12px] py-[6px] rounded-[8px] text-[0.875rem] text-[#737373] hover:bg-[#E8F4FB] transition-colors cursor-pointer border border-transparent hover:border-[#B0D4E8]">
												{{ band.discount_price != null ? centsToEuro(band.discount_price) : '-' }}
											</button>
										</td>
										<td class="py-[14px]">
											<span class="font-semibold text-emerald-600 text-[0.9375rem]">{{ centsToEuro(effectivePrice(band)) }}</span>
										</td>
										<td class="py-[14px]">
											<template v-if="discountInfo(band) !== null">
												<span v-if="discountInfo(band) > 0" class="inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-[6px] bg-emerald-50 text-emerald-700 text-[0.8125rem] font-semibold border border-emerald-200">
													-{{ discountInfo(band) }}%
												</span>
												<span v-else class="inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-[6px] bg-amber-50 text-amber-700 text-[0.75rem] font-medium border border-amber-200">
													+{{ Math.abs(discountInfo(band)) }}% (aumento)
												</span>
											</template>
											<span v-else class="text-[#C8CCD0]">-</span>
										</td>
										<td class="py-[14px] text-center">
											<button
												type="button"
												@click="toggleShowDiscount('volume', idx)"
												:class="band.show_discount ? 'bg-[#095866]' : 'bg-[#C8CCD0]'"
												class="relative inline-flex h-[32px] w-[56px] tablet:h-[24px] tablet:w-[44px] items-center rounded-full transition-colors cursor-pointer">
												<span
													:class="band.show_discount ? 'translate-x-[28px] tablet:translate-x-[22px]' : 'translate-x-[2px]'"
													class="inline-block h-[26px] w-[26px] tablet:h-[20px] tablet:w-[20px] transform rounded-full bg-white transition-transform shadow-sm" />
											</button>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>

					<!-- Save button (solo se le bande vengono dal DB) -->
					<div v-if="bandsFromDb" class="flex items-center justify-end gap-[12px]">
						<span v-if="hasChanges" class="inline-flex items-center gap-[4px] px-[10px] py-[4px] rounded-full bg-amber-50 text-amber-700 text-[0.75rem] font-medium border border-amber-200">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>
							Modificato
						</span>
						<button @click="savePriceBands" :disabled="saving || !hasChanges" class="inline-flex items-center gap-[8px] px-[24px] py-[12px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[50px] text-[0.875rem] font-medium transition-colors cursor-pointer disabled:opacity-50">
							<svg v-if="saving" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] animate-spin" fill="currentColor"><path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/></svg>
							<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z"/></svg>
							{{ saving ? "Salvataggio..." : "Salva fasce" }}
						</button>
					</div>

					<!-- ======================== PROMOZIONE SITO ======================== -->
					<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
						<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[6px] flex items-center gap-[8px]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-[#E44203]" fill="currentColor"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>
							Promozione Sito
						</h2>
						<p class="text-[0.75rem] text-[#737373] mb-[20px]">Gestisci l'etichetta promozionale e i badge sconto visibili su tutto il sito.</p>

						<div v-if="promoLoading" class="py-[40px] flex justify-center">
							<div class="w-[32px] h-[32px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></div>
						</div>

						<div v-else class="space-y-[20px]">
							<!-- Toggle promozione attiva -->
							<div class="flex items-center justify-between p-[16px] bg-[#FAFBFC] rounded-[12px] border border-[#E9EBEC]">
								<div>
									<p class="text-[0.9375rem] font-semibold text-[#252B42]">Promozione attiva</p>
									<p class="text-[0.75rem] text-[#737373]">Mostra l'etichetta promozionale su tutto il sito</p>
								</div>
								<button
									type="button"
									@click="promo.active = !promo.active"
									:class="promo.active ? 'bg-[#095866]' : 'bg-[#C8CCD0]'"
									class="relative inline-flex h-[36px] w-[60px] tablet:h-[28px] tablet:w-[52px] items-center rounded-full transition-colors cursor-pointer">
									<span
										:class="promo.active ? 'translate-x-[28px] tablet:translate-x-[26px]' : 'translate-x-[2px]'"
										class="inline-block h-[30px] w-[30px] tablet:h-[24px] tablet:w-[24px] transform rounded-full bg-white transition-transform shadow-sm" />
								</button>
							</div>

							<!-- Testo etichetta -->
							<div>
								<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[6px]">Testo etichetta</label>
								<input
									type="text"
									v-model="promo.label_text"
									placeholder="es. OFFERTA LANCIO"
									maxlength="100"
									class="w-full max-w-[400px] bg-[#FAFBFC] border border-[#D0D0D0] rounded-[50px] h-[48px] tablet:h-[44px] px-[16px] text-[1rem] tablet:text-[0.875rem] text-[#252B42] placeholder:text-[#A0A5AB] focus:border-[#095866] focus:outline-none" />
							</div>

							<!-- Descrizione sconto — testo libero mostrato nell'header homepage sotto il prezzo -->
							<div>
								<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[6px]">Descrizione sconto (mostrata nell'header)</label>
								<textarea
									v-model="promo.description"
									placeholder="es. Sconto del 20% su tutte le spedizioni nazionali! Valido fino al 31 marzo."
									maxlength="300"
									rows="3"
									class="w-full max-w-[500px] bg-[#FAFBFC] border border-[#D0D0D0] rounded-[50px] px-[16px] py-[12px] text-[0.875rem] text-[#252B42] placeholder:text-[#A0A5AB] focus:border-[#095866] focus:outline-none resize-y"></textarea>
								<p class="text-[0.6875rem] text-[#999] mt-[4px]">Massimo 300 caratteri. Questo testo appare sotto il prezzo nella homepage.</p>
							</div>

							<!-- Colore etichetta -->
							<div>
								<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[6px]">Colore etichetta</label>
								<div class="flex flex-wrap items-center gap-[12px]">
									<input
										type="color"
										v-model="promo.label_color"
										class="w-[44px] h-[44px] rounded-[8px] border border-[#D0D0D0] cursor-pointer" />
									<input
										type="text"
										v-model="promo.label_color"
										placeholder="#E44203"
										maxlength="20"
										class="w-[140px] bg-[#FAFBFC] border border-[#D0D0D0] rounded-[50px] h-[44px] px-[16px] text-[0.875rem] text-[#252B42] font-mono focus:border-[#095866] focus:outline-none" />
									<!-- Preview -->
									<span
										v-if="promo.label_text"
										:style="{ backgroundColor: promo.label_color }"
										class="inline-flex items-center px-[12px] py-[6px] rounded-[8px] text-white text-[0.8125rem] font-bold tracking-wide">
										{{ promo.label_text }}
									</span>
								</div>
							</div>

							<!-- Upload immagine -->
							<div>
								<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[6px]">Immagine promozionale (opzionale)</label>
								<div class="flex flex-wrap items-center gap-[12px] tablet:gap-[16px]">
									<label class="inline-flex items-center gap-[8px] px-[16px] py-[10px] bg-[#FAFBFC] border border-[#D0D0D0] rounded-[50px] text-[0.875rem] text-[#252B42] hover:bg-[#E8F4FB] transition cursor-pointer">
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[#095866]" fill="currentColor"><path d="M5,3A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H14.09C14.03,20.67 14,20.34 14,20C14,19.32 14.19,18.68 14.54,18H5L8.5,13.5L11,16.5L14.5,12L16.73,14.97C17.7,14.34 18.84,14 20,14C20.34,14 20.67,14.03 21,14.09V5A2,2 0 0,0 19,3H5M19,16V19H16V21H19V24H21V21H24V19H21V16H19Z"/></svg>
										{{ promoImageUploading ? 'Caricamento...' : 'Carica immagine' }}
										<input type="file" accept="image/*" class="hidden" @change="uploadPromoImage" :disabled="promoImageUploading" />
									</label>
									<div v-if="promo.label_image" class="flex items-center gap-[8px]">
										<!-- Ottimizzazione: lazy loading + decoding async -->
										<img :src="promo.label_image" alt="Promo" loading="lazy" decoding="async" width="80" height="40" class="h-[40px] w-auto rounded-[6px] border border-[#D0D0D0]" />
										<button type="button" @click="promo.label_image = null" class="text-red-500 text-[0.75rem] hover:underline cursor-pointer">Rimuovi</button>
									</div>
								</div>
							</div>

							<!-- Toggle badge sconto % -->
							<div class="flex items-center justify-between p-[16px] bg-[#FAFBFC] rounded-[12px] border border-[#E9EBEC]">
								<div>
									<p class="text-[0.9375rem] font-semibold text-[#252B42]">Mostra badge sconto %</p>
									<p class="text-[0.75rem] text-[#737373]">Mostra il badge con la percentuale di sconto accanto ai prezzi</p>
								</div>
								<button
									type="button"
									@click="promo.show_badges = !promo.show_badges"
									:class="promo.show_badges ? 'bg-[#095866]' : 'bg-[#C8CCD0]'"
									class="relative inline-flex h-[36px] w-[60px] tablet:h-[28px] tablet:w-[52px] items-center rounded-full transition-colors cursor-pointer">
									<span
										:class="promo.show_badges ? 'translate-x-[28px] tablet:translate-x-[26px]' : 'translate-x-[2px]'"
										class="inline-block h-[30px] w-[30px] tablet:h-[24px] tablet:w-[24px] transform rounded-full bg-white transition-transform shadow-sm" />
								</button>
							</div>

							<!-- Anteprima live — mostra come appare la promo nell'header homepage -->
							<div v-if="promo.active && (promo.label_text || promo.description)" class="p-[20px] bg-[#F0F4F5] rounded-[16px] border border-[#D0D8DA]">
								<p class="text-[0.75rem] font-semibold text-[#737373] mb-[12px] uppercase tracking-wider">Anteprima header homepage</p>
								<div class="bg-white rounded-[12px] p-[16px] shadow-sm">
									<p class="text-[1.25rem] font-bold text-[#222]">Spedisci in Italia</p>
									<div class="flex items-center gap-[10px] mt-[6px]">
										<span class="text-[1rem] text-[#444] font-semibold">a partire da</span>
										<span class="inline-flex items-center justify-center px-[14px] py-[6px] bg-[#E44203] text-white font-extrabold text-[1.25rem] rounded-[40px]">8,90 &euro;</span>
									</div>
									<!-- Badge sconto % -->
									<div v-if="promo.show_badges" class="flex items-center gap-[8px] mt-[6px]">
										<span class="inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-[8px] bg-emerald-500 text-white text-[0.75rem] font-bold">-20%</span>
									</div>
									<!-- Etichetta promo -->
									<div v-if="promo.label_text" class="mt-[6px]">
										<span
											:style="{ backgroundColor: promo.label_color || '#E44203' }"
											class="inline-flex items-center gap-[6px] px-[10px] py-[4px] rounded-[8px] text-white text-[0.75rem] font-bold tracking-wide">
											<!-- Ottimizzazione: lazy loading + decoding async + dimensioni per CLS -->
											<img v-if="promo.label_image" :src="promo.label_image" alt="" loading="lazy" decoding="async" width="30" height="14" class="h-[14px] w-auto shrink-0" />
											{{ promo.label_text }}
										</span>
									</div>
									<!-- Descrizione sconto -->
									<p v-if="promo.description" class="text-[0.8125rem] text-[#444] font-medium mt-[6px]">{{ promo.description }}</p>
									<p class="text-[0.9375rem] font-extrabold mt-[10px] text-[#222]">IVA e ritiro incluso</p>
								</div>
							</div>

							<!-- Salva promozione -->
							<div class="flex justify-end">
								<button @click="savePromo" :disabled="promoSaving" class="inline-flex items-center gap-[8px] px-[24px] py-[12px] bg-[#E44203] hover:bg-[#c93800] text-white rounded-[50px] text-[0.875rem] font-medium transition-colors cursor-pointer disabled:opacity-50">
									<svg v-if="promoSaving" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] animate-spin" fill="currentColor"><path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/></svg>
									<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z"/></svg>
									{{ promoSaving ? "Salvataggio..." : "Salva promozione" }}
								</button>
							</div>
						</div>
					</div>
				</div>
			</template>
		</div>
	</section>
</template>
