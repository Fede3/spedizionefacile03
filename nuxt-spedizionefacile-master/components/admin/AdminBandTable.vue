<!--
  COMPONENTE: AdminBandTable.vue
  SCOPO: Tabella riutilizzabile per fasce peso e volume nel pannello admin prezzi.
         Accetta bands, tipo (weight/volume) e le funzioni di editing dal parent.
-->
<script setup>
const props = defineProps({
	bands: { type: Array, required: true },
	bandType: { type: String, required: true }, // 'weight' | 'volume'
	title: { type: String, required: true },
	subtitle: { type: String, default: '' },
	addLabel: { type: String, required: true },
	minMaxStep: { type: String, default: '1' },
	minWidth: { type: String, default: '700px' },
	editingCell: { type: [String, null], default: null },
	editValue: { type: String, default: '' },
	// Functions
	centsToEuro: { type: Function, required: true },
	effectivePrice: { type: Function, required: true },
	discountInfo: { type: Function, required: true },
	startEdit: { type: Function, required: true },
	confirmEdit: { type: Function, required: true },
	cancelEdit: { type: Function, required: true },
	toggleShowDiscount: { type: Function, required: true },
	addBand: { type: Function, required: true },
	removeBand: { type: Function, required: true },
	moveBand: { type: Function, required: true },
});

const emit = defineEmits(['update:editValue']);

const onEditInput = (event) => {
	emit('update:editValue', event.target.value);
};
</script>

<template>
	<div class="bg-white rounded-[20px] p-[16px] tablet:p-[20px] desktop:p-[28px] shadow-sm border border-[#E9EBEC] overflow-hidden">
		<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[6px] flex items-center gap-[8px]">
			<slot name="icon" />
			{{ title }}
		</h2>
		<p class="text-[0.75rem] text-[#737373] mb-[20px]">{{ subtitle }}</p>

		<div v-if="!bands.length" class="text-center py-[32px] text-[#737373]">
			<p>Nessuna fascia configurata.</p>
		</div>

		<div v-else class="overflow-x-auto">
			<table class="w-full text-[0.875rem]" :style="{ minWidth }">
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
						<th class="pb-[12px] font-medium text-right">Azioni</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(band, idx) in bands" :key="band.id || idx" :class="['border-b border-[#F0F0F0] last:border-0', idx % 2 === 1 ? 'bg-[#FAFBFC]' : '']">
						<td class="py-[14px] font-bold text-[#252B42]">{{ idx + 1 }}</td>
						<td class="py-[14px] text-[#404040]">
							<input v-model.number="band.min_value" type="number" min="0" :step="minMaxStep" class="w-[86px] h-[34px] px-[8px] rounded-[8px] border border-[#C8CCD0] bg-white text-[0.8125rem]">
						</td>
						<td class="py-[14px] text-[#404040]">
							<input v-model.number="band.max_value" type="number" min="0" :step="minMaxStep" class="w-[86px] h-[34px] px-[8px] rounded-[8px] border border-[#C8CCD0] bg-white text-[0.8125rem]">
						</td>
						<!-- Prezzo base -->
						<td class="py-[14px]">
							<div v-if="editingCell === `${bandType}-${idx}-base_price`" class="flex items-center gap-[6px]">
								<span class="text-[#737373]">&euro;</span>
								<input
									:id="`edit-${bandType}-${idx}-base_price`"
									:value="editValue"
									@input="onEditInput"
									@keydown.enter="confirmEdit(bandType, idx, 'base_price')"
									@keydown.esc="cancelEdit()"
									@blur="confirmEdit(bandType, idx, 'base_price')"
									type="number" min="0" step="0.01"
									class="w-[100px] px-[10px] py-[8px] tablet:py-[6px] bg-white border-2 border-[#095866] rounded-[8px] text-[1rem] tablet:text-[0.8125rem] focus:outline-none"
									placeholder="0,00" />
							</div>
							<button v-else type="button" @click="startEdit(bandType, idx, 'base_price')" class="px-[12px] py-[6px] rounded-[8px] text-[0.875rem] font-semibold text-[#252B42] hover:bg-[#E8F4FB] transition-colors cursor-pointer border border-transparent hover:border-[#B0D4E8]">
								{{ centsToEuro(band.base_price) }}
							</button>
						</td>
						<!-- Prezzo scontato -->
						<td class="py-[14px]">
							<div v-if="editingCell === `${bandType}-${idx}-discount_price`" class="flex items-center gap-[6px]">
								<span class="text-[#737373]">&euro;</span>
								<input
									:id="`edit-${bandType}-${idx}-discount_price`"
									:value="editValue"
									@input="onEditInput"
									@keydown.enter="confirmEdit(bandType, idx, 'discount_price')"
									@keydown.esc="cancelEdit()"
									@blur="confirmEdit(bandType, idx, 'discount_price')"
									type="number" min="0" step="0.01"
									class="w-[100px] px-[10px] py-[8px] tablet:py-[6px] bg-white border-2 border-[#095866] rounded-[8px] text-[1rem] tablet:text-[0.8125rem] focus:outline-none"
									placeholder="vuoto = usa base" />
							</div>
							<button v-else type="button" @click="startEdit(bandType, idx, 'discount_price')" class="px-[12px] py-[6px] rounded-[8px] text-[0.875rem] text-[#737373] hover:bg-[#E8F4FB] transition-colors cursor-pointer border border-transparent hover:border-[#B0D4E8]">
								{{ band.discount_price != null ? centsToEuro(band.discount_price) : '-' }}
							</button>
						</td>
						<!-- Effettivo -->
						<td class="py-[14px]">
							<span class="font-semibold text-emerald-600 text-[0.9375rem]">{{ centsToEuro(effectivePrice(band)) }}</span>
						</td>
						<!-- Sconto -->
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
						<!-- Toggle visibile -->
						<td class="py-[14px] text-center">
							<button type="button" @click="toggleShowDiscount(bandType, idx)"
								:class="band.show_discount ? 'bg-[#095866]' : 'bg-[#C8CCD0]'"
								class="relative inline-flex h-[32px] w-[56px] tablet:h-[24px] tablet:w-[44px] items-center rounded-full transition-colors cursor-pointer">
								<span :class="band.show_discount ? 'translate-x-[28px] tablet:translate-x-[22px]' : 'translate-x-[2px]'" class="inline-block h-[26px] w-[26px] tablet:h-[20px] tablet:w-[20px] transform rounded-full bg-white transition-transform shadow-sm" />
							</button>
						</td>
						<!-- Azioni -->
						<td class="py-[14px]">
							<div class="flex items-center justify-end gap-[6px]">
								<button type="button" class="px-[8px] py-[4px] rounded-[8px] border border-[#D5DDE1] text-[0.75rem] hover:bg-[#F4F8FA] cursor-pointer" @click="moveBand(bandType, idx, -1)">&#8593;</button>
								<button type="button" class="px-[8px] py-[4px] rounded-[8px] border border-[#D5DDE1] text-[0.75rem] hover:bg-[#F4F8FA] cursor-pointer" @click="moveBand(bandType, idx, 1)">&#8595;</button>
								<button type="button" class="px-[8px] py-[4px] rounded-[8px] border border-red-200 text-red-600 text-[0.75rem] hover:bg-red-50 cursor-pointer" @click="removeBand(bandType, idx)">Elimina</button>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<div class="mt-[14px] flex justify-end">
			<button type="button" class="px-[16px] py-[8px] rounded-[999px] bg-[#095866] text-white text-[0.8125rem] font-medium hover:bg-[#074a56] cursor-pointer" @click="addBand(bandType)">
				{{ addLabel }}
			</button>
		</div>
	</div>
</template>
