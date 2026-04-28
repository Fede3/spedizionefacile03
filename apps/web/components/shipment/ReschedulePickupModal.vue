<!--
  Componente: ReschedulePickupModal
  Modale per riprogrammare la data di ritiro di un ordine (F04 audit BRT).
  Range +1..+10 giorni lavorativi, fascia oraria opzionale, PATCH /api/orders/{id}/pickup.
  Refactor 2026-04-26: usa <SfModal> (focus trap + ESC + body scroll lock managed),
  riducendo ~50 LOC custom (Teleport + trapFocus + watch open).
-->
<script setup>
const props = defineProps({
	show: { type: Boolean, required: true },
	orderId: { type: [String, Number], required: true },
	currentPickupDate: { type: String, default: null },
	currentTimeSlot: { type: String, default: null },
	currentNotes: { type: String, default: null },
});

const emit = defineEmits(['update:show', 'updated']);

const sanctum = useSanctumClient();

const form = reactive({
	pickup_date: '',
	pickup_time_slot: '09:00-18:00',
	pickup_notes: '',
});

const saving = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

/* Calcola il range di date valido (+1..+10 giorni lavorativi) */
const isWeekday = (d) => {
	const day = d.getDay();
	return day !== 0 && day !== 6; // escludi domenica (0) e sabato (6)
};

const addWeekdays = (from, count) => {
	const d = new Date(from);
	let added = 0;
	while (added < count) {
		d.setDate(d.getDate() + 1);
		if (isWeekday(d)) added++;
	}
	return d;
};

const toIsoDate = (d) => {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
};

const minDate = computed(() => toIsoDate(addWeekdays(new Date(), 1)));
const maxDate = computed(() => toIsoDate(addWeekdays(new Date(), 10)));

// Bridge v-model: SfModal usa modelValue/update:modelValue.
const open = computed({
	get: () => props.show,
	set: (v) => emit('update:show', v),
});

watch(
	() => props.show,
	(isOpen) => {
		if (isOpen) {
			errorMsg.value = '';
			successMsg.value = '';
			// Pre-popola con valore esistente se valido
			form.pickup_date = props.currentPickupDate && props.currentPickupDate >= minDate.value ? props.currentPickupDate : minDate.value;
			form.pickup_time_slot = props.currentTimeSlot || '09:00-18:00';
			form.pickup_notes = props.currentNotes || '';
		}
	},
);

// Track del timer di chiusura post-success per evitare leak / chiusura zombie su unmount.
let closeAfterSuccessTimer = null;

onUnmounted(() => {
	if (closeAfterSuccessTimer) {
		clearTimeout(closeAfterSuccessTimer);
		closeAfterSuccessTimer = null;
	}
});

const validate = () => {
	if (!form.pickup_date) {
		errorMsg.value = 'Seleziona una data di ritiro.';
		return false;
	}
	if (form.pickup_date < minDate.value || form.pickup_date > maxDate.value) {
		errorMsg.value = 'La data deve essere compresa tra ' + minDate.value + ' e ' + maxDate.value + ' (giorni lavorativi).';
		return false;
	}
	const slot = form.pickup_time_slot;
	if (slot && !['09:00-12:00', '09:00-18:00', '14:00-18:00'].includes(slot)) {
		errorMsg.value = 'Fascia oraria non valida.';
		return false;
	}
	return true;
};

const submit = async () => {
	errorMsg.value = '';
	successMsg.value = '';
	if (!validate()) return;
	saving.value = true;
	try {
		const res = await sanctum(`/api/orders/${props.orderId}/pickup`, {
			method: 'PATCH',
			body: {
				pickup_date: form.pickup_date,
				pickup_time_slot: form.pickup_time_slot,
				pickup_notes: form.pickup_notes || null,
			},
		});
		successMsg.value = res?.message || 'Data di ritiro aggiornata con successo.';
		emit('updated', res?.data || res);
		if (closeAfterSuccessTimer) clearTimeout(closeAfterSuccessTimer);
		closeAfterSuccessTimer = setTimeout(() => {
			closeAfterSuccessTimer = null;
			emit('update:show', false);
		}, 1200);
	} catch (error) {
		errorMsg.value = error?.response?._data?.message || error?.data?.message || 'Impossibile aggiornare la data di ritiro.';
	} finally {
		saving.value = false;
	}
};
</script>

<template>
	<SfModal v-model="open" size="sm" :persistent="saving">
		<!-- Header con icona calendario -->
		<div class="flex items-center gap-[12px] mb-[16px]">
			<div class="w-[44px] h-[44px] rounded-full bg-[#EEF6F8] flex items-center justify-center shrink-0" aria-hidden="true">
				<UIcon name="mdi:calendar-month-outline" class="text-[var(--color-brand-primary)] text-[24px]" />
			</div>
			<div>
				<h2 class="font-montserrat text-[1.125rem] font-[800] text-[var(--color-brand-text)]">Cambia data di ritiro</h2>
				<p class="text-[0.8125rem] text-[var(--color-brand-text-secondary)]">Scegli un nuovo giorno lavorativo tra domani e i prossimi 10 giorni.</p>
			</div>
		</div>

		<!-- Body -->
		<div class="space-y-[14px]">
			<div>
				<label for="pickup-date-input" class="block text-[0.75rem] text-[var(--color-brand-text-secondary)] uppercase font-medium mb-[4px]">
					Nuova data di ritiro
				</label>
				<input
					id="pickup-date-input"
					v-model="form.pickup_date"
					type="date"
					:min="minDate"
					:max="maxDate"
					class="w-full bg-[#F8F9FB] border border-[var(--color-brand-border)] rounded-[12px] px-[12px] py-[10px] text-[0.875rem] focus:border-[var(--color-brand-primary)] focus:outline-none" >
				<p class="mt-[4px] text-[0.6875rem] text-[var(--color-brand-text-muted)]">
					Range consentito: {{ minDate }} → {{ maxDate }} (solo giorni feriali).
				</p>
			</div>

			<div>
				<label for="pickup-slot-select" class="block text-[0.75rem] text-[var(--color-brand-text-secondary)] uppercase font-medium mb-[4px]">
					Fascia oraria
				</label>
				<select
					id="pickup-slot-select"
					v-model="form.pickup_time_slot"
					class="w-full bg-[#F8F9FB] border border-[var(--color-brand-border)] rounded-[12px] px-[12px] py-[10px] text-[0.875rem] focus:border-[var(--color-brand-primary)] focus:outline-none">
					<option value="09:00-18:00">09:00 — 18:00 (tutto il giorno)</option>
					<option value="09:00-12:00">09:00 — 12:00 (mattina)</option>
					<option value="14:00-18:00">14:00 — 18:00 (pomeriggio)</option>
				</select>
			</div>

			<div>
				<label for="pickup-notes-input" class="block text-[0.75rem] text-[var(--color-brand-text-secondary)] uppercase font-medium mb-[4px]">
					Note per il corriere (opzionale)
				</label>
				<textarea
					id="pickup-notes-input"
					v-model="form.pickup_notes"
					placeholder="Es. citofono interno, orari preferiti..."
					maxlength="500"
					rows="2"
					class="w-full bg-[#F8F9FB] border border-[var(--color-brand-border)] rounded-[12px] px-[12px] py-[10px] text-[0.875rem] resize-none focus:border-[var(--color-brand-primary)] focus:outline-none"/>
			</div>

			<div v-if="errorMsg" class="bg-red-50 border border-red-200 rounded-[12px] px-[14px] py-[10px] text-red-600 text-[0.8125rem]" role="alert">
				{{ errorMsg }}
			</div>
			<div v-if="successMsg" class="bg-[#E9F7EC] border border-[rgba(31,122,58,0.3)] rounded-[12px] px-[14px] py-[10px] text-[#1F7A3A] text-[0.8125rem]" role="status">
				{{ successMsg }}
			</div>

			<p class="mt-[6px] text-[0.6875rem] text-[var(--color-brand-text-muted)]">
				Se il ritiro è già stato processato da BRT, il sistema notificherà il supporto per contattarti con una conferma diretta.
			</p>
		</div>

		<!-- Actions -->
		<template #footer>
			<SfButton variant="secondary" size="sm" :disabled="saving" @click="emit('update:show', false)">Annulla</SfButton>
			<SfButton variant="primary" size="sm" :loading="saving" loading-text="Salvataggio..." @click="submit">Conferma nuova data</SfButton>
		</template>
	</SfModal>
</template>
