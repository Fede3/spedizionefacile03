<!--
  ShipmentAddressToolbar.vue
  Toolbar con "Spedizioni configurate" e "Indirizzi salvati" per una sezione indirizzo.
  Estratto da StepAddressSection.vue per ridurre la duplicazione origin/dest.
-->
<script setup>
const props = defineProps({
	type: { type: String, required: true }, // 'origin' | 'dest'
	isAuthenticated: { type: Boolean, default: false },

	/* Saved configs */
	savedConfigs: { type: Array, default: () => [] },
	loadingConfigs: { type: Boolean, default: false },
	showConfigDropdown: { type: Boolean, default: false },
	showConfigGuestPrompt: { type: Boolean, default: false },

	/* Saved addresses */
	savedAddresses: { type: Array, default: () => [] },
	loadingSavedAddresses: { type: Boolean, default: false },
	showAddressSelector: { type: Boolean, default: false },
	showGuestPrompt: { type: Boolean, default: false },
});

const emit = defineEmits([
	'load-saved-configs',
	'apply-config',
	'toggle-address-selector',
	'apply-saved-address',
	'open-auth-modal',
]);

const configDropdownRef = ref(null);
const addressSelectorRef = ref(null);

defineExpose({ configDropdownRef, addressSelectorRef });
</script>

<template>
	<div class="flex items-center gap-[10px] flex-wrap">
		<!-- Spedizioni configurate -->
		<div ref="configDropdownRef" class="relative">
			<button
				type="button"
				@click="$emit('load-saved-configs', type)"
				:aria-expanded="((isAuthenticated && showConfigDropdown) || (!isAuthenticated && showConfigGuestPrompt)) ? 'true' : 'false'"
				:aria-controls="`${type}-config-dropdown`"
				:disabled="isAuthenticated && loadingConfigs"
				class="address-utility-button address-utility-button--sand disabled:opacity-60">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
				{{ isAuthenticated && loadingConfigs ? '...' : 'Spedizioni configurate' }}
			</button>
			<!-- Dropdown con configurazioni -->
			<div v-if="showConfigDropdown && savedConfigs.length > 0" :id="`${type}-config-dropdown`" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#E9EBEC] rounded-[12px] shadow-lg max-h-[300px] overflow-y-auto w-[min(92vw,400px)]">
				<div class="p-[12px] border-b border-[#F0F0F0] text-[0.8125rem] font-bold text-[#252B42]">Seleziona una spedizione configurata completa</div>
				<div v-for="item in savedConfigs" :key="`${type}-config-${item.id}`" @click="$emit('apply-config', item, 'both')" class="px-[14px] py-[12px] cursor-pointer hover:bg-[#f0fafb] border-b border-[#F0F0F0] last:border-0 transition-colors">
					<div class="flex items-center gap-[8px]">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#996D47" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
						<template v-if="type === 'origin'">
							<span class="text-[0.875rem] font-semibold text-[#252B42]">{{ item.origin_address?.city || 'Partenza' }}</span>
							<span class="text-[#737373]">&rarr;</span>
							<span class="text-[0.875rem] font-semibold text-[#252B42]">{{ item.destination_address?.city || 'Destinazione' }}</span>
						</template>
						<template v-else>
							<span class="text-[0.875rem] font-semibold text-[#252B42]">{{ item.destination_address?.city || 'Destinazione' }}</span>
						</template>
					</div>
					<p class="text-[0.75rem] text-[#737373] mt-[2px]">
						<template v-if="type === 'origin'">{{ item.origin_address?.name || '' }} - {{ item.destination_address?.name || '' }}</template>
						<template v-else>{{ item.destination_address?.name || '' }}</template>
					</p>
				</div>
			</div>
			<!-- Nessuna configurazione -->
			<div v-if="showConfigDropdown && savedConfigs.length === 0 && !loadingConfigs" :id="`${type}-config-dropdown`" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#E9EBEC] rounded-[12px] shadow-lg p-[20px] w-[min(92vw,300px)]">
				<p class="text-[0.875rem] text-[#737373]">Nessuna spedizione configurata salvata.</p>
				<NuxtLink to="/account/spedizioni-configurate" class="text-[0.8125rem] text-[#095866] hover:underline font-semibold mt-[8px] inline-block">Vai a spedizioni configurate</NuxtLink>
			</div>
			<!-- Guest prompt -->
			<div v-if="showConfigGuestPrompt && !isAuthenticated" :id="`${type}-config-dropdown`" role="dialog" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#E9EBEC] rounded-[12px] shadow-lg p-[14px] w-[min(92vw,300px)]">
				<p class="text-[0.8125rem] text-[#4B5563] leading-[1.45]">Per usare le spedizioni configurate devi accedere.</p>
				<div class="mt-[10px] flex items-center gap-[8px]">
					<button type="button" class="inline-flex items-center justify-center h-[34px] px-[12px] rounded-[12px] bg-[#095866] text-white text-[0.75rem] font-semibold hover:bg-[#074a56] transition cursor-pointer" @click="$emit('open-auth-modal', 'login')">Accedi</button>
					<button type="button" class="inline-flex items-center justify-center h-[34px] px-[12px] rounded-[12px] border border-[#C8D2D6] text-[#095866] text-[0.75rem] font-semibold hover:bg-[#F3F7F8] transition cursor-pointer" @click="$emit('open-auth-modal', 'register')">Registrati</button>
				</div>
			</div>
		</div>

		<!-- Indirizzi salvati -->
		<div ref="addressSelectorRef" class="relative">
			<button
				type="button"
				@click="$emit('toggle-address-selector', type)"
				:aria-expanded="(isAuthenticated ? showAddressSelector : showGuestPrompt) ? 'true' : 'false'"
				:aria-controls="`${type}-addresses-dropdown`"
				class="address-utility-button address-utility-button--teal">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
				Indirizzi salvati
			</button>
			<div v-if="showAddressSelector && isAuthenticated" :id="`${type}-addresses-dropdown`" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#E9EBEC] rounded-[12px] shadow-lg max-h-[250px] overflow-y-auto w-[min(92vw,320px)]">
				<div v-if="loadingSavedAddresses" class="p-[16px] text-center text-[0.8125rem] text-[#737373]">Caricamento...</div>
				<template v-else-if="savedAddresses.length > 0">
					<div v-for="addr in savedAddresses" :key="addr.id" @click="$emit('apply-saved-address', addr, type)" class="px-[14px] py-[10px] cursor-pointer hover:bg-[#f0fafb] border-b border-[#F0F0F0] last:border-0 transition-colors">
						<p class="text-[0.875rem] font-semibold text-[#252B42]">{{ addr.name }}</p>
						<p class="text-[0.75rem] text-[#737373]">{{ addr.address }} {{ addr.address_number }}, {{ addr.postal_code }} {{ addr.city }}</p>
					</div>
				</template>
				<div v-else class="p-[16px]">
					<p class="text-[0.8125rem] text-[#737373]">Nessun indirizzo salvato.</p>
					<NuxtLink to="/account/indirizzi" class="text-[0.8125rem] text-[#095866] hover:underline font-semibold mt-[4px] inline-block">Aggiungi indirizzo</NuxtLink>
				</div>
			</div>
			<div v-if="showGuestPrompt && !isAuthenticated" :id="`${type}-addresses-dropdown`" role="dialog" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#E9EBEC] rounded-[12px] shadow-lg p-[14px] w-[min(92vw,280px)]">
				<p class="text-[0.8125rem] text-[#4B5563] leading-[1.45]">Per usare la rubrica indirizzi devi accedere.</p>
				<div class="mt-[10px] flex items-center gap-[8px]">
					<button type="button" class="inline-flex items-center justify-center h-[34px] px-[12px] rounded-[12px] bg-[#095866] text-white text-[0.75rem] font-semibold hover:bg-[#074a56] transition cursor-pointer" @click="$emit('open-auth-modal', 'login')">Accedi</button>
					<button type="button" class="inline-flex items-center justify-center h-[34px] px-[12px] rounded-[12px] border border-[#C8D2D6] text-[#095866] text-[0.75rem] font-semibold hover:bg-[#F3F7F8] transition cursor-pointer" @click="$emit('open-auth-modal', 'register')">Registrati</button>
				</div>
			</div>
		</div>
	</div>
</template>
