<!--
  PackageForm.vue
  Riga singola per un pacco: icona, quantita', peso, 3 dimensioni, bottone elimina.
  Il calcolo prezzo viene delegato al parent tramite emit.
-->
<script setup>
const props = defineProps({
  pack: { type: Object, required: true },
  packIndex: { type: Number, required: true },
  messageError: { type: Object, default: null },
  sv: { type: Object, required: true },
  packageTypeList: { type: Array, required: true },
})

const emit = defineEmits(['weight-input', 'dim-input', 'quantity-change', 'delete'])

// --- Visual helpers ---
const normalizePackageType = (value) =>
  String(value || '').toLowerCase().replace(/\s*#\d+\s*$/u, '').trim()

const getPackVisual = (pack) => {
  const fallback = props.packageTypeList[0]
  const byType = props.packageTypeList.find(
    (item) => normalizePackageType(item.text) === normalizePackageType(pack?.package_type),
  )
  const img = pack?.img || byType?.img || fallback.img
  const width = Number(pack?.width) > 0 ? Number(pack.width) : (byType?.width || fallback.width)
  const height = Number(pack?.height) > 0 ? Number(pack.height) : (byType?.height || fallback.height)
  return { img, width, height }
}

// --- Validation handlers (delegate price calc to parent) ---
const onWeightInput = () => {
  const key = `peso_${props.packIndex}`
  if (props.sv.isTouched(key)) {
    props.sv.validatePeso(key, props.pack.weight)
  }
  emit('weight-input', props.pack)
}

const onWeightBlur = () => {
  const key = `peso_${props.packIndex}`
  props.sv.onBlur(key, () => props.sv.validatePeso(key, props.pack.weight))
}

const onDimInput = (dimName, label) => {
  const key = `${dimName}_${props.packIndex}`
  if (props.sv.isTouched(key)) {
    props.sv.validateDimensione(key, props.pack[dimName], label)
  }
  emit('dim-input', props.pack)
}

const onDimBlur = (dimName, label) => {
  const key = `${dimName}_${props.packIndex}`
  props.sv.onBlur(key, () => props.sv.validateDimensione(key, props.pack[dimName], label))
}

const onQuantityChange = () => {
  emit('quantity-change', props.pack)
}

const visual = computed(() => getPackVisual(props.pack))
</script>

<template>
  <li class="relative border-[1px] border-[rgba(0,0,0,.2)] rounded-[12px] p-[12px_14px] tablet:p-[15px_20px] mt-[10px] w-full scroll-mt-[80px]">
    <!-- Header mobile: icona + cestino -->
    <div class="flex items-center justify-between desktop-xl:hidden mb-[12px]">
      <div class="flex items-center gap-[10px]">
        <NuxtImg
          :src="`/img/quote/first-step/${visual.img}`"
          :alt="pack.package_type"
          :width="visual.width"
          :height="visual.height"
          loading="lazy" decoding="async"
          class="h-[32px] w-auto object-contain" />
        <span class="text-[0.875rem] font-semibold text-[#333]">{{ pack.package_type }}</span>
      </div>
      <button type="button" class="cursor-pointer text-[#DB9FA1] p-[4px] min-w-[36px] min-h-[36px] flex items-center justify-center hover:text-red-500 transition-colors" @click="emit('delete', packIndex)" :aria-label="'Elimina pacco ' + (packIndex + 1)" title="Rimuovi questo collo dalla spedizione">
        <NuxtImg src="/img/quote/first-step/trash.png" alt="" width="24" height="28" loading="lazy" decoding="async" />
      </button>
    </div>

    <!-- Campi input -->
    <div class="flex items-start flex-wrap desktop-xl:flex-nowrap tablet:justify-center desktop-xl:justify-between tablet:gap-x-[20px] gap-y-[16px] tablet:gap-y-[20px] desktop:gap-y-[36px] desktop-xl:gap-y-0 desktop-xl:gap-x-[16px]">
      <!-- Icona desktop -->
      <div class="hidden desktop-xl:flex self-center items-center justify-center shrink-0 min-w-[48px]">
        <NuxtImg
          :src="`/img/quote/first-step/${visual.img}`"
          :alt="pack.package_type"
          :width="visual.width"
          :height="visual.height"
          loading="lazy" decoding="async"
          class="w-auto object-contain max-h-[52px]" />
      </div>

      <!-- Quantita' -->
      <div class="self-center">
        <select v-model="pack.quantity" :id="'quantity_' + packIndex" class="text-black text-[1.25rem] font-medium min-h-[44px] min-w-[44px]" @change="onQuantityChange" title="Numero di colli identici da spedire. Il prezzo verra moltiplicato per la quantita.">
          <option v-for="quantity in 10" :key="quantity" :value="quantity" :disabled="quantity === pack.quantity">
            {{ quantity }}
          </option>
        </select>
        <p v-if="messageError?.[`packages.${packIndex}.quantity`]" class="text-red-500 text-[1rem] mt-[10px]" role="alert">
          {{ messageError[`packages.${packIndex}.quantity`][0] }}
        </p>
      </div>

      <!-- Peso -->
      <div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px]">
        <label :for="'weight_' + packIndex" class="label-preventivo-rapido" title="Inserisci il peso effettivo del collo in kilogrammi">Peso (Kg)</label>
        <input type="text" placeholder="...Kg" v-model="pack.weight" :id="'weight_' + packIndex" :class="sv.errorClass(`peso_${packIndex}`, 'input-preventivo-rapido')" @input="onWeightInput" @blur="onWeightBlur" required title="Peso effettivo del collo. Il prezzo viene calcolato in base al peso o al volume, a seconda di quale e maggiore." />
        <p v-if="sv.getError(`peso_${packIndex}`)" class="text-red-500 text-[0.8125rem] mt-[4px]" role="alert">{{ sv.getError(`peso_${packIndex}`) }}</p>
        <p v-else-if="messageError?.[`packages.${packIndex}.weight`]" class="text-red-500 text-[1rem] mt-[10px]" role="alert">
          {{ messageError[`packages.${packIndex}.weight`][0] }}
        </p>
      </div>

      <!-- Lato 1 -->
      <div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px]">
        <label :for="'first_size_' + packIndex" class="label-preventivo-rapido" title="Misura in centimetri del primo lato del collo (lunghezza)">Lato 1 (Cm)</label>
        <input type="text" placeholder="...Cm" v-model="pack.first_size" :id="'first_size_' + packIndex" :class="sv.errorClass(`first_size_${packIndex}`, 'input-preventivo-rapido')" @input="onDimInput('first_size', 'Lato 1')" @blur="onDimBlur('first_size', 'Lato 1')" required />
        <p v-if="sv.getError(`first_size_${packIndex}`)" class="text-red-500 text-[0.8125rem] mt-[4px]" role="alert">{{ sv.getError(`first_size_${packIndex}`) }}</p>
        <p v-else-if="messageError?.[`packages.${packIndex}.first_size`]" class="text-red-500 text-[1rem] mt-[10px]" role="alert">
          {{ messageError[`packages.${packIndex}.first_size`][0] }}
        </p>
      </div>

      <!-- Lato 2 -->
      <div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px]">
        <label :for="'second_size_' + packIndex" class="label-preventivo-rapido" title="Misura in centimetri del secondo lato del collo (larghezza)">Lato 2 (Cm)</label>
        <input type="text" placeholder="...Cm" v-model="pack.second_size" :id="'second_size_' + packIndex" :class="sv.errorClass(`second_size_${packIndex}`, 'input-preventivo-rapido')" @input="onDimInput('second_size', 'Lato 2')" @blur="onDimBlur('second_size', 'Lato 2')" required />
        <p v-if="sv.getError(`second_size_${packIndex}`)" class="text-red-500 text-[0.8125rem] mt-[4px]" role="alert">{{ sv.getError(`second_size_${packIndex}`) }}</p>
        <p v-else-if="messageError?.[`packages.${packIndex}.second_size`]" class="text-red-500 text-[1rem] mt-[10px]" role="alert">
          {{ messageError[`packages.${packIndex}.second_size`][0] }}
        </p>
      </div>

      <!-- Lato 3 -->
      <div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px]">
        <label :for="'third_size_' + packIndex" class="label-preventivo-rapido" title="Misura in centimetri del terzo lato del collo (altezza)">Lato 3 (Cm)</label>
        <input type="text" placeholder="...Cm" v-model="pack.third_size" :id="'third_size_' + packIndex" :class="sv.errorClass(`third_size_${packIndex}`, 'input-preventivo-rapido')" @input="onDimInput('third_size', 'Lato 3')" @blur="onDimBlur('third_size', 'Lato 3')" required />
        <p v-if="sv.getError(`third_size_${packIndex}`)" class="text-red-500 text-[0.8125rem] mt-[4px]" role="alert">{{ sv.getError(`third_size_${packIndex}`) }}</p>
        <p v-else-if="messageError?.[`packages.${packIndex}.third_size`]" class="text-red-500 text-[1rem] mt-[10px]" role="alert">
          {{ messageError[`packages.${packIndex}.third_size`][0] }}
        </p>
      </div>

      <!-- Cestino desktop -->
      <button type="button" class="hidden desktop-xl:flex cursor-pointer text-[#DB9FA1] self-center p-[6px] min-w-[44px] min-h-[44px] items-center justify-center hover:text-red-500 transition-colors" @click="emit('delete', packIndex)" :aria-label="'Elimina pacco ' + (packIndex + 1)" title="Rimuovi questo collo dalla spedizione">
        <NuxtImg src="/img/quote/first-step/trash.png" alt="" width="30" height="35" loading="lazy" decoding="async" />
      </button>
    </div>
  </li>
</template>
