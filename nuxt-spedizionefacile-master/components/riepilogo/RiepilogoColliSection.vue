<!--
  Sezione "Colli" del riepilogo: visualizza/edita i pacchi della spedizione.
  Props: shipment, editingSection, editColli, formatPrice, getPackageTypeVisual
  Emits: start-edit, cancel-edit, save-edit
-->
<script setup>
const props = defineProps({
	packages: { type: Array, required: true },
	editingSection: { type: String, default: null },
	editColli: { type: Array, required: true },
	formatPrice: { type: Function, required: true },
	getPackageTypeVisual: { type: Function, required: true },
});
const emit = defineEmits(['start-edit', 'cancel-edit', 'save-edit']);
</script>

<template>
	<div class="bg-[#E4E4E4] rounded-[12px] p-[16px] tablet:p-[28px_32px] mb-[16px]">
		<div class="flex items-center justify-between mb-[16px]">
			<h2 class="text-[1.125rem] font-bold text-[#252B42]">Colli</h2>
			<button type="button" @click="emit('start-edit', 'colli')" class="btn-secondary btn-compact inline-flex items-center gap-[6px]" title="Modifica colli">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
				<span>Modifica</span>
			</button>
		</div>

		<!-- View mode -->
		<div v-if="editingSection !== 'colli'" class="space-y-[10px]">
			<div v-for="(pkg, idx) in packages" :key="idx" class="bg-white rounded-[12px] p-[12px] tablet:p-[16px] flex items-center justify-between gap-[8px] tablet:gap-[16px]">
				<div class="flex items-center gap-[10px] tablet:gap-[16px] min-w-0">
					<div
						class="w-[48px] h-[48px] tablet:w-[56px] tablet:h-[56px] rounded-[12px] bg-[#F8F9FB] flex items-center justify-center shrink-0 overflow-visible"
						:class="getPackageTypeVisual(pkg).wrapperClass">
						<img
							:src="getPackageTypeVisual(pkg).icon"
							:alt="getPackageTypeVisual(pkg).label"
							loading="lazy"
							decoding="async"
							class="block shrink-0 object-contain"
							:class="getPackageTypeVisual(pkg).iconClass" />
					</div>
					<div class="min-w-0">
						<p class="text-[0.875rem] tablet:text-[0.9375rem] font-semibold text-[#252B42] truncate">{{ pkg.package_type || 'Pacco' }} #{{ idx + 1 }}</p>
						<p class="text-[0.75rem] tablet:text-[0.8125rem] text-[#737373]">{{ pkg.quantity || 1 }}x &ndash; {{ pkg.weight }} kg &ndash; {{ pkg.first_size }}x{{ pkg.second_size }}x{{ pkg.third_size }} cm</p>
					</div>
				</div>
				<span class="text-[0.875rem] tablet:text-[0.9375rem] font-bold text-[#252B42] shrink-0">{{ formatPrice(pkg.single_price) }}</span>
			</div>
		</div>

		<!-- Edit mode -->
		<div v-else class="space-y-[12px]">
			<div v-for="(pkg, idx) in editColli" :key="idx" class="bg-white rounded-[12px] p-[16px]">
				<p class="font-semibold text-[#252B42] mb-[10px]">Collo #{{ idx + 1 }}</p>
				<div class="grid grid-cols-2 tablet:grid-cols-4 gap-[10px]">
					<div>
						<label class="text-[0.75rem] text-[#737373]">Quantità</label>
						<input type="number" v-model="pkg.quantity" min="1" class="w-full bg-[#F1F1F1] rounded-[12px] h-[44px] text-center text-[1rem] px-[8px] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:bg-white focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] border border-transparent" />
					</div>
					<div>
						<label class="text-[0.75rem] text-[#737373]">Peso (kg)</label>
						<input type="number" v-model="pkg.weight" min="0.1" step="0.1" class="w-full bg-[#F1F1F1] rounded-[12px] h-[44px] text-center text-[1rem] px-[8px] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:bg-white focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] border border-transparent" />
					</div>
					<div>
						<label class="text-[0.75rem] text-[#737373]">L (cm)</label>
						<input type="number" v-model="pkg.first_size" min="1" class="w-full bg-[#F1F1F1] rounded-[12px] h-[44px] text-center text-[1rem] px-[8px] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:bg-white focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] border border-transparent" />
					</div>
					<div>
						<label class="text-[0.75rem] text-[#737373]">P (cm)</label>
						<input type="number" v-model="pkg.second_size" min="1" class="w-full bg-[#F1F1F1] rounded-[12px] h-[44px] text-center text-[1rem] px-[8px] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:bg-white focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] border border-transparent" />
					</div>
					<div>
						<label class="text-[0.75rem] text-[#737373]">H (cm)</label>
						<input type="number" v-model="pkg.third_size" min="1" class="w-full bg-[#F1F1F1] rounded-[12px] h-[44px] text-center text-[1rem] px-[8px] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:bg-white focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] border border-transparent" />
					</div>
				</div>
			</div>
			<div class="flex gap-[10px] justify-end">
				<button type="button" @click="emit('cancel-edit')" class="btn-secondary btn-compact">Annulla</button>
				<button type="button" @click="emit('save-edit', 'colli')" class="btn-cta btn-compact">Salva</button>
			</div>
		</div>
	</div>
</template>
