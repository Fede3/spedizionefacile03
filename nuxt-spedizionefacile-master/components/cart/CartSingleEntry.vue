<!--
  FILE: components/cart/CartSingleEntry.vue
  SCOPO: Riga carrello per collo singolo, desktop + mobile.
  PROPS: entry (type='single'), formatPrice, unitPrice, getPackageIcon, quantityButtonCompactClass, quantityButtonMobileClass
  EMITS: update-quantity(id, qty), delete(id)
-->
<script setup>
defineProps({
  entry: { type: Object, required: true },
  formatPrice: { type: Function, required: true },
  unitPrice: { type: Function, required: true },
  getPackageIcon: { type: Function, required: true },
  quantityButtonCompactClass: { type: String, default: '' },
  quantityButtonMobileClass: { type: String, default: '' },
})

const emit = defineEmits(['update-quantity', 'delete'])
</script>

<template>
  <div class="bg-white rounded-[16px] overflow-hidden">
    <!-- Desktop layout -->
    <div class="hidden desktop:flex items-center gap-[16px] p-[16px_20px]">
      <div class="w-[44px] h-[44px] rounded-[50px] bg-[#F8F9FB] flex items-center justify-center shrink-0">
        <NuxtImg :src="getPackageIcon(entry.item)" alt="" width="28" height="28" loading="lazy" decoding="async" />
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-[8px]">
          <span class="text-[0.9375rem] font-semibold text-[#252B42]">{{ entry.item.origin_address?.city || 'Partenza' }}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E44203" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          <span class="text-[0.9375rem] font-semibold text-[#252B42]">{{ entry.item.destination_address?.city || 'Destinazione' }}</span>
        </div>
        <p class="text-[0.8125rem] text-[#737373] mt-[2px]">
          {{ entry.item.package_type || 'Pacco' }} <span class="mx-[4px]">&middot;</span>
          {{ entry.item.weight }} kg <span class="mx-[4px]">&middot;</span>
          {{ entry.item.first_size }}x{{ entry.item.second_size }}x{{ entry.item.third_size }} cm
        </p>
      </div>
      <span class="text-[0.75rem] text-[#737373] bg-[#F0F0F0] px-[8px] py-[3px] rounded-[6px] shrink-0">{{ entry.item.services?.service_type?.split(',')[0]?.trim() || 'BRT' }}</span>
      <div class="text-[0.75rem] text-[#404040] shrink-0 max-w-[200px]">
        <div class="flex items-center gap-[4px]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E44203" stroke-width="2" class="shrink-0"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span class="truncate">{{ entry.item.origin_address?.name?.split(' ')[0] || '' }} - {{ entry.item.origin_address?.city || '' }}</span>
        </div>
        <div class="flex items-center gap-[4px] mt-[2px]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" class="shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span class="truncate">{{ entry.item.destination_address?.name?.split(' ')[0] || '' }} - {{ entry.item.destination_address?.city || '' }}</span>
        </div>
      </div>
      <div class="flex items-center gap-[4px] shrink-0">
        <button type="button" @click="emit('update-quantity', entry.item.id, (entry.item.quantity || 1) - 1)" :disabled="(entry.item.quantity || 1) <= 1" :class="quantityButtonCompactClass">-</button>
        <span class="min-w-[20px] text-center font-semibold text-[0.8125rem]">{{ entry.item.quantity || 1 }}</span>
        <button type="button" @click="emit('update-quantity', entry.item.id, (entry.item.quantity || 1) + 1)" :disabled="(entry.item.quantity || 1) >= 100" :class="quantityButtonCompactClass">+</button>
      </div>
      <div class="text-right shrink-0 min-w-[80px]">
        <span v-if="(entry.item.quantity || 1) > 1" class="block text-[0.6875rem] text-[#737373]">{{ formatPrice(unitPrice(entry.item)) }}/cad</span>
        <span class="text-[0.9375rem] font-bold text-[#252B42]">{{ formatPrice(entry.item.single_price) }}</span>
      </div>
      <div class="flex items-center gap-[8px] shrink-0">
        <NuxtLink :to="`/riepilogo?edit=${entry.item.id}`" class="text-[#095866] hover:text-[#074a56] cursor-pointer" title="Modifica">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </NuxtLink>
        <button type="button" @click="emit('delete', entry.item.id)" class="text-red-500 hover:text-red-700 cursor-pointer" title="Elimina">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </div>
    </div>

    <!-- Mobile layout -->
    <div class="desktop:hidden p-[14px]">
      <div class="flex items-center justify-between mb-[8px]">
        <div class="min-w-0 flex-1 mr-[10px]">
          <p class="text-[0.875rem] font-semibold text-[#252B42] truncate">{{ entry.item.origin_address?.city || 'Partenza' }} &rarr; {{ entry.item.destination_address?.city || 'Destinazione' }}</p>
          <p class="text-[0.75rem] text-[#737373]">{{ entry.item.weight }} kg &middot; {{ entry.item.first_size }}x{{ entry.item.second_size }}x{{ entry.item.third_size }} cm</p>
        </div>
        <div class="text-right shrink-0">
          <span v-if="(entry.item.quantity || 1) > 1" class="block text-[0.6875rem] text-[#737373]">{{ formatPrice(unitPrice(entry.item)) }}/cad</span>
          <span class="text-[0.9375rem] font-bold text-[#252B42]">{{ formatPrice(entry.item.single_price) }}</span>
        </div>
      </div>
      <div class="flex items-center justify-between mt-[6px]">
        <div class="flex items-center gap-[8px]">
          <button type="button" @click="emit('update-quantity', entry.item.id, (entry.item.quantity || 1) - 1)" :disabled="(entry.item.quantity || 1) <= 1" :class="quantityButtonMobileClass">-</button>
          <span class="min-w-[24px] text-center font-semibold text-[0.875rem] text-[#252B42]">{{ entry.item.quantity || 1 }}x</span>
          <button type="button" @click="emit('update-quantity', entry.item.id, (entry.item.quantity || 1) + 1)" :disabled="(entry.item.quantity || 1) >= 100" :class="quantityButtonMobileClass">+</button>
        </div>
        <div class="flex items-center gap-[12px]">
          <NuxtLink :to="`/riepilogo?edit=${entry.item.id}`" class="inline-flex items-center gap-[4px] text-[0.8125rem] text-[#095866] font-semibold hover:underline cursor-pointer min-h-[44px] px-[4px]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Modifica
          </NuxtLink>
          <button type="button" @click="emit('delete', entry.item.id)" class="text-[0.8125rem] text-red-500 font-semibold hover:underline cursor-pointer min-h-[44px] px-[4px]">Elimina</button>
        </div>
      </div>
    </div>
  </div>
</template>
