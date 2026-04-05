<!--
  Card indirizzo riutilizzabile per partenza e destinazione nel riepilogo.
  Props: type ('origin'|'destination'), address, editAddress, editingSection, pudo, goBack
  Emits: start-edit, cancel-edit, save-edit, update:editAddress
-->
<script setup>
const props = defineProps({
	type: { type: String, required: true, validator: v => ['origin', 'destination'].includes(v) },
	address: { type: Object, default: () => ({}) },
	editAddress: { type: Object, default: () => ({}) },
	editingSection: { type: String, default: null },
	pudo: { type: Object, default: null },
	goBack: { type: Function, default: null },
});
const emit = defineEmits(['start-edit', 'cancel-edit', 'save-edit', 'update:editAddress']);

const isOrigin = computed(() => props.type === 'origin');
const sectionTitle = computed(() => isOrigin.value ? 'Partenza' : 'Destinazione');

const handleEditClick = () => {
	if (!isOrigin.value && props.pudo && props.goBack) {
		props.goBack();
	} else {
		emit('start-edit', props.type);
	}
};

const onFieldInput = (field, value) => {
	emit('update:editAddress', { ...props.editAddress, [field]: value });
};

const onCapInput = (event) => {
	const cleaned = event.target.value.replace(/\D/g, '');
	emit('update:editAddress', { ...props.editAddress, postal_code: cleaned });
};
</script>

<template>
	<div class="bg-[#E4E4E4] rounded-[12px] p-[16px] tablet:p-[28px_32px]">
		<div class="flex items-center justify-between mb-[16px]">
			<h2 class="text-[1.125rem] font-bold text-[var(--color-brand-text)] flex items-center gap-[8px]">
				<!-- Origin icon -->
				<svg v-if="isOrigin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-accent)" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
				<!-- Destination icon -->
				<svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
				{{ sectionTitle }}
			</h2>
			<button type="button" @click="handleEditClick" class="btn-secondary btn-compact inline-flex items-center gap-[6px]" :title="`Modifica ${sectionTitle.toLowerCase()}`">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
				<span>Modifica</span>
			</button>
		</div>

		<!-- View mode -->
		<div v-if="editingSection !== type" class="text-[0.875rem] text-[var(--color-brand-text)] space-y-[4px]">
			<p class="font-semibold">{{ address?.name }}</p>
			<template v-if="!pudo || isOrigin">
				<p>{{ address?.address }} {{ address?.address_number }}</p>
				<p>{{ address?.postal_code }} {{ address?.city }} ({{ address?.province }})</p>
			</template>
			<template v-if="pudo && !isOrigin">
				<div class="my-[8px] p-[10px] bg-[var(--color-brand-primary)]/10 rounded-[12px] flex items-start gap-[8px]">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-[2px]"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
					<div class="text-[0.8125rem]">
						<span class="font-bold text-[var(--color-brand-primary)]">Ritiro in Punto BRT</span>
						<p class="text-[var(--color-brand-text)] font-semibold mt-[2px]">{{ pudo.name }}</p>
						<p class="text-[var(--color-brand-text-secondary)]">{{ pudo.address }}, {{ pudo.zip_code }} {{ pudo.city }}</p>
					</div>
				</div>
			</template>
			<p v-if="address?.telephone_number && address.telephone_number !== '0000000000'" class="text-[var(--color-brand-text-secondary)]">Tel: {{ address.telephone_number }}</p>
			<p v-if="address?.email" class="text-[var(--color-brand-text-secondary)]">{{ address.email }}</p>
		</div>

		<!-- Edit mode -->
		<div v-else class="space-y-[10px]">
			<div>
				<label class="text-[0.75rem] text-[var(--color-brand-text-secondary)]">Nome e Cognome</label>
				<input type="text" :value="editAddress.name" @input="onFieldInput('name', $event.target.value)" class="w-full bg-white rounded-[12px] h-[44px] px-[10px] text-[1rem] border border-[var(--color-brand-border)] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[var(--color-brand-primary)] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
			</div>
			<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[10px]">
				<div>
					<label class="text-[0.75rem] text-[var(--color-brand-text-secondary)]">Indirizzo</label>
					<input type="text" :value="editAddress.address" @input="onFieldInput('address', $event.target.value)" class="w-full bg-white rounded-[12px] h-[44px] px-[10px] text-[1rem] border border-[var(--color-brand-border)] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[var(--color-brand-primary)] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
				</div>
				<div>
					<label class="text-[0.75rem] text-[var(--color-brand-text-secondary)]">N. Civico</label>
					<input type="text" :value="editAddress.address_number" @input="onFieldInput('address_number', $event.target.value)" class="w-full bg-white rounded-[12px] h-[44px] px-[10px] text-[1rem] border border-[var(--color-brand-border)] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[var(--color-brand-primary)] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
				</div>
			</div>
			<div class="grid grid-cols-2 tablet:grid-cols-3 gap-[10px]">
				<div>
					<label class="text-[0.75rem] text-[var(--color-brand-text-secondary)]">Città</label>
					<input type="text" :value="editAddress.city" @input="onFieldInput('city', $event.target.value)" class="w-full bg-white rounded-[12px] h-[44px] px-[10px] text-[1rem] border border-[var(--color-brand-border)] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[var(--color-brand-primary)] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" required />
				</div>
				<div>
					<label class="text-[0.75rem] text-[var(--color-brand-text-secondary)]">CAP</label>
					<input
						type="text"
						:value="editAddress.postal_code"
						maxlength="5"
						inputmode="numeric"
						pattern="[0-9]{5}"
						@input="onCapInput"
						class="w-full bg-white rounded-[12px] h-[44px] px-[10px] text-[1rem] border border-[var(--color-brand-border)] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[var(--color-brand-primary)] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]"
						required />
				</div>
				<div class="col-span-2 tablet:col-span-1">
					<label class="text-[0.75rem] text-[var(--color-brand-text-secondary)]">Provincia</label>
					<input type="text" :value="editAddress.province" @input="onFieldInput('province', $event.target.value)" class="w-full bg-white rounded-[12px] h-[44px] px-[10px] text-[1rem] border border-[var(--color-brand-border)] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[var(--color-brand-primary)] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" required />
				</div>
			</div>
			<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[10px]">
				<div>
					<label class="text-[0.75rem] text-[var(--color-brand-text-secondary)]">Telefono</label>
					<input type="tel" :value="editAddress.telephone_number" @input="onFieldInput('telephone_number', $event.target.value)" class="w-full bg-white rounded-[12px] h-[44px] px-[10px] text-[1rem] border border-[var(--color-brand-border)] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[var(--color-brand-primary)] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
				</div>
				<div>
					<label class="text-[0.75rem] text-[var(--color-brand-text-secondary)]">Email</label>
					<input type="email" :value="editAddress.email" @input="onFieldInput('email', $event.target.value)" class="w-full bg-white rounded-[12px] h-[44px] px-[10px] text-[1rem] border border-[var(--color-brand-border)] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[var(--color-brand-primary)] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
				</div>
			</div>
			<div class="flex gap-[10px] justify-end">
				<button type="button" @click="emit('cancel-edit')" class="btn-secondary btn-compact">Annulla</button>
				<button type="button" @click="emit('save-edit', type)" class="btn-cta btn-compact">Salva</button>
			</div>
		</div>
	</div>
</template>
