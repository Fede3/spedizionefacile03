<!--
	COMPONENTE: LocationSuggestions
	SCOPO: Dropdown suggerimenti autocomplete per campi citta'/CAP. Riutilizzabile ovunque.
	PROPS:
	  - suggestions: Array di {postal_code, place_name, province}
	  - show: Boolean per mostrare/nascondere il dropdown
	  - mode: "city" (mostra citta' in grassetto) o "cap" (mostra CAP in grassetto)
	EMITS:
	  - select(loc): quando l'utente clicca su un suggerimento
-->
<script setup>
defineProps({
	suggestions: { type: Array, default: () => [] },
	show: { type: Boolean, default: false },
	mode: { type: String, default: 'city' },
});

const emit = defineEmits(['select']);
</script>

<template>
	<ul
		v-if="show && suggestions.length"
		class="absolute z-50 top-full left-0 right-0 bg-white border border-[#D0D0D0] rounded-[10px] mt-[2px] max-h-[200px] overflow-y-auto shadow-lg">
		<li
			v-for="loc in suggestions"
			:key="loc.postal_code + loc.place_name"
			class="px-[14px] py-[12px] tablet:py-[10px] cursor-pointer hover:bg-[#f0fafb] text-[0.875rem] text-[#252B42] border-b border-[#F0F0F0] last:border-0"
			@mousedown.prevent="emit('select', loc)">
			<template v-if="mode === 'cap'">
				<span class="font-semibold">{{ loc.postal_code }}</span> - {{ loc.place_name }} <span class="text-[#737373]">({{ loc.province }}<template v-if="loc.country_code && loc.country_code !== 'IT'">, {{ loc.country_code }}</template>)</span>
			</template>
			<template v-else>
				<span class="font-semibold">{{ loc.place_name }}</span> <span class="text-[#737373]">({{ loc.province }}<template v-if="loc.country_code && loc.country_code !== 'IT'">, {{ loc.country_code }}</template>) - {{ loc.postal_code }}</span>
			</template>
		</li>
	</ul>
</template>
