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
	<div class="rounded-[14px] ring-[1px] ring-[#DFE2E7] bg-white p-[16px] tablet:p-[28px_32px]" style="box-shadow: 0 1px 4px rgba(0,0,0,0.03)">
		<div class="flex items-center justify-between mb-[16px]">
			<div class="flex items-center gap-[10px]">
				<!-- Origin icon -->
				<span v-if="isOrigin" class="inline-flex items-center justify-center w-[32px] h-[32px] rounded-full shrink-0" style="background: rgba(228,66,3,0.08)">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
				</span>
				<!-- Destination icon -->
				<span v-else class="inline-flex items-center justify-center w-[32px] h-[32px] rounded-full shrink-0" style="background: rgba(9,88,102,0.08)">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
				</span>
				<div>
					<p class="text-[0.75rem] font-[700] uppercase tracking-wide text-[var(--color-brand-primary)] mb-[2px]">{{ isOrigin ? 'Partenza' : 'Destinazione' }}</p>
					<h2 class="font-montserrat text-[1.125rem] font-[800] tracking-[-0.02em] text-[var(--color-brand-text)]">{{ sectionTitle }}</h2>
				</div>
			</div>
			<button type="button" @click="handleEditClick" class="inline-flex items-center gap-[6px] rounded-full ring-[1.5px] ring-[#DFE2E7] bg-white px-[16px] py-[8px] text-[0.875rem] font-bold text-[var(--color-brand-text-secondary)] hover:bg-[#F8F9FB] transition-colors" :title="`Modifica ${sectionTitle.toLowerCase()}`">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
				<span>Modifica</span>
			</button>
		</div>

		<!-- View mode -->
		<div v-if="editingSection !== type" class="text-[0.875rem] text-[var(--color-brand-text)] space-y-[6px]">
			<p class="font-semibold text-[0.9375rem]">{{ address?.name }}</p>
			<template v-if="!pudo || isOrigin">
				<p class="text-[var(--color-brand-text-secondary)]">{{ address?.address }} {{ address?.address_number }}</p>
				<p class="text-[var(--color-brand-text-secondary)]">{{ address?.postal_code }} {{ address?.city }} ({{ address?.province }})</p>
			</template>
			<template v-if="pudo && !isOrigin">
				<div class="my-[8px] p-[12px] rounded-[14px] flex items-start gap-[10px]" style="background: rgba(9,88,102,0.06)">
					<span class="inline-flex items-center justify-center w-[28px] h-[28px] rounded-full shrink-0 mt-[1px]" style="background: rgba(9,88,102,0.1)">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
					</span>
					<div class="text-[0.8125rem]">
						<span class="font-bold text-[var(--color-brand-primary)]">Ritiro in Punto BRT</span>
						<p class="text-[var(--color-brand-text)] font-semibold mt-[2px]">{{ pudo.name }}</p>
						<p class="text-[var(--color-brand-text-secondary)]">{{ pudo.address }}, {{ pudo.zip_code }} {{ pudo.city }}</p>
					</div>
				</div>
			</template>
			<div class="flex items-center gap-[12px] mt-[4px]">
				<p v-if="address?.telephone_number && address.telephone_number !== '0000000000'" class="text-[var(--color-brand-text-secondary)] flex items-center gap-[4px]">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
					{{ address.telephone_number }}
				</p>
				<p v-if="address?.email" class="text-[var(--color-brand-text-secondary)] flex items-center gap-[4px]">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
					{{ address.email }}
				</p>
			</div>
		</div>

		<!-- Edit mode -->
		<div v-else class="space-y-[12px]">
			<div>
				<label class="form-label text-[0.75rem]">Nome e Cognome</label>
				<input type="text" :value="editAddress.name" @input="onFieldInput('name', $event.target.value)" class="form-input h-[44px]" />
			</div>
			<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[12px]">
				<div>
					<label class="form-label text-[0.75rem]">Indirizzo</label>
					<input type="text" :value="editAddress.address" @input="onFieldInput('address', $event.target.value)" class="form-input h-[44px]" />
				</div>
				<div>
					<label class="form-label text-[0.75rem]">N. Civico</label>
					<input type="text" :value="editAddress.address_number" @input="onFieldInput('address_number', $event.target.value)" class="form-input h-[44px]" />
				</div>
			</div>
			<div class="grid grid-cols-2 tablet:grid-cols-3 gap-[12px]">
				<div>
					<label class="form-label text-[0.75rem]">Città</label>
					<input type="text" :value="editAddress.city" @input="onFieldInput('city', $event.target.value)" class="form-input h-[44px]" required />
				</div>
				<div>
					<label class="form-label text-[0.75rem]">CAP</label>
					<input
						type="text"
						:value="editAddress.postal_code"
						maxlength="5"
						inputmode="numeric"
						pattern="[0-9]{5}"
						@input="onCapInput"
						class="form-input h-[44px]"
						required />
				</div>
				<div class="col-span-2 tablet:col-span-1">
					<label class="form-label text-[0.75rem]">Provincia</label>
					<input type="text" :value="editAddress.province" @input="onFieldInput('province', $event.target.value)" class="form-input h-[44px]" required />
				</div>
			</div>
			<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[12px]">
				<div>
					<label class="form-label text-[0.75rem]">Telefono</label>
					<input type="tel" :value="editAddress.telephone_number" @input="onFieldInput('telephone_number', $event.target.value)" class="form-input h-[44px]" />
				</div>
				<div>
					<label class="form-label text-[0.75rem]">Email</label>
					<input type="email" :value="editAddress.email" @input="onFieldInput('email', $event.target.value)" class="form-input h-[44px]" />
				</div>
			</div>
			<div class="flex gap-[10px] justify-end pt-[4px]">
				<button type="button" @click="emit('cancel-edit')" class="rounded-full ring-[1.5px] ring-[#DFE2E7] bg-white px-[18px] py-[10px] text-[0.9rem] font-bold text-[var(--color-brand-text-secondary)] hover:bg-[#F8F9FB] transition-colors">Annulla</button>
				<button type="button" @click="emit('save-edit', type)" class="rounded-full px-[18px] py-[10px] text-[0.9rem] text-white font-[700]" style="background: linear-gradient(135deg, #E44203, #c73600)">Salva</button>
			</div>
		</div>
	</div>
</template>
