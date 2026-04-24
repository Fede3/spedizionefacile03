<!-- FILE: pages/account/pro/bulk-upload.vue -->
<script setup>
import { formatPrice } from '~/utils/price.js';

definePageMeta({ middleware: ['app-auth'] });

useSeoMeta({
	title: 'Caricamento bulk CSV | Pro | SpediamoFacile',
	robots: 'noindex, nofollow',
});

const sanctum = useSanctumClient();
const { user } = useSanctumAuth();

const isPro = computed(() => user.value?.role === 'Partner Pro');

const fileInput = ref(null);
const fileName = ref('');
const fileError = ref('');
const isDragging = ref(false);
const parsedRows = ref([]);
const validationResults = ref(null);
const isValidating = ref(false);
const isCreatingOrders = ref(false);
const ordersCreated = ref(null);
const apiError = ref('');

const EXPECTED_HEADERS = [
	'tipo_collo', 'peso_kg', 'lunghezza_cm', 'larghezza_cm', 'altezza_cm',
	'origine_nome', 'origine_indirizzo', 'origine_cap', 'origine_citta', 'origine_provincia',
	'destinazione_nome', 'destinazione_indirizzo', 'destinazione_cap', 'destinazione_citta', 'destinazione_provincia',
	'destinazione_email', 'destinazione_telefono',
	'contenuto', 'servizio', 'note',
];

/* ===== Parsing CSV ===== */
const parseCSV = (text) => {
	const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
	if (lines.length === 0) return { headers: [], rows: [] };

	const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
	const rows = [];

	for (let i = 1; i < lines.length; i++) {
		// Parsing semplice: gestisce virgolette base
		const values = parseCSVLine(lines[i]);
		const row = {};
		headers.forEach((h, idx) => {
			row[h] = (values[idx] ?? '').trim();
		});
		rows.push(row);
	}

	return { headers, rows };
};

const parseCSVLine = (line) => {
	const result = [];
	let current = '';
	let inQuotes = false;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (ch === '"') {
			inQuotes = !inQuotes;
		} else if (ch === ',' && !inQuotes) {
			result.push(current);
			current = '';
		} else {
			current += ch;
		}
	}
	result.push(current);
	return result;
};

/* ===== Gestione file ===== */
const handleFile = async (file) => {
	fileError.value = '';
	validationResults.value = null;
	ordersCreated.value = null;

	if (!file) return;

	if (!file.name.toLowerCase().endsWith('.csv')) {
		fileError.value = 'Il file deve essere in formato .csv';
		return;
	}

	if (file.size > 5 * 1024 * 1024) {
		fileError.value = 'Il file supera la dimensione massima di 5 MB';
		return;
	}

	fileName.value = file.name;

	try {
		const text = await file.text();
		const { headers, rows } = parseCSV(text);

		const missingHeaders = EXPECTED_HEADERS.filter((h) => !headers.includes(h));
		if (missingHeaders.length > 0) {
			fileError.value = `Header mancanti: ${missingHeaders.join(', ')}`;
			parsedRows.value = [];
			return;
		}

		if (rows.length === 0) {
			fileError.value = 'Il file non contiene righe dati.';
			return;
		}

		if (rows.length > 500) {
			fileError.value = `Troppe righe: ${rows.length}. Massimo consentito: 500.`;
			return;
		}

		parsedRows.value = rows;
	} catch (e) {
		fileError.value = 'Errore lettura file: ' + e.message;
	}
};

const onFileChange = (e) => {
	const file = e.target.files?.[0];
	if (file) handleFile(file);
};

const onDrop = (e) => {
	e.preventDefault();
	isDragging.value = false;
	const file = e.dataTransfer.files?.[0];
	if (file) handleFile(file);
};

const onDragOver = (e) => {
	e.preventDefault();
	isDragging.value = true;
};

const onDragLeave = () => {
	isDragging.value = false;
};

const triggerFileInput = () => {
	fileInput.value?.click();
};

/* ===== API ===== */
const validateRows = async () => {
	apiError.value = '';
	if (parsedRows.value.length === 0) return;

	isValidating.value = true;
	try {
		const res = await sanctum('/api/pro/bulk-upload/validate', {
			method: 'POST',
			body: { rows: parsedRows.value },
		});
		validationResults.value = res;
	} catch (e) {
		apiError.value = e?.response?._data?.message || 'Errore validazione righe.';
	} finally {
		isValidating.value = false;
	}
};

const createOrders = async () => {
	apiError.value = '';
	const validRows = parsedRows.value.filter((_, idx) => {
		return validationResults.value?.rows?.[idx]?.valid;
	});

	if (validRows.length === 0) {
		apiError.value = 'Nessuna riga valida da inviare.';
		return;
	}

	isCreatingOrders.value = true;
	try {
		const res = await sanctum('/api/pro/bulk-upload/create-orders', {
			method: 'POST',
			body: { rows: validRows },
		});
		ordersCreated.value = res;
	} catch (e) {
		apiError.value = e?.response?._data?.message || 'Errore creazione ordini.';
	} finally {
		isCreatingOrders.value = false;
	}
};

const resetAll = () => {
	parsedRows.value = [];
	validationResults.value = null;
	ordersCreated.value = null;
	fileName.value = '';
	fileError.value = '';
	apiError.value = '';
	if (fileInput.value) fileInput.value.value = '';
};

const rowStatus = (idx) => {
	if (!validationResults.value) return null;
	return validationResults.value.rows?.[idx];
};

const cellHasError = (idx, field) => {
	const status = rowStatus(idx);
	if (!status || status.valid) return false;
	return Boolean(status.errors?.[field]);
};

const cellError = (idx, field) => {
	const status = rowStatus(idx);
	return status?.errors?.[field]?.[0] || null;
};
</script>

<template>
	<section class="sf-account-shell min-h-[600px] py-[20px] tablet:py-[24px] desktop:py-[28px]">
		<div class="my-container space-y-[20px]">
			<AccountPageHeader
				eyebrow="Pro"
				title="Caricamento bulk CSV"
				description="Importa fino a 500 spedizioni in un colpo solo. Scarica il template, compila e carica."
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Pro', to: '/account/pro/dashboard' },
					{ label: 'Caricamento bulk' },
				]" />

			<div v-if="!isPro" class="ux-alert ux-alert--warning">
				<div class="flex-1">
					<p class="font-[700] text-[var(--color-brand-text)]">Funzionalità riservata ai Partner Pro</p>
					<p class="text-[13px] text-[var(--color-brand-text-muted)]">Richiedi l'accesso Partner Pro dalla tua area account.</p>
				</div>
				<NuxtLink to="/account/account-pro" class="btn-primary btn-compact">Diventa Partner Pro</NuxtLink>
			</div>

			<template v-else>
				<!-- Drop zone + template -->
				<div class="sf-account-panel rounded-[16px] p-[20px] desktop:p-[24px]">
					<div class="flex items-start justify-between gap-[16px] flex-wrap mb-[16px]">
						<div>
							<h2 class="text-[16px] font-[800] text-[var(--color-brand-text)]">1. Carica il file CSV</h2>
							<p class="text-[13px] text-[var(--color-brand-text-muted)] mt-[4px]">Massimo 5 MB, fino a 500 righe.</p>
						</div>
						<a
							href="/templates/spedizioni_bulk_template.csv"
							download
							class="btn-secondary btn-compact inline-flex items-center gap-[8px]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[14px] w-[14px]" fill="currentColor">
								<path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z" />
							</svg>
							Scarica template
						</a>
					</div>

					<div
						:class="[
							'flex flex-col items-center justify-center gap-[10px] rounded-[12px] border-[2px] border-dashed px-[20px] py-[36px] transition-colors duration-200 cursor-pointer',
							isDragging
								? 'border-[var(--color-brand-primary)] bg-[rgba(9,88,102,0.04)]'
								: 'border-[rgba(9,88,102,0.18)] bg-[rgba(9,88,102,0.02)] hover:border-[var(--color-brand-primary)]',
						]"
						@click="triggerFileInput"
						@dragover="onDragOver"
						@dragleave="onDragLeave"
						@drop="onDrop">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[40px] w-[40px] text-[var(--color-brand-primary)]" fill="currentColor">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
						</svg>
						<p class="text-[14px] font-[700] text-[var(--color-brand-text)]">
							{{ fileName || 'Trascina qui il CSV o clicca per selezionare' }}
						</p>
						<p class="text-[12px] text-[var(--color-brand-text-muted)]">Solo file .csv, max 5 MB</p>
						<input ref="fileInput" type="file" accept=".csv" class="hidden" @change="onFileChange" />
					</div>

					<p v-if="fileError" class="mt-[12px] text-[13px] font-[600] text-[#B91C1C]">{{ fileError }}</p>
				</div>

				<!-- Anteprima righe -->
				<div v-if="parsedRows.length > 0" class="sf-account-panel rounded-[16px] p-[20px] desktop:p-[24px]">
					<div class="flex items-center justify-between gap-[12px] flex-wrap mb-[16px]">
						<div>
							<h2 class="text-[16px] font-[800] text-[var(--color-brand-text)]">2. Anteprima ({{ parsedRows.length }} righe)</h2>
							<p v-if="validationResults" class="text-[13px] text-[var(--color-brand-text-muted)] mt-[4px]">
								{{ validationResults.summary.valid_rows }} valide ·
								{{ validationResults.summary.invalid_rows }} con errori ·
								Totale stimato: {{ formatPrice(validationResults.summary.total_price_cents) }}
							</p>
						</div>
						<div class="flex gap-[8px]">
							<button type="button" class="btn-secondary btn-compact" @click="resetAll">Annulla</button>
							<button
								type="button"
								class="btn-primary btn-compact"
								:disabled="isValidating"
								@click="validateRows">
								{{ isValidating ? 'Calcolo...' : 'Calcola preventivi' }}
							</button>
						</div>
					</div>

					<div class="overflow-x-auto">
						<table class="w-full text-[12px] border-collapse">
							<thead>
								<tr class="bg-[rgba(9,88,102,0.04)]">
									<th class="px-[8px] py-[6px] text-left font-[700] text-[var(--color-brand-text)] border-b border-[rgba(9,88,102,0.10)]">#</th>
									<th class="px-[8px] py-[6px] text-left font-[700] text-[var(--color-brand-text)] border-b border-[rgba(9,88,102,0.10)]">Tipo</th>
									<th class="px-[8px] py-[6px] text-left font-[700] text-[var(--color-brand-text)] border-b border-[rgba(9,88,102,0.10)]">Peso</th>
									<th class="px-[8px] py-[6px] text-left font-[700] text-[var(--color-brand-text)] border-b border-[rgba(9,88,102,0.10)]">Origine</th>
									<th class="px-[8px] py-[6px] text-left font-[700] text-[var(--color-brand-text)] border-b border-[rgba(9,88,102,0.10)]">Destinazione</th>
									<th class="px-[8px] py-[6px] text-left font-[700] text-[var(--color-brand-text)] border-b border-[rgba(9,88,102,0.10)]">Stato</th>
									<th class="px-[8px] py-[6px] text-right font-[700] text-[var(--color-brand-text)] border-b border-[rgba(9,88,102,0.10)]">Prezzo</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="(row, idx) in parsedRows"
									:key="idx"
									:class="[
										'border-b border-[rgba(9,88,102,0.06)]',
										rowStatus(idx)?.valid === false ? 'bg-[rgba(185,28,28,0.04)]' : '',
										rowStatus(idx)?.valid === true ? 'bg-[rgba(5,150,105,0.04)]' : '',
									]">
									<td class="px-[8px] py-[6px]">{{ idx + 1 }}</td>
									<td class="px-[8px] py-[6px]" :class="cellHasError(idx, 'tipo_collo') ? 'text-[#B91C1C] font-[700]' : ''">
										{{ row.tipo_collo }}
										<span v-if="cellError(idx, 'tipo_collo')" class="block text-[10px] text-[#B91C1C]">{{ cellError(idx, 'tipo_collo') }}</span>
									</td>
									<td class="px-[8px] py-[6px]" :class="cellHasError(idx, 'peso_kg') ? 'text-[#B91C1C] font-[700]' : ''">
										{{ row.peso_kg }} kg
									</td>
									<td class="px-[8px] py-[6px]">
										{{ row.origine_citta }} ({{ row.origine_provincia }})
										<span v-if="cellHasError(idx, 'origine_cap')" class="block text-[10px] text-[#B91C1C]">{{ cellError(idx, 'origine_cap') }}</span>
									</td>
									<td class="px-[8px] py-[6px]">
										{{ row.destinazione_citta }} ({{ row.destinazione_provincia }})
										<span v-if="cellHasError(idx, 'destinazione_cap')" class="block text-[10px] text-[#B91C1C]">{{ cellError(idx, 'destinazione_cap') }}</span>
									</td>
									<td class="px-[8px] py-[6px]">
										<span v-if="rowStatus(idx)?.valid === true" class="inline-flex items-center gap-[4px] rounded-full bg-[rgba(5,150,105,0.10)] px-[8px] py-[2px] text-[#047857] font-[700]">OK</span>
										<span v-else-if="rowStatus(idx)?.valid === false" class="inline-flex items-center gap-[4px] rounded-full bg-[rgba(185,28,28,0.10)] px-[8px] py-[2px] text-[#B91C1C] font-[700]">Errore</span>
										<span v-else class="text-[var(--color-brand-text-muted)]">—</span>
									</td>
									<td class="px-[8px] py-[6px] text-right font-[700]">
										{{ rowStatus(idx)?.price_estimate_cents ? formatPrice(rowStatus(idx).price_estimate_cents) : '—' }}
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					<p v-if="apiError" class="mt-[12px] text-[13px] font-[600] text-[#B91C1C]">{{ apiError }}</p>
				</div>

				<!-- Bottoni invio -->
				<div v-if="validationResults && validationResults.summary.valid_rows > 0 && !ordersCreated" class="sf-account-panel rounded-[16px] p-[20px]">
					<div class="flex items-center justify-between gap-[12px] flex-wrap">
						<div>
							<h2 class="text-[16px] font-[800] text-[var(--color-brand-text)]">3. Crea ordini</h2>
							<p class="text-[13px] text-[var(--color-brand-text-muted)] mt-[4px]">
								Verranno creati {{ validationResults.summary.valid_rows }} ordini draft per un totale stimato di
								<strong>{{ formatPrice(validationResults.summary.total_price_cents) }}</strong>.
							</p>
						</div>
						<button
							type="button"
							class="btn-primary"
							:disabled="isCreatingOrders"
							@click="createOrders">
							{{ isCreatingOrders ? 'Creazione...' : 'Crea ordini ora' }}
						</button>
					</div>
				</div>

				<!-- Risultato creazione -->
				<div v-if="ordersCreated" class="sf-account-panel rounded-[16px] p-[20px]">
					<div class="flex items-start gap-[12px]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[24px] w-[24px] text-[#047857] shrink-0" fill="currentColor">
							<path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
						</svg>
						<div class="flex-1">
							<h3 class="text-[15px] font-[800] text-[var(--color-brand-text)]">{{ ordersCreated.message }}</h3>
							<p class="text-[13px] text-[var(--color-brand-text-muted)] mt-[4px]">
								ID ordini: <code>{{ (ordersCreated.order_ids || []).join(', ') }}</code>
							</p>
							<div class="mt-[12px] flex gap-[8px]">
								<NuxtLink to="/account/spedizioni" class="btn-primary btn-compact">Vai alle spedizioni</NuxtLink>
								<button type="button" class="btn-secondary btn-compact" @click="resetAll">Carica un altro file</button>
							</div>
						</div>
					</div>
				</div>
			</template>
		</div>
	</section>
</template>
