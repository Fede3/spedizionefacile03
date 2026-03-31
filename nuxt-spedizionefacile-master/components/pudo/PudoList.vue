<script setup>
/**
 * PudoList — Lista scrollabile dei punti PUDO con selezione.
 *
 * Ogni card mostra nome, indirizzo, distanza, stato (aperto/chiuso),
 * orari di oggi e un radio button per la selezione.
 * Include anche il sotto-componente PudoDetail per i dettagli espansi.
 *
 * Props:
 *  - pudoResults: array dei punti PUDO normalizzati
 *  - selectedPudoKey: chiave del punto selezionato
 *  - expandedPudoKey: chiave del punto con dettagli espansi
 *  - loadingDetailsKey: chiave del punto i cui dettagli stanno caricando
 *  - pudoDetails: oggetto dettagli caricati
 *  - detailsErrors: oggetto errori dettagli
 *  - loading: ricerca in corso
 *  - searchError: eventuale errore
 *
 * Emits:
 *  - select(pudo): click su una card per selezionare/deselezionare
 *  - toggle-details(pudo): click per espandere/chiudere dettagli
 */
import PudoDetail from '~/components/pudo/PudoDetail.vue';

const props = defineProps({
  pudoResults: { type: Array, default: () => [] },
  selectedPudoKey: { type: String, default: null },
  expandedPudoKey: { type: String, default: null },
  loadingDetailsKey: { type: String, default: null },
  pudoDetails: { type: Object, default: () => ({}) },
  detailsErrors: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  searchError: { type: String, default: null },
  // funzioni di formattazione passate dal composable
  distanceLabel: { type: Function, required: true },
  getTodayHoursText: { type: Function, required: true },
  getPudoStatus: { type: Function, required: true },
  formatOpeningHours: { type: Function, required: true },
});

const emit = defineEmits(['select', 'toggle-details']);

const getDetailKey = (pudo) => String(pudo.pudo_id || pudo.ui_key);
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Spinner di caricamento -->
    <div
      v-if="loading"
      class="flex items-center justify-center h-full">
      <span class="inline-block w-[28px] h-[28px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></span>
    </div>

    <template v-else>
      <!-- Nessun risultato -->
      <p
        v-if="pudoResults.length === 0 && !searchError"
        class="text-[0.875rem] text-[#737373] px-[10px] text-center flex-1 flex items-center justify-center">
        Nessun punto di ritiro trovato per questa zona. Prova con un'altra citta o CAP.
      </p>

      <!-- Lista risultati -->
      <div
        v-else
        class="grid grid-cols-1 gap-[10px] content-start flex-1 overflow-y-auto pr-[4px]">
        <div
          v-for="pudo in pudoResults"
          :key="pudo.ui_key"
          class="bg-white rounded-[12px] border-2 p-[14px] transition-[border-color,box-shadow] duration-200 cursor-pointer min-h-[168px]"
          :class="[
            expandedPudoKey === getDetailKey(pudo) ? 'h-auto' : 'h-[168px]',
            selectedPudoKey === pudo.ui_key
              ? 'border-[#095866] shadow-md'
              : 'border-[#E9EBEC] hover:border-[#095866]/50',
          ]"
          @click="emit('select', pudo)">

          <!-- Header card -->
          <div class="flex items-start justify-between gap-[10px]">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-[6px]">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#095866"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="shrink-0">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span class="text-[0.875rem] font-bold text-[#252B42] truncate">
                  {{ pudo.name }}
                </span>
              </div>
              <div class="mt-[6px] flex flex-wrap items-center gap-[6px]">
                <span class="inline-flex items-center h-[22px] px-[9px] rounded-full border border-[#CBE0E4] bg-[#F4FAFB] text-[#095866] text-[0.6875rem] font-semibold uppercase tracking-[0.2px]">
                  Punto BRT
                </span>
              </div>
              <p class="text-[0.8125rem] text-[#737373] mt-[3px]">
                {{ pudo.address }}, {{ pudo.zip_code }} {{ pudo.city }}
              </p>
            </div>

            <!-- Colonna destra: distanza, stato, radio -->
            <div class="flex flex-col items-end gap-[6px] shrink-0">
              <span class="inline-flex items-center h-[26px] px-[10px] rounded-full bg-[#E7F3F6] border border-[#C0DFE6] text-[#0B5F70] text-[0.8125rem] font-black tracking-[0.15px] leading-none">
                Distanza: {{ distanceLabel(pudo) }}
              </span>
              <span
                class="inline-flex items-center px-[8px] h-[24px] rounded-full border text-[0.6875rem] font-semibold"
                :class="getPudoStatus(pudo).className">
                {{ getPudoStatus(pudo).label }}
              </span>
              <div
                class="w-[22px] h-[22px] rounded-full border-[2px] flex items-center justify-center"
                :class="
                  selectedPudoKey === pudo.ui_key
                    ? 'border-[#095866] bg-[#095866]'
                    : 'border-[#95A3B3] bg-transparent'
                ">
                <div
                  v-if="selectedPudoKey === pudo.ui_key"
                  class="w-[10px] h-[10px] rounded-full bg-white"></div>
              </div>
            </div>
          </div>

          <!-- Orari di oggi -->
          <div class="mt-[2px] grid gap-[2px] text-[0.75rem] text-[#64748B]">
            <p class="inline-flex items-center gap-[4px]">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {{ getTodayHoursText(pudo) }}
            </p>
          </div>

          <!-- Dettagli espansi -->
          <PudoDetail
            :pudo="pudo"
            :detail-key="getDetailKey(pudo)"
            :expanded="expandedPudoKey === getDetailKey(pudo)"
            :loading-details-key="loadingDetailsKey"
            :pudo-details="pudoDetails"
            :details-errors="detailsErrors"
            :format-opening-hours="formatOpeningHours"
            @toggle="emit('toggle-details', pudo)" />
        </div>
      </div>
    </template>
  </div>
</template>
