<script setup>
/**
 * PudoMap — Pannello mappa Leaflet per i punti PUDO.
 *
 * Props:
 *  - mapPoints: array di punti con lat/lng
 *  - selectedPudoKey: chiave del punto selezionato
 *  - mapReferencePoint: punto di riferimento per centratura mappa
 *  - mapClickLoading: indica se il click mappa sta caricando
 *  - referenceUpdateMessage: messaggio di aggiornamento dal click mappa
 *  - loading: ricerca in corso
 *  - searchError: eventuale errore
 *
 * Emits:
 *  - select(pudo): quando un marker viene cliccato
 *  - map-click(payload): quando l'utente fa doppio click sulla mappa
 */
import MapPudo from '~/components/MapPudo.client.vue';

defineProps({
  mapPoints: { type: Array, default: () => [] },
  selectedPudoKey: { type: String, default: null },
  mapReferencePoint: { type: Object, default: null },
  mapClickLoading: { type: Boolean, default: false },
  referenceUpdateMessage: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  searchError: { type: String, default: null },
});

const emit = defineEmits(['select', 'map-click']);
</script>

<template>
  <div class="h-full bg-white rounded-[12px] border border-[#D0D0D0] p-[8px] flex flex-col">
    <div class="shrink-0 rounded-[12px] border border-[#D8E6EB] bg-[#F8FCFD] px-[10px] py-[8px]">
      <p class="text-[0.75rem] text-[#506070]">
        Doppio clic sulla mappa per impostare il punto di riferimento e aggiornare automaticamente via, citta e CAP.
      </p>
      <p
        v-if="mapClickLoading"
        class="text-[0.75rem] font-semibold text-[#095866] mt-[4px]">
        Aggiornamento in corso...
      </p>
      <p
        v-else-if="referenceUpdateMessage"
        class="text-[0.75rem] text-emerald-700 mt-[4px]">
        {{ referenceUpdateMessage }}
      </p>
    </div>

    <div class="mt-[8px] flex-1 min-h-0">
      <MapPudo
        :points="mapPoints"
        :selected-id="selectedPudoKey"
        :reference-point="mapReferencePoint"
        @select="(pudo) => emit('select', pudo)"
        @map-click="(payload) => emit('map-click', payload)" />
    </div>

    <p
      v-if="!loading && mapPoints.length === 0 && !searchError"
      class="mt-[8px] text-[0.8125rem] text-[#6B7280]">
      Nessun punto trovato: la mappa mostra il riferimento inserito oppure la vista Italia.
    </p>
  </div>
</template>
