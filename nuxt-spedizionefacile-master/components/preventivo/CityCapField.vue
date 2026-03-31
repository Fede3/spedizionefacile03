<!--
  PreventivoCityCapField.vue
  Campo singolo citta/CAP con dropdown suggerimenti.
  Estratto da CityCapInputs.vue per ridurre la duplicazione del template.
-->
<script setup>
const props = defineProps({
  fieldId: { type: String, required: true },
  label: { type: String, required: true },
  placeholder: { type: String, default: '' },
  value: { type: String, default: '' },
  suggestions: { type: Array, default: () => [] },
  showSuggestions: { type: Boolean, default: false },
  error: { type: String, default: '' },
  inputClass: { type: String, default: 'input-preventivo-rapido' },
  maxlength: { type: String, default: undefined },
  inputmode: { type: String, default: undefined },
  pattern: { type: String, default: undefined },
})

const emit = defineEmits(['input', 'focus', 'blur', 'select'])

const { locationKey } = useCityCapAutocomplete()
</script>

<template>
  <div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px] relative">
    <label :for="fieldId" class="label-preventivo-rapido">{{ label }}</label>
    <input
      type="text"
      :value="value"
      :id="fieldId"
      :placeholder="placeholder"
      :class="inputClass"
      required
      autocomplete="off"
      :maxlength="maxlength"
      :inputmode="inputmode"
      :pattern="pattern"
      @focus="$emit('focus', $event)"
      @input="$emit('input', $event)"
      @blur="$emit('blur', $event)" />
    <ul
      v-if="showSuggestions && suggestions.length"
      role="listbox"
      class="absolute z-50 top-full left-0 right-0 bg-white border border-[#D0D0D0] rounded-[12px] mt-[2px] max-h-[200px] overflow-y-auto shadow-lg">
      <li
        v-for="loc in suggestions"
        :key="locationKey(loc)"
        role="option"
        aria-selected="false"
        @mousedown.prevent="$emit('select', loc)"
        class="px-[14px] py-[12px] tablet:py-[10px] cursor-pointer hover:bg-[#f0fafb] text-[0.875rem] text-[#252B42] border-b border-[#F0F0F0] last:border-0">
        <slot name="suggestion" :loc="loc" />
      </li>
    </ul>
    <p v-if="error" class="text-red-500 text-[0.8125rem] mt-[4px]" role="alert">{{ error }}</p>
  </div>
</template>
