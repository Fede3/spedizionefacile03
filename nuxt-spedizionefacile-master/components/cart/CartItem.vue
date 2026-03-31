<!--
  FILE: components/cart/CartItem.vue
  SCOPO: Singolo item (o gruppo multi-collo) nel carrello.
  PROPS: entry (oggetto display: type 'group' o 'single'), isGroupExpanded (bool)
  EMITS: remove(id), update-quantity(id, qty), toggle-group(groupIndex)
-->
<script setup>
import { formatPrice } from '~/utils/price.js'

const props = defineProps({
  entry: { type: Object, required: true },
  isGroupExpanded: { type: Boolean, default: true },
})

const emit = defineEmits(['remove', 'update-quantity', 'toggle-group'])

// Calcola il prezzo unitario dividendo il totale per la quantita' (ritorna centesimi)
const unitPrice = (item) => {
  const total = Number(item.single_price) || 0
  const qty = Math.max(1, Number(item.quantity) || 1)
  return total / qty
}

// Restituisce l'icona corrispondente al tipo di pacco
const getPackageIcon = (item) => {
  const type = item.package_type?.toLowerCase() || ''
  if (type.includes('pallet')) return '/img/quote/first-step/pallet.png'
  if (type.includes('busta')) return '/img/quote/first-step/envelope.png'
  if (type.includes('valigia')) return '/img/quote/first-step/suitcase.png'
  return '/img/quote/first-step/pack.png'
}
</script>

<template>
  <!-- ========== GROUPED ENTRY (multi-collo) ========== -->
  <div
    v-if="entry.type === 'group'"
    class="bg-white rounded-[16px] border-l-[4px] overflow-hidden"
    :style="{ borderLeftColor: entry.color }">

    <!-- Group header (clickable to expand/collapse) -->
    <button
      type="button"
      @click="emit('toggle-group', entry.groupIndex)"
      class="w-full flex items-center gap-2.5 tablet:gap-[16px] p-[14px] tablet:p-[20px] hover:bg-[#f8fafb] transition cursor-pointer text-left">
      <!-- Merge icon -->
      <div class="w-[36px] h-[36px] tablet:w-[44px] tablet:h-[44px] rounded-[50px] tablet:rounded-[50px] flex items-center justify-center shrink-0"
        :style="{ backgroundColor: entry.color + '15' }">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" :stroke="entry.color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tablet:w-[22px] tablet:h-[22px]"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>
      </div>

      <!-- Route info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5 tablet:gap-2 flex-wrap">
          <span class="text-[0.8125rem] tablet:text-[0.9375rem] font-bold text-[#252B42]">
            {{ entry.items[0]?.origin_address?.city || 'Partenza' }}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E44203" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 tablet:w-[18px] tablet:h-[18px]"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          <span class="text-[0.8125rem] tablet:text-[0.9375rem] font-bold text-[#252B42]">
            {{ entry.items[0]?.destination_address?.city || 'Destinazione' }}
          </span>
        </div>
        <div class="flex items-center gap-3 mt-[4px] flex-wrap">
          <span class="text-[0.8125rem] text-[#737373]">
            {{ entry.items.length }} colli
          </span>
          <span class="inline-flex items-center gap-[4px] px-[8px] py-[2px] rounded-[6px] text-[0.75rem] font-semibold text-white"
            :style="{ backgroundColor: entry.color }">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>
            Spedizione unica
          </span>
          <span class="text-[0.75rem] text-[#737373] bg-[#F0F0F0] px-[8px] py-[2px] rounded-[6px]">
            {{ entry.items[0]?.services?.service_type?.split(',')[0]?.trim() || 'BRT' }}
          </span>
        </div>
      </div>

      <!-- Total price -->
      <div class="text-right shrink-0">
        <p class="text-[0.9375rem] tablet:text-[1.125rem] font-bold text-[#252B42]">{{ formatPrice(entry.totalCents) }}</p>
        <p class="text-[0.6875rem] tablet:text-[0.75rem] text-[#737373]">totale gruppo</p>
      </div>

      <!-- Expand/collapse chevron -->
      <div class="shrink-0 ml-[4px] transition-transform" :class="{ 'rotate-180': isGroupExpanded }">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#737373" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    </button>

    <!-- Group addresses (always visible) -->
    <div class="px-[14px] tablet:px-[20px] pb-[4px] flex flex-wrap gap-x-[24px] gap-y-[4px] text-[0.75rem] tablet:text-[0.8125rem] text-[#404040]">
      <div class="flex items-start gap-1.5 min-w-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E44203" stroke-width="2" class="shrink-0 mt-[2px]"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span class="break-words">{{ entry.items[0]?.origin_address?.name || '' }} - {{ entry.items[0]?.origin_address?.address || '' }}, {{ entry.items[0]?.origin_address?.city || '' }}</span>
      </div>
      <div class="flex items-start gap-1.5 min-w-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" class="shrink-0 mt-[2px]"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span class="break-words">{{ entry.items[0]?.destination_address?.name || '' }} - {{ entry.items[0]?.destination_address?.address || '' }}, {{ entry.items[0]?.destination_address?.city || '' }}</span>
      </div>
    </div>

    <!-- Expanded: individual parcels -->
    <div v-if="isGroupExpanded" class="px-[12px] tablet:px-[20px] pb-[16px] pt-[8px]">
      <div class="border-t border-dashed border-[#D0D0D0] pt-[12px]">
        <div
          v-for="(item, pIdx) in entry.items"
          :key="item.id"
          class="flex flex-wrap tablet:flex-nowrap items-center gap-2 tablet:gap-3 py-[10px] px-[8px] tablet:px-[12px] rounded-[50px] mb-[6px]"
          :class="pIdx % 2 === 0 ? 'bg-[#F8F9FB]' : 'bg-white'">
          <!-- Package icon -->
          <div class="w-[32px] h-[32px] tablet:w-[36px] tablet:h-[36px] rounded-[8px] bg-[#F0F0F0] flex items-center justify-center shrink-0">
            <NuxtImg :src="getPackageIcon(item)" alt="" width="22" height="22" loading="lazy" decoding="async" class="w-[18px] h-[18px] tablet:w-[22px] tablet:h-[22px]" />
          </div>

          <!-- Package info -->
          <div class="flex-1 min-w-0">
            <p class="text-[0.8125rem] tablet:text-[0.875rem] font-semibold text-[#252B42]">
              Collo {{ pIdx + 1 }}
              <span class="font-normal text-[#737373] ml-[4px]">{{ item.package_type || 'Pacco' }}</span>
            </p>
            <p class="text-[0.75rem] tablet:text-[0.8125rem] text-[#737373]">
              {{ item.weight }} kg
              <span class="mx-[4px]">&middot;</span>
              {{ item.first_size }}x{{ item.second_size }}x{{ item.third_size }} cm
            </p>
          </div>

          <!-- Price -->
          <div class="text-right shrink-0 min-w-[60px] tablet:min-w-[70px]">
            <span v-if="(item.quantity || 1) > 1" class="block text-[0.6875rem] text-[#737373]">{{ formatPrice(unitPrice(item)) }}/cad</span>
            <span class="text-[0.8125rem] tablet:text-[0.875rem] font-semibold text-[#252B42]">{{ formatPrice(item.single_price) }}</span>
          </div>

          <!-- Quantity + Actions row -->
          <div class="w-full tablet:w-auto flex items-center justify-between tablet:justify-start gap-2 tablet:gap-[4px] pl-[40px] tablet:pl-0">
            <!-- Quantity -->
            <div class="flex items-center gap-[4px] shrink-0">
              <button type="button" @click="emit('update-quantity', item.id, (item.quantity || 1) - 1)" :disabled="(item.quantity || 1) <= 1" class="w-[32px] h-[32px] tablet:w-[24px] tablet:h-[24px] flex items-center justify-center rounded-full bg-[#E9EBEC] text-[#252B42] text-[0.875rem] tablet:text-[0.75rem] font-bold hover:bg-[#D0D0D0] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-[background-color,transform] duration-200 active:scale-90">-</button>
              <span class="min-w-[20px] text-center font-semibold text-[0.8125rem] text-[#252B42]">{{ item.quantity || 1 }}</span>
              <button type="button" @click="emit('update-quantity', item.id, (item.quantity || 1) + 1)" :disabled="(item.quantity || 1) >= 100" class="w-[32px] h-[32px] tablet:w-[24px] tablet:h-[24px] flex items-center justify-center rounded-full bg-[#E9EBEC] text-[#252B42] text-[0.875rem] tablet:text-[0.75rem] font-bold hover:bg-[#D0D0D0] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-[background-color,transform] duration-200 active:scale-90">+</button>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1.5 shrink-0">
              <NuxtLink :to="`/riepilogo?edit=${item.id}`" class="min-w-[36px] min-h-[36px] tablet:min-w-0 tablet:min-h-0 flex items-center justify-center text-[#095866] hover:text-[#074a56] cursor-pointer" title="Modifica collo">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </NuxtLink>
              <button type="button" @click="emit('remove', item.id)" class="min-w-[36px] min-h-[36px] tablet:min-w-0 tablet:min-h-0 flex items-center justify-center text-red-500 hover:text-red-700 cursor-pointer" title="Elimina collo">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Collapsed summary -->
    <div v-else class="px-[14px] tablet:px-[20px] pb-[16px] pt-[4px]">
      <p class="text-[0.75rem] tablet:text-[0.8125rem] text-[#737373]">
        {{ entry.items.map((i, idx) => `Collo ${idx + 1}: ${i.weight}kg`).join(' | ') }}
      </p>
    </div>
  </div>

  <!-- ========== SINGLE ENTRY (collo singolo) ========== -->
  <div v-else class="bg-white rounded-[16px] overflow-hidden">

    <!-- Desktop layout -->
    <div class="hidden desktop:flex items-center gap-[16px] p-[16px_20px]">
      <!-- Package icon -->
      <div class="w-[44px] h-[44px] rounded-[50px] bg-[#F8F9FB] flex items-center justify-center shrink-0">
        <NuxtImg :src="getPackageIcon(entry.item)" alt="" width="28" height="28" loading="lazy" decoding="async" />
      </div>

      <!-- Route -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-[0.9375rem] font-semibold text-[#252B42]">
            {{ entry.item.origin_address?.city || 'Partenza' }}
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E44203" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          <span class="text-[0.9375rem] font-semibold text-[#252B42]">
            {{ entry.item.destination_address?.city || 'Destinazione' }}
          </span>
        </div>
        <p class="text-[0.8125rem] text-[#737373] mt-[2px]">
          {{ entry.item.package_type || 'Pacco' }}
          <span class="mx-[4px]">&middot;</span>
          {{ entry.item.weight }} kg
          <span class="mx-[4px]">&middot;</span>
          {{ entry.item.first_size }}x{{ entry.item.second_size }}x{{ entry.item.third_size }} cm
        </p>
      </div>

      <!-- Service -->
      <span class="text-[0.75rem] text-[#737373] bg-[#F0F0F0] px-[8px] py-[3px] rounded-[6px] shrink-0">
        {{ entry.item.services?.service_type?.split(',')[0]?.trim() || 'BRT' }}
      </span>

      <!-- Addresses -->
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

      <!-- Quantity -->
      <div class="flex items-center gap-[4px] shrink-0">
        <button type="button" @click="emit('update-quantity', entry.item.id, (entry.item.quantity || 1) - 1)" :disabled="(entry.item.quantity || 1) <= 1" class="w-[22px] h-[22px] flex items-center justify-center rounded-full bg-[#E9EBEC] text-[#252B42] text-[0.75rem] font-bold hover:bg-[#D0D0D0] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-[background-color,transform] duration-200 active:scale-90">-</button>
        <span class="min-w-[20px] text-center font-semibold text-[0.8125rem]">{{ entry.item.quantity || 1 }}</span>
        <button type="button" @click="emit('update-quantity', entry.item.id, (entry.item.quantity || 1) + 1)" :disabled="(entry.item.quantity || 1) >= 100" class="w-[22px] h-[22px] flex items-center justify-center rounded-full bg-[#E9EBEC] text-[#252B42] text-[0.75rem] font-bold hover:bg-[#D0D0D0] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-[background-color,transform] duration-200 active:scale-90">+</button>
      </div>

      <!-- Price -->
      <div class="text-right shrink-0 min-w-[80px]">
        <span v-if="(entry.item.quantity || 1) > 1" class="block text-[0.6875rem] text-[#737373]">{{ formatPrice(unitPrice(entry.item)) }}/cad</span>
        <span class="text-[0.9375rem] font-bold text-[#252B42]">{{ formatPrice(entry.item.single_price) }}</span>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2 shrink-0">
        <NuxtLink :to="`/riepilogo?edit=${entry.item.id}`" class="text-[#095866] hover:text-[#074a56] cursor-pointer" title="Modifica">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </NuxtLink>
        <button type="button" @click="emit('remove', entry.item.id)" class="text-red-500 hover:text-red-700 cursor-pointer" title="Elimina">
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
        <div class="flex items-center gap-2">
          <button type="button" @click="emit('update-quantity', entry.item.id, (entry.item.quantity || 1) - 1)" :disabled="(entry.item.quantity || 1) <= 1" class="w-[36px] h-[36px] flex items-center justify-center rounded-full bg-[#E9EBEC] text-[#252B42] text-[0.875rem] font-bold hover:bg-[#D0D0D0] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-[background-color,transform] duration-200 active:scale-90">-</button>
          <span class="min-w-[24px] text-center font-semibold text-[0.875rem] text-[#252B42]">{{ entry.item.quantity || 1 }}x</span>
          <button type="button" @click="emit('update-quantity', entry.item.id, (entry.item.quantity || 1) + 1)" :disabled="(entry.item.quantity || 1) >= 100" class="w-[36px] h-[36px] flex items-center justify-center rounded-full bg-[#E9EBEC] text-[#252B42] text-[0.875rem] font-bold hover:bg-[#D0D0D0] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-[background-color,transform] duration-200 active:scale-90">+</button>
        </div>
        <div class="flex items-center gap-3">
          <NuxtLink :to="`/riepilogo?edit=${entry.item.id}`" class="inline-flex items-center gap-[4px] text-[0.8125rem] text-[#095866] font-semibold hover:underline cursor-pointer min-h-[44px] px-[4px]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Modifica
          </NuxtLink>
          <button type="button" @click="emit('remove', entry.item.id)" class="text-[0.8125rem] text-red-500 font-semibold hover:underline cursor-pointer min-h-[44px] px-[4px]">Elimina</button>
        </div>
      </div>
    </div>
  </div>
</template>
