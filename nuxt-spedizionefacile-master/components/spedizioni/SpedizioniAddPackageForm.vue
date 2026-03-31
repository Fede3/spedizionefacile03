<!--
  Componente: SpedizioniAddPackageForm
  Form per aggiungere un nuovo collo a un ordine in attesa di pagamento.
-->
<script setup>
const props = defineProps({
	showForm: { type: Boolean, required: true },
	addingPackage: { type: Boolean, default: false },
	addPackageError: { type: String, default: null },
	addPackageSuccess: { type: Boolean, default: false },
	newPackage: { type: Object, required: true },
});

const emit = defineEmits(['update:showForm', 'submit']);
</script>

<template>
	<div class="mt-[16px]">
		<div v-if="addPackageSuccess" class="bg-emerald-50 border border-emerald-200 rounded-[50px] px-[14px] py-[10px] text-emerald-700 text-[0.8125rem] mb-[12px]">
			Collo aggiunto con successo!
		</div>

		<button
			v-if="!showForm"
			type="button"
			@click="emit('update:showForm', true)"
			class="inline-flex items-center gap-[6px] px-[16px] py-[10px] bg-[#095866] text-white rounded-[50px] text-[0.875rem] font-semibold hover:bg-[#074a56] transition cursor-pointer">
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
			Aggiungi collo
		</button>

		<div v-if="showForm" class="bg-white rounded-[12px] p-[24px] border border-[#E9EBEC]">
			<h3 class="text-[1rem] font-bold text-[#252B42] mb-[16px]">Nuovo collo</h3>
			<div class="grid grid-cols-2 desktop:grid-cols-4 gap-[12px]">
				<div>
					<label class="block text-[0.75rem] text-[#737373] mb-[4px]">Tipo</label>
					<select v-model="newPackage.package_type" class="w-full bg-[#F8F9FB] border border-[#E9EBEC] rounded-[12px] p-[8px] text-[0.875rem]">
						<option value="Pacco">Pacco</option>
						<option value="Busta">Busta</option>
						<option value="Pallet">Pallet</option>
						<option value="Valigia">Valigia</option>
					</select>
				</div>
				<div>
					<label class="block text-[0.75rem] text-[#737373] mb-[4px]">Quantita</label>
					<input type="number" v-model="newPackage.quantity" min="1" max="999" class="w-full bg-[#F8F9FB] border border-[#E9EBEC] rounded-[12px] p-[8px] text-[0.875rem]" />
				</div>
				<div>
					<label class="block text-[0.75rem] text-[#737373] mb-[4px]">Peso (kg)</label>
					<input type="number" v-model="newPackage.weight" min="0.1" max="1000" step="0.1" class="w-full bg-[#F8F9FB] border border-[#E9EBEC] rounded-[12px] p-[8px] text-[0.875rem]" required />
				</div>
				<div>
					<label class="block text-[0.75rem] text-[#737373] mb-[4px]">Lunghezza (cm)</label>
					<input type="number" v-model="newPackage.first_size" min="0.1" max="1000" step="0.1" class="w-full bg-[#F8F9FB] border border-[#E9EBEC] rounded-[12px] p-[8px] text-[0.875rem]" required />
				</div>
				<div>
					<label class="block text-[0.75rem] text-[#737373] mb-[4px]">Larghezza (cm)</label>
					<input type="number" v-model="newPackage.second_size" min="0.1" max="1000" step="0.1" class="w-full bg-[#F8F9FB] border border-[#E9EBEC] rounded-[12px] p-[8px] text-[0.875rem]" required />
				</div>
				<div>
					<label class="block text-[0.75rem] text-[#737373] mb-[4px]">Altezza (cm)</label>
					<input type="number" v-model="newPackage.third_size" min="0.1" max="1000" step="0.1" class="w-full bg-[#F8F9FB] border border-[#E9EBEC] rounded-[12px] p-[8px] text-[0.875rem]" required />
				</div>
				<div class="col-span-2">
					<label class="block text-[0.75rem] text-[#737373] mb-[4px]">Contenuto</label>
					<input type="text" v-model="newPackage.content_description" placeholder="es. Elettronica" maxlength="255" class="w-full bg-[#F8F9FB] border border-[#E9EBEC] rounded-[12px] p-[8px] text-[0.875rem]" />
				</div>
			</div>
			<div v-if="addPackageError" class="mt-[10px] text-red-500 text-[0.8125rem]">{{ addPackageError }}</div>
			<div class="mt-[16px] flex gap-[10px]">
				<button type="button" @click="emit('submit')" :disabled="addingPackage"
					class="inline-flex items-center gap-[6px] px-[16px] py-[10px] bg-[#E44203] text-white rounded-[50px] text-[0.875rem] font-semibold hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
					{{ addingPackage ? 'Aggiunta...' : 'Aggiungi' }}
				</button>
				<button type="button" @click="emit('update:showForm', false)"
					class="inline-flex items-center gap-[6px] px-[16px] py-[10px] bg-[#E9EBEC] text-[#252B42] rounded-[50px] text-[0.875rem] font-semibold hover:bg-[#D0D0D0] transition cursor-pointer">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					Annulla
				</button>
			</div>
		</div>
	</div>
</template>
