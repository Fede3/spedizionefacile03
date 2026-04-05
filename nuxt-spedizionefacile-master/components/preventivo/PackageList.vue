<!--
  PackageList.vue
  Lista pacchi aggiunti con titolo, tooltip info, e bottone "Aggiungi altri colli".
  Wrappa PackageForm per ogni pacco.
-->
<script setup>
const props = defineProps({
  packages: { type: Array, required: true },
  showPackageSelector: { type: Boolean, default: true },
  messageError: { type: Object, default: null },
  sv: { type: Object, required: true },
  packageTypeList: { type: Array, required: true },
})

const emit = defineEmits([
  'weight-input',
  'dim-input',
  'quantity-change',
  'delete',
  'show-selector',
])
</script>

<template>
  <Transition name="dimensions-section" mode="out-in">
    <div v-if="packages.length > 0" class="dimensions-wrapper">
      <h3 class="preventivo-section-title font-semibold text-[0.875rem] tablet:text-[1rem] desktop:text-[1.25rem] text-black border-b-[1px] border-[#E6E6E6] min-h-[44px] tablet:min-h-[50px] mt-[20px] tablet:mt-[40px] py-[10px] tablet:py-0 flex items-center justify-center gap-[8px] scroll-mt-[80px] mx-auto desktop:max-w-[492px]">
        Inserisci le dimensioni e il peso dei colli
        <!-- Info icon con tooltip -->
        <span class="relative group inline-flex">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-[var(--color-brand-text-secondary)] cursor-help shrink-0" fill="currentColor"><path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
          <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-[8px] w-[280px] bg-[var(--color-brand-text)] text-white text-[0.75rem] font-normal leading-[1.4] p-[12px] rounded-[12px] shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-[opacity,visibility] duration-200 z-50 pointer-events-none">
            Inserisci peso e dimensioni reali del collo. Il corriere verifica le misure: se risultano significativamente diverse, il pacco potrebbe essere bloccato e potrebbero essere addebitati costi aggiuntivi per lo svincolo.
            <span class="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[var(--color-brand-text)]"></span>
          </span>
        </span>
      </h3>

      <ul class="mt-[10px]">
        <PreventivoPackageForm
          v-for="(pack, packIndex) in packages"
          :key="packIndex"
          :pack="pack"
          :pack-index="packIndex"
          :message-error="messageError"
          :sv="sv"
          :package-type-list="packageTypeList"
          @weight-input="emit('weight-input', $event)"
          @dim-input="emit('dim-input', $event)"
          @quantity-change="emit('quantity-change', $event)"
          @delete="emit('delete', $event)" />
      </ul>

      <!-- Bottone "Aggiungi altri colli" -->
      <Transition name="add-package-btn-fade" mode="out-in">
        <div v-if="!showPackageSelector" class="add-package-button-wrapper">
          <button
            type="button"
            @click="emit('show-selector')"
            class="add-package-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14"/>
              <path d="M5 12h14"/>
            </svg>
            Aggiungi altri colli
          </button>
        </div>
      </Transition>
    </div>
  </Transition>
</template>
