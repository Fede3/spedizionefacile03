<!--
  FILE: components/cart/CartGroupEntry.vue
  SCOPO: Riga carrello raggruppata (multi-collo, spedizione unica).
  PROPS: entry, expanded
  EMITS: toggle, update-quantity(id, qty), delete(id)
-->
<script setup>
const props = defineProps({
  entry: { type: Object, required: true },
  expanded: { type: Boolean, default: false },
  formatPrice: { type: Function, required: true },
  unitPrice: { type: Function, required: true },
  getPackageIcon: { type: Function, required: true },
  quantityButtonClass: { type: String, default: '' },
})

const emit = defineEmits(['toggle', 'update-quantity', 'delete'])

const firstItem = computed(() => props.entry.items[0])
</script>

<template>
  <div class="bg-white rounded-[12px] border border-[#E3E8EA] shadow-[0_10px_24px_rgba(37,43,66,0.06)] overflow-hidden">
    <!-- Group header -->
    <button
      type="button"
      @click="emit('toggle')"
      class="w-full flex items-center gap-[10px] tablet:gap-[16px] p-[16px] tablet:p-[20px] hover:bg-[#f8fafb] transition cursor-pointer text-left">
      <div class="w-[36px] h-[36px] tablet:w-[44px] tablet:h-[44px] rounded-[50px] flex items-center justify-center shrink-0"
        :style="{ backgroundColor: entry.color + '15' }">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" :stroke="entry.color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tablet:w-[22px] tablet:h-[22px]"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-[6px] tablet:gap-[8px] flex-wrap">
          <span class="text-[0.8125rem] tablet:text-[0.9375rem] font-bold text-[var(--color-brand-text)]">{{ firstItem?.origin_address?.city || 'Partenza' }}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 tablet:w-[18px] tablet:h-[18px]"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          <span class="text-[0.8125rem] tablet:text-[0.9375rem] font-bold text-[var(--color-brand-text)]">{{ firstItem?.destination_address?.city || 'Destinazione' }}</span>
        </div>
        <div class="flex items-center gap-[10px] mt-[6px] flex-wrap">
          <span class="text-[0.75rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]">{{ entry.items.length }} colli</span>
          <span class="inline-flex items-center gap-[4px] px-[10px] py-[4px] rounded-full text-[0.6875rem] font-semibold"
            :style="{ backgroundColor: entry.color + '14', color: entry.color }">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>
            Spedizione unica
          </span>
          <span class="text-[0.75rem] text-[#6B7280] bg-[#F3F5F6] px-[10px] py-[4px] rounded-full">{{ firstItem?.services?.service_type?.split(',')[0]?.trim() || 'BRT' }}</span>
        </div>
      </div>
      <div class="text-right shrink-0">
        <p class="text-[0.9375rem] tablet:text-[1.125rem] font-bold text-[var(--color-brand-text)]">{{ formatPrice(entry.totalCents) }}</p>
        <p class="text-[0.6875rem] tablet:text-[0.75rem] text-[var(--color-brand-text-secondary)]">totale gruppo</p>
      </div>
      <div class="shrink-0 ml-[4px] transition-transform" :class="{ 'rotate-180': expanded }">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-text-secondary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    </button>

    <!-- Addresses -->
    <div class="mx-[16px] tablet:mx-[20px] mb-[4px] rounded-[12px] bg-[#F8FAFB] border border-[#EDF2F3] px-[14px] tablet:px-[16px] py-[12px] flex flex-wrap gap-x-[24px] gap-y-[8px] text-[0.75rem] tablet:text-[0.8125rem] text-[#404040]">
      <div class="flex items-start gap-[6px] min-w-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-accent)" stroke-width="2" class="shrink-0 mt-[2px]"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span class="break-words">{{ firstItem?.origin_address?.name || '' }} - {{ firstItem?.origin_address?.address || '' }}, {{ firstItem?.origin_address?.city || '' }}</span>
      </div>
      <div class="flex items-start gap-[6px] min-w-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" stroke-width="2" class="shrink-0 mt-[2px]"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span class="break-words">{{ firstItem?.destination_address?.name || '' }} - {{ firstItem?.destination_address?.address || '' }}, {{ firstItem?.destination_address?.city || '' }}</span>
      </div>
    </div>

    <!-- Expanded parcels -->
    <div v-if="expanded" class="px-[12px] tablet:px-[20px] pb-[16px] pt-[8px]">
      <div class="border-t border-[#E8EEF0] pt-[12px]">
        <div
          v-for="(item, pIdx) in entry.items"
          :key="item.id"
          class="flex flex-wrap tablet:flex-nowrap items-center gap-[8px] tablet:gap-[12px] py-[10px] px-[8px] tablet:px-[12px] rounded-[50px] mb-[6px]"
          :class="pIdx % 2 === 0 ? 'bg-[#F8F9FB]' : 'bg-white'">
          <div class="w-[32px] h-[32px] tablet:w-[36px] tablet:h-[36px] rounded-[12px] bg-[#F0F0F0] flex items-center justify-center shrink-0">
            <NuxtImg :src="getPackageIcon(item)" alt="" width="22" height="22" loading="lazy" decoding="async" class="w-[18px] h-[18px] tablet:w-[22px] tablet:h-[22px]" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[0.8125rem] tablet:text-[0.875rem] font-semibold text-[var(--color-brand-text)]">Collo {{ pIdx + 1 }} <span class="font-normal text-[var(--color-brand-text-secondary)] ml-[4px]">{{ item.package_type || 'Pacco' }}</span></p>
            <p class="text-[0.75rem] tablet:text-[0.8125rem] text-[var(--color-brand-text-secondary)]">{{ item.weight }} kg <span class="mx-[4px]">&middot;</span> {{ item.first_size }}x{{ item.second_size }}x{{ item.third_size }} cm</p>
          </div>
          <div class="text-right shrink-0 min-w-[60px] tablet:min-w-[70px]">
            <span v-if="(item.quantity || 1) > 1" class="block text-[0.6875rem] text-[var(--color-brand-text-secondary)]">{{ formatPrice(unitPrice(item)) }}/cad</span>
            <span class="text-[0.8125rem] tablet:text-[0.875rem] font-semibold text-[var(--color-brand-text)]">{{ formatPrice(item.single_price) }}</span>
          </div>
          <div class="w-full tablet:w-auto flex items-center justify-between tablet:justify-start gap-[8px] tablet:gap-[4px] pl-[40px] tablet:pl-0">
            <div class="flex items-center gap-[4px] shrink-0">
              <button type="button" @click="emit('update-quantity', item.id, (item.quantity || 1) - 1)" :disabled="(item.quantity || 1) <= 1" :class="quantityButtonClass">-</button>
              <span class="min-w-[20px] text-center font-semibold text-[0.8125rem] text-[var(--color-brand-text)]">{{ item.quantity || 1 }}</span>
              <button type="button" @click="emit('update-quantity', item.id, (item.quantity || 1) + 1)" :disabled="(item.quantity || 1) >= 100" :class="quantityButtonClass">+</button>
            </div>
            <div class="flex items-center gap-[6px] shrink-0">
              <NuxtLink :to="`/riepilogo?edit=${item.id}`" class="min-w-[36px] min-h-[36px] tablet:min-w-0 tablet:min-h-0 flex items-center justify-center text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)] cursor-pointer" title="Modifica collo" aria-label="Modifica collo">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </NuxtLink>
              <button type="button" @click="emit('delete', item.id)" class="min-w-[36px] min-h-[36px] tablet:min-w-0 tablet:min-h-0 flex items-center justify-center text-red-500 hover:text-red-700 cursor-pointer" title="Elimina collo" aria-label="Elimina collo">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Collapsed summary -->
    <div v-else class="px-[14px] tablet:px-[20px] pb-[16px] pt-[4px]">
      <p class="text-[0.75rem] tablet:text-[0.8125rem] text-[var(--color-brand-text-secondary)]">
        {{ entry.items.map((i, idx) => `Collo ${idx + 1}: ${i.weight}kg`).join(' | ') }}
      </p>
    </div>
  </div>
</template>
