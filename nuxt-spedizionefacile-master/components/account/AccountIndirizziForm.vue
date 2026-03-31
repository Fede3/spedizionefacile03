<!--
  Componente form indirizzo riutilizzabile per creazione e modifica.
  Props: modelValue (dati indirizzo), mode ('create'|'edit'), loading, error.
  Events: submit, cancel.
-->
<script setup>
import { provinceList } from '~/utils/provinceList';

const props = defineProps({
	modelValue: { type: Object, required: true },
	mode: { type: String, default: 'create' },
	loading: { type: String, default: null },
	error: { type: String, default: null },
});

const emit = defineEmits(['update:modelValue', 'submit', 'cancel']);

const form = computed({
	get: () => props.modelValue,
	set: (val) => emit('update:modelValue', val),
});

const updateField = (key, value) => {
	emit('update:modelValue', { ...props.modelValue, [key]: value });
};

const filteredProvinces = computed(() => {
	const current = props.modelValue.province_name;
	return provinceList.filter((p) => p !== current);
});

const isEdit = computed(() => props.mode === 'edit');

const headerIcon = computed(() =>
	isEdit.value
		? 'M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z'
		: 'M9,11.5A2.5,2.5 0 0,0 11.5,9A2.5,2.5 0 0,0 9,6.5A2.5,2.5 0 0,0 6.5,9A2.5,2.5 0 0,0 9,11.5M9,2C12.86,2 16,5.13 16,9C16,14.25 9,22 9,22C9,22 2,14.25 2,9A7,7 0 0,1 9,2M15,17H18V14H20V17H23V19H20V22H18V19H15V17Z'
);

const headerTitle = computed(() => isEdit.value ? 'Modifica indirizzo salvato' : 'Aggiungi un indirizzo ordinato');
const headerSubtitle = computed(() => isEdit.value ? 'Aggiorna riferimento' : 'Nuovo riferimento');
const headerDesc = computed(() =>
	isEdit.value
		? 'Mantieni i dati chiari e pronti per i prossimi riepiloghi spedizione.'
		: 'Salva una destinazione pronta da riusare con un solo tap nelle prossime spedizioni.'
);

const submitLabel = computed(() => {
	if (props.loading) return isEdit.value ? 'Salvataggio...' : 'Aggiunta...';
	return isEdit.value ? 'Salva modifiche' : 'Aggiungi indirizzo';
});

const submitIcon = computed(() =>
	isEdit.value
		? 'M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z'
		: 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z'
);
</script>

<template>
	<div class="bg-white rounded-[18px] p-[18px] desktop:p-[24px] shadow-sm border border-[#E9EBEC] max-w-[680px] mx-auto">
		<!-- Header -->
		<div class="mb-[18px] flex items-start gap-[12px] rounded-[16px] border border-[#E9EBEC] bg-[#F8FCFD] px-[14px] py-[12px]">
			<div class="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#095866]/10">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#095866"><path :d="headerIcon" /></svg>
			</div>
			<div>
				<p class="text-[0.75rem] font-semibold uppercase tracking-[1px] text-[#095866]">{{ headerSubtitle }}</p>
				<h2 class="mt-[4px] text-[1rem] font-bold text-[#252B42]">{{ headerTitle }}</h2>
				<p class="mt-[4px] text-[0.8125rem] leading-[1.55] text-[#737373]">{{ headerDesc }}</p>
			</div>
		</div>

		<!-- Form -->
		<form @submit.prevent="emit('submit')">
			<div class="mb-[14px]">
				<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Nome / Riferimento *</label>
				<input type="text" :value="modelValue.name" @input="updateField('name', $event.target.value)" placeholder="es. Casa, Ufficio, Mario Rossi" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[12px] text-[0.875rem] focus:border-[#095866] focus:outline-none" required />
			</div>
			<div class="mb-[14px]">
				<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Indirizzo *</label>
				<input type="text" :value="modelValue.address" @input="updateField('address', $event.target.value)" placeholder="Via Roma 10" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[12px] text-[0.875rem] focus:border-[#095866] focus:outline-none" required />
			</div>
			<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[12px] mb-[14px]">
				<div>
					<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Città *</label>
					<input type="text" :value="modelValue.city" @input="updateField('city', $event.target.value)" placeholder="Roma" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[12px] text-[0.875rem] focus:border-[#095866] focus:outline-none" required />
				</div>
				<div>
					<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">CAP *</label>
					<input
						type="text"
						:value="modelValue.postal_code"
						@input="updateField('postal_code', $event.target.value.replace(/[^0-9]/g, ''))"
						placeholder="00100"
						maxlength="5"
						inputmode="numeric"
						pattern="[0-9]{5}"
						class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[12px] text-[0.875rem] focus:border-[#095866] focus:outline-none"
						required />
				</div>
			</div>
			<div class="mb-[14px]">
				<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Provincia *</label>
				<select :value="modelValue.province_name" @change="updateField('province_name', $event.target.value)" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[12px] text-[0.875rem] focus:border-[#095866] focus:outline-none cursor-pointer" required>
					<option v-if="isEdit" disabled :value="modelValue.province_name">{{ modelValue.province_name }}</option>
					<option v-else disabled value="">Scegli la provincia</option>
					<option v-for="(province, idx) in (isEdit ? filteredProvinces : provinceList)" :key="idx" :value="province">{{ province }}</option>
				</select>
			</div>

			<!-- Default checkbox (solo in creazione) -->
			<label v-if="!isEdit" class="flex items-center gap-[8px] cursor-pointer mb-[20px]">
				<input type="checkbox" :checked="!!modelValue.default" @change="updateField('default', $event.target.checked ? 1 : 0)" class="w-[18px] h-[18px] accent-[#095866] cursor-pointer" />
				<span class="text-[0.8125rem] text-[#737373]">Usa come indirizzo predefinito</span>
			</label>
			<div v-else class="mb-[20px]"></div>

			<!-- Messaggi -->
			<p v-if="loading" class="text-center text-[0.875rem] text-[#095866] font-medium mb-[16px]">{{ loading }}</p>
			<p v-if="error" class="text-center text-[0.875rem] text-red-600 font-medium mb-[16px] bg-red-50 p-[10px] rounded-[12px] border border-red-200">{{ error }}</p>

			<!-- Bottoni -->
			<div class="flex flex-col gap-[12px] tablet:flex-row">
				<button type="button" @click.prevent="emit('cancel')" class="flex-1 inline-flex items-center justify-center gap-[6px] py-[14px] rounded-[50px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] font-semibold text-[0.9375rem] transition-colors cursor-pointer">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
					Annulla
				</button>
				<button type="submit" :disabled="!!loading" class="flex-1 inline-flex items-center justify-center gap-[6px] py-[14px] rounded-[50px] bg-[#095866] hover:bg-[#074a56] text-white font-semibold text-[0.9375rem] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path :d="submitIcon" /></svg>
					{{ submitLabel }}
				</button>
			</div>
		</form>
	</div>
</template>
