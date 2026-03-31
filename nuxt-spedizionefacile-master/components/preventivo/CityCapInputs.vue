<!--
  CityCapInputs.vue
  Input citta'/CAP con autocomplete per origine e destinazione.
  Logica di ricerca delegata a useCityCapAutocomplete().
-->
<script setup>
const props = defineProps({
  originCity: { type: String, default: '' },
  originPostalCode: { type: String, default: '' },
  destinationCity: { type: String, default: '' },
  destinationPostalCode: { type: String, default: '' },
  messageError: { type: Object, default: null },
  sv: { type: Object, required: true },
})

const emit = defineEmits([
  'update:originCity',
  'update:originPostalCode',
  'update:destinationCity',
  'update:destinationPostalCode',
])

const { getProvinceLabel, createDirectionHandlers } = useCityCapAutocomplete()

const origin = createDirectionHandlers({
  getCity: () => props.originCity,
  getCap: () => props.originPostalCode,
  emitCity: (v) => emit('update:originCity', v),
  emitCap: (v) => emit('update:originPostalCode', v),
  sv: props.sv,
  capKey: 'origin_cap',
  filterCAP: (v) => props.sv.filterCAP(v),
})

const dest = createDirectionHandlers({
  getCity: () => props.destinationCity,
  getCap: () => props.destinationPostalCode,
  emitCity: (v) => emit('update:destinationCity', v),
  emitCap: (v) => emit('update:destinationPostalCode', v),
  sv: props.sv,
  capKey: 'dest_cap',
  filterCAP: (v) => props.sv.filterCAP(v),
})

onBeforeUnmount(() => { origin.cleanup(); dest.cleanup() })
</script>

<template>
  <div class="flex items-start flex-wrap tablet:justify-center desktop-xl:justify-between tablet:gap-x-[20px] gap-y-[16px] tablet:gap-y-[20px] desktop:gap-y-[36px] desktop-xl:gap-y-0 border-[1px] border-[rgba(0,0,0,.2)] rounded-[12px] p-[12px] tablet:p-[16px] mt-[10px]">
    <PreventivoCityCapField
      field-id="origin_city"
      label="Citta di Ritiro"
      placeholder="Citta"
      :value="originCity"
      :suggestions="origin.suggestions.value"
      :show-suggestions="origin.showSuggestions.value"
      :error="messageError?.['shipment_details.origin_city']?.[0]"
      input-class="input-preventivo-rapido"
      @input="origin.onCityInput"
      @focus="origin.onCityFocus"
      @blur="origin.hideSuggestions"
      @select="origin.selectLocation">
      <template #suggestion="{ loc }">
        <span class="font-semibold">{{ loc.place_name }}</span>
        <span class="text-[#737373]">
          <template v-if="getProvinceLabel(loc)">({{ getProvinceLabel(loc) }}) - </template>{{ loc.postal_code }}
        </span>
      </template>
    </PreventivoCityCapField>

    <PreventivoCityCapField
      field-id="origin_postal_code"
      label="CAP di Ritiro"
      placeholder="CAP"
      :value="originPostalCode"
      :suggestions="origin.suggestions.value"
      :show-suggestions="origin.showSuggestions.value"
      :error="sv.getError('origin_cap') || messageError?.['shipment_details.origin_postal_code']?.[0]"
      :input-class="sv.errorClass('origin_cap', 'input-preventivo-rapido')"
      maxlength="5"
      inputmode="numeric"
      pattern="[0-9]{5}"
      @input="origin.onCapInput"
      @focus="origin.onCapFocus"
      @blur="origin.hideSuggestions(); sv.onBlur('origin_cap', () => sv.validateCAP('origin_cap', originPostalCode))">
      <template #suggestion="{ loc }">
        <span class="font-semibold">{{ loc.postal_code }}</span> - {{ loc.place_name }}
        <span v-if="getProvinceLabel(loc)" class="text-[#737373]"> ({{ getProvinceLabel(loc) }})</span>
      </template>
    </PreventivoCityCapField>

    <PreventivoCityCapField
      field-id="destination_city"
      label="Citta Consegna"
      placeholder="Citta"
      :value="destinationCity"
      :suggestions="dest.suggestions.value"
      :show-suggestions="dest.showSuggestions.value"
      :error="messageError?.['shipment_details.destination_city']?.[0]"
      input-class="input-preventivo-rapido"
      @input="dest.onCityInput"
      @focus="dest.onCityFocus"
      @blur="dest.hideSuggestions"
      @select="dest.selectLocation">
      <template #suggestion="{ loc }">
        <span class="font-semibold">{{ loc.place_name }}</span>
        <span class="text-[#737373]">
          <template v-if="getProvinceLabel(loc)">({{ getProvinceLabel(loc) }}) - </template>{{ loc.postal_code }}
        </span>
      </template>
    </PreventivoCityCapField>

    <PreventivoCityCapField
      field-id="destination_postal_code"
      label="CAP Consegna"
      placeholder="CAP"
      :value="destinationPostalCode"
      :suggestions="dest.suggestions.value"
      :show-suggestions="dest.showSuggestions.value"
      :error="sv.getError('dest_cap') || messageError?.['shipment_details.destination_postal_code']?.[0]"
      :input-class="sv.errorClass('dest_cap', 'input-preventivo-rapido')"
      maxlength="5"
      inputmode="numeric"
      pattern="[0-9]{5}"
      @input="dest.onCapInput"
      @focus="dest.onCapFocus"
      @blur="dest.hideSuggestions(); sv.onBlur('dest_cap', () => sv.validateCAP('dest_cap', destinationPostalCode))">
      <template #suggestion="{ loc }">
        <span class="font-semibold">{{ loc.postal_code }}</span> - {{ loc.place_name }}
        <span v-if="getProvinceLabel(loc)" class="text-[#737373]"> ({{ getProvinceLabel(loc) }})</span>
      </template>
    </PreventivoCityCapField>
  </div>
</template>
