<script setup>
/**
 * PudoDetail — Dettaglio espanso di un singolo punto PUDO.
 *
 * Mostra orari completi, localization hint e stato di caricamento/errore.
 *
 * Props:
 *  - pudo: il punto PUDO corrente
 *  - detailKey: chiave per lookup nei dettagli
 *  - expanded: se il dettaglio e' espanso
 *  - loadingDetailsKey: chiave del punto in caricamento
 *  - pudoDetails: oggetto dei dettagli caricati { [key]: { opening_hours, localization_hint, enabled } }
 *  - detailsErrors: oggetto errori dettagli { [key]: string }
 *  - formatOpeningHours: funzione per formattare gli orari
 *
 * Emits:
 *  - toggle: per espandere/chiudere i dettagli
 */

const props = defineProps({
  pudo: { type: Object, required: true },
  detailKey: { type: String, required: true },
  expanded: { type: Boolean, default: false },
  loadingDetailsKey: { type: String, default: null },
  pudoDetails: { type: Object, default: () => ({}) },
  detailsErrors: { type: Object, default: () => ({}) },
  formatOpeningHours: { type: Function, default: () => () => '' },
});

const emit = defineEmits(['toggle']);

const isLoading = computed(() => props.loadingDetailsKey === props.detailKey);
const details = computed(() => props.pudoDetails[props.detailKey] || null);
const error = computed(() => props.detailsErrors[props.detailKey] || null);
</script>

<template>
  <div>
    <div
      v-if="expanded"
      class="mt-[10px] pt-[10px] border-t border-[#E4E4E4] text-[0.8125rem]"
      @click.stop>
      <div
        v-if="isLoading"
        class="flex items-center gap-[6px] text-[var(--color-brand-text-secondary)]">
        <span class="inline-block w-[14px] h-[14px] border-2 border-[var(--color-brand-primary)] border-t-transparent rounded-full animate-spin"></span>
        Caricamento dettagli...
      </div>
      <template v-else-if="details">
        <p
          v-if="details.opening_hours"
          class="text-[var(--color-brand-text)]">
          <span class="font-semibold">Orari completi:</span>
          {{ formatOpeningHours(details.opening_hours) }}
        </p>
        <p
          v-if="details.localization_hint"
          class="text-[var(--color-brand-text-secondary)] mt-[4px]">
          {{ details.localization_hint }}
        </p>
      </template>
      <p
        v-else-if="error"
        class="text-rose-600">
        {{ error }}
      </p>
    </div>

    <button
      type="button"
      @click.stop="emit('toggle')"
      class="mt-[6px] text-[0.75rem] text-[var(--color-brand-primary)] font-semibold hover:underline cursor-pointer">
      {{ expanded ? 'Chiudi dettagli' : 'Dettagli e orari' }}
    </button>
  </div>
</template>
