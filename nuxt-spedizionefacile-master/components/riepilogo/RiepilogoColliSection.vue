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
	<div class="rounded-[14px] ring-[1px] ring-[#DFE2E7] bg-white p-[16px] tablet:p-[28px_32px] mb-[16px]" style="box-shadow: 0 1px 4px rgba(0,0,0,0.03)">
		<div class="flex items-center justify-between mb-[16px]">
			<div class="flex items-center gap-[10px]">
				<span class="inline-flex items-center justify-center w-[32px] h-[32px] rounded-full shrink-0" style="background: rgba(9,88,102,0.08)">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
				</span>
				<div>
					<p class="text-[0.75rem] font-[700] uppercase tracking-wide text-[var(--color-brand-primary)] mb-[2px]">Pacchi</p>
					<h2 class="font-montserrat text-[1.125rem] font-[800] tracking-[-0.02em] text-[var(--color-brand-text)]">Colli</h2>
				</div>
			</div>
			<button type="button" @click="emit('start-edit', 'colli')" class="inline-flex items-center gap-[6px] rounded-full ring-[1.5px] ring-[#DFE2E7] bg-white px-[16px] py-[8px] text-[0.875rem] font-bold text-[var(--color-brand-text-secondary)] hover:bg-[#F8F9FB] transition-colors" title="Modifica colli">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
				<span>Modifica</span>
			</button>
		</div>

		<!-- View mode -->
		<div v-if="editingSection !== 'colli'" class="space-y-[10px]">
			<div v-for="(pkg, idx) in packages" :key="idx" class="rounded-[14px] ring-[1px] ring-[#DFE2E7] bg-[#F8F9FB] p-[14px] tablet:p-[18px] flex items-center justify-between gap-[10px] tablet:gap-[16px]">
				<div class="flex items-center gap-[12px] tablet:gap-[16px] min-w-0">
					<div
						class="w-[48px] h-[48px] tablet:w-[56px] tablet:h-[56px] rounded-[14px] bg-white ring-[1px] ring-[#DFE2E7] flex items-center justify-center shrink-0 overflow-visible"
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
						<p class="text-[0.875rem] tablet:text-[0.9375rem] font-semibold text-[var(--color-brand-text)] truncate">{{ pkg.package_type || 'Pacco' }} #{{ idx + 1 }}</p>
						<p class="text-[0.75rem] tablet:text-[0.8125rem] text-[var(--color-brand-text-secondary)] mt-[2px]">
							<span class="font-medium">{{ pkg.quantity || 1 }}x</span>
							<span class="mx-[4px] text-[var(--color-brand-text-muted)]">&bull;</span>
							{{ pkg.weight }} kg
							<span class="mx-[4px] text-[var(--color-brand-text-muted)]">&bull;</span>
							{{ pkg.first_size }}&times;{{ pkg.second_size }}&times;{{ pkg.third_size }} cm
						</p>
					</div>
				</div>
				<span class="font-montserrat text-[0.9375rem] tablet:text-[1rem] font-[800] text-[var(--color-brand-primary)] shrink-0">{{ formatPrice(pkg.single_price) }}</span>
			</div>
		</div>

		<!-- Edit mode -->
		<div v-else class="space-y-[12px]">
			<div v-for="(pkg, idx) in editColli" :key="idx" class="rounded-[14px] ring-[1px] ring-[#DFE2E7] bg-[#F8F9FB] p-[16px]">
				<p class="font-semibold text-[var(--color-brand-text)] mb-[10px]">Collo #{{ idx + 1 }}</p>
				<div class="grid grid-cols-2 tablet:grid-cols-4 gap-[10px]">
					<div>
						<label class="form-label text-[0.75rem]">Quantità</label>
						<input type="number" v-model="pkg.quantity" min="1" class="form-input h-[44px] text-center" />
					</div>
					<div>
						<label class="form-label text-[0.75rem]">Peso (kg)</label>
						<input type="number" v-model="pkg.weight" min="0.1" step="0.1" class="form-input h-[44px] text-center" />
					</div>
					<div>
						<label class="form-label text-[0.75rem]">L (cm)</label>
						<input type="number" v-model="pkg.first_size" min="1" class="form-input h-[44px] text-center" />
					</div>
					<div>
						<label class="form-label text-[0.75rem]">P (cm)</label>
						<input type="number" v-model="pkg.second_size" min="1" class="form-input h-[44px] text-center" />
					</div>
					<div>
						<label class="form-label text-[0.75rem]">H (cm)</label>
						<input type="number" v-model="pkg.third_size" min="1" class="form-input h-[44px] text-center" />
					</div>
				</div>
			</div>
			<div class="flex gap-[10px] justify-end pt-[4px]">
				<button type="button" @click="emit('cancel-edit')" class="rounded-full ring-[1.5px] ring-[#DFE2E7] bg-white px-[18px] py-[10px] text-[0.9rem] font-bold text-[var(--color-brand-text-secondary)] hover:bg-[#F8F9FB] transition-colors">Annulla</button>
				<button type="button" @click="emit('save-edit', 'colli')" class="rounded-full px-[18px] py-[10px] text-[0.9rem] text-white font-[700]" style="background: linear-gradient(135deg, #E44203, #c73600)">Salva</button>
			</div>
		</div>
	</div>
</template>
